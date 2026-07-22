-- Çok kalemli sipariş satışı (tek fatura)
-- Supabase SQL Editor'de çalıştırın

CREATE OR REPLACE FUNCTION sell_order(p_items JSONB)
RETURNS TABLE(invoice_id UUID, invoice_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_product products%ROWTYPE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_total DECIMAL(10, 2) := 0;
  v_subtotal DECIMAL(10, 2);
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Siparişte en az bir ürün olmalıdır';
  END IF;

  -- Stok kontrolü
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Adet 0''dan büyük olmalıdır';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ürün bulunamadı';
    END IF;

    IF v_product.stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'Yetersiz stok: % (mevcut: %)', v_product.name, v_product.stock_quantity;
    END IF;

    v_total := v_total + (v_product.price * v_quantity);
  END LOOP;

  v_invoice_number := 'FTR-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('invoice_seq')::text, 4, '0');

  INSERT INTO invoices (invoice_number, total_amount)
  VALUES (v_invoice_number, v_total)
  RETURNING id INTO v_invoice_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;
    v_subtotal := v_product.price * v_quantity;

    INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, subtotal)
    VALUES (v_invoice_id, v_product.id, v_product.name, v_quantity, v_product.price, v_subtotal);

    UPDATE products
    SET stock_quantity = stock_quantity - v_quantity,
        updated_at = NOW()
    WHERE id = v_product_id;
  END LOOP;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number;
END;
$$;

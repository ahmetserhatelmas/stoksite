-- Stok & Fatura Yönetim Sistemi - Veritabanı Şeması
-- Supabase SQL Editor'de çalıştırın

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- Kategoriler (iç içe destekli)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(parent_id, sort_order);

-- Ürünler
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Faturalar
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- Fatura kalemleri
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Satış işlemi (stok düş + fatura oluştur - atomik)
CREATE OR REPLACE FUNCTION sell_product(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE(invoice_id UUID, invoice_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal DECIMAL(10, 2);
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Adet 0''dan büyük olmalıdır';
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı';
  END IF;

  IF v_product.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'Yetersiz stok. Mevcut: %', v_product.stock_quantity;
  END IF;

  v_subtotal := v_product.price * p_quantity;
  v_invoice_number := 'FTR-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('invoice_seq')::text, 4, '0');

  INSERT INTO invoices (invoice_number, total_amount)
  VALUES (v_invoice_number, v_subtotal)
  RETURNING id INTO v_invoice_id;

  INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, subtotal)
  VALUES (v_invoice_id, v_product.id, v_product.name, p_quantity, v_product.price, v_subtotal);

  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT v_invoice_id, v_invoice_number;
END;
$$;

-- Çok kalemli sipariş (tek fatura)
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

-- RLS (iç kullanım - tüm işlemlere izin)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

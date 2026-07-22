"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OrderItemInput = {
  productId: string;
  quantity: number;
};

export async function sellProduct(productId: string, quantity: number) {
  return sellOrder([{ productId, quantity }]);
}

export async function sellOrder(items: OrderItemInput[]) {
  const cleaned = items
    .map((item) => ({
      product_id: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.quantity > 0);

  if (cleaned.length === 0) {
    return { error: "Siparişte en az bir ürün olmalıdır" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sell_order", {
    p_items: cleaned,
  });

  if (error) {
    // Eski tek ürün fonksiyonuna düş (henüz sell_order kurulmadıysa)
    if (
      cleaned.length === 1 &&
      (error.message.includes("sell_order") ||
        error.message.includes("Could not find the function"))
    ) {
      const single = await supabase.rpc("sell_product", {
        p_product_id: cleaned[0].product_id,
        p_quantity: cleaned[0].quantity,
      });
      if (single.error) {
        return { error: single.error.message };
      }
      const result = Array.isArray(single.data) ? single.data[0] : single.data;
      revalidatePath("/");
      revalidatePath("/faturalar");
      return {
        success: true,
        invoiceId: result?.invoice_id as string,
        invoiceNumber: result?.invoice_number as string,
      };
    }
    return { error: error.message };
  }

  const result = Array.isArray(data) ? data[0] : data;

  revalidatePath("/");
  revalidatePath("/faturalar");

  return {
    success: true,
    invoiceId: result?.invoice_id as string,
    invoiceNumber: result?.invoice_number as string,
  };
}

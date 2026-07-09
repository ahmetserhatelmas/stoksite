"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sellProduct(productId: string, quantity: number) {
  if (quantity <= 0) {
    return { error: "Adet 0'dan büyük olmalıdır" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sell_product", {
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) {
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceWithItems } from "@/lib/types";

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Invoice[];
}

export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as InvoiceWithItems;
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/faturalar");
  return { success: true };
}

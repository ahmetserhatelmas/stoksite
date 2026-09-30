"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceWithItems } from "@/lib/types";

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = await createClient();
  const rows: Invoice[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const page = (data ?? []).map((row) => ({
      ...row,
      total_amount: Number(row.total_amount),
    })) as Invoice[];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    total_amount: Number(data.total_amount),
    invoice_items: (data.invoice_items ?? []).map(
      (item: Record<string, unknown>) => ({
        ...item,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
        delivered: Boolean(item.delivered),
      })
    ),
  } as InvoiceWithItems;
}

export async function deleteInvoice(invoiceId: string) {
  return deleteInvoices([invoiceId]);
}

export async function deleteInvoices(invoiceIds: string[]) {
  const ids = [...new Set(invoiceIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { error: "Silinecek fatura seçilmedi" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").delete().in("id", ids);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/faturalar");
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/admin");
  return { success: true, count: ids.length };
}

export async function updateInvoiceMeta(
  invoiceId: string,
  input: {
    invoiceDate?: string;
    customerId?: string | null;
    customerName?: string | null;
  }
) {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};

  if (input.invoiceDate) {
    payload.invoice_date = new Date(input.invoiceDate).toISOString();
  }
  if (input.customerId !== undefined) {
    payload.customer_id = input.customerId;
  }
  if (input.customerName !== undefined) {
    payload.customer_name = input.customerName;
  }

  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  revalidatePath("/faturalar");
  revalidatePath(`/faturalar/${invoiceId}`);
  return { success: true };
}

export async function updateInvoiceItemQuantity(
  itemId: string,
  invoiceId: string,
  quantity: number
) {
  if (quantity <= 0) return { error: "Adet 0'dan büyük olmalıdır" };

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (itemError || !item) return { error: "Kalem bulunamadı" };

  const unitPrice = Number(item.unit_price);
  const subtotal = unitPrice * quantity;

  const { error: updateError } = await supabase
    .from("invoice_items")
    .update({ quantity, subtotal })
    .eq("id", itemId);

  if (updateError) return { error: updateError.message };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("subtotal")
    .eq("invoice_id", invoiceId);

  const total = (items ?? []).reduce(
    (sum, row) => sum + Number(row.subtotal),
    0
  );

  await supabase
    .from("invoices")
    .update({ total_amount: total })
    .eq("id", invoiceId);

  revalidatePath("/faturalar");
  revalidatePath(`/faturalar/${invoiceId}`);
  return { success: true };
}

export async function toggleInvoiceItemDelivered(
  itemId: string,
  invoiceId: string,
  delivered: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_items")
    .update({ delivered })
    .eq("id", itemId);

  if (error) return { error: error.message };

  revalidatePath(`/faturalar/${invoiceId}`);
  revalidatePath("/faturalar");
  return { success: true };
}

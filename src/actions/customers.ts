"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import type { Customer } from "@/lib/types";

function revalidateCustomerPaths() {
  revalidatePath("/");
  revalidatePath("/yonetim");
  revalidatePath("/faturalar");
  revalidatePath("/panel");
  revalidatePath("/admin");
}

function sortCustomers(rows: Customer[]) {
  return [...rows].sort((a, b) => {
    const ac = a.code ?? "";
    const bc = b.code ?? "";
    if (ac && bc && ac !== bc) return ac.localeCompare(bc, "tr");
    if (ac && !bc) return -1;
    if (!ac && bc) return 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Customer>(
    supabase.from("customers").select("*").order("name")
  );
  return sortCustomers(rows);
}

export async function createCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!name) return { error: "Müşteri adı gerekli" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ name, code, phone, note })
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidateCustomerPaths();
  return { success: true, customer: data as Customer };
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!id) return { error: "Müşteri bulunamadı" };
  if (!name) return { error: "Müşteri adı gerekli" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ name, code, phone, note })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidateCustomerPaths();
  return { success: true, customer: data as Customer };
}

export async function deleteCustomer(customerId: string) {
  if (!customerId) return { error: "Müşteri bulunamadı" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) return { error: error.message };

  revalidateCustomerPaths();
  return { success: true };
}

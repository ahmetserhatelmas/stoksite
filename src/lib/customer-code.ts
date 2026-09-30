import type { Customer } from "@/lib/types";

export function customerCode(customer: Pick<Customer, "code" | "note">) {
  if (customer.code) return customer.code;
  const match = customer.note?.match(/^Kod:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}

export function customerLabel(customer: Pick<Customer, "name" | "code" | "note">) {
  const code = customerCode(customer);
  return code ? `${code} · ${customer.name}` : customer.name;
}

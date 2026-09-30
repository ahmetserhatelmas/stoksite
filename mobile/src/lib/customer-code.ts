import type { Customer } from "./types";

export function customerCode(customer: Pick<Customer, "code" | "note">) {
  if (customer.code) return customer.code;
  const match = customer.note?.match(/^Kod:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}

export function customerLabel(
  customer: Pick<Customer, "name" | "code" | "note">
) {
  const code = customerCode(customer);
  return code ? `${code} · ${customer.name}` : customer.name;
}

export function sortCustomers(rows: Customer[]) {
  return [...rows].sort((a, b) => {
    const ac = customerCode(a) ?? "";
    const bc = customerCode(b) ?? "";
    if (ac && bc && ac !== bc) return ac.localeCompare(bc, "tr");
    if (ac && !bc) return -1;
    if (!ac && bc) return 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { customerLabel } from "@/lib/customer-code";
import type { Customer, InvoiceWithItems } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  toggleInvoiceItemDelivered,
  updateInvoiceItemQuantity,
  updateInvoiceMeta,
} from "@/actions/invoices";
import { QuantityControl } from "@/components/QuantityControl";

type Props = {
  invoice: InvoiceWithItems;
  customers: Customer[];
};

export function InvoiceEditor({ invoice, customers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(invoice.customer_id ?? "");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = invoice.invoice_date ?? invoice.created_at;
    return new Date(d).toISOString().slice(0, 16);
  });
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      invoice.invoice_items.map((item) => [item.id, String(item.quantity)])
    )
  );
  const [delivered, setDelivered] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      invoice.invoice_items.map((item) => [item.id, Boolean(item.delivered)])
    )
  );

  function saveMeta() {
    setMessage(null);
    startTransition(async () => {
      const selected = customers.find((c) => c.id === customerId);
      const result = await updateInvoiceMeta(invoice.id, {
        invoiceDate,
        customerId: customerId || null,
        customerName: selected?.name ?? invoice.customer_name,
      });
      setMessage(result.error ?? "Fatura bilgileri kaydedildi");
      router.refresh();
    });
  }

  function saveQuantity(itemId: string) {
    const qty = parseInt(quantities[itemId] ?? "0", 10);
    setMessage(null);
    startTransition(async () => {
      const result = await updateInvoiceItemQuantity(itemId, invoice.id, qty);
      setMessage(result.error ?? "Adet güncellendi");
      router.refresh();
    });
  }

  function toggleDelivered(itemId: string, value: boolean) {
    setDelivered((prev) => ({ ...prev, [itemId]: value }));
    startTransition(async () => {
      await toggleInvoiceItemDelivered(itemId, invoice.id, value);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">FATURA</h1>
          <p className="mt-1 text-sm text-slate-500">Assos Metal Stok Yönetimi</p>
          <p className="mt-2 break-all font-semibold text-slate-900">
            {invoice.invoice_number}
          </p>
        </div>
        <div className="w-full space-y-3 sm:max-w-xs">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Fatura Tarihi</span>
            <input
              type="datetime-local"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Cari</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                {invoice.customer_name ?? "Cari seçilmedi"}
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={saveMeta}
            disabled={isPending}
            className="w-full rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white hover:bg-[#152a45]"
          >
            Bilgileri Kaydet
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Oluşturma: {formatDate(invoice.created_at)}
      </p>

      <div className="space-y-3">
        {invoice.invoice_items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-start gap-3">
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={delivered[item.id] ?? false}
                  onChange={(e) => toggleDelivered(item.id, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-xs text-slate-500">Verildi</span>
              </label>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{item.product_name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-500">
                    Birim: {formatCurrency(item.unit_price)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Adet:</span>
                    <QuantityControl
                      size="sm"
                      value={parseInt(quantities[item.id] || "0", 10) || 0}
                      max={9999}
                      onChange={(value) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: value === 0 ? "" : String(value),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => saveQuantity(item.id)}
                      disabled={isPending}
                      className="rounded bg-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-300"
                    >
                      Güncelle
                    </button>
                  </div>
                  <span className="ml-auto font-semibold text-slate-900">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="rounded-lg bg-slate-50 px-4 py-4">
          <p className="text-sm text-slate-500">Genel Toplam</p>
          <p className="text-xl font-bold text-[#1e3a5f]">
            {formatCurrency(invoice.total_amount)}
          </p>
        </div>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-700">{message}</p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteInvoice } from "@/actions/invoices";

type Props = {
  invoices: Invoice[];
};

function DeleteInvoiceButton({
  invoice,
  className = "",
}: {
  invoice: Invoice;
  className?: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowConfirm(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className={`text-sm font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 ${className}`}
      >
        Sil
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isPending && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#1e3a5f]">Faturayı Sil</h2>
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">{invoice.invoice_number}</span>{" "}
              numaralı faturayı silmek istediğinize emin misiniz?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Bu işlem geri alınamaz. Stok otomatik iade edilmez.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceActions({
  invoice,
  layout = "row",
}: {
  invoice: Invoice;
  layout?: "row" | "table";
}) {
  return (
    <div
      className={
        layout === "table"
          ? "flex w-full items-center justify-end gap-4"
          : "flex w-full flex-wrap items-center gap-3"
      }
    >
      <Link
        href={`/faturalar/${invoice.id}`}
        className="text-sm font-medium text-[#1e3a5f] hover:underline"
      >
        Görüntüle
      </Link>
      <a
        href={`/api/invoices/${invoice.id}/pdf`}
        className="text-sm font-medium text-green-700 hover:underline"
        download
      >
        PDF İndir
      </a>
      <DeleteInvoiceButton invoice={invoice} className="ml-auto" />
    </div>
  );
}

export function InvoiceList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-500">Henüz fatura oluşturulmamış.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold text-[#1e3a5f]">
                  {invoice.invoice_number}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(invoice.created_at)}
                </p>
              </div>
              <p className="shrink-0 text-right text-sm font-bold text-slate-900">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <InvoiceActions invoice={invoice} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[720px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Fatura No
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Tarih
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Toplam
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-[#1e3a5f]">
                  {invoice.invoice_number}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(invoice.created_at)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(invoice.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <InvoiceActions invoice={invoice} layout="table" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

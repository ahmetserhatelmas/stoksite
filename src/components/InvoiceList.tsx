import Link from "next/link";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  invoices: Invoice[];
};

export function InvoiceList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-500">Henüz fatura oluşturulmamış.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full">
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
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/faturalar/${invoice.id}`}
                  className="mr-2 text-sm text-[#1e3a5f] hover:underline"
                >
                  Görüntüle
                </Link>
                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  className="text-sm text-green-700 hover:underline"
                  download
                >
                  PDF İndir
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { InvoiceWithItems } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  invoice: InvoiceWithItems;
};

export function InvoiceDetail({ invoice }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">FATURA</h1>
          <p className="mt-1 text-sm text-slate-500">Assos Metal Stok Yönetimi</p>
        </div>
        <div className="sm:text-right">
          <p className="break-all font-semibold text-slate-900">
            {invoice.invoice_number}
          </p>
          <p className="text-sm text-slate-500">{formatDate(invoice.created_at)}</p>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {invoice.invoice_items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <p className="font-medium text-slate-900">{item.product_name}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
              <div>
                <p className="text-slate-400">Adet</p>
                <p className="font-medium text-slate-900">{item.quantity}</p>
              </div>
              <div>
                <p className="text-slate-400">Birim</p>
                <p className="font-medium text-slate-900">
                  {formatCurrency(item.unit_price)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400">Toplam</p>
                <p className="font-medium text-slate-900">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 hidden overflow-x-auto md:block md:mb-8">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 text-left text-sm font-semibold text-slate-700">
                Ürün
              </th>
              <th className="py-3 text-center text-sm font-semibold text-slate-700">
                Adet
              </th>
              <th className="py-3 text-right text-sm font-semibold text-slate-700">
                Birim Fiyat
              </th>
              <th className="py-3 text-right text-sm font-semibold text-slate-700">
                Toplam
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.invoice_items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3 text-slate-900">{item.product_name}</td>
                <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="py-3 text-right text-slate-600">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="py-3 text-right font-medium text-slate-900">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full rounded-lg bg-slate-50 px-4 py-4 sm:w-auto sm:px-6">
          <p className="text-sm text-slate-500">Genel Toplam</p>
          <p className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">
            {formatCurrency(invoice.total_amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

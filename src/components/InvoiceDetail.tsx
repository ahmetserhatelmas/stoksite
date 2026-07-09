import type { InvoiceWithItems } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  invoice: InvoiceWithItems;
};

export function InvoiceDetail({ invoice }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">FATURA</h1>
          <p className="mt-1 text-slate-500">Assos Metal Stok Yönetimi</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
          <p className="text-sm text-slate-500">{formatDate(invoice.created_at)}</p>
        </div>
      </div>

      <table className="mb-8 w-full">
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

      <div className="flex justify-end">
        <div className="rounded-lg bg-slate-50 px-6 py-4">
          <p className="text-sm text-slate-500">Genel Toplam</p>
          <p className="text-2xl font-bold text-[#1e3a5f]">
            {formatCurrency(invoice.total_amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

import type { InvoiceItem, InvoiceWithItems } from "./types";
import { formatCurrency, formatDate } from "./utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function completedInvoiceItems(items: InvoiceItem[]) {
  return items.filter(
    (item) => item.quantity > 0 && item.product_name.trim().length > 0
  );
}

export function invoiceHtml(invoice: InvoiceWithItems) {
  const items = completedInvoiceItems(invoice.invoice_items);
  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.product_name)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatCurrency(item.unit_price)}</td>
          <td class="num">${formatCurrency(item.subtotal)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 28px; }
      h1 { color: #1e3a5f; font-size: 26px; margin: 0; }
      .sub { color: #64748b; margin: 4px 0 18px; font-size: 12px; }
      .meta { font-size: 13px; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 22px; }
      th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 8px 6px; font-size: 12px; color: #475569; }
      td { border-bottom: 1px solid #e2e8f0; padding: 10px 6px; font-size: 13px; }
      .num { text-align: right; }
      .total { margin-top: 24px; text-align: right; }
      .total strong { display: block; font-size: 20px; color: #1e3a5f; margin-top: 4px; }
    </style>
  </head>
  <body>
    <h1>FATURA</h1>
    <div class="sub">Assos Metal Stok Yönetimi</div>
    <div class="meta"><strong>Fatura No:</strong> ${escapeHtml(invoice.invoice_number)}</div>
    <div class="meta"><strong>Tarih:</strong> ${escapeHtml(
      formatDate(invoice.invoice_date ?? invoice.created_at)
    )}</div>
    <div class="meta"><strong>Cari:</strong> ${escapeHtml(invoice.customer_name ?? "Cari yok")}</div>
    <table>
      <thead>
        <tr>
          <th>Ürün</th>
          <th class="num">Adet</th>
          <th class="num">Birim Fiyat</th>
          <th class="num">Toplam</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">
      <span>Genel Toplam</span>
      <strong>${formatCurrency(Number(invoice.total_amount))}</strong>
    </div>
  </body>
</html>`;
}

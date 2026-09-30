import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getCustomers } from "@/actions/customers";
import { getInvoices } from "@/actions/invoices";
import { getMessages, getUnreadConversationCount } from "@/actions/messages";
import { getSession } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function UserPanelPage() {
  const session = await getSession();
  const unreadConversations = session
    ? await getUnreadConversationCount()
    : 0;
  if (!session) redirect("/giris");

  const [messages, invoices, customers] = await Promise.all([
    getMessages(),
    getInvoices().catch(() => []),
    getCustomers().catch(() => []),
  ]);

  const recentInvoices = invoices.slice(0, 6);
  const totalSales = invoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  );

  return (
    <>
      <Navbar user={session} unreadConversations={unreadConversations} />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 overflow-hidden rounded-2xl bg-[#2b2b2b] px-5 py-6 text-white sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#d4af37]">
                Kullanıcı paneli
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Merhaba, {session.name}
              </h1>
              <p className="mt-1 text-sm text-white/65">
                Sipariş, fatura ve mesajlarınızı buradan yönetin.
              </p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              {session.role === "admin" ? "Admin" : "Kullanıcı"} · @
              {session.username}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs text-white/55">Fatura</p>
              <p className="mt-1 text-2xl font-bold text-[#d4af37]">
                {invoices.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs text-white/55">Toplam satış</p>
              <p className="mt-1 text-2xl font-bold text-[#d4af37]">
                {formatCurrency(totalSales)}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
              <p className="text-xs text-white/55">Cari / Mesaj</p>
              <p className="mt-1 text-2xl font-bold text-[#d4af37]">
                {customers.length} / {messages.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-[#d4af37] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#1a1a1a]">Sipariş ekranı</p>
            <p className="mt-1 text-xs text-slate-500">Satış ve sepet işlemleri</p>
          </Link>
          <Link
            href="/faturalar"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-[#d4af37] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#1a1a1a]">Faturalar</p>
            <p className="mt-1 text-xs text-slate-500">Geçmiş siparişleri gör</p>
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-[#d4af37] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#1a1a1a]">
              Cariler ({customers.length})
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Siparişte Cari Seç ile yönet
            </p>
          </Link>
          <a
            href="/mesajlar"
            className="rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-[#d4af37] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#1a1a1a]">Mesajlar</p>
            <p className="mt-1 text-xs text-slate-500">Admin ile yazış</p>
          </a>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-[#1e3a5f]">
              Son faturalar
            </h2>
            <Link
              href="/faturalar"
              className="text-xs font-medium text-[#1e3a5f] hover:underline"
            >
              Tümünü gör →
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Henüz fatura yok. Sipariş ekranından satış yapabilirsiniz.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/faturalar/${invoice.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#1a1a1a]">
                        {invoice.invoice_number}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {invoice.customer_name ?? "Cari yok"} ·{" "}
                        {formatDate(invoice.invoice_date ?? invoice.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#1e3a5f]">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { getCustomers } from "@/actions/customers";
import { getInvoiceById } from "@/actions/invoices";
import { getSession } from "@/lib/session";
import { getUnreadConversationCount } from "@/actions/messages";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const [invoice, customers, user] = await Promise.all([
    getInvoiceById(id),
    getCustomers().catch(() => []),
    getSession(),
  ]);
  const unreadConversations = user
    ? await getUnreadConversationCount()
    : 0;

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <Navbar user={user} unreadConversations={unreadConversations} />
      <main className="mx-auto min-w-0 max-w-3xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/faturalar"
            className="text-sm text-[#1e3a5f] hover:underline"
          >
            ← Faturalara Dön
          </Link>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            download
          >
            PDF İndir
          </a>
        </div>
        <InvoiceEditor invoice={invoice} customers={customers} />
      </main>
    </>
  );
}

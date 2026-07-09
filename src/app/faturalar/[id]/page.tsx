import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { getInvoiceById } from "@/actions/invoices";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/faturalar"
            className="text-sm text-[#1e3a5f] hover:underline"
          >
            ← Faturalara Dön
          </Link>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            download
          >
            PDF İndir
          </a>
        </div>
        <InvoiceDetail invoice={invoice} />
      </main>
    </>
  );
}

import { Navbar } from "@/components/Navbar";
import { InvoiceList } from "@/components/InvoiceList";
import { getInvoices } from "@/actions/invoices";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Faturalar</h1>
          <p className="mt-2 text-slate-600">
            Geçmiş satış faturalarını görüntüleyin ve PDF olarak indirin.
          </p>
        </div>
        <InvoiceList invoices={invoices} />
      </main>
    </>
  );
}

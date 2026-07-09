import { Navbar } from "@/components/Navbar";
import { InvoiceList } from "@/components/InvoiceList";
import { getInvoices } from "@/actions/invoices";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <>
      <Navbar />
      <main className="mx-auto min-w-0 max-w-7xl flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-[#1e3a5f] sm:text-3xl">Faturalar</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Geçmiş satış faturalarını görüntüleyin ve PDF olarak indirin.
          </p>
        </div>
        <InvoiceList invoices={invoices} />
      </main>
    </>
  );
}

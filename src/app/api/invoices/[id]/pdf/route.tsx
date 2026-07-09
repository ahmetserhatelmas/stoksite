import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getInvoiceById } from "@/actions/invoices";
import { InvoicePDF } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}

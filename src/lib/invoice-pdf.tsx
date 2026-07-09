import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { InvoiceWithItems } from "@/lib/types";
import { registerPdfFonts } from "@/lib/pdf-fonts";

registerPdfFonts();

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Roboto",
  },
  header: {
    marginBottom: 30,
    borderBottom: "1pt solid #ccc",
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  meta: {
    marginTop: 10,
    fontSize: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #ccc",
    paddingBottom: 8,
    marginBottom: 8,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "0.5pt solid #eee",
  },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalBox: {
    marginTop: 20,
    alignSelf: "flex-end",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 4,
  },
  totalLabel: { fontSize: 10, color: "#666" },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginTop: 4,
  },
});

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("tr-TR");
}

export function InvoicePDF({ invoice }: { invoice: InvoiceWithItems }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FATURA</Text>
          <Text style={styles.subtitle}>Assos Metal Stok Yönetimi</Text>
          <Text style={styles.meta}>Fatura No: {invoice.invoice_number}</Text>
          <Text style={styles.meta}>Tarih: {formatDate(invoice.created_at)}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colProduct}>Ürün</Text>
          <Text style={styles.colQty}>Adet</Text>
          <Text style={styles.colPrice}>Birim Fiyat</Text>
          <Text style={styles.colTotal}>Toplam</Text>
        </View>

        {invoice.invoice_items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colProduct}>{item.product_name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
            <Text style={styles.colTotal}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Genel Toplam</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(invoice.total_amount)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

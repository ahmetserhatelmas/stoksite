import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deleteInvoices, getInvoiceById } from "../../../src/lib/api";
import { completedInvoiceItems, invoiceHtml } from "../../../src/lib/invoice-html";
import { colors } from "../../../src/lib/theme";
import type { InvoiceWithItems } from "../../../src/lib/types";
import { formatCurrency, formatDate } from "../../../src/lib/utils";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getInvoiceById(id)
      .then(setInvoice)
      .catch((err) => Alert.alert("Hata", err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const items = useMemo(
    () => (invoice ? completedInvoiceItems(invoice.invoice_items) : []),
    [invoice]
  );

  function confirmDelete() {
    if (!invoice) return;
    Alert.alert(
      "Faturayı sil",
      `${invoice.invoice_number} silinsin mi? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const result = await deleteInvoices([invoice.id]);
            setDeleting(false);
            if (result.error) {
              Alert.alert("Hata", result.error);
              return;
            }
            router.replace("/faturalar");
          },
        },
      ]
    );
  }

  async function createPdf() {
    if (!invoice) return;
    setPdfBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: invoiceHtml(invoice) });
      await shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: `${invoice.invoice_number}.pdf`,
      });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "PDF oluşturulamadı");
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text>Fatura bulunamadı</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Faturalar</Text>
      </Pressable>
      <Text style={styles.kicker}>Tamamlanmış fatura</Text>
      <Text style={styles.title}>{invoice.invoice_number}</Text>
      <Text style={styles.muted}>
        {invoice.customer_name ?? "Cari yok"}
      </Text>
      <Text style={styles.muted}>
        {formatDate(invoice.invoice_date ?? invoice.created_at)}
      </Text>
      <Text style={styles.total}>{formatCurrency(Number(invoice.total_amount))}</Text>

      <Pressable disabled={pdfBusy} onPress={createPdf} style={styles.pdfBtn}>
        <Text style={styles.pdfText}>{pdfBusy ? "PDF hazırlanıyor..." : "PDF Oluştur"}</Text>
      </Pressable>
      <Pressable disabled={deleting} onPress={confirmDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>{deleting ? "Siliniyor..." : "Faturayı Sil"}</Text>
      </Pressable>

      <Text style={styles.section}>Kalemler</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>Bu faturada ürün kalemi yok</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.product_name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.muted}>{item.quantity} adet</Text>
              <Text style={styles.muted}>{formatCurrency(item.unit_price)}</Text>
            </View>
            <Text style={styles.lineTotal}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 6, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { color: colors.navy, fontWeight: "700", marginBottom: 8 },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy },
  muted: { color: colors.muted },
  total: { fontSize: 22, fontWeight: "800", color: colors.gold, marginVertical: 8 },
  pdfBtn: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  pdfText: { color: "#fff", fontWeight: "800" },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  deleteText: { color: colors.danger, fontWeight: "800" },
  section: { fontWeight: "800", color: colors.navy, marginTop: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
  },
  name: { fontWeight: "700", color: colors.text },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  lineTotal: { fontWeight: "800", color: colors.navy, marginTop: 8 },
});

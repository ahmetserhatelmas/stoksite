import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { deleteInvoices, getInvoices } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";
import type { Invoice } from "../../src/lib/types";
import { formatCurrency, formatDate } from "../../src/lib/utils";

export default function InvoicesScreen() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    getInvoices()
      .then(setInvoices)
      .catch((err) => Alert.alert("Hata", err.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectedIds = invoices.filter((item) => selected[item.id]).map((item) => item.id);
  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length;

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAll() {
    if (allSelected) {
      setSelected({});
      return;
    }
    setSelected(Object.fromEntries(invoices.map((item) => [item.id, true])));
  }

  function confirmDelete(invoice: Invoice) {
    Alert.alert(
      "Faturayı sil",
      `${invoice.invoice_number} silinsin mi? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const result = await deleteInvoices([invoice.id]);
            if (result.error) Alert.alert("Hata", result.error);
            else {
              setSelected((prev) => {
                const next = { ...prev };
                delete next[invoice.id];
                return next;
              });
              load();
            }
          },
        },
      ]
    );
  }

  function confirmDeleteSelected() {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Faturaları sil",
      `${selectedIds.length} fatura silinsin mi? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const result = await deleteInvoices(selectedIds);
            if (result.error) Alert.alert("Hata", result.error);
            else {
              setSelected({});
              load();
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.head}>
        <Text style={styles.title}>Faturalar</Text>
        {invoices.length > 0 ? (
          <View style={styles.toolbar}>
            <Pressable onPress={toggleAll} style={styles.selectAll} hitSlop={8}>
              <View style={allSelected ? styles.checkOn : styles.checkOff}>
                {allSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.selectAllText}>
                {allSelected ? "Seçimi kaldır" : "Tümünü seç"}
              </Text>
            </Pressable>
            {selectedIds.length > 0 ? (
              <Pressable onPress={confirmDeleteSelected} style={styles.bulkDelete}>
                <Text style={styles.bulkDeleteText}>Sil ({selectedIds.length})</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        ListEmptyComponent={<Text style={styles.muted}>Henüz fatura yok</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, selected[item.id] && styles.cardOn]}>
            <Pressable onPress={() => toggleOne(item.id)} hitSlop={6} style={styles.checkHit}>
              <View style={selected[item.id] ? styles.checkOn : styles.checkOff}>
                {selected[item.id] ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
            <Link href={`/faturalar/${item.id}`} asChild>
              <Pressable style={styles.cardMain}>
                <Text style={styles.name}>{item.invoice_number}</Text>
                <Text style={styles.muted}>
                  {item.customer_name ?? "Cari yok"} ·{" "}
                  {formatDate(item.invoice_date ?? item.created_at)}
                </Text>
                <Text style={styles.amount}>{formatCurrency(Number(item.total_amount))}</Text>
              </Pressable>
            </Link>
            <Pressable onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Sil</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  head: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy },
  toolbar: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectAll: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAllText: { color: colors.navy, fontWeight: "700" },
  bulkDelete: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkDeleteText: { color: "#fff", fontWeight: "800" },
  checkHit: { paddingVertical: 4 },
  checkOff: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.navy,
    backgroundColor: "#fff",
  },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cardOn: { borderColor: colors.navy, backgroundColor: "#e8eef5" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardMain: { flex: 1, minWidth: 0 },
  name: { fontWeight: "700", color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amount: { fontWeight: "800", color: colors.navy, marginTop: 6 },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: { color: colors.danger, fontWeight: "800" },
});

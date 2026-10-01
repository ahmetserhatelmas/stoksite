import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { getCustomers, getInvoices, getMessages } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";
import type { Invoice } from "../../src/lib/types";
import { formatCurrency, formatDate } from "../../src/lib/utils";

export default function PanelScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([getInvoices(), getCustomers(), getMessages(user.id)])
      .then(([inv, cars, msgs]) => {
        setInvoices(inv);
        setCustomerCount(cars.length);
        setMessageCount(msgs.length);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  const total = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Kullanıcı paneli</Text>
        <Text style={styles.hello}>Merhaba, {user?.name}</Text>
        <Text style={styles.mutedLight}>
          {user?.role === "admin" ? "Admin" : "Kullanıcı"} · @{user?.username}
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Fatura</Text>
            <Text style={styles.statValue}>{invoices.length}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Satış</Text>
            <Text style={styles.statValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Cari / mesaj</Text>
            <Text style={styles.statValue}>
              {customerCount} / {messageCount}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.section}>Son faturalar</Text>
      {invoices.slice(0, 6).map((inv) => (
        <Link key={inv.id} href={`/faturalar/${inv.id}`} asChild>
          <Pressable style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>
                {inv.invoice_number}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {inv.customer_name ?? "Cari yok"} · {formatDate(inv.invoice_date ?? inv.created_at)}
              </Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(Number(inv.total_amount))}</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: colors.bar, borderRadius: 18, padding: 18 },
  kicker: { color: colors.gold, fontWeight: "700", textTransform: "uppercase", fontSize: 12 },
  hello: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 6 },
  mutedLight: { color: "rgba(255,255,255,0.65)", marginTop: 4 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 10 },
  statLabel: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  statValue: { color: colors.gold, fontWeight: "800", marginTop: 4 },
  section: { marginTop: 20, marginBottom: 8, fontWeight: "800", color: colors.navy },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardBody: { flex: 1, minWidth: 0 },
  name: { fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amount: { fontWeight: "800", color: colors.navy, flexShrink: 0 },
});

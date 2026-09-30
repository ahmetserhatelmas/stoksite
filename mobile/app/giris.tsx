import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/context/AuthContext";
import { colors } from "../src/lib/theme";

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Redirect href="/siparis" />;

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await login(username, password);
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    router.replace("/siparis");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>ASSOS METAL</Text>
          <Text style={styles.title}>Giriş Yap</Text>
          <Text style={styles.hint}>Admin ve kullanıcı aynı ekrandan girer.</Text>
          <Text style={styles.label}>Kullanıcı adı</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="admin"
            placeholderTextColor={colors.hint}
          />
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.hint}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={busy} onPress={submit} style={styles.button}>
            <Text style={styles.buttonText}>
              {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brand: { color: colors.gold, fontWeight: "800", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  hint: { color: colors.muted, marginTop: 6, marginBottom: 18 },
  label: { color: colors.muted, marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  error: { color: colors.danger, marginBottom: 10 },
  button: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});

import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AppShell } from "../../src/components/AppShell";
import { useAuth } from "../../src/context/AuthContext";
import { colors } from "../../src/lib/theme";

export default function AppGroupLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!user) return <Redirect href="/giris" />;

  return (
    <AppShell>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 180,
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </AppShell>
  );
}

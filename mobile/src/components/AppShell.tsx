import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { sx } from "../lib/style";
import { colors } from "../lib/theme";

type NavItem = { href: string; label: string; admin?: boolean };

const LINKS: NavItem[] = [
  { href: "/siparis", label: "Sipariş" },
  { href: "/stok", label: "Stok", admin: true },
  { href: "/faturalar", label: "Faturalar" },
  { href: "/mesajlar", label: "Mesajlar" },
  { href: "/panel", label: "Panel" },
  { href: "/yonetim", label: "Admin", admin: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/siparis") return pathname === "/siparis";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, unread, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;
  const drawerWidth = Math.min(280, width * 0.8);
  const [menuMounted, setMenuMounted] = useState(false);
  const menuOpen = useRef(false);
  const slide = useRef(new Animated.Value(0)).current;

  const links = LINKS.filter((link) => !link.admin || user?.role === "admin");

  function openMenu() {
    menuOpen.current = true;
    slide.setValue(0);
    setMenuMounted(true);
  }

  function closeMenu(after?: () => void) {
    if (!menuMounted) {
      after?.();
      return;
    }
    menuOpen.current = false;
    slide.stopAnimation();
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !menuOpen.current) setMenuMounted(false);
      after?.();
    });
  }

  useEffect(() => {
    if (!menuMounted || !menuOpen.current) return;
    Animated.timing(slide, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [menuMounted, slide]);

  function go(href: string) {
    closeMenu(() => router.navigate(href as never));
  }

  async function handleLogout() {
    closeMenu(async () => {
      await logout();
      router.replace("/giris");
    });
  }

  const navItems = (
    <View>
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Pressable
            key={link.href}
            onPress={() => go(link.href)}
            style={sx(styles.link, active && styles.linkActive)}
          >
            <Text style={active ? styles.linkTextActive : styles.linkText}>
              {link.label}
            </Text>
            {link.href === "/mesajlar" && unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {tablet ? (
        <View style={styles.tabletRow}>
          <View style={styles.sidebar}>
            <Text style={styles.brand}>ASSOS METAL</Text>
            <Text style={styles.sub}>STOK YÖNETİMİ</Text>
            {navItems}
            <View style={styles.spacer} />
            <Text style={styles.user}>{user?.name}</Text>
            <Pressable onPress={handleLogout} style={styles.logout}>
              <Text style={styles.logoutText}>Çıkış</Text>
            </Pressable>
          </View>
          <View style={styles.main}>{children}</View>
        </View>
      ) : (
        <View style={styles.phoneCol}>
          <View style={styles.topBar}>
            <Pressable onPress={openMenu} hitSlop={8}>
              <Text style={styles.menuBtnText}>Menü</Text>
            </Pressable>
            <Text style={styles.topTitle}>ASSOS METAL</Text>
            <Text style={styles.userShort} numberOfLines={1}>
              {user?.name?.split(" ")[0] ?? ""}
            </Text>
          </View>
          <View style={styles.main}>{children}</View>
          <Modal
            visible={menuMounted}
            animationType="none"
            transparent
            onRequestClose={() => closeMenu()}
          >
            <View style={styles.modalRoot}>
              <Animated.View
                style={[
                  styles.drawer,
                  { width: drawerWidth },
                  {
                    transform: [
                      {
                        translateX: slide.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-drawerWidth, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.brand}>ASSOS METAL</Text>
                <Text style={styles.sub}>STOK YÖNETİMİ</Text>
                {navItems}
                <View style={styles.spacer} />
                <Text style={styles.user}>{user?.name}</Text>
                <Pressable onPress={handleLogout} style={styles.logout}>
                  <Text style={styles.logoutText}>Çıkış</Text>
                </Pressable>
              </Animated.View>
              <Animated.View style={[styles.modalDim, { opacity: slide }]}>
                <Pressable style={styles.dimPress} onPress={() => closeMenu()} />
              </Animated.View>
            </View>
          </Modal>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bar },
  tabletRow: { flex: 1, flexDirection: "row" },
  phoneCol: { flex: 1 },
  sidebar: {
    width: 220,
    backgroundColor: colors.bar,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  drawer: {
    height: "100%",
    backgroundColor: colors.bar,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
  },
  main: { flex: 1, backgroundColor: colors.bg },
  brand: { color: colors.gold, fontWeight: "800", letterSpacing: 0.4 },
  sub: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 18, marginTop: 2 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 4,
  },
  linkActive: { backgroundColor: colors.gold },
  linkText: { color: "rgba(255,255,255,0.92)", fontWeight: "600", fontSize: 16 },
  linkTextActive: { color: "#1a1a1a" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  spacer: { flex: 1 },
  user: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 8 },
  userShort: { color: "rgba(255,255,255,0.7)", fontSize: 12, width: 56, textAlign: "right" },
  logout: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "600" },
  topBar: {
    height: 52,
    backgroundColor: colors.bar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  topTitle: { color: colors.gold, fontWeight: "800", fontSize: 15 },
  menuBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalRoot: { flex: 1, flexDirection: "row" },
  modalDim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  dimPress: { flex: 1 },
});

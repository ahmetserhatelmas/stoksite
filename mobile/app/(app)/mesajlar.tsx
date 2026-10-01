import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useWideLayout } from "../../src/lib/layout";
import { sx } from "../../src/lib/style";
import {
  getMessages,
  getUsers,
  markConversationRead,
  sendMessage,
} from "../../src/lib/api";
import { colors } from "../../src/lib/theme";
import type { AppUser, Message } from "../../src/lib/types";

export default function MessagesScreen() {
  const { user, refreshUnread } = useAuth();
  const insets = useSafeAreaInsets();
  const { wide } = useWideLayout();
  const threadRef = useRef<FlatList<Message>>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [u, m] = await Promise.all([getUsers(), getMessages(user.id)]);
    setUsers(u);
    setMessages(m);
    setLoading(false);
    await refreshUnread();
  }, [user, refreshUnread]);

  useEffect(() => {
    load().catch((err) => Alert.alert("Hata", err.message));
  }, [load]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardOpen(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const others = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (u.id === user?.id) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      );
    });
  }, [users, user?.id, userQuery]);
  const thread = useMemo(
    () =>
      messages.filter(
        (m) =>
          selectedId &&
          ((m.sender_id === user?.id && m.receiver_id === selectedId) ||
            (m.sender_id === selectedId && m.receiver_id === user?.id))
      ),
    [messages, selectedId, user?.id]
  );

  async function openChat(id: string) {
    setSelectedId(id);
    if (user) {
      await markConversationRead(user.id, id);
      await load();
    }
  }

  async function send() {
    if (!user || !selectedId || !body.trim()) return;
    const result = await sendMessage(user.id, selectedId, body);
    if (result.error) {
      Alert.alert("Hata", result.error);
      return;
    }
    setBody("");
    await load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  const peopleList = (
    <View style={wide ? styles.listWide : styles.list}>
      <TextInput
        value={userQuery}
        onChangeText={setUserQuery}
        placeholder="Kullanıcı adı veya isim ara"
        placeholderTextColor={colors.hint}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />
      <FlatList
      data={others}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={<Text style={styles.empty}>Kullanıcı bulunamadı</Text>}
      renderItem={({ item }) => {
        const unread = messages.filter(
          (m) => m.sender_id === item.id && m.receiver_id === user?.id && !m.is_read
        ).length;
        const active = selectedId === item.id;
        return (
          <Pressable
            onPress={() => openChat(item.id)}
            style={sx(styles.person, active && styles.personOn)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.muted}>@{item.username}</Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
    </View>
  );

  const composerPad = keyboardOpen ? 8 : Math.max(insets.bottom, 10);
  const keyboardOffset = wide ? insets.top : insets.top + 52;

  const chat = (
    <KeyboardAvoidingView
      style={styles.chat}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {!wide && selectedId ? (
        <Pressable onPress={() => setSelectedId(null)} style={styles.back}>
          <Text style={styles.backText}>← Kişiler</Text>
        </Pressable>
      ) : null}
      {!selectedId ? (
        <Text style={styles.pickHint}>Bir kişi seçin</Text>
      ) : (
        <>
          <FlatList
            ref={threadRef}
            data={thread}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => threadRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View style={sx(styles.bubble, mine ? styles.mine : styles.theirs)}>
                  <Text style={mine ? styles.mineText : styles.theirsText}>{item.body}</Text>
                </View>
              );
            }}
          />
          <View style={[styles.composer, { paddingBottom: composerPad }]}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.hint}
              style={styles.input}
            />
            <Pressable onPress={send} style={styles.send}>
              <Text style={styles.sendText}>Gönder</Text>
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <View style={wide ? styles.pageRow : styles.pageCol}>
      {wide || !selectedId ? peopleList : null}
      {wide || selectedId ? chat : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pageRow: { flex: 1, flexDirection: "row" },
  pageCol: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1, backgroundColor: "#fff" },
  listWide: { width: 320, backgroundColor: "#fff", borderRightWidth: 1, borderColor: colors.line },
  search: {
    margin: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
  person: { padding: 16, borderBottomWidth: 1, borderColor: colors.line },
  personOn: { backgroundColor: "#e8eef5" },
  name: { fontWeight: "700", fontSize: 16 },
  muted: { color: colors.muted, fontSize: 12 },
  badge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  chat: { flex: 1 },
  back: { paddingHorizontal: 12, paddingVertical: 10 },
  backText: { color: colors.navy, fontWeight: "700" },
  pickHint: { color: colors.muted, padding: 16 },
  thread: { padding: 12, gap: 8 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.navy },
  theirs: { alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line },
  mineText: { color: "#fff" },
  theirsText: { color: colors.text },
  composer: { flexDirection: "row", gap: 8, padding: 10, backgroundColor: "#fff" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  send: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  sendText: { color: "#fff", fontWeight: "700" },
});

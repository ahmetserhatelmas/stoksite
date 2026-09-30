import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCategories, getAllProducts, getCustomers, getUnreadConversationCount, loginUser } from "../lib/api";
import { clearSession, loadSession, saveSession } from "../lib/session";
import type { SessionUser } from "../lib/types";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  unread: number;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUnread: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  async function refreshUnread(nextUser = user) {
    if (!nextUser) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await getUnreadConversationCount(nextUser.id));
    } catch {
      setUnread(0);
    }
  }

  useEffect(() => {
    loadSession()
      .then(async (session) => {
        setUser(session);
        if (session) await refreshUnread(session);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getCategories().catch(() => undefined);
    getAllProducts().catch(() => undefined);
    getCustomers().catch(() => undefined);
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      unread,
      async login(username, password) {
        const result = await loginUser(username, password);
        if (result.error || !result.user) return result.error ?? "Giriş başarısız";
        await saveSession(result.user);
        setUser(result.user);
        await refreshUnread(result.user);
        return null;
      },
      async logout() {
        await clearSession();
        setUser(null);
        setUnread(0);
      },
      refreshUnread: () => refreshUnread(user),
    }),
    [user, loading, unread]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider içinde kullanılmalı");
  return ctx;
}

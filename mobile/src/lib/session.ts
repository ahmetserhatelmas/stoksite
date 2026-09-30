import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionUser } from "./types";

const KEY = "stok_session";

export async function loadSession(): Promise<SessionUser | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function saveSession(user: SessionUser) {
  await AsyncStorage.setItem(KEY, JSON.stringify(user));
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}

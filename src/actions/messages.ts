"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import type { AppUser, Message } from "@/lib/types";

function revalidateMessagePaths() {
  revalidatePath("/mesajlar");
  revalidatePath("/admin");
  revalidatePath("/panel");
  revalidatePath("/");
  revalidatePath("/faturalar");
  revalidatePath("/yonetim");
}

export async function getUsers(): Promise<AppUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, created_at")
    .order("name");

  if (error) throw new Error(error.message);
  return data as AppUser[];
}

export async function getMessages(): Promise<Message[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(
      "*, sender:app_users!messages_sender_id_fkey(id, name, username, role), receiver:app_users!messages_receiver_id_fkey(id, name, username, role)"
    )
    .or(`sender_id.eq.${session.id},receiver_id.eq.${session.id}`)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Message[];
}

/** Okunmamış mesajı olan kişi sayısı (WhatsApp tarzı üst bildirim). */
export async function getUnreadConversationCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("receiver_id", session.id)
    .eq("is_read", false);

  if (error || !data) return 0;
  return new Set(data.map((row) => row.sender_id)).size;
}

export async function markConversationRead(otherUserId: string) {
  const session = await getSession();
  if (!session) return { error: "Giriş yapmalısınız" };
  if (!otherUserId) return { error: "Kullanıcı gerekli" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", session.id)
    .eq("sender_id", otherUserId)
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidateMessagePaths();
  return { success: true };
}

export async function sendMessage(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Giriş yapmalısınız" };

  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!receiverId || !body) {
    return { error: "Alıcı ve mesaj gerekli" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    sender_id: session.id,
    receiver_id: receiverId,
    body,
    is_read: false,
  });

  if (error) return { error: error.message };

  revalidateMessagePaths();
  return { success: true };
}

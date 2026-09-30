"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearSession, setSession, type SessionUser } from "@/lib/session";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Kullanıcı adı ve şifre gerekli" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, username, role, password")
    .eq("username", username)
    .single();

  if (error || !data || data.password !== password) {
    return { error: "Kullanıcı adı veya şifre hatalı" };
  }

  const user: SessionUser = {
    id: data.id,
    name: data.name,
    username: data.username,
    role: data.role,
  };

  await setSession(user);

  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith("/") && !next.startsWith("//")) {
    redirect(next);
  }
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/giris");
}

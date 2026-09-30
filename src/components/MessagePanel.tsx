"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, Message } from "@/lib/types";
import { markConversationRead, sendMessage } from "@/actions/messages";
import { formatDate } from "@/lib/utils";

type Props = {
  currentUserId: string;
  users: AppUser[];
  messages: Message[];
};

type Conversation = {
  user: AppUser;
  messages: Message[];
  lastMessage: Message | null;
  unreadCount: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function shortTime(date: string) {
  return new Date(date).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessagePanel({ currentUserId, users, messages }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const others = useMemo(
    () => users.filter((u) => u.id !== currentUserId),
    [users, currentUserId]
  );

  const conversations = useMemo(() => {
    const list: Conversation[] = others.map((user) => {
      const thread = messages.filter(
        (m) =>
          (m.sender_id === currentUserId && m.receiver_id === user.id) ||
          (m.sender_id === user.id && m.receiver_id === currentUserId)
      );
      const unreadCount = thread.filter(
        (m) => m.receiver_id === currentUserId && !m.is_read
      ).length;
      return {
        user,
        messages: thread,
        lastMessage: thread[thread.length - 1] ?? null,
        unreadCount,
      };
    });

    return list.sort((a, b) => {
      const at = a.lastMessage?.created_at
        ? new Date(a.lastMessage.created_at).getTime()
        : 0;
      const bt = b.lastMessage?.created_at
        ? new Date(b.lastMessage.created_at).getTime()
        : 0;
      if (bt !== at) return bt - at;
      return a.user.name.localeCompare(b.user.name, "tr");
    });
  }, [others, messages, currentUserId]);

  const selected =
    conversations.find((c) => c.user.id === selectedId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, selectedId]);

  function openConversation(userId: string) {
    setSelectedId(userId);
    setMobileShowChat(true);
    setError(null);
    startTransition(async () => {
      await markConversationRead(userId);
      router.refresh();
    });
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !body.trim()) return;
    setError(null);
    const formData = new FormData();
    formData.set("receiver_id", selectedId);
    formData.set("body", body.trim());
    startTransition(async () => {
      const result = await sendMessage(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid h-[min(70vh,640px)] lg:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <aside
          className={`flex min-h-0 flex-col border-r border-slate-200 bg-[#111b21] text-white ${
            mobileShowChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold">Sohbetler</p>
            <p className="text-xs text-white/50">
              Okunmamış kişi:{" "}
              {conversations.filter((c) => c.unreadCount > 0).length}
            </p>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-white/50">
                Henüz kullanıcı yok.
              </li>
            ) : (
              conversations.map((c) => {
                const active = c.user.id === selectedId;
                const preview = c.lastMessage?.body ?? "Sohbet başlat";
                return (
                  <li key={c.user.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.user.id)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                        active ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-sm font-bold text-[#1a1a1a]">
                        {initials(c.user.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {c.user.name}
                          </p>
                          {c.lastMessage && (
                            <span className="shrink-0 text-[10px] text-white/40">
                              {shortTime(c.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-white/55">
                            {c.lastMessage?.sender_id === currentUserId
                              ? `Siz: ${preview}`
                              : preview}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-[10px] font-bold text-[#052e16]">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Chat thread */}
        <div
          className={`flex min-h-0 flex-col bg-[#efeae2] ${
            mobileShowChat ? "flex" : "hidden lg:flex"
          }`}
        >
          {selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-black/10 bg-[#2b2b2b] px-3 py-3 text-white">
                <button
                  type="button"
                  onClick={() => setMobileShowChat(false)}
                  className="rounded-lg px-2 py-1 text-sm hover:bg-white/10 lg:hidden"
                >
                  ←
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d4af37] text-xs font-bold text-[#1a1a1a]">
                  {initials(selected.user.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selected.user.name}
                  </p>
                  <p className="text-xs text-white/55">
                    {selected.user.role === "admin" ? "Admin" : "Kullanıcı"} · @
                    {selected.user.username}
                  </p>
                </div>
              </div>

              <ul className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
                {selected.messages.length === 0 ? (
                  <li className="py-16 text-center text-sm text-slate-600">
                    Henüz mesaj yok. İlk mesajı siz yazın.
                  </li>
                ) : (
                  selected.messages.map((msg) => {
                    const mine = msg.sender_id === currentUserId;
                    return (
                      <li
                        key={msg.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                            mine
                              ? "rounded-br-md bg-[#dcf8c6] text-slate-900"
                              : "rounded-bl-md bg-white text-slate-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.body}
                          </p>
                          <p className="mt-1 text-right text-[10px] text-slate-500">
                            {formatDate(msg.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </ul>

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 border-t border-black/10 bg-[#f0f2f5] p-3"
              >
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={1}
                  placeholder="Mesaj yazın..."
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border-0 bg-white px-3 py-2.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-[#d4af37]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isPending || !body.trim()}
                  className="rounded-xl bg-[#25d366] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1fb855] disabled:opacity-50"
                >
                  Gönder
                </button>
              </form>
              {error && (
                <p className="bg-[#f0f2f5] px-3 pb-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-600">
              Soldan bir sohbet seçin.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

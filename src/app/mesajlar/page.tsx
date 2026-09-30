import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { MessagePanel } from "@/components/MessagePanel";
import {
  getMessages,
  getUnreadConversationCount,
  getUsers,
} from "@/actions/messages";
import { getSession } from "@/lib/session";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const [users, messages, unreadConversations] = await Promise.all([
    getUsers(),
    getMessages(),
    getUnreadConversationCount(),
  ]);

  return (
    <>
      <Navbar user={session} unreadConversations={unreadConversations} />
      <main className="mx-auto max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">
            Mesajlar
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            WhatsApp tarzı sohbet: soldan kişi seçin, okuyunca bildirim düşer.
          </p>
        </div>
        <MessagePanel
          currentUserId={session.id}
          users={users}
          messages={messages}
        />
      </main>
    </>
  );
}

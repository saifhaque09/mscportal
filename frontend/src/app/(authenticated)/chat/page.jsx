"use client";

export default function ChatPage() {
  const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:5173";
  return <section className="flex min-h-[calc(100vh-7rem)] flex-col gap-4"><div><h1 className="text-2xl font-semibold">Chat</h1><p className="text-sm text-muted-foreground">Secure conversations with clients and your team.</p></div><div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm"><iframe title="MSC Portal Chat" src={chatUrl} className="h-full min-h-[650px] w-full border-0" /></div></section>;
}

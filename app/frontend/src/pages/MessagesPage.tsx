import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Send, MessageSquare } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  startConversation,
  type ChatMessage,
  type ConversationPreview,
} from "@/lib/messaging";
import { fetchProfileCards, listAcceptedConnections, peerUserId } from "@/lib/connections";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function initials(name?: string) {
  if (!name) return "FE";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "sm" ? "w-8 h-8 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-10 h-10 text-xs";
  return (
    <div
      className={`${box} rounded-full bg-primary/10 text-primary overflow-hidden shrink-0 flex items-center justify-center font-semibold`}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials(name)}
    </div>
  );
}

function formatStamp(value: string, lang: string) {
  const date = new Date(value);
  const sameDay = new Date().toDateString() === date.toDateString();
  return date.toLocaleTimeString(lang === "ar" ? "ar" : "en", {
    hour: "2-digit",
    minute: "2-digit",
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
  });
}

export default function MessagesPage() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const [params, setParams] = useSearchParams();
  usePageMeta({ title: t("messages.title"), description: t("messages.desc"), path: "/messages", noIndex: true });

  const [inbox, setInbox] = useState<ConversationPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("c"));
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peers, setPeers] = useState<Array<{ id: string; name: string; avatar: string | null }>>([]);

  const active = useMemo(() => inbox.find((c) => c.id === activeId) || null, [inbox, activeId]);
  const myName = profile?.full_name || t("messages.you");
  const myAvatar = profile?.avatar_url || null;

  const reloadInbox = async () => {
    if (!user) return;
    const rows = await listConversations(user.id);
    setInbox(rows);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const withUser = params.get("with");
      if (withUser) {
        const started = await startConversation(withUser);
        if (started.id && !cancelled) {
          setActiveId(started.id);
          setParams({ c: started.id }, { replace: true });
        } else if (started.error) {
          toast.error(started.error.includes("connect") ? t("messages.need_connect") : started.error);
        }
      }
      const rows = await listConversations(user.id);
      const connections = await listAcceptedConnections(user.id);
      const cards = await fetchProfileCards(connections.map((c) => peerUserId(c, user.id)));
      if (!cancelled) {
        setInbox(rows);
        setPeers(
          connections.map((c) => {
            const id = peerUserId(c, user.id);
            return { id, name: cards[id]?.name || t("community.member"), avatar: cards[id]?.avatar || null };
          }),
        );
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    listMessages(activeId).then((rows) => {
      if (!cancelled) setMessages(rows);
    });
    markConversationRead(activeId, user.id);
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeId, user?.id]);

  const submit = async () => {
    if (!user || !activeId || draft.trim().length < 1) return;
    setSending(true);
    const { error } = await sendMessage(activeId, user.id, draft);
    setSending(false);
    if (error) {
      toast.error(error);
      return;
    }
    setDraft("");
    const rows = await listMessages(activeId);
    setMessages(rows);
    reloadInbox();
  };

  const openWith = async (peerId: string) => {
    const started = await startConversation(peerId);
    if (started.error || !started.id) {
      toast.error(started.error || t("messages.need_connect"));
      return;
    }
    setActiveId(started.id);
    setParams({ c: started.id });
    reloadInbox();
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      <div className="pt-20 max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t("messages.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("messages.desc")}</p>
        </div>
        {!user ? (
          <Button asChild>
            <Link to="/auth?mode=login">{t("nav.login")}</Link>
          </Button>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-[300px_minmax(0,1fr)] min-h-[36rem] rounded-3xl border border-border overflow-hidden bg-card shadow-sm">
            <aside className="border-e border-border bg-[hsl(208_40%_98%)] dark:bg-secondary/20 flex flex-col">
              <div className="px-4 py-4 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("messages.inbox")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {inbox.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-6">{t("messages.empty")}</p>
                )}
                {inbox.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      setParams({ c: c.id });
                    }}
                    className={`w-full text-start rounded-2xl px-3 py-2.5 transition flex items-center gap-3 ${
                      activeId === c.id ? "bg-background shadow-sm" : "hover:bg-background/70"
                    }`}
                  >
                    <Avatar src={c.peer_avatar} name={c.peer_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{c.peer_name}</span>
                        {c.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{c.last_body || t("messages.pick")}</p>
                    </div>
                  </button>
                ))}
              </div>
              {peers.length > 0 && (
                <div className="p-3 border-t border-border">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground px-1 mb-2">
                    {t("messages.new")}
                  </p>
                  {peers.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openWith(p.id)}
                      className="w-full text-start text-sm px-2 py-2 rounded-xl hover:bg-background flex items-center gap-2"
                    >
                      <Avatar src={p.avatar} name={p.name} size="sm" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </aside>
            <section className="flex flex-col min-h-[36rem] bg-background">
              {!active ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{t("messages.pick")}</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                    <Avatar src={active.peer_avatar} name={active.peer_name} size="lg" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{active.peer_name}</p>
                      <p className="text-xs text-muted-foreground">{t("messages.connected")}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[hsl(208_35%_97%)] dark:bg-background">
                    {messages.map((m) => {
                      const mine = m.sender_id === user.id;
                      const name = mine ? myName : active.peer_name;
                      const avatar = mine ? myAvatar : active.peer_avatar;
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                          <Avatar src={avatar} name={name} size="sm" />
                          <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-sm ${
                                mine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-card border border-border rounded-bl-md"
                              }`}
                            >
                              {m.body}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                              {formatStamp(m.created_at, lang)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-border bg-card flex items-end gap-2">
                    <Avatar src={myAvatar} name={myName} size="sm" />
                    <Textarea
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                      placeholder={t("messages.ph")}
                      className="resize-none rounded-2xl"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void submit();
                        }
                      }}
                    />
                    <Button className="shrink-0 h-10 rounded-full px-4" disabled={sending} onClick={submit}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          {lang === "ar" ? "الرسائل متاحة بعد قبول طلب التواصل." : "Messaging is available after a connection is accepted."}
        </p>
      </div>
    </div>
  );
}

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
import { fetchProfileNames, listAcceptedConnections, peerUserId } from "@/lib/connections";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function MessagesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  usePageMeta({ title: t("messages.title"), description: t("messages.desc"), path: "/messages" });

  const [inbox, setInbox] = useState<ConversationPreview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("c"));
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peers, setPeers] = useState<Array<{ id: string; name: string }>>([]);

  const active = useMemo(() => inbox.find((c) => c.id === activeId) || null, [inbox, activeId]);

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
      const names = await fetchProfileNames(connections.map((c) => peerUserId(c, user.id)));
      if (!cancelled) {
        setInbox(rows);
        setPeers(connections.map((c) => ({ id: peerUserId(c, user.id), name: names[peerUserId(c, user.id)] || t("community.member") })));
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <h1 className="text-2xl font-bold mb-2">{t("messages.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("messages.desc")}</p>
        {!user ? (
          <Button asChild>
            <Link to="/auth?mode=login">{t("nav.login")}</Link>
          </Button>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-[280px_minmax(0,1fr)] gap-4 min-h-[32rem] rounded-2xl border border-border overflow-hidden bg-card">
            <aside className="border-e border-border p-3 space-y-2 bg-secondary/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {t("messages.inbox")}
              </p>
              {inbox.length === 0 && (
                <p className="text-xs text-muted-foreground px-1 py-4">{t("messages.empty")}</p>
              )}
              {inbox.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setParams({ c: c.id });
                  }}
                  className={`w-full text-start rounded-xl px-3 py-2.5 transition ${
                    activeId === c.id ? "bg-background shadow-sm" : "hover:bg-background/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.peer_name}</span>
                    {c.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{c.last_body}</p>
                </button>
              ))}
              {peers.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground px-1 mb-2">
                    {t("messages.new")}
                  </p>
                  {peers.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openWith(p.id)}
                      className="w-full text-start text-sm px-3 py-1.5 rounded-lg hover:bg-background"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </aside>
            <section className="flex flex-col min-h-[32rem]">
              {!active ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-sm">{t("messages.pick")}</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-border font-semibold">{active.peer_name}</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                          m.sender_id === user.id
                            ? "ms-auto bg-primary text-primary-foreground"
                            : "bg-secondary"
                        }`}
                      >
                        {m.body}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border flex gap-2">
                    <Textarea
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
                      placeholder={t("messages.ph")}
                      className="resize-none"
                    />
                    <Button className="shrink-0 h-10" disabled={sending} onClick={submit}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">{lang === "ar" ? "الرسائل متاحة بعد قبول طلب التواصل." : "Messaging is available after a connection is accepted."}</p>
      </div>
    </div>
  );
}


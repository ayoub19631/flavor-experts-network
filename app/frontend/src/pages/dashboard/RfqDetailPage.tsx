import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { compareRfqQuotes, decideQuote, getRfq, sendRfqMessage } from "@/lib/marketplace/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { showVerifiedBadge } from "@/lib/marketplace/privacy";
import { Badge } from "@/components/ui/badge";

type QuoteRow = {
  quote_id: string;
  status: string;
  supplier_id: string;
  supplier_name: string;
  is_verified?: boolean;
  price?: number;
  currency?: string;
  price_unit?: string;
  moq?: string;
  packaging?: string;
  lead_time_days?: number;
  incoterm?: string;
  sample_terms?: string;
  valid_until?: string;
  certifications?: string[];
};

function Inner() {
  const { id } = useParams();
  const { t } = useI18n();
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  usePageMeta({ title: t("rfq.title"), path: `/dashboard/rfqs/${id || ""}`, noIndex: true });

  async function reload() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getRfq(id);
      setDetail(data);
      const cmp = await compareRfqQuotes(id).catch(() => ({ quotes: [] }));
      setQuotes(((cmp.quotes as QuoteRow[]) || []));
    } catch {
      setDetail(null);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [id]);

  const rfq = (detail?.rfq || {}) as { title?: string; status?: string; id?: string };
  const disclaimer = String(detail?.disclaimer || t("mp.disclaimer"));

  async function act(action: string, quoteId?: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (quoteId) await decideQuote(quoteId, action, reason);
      else await supabase.rpc(action === "close" ? "close_rfq" : "cancel_rfq", { p_rfq_id: id, p_reason: reason });
      toast.success(action);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 space-y-6">
        {loading && <p className="text-muted-foreground" role="status">{t("dash.loading")}</p>}
        <h1 className="text-3xl font-bold">{rfq.title || t("rfq.title")}</h1>
        <p className="text-sm text-muted-foreground">{rfq.status}</p>
        {detail?.new_unverified_buyer && <p className="text-sm text-amber-600">{t("mp.unverified_warn")}</p>}
        <p className="text-sm">{disclaimer}</p>
        <p className="text-sm">{t("mp.no_fx")}</p>
        <div className="space-y-1">
          <Label htmlFor="rfq-reason">{t("rfq.reason")}</Label>
          <Input id="rfq-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rfq.reason")} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void act("close")}>{t("rfq.close")}</Button>
          <Button variant="outline" disabled={busy} onClick={() => void act("cancel")}>{t("rfq.cancel")}</Button>
        </div>
        <h2 className="font-semibold">{t("rfq.compare")}</h2>
        {!loading && quotes.length === 0 && <p className="text-sm text-muted-foreground">{t("common.empty")}</p>}
        <div className="grid gap-3 md:hidden">
          {quotes.map((q) => (
            <article key={q.quote_id} className="rounded-xl border p-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{q.supplier_name}</strong>
                {showVerifiedBadge(q.is_verified) && <Badge>{t("mp.verified")}</Badge>}
              </div>
              <p>{t("mp.status")}: {q.status}</p>
              <p>{t("mp.price")}: {q.price} {q.currency} / {q.price_unit || "—"}</p>
              <p>{t("mp.moq")}: {q.moq || "—"}</p>
              <p>{t("mp.lead")}: {q.lead_time_days ?? "—"}</p>
              <p>{t("mp.incoterms")}: {q.incoterm || "—"}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => { setSupplierId(q.supplier_id); void act("shortlist", q.quote_id); }}>{t("rfq.shortlist")}</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("accept", q.quote_id)}>{t("rfq.accept")}</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("reject", q.quote_id)}>{t("rfq.reject")}</Button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-start">{t("mp.suppliers")}</th>
                <th className="p-2 text-start">{t("mp.status")}</th>
                <th className="p-2 text-start">{t("mp.price")}</th>
                <th className="p-2 text-start">{t("mp.moq")}</th>
                <th className="p-2 text-start">{t("mp.lead")}</th>
                <th className="p-2 text-start">{t("mp.incoterms")}</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.quote_id} className="border-t">
                  <td className="p-2">
                    {q.supplier_name}
                    {showVerifiedBadge(q.is_verified) && <Badge className="ms-2">{t("mp.verified")}</Badge>}
                  </td>
                  <td className="p-2">{q.status}</td>
                  <td className="p-2">{q.price} {q.currency} / {q.price_unit || "—"}</td>
                  <td className="p-2">{q.moq || "—"}</td>
                  <td className="p-2">{q.lead_time_days ?? "—"}</td>
                  <td className="p-2">{q.incoterm || "—"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setSupplierId(q.supplier_id); void act("shortlist", q.quote_id); }}>{t("rfq.shortlist")}</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("accept", q.quote_id)}>{t("rfq.accept")}</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("reject", q.quote_id)}>{t("rfq.reject")}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">{t("rfq.message")}</h2>
          <Label htmlFor="rfq-supplier">{t("rfq.supplier_id")}</Label>
          <Input id="rfq-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder={t("rfq.supplier_id")} />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button variant="outline" disabled={busy || !supplierId || !message.trim()} onClick={() => {
            if (busy) return;
            setBusy(true);
            sendRfqMessage(id || "", supplierId, message)
              .then(() => toast.success(t("rfq.message")))
              .catch((error) => toast.error(error instanceof Error ? error.message : t("rfq.failed")))
              .finally(() => setBusy(false));
          }}>{t("rfq.message")}</Button>
        </div>
      </div>
    </div>
  );
}

export default function RfqDetailPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

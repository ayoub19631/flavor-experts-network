import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  usePageMeta({ title: t("rfq.title"), path: `/dashboard/rfqs/${id || ""}`, noIndex: true });

  async function reload() {
    if (!id) return;
    const data = await getRfq(id);
    setDetail(data);
    const cmp = await compareRfqQuotes(id).catch(() => ({ quotes: [] }));
    setQuotes(((cmp.quotes as QuoteRow[]) || []));
  }

  useEffect(() => {
    void reload().catch(() => setDetail(null));
  }, [id]);

  const rfq = (detail?.rfq || {}) as { title?: string; status?: string; id?: string };
  const disclaimer = String(detail?.disclaimer || t("mp.disclaimer"));

  async function act(action: string, quoteId?: string) {
    try {
      if (quoteId) await decideQuote(quoteId, action, reason);
      else await supabase.rpc(action === "close" ? "close_rfq" : "cancel_rfq", { p_rfq_id: id, p_reason: reason });
      toast.success(action);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : action);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-5xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">{rfq.title || t("rfq.title")}</h1>
        <p className="text-sm text-muted-foreground">{rfq.status}</p>
        {detail?.new_unverified_buyer && <p className="text-sm text-amber-600">{t("mp.unverified_warn")}</p>}
        <p className="text-sm">{disclaimer}</p>
        <p className="text-sm">{t("mp.no_fx")}</p>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rfq.reason")} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void act("close")}>{t("rfq.close")}</Button>
          <Button variant="outline" onClick={() => void act("cancel")}>{t("rfq.cancel")}</Button>
        </div>
        <h2 className="font-semibold">{t("rfq.compare")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-start">{t("mp.suppliers")}</th>
                <th className="p-2">Status</th>
                <th className="p-2">Price</th>
                <th className="p-2">{t("mp.moq")}</th>
                <th className="p-2">{t("mp.lead")}</th>
                <th className="p-2">{t("mp.incoterms")}</th>
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
                  <td className="p-2 space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setSupplierId(q.supplier_id); void act("shortlist", q.quote_id); }}>{t("rfq.shortlist")}</Button>
                    <Button size="sm" variant="outline" onClick={() => void act("accept", q.quote_id)}>{t("rfq.accept")}</Button>
                    <Button size="sm" variant="outline" onClick={() => void act("reject", q.quote_id)}>{t("rfq.reject")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">{t("rfq.message")}</h2>
          <Input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="supplier id" />
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button variant="outline" onClick={() => sendRfqMessage(id || "", supplierId, message).then(() => toast.success("sent"))}>{t("rfq.message")}</Button>
        </div>
      </div>
    </div>
  );
}

export default function RfqDetailPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

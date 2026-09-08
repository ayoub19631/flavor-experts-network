import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { submitQuote } from "@/lib/marketplace/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Rfq = { id: string; title: string; status: string };
type Quote = { quote_id: string; rfq_title: string; status: string; price?: number; currency?: string };

function Inner() {
  const { t } = useI18n();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [rfqId, setRfqId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  usePageMeta({ title: t("rfq.supplier_quotes"), path: "/supplier/quotes", noIndex: true });

  useEffect(() => {
    supabase.rpc("list_supplier_rfqs").then(({ data }) => setRfqs((data as Rfq[]) || []));
    supabase.rpc("list_my_quotes").then(({ data }) => setQuotes((data as Quote[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-3xl px-4 space-y-6">
        <h1 className="text-3xl font-bold">{t("rfq.supplier_quotes")}</h1>
        <p className="text-sm text-muted-foreground">{t("mp.disclaimer")}</p>
        {rfqs.map((rfq) => (
          <button key={rfq.id} className="block w-full rounded-xl border p-3 text-start" onClick={() => setRfqId(rfq.id)}>
            {rfq.title} · {rfq.status}
          </button>
        ))}
        <Input value={rfqId} onChange={(e) => setRfqId(e.target.value)} placeholder="RFQ id" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
        <Button onClick={() => submitQuote({ rfq_id: rfqId, price: Number(price), currency })
          .then(() => toast.success("submitted"))
          .catch((e) => toast.error(e.message))}>{t("rfq.publish")}</Button>
        <h2 className="font-semibold">{t("rfq.quotes")}</h2>
        {quotes.map((q) => (
          <div key={q.quote_id} className="rounded-lg border p-3 text-sm">{q.rfq_title} · {q.status} · {q.price} {q.currency}</div>
        ))}
      </div>
    </div>
  );
}

export default function SupplierQuotesPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

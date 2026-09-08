import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";

type Row = { quote_id: string; rfq_id: string; rfq_title: string; status: string; supplier_name?: string; price?: number; currency?: string };

function Inner() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  usePageMeta({ title: t("rfq.quotes"), path: "/dashboard/quotes", noIndex: true });

  useEffect(() => {
    supabase.rpc("list_buyer_quotes").then(({ data }) => setRows((data as Row[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-3xl px-4 space-y-4">
        <h1 className="text-3xl font-bold">{t("rfq.quotes")}</h1>
        {rows.length === 0 && <p className="text-muted-foreground">{t("rfq.empty")}</p>}
        {rows.map((row) => (
          <Link key={row.quote_id} to={`/dashboard/rfqs/${row.rfq_id}`} className="block rounded-xl border p-4">
            <p className="font-medium">{row.rfq_title}</p>
            <p className="text-sm text-muted-foreground">{row.supplier_name} · {row.status} · {row.price} {row.currency}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function QuotesPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

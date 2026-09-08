import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";

type RfqRow = { id: string; title: string; status: string; updated_at: string };

function Inner() {
  const { t } = useI18n();
  const [rows, setRows] = useState<RfqRow[]>([]);
  usePageMeta({ title: t("rfq.mine"), path: "/dashboard/rfqs", noIndex: true });

  useEffect(() => {
    supabase.rpc("list_my_rfqs").then(({ data }) => setRows((data as RfqRow[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-3xl px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("rfq.mine")}</h1>
          <Link to="/marketplace/rfq" className="text-sm text-primary">{t("mp.create_rfq")}</Link>
        </div>
        {rows.length === 0 && <p className="text-muted-foreground">{t("rfq.empty")}</p>}
        {rows.map((row) => (
          <Link key={row.id} to={`/dashboard/rfqs/${row.id}`} className="block rounded-xl border p-4">
            <p className="font-medium">{row.title}</p>
            <p className="text-sm text-muted-foreground">{row.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function RfqsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

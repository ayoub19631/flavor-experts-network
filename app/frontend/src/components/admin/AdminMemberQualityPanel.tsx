import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type ReportRow = {
  profile_id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  account_type: string | null;
  is_test_account: boolean;
  is_active: boolean;
  is_verified: boolean;
  category: string;
  detail: string;
  created_at: string | null;
};

export default function AdminMemberQualityPanel() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc("admin_member_quality_report");
    if (rpcError) {
      setError(rpcError.message);
      setRows([]);
    } else {
      setError(null);
      setRows((data as ReportRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleTest = async (id: string, next: boolean) => {
    const { error: rpcError } = await supabase.rpc("admin_set_test_account", {
      p_user_id: id,
      p_is_test: next,
    });
    if (!rpcError) await load();
  };

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("admin.qa.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.qa.desc")}</p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No flagged accounts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-muted-foreground border-b border-border">
                  <th className="py-2 pe-3 font-medium">Name</th>
                  <th className="py-2 pe-3 font-medium">Email</th>
                  <th className="py-2 pe-3 font-medium">Category</th>
                  <th className="py-2 pe-3 font-medium">Detail</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.profile_id}-${row.category}`} className="border-b border-border/60">
                    <td className="py-2 pe-3">{row.full_name || "—"}</td>
                    <td className="py-2 pe-3">{row.email}</td>
                    <td className="py-2 pe-3">
                      <Badge variant="secondary">{row.category}</Badge>
                    </td>
                    <td className="py-2 pe-3 text-muted-foreground">{row.detail}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTest(row.profile_id, !row.is_test_account)}
                      >
                        {row.is_test_account ? t("admin.qa.unmark_test") : t("admin.qa.mark_test")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

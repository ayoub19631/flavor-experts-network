import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [rows, setRows] = useState<Array<{ blocked_id: string }>>([]);
  usePageMeta({ title: "Blocked users", path: "/dashboard/blocked", noIndex: true });
  useEffect(() => {
    if (!user) return;
    supabase.from("member_blocks").select("blocked_id").eq("blocker_id", user.id)
      .then(({ data }) => setRows((data as typeof rows) || []));
  }, [user]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-xl px-4">
        <h1 className="text-2xl font-bold">{lang === "ar" ? "المحظورون" : "Blocked users"}</h1>
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.blocked_id} className="flex justify-between rounded-lg border p-3">
              <span className="text-sm">{row.blocked_id}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                await supabase.from("member_blocks").delete().eq("blocker_id", user?.id || "").eq("blocked_id", row.blocked_id);
                setRows((list) => list.filter((item) => item.blocked_id !== row.blocked_id));
              }}>{lang === "ar" ? "إلغاء الحظر" : "Unblock"}</Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BlockedUsersPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

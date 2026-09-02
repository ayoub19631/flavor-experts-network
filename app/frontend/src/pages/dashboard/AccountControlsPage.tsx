import { useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function Inner() {
  const { user, signOut } = useAuth();
  const { lang } = useI18n();
  const [exporting, setExporting] = useState(false);
  usePageMeta({ title: "Privacy and security", path: "/dashboard/privacy", noIndex: true });

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    const profile = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
    const posts = await supabase.from("social_posts").select("id, content, created_at").eq("user_id", user.id);
    const blob = new Blob([JSON.stringify({ profile: profile.data, posts: posts.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flavor-experts-export.json";
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-xl px-4 space-y-6">
        <h1 className="text-2xl font-bold">{lang === "ar" ? "الخصوصية والأمان" : "Privacy and security"}</h1>
        <Button onClick={exportData} disabled={exporting}>{lang === "ar" ? "تصدير بياناتي" : "Export my data"}</Button>
        <Button variant="outline" onClick={() => signOut()}>{lang === "ar" ? "تسجيل الخروج من هذا الجهاز" : "Sign out this device"}</Button>
        <p className="text-sm text-muted-foreground">
          {lang === "ar"
            ? "طلب حذف الحساب يُسجَّل للمراجعة اليدوية ولا يحذف البيانات فورًا."
            : "Account deletion is a review request. It does not wipe data immediately."}
        </p>
        <Button variant="destructive" onClick={async () => {
          if (!user) return;
          const { error } = await supabase.from("account_deletion_requests").insert({
            user_id: user.id,
            reason: "user_request",
            status: "requested",
          });
          toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم تسجيل الطلب" : "Request recorded"));
        }}>{lang === "ar" ? "طلب حذف الحساب" : "Request account deletion"}</Button>
      </div>
    </div>
  );
}

export default function AccountControlsPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

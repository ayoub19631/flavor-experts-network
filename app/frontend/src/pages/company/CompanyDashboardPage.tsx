import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function Inner() {
  const { user, profile } = useAuth();
  const { lang } = useI18n();
  const [name, setName] = useState(profile?.company || profile?.full_name || "");
  const [description, setDescription] = useState(profile?.bio || "");
  const [invite, setInvite] = useState("");
  const isCompany = profile?.account_type === "company";
  usePageMeta({ title: lang === "ar" ? "لوحة الشركة" : "Company dashboard", path: "/company/dashboard", noIndex: true });

  useEffect(() => {
    setName(profile?.company || profile?.full_name || "");
    setDescription(profile?.bio || "");
  }, [profile]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 mx-auto max-w-2xl px-4 space-y-4">
        <h1 className="text-3xl font-bold">{lang === "ar" ? "لوحة الشركة" : "Company dashboard"}</h1>
        {!isCompany && (
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "هذه اللوحة لحسابات الشركات. يمكنك طلب دعوة للانضمام إلى فريق شركة."
              : "This dashboard is for company accounts. Ask an owner for a team invitation."}
          </p>
        )}
        {isCompany && user && (
          <>
            <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={lang === "ar" ? "اسم الشركة" : "Company name"} />
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label={lang === "ar" ? "الوصف" : "Description"} />
            <Button onClick={async () => {
              const { error } = await supabase.from("user_profiles").update({ company: name, bio: description }).eq("id", user.id);
              toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم الحفظ" : "Saved"));
            }}>{lang === "ar" ? "حفظ الملف" : "Save profile"}</Button>
            <div className="space-y-2">
              <h2 className="font-semibold">{lang === "ar" ? "دعوة عضو" : "Invite teammate"}</h2>
              <Input value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="member@company.com" />
              <Button variant="outline" onClick={async () => {
                const { error } = await supabase.from("company_invitations").insert({
                  company_id: user.id,
                  email: invite,
                  invited_by: user.id,
                  role: "viewer",
                  status: "pending",
                });
                toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم إرسال الدعوة" : "Invitation sent"));
              }}>{lang === "ar" ? "إرسال دعوة" : "Send invitation"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CompanyDashboardPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

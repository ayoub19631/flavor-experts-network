import { useState } from "react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function Inner() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [kind, setKind] = useState("professional");
  const [notes, setNotes] = useState("");
  usePageMeta({ title: "Verification", path: "/verification", noIndex: true });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <form
        className="pt-24 pb-16 mx-auto max-w-lg px-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!user) return;
          const { error } = await supabase.from("verification_requests").insert({
            user_id: user.id,
            kind,
            status: "submitted",
            notes,
          });
          toast[error ? "error" : "success"](error?.message || (lang === "ar" ? "تم إرسال الطلب" : "Request submitted"));
        }}
      >
        <h1 className="text-2xl font-bold">{lang === "ar" ? "طلب توثيق" : "Verification request"}</h1>
        <p className="text-sm text-muted-foreground">
          {lang === "ar"
            ? "الوثائق تُرفع إلى تخزين خاص. لا تُعرض شارة التوثيق إلا بعد موافقة حقيقية."
            : "Documents go to private storage. Badges appear only after a real approval."}
        </p>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="professional">Professional</option>
          <option value="company">Company</option>
          <option value="researcher">Researcher</option>
          <option value="organization_representative">Organization representative</option>
        </select>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={lang === "ar" ? "ملاحظات اختيارية" : "Optional notes"} />
        <Button type="submit">{lang === "ar" ? "إرسال" : "Submit"}</Button>
      </form>
    </div>
  );
}

export default function VerificationRequestPage() {
  return <ProtectedRoute><Inner /></ProtectedRoute>;
}

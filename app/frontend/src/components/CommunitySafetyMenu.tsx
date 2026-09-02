import { Flag, Ban, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blockMember, muteMember, reportContent, type ReportableType } from "@/lib/phase4/moderation";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export default function CommunitySafetyMenu({
  entityType,
  entityId,
  memberId,
}: {
  entityType: ReportableType;
  entityId: string;
  memberId?: string | null;
}) {
  const { lang } = useI18n();
  const report = async () => {
    const reason = window.prompt(lang === "ar" ? "سبب البلاغ" : "Report reason");
    if (!reason) return;
    const result = await reportContent({ entityType, entityId, reason });
    toast[result.error ? "error" : "success"](result.error || (lang === "ar" ? "تم إرسال البلاغ" : "Report sent"));
  };
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={lang === "ar" ? "إبلاغ" : "Report"} onClick={report}>
        <Flag className="w-4 h-4" />
      </Button>
      {memberId && (
        <>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={lang === "ar" ? "حظر" : "Block"} onClick={async () => {
            const result = await blockMember(memberId);
            toast[result.error ? "error" : "success"](result.error || (lang === "ar" ? "تم الحظر" : "Blocked"));
          }}>
            <Ban className="w-4 h-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={lang === "ar" ? "كتم" : "Mute"} onClick={async () => {
            const result = await muteMember(memberId);
            toast[result.error ? "error" : "success"](result.error || (lang === "ar" ? "تم الكتم" : "Muted"));
          }}>
            <VolumeX className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

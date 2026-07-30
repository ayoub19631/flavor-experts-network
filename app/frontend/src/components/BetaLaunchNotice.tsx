import { useEffect, useState } from "react";
import { FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import BrandLogo from "@/components/BrandLogo";
import { PAYMENTS_LIVE } from "@/lib/site-config";

const STORAGE_KEY = "fen-beta-notice-acknowledged-v1";

export default function BetaLaunchNotice() {
  const { lang } = useI18n();
  const isAR = lang === "ar";
  const [open, setOpen] = useState(false);
  const enabled =
    !PAYMENTS_LIVE &&
    String(import.meta.env.VITE_SHOW_TESTING_UI || "false").toLowerCase() === "true";

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode */
    }
    setOpen(true);
  }, [enabled]);

  if (!enabled) return null;

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) acknowledge(); }}>
      <DialogContent className="max-w-lg border-border/80 sm:rounded-2xl" dir={isAR ? "rtl" : "ltr"}>
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 px-3 py-1 text-xs font-semibold">
              <FlaskConical className="w-3.5 h-3.5" />
              {isAR ? "وضع الاختبار" : "Testing Mode"}
            </div>
          </div>
          <DialogTitle className="text-xl leading-snug">
            {isAR
              ? "المنصة قيد التجريب حالياً"
              : "The platform is currently in testing"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {isAR
              ? "مرحباً بك في شبكة خبراء النكهات. الموقع متاح للتجربة والاستكشاف، لكن بعض الخدمات لم تُفعَّل بعد."
              : "Welcome to Flavor Experts Network. The site is open for exploration, but some services are not fully activated yet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-foreground/90">
              {isAR
                ? "خدمات البيع والاشتراكات المدفوعة غير مفعّلة حالياً. لن تتم أي عمليات دفع حقيقية في هذه المرحلة."
                : "Sales and paid subscription services are not enabled yet. No real payments will be processed at this stage."}
            </p>
          </div>
          <div className="flex gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-foreground/90">
              {isAR
                ? "يمكنك تصفح المحتوى، التسجيل، المنتدى، المجتمع، والوظائف (للمشتركين)، والتواصل معنا."
                : "You can browse content, sign up, use the forum and community, access jobs (premium), and contact us."}
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-stretch">
          <Button onClick={acknowledge} className="w-full h-11 text-sm font-semibold">
            {isAR ? "حسناً، فهمت — متابعة التصفح" : "Got it — continue browsing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

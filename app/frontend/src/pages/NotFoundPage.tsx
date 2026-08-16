import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FlaskConical, Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  usePageMeta({ title: "404", description: t("notfound.desc"), path: "/404", noIndex: true });

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FlaskConical className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-7xl font-extrabold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {t("notfound.title")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          {t("notfound.desc")}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t("notfound.back")}
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              {t("notfound.home")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "./ProtectedRoute";
import BrandLogo from "./BrandLogo";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { hasCapability } from "@/lib/phase4/roles";
import { supabase } from "@/lib/supabase";

export default function PublicationsStaffRoute({ children }: { children: ReactNode }) {
  const { isAdmin, platformRoles, profile, loading, user } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    const local = isAdmin || hasCapability(platformRoles, "review_publications", profile?.is_admin === true);
    if (local) {
      setAllowed(true);
      return;
    }
    supabase.rpc("has_capability", { p_capability: "review_publications" }).then(({ data }) => {
      setAllowed(data === true);
    });
  }, [loading, user, isAdmin, platformRoles, profile?.is_admin]);

  return (
    <ProtectedRoute>
      {loading || allowed === null ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <BrandLogo size="lg" className="mx-auto mb-4 animate-pulse" />
        </div>
      ) : !allowed ? (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">{lang === "ar" ? "غير مصرح" : "Access denied"}</h1>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              {lang === "ar" ? "العودة للوحة التحكم" : "Back to dashboard"}
            </Button>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { hasCapability } from "@/lib/phase4/roles";
import ProtectedRoute from "./ProtectedRoute";
import BrandLogo from "./BrandLogo";

interface AdminRouteProps {
  children: React.ReactNode;
  capability?: string;
}

/**
 * Requires an authenticated, email-verified user with is_admin = true.
 * Real authorization still depends on Supabase RLS; this blocks the UI early.
 */
export default function AdminRoute({ children, capability }: AdminRouteProps) {
  const { isAdmin, platformRoles, profile, loading, user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const allowed = capability
    ? isAdmin || hasCapability(platformRoles, capability, profile?.is_admin === true)
    : isAdmin;

  useEffect(() => {
    if (!loading && user && !allowed) {
      // Stay on unauthorized screen; do not bounce to dashboard automatically
    }
  }, [loading, user, allowed]);

  return (
    <ProtectedRoute>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(208_100%_10%)]">
          <div className="text-center">
            <BrandLogo size="lg" className="mx-auto mb-4 animate-pulse" />
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(47_23%_85%)] mx-auto" />
          </div>
        </div>
      ) : !allowed ? (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {t("denied.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("denied.desc")}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              {t("denied.back")}
            </Button>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  );
}

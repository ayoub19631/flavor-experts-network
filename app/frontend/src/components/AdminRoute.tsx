import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import ProtectedRoute from "./ProtectedRoute";
import BrandLogo from "./BrandLogo";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Requires an authenticated, email-verified user with is_admin = true.
 * Real authorization still depends on Supabase RLS; this blocks the UI early.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading, user } = useAuth();
  const { lang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      // Stay on unauthorized screen; do not bounce to dashboard automatically
    }
  }, [loading, user, isAdmin]);

  return (
    <ProtectedRoute>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(208_100%_10%)]">
          <div className="text-center">
            <BrandLogo size="lg" className="mx-auto mb-4 animate-pulse" />
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(47_23%_85%)] mx-auto" />
          </div>
        </div>
      ) : !isAdmin ? (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {lang === "ar" ? "غير مصرح" : "Access denied"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lang === "ar"
                ? "هذه الصفحة مخصصة لمسؤولي المنصة فقط."
                : "This area is restricted to platform administrators."}
            </p>
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

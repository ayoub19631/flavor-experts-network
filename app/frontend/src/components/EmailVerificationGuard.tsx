import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { rememberPendingVerificationEmail } from "@/lib/auth-utils";
import { isAllowedPath } from "@/lib/email-verification-paths";

export default function EmailVerificationGuard({ children }: { children: React.ReactNode }) {
  const { user, isEmailVerified, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || isEmailVerified) return;
    if (isAllowedPath(location.pathname)) return;

    if (user.email) rememberPendingVerificationEmail(user.email);
    navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`, { replace: true });
  }, [user, isEmailVerified, loading, location.pathname, navigate]);

  return <>{children}</>;
}

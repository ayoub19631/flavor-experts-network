import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  isPlatformAuthExemptPath,
  isPlatformPrivateMode,
} from "@/lib/platform-access";
import BrandLogo from "@/components/BrandLogo";
import UnderDevelopmentPage from "@/pages/UnderDevelopmentPage";

interface PlatformAccessGuardProps {
  children: React.ReactNode;
}

export default function PlatformAccessGuard({ children }: PlatformAccessGuardProps) {
  const { loading, hasPlatformAccess } = useAuth();
  const { pathname } = useLocation();

  if (!isPlatformPrivateMode()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(208_100%_10%)]">
        <div className="text-center">
          <BrandLogo size="lg" className="mx-auto mb-4 animate-pulse shadow-xl" />
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(47_23%_85%)] mx-auto" />
        </div>
      </div>
    );
  }

  if (hasPlatformAccess || isPlatformAuthExemptPath(pathname)) {
    return <>{children}</>;
  }

  return <UnderDevelopmentPage />;
}

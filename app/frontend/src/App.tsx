import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { lazy, Suspense } from "react";
import BrandLogo from "./components/BrandLogo";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { ElectronTitleBar } from "./components/ElectronTitleBar";
import BlogRoutes from "./blog-routes";
import EmailVerificationGuard from "./components/EmailVerificationGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import PlatformAccessGuard from "./components/PlatformAccessGuard";
import BetaLaunchNotice from "./components/BetaLaunchNotice";

const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage"));
const EmailVerifiedPage = lazy(() => import("./pages/EmailVerifiedPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const EnterpriseServicesPage = lazy(() => import("./pages/EnterpriseServicesPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const AuthError = lazy(() => import("./pages/AuthError"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MembersPage = lazy(() => import("./pages/MembersPage"));
const MemberProfilePage = lazy(() => import("./pages/MemberProfilePage"));
const ForumPage = lazy(() => import("./pages/ForumPage"));
const ForumCategoryPage = lazy(() => import("./pages/ForumCategoryPage"));
const ForumTopicPage = lazy(() => import("./pages/ForumTopicPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const ConsultationsPage = lazy(() => import("./pages/ConsultationsPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ChatAssistant = lazy(() => import("./components/ChatAssistant"));

const PlatformAccessChat = () => {
  const { hasPlatformAccess, loading } = useAuth();
  // During public beta, show assistant once auth/access state is ready
  if (loading) return null;
  if (!hasPlatformAccess) return null;
  return (
    <Suspense fallback={null}>
      <ChatAssistant />
    </Suspense>
  );
};

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[hsl(208_100%_10%)] relative overflow-hidden">
    <img
      src="/brand/hero-flavor-lab.png"
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-35"
    />
    <div className="absolute inset-0 bg-[hsl(208_100%_8%/0.75)]" />
    <div className="relative text-center px-6">
      <BrandLogo size="hero" className="mx-auto mb-5 drop-shadow-2xl animate-pulse" />
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(47_23%_85%)] mx-auto" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const AppRoutes = () => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/email-verified" element={<ProtectedRoute requireEmailVerified={false}><EmailVerifiedPage /></ProtectedRoute>} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/enterprise" element={<EnterpriseServicesPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/members/:id" element={<MemberProfilePage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/forum/c/:slug" element={<ForumCategoryPage />} />
      <Route path="/forum/t/:id" element={<ForumTopicPage />} />
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/consultations" element={<ConsultationsPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/blog/*" element={<BlogRoutes />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
);

// BrowserRouter wraps AuthProvider so useNavigate works inside auth callbacks
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <AuthProvider>
            <EmailVerificationGuard>
            <TooltipProvider>
              <div className="flex flex-col h-screen">
                <ElectronTitleBar />
                <div className="flex-1 overflow-auto">
                  <Toaster />
                  <PlatformAccessGuard>
                    <AppRoutes />
                  </PlatformAccessGuard>
                  <BetaLaunchNotice />
                </div>
              </div>
              <PlatformAccessChat />
            </TooltipProvider>
            </EmailVerificationGuard>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
export { AppRoutes };
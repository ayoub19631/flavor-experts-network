import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { registerDeepLinkListener } from "@/lib/native";
import { lazy, Suspense, useEffect } from "react";
import BrandLogo from "./components/BrandLogo";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import { ElectronTitleBar } from "./components/ElectronTitleBar";
import BlogRoutes from "./blog-routes";
import EmailVerificationGuard from "./components/EmailVerificationGuard";
import TermsAcceptanceGuard from "./components/TermsAcceptanceGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import PlatformAccessGuard from "./components/PlatformAccessGuard";
import BetaLaunchNotice from "./components/BetaLaunchNotice";
import SkipToContent from "./components/SkipToContent";
import WelcomeRedirect from "./components/WelcomeRedirect";
import { isLanguage } from "@/lib/languages";

const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage"));
const EmailVerifiedPage = lazy(() => import("./pages/EmailVerifiedPage"));
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
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const LearningDashboardPage = lazy(() => import("./pages/LearningDashboardPage"));
const LessonPlayerPage = lazy(() => import("./pages/LessonPlayerPage"));
const AcademyQuizPage = lazy(() => import("./pages/AcademyQuizPage"));
const AcademyLabPage = lazy(() => import("./pages/AcademyLabPage"));
const AcademyCapstonePage = lazy(() => import("./pages/AcademyCapstonePage"));
const CourseCompletePage = lazy(() => import("./pages/CourseCompletePage"));
const CertificateVerifyPage = lazy(() => import("./pages/CertificateVerifyPage"));
const AcademyBuilderPage = lazy(() => import("./pages/admin/AcademyBuilderPage"));
const ConsultationsPage = lazy(() => import("./pages/ConsultationsPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ChatAssistant = lazy(() => import("./components/ChatAssistant"));

const FORM_HEAVY_PREFIXES = ["/auth", "/enterprise", "/consultations"];

const LanguageProfileSync = () => {
  const { profile } = useAuth();
  const { setLang } = useI18n();
  useEffect(() => {
    const stored = profile?.preferred_language;
    if (stored && isLanguage(stored)) setLang(stored);
  }, [profile?.id, profile?.preferred_language, setLang]);
  return null;
};

const PlatformAccessChat = () => {
  const { hasPlatformAccess, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return null;
  if (!hasPlatformAccess) return null;
  const formHeavy = FORM_HEAVY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <Suspense fallback={null}>
      <ChatAssistant minimizedByDefault={formHeavy} compactTrigger={formHeavy} />
    </Suspense>
  );
};

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <BrandLogo size="sm" className="opacity-80" />
      <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
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
      <Route path="/welcome" element={<WelcomeRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/email-verified" element={<ProtectedRoute requireEmailVerified={false}><EmailVerifiedPage /></ProtectedRoute>} />
      <Route path="/pricing" element={<Navigate to="/" replace />} />
      <Route path="/enterprise" element={<EnterpriseServicesPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/admin/academy/:courseId" element={<AdminRoute><AcademyBuilderPage /></AdminRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/members/:id" element={<MemberProfilePage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/forum/c/:slug" element={<ForumCategoryPage />} />
      <Route path="/forum/t/:id" element={<ForumTopicPage />} />
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/courses/:slug" element={<CourseDetailPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/learn/:slug/quiz/:quizId" element={<ProtectedRoute><AcademyQuizPage /></ProtectedRoute>} />
      <Route path="/learn/:slug/lab/:labId" element={<ProtectedRoute><AcademyLabPage /></ProtectedRoute>} />
      <Route path="/learn/:slug/capstone" element={<ProtectedRoute><AcademyCapstonePage /></ProtectedRoute>} />
      <Route path="/learn/:slug/complete" element={<ProtectedRoute><CourseCompletePage /></ProtectedRoute>} />
      <Route path="/learn/:slug/:lessonId" element={<ProtectedRoute><LessonPlayerPage /></ProtectedRoute>} />
      <Route path="/learn" element={<ProtectedRoute><LearningDashboardPage /></ProtectedRoute>} />
      <Route path="/certificates/:code" element={<CertificateVerifyPage />} />
      <Route path="/certificates" element={<CertificateVerifyPage />} />
      <Route path="/consultations" element={<ConsultationsPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/blog/*" element={<BlogRoutes />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
);

// Routes native deep links (flavorexperts://…) into react-router.
const NativeBridge = () => {
  const navigate = useNavigate();
  useEffect(() => registerDeepLinkListener(navigate), [navigate]);
  return null;
};

// BrowserRouter wraps AuthProvider so useNavigate works inside auth callbacks
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
          <AuthProvider>
            <LanguageProfileSync />
            <EmailVerificationGuard>
            <TermsAcceptanceGuard>
            <TooltipProvider>
              <div className="flex flex-col h-screen">
                <ElectronTitleBar />
                <NativeBridge />
                <SkipToContent />
                <div className="flex-1 overflow-auto">
                  <Toaster />
                  <PlatformAccessGuard>
                    <main id="main-content" tabIndex={-1} className="outline-none">
                      <AppRoutes />
                    </main>
                  </PlatformAccessGuard>
                  <BetaLaunchNotice />
                </div>
              </div>
              <PlatformAccessChat />
            </TooltipProvider>
            </TermsAcceptanceGuard>
            </EmailVerificationGuard>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
export { AppRoutes };
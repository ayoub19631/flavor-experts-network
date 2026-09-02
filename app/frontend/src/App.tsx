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
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const AcademyBuilderPage = lazy(() => import("./pages/admin/AcademyBuilderPage"));
const ConsultationsPage = lazy(() => import("./pages/ConsultationsPage"));
const ConsultationExpertsPage = lazy(() => import("./pages/consultations/ConsultationExpertsPage"));
const ConsultationExpertPage = lazy(() => import("./pages/consultations/ConsultationExpertPage"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const JobsPage = lazy(() => import("./pages/JobsPage"));
const JobDetailPage = lazy(() => import("./pages/jobs/JobDetailPage"));
const EventsPage = lazy(() => import("./pages/events/EventsPage"));
const EventDetailPage = lazy(() => import("./pages/events/EventDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationPreferencesPage = lazy(() => import("./pages/NotificationPreferencesPage"));
const AdminOpsPage = lazy(() => import("./pages/admin/AdminOpsPage"));
const CompanyDashboardPage = lazy(() => import("./pages/company/CompanyDashboardPage"));
const SavedJobsPage = lazy(() => import("./pages/dashboard/SavedJobsPage"));
const MyApplicationsPage = lazy(() => import("./pages/dashboard/MyApplicationsPage"));
const AccountControlsPage = lazy(() => import("./pages/dashboard/AccountControlsPage"));
const BlockedUsersPage = lazy(() => import("./pages/dashboard/BlockedUsersPage"));
const ConnectionsInboxPage = lazy(() => import("./pages/dashboard/ConnectionsInboxPage"));
const VerificationRequestPage = lazy(() => import("./pages/VerificationRequestPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ChatAssistant = lazy(() => import("./components/ChatAssistant"));
const LibraryPage = lazy(() => import("./pages/library/LibraryPage"));
const BooksPage = lazy(() => import("./pages/library/BooksPage"));
const BookDetailPage = lazy(() => import("./pages/library/BookDetailPage"));
const BookReaderPage = lazy(() => import("./pages/library/BookReaderPage"));
const ResearchPage = lazy(() => import("./pages/library/ResearchPage"));
const ResearchDetailPage = lazy(() => import("./pages/library/ResearchDetailPage"));
const MyLibraryPage = lazy(() => import("./pages/library/MyLibraryPage"));
const SubmitPublicationPage = lazy(() => import("./pages/library/SubmitPublicationPage"));
const PublicationPoliciesPage = lazy(() => import("./pages/library/PublicationPoliciesPage"));
const AdminPublicationsPage = lazy(() => import("./pages/admin/AdminPublicationsPage"));
const PublicationEditorPage = lazy(() => import("./pages/admin/PublicationEditorPage"));

const FORM_HEAVY_PREFIXES = ["/auth", "/enterprise", "/consultations", "/members", "/messages", "/community"];

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
      <Route path="/dashboard/jobs" element={<Navigate to="/jobs" replace />} />
      <Route path="/dashboard/consultations" element={<Navigate to="/consultations" replace />} />
      <Route path="/dashboard/events" element={<Navigate to="/events" replace />} />
      <Route path="/expert/consultations" element={<ProtectedRoute><ConsultationExpertsPage /></ProtectedRoute>} />
      <Route path="/company/jobs/:id/applications" element={<Navigate to="/jobs" replace />} />
      <Route path="/admin/events" element={<AdminRoute><AdminOpsPage /></AdminRoute>} />
      <Route path="/dashboard/saved-jobs" element={<SavedJobsPage />} />
      <Route path="/dashboard/applications" element={<MyApplicationsPage />} />
      <Route path="/dashboard/privacy" element={<AccountControlsPage />} />
      <Route path="/dashboard/blocked" element={<BlockedUsersPage />} />
      <Route path="/dashboard/connections" element={<ConnectionsInboxPage />} />
      <Route path="/company/dashboard" element={<CompanyDashboardPage />} />
      <Route path="/notifications/preferences" element={<NotificationPreferencesPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/verification" element={<VerificationRequestPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route path="/admin/academy/:courseId" element={<AdminRoute><AcademyBuilderPage /></AdminRoute>} />
      <Route path="/admin/publications/:id" element={<AdminRoute><PublicationEditorPage /></AdminRoute>} />
      <Route path="/admin/publications" element={<AdminRoute><AdminPublicationsPage /></AdminRoute>} />
      <Route path="/admin/ops" element={<AdminRoute><AdminOpsPage /></AdminRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/books/:slug/chapters/:chapterSlug" element={<BookReaderPage />} />
      <Route path="/books/:slug" element={<BookDetailPage />} />
      <Route path="/books" element={<BooksPage />} />
      <Route path="/research/:slug" element={<ResearchDetailPage />} />
      <Route path="/research" element={<ResearchPage />} />
      <Route path="/my-library/:id" element={<ProtectedRoute><PublicationEditorPage /></ProtectedRoute>} />
      <Route path="/my-library" element={<MyLibraryPage />} />
      <Route path="/submit-publication" element={<SubmitPublicationPage />} />
      <Route path="/policies/:slug" element={<PublicationPoliciesPage />} />
      <Route path="/policies" element={<PublicationPoliciesPage />} />
      <Route path="/members/:id" element={<MemberProfilePage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/forum/c/:slug" element={<ForumCategoryPage />} />
      <Route path="/forum/t/:id" element={<ForumTopicPage />} />
      <Route path="/forum" element={<ForumPage />} />
      <Route path="/insights" element={<InsightsPage />} />
      <Route path="/courses/:slug" element={<Navigate to="/insights" replace />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/learn/*" element={<Navigate to="/insights" replace />} />
      <Route path="/learn" element={<Navigate to="/insights" replace />} />
      <Route path="/certificates/*" element={<Navigate to="/insights" replace />} />
      <Route path="/certificates" element={<Navigate to="/insights" replace />} />
      <Route path="/consultations/experts/:id" element={<ConsultationExpertPage />} />
      <Route path="/consultations/experts" element={<ConsultationExpertsPage />} />
      <Route path="/consultations" element={<ConsultationsPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/jobs/:slug" element={<JobDetailPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/events/:slug" element={<EventDetailPage />} />
      <Route path="/events" element={<EventsPage />} />
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
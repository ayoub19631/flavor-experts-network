import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePageMeta } from '@/hooks/use-page-meta';
import { isOAuthConfiguredError, mapOAuthErrorMessage } from '@/lib/oauth';

export default function AuthErrorPage() {
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  usePageMeta({
    title: 'Authentication error',
    description: 'Something went wrong during sign-in.',
    path: '/auth/error',
    noIndex: true,
  });
  const [countdown, setCountdown] = useState(8);
  const rawMessage =
    searchParams.get('msg') ||
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    'Sorry, your authentication information is invalid or has expired';

  const isOAuthSetup = isOAuthConfiguredError(rawMessage);
  const oauthKind = mapOAuthErrorMessage(rawMessage);
  const errorMessage = isOAuthSetup
    ? t('auth.oauth_not_configured')
    : oauthKind === 'disabled'
      ? t('auth.err.linkedin_disabled')
      : oauthKind === 'email'
        ? t('auth.err.oauth_email')
        : oauthKind === 'redirect'
          ? t('auth.err.oauth_redirect')
          : oauthKind === 'callback'
            ? t('auth.err.oauth_callback')
            : rawMessage;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/auth?mode=login';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
              <AlertCircle className="relative h-12 w-12 text-red-500" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {isOAuthSetup ? 'Social Login Unavailable' : 'Authentication Error'}
          </h1>

          <p className="text-base text-muted-foreground">{errorMessage}</p>

          {isOAuthSetup && (
            <p className="text-sm text-muted-foreground">{t('auth.oauth_setup_hint')}</p>
          )}

          <p className="text-sm text-muted-foreground">
            {countdown > 0
              ? `Returning to sign in in ${countdown}s...`
              : 'Redirecting...'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="outline">
            <Link to="/auth?mode=login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

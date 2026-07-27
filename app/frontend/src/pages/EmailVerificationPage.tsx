import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Mail, ArrowLeft, FlaskConical, RefreshCw,
  CheckCircle, AlertCircle, ExternalLink, Clock,
  Loader2, Shield, KeyRound,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const EMAIL_PROVIDERS = [
  {
    name: "Gmail",
    url: "https://mail.google.com",
    color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
    letter: "G",
  },
  {
    name: "Outlook",
    url: "https://outlook.live.com",
    color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    letter: "O",
  },
  {
    name: "Yahoo",
    url: "https://mail.yahoo.com",
    color: "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400",
    letter: "Y",
  },
];

const RESEND_COOLDOWN = 60;

export default function EmailVerificationPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || localStorage.getItem("fen-verify-email") || "";

  // OTP state
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Resend state
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const hasAutoVerified = useRef(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !verifying && !verified) {
      handleVerifyOtp(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // Poll for magic-link verification every 6s
  const checkVerification = useCallback(async () => {
    if (hasAutoVerified.current) return;
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        hasAutoVerified.current = true;
        localStorage.removeItem("fen-verify-email");
        toast.success("Email verified successfully!");
        navigate("/email-verified");
        return true;
      }
    } catch { /* silent */ }
    setChecking(false);
    return false;
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(checkVerification, 6000);
    return () => clearInterval(interval);
  }, [checkVerification]);

  // Listen for auth state change (magic link clicked in another tab)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.email_confirmed_at) {
        localStorage.removeItem("fen-verify-email");
        toast.success("Email verified successfully!");
        navigate("/email-verified");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  // ── OTP Verify ───────────────────────────────────────────────────────────────
  async function handleVerifyOtp(code: string) {
    if (!email || code.length !== 6) return;
    setVerifying(true);
    setOtpError(null);

    try {
      // Try signup type first (after signUp())
      let { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });

      // Fallback: email OTP type
      if (error) {
        const res = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
        error = res.error;
      }

      if (error) {
        const msg = error.message.toLowerCase();
        setOtpError(
          msg.includes("expired")
            ? "Code expired — please request a new one."
            : msg.includes("invalid") || msg.includes("otp")
            ? "Invalid code. Double-check and try again."
            : error.message
        );
        setOtp("");
      } else {
        setVerified(true);
        hasAutoVerified.current = true;
        localStorage.removeItem("fen-verify-email");
        toast.success("Email verified successfully!");
        setTimeout(() => navigate("/email-verified"), 900);
      }
    } catch {
      setOtpError("Verification failed. Please try again.");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  }

  // ── Resend ───────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setOtpError(null);
    setResent(false);
    setOtp("");

    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setOtpError(error.message);
      } else {
        setResent(true);
        setResendCount((c) => c + 1);
        setCooldown(RESEND_COOLDOWN);
        toast.success("New verification code sent! Check your inbox.");
      }
    } catch {
      setOtpError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("general.back")}
        </Link>

        <Card className="border border-border shadow-xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <CardContent className="p-8">

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <FlaskConical className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Flavor Experts</span>
            </div>

            {/* Animated icon */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-500 ${verified ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-primary/10"}`}>
                  {verified ? (
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  ) : verifying ? (
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  ) : (
                    <KeyRound className="w-10 h-10 text-primary" />
                  )}
                </div>
                {!verified && !verifying && (
                  <span className="absolute inset-0 rounded-full bg-primary/15 animate-ping opacity-30" />
                )}
                {verified && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {verified ? "Email Verified! ✓" : "Verify Your Email"}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {verified
                  ? "Redirecting you to your dashboard…"
                  : "Enter the 6-digit code we sent to:"}
              </p>
              {email && !verified && (
                <div className="mt-2 inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg py-1.5 px-3">
                  <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-semibold text-primary break-all">{email}</span>
                </div>
              )}
            </div>

            {!verified && (
              <>
                {/* ── OTP Input Boxes ── */}
                <div className="mb-5">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(val) => { setOtp(val); setOtpError(null); }}
                      disabled={verifying || verified}
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className={`w-12 h-14 text-xl font-bold border-2 rounded-lg mx-0.5 transition-all ${
                              otpError
                                ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600"
                                : otp.length > i
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border"
                            }`}
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {verifying && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Verifying your code…
                    </div>
                  )}
                  {otpError && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{otpError}
                    </div>
                  )}
                  {resent && !otpError && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      New code sent! Check your inbox.
                      {resendCount > 1 && <span className="ml-auto text-xs opacity-60">×{resendCount}</span>}
                    </div>
                  )}
                </div>

                {/* Security note */}
                <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5">
                  <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    The code expires in <strong>60 minutes</strong>. Never share it with anyone.
                    Check spam if you didn't receive it.
                  </p>
                </div>

                {/* Open email shortcuts */}
                <div className="mb-5">
                  <p className="text-xs text-center text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                    Open your email app
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {EMAIL_PROVIDERS.map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-semibold transition-all ${p.color}`}
                      >
                        <span className="text-sm font-bold">{p.letter}</span>
                        {p.name}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Verify button */}
                <Button
                  onClick={() => handleVerifyOtp(otp)}
                  disabled={otp.length !== 6 || verifying}
                  className="w-full gap-2 mb-3 bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {verifying ? "Verifying…" : "Verify Code"}
                </Button>

                {/* Resend */}
                <Button
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  variant="outline"
                  className="w-full gap-2 mb-3 h-11"
                >
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : resendCount > 0 ? "Resend Code Again" : "Resend Code"}
                  {cooldown > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />{cooldown}s
                    </span>
                  )}
                </Button>

                {checking && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Auto-checking verification status…
                  </div>
                )}

                <Link to="/auth">
                  <Button variant="ghost" className="w-full text-sm text-muted-foreground">
                    Back to Login
                  </Button>
                </Link>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

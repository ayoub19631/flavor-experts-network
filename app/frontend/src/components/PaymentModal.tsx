import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Lock, Shield, CheckCircle, Loader2, AlertCircle,
  Crown, Building2, ChevronRight, FlaskConical, FileText, Printer,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { clearPendingVerificationEmail } from "@/lib/auth-utils";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import InvoiceModal from "@/components/InvoiceModal";
import { SITE, STRIPE_PUBLISHABLE_KEY, PAYMENTS_LIVE } from "@/lib/site-config";

const DEV_PAYMENTS = import.meta.env.DEV && PAYMENTS_LIVE;
const STRIPE_ENABLED = Boolean(STRIPE_PUBLISHABLE_KEY) && PAYMENTS_LIVE;
const PAYMENTS_ENABLED = PAYMENTS_LIVE && (DEV_PAYMENTS || STRIPE_ENABLED);
const BILLING_CONTACT = SITE.billingEmail;

// ─── Currency List ────────────────────────────────────────────────────────────
export const CURRENCIES = [
  { code: "USD", name: "US Dollar",            symbol: "$",    flag: "🇺🇸", rate: 1 },
  { code: "EUR", name: "Euro",                  symbol: "€",    flag: "🇪🇺", rate: 0.92 },
  { code: "GBP", name: "British Pound",         symbol: "£",    flag: "🇬🇧", rate: 0.79 },
  { code: "AED", name: "UAE Dirham",            symbol: "د.إ",  flag: "🇦🇪", rate: 3.67 },
  { code: "SAR", name: "Saudi Riyal",           symbol: "ر.س", flag: "🇸🇦", rate: 3.75 },
  { code: "KWD", name: "Kuwaiti Dinar",         symbol: "د.ك", flag: "🇰🇼", rate: 0.31 },
  { code: "QAR", name: "Qatari Riyal",          symbol: "ر.ق", flag: "🇶🇦", rate: 3.64 },
  { code: "BHD", name: "Bahraini Dinar",        symbol: "د.ب", flag: "🇧🇭", rate: 0.376 },
  { code: "OMR", name: "Omani Rial",            symbol: "ر.ع", flag: "🇴🇲", rate: 0.385 },
  { code: "JOD", name: "Jordanian Dinar",       symbol: "د.أ", flag: "🇯🇴", rate: 0.71 },
  { code: "EGP", name: "Egyptian Pound",        symbol: "ج.م", flag: "🇪🇬", rate: 47.5 },
  { code: "MAD", name: "Moroccan Dirham",       symbol: "MAD",  flag: "🇲🇦", rate: 9.97 },
  { code: "JPY", name: "Japanese Yen",          symbol: "¥",    flag: "🇯🇵", rate: 155 },
  { code: "CAD", name: "Canadian Dollar",       symbol: "CA$",  flag: "🇨🇦", rate: 1.36 },
  { code: "AUD", name: "Australian Dollar",     symbol: "A$",   flag: "🇦🇺", rate: 1.53 },
  { code: "CHF", name: "Swiss Franc",           symbol: "CHF",  flag: "🇨🇭", rate: 0.9 },
  { code: "CNY", name: "Chinese Yuan",          symbol: "¥",    flag: "🇨🇳", rate: 7.24 },
  { code: "INR", name: "Indian Rupee",          symbol: "₹",    flag: "🇮🇳", rate: 83.4 },
  { code: "SGD", name: "Singapore Dollar",      symbol: "S$",   flag: "🇸🇬", rate: 1.35 },
  { code: "HKD", name: "Hong Kong Dollar",      symbol: "HK$",  flag: "🇭🇰", rate: 7.83 },
  { code: "MYR", name: "Malaysian Ringgit",     symbol: "RM",   flag: "🇲🇾", rate: 4.68 },
  { code: "NZD", name: "New Zealand Dollar",    symbol: "NZ$",  flag: "🇳🇿", rate: 1.63 },
  { code: "BRL", name: "Brazilian Real",        symbol: "R$",   flag: "🇧🇷", rate: 4.97 },
  { code: "ZAR", name: "South African Rand",    symbol: "R",    flag: "🇿🇦", rate: 18.6 },
  { code: "TRY", name: "Turkish Lira",          symbol: "₺",    flag: "🇹🇷", rate: 32.5 },
  { code: "SEK", name: "Swedish Krona",         symbol: "kr",   flag: "🇸🇪", rate: 10.42 },
  { code: "NOK", name: "Norwegian Krone",       symbol: "kr",   flag: "🇳🇴", rate: 10.56 },
  { code: "DKK", name: "Danish Krone",          symbol: "kr",   flag: "🇩🇰", rate: 6.88 },
  { code: "KRW", name: "South Korean Won",      symbol: "₩",    flag: "🇰🇷", rate: 1340 },
  { code: "IDR", name: "Indonesian Rupiah",     symbol: "Rp",   flag: "🇮🇩", rate: 15900 },
  { code: "THB", name: "Thai Baht",             symbol: "฿",    flag: "🇹🇭", rate: 35.8 },
  { code: "PKR", name: "Pakistani Rupee",       symbol: "₨",    flag: "🇵🇰", rate: 278 },
];

export type PlanKey = "professional" | "enterprise";

interface PlanInfo {
  key: PlanKey;
  name: string;
  priceUSD: number;
  period: "monthly" | "annual";
  features: string[];
  gradient: string;
  icon: React.ElementType;
  color: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlanInfo;
  initialCurrency?: string;
}

// Card number formatter
function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}
function detectCardType(num: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

export function convertPrice(usd: number, currency: typeof CURRENCIES[0]) {
  const converted = usd * currency.rate;
  if (converted >= 1000) return `${currency.symbol} ${Math.round(converted).toLocaleString()}`;
  if (converted >= 10) return `${currency.symbol} ${converted.toFixed(0)}`;
  return `${currency.symbol} ${converted.toFixed(2)}`;
}

function getRawAmount(usd: number, currency: typeof CURRENCIES[0]): string {
  const converted = usd * currency.rate;
  return converted.toFixed(2);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PaymentModal({ open, onClose, plan, initialCurrency = "USD" }: PaymentModalProps) {
  const { user, profile, isEmailVerified } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Step: 'review' | 'card' | 'processing' | 'success'
  const [step, setStep] = useState<"review" | "card" | "processing" | "success">("review");

  // Currency
  const [currencyCode, setCurrencyCode] = useState(
    localStorage.getItem("fen-preferred-currency") || initialCurrency
  );
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // Card form
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(profile?.full_name || "");
  const [billingEmail, setBillingEmail] = useState(user?.email || "");
  const [country, setCountry] = useState("AE");
  const [formError, setFormError] = useState<string | null>(null);

  // Invoice
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    invoiceNumber: string; planName: string; amount: string;
    currency: string; symbol: string; billingEmail: string;
    cardName: string; date: string; period: string;
  } | null>(null);

  const cardType = detectCardType(cardNumber);
  const totalUSD = plan.priceUSD;
  const totalDisplay = convertPrice(totalUSD, currency);

  useEffect(() => {
    if (open && user && !isEmailVerified) {
      onClose();
      navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
    }
  }, [open, user, isEmailVerified, onClose, navigate]);

  const reset = useCallback(() => {
    setStep("review");
    setCardNumber(""); setExpiry(""); setCvv(""); setFormError(null);
  }, []);

  const handleClose = () => { reset(); onClose(); };

  // ── Currency change saves to localStorage ──────────────────────────────────
  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    localStorage.setItem("fen-preferred-currency", code);
  };

  // ── Card validation ────────────────────────────────────────────────────────
  const validateCard = () => {
    const rawNum = cardNumber.replace(/\s/g, "");
    if (rawNum.length < 13) return "Please enter a valid card number.";
    if (!expiry.includes("/") || expiry.length < 5) return "Please enter a valid expiry date (MM/YY).";
    if (cvv.length < 3) return "Please enter a valid CVV.";
    if (!cardName.trim()) return "Please enter the cardholder name.";
    if (!billingEmail.includes("@")) return "Please enter a valid email address.";
    return null;
  };

  // ── Submit payment ─────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (STRIPE_ENABLED && !DEV_PAYMENTS) {
      setFormError(null);
      setStep("processing");
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          body: {
            plan: plan.key,
            period: plan.period,
            successUrl: `${SITE.url}/dashboard?checkout=success`,
            cancelUrl: `${SITE.url}/pricing?checkout=cancelled`,
          },
        });
        if (error || !data?.url) {
          setFormError(data?.error || error?.message || t("payment.checkout_soon"));
          setStep("review");
          return;
        }
        window.location.href = data.url;
      } catch {
        setFormError(t("payment.checkout_soon"));
        setStep("review");
      }
      return;
    }

    if (!PAYMENTS_ENABLED) {
      setFormError(t("payment.checkout_soon"));
      return;
    }
    const err = validateCard();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setStep("processing");

    // Dev-only simulated payment
    await new Promise(r => setTimeout(r, 1500));

    // Update user subscription in Supabase (dev sandbox only)
    if (user?.id) {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ subscription_tier: plan.key, subscription_active: true })
        .eq("id", user.id);
      if (updateError) {
        setFormError(updateError.message);
        setStep("card");
        return;
      }
    }

    // Build invoice data
    const invNum = `FEN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(10000 + Math.random() * 90000)}`;
    setInvoiceData({
      invoiceNumber: invNum,
      planName: plan.name,
      amount: getRawAmount(totalUSD, currency),
      currency: currency.code,
      symbol: currency.symbol,
      billingEmail,
      cardName,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      period: plan.period,
    });

    setStep("success");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const Icon = plan.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
          {/* ── Header ── */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-5 h-5 text-primary" />
              {step === "success" ? "Payment Successful 🎉" : `Subscribe to ${plan.name}`}
            </DialogTitle>
          </DialogHeader>

          {/* ══ STEP: REVIEW ══════════════════════════════════════════════════ */}
          {step === "review" && (
            <div className="space-y-5">
              {/* Plan Summary */}
              <Card className={`border-2 overflow-hidden ${plan.key === "professional" ? "border-primary/40" : "border-amber-300/60"}`}>
                <div className={`h-1 bg-gradient-to-r ${plan.gradient}`} />
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.features.slice(0, 3).join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-foreground">{totalDisplay}</p>
                    <p className="text-xs text-muted-foreground">/{plan.period === "annual" ? "year" : "month"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Currency Selector */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">💱 Select Currency</Label>
                <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{currency.flag}</span>
                        <span className="font-medium">{currency.code}</span>
                        <span className="text-muted-foreground text-xs">— {currency.name}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="font-medium w-10">{c.code}</span>
                          <span className="text-muted-foreground text-xs flex-1">{c.name}</span>
                          <span className="text-xs font-mono text-right ml-4">{convertPrice(totalUSD, c)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price breakdown */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{plan.name} Subscription</span>
                  <span>{totalDisplay}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (0%)</span>
                  <span>{currency.symbol} 0.00</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total Due Today</span>
                  <span className="text-primary text-base">{totalDisplay}</span>
                </div>
                {currencyCode !== "USD" && (
                  <p className="text-xs text-muted-foreground">≈ ${totalUSD.toFixed(2)} USD · Rates updated daily</p>
                )}
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {(PAYMENTS_ENABLED
                  ? [
                      { icon: Lock, label: "SSL Secured" },
                      { icon: Shield, label: "Dev Sandbox" },
                    ]
                  : [
                      { icon: Lock, label: "Secure Connection" },
                      { icon: Shield, label: STRIPE_ENABLED ? "Stripe Checkout" : "Stripe Checkout Soon" },
                    ]
                ).map(({ icon: SIcon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SIcon className="w-3.5 h-3.5 text-emerald-500" />
                    {label}
                  </div>
                ))}
              </div>

              {STRIPE_ENABLED && !DEV_PAYMENTS ? (
              <Button onClick={handlePay} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2">
                {t("payment.stripe")} <ChevronRight className="w-5 h-5" />
              </Button>
              ) : PAYMENTS_ENABLED ? (
              <Button onClick={() => setStep("card")} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2">
                Continue to Payment <ChevronRight className="w-5 h-5" />
              </Button>
              ) : (
              <Button
                asChild
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base gap-2"
              >
                <a href={`mailto:${BILLING_CONTACT}?subject=${encodeURIComponent(`${plan.name} subscription — Flavor Experts Network`)}&body=${encodeURIComponent(`Hello,\n\nI would like to subscribe to the ${plan.name} plan (${totalDisplay}).\n\nAccount email: ${billingEmail || user?.email || ""}\n\nThank you.`)}`}>
                  {t("payment.contact")} <ChevronRight className="w-5 h-5" />
                </a>
              </Button>
              )}
            </div>
          )}

          {/* ══ STEP: CARD DETAILS ════════════════════════════════════════════ */}
          {step === "card" && (
            <div className="space-y-4">
              {/* Order summary bar */}
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{plan.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{currency.flag} {currency.code}</span>
                  <span className="font-bold text-primary">{totalDisplay}</span>
                </div>
              </div>

              {/* Card number */}
              <div className="space-y-1.5">
                <Label>Card Number</Label>
                <div className="relative">
                  <Input
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="pr-16 font-mono tracking-widest h-11"
                    maxLength={19}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {cardType === "visa" && <span className="text-blue-600 font-black text-xs italic">VISA</span>}
                    {cardType === "mastercard" && <div className="flex"><div className="w-4 h-4 rounded-full bg-red-500 opacity-80" /><div className="w-4 h-4 rounded-full bg-amber-400 -ml-2 opacity-80" /></div>}
                    {cardType === "amex" && <span className="text-blue-500 font-black text-xs">AMEX</span>}
                    {cardType === "unknown" && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {/* Expiry + CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input
                    value={expiry}
                    onChange={e => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="font-mono h-11"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CVV</Label>
                  <Input
                    type="password"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    className="font-mono h-11"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Cardholder name */}
              <div className="space-y-1.5">
                <Label>Cardholder Name</Label>
                <Input
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="As it appears on card"
                  className="h-11"
                />
              </div>

              {/* Billing Email */}
              <div className="space-y-1.5">
                <Label>Billing Email <span className="text-muted-foreground text-xs">(invoice will be sent here)</span></Label>
                <Input
                  type="email"
                  value={billingEmail}
                  onChange={e => setBillingEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-11"
                />
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {[
                      { code: "AE", name: "🇦🇪 United Arab Emirates" },
                      { code: "SA", name: "🇸🇦 Saudi Arabia" },
                      { code: "KW", name: "🇰🇼 Kuwait" },
                      { code: "QA", name: "🇶🇦 Qatar" },
                      { code: "BH", name: "🇧🇭 Bahrain" },
                      { code: "OM", name: "🇴🇲 Oman" },
                      { code: "JO", name: "🇯🇴 Jordan" },
                      { code: "EG", name: "🇪🇬 Egypt" },
                      { code: "MA", name: "🇲🇦 Morocco" },
                      { code: "US", name: "🇺🇸 United States" },
                      { code: "GB", name: "🇬🇧 United Kingdom" },
                      { code: "DE", name: "🇩🇪 Germany" },
                      { code: "FR", name: "🇫🇷 France" },
                      { code: "IN", name: "🇮🇳 India" },
                      { code: "SG", name: "🇸🇬 Singapore" },
                      { code: "CN", name: "🇨🇳 China" },
                      { code: "AU", name: "🇦🇺 Australia" },
                      { code: "CA", name: "🇨🇦 Canada" },
                      { code: "OTHER", name: "🌍 Other" },
                    ].map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setStep("review")} className="flex-1 h-11">← Back</Button>
                <Button onClick={handlePay} className="flex-2 h-11 bg-primary hover:bg-primary/90 flex-1 font-semibold gap-2">
                  <Lock className="w-4 h-4" /> Pay {totalDisplay}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                🔐 Your payment is encrypted with 256-bit SSL. We never store your card details.
              </p>
            </div>
          )}

          {/* ══ STEP: PROCESSING ══════════════════════════════════════════════ */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Processing Payment…</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Securely verifying your card and activating your subscription. Please wait…
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> SSL Secured · PCI DSS Compliant
              </div>
            </div>
          )}

          {/* ══ STEP: SUCCESS ═════════════════════════════════════════════════ */}
          {step === "success" && invoiceData && (
            <div className="space-y-5">
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Your <strong>{plan.name}</strong> subscription is now active.
                  A confirmation email has been sent to <strong>{billingEmail}</strong>.
                </p>
              </div>

              {/* Invoice preview */}
              <div className="bg-secondary/30 rounded-xl p-4 space-y-2 text-sm border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Invoice #{invoiceData.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Plan</span><span className="font-medium text-foreground">{invoiceData.planName}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount</span><span className="font-medium text-foreground">{invoiceData.symbol} {invoiceData.amount} {invoiceData.currency}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Date</span><span className="font-medium text-foreground">{invoiceData.date}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span><Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 text-xs">✓ Paid</Badge>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setInvoiceOpen(true)}
                >
                  <Printer className="w-4 h-4" /> View Invoice
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                  onClick={handleClose}
                >
                  <FlaskConical className="w-4 h-4" /> Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      {invoiceData && (
        <InvoiceModal
          open={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          invoice={invoiceData}
        />
      )}
    </>
  );
}

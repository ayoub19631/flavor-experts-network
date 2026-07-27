import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type Commodity = {
  name: string;
  name_ar?: string;
  trend: "up" | "down" | "stable";
  note: string;
  note_ar?: string;
};

type MarketBriefing = {
  id: string;
  briefing_date: string;
  title: string;
  title_ar?: string | null;
  summary: string;
  summary_ar?: string | null;
  body_en: string;
  body_ar?: string | null;
  highlights: string[] | null;
  commodities: Commodity[] | null;
  updated_at?: string;
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
  if (trend === "down") return <ArrowDownRight className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function MarketPage() {
  const { lang } = useI18n();
  const { isAdmin } = useAuth();
  const isAR = lang === "ar";
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("market_briefings")
      .select("*")
      .eq("is_published", true)
      .order("briefing_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (err) setError(err.message);
    setBriefing((data as MarketBriefing) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const refreshNow = async () => {
    setRefreshing(true);
    setError(null);
    const { data, error: err } = await supabase.functions.invoke("refresh-market-briefing", { body: {} });
    if (err || data?.error) {
      setError(err?.message || String(data?.error) || "Refresh failed");
    } else {
      await load();
    }
    setRefreshing(false);
  };

  const title = isAR ? (briefing?.title_ar || briefing?.title) : briefing?.title;
  const summary = isAR ? (briefing?.summary_ar || briefing?.summary) : briefing?.summary;
  const body = isAR ? (briefing?.body_ar || briefing?.body_en) : briefing?.body_en;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="w-4 h-4" />
            {isAR ? "العودة" : "Back"}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <Badge className="bg-primary/10 text-primary border-0 mb-3">
                <TrendingUp className="w-3.5 h-3.5 me-1.5" />
                {isAR ? "موجز السوق اليومي" : "Daily Market Desk"}
              </Badge>
              <h1 className="text-3xl font-bold text-foreground">
                {isAR ? "سوق مواد النكهات الأولية" : "Flavor Raw Materials Market"}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {isAR
                  ? "تحديث تلقائي كل 24 ساعة لمساعدة المتخصصين على متابعة اتجاهات الزيوت العطرية والفانيليا والمنثول والمواد الأولية."
                  : "Auto-updated every 24 hours to help professionals track citrus oils, vanilla, menthol, and aroma feedstock trends."}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={refreshNow} disabled={refreshing} className="gap-2">
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isAR ? "تحديث الآن" : "Refresh now"}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center text-destructive">{error}</CardContent>
            </Card>
          ) : !briefing ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <p className="text-foreground font-medium">
                  {isAR ? "لا يوجد موجز بعد" : "No briefing published yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAR
                    ? "سيظهر هنا بعد أول تشغيل يومي تلقائي، أو يمكن للمسؤول التحديث الآن."
                    : "It will appear after the first daily cron run, or an admin can refresh now."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-primary/20 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{briefing.briefing_date}</span>
                    <span>·</span>
                    <span>{isAR ? "تحديث تلقائي" : "Auto-generated"}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{summary}</p>
                </CardContent>
              </Card>

              {Array.isArray(briefing.commodities) && briefing.commodities.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {briefing.commodities.map((c, i) => (
                    <Card key={`${c.name}-${i}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-foreground">
                            {isAR ? c.name_ar || c.name : c.name}
                          </p>
                          <TrendIcon trend={c.trend} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isAR ? c.note_ar || c.note : c.note}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {Array.isArray(briefing.highlights) && briefing.highlights.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">{isAR ? "أبرز النقاط" : "Highlights"}</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {briefing.highlights.map((h, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6 sm:p-8">
                  <h3 className="font-semibold mb-4">{isAR ? "التفاصيل" : "Full briefing"}</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {body}
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 border-t border-border pt-4">
                    {isAR
                      ? "موجز توجيهي مهني للمتخصصين — وليس أسعار بورصة لحظية أو نصيحة مالية."
                      : "Professional orientation brief for specialists — not live exchange quotes or financial advice."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

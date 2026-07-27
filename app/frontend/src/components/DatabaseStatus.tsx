import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  X,
} from "lucide-react";
import { checkDatabaseHealth, type DbHealthResult } from "@/lib/supabase";

const TABLE_NAMES = [
  "user_profiles",
  "members",
  "industry_news",
  "educational_resources",
  "contact_messages",
  "enterprise_requests",
] as const;

const TABLE_LABELS: Record<string, string> = {
  user_profiles: "User Profiles",
  members: "Members",
  industry_news: "Industry News",
  educational_resources: "Educational Resources",
  contact_messages: "Contact Messages",
  enterprise_requests: "Enterprise Requests",
};

export default function DatabaseStatus() {
  if (import.meta.env.PROD) return null;
  return <DatabaseStatusWidget />;
}

function DatabaseStatusWidget() {
  const [health, setHealth] = useState<DbHealthResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const runCheck = async () => {
    setChecking(true);
    const result = await checkDatabaseHealth();
    setHealth(result);
    setChecking(false);
  };

  useEffect(() => { runCheck(); }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  const handleCopySQL = async () => {
    const hint =
      "-- Use supabase/migrations/*.sql in the repo (Supabase SQL Editor).\n-- Do not run legacy public/database-setup.sql — it has unsafe demo policies.";
    try {
      await navigator.clipboard.writeText(hint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // Auto-dismiss if all connected and not expanded
  const allConnected = health?.status === "connected";

  if (dismissed) return null;

  // Status config
  const statusConfig = {
    connected: {
      dot: "bg-emerald-400",
      pulse: "animate-none",
      label: "DB Connected",
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
      pill: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
      card: "border-emerald-200 dark:border-emerald-800/50",
    },
    tables_missing: {
      dot: "bg-amber-400",
      pulse: "animate-pulse",
      label: "Tables Missing",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      pill: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400",
      card: "border-amber-200 dark:border-amber-800/50",
    },
    checking: {
      dot: "bg-slate-400",
      pulse: "animate-pulse",
      label: "Checking DB…",
      icon: <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />,
      pill: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400",
      card: "border-slate-200 dark:border-slate-800/50",
    },
    disconnected: {
      dot: "bg-red-400",
      pulse: "animate-pulse",
      label: "DB Disconnected",
      icon: <XCircle className="w-3.5 h-3.5 text-red-400" />,
      pill: "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400",
      card: "border-red-200 dark:border-red-800/50",
    },
  };

  const status = (health?.status ?? "disconnected") as keyof typeof statusConfig;
  const cfg = statusConfig[status] ?? statusConfig.disconnected;

  return (
    <div ref={panelRef} className="fixed bottom-6 left-6 z-[9998] flex flex-col items-start gap-2">
      {/* ── Expanded Panel ── */}
      {expanded && (
        <div
          className={`w-72 rounded-2xl border bg-background shadow-xl shadow-black/10 overflow-hidden transition-all ${cfg.card}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Database Status</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={runCheck}
                disabled={checking}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Table list */}
          <div className="px-4 py-3 space-y-2">
            {checking ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking tables…</span>
              </div>
            ) : (
              TABLE_NAMES.map(table => (
                <div key={table} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{TABLE_LABELS[table]}</span>
                  {health?.tables[table] ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Missing
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Setup SQL (only when not fully connected) */}
          {health && health.status !== "connected" && (
            <div className="px-4 pb-4 space-y-2 border-t border-border/60 pt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run the setup SQL in your{" "}
                <a
                  href="https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Supabase SQL Editor
                </a>
                .
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5 h-8"
                onClick={handleCopySQL}
              >
                {copied ? (
                  <><Check className="w-3 h-3 text-emerald-500" /> Copied!</>
                ) : (
                  <><Copy className="w-3 h-3" /> Copy Setup SQL</>
                )}
              </Button>
            </div>
          )}

          {/* All good */}
          {allConnected && (
            <div className="px-4 pb-4 pt-1 flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ All tables connected</span>
              <button
                onClick={() => setDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Floating Pill Trigger ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 active:scale-95 shadow-sm ${cfg.pill}`}
        title="Database Status"
      >
        {checking ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.pulse}`} />
        )}
        <Database className="w-3 h-3" />
        <span>{checking ? "Checking…" : cfg.label}</span>
      </button>
    </div>
  );
}
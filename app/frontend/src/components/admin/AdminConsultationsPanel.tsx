import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ConsultationRequest } from "@/lib/types";
import { toast } from "sonner";

const STATUSES = ["new", "contacted", "scheduled", "completed", "cancelled"] as const;

export default function AdminConsultationsPanel() {
  const [rows, setRows] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultation_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data as ConsultationRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error } = await supabase
      .from("consultation_requests")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success("Status updated");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this consultation request?")) return;
    setBusyId(id);
    const { error } = await supabase.from("consultation_requests").delete().eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    }
  };

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Consultation requests
            {newCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{newCount} new</Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Inquiries from /consultations.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No consultation requests yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                    <p className="text-sm text-foreground pt-1">
                      <span className="text-muted-foreground">Topic:</span> {row.topic}
                    </p>
                    {row.preferred_date && (
                      <p className="text-xs text-muted-foreground">Preferred: {row.preferred_date}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.status}
                      onValueChange={(v) => updateStatus(row.id, v)}
                      disabled={busyId === row.id}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-600"
                      disabled={busyId === row.id}
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.message}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

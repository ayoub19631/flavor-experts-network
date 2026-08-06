import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ForumCategory } from "@/lib/types";
import { toast } from "sonner";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const emptyForm = {
  name: "",
  name_ar: "",
  slug: "",
  description: "",
  description_ar: "",
  sort_order: "0",
  is_published: true,
};

export default function AdminForumCategoriesPanel() {
  const [rows, setRows] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<ForumCategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as ForumCategory[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialog(true);
  };

  const openEdit = (row: ForumCategory) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      name_ar: row.name_ar || "",
      slug: row.slug || "",
      description: row.description || "",
      description_ar: row.description_ar || "",
      sort_order: String(row.sort_order ?? 0),
      is_published: row.is_published,
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const slug = (form.slug.trim() || slugify(form.name)).replace(/^-+|-+$/g, "");
    if (!slug) {
      toast.error("Slug is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      name_ar: form.name_ar.trim() || null,
      slug,
      description: form.description.trim() || null,
      description_ar: form.description_ar.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_published: form.is_published,
    };
    const { error } = editing
      ? await supabase.from("forum_categories").update(payload).eq("id", editing.id)
      : await supabase.from("forum_categories").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Category updated" : "Category created");
      setDialog(false);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this forum category?")) return;
    setBusyId(id);
    const { error } = await supabase.from("forum_categories").delete().eq("id", id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Category deleted");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Forum categories</h3>
          <p className="text-sm text-muted-foreground mt-1">Manage public forum sections.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No categories yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{row.name}</p>
                    <Badge variant="secondary">{row.slug}</Badge>
                    <Badge className={row.is_published ? "bg-emerald-100 text-emerald-700 border-0" : "bg-secondary border-0"}>
                      {row.is_published ? "Published" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {row.description || "No description"} · order {row.sort_order}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(row)}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-red-600" disabled={busyId === row.id} onClick={() => remove(row.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    name: e.target.value,
                    slug: editing ? p.slug : slugify(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Arabic)</Label>
              <Input value={form.name_ar} onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (Arabic)</Label>
              <Textarea rows={2} value={form.description_ar} onChange={(e) => setForm((p) => ({ ...p, description_ar: e.target.value }))} dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} />
              Published
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

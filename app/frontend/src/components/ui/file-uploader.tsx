import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle, Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "./button";

// ─── FileUploader ──────────────────────────────────────────────────────────────
// Used for uploading images and PDF files in admin forms
// ─────────────────────────────────────────────────────────────────────────────

interface FileUploaderProps {
  accept?: "image" | "pdf" | "all";
  bucket?: string;
  folder?: string;
  currentUrl?: string;
  onUpload: (url: string) => void;
  label?: string;
  maxSizeMB?: number;
  className?: string;
  showUrlFallback?: boolean;
}

export function FileUploader({
  accept = "image",
  bucket = "platform-uploads",
  folder = "uploads",
  currentUrl = "",
  onUpload,
  label,
  maxSizeMB = 10,
  className = "",
  showUrlFallback = true,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>(currentUrl);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptStr =
    accept === "image"
      ? "image/jpeg,image/png,image/webp,image/gif"
      : accept === "pdf"
      ? "application/pdf"
      : "image/jpeg,image/png,image/webp,image/gif,application/pdf";

  const isPdfUrl = (url: string) =>
    url?.toLowerCase().includes(".pdf") || url?.toLowerCase().includes("pdf");

  const handleFile = async (file: File) => {
    setError(null);
    const isImg = file.type.startsWith("image/");
    const isPdfFile = file.type === "application/pdf";

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`الحجم يجب أن يكون أقل من ${maxSizeMB}MB / File must be under ${maxSizeMB}MB`);
      return;
    }
    if (accept === "image" && !isImg) { setError("Please upload an image file (JPEG, PNG, WebP)"); return; }
    if (accept === "pdf" && !isPdfFile) { setError("Please upload a PDF file"); return; }

    setUploading(true);
    setProgress(10);

    const ext = file.name.split(".").pop() ?? (isPdfFile ? "pdf" : "jpg");
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const path = `${folder}/${timestamp}-${random}.${ext}`;

    try {
      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      setProgress(80);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setProgress(100);
      setPreview(isPdfFile ? "pdf:" + data.publicUrl : data.publicUrl);
      onUpload(data.publicUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed. Check Supabase Storage bucket 'platform-uploads'.");
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  const clearFile = () => {
    setPreview("");
    setUrlInput("");
    setError(null);
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUrlCommit = () => {
    if (urlInput.trim()) {
      setPreview(isPdfUrl(urlInput) ? "pdf:" + urlInput.trim() : urlInput.trim());
      onUpload(urlInput.trim());
      setUrlInput("");
    }
  };

  const isPdfPreview = preview.startsWith("pdf:");
  const previewUrl = isPdfPreview ? preview.slice(4) : preview;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      {/* ── Preview ── */}
      {preview && !isPdfPreview && (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="preview"
            className="w-full h-40 object-cover rounded-xl border border-border shadow-sm"
            onError={() => setPreview("")}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all" />
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-destructive rounded-full flex items-center justify-center transition-colors shadow"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 bg-black/50 rounded-md px-2 py-0.5">
            <p className="text-white text-xs">Image ready ✓</p>
          </div>
        </div>
      )}

      {preview && isPdfPreview && (
        <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">PDF Uploaded ✓</p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline truncate block"
            >
              View PDF ↗
            </a>
          </div>
          <button
            onClick={clearFile}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Drop Zone ── */}
      {!preview && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/60 hover:bg-muted/30"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-9 h-9 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Uploading... {progress}%</p>
              <div className="w-full max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
                {accept === "pdf" ? (
                  <FileText className="w-6 h-6 text-muted-foreground" />
                ) : accept === "all" ? (
                  <div className="flex gap-1">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {isDragging ? "Drop here!" : "Click or drag to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accept === "pdf"
                    ? "PDF files only"
                    : accept === "all"
                    ? "Images (JPEG, PNG) or PDF"
                    : "JPEG, PNG, WebP, GIF"}
                  {" "}· Max {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── URL Fallback ── */}
      {!preview && !uploading && showUrlFallback && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlCommit()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Or paste a URL and press Enter..."
            />
          </div>
          {urlInput && (
            <Button type="button" size="sm" variant="outline" onClick={handleUrlCommit} className="h-9 px-3">
              Use
            </Button>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-1.5 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ─── AvatarUploader ─────────────────────────────────────────────────────────
// Circular upload widget for profile/member/company photos

interface AvatarUploaderProps {
  currentUrl?: string;
  name?: string;
  bucket?: string;
  folder?: string;
  onUpload: (url: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
}

export function AvatarUploader({
  currentUrl = "",
  name = "?",
  bucket = "platform-uploads",
  folder = "avatars",
  onUpload,
  size = "md",
  label,
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeMap = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32", xl: "w-40 h-40" };
  const textMap = { sm: "text-lg", md: "text-xl", lg: "text-2xl", xl: "text-3xl" };

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Images only (JPEG, PNG, WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB"); return; }
    setError(null);
    setSuccess(false);
    setUploading(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setPreview(data.publicUrl);
      onUpload(data.publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circle */}
      <div
        className={`relative ${sizeMap[size]} rounded-full cursor-pointer group flex-shrink-0`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt={name}
            className="w-full h-full rounded-full object-cover border-3 border-primary/20 shadow-md"
            onError={() => setPreview("")}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-sm">
            <span className={`text-primary font-bold ${textMap[size]}`}>{initials}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          {uploading ? (
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          ) : (
            <Upload className="w-7 h-7 text-white drop-shadow" />
          )}
        </div>

        {/* Success badge */}
        {success && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow border-2 border-background">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs h-7 gap-1.5 px-3"
      >
        {uploading ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-3 h-3" /> {label || "Upload Photo"}</>
        )}
      </Button>

      {error && <p className="text-xs text-destructive text-center max-w-[160px]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

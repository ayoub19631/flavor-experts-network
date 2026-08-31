export default function SoftPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <div className="h-7 w-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

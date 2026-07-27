import { Minus, Square, X, FlaskConical } from 'lucide-react';
import { useIsElectron } from '@/hooks/use-platform';

/**
 * Custom title bar for Electron desktop app.
 * Only renders when running inside Electron.
 */
export function ElectronTitleBar() {
  const isElectron = useIsElectron();
  if (!isElectron) return null;

  const api = (window as any).electronAPI;

  return (
    <div
      className="h-9 bg-background border-b border-border flex items-center justify-between select-none shrink-0 z-50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App icon + name */}
      <div className="flex items-center gap-2 px-3">
        <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
          <FlaskConical className="w-3 h-3 text-primary-foreground" />
        </div>
        <span className="text-xs font-medium text-foreground/70">خبراء النكهات</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => api?.window.minimize()}
          className="h-9 w-11 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="تصغير"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => api?.window.maximize()}
          className="h-9 w-11 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="تكبير"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => api?.window.close()}
          className="h-9 w-11 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors text-muted-foreground"
          aria-label="إغلاق"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

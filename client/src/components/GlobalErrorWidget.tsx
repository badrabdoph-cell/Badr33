import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatGlobalError,
  getLastGlobalError,
  reportGlobalError,
  subscribeGlobalError,
  type GlobalErrorInfo,
} from "@/lib/globalError";

export default function GlobalErrorWidget() {
  const [lastError, setLastError] = useState<GlobalErrorInfo | null>(() => {
    if (typeof window === "undefined") return null;
    return getLastGlobalError();
  });
  const [open, setOpen] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeGlobalError((error) => {
      setLastError(error);
      setOpen(true);
      setDismissedId(null);
    });
  }, []);

  const visibleError = lastError && lastError.id !== dismissedId ? lastError : null;
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

  const timeLabel = useMemo(() => {
    if (!visibleError) return "";
    try {
      return new Date(visibleError.time).toLocaleString("ar-EG");
    } catch {
      return visibleError.time;
    }
  }, [visibleError]);

  if (!visibleError) return null;

  const handleCopy = () => {
    const payload = formatGlobalError(visibleError);
    if (canCopy) {
      navigator.clipboard.writeText(payload).catch(() => {
        reportGlobalError(payload, "copy-failed");
      });
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[95] max-w-[90vw] text-right">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-destructive/50",
          "bg-destructive/15 text-destructive px-4 py-2 text-xs font-semibold",
          "shadow-lg backdrop-blur-md"
        )}
      >
        خطأ في الصفحة
        <span className="text-[11px] opacity-80">اضغط لعرض التفاصيل</span>
      </button>

      {open ? (
        <div className="mt-3 w-[min(520px,90vw)] rounded-xl border border-white/10 bg-background/95 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">
              تفاصيل الخطأ
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              إغلاق
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {visibleError.source ? `المصدر: ${visibleError.source}` : "المصدر: غير معروف"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            الوقت: {timeLabel}
          </div>
          <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-foreground">
            {visibleError.message}
          </div>
          {visibleError.details ? (
            <div className="mt-3 rounded-lg bg-muted/70 p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">
              {visibleError.details}
            </div>
          ) : null}
          {visibleError.stack ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/70 p-3 text-[11px] text-muted-foreground whitespace-pre-wrap">
              {visibleError.stack}
            </pre>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "rounded-lg border border-white/10 px-3 py-1.5 text-xs",
                "bg-muted text-foreground hover:opacity-90"
              )}
            >
              نسخ التفاصيل
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissedId(visibleError.id);
                setOpen(false);
              }}
              className={cn(
                "rounded-lg border border-white/10 px-3 py-1.5 text-xs",
                "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              إخفاء
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

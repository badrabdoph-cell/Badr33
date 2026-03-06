import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Pencil,
  X,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Type,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";
import { pushEdit } from "@/lib/editHistory";
import { parseContentValue, serializeContentValue } from "@/lib/contentMeta";

type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
};

function useInlineConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "تأكيد الحفظ",
    description: "هل تريد حفظ التعديل الآن؟",
    confirmLabel: "حفظ",
    cancelLabel: "إلغاء",
  });

  const requestConfirm = (options: {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) => {
    setState({
      open: true,
      title: options.title ?? "تأكيد الحفظ",
      description: options.description ?? "هل تريد حفظ التعديل الآن؟",
      confirmLabel: options.confirmLabel ?? "حفظ",
      cancelLabel: options.cancelLabel ?? "إلغاء",
      onConfirm: options.onConfirm,
    });
  };

  const closeDialog = () => {
    setState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  };

  const ConfirmDialog = () => (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <AlertDialogContent dir="rtl" className="text-right">
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description ? (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-start">
          <AlertDialogCancel>{state.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const action = state.onConfirm;
              closeDialog();
              action?.();
            }}
          >
            {state.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestConfirm, ConfirmDialog };
}

function getEditCollapseTarget(element: HTMLElement | null) {
  if (!element) return null;
  const li = element.closest("li");
  if (li) return li;
  const parent = element.parentElement;
  if (!parent) return null;
  const meaningfulNodes = Array.from(parent.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").trim().length > 0;
    }
    return node.nodeType === Node.ELEMENT_NODE;
  });
  if (meaningfulNodes.length === 1 && meaningfulNodes[0] === element) {
    return parent;
  }
  return null;
}

type EditableTextProps = {
  value?: string | null;
  fallback?: string;
  fallbackNode?: ReactNode;
  placeholder?: string;
  fieldKey: string;
  category: string;
  label: string;
  multiline?: boolean;
  className?: string;
  displayClassName?: string;
  editorClassName?: string;
  as?: ElementType;
};

export function useInlineEditMode() {
  const [isPreview, setIsPreview] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const hasPreviewParam = params.get("adminPreview") === "1";
    const storageKey = "adminPreviewMode";
    if (hasPreviewParam) {
      window.sessionStorage.setItem(storageKey, "1");
      return true;
    }
    return window.sessionStorage.getItem(storageKey) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = "adminPreviewMode";
    const params = new URLSearchParams(window.location.search);
    const hasPreviewParam = params.get("adminPreview") === "1";
    if (hasPreviewParam) {
      window.sessionStorage.setItem(storageKey, "1");
      setIsPreview(true);
      return;
    }
    const stored = window.sessionStorage.getItem(storageKey) === "1";
    setIsPreview(stored);
  }, []);

  const statusQuery = trpc.adminAccess.status.useQuery(undefined, {
    enabled: isPreview,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    enabled: isPreview && Boolean(statusQuery.data?.authenticated),
    loading: isPreview && statusQuery.isLoading,
  };
}

type ContentEntry = {
  text: string;
  raw: string;
  hidden: boolean;
  scale?: number;
  offsetX: number;
  offsetY: number;
};

function useContentEntries() {
  const { data } = trpc.siteContent.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  return useMemo(() => {
    const out: Record<string, ContentEntry> = {};
    (data ?? []).forEach((item: any) => {
      const parsed = parseContentValue(item.value);
      out[item.key] = {
        text: parsed.text,
        raw: parsed.raw,
        hidden: parsed.hidden,
        scale: parsed.scale,
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);
}

function useContactEntries() {
  const { data } = trpc.contactInfo.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  return useMemo(() => {
    const out: Record<string, ContentEntry> = {};
    (data ?? []).forEach((item: any) => {
      const parsed = parseContentValue(item.value);
      out[item.key] = {
        text: parsed.text,
        raw: parsed.raw,
        hidden: parsed.hidden,
        scale: parsed.scale,
        offsetX: 0,
        offsetY: 0,
      };
    });
    return out;
  }, [data]);
}

function useSiteImagePositions() {
  const { data } = trpc.siteImages.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  return useMemo(() => {
    const out: Record<string, { offsetX: number; offsetY: number }> = {};
    (data ?? []).forEach((item: any) => {
      out[item.key] = {
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);
}

export function EditableText({
  value,
  fallback,
  fallbackNode,
  placeholder,
  fieldKey,
  category,
  label,
  multiline = false,
  className,
  displayClassName,
  editorClassName,
  as = "span",
}: EditableTextProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const anchorRef = useRef<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [textTouched, setTextTouched] = useState(false);
  const [offsetDraft, setOffsetDraft] = useState({ offsetX: 0, offsetY: 0 });
  const [scaleDraft, setScaleDraft] = useState(1);
  const [showMoveTools, setShowMoveTools] = useState(false);
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();
  const contentEntries = useContentEntries();
  const entry = contentEntries[fieldKey];
  const position = entry
    ? { offsetX: entry.offsetX, offsetY: entry.offsetY }
    : undefined;
  const isHidden = entry?.hidden ?? false;
  const scaleValue = typeof entry?.scale === "number" ? entry.scale : 1;
  const hasOffset = Boolean(position?.offsetX || position?.offsetY);
  const positionStyle = hasOffset
    ? {
        transform: `translate(${position?.offsetX ?? 0}px, ${position?.offsetY ?? 0}px)`,
      }
    : undefined;

  const normalizedValue = value ?? "";
  const entryText = entry?.text ?? normalizedValue;
  const displayValue = entryText || fallback || "";
  const showPlaceholder = !entryText && !!placeholder;
  const rawValue = entry?.raw ?? serializeContentValue({ text: entryText, hidden: isHidden, scale: scaleValue });
  const shouldHide = isHidden && !isEditing;

  useEffect(() => {
    const element = anchorRef.current;
    const target = getEditCollapseTarget(element);
    if (!target) return;
    if (shouldHide) {
      target.setAttribute("data-edit-hidden", "true");
    } else {
      target.removeAttribute("data-edit-hidden");
    }
    return () => {
      target.removeAttribute("data-edit-hidden");
    };
  }, [shouldHide]);

  useEffect(() => {
    if (isEditing) return;
    const nextOffsetX = position?.offsetX ?? 0;
    const nextOffsetY = position?.offsetY ?? 0;
    const nextScale = scaleValue || 1;
    setDraft((prev) => (prev === entryText ? prev : entryText));
    setOffsetDraft((prev) =>
      prev.offsetX === nextOffsetX && prev.offsetY === nextOffsetY
        ? prev
        : { offsetX: nextOffsetX, offsetY: nextOffsetY }
    );
    setScaleDraft((prev) =>
      Math.abs(prev - nextScale) <= 0.001 ? prev : nextScale
    );
    setShowMoveTools(false);
  }, [entryText, position?.offsetX, position?.offsetY, scaleValue, isEditing]);

  const upsertMutation = trpc.siteContent.upsert.useMutation({
    onMutate: (input) => {
      const prev = rawValue;
      return {
        action: {
          kind: "siteContent" as const,
          key: input.key,
          prev,
          next: input.value,
          category: input.category,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم حفظ النص");
      utils.siteContent.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteContentUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const startEditing = () => {
    if (!enabled) return;
    setDraft(entryText || fallback || "");
    setTextTouched(false);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
    setScaleDraft(scaleValue || 1);
    setShowMoveTools(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    const textChanged = textTouched && draft !== entryText;
    const offsetChanged =
      offsetDraft.offsetX !== (position?.offsetX ?? 0) ||
      offsetDraft.offsetY !== (position?.offsetY ?? 0);
    const scaleChanged = Math.abs(scaleDraft - scaleValue) > 0.001;
    if (!textChanged && !offsetChanged && !scaleChanged) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: serializeContentValue({
            text: textChanged ? draft : entryText,
            hidden: isHidden,
            scale: scaleDraft,
          }),
          category,
          label,
          offsetX: offsetDraft.offsetX,
          offsetY: offsetDraft.offsetY,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(entryText);
    setTextTouched(false);
    setOffsetDraft({
      offsetX: position?.offsetX ?? 0,
      offsetY: position?.offsetY ?? 0,
    });
    setScaleDraft(scaleValue || 1);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      handleSave();
      return;
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  const Tag = as ?? "span";
  const tagProps = typeof Tag === "string" ? { ref: anchorRef } : {};

  const clampScale = (value: number) => Math.max(0.6, Math.min(2, value));

  const persistMeta = (next: {
    text?: string;
    hidden?: boolean;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
  }) => {
    if (!enabled || upsertMutation.isPending) return;
    const nextText = next.text ?? entryText;
    const nextHidden = next.hidden ?? isHidden;
    const nextScale = typeof next.scale === "number" ? next.scale : scaleValue;
    const nextOffsetX =
      typeof next.offsetX === "number" ? next.offsetX : (position?.offsetX ?? 0);
    const nextOffsetY =
      typeof next.offsetY === "number" ? next.offsetY : (position?.offsetY ?? 0);
    upsertMutation.mutate({
      key: fieldKey,
      value: serializeContentValue({
        text: nextText,
        hidden: nextHidden,
        scale: nextScale,
      }),
      category,
      label,
      offsetX: nextOffsetX,
      offsetY: nextOffsetY,
    });
  };

  const handleToggleHidden = () => {
    requestConfirm({
      title: isHidden ? "إظهار النص" : "إخفاء النص",
      description: isHidden
        ? "هل تريد إظهار النص المخفي؟"
        : "سيتم إخفاء هذا النص من الموقع.",
      confirmLabel: isHidden ? "إظهار" : "إخفاء",
      onConfirm: () => persistMeta({ hidden: !isHidden }),
    });
  };

  const adjustScale = (delta: number) => {
    const next = clampScale((scaleValue || 1) + delta);
    persistMeta({ scale: next });
  };

  const resetScale = () => {
    persistMeta({ scale: 1 });
  };

  const nudgePosition = (dx: number, dy: number) => {
    const nextX = (position?.offsetX ?? 0) + dx;
    const nextY = (position?.offsetY ?? 0) + dy;
    persistMeta({ offsetX: nextX, offsetY: nextY });
  };

  const resetPosition = () => {
    persistMeta({ offsetX: 0, offsetY: 0 });
  };

  const textStyle =
    scaleValue && scaleValue !== 1 ? { fontSize: `${scaleValue}em` } : undefined;

  const advancedControls = (
    <>
      <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Move className="w-3 h-3" />
            الموضع (px)
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={offsetDraft.offsetX}
              onChange={(e) =>
                setOffsetDraft({
                  offsetX: Number(e.target.value) || 0,
                  offsetY: offsetDraft.offsetY,
                })
              }
              className="h-8 w-20 text-xs"
              dir="ltr"
              placeholder="X"
            />
            <Input
              type="number"
              value={offsetDraft.offsetY}
              onChange={(e) =>
                setOffsetDraft({
                  offsetX: offsetDraft.offsetX,
                  offsetY: Number(e.target.value) || 0,
                })
              }
              className="h-8 w-20 text-xs"
              dir="ltr"
              placeholder="Y"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() =>
                setOffsetDraft({
                  offsetX: offsetDraft.offsetX,
                  offsetY: offsetDraft.offsetY - 10,
                })
              }
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() =>
                setOffsetDraft({
                  offsetX: offsetDraft.offsetX + 10,
                  offsetY: offsetDraft.offsetY,
                })
              }
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() =>
                setOffsetDraft({
                  offsetX: offsetDraft.offsetX - 10,
                  offsetY: offsetDraft.offsetY,
                })
              }
            >
              <ArrowLeft className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() =>
                setOffsetDraft({
                  offsetX: offsetDraft.offsetX,
                  offsetY: offsetDraft.offsetY + 10,
                })
              }
            >
              <ArrowDown className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => setOffsetDraft({ offsetX: 0, offsetY: 0 })}
          >
            تصفير الموضع
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Type className="w-3 h-3" />
            حجم الخط
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() => setScaleDraft((prev) => clampScale(prev - 0.05))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              type="button"
              onClick={() => setScaleDraft((prev) => clampScale(prev + 0.05))}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => setScaleDraft(1)}
          >
            تصفير الحجم
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <Tag
      {...(tagProps as any)}
      className={cn(
        "relative group",
        enabled ? "cursor-text" : "",
        shouldHide ? "hidden" : "",
        className
      )}
      style={positionStyle}
    >
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setTextTouched(true);
              }}
              onKeyDown={handleKeyDown}
              className={cn("min-h-[110px]", editorClassName)}
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setTextTouched(true);
              }}
              onKeyDown={handleKeyDown}
              className={editorClassName}
              autoFocus
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
          <div className="hidden lg:flex lg:flex-col gap-2">
            {advancedControls}
          </div>
          <div className="lg:hidden">
            <details className="rounded-md border border-border/60 bg-muted/30 p-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                خيارات متقدمة
              </summary>
              <div className="mt-2 space-y-2">
                {advancedControls}
              </div>
            </details>
          </div>
          {multiline && (
            <div className="text-xs text-muted-foreground">
              للحفظ اضغط Ctrl + Enter
            </div>
          )}
        </div>
      ) : (
        <>
          {!isHidden ? (
            <span
              className={cn(
                "inline-block min-w-0",
                showPlaceholder ? "text-muted-foreground" : "text-inherit",
                enabled
                  ? "rounded-md outline outline-1 outline-dashed outline-transparent hover:outline-primary/40 transition"
                  : "",
                displayClassName
              )}
              style={textStyle}
            >
              {entryText ? (
                <span className="whitespace-pre-line">{entryText}</span>
              ) : fallbackNode ? (
                fallbackNode
              ) : displayValue ? (
                <span className="whitespace-pre-line">{displayValue}</span>
              ) : (
                placeholder ?? ""
              )}
            </span>
          ) : null}
          {enabled && !isHidden ? (
            <>
              <span
                className="hidden lg:inline-flex absolute top-1/2 z-20 -translate-y-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[10px] text-white shadow-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                style={{ right: "100%", marginRight: "0.5rem" }}
              >
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={startEditing}
                  title="تعديل"
                  disabled={upsertMutation.isPending}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={handleToggleHidden}
                  title={isHidden ? "إظهار النص" : "إخفاء النص"}
                  disabled={upsertMutation.isPending}
                >
                  {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={() => adjustScale(-0.05)}
                  title="تصغير النص"
                  disabled={upsertMutation.isPending}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={() => adjustScale(0.05)}
                  title="تكبير النص"
                  disabled={upsertMutation.isPending}
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={resetScale}
                  title="تصفير الحجم"
                  disabled={upsertMutation.isPending}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={() => setShowMoveTools((prev) => !prev)}
                  title="تحريك"
                >
                  <Move className="w-3 h-3" />
                </button>
                {showMoveTools ? (
                  <div className="absolute top-full right-0 mt-1 z-20 rounded-lg border border-white/15 bg-black/80 p-2 text-[10px] text-white shadow-lg">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 hover:bg-black/70"
                        onClick={() => nudgePosition(0, -6)}
                        title="أعلى"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 hover:bg-black/70"
                        onClick={() => nudgePosition(0, 6)}
                        title="أسفل"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 hover:bg-black/70"
                        onClick={() => nudgePosition(-6, 0)}
                        title="يسار"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 hover:bg-black/70"
                        onClick={() => nudgePosition(6, 0)}
                        title="يمين"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mt-2 w-full rounded-md border border-white/15 px-2 py-1 text-[10px] hover:bg-black/70"
                      onClick={resetPosition}
                    >
                      تصفير الموضع
                    </button>
                  </div>
                ) : null}
              </span>
              <span className="lg:hidden mt-2 inline-flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2 py-1">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background hover:bg-accent transition"
                  onClick={startEditing}
                  title="تعديل"
                  disabled={upsertMutation.isPending}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background hover:bg-accent transition"
                  onClick={handleToggleHidden}
                  title={isHidden ? "إظهار النص" : "إخفاء النص"}
                  disabled={upsertMutation.isPending}
                >
                  {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  اضغط تعديل لفتح الأدوات
                </span>
              </span>
            </>
          ) : null}
        </>
      )}
      <ConfirmDialog />
    </Tag>
  );
}

type EditableContactTextProps = {
  value?: string | null;
  fallback?: string;
  placeholder?: string;
  fieldKey: string;
  label: string;
  className?: string;
  displayClassName?: string;
  multiline?: boolean;
};

export function EditableContactText({
  value,
  fallback,
  placeholder,
  fieldKey,
  label,
  className,
  displayClassName,
  multiline = false,
}: EditableContactTextProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const anchorRef = useRef<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();
  const contactEntries = useContactEntries();
  const entry = contactEntries[fieldKey];

  const parsedValue = parseContentValue(value ?? "");
  const normalizedValue = entry?.text ?? parsedValue.text;
  const isHidden = entry?.hidden ?? parsedValue.hidden;
  const rawValue = entry?.raw ?? parsedValue.raw;
  const scaleValue =
    typeof entry?.scale === "number" ? entry.scale : parsedValue.scale ?? 1;
  const displayValue = normalizedValue || fallback || "";
  const showPlaceholder = !normalizedValue && !!placeholder;
  const shouldHide = isHidden && !isEditing;
  const textStyle =
    scaleValue && scaleValue !== 1 ? { fontSize: `${scaleValue}em` } : undefined;

  useEffect(() => {
    const element = anchorRef.current;
    const target = getEditCollapseTarget(element);
    if (!target) return;
    if (shouldHide) {
      target.setAttribute("data-edit-hidden", "true");
    } else {
      target.removeAttribute("data-edit-hidden");
    }
    return () => {
      target.removeAttribute("data-edit-hidden");
    };
  }, [shouldHide]);

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
  }, [normalizedValue, isEditing]);

  const upsertMutation = trpc.contactInfo.upsert.useMutation({
    onMutate: (input) => {
      const prev = rawValue;
      return {
        action: {
          kind: "contactInfo" as const,
          key: input.key,
          prev,
          next: input.value,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم حفظ البيانات");
      utils.contactInfo.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteContactUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    if (draft === normalizedValue) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: serializeContentValue({ text: draft, hidden: isHidden, scale: scaleValue }),
          label,
        });
      },
    });
  };

  const handleToggleHidden = () => {
    requestConfirm({
      title: isHidden ? "إظهار النص" : "إخفاء النص",
      description: isHidden
        ? "هل تريد إظهار النص المخفي؟"
        : "سيتم إخفاء هذا النص من الموقع.",
      confirmLabel: isHidden ? "إظهار" : "إخفاء",
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: serializeContentValue({
            text: normalizedValue,
            hidden: !isHidden,
            scale: scaleValue,
          }),
          label,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(normalizedValue);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <span
      ref={anchorRef as any}
      className={cn(
        "relative group",
        enabled ? "cursor-text" : "",
        shouldHide ? "hidden" : "",
        className
      )}
    >
      {isEditing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[110px]"
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!isHidden ? (
            <span
              className={cn(
                "inline-flex items-center gap-2",
                showPlaceholder ? "text-muted-foreground" : "text-inherit",
                enabled
                  ? "rounded-md outline outline-1 outline-dashed outline-transparent hover:outline-primary/40 transition"
                  : "",
                displayClassName
              )}
              style={textStyle}
            >
              {displayValue || placeholder || ""}
            </span>
          ) : null}
          {enabled && !isHidden ? (
            <>
              <span
                className="hidden lg:inline-flex absolute top-1/2 z-20 -translate-y-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[10px] text-white shadow-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                style={{ right: "100%", marginRight: "0.5rem" }}
              >
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={() => {
                    setIsEditing(true);
                    setDraft(normalizedValue || fallback || "");
                  }}
                  title="تعديل"
                  disabled={upsertMutation.isPending}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/50 hover:bg-black/70 transition"
                  onClick={handleToggleHidden}
                  title={isHidden ? "إظهار النص" : "إخفاء النص"}
                  disabled={upsertMutation.isPending}
                >
                  {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </span>
              <span className="lg:hidden mt-2 inline-flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2 py-1">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background hover:bg-accent transition"
                  onClick={() => {
                    setIsEditing(true);
                    setDraft(normalizedValue || fallback || "");
                  }}
                  title="تعديل"
                  disabled={upsertMutation.isPending}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background hover:bg-accent transition"
                  onClick={handleToggleHidden}
                  title={isHidden ? "إظهار النص" : "إخفاء النص"}
                  disabled={upsertMutation.isPending}
                >
                  {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </span>
            </>
          ) : null}
        </>
      )}
      <ConfirmDialog />
    </span>
  );
}

type EditableLinkIconProps = {
  value?: string | null;
  fallback?: string;
  placeholder?: string;
  fieldKey: string;
  label: string;
  ariaLabel?: string;
  className?: string;
  linkClassName?: string;
  editorClassName?: string;
  formatHref?: (value: string) => string;
  target?: string;
  rel?: string;
  showEditButton?: boolean;
  editButtonClassName?: string;
  hideWhenDisabled?: boolean;
  allowEdit?: boolean;
  children: ReactNode;
};

export function EditableLinkIcon({
  value,
  fallback,
  placeholder,
  fieldKey,
  label,
  ariaLabel,
  className,
  linkClassName,
  editorClassName,
  formatHref,
  target,
  rel,
  showEditButton = true,
  editButtonClassName,
  hideWhenDisabled = false,
  allowEdit = true,
  children,
}: EditableLinkIconProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();

  const normalizedValue = value ?? "";
  const displayValue = normalizedValue || fallback || "";

  useEffect(() => {
    if (isEditing) return;
    setDraft(normalizedValue);
  }, [normalizedValue, isEditing]);

  const upsertMutation = trpc.contactInfo.upsert.useMutation({
    onMutate: (input) => {
      const prev = normalizedValue ?? "";
      return {
        action: {
          kind: "contactInfo" as const,
          key: input.key,
          prev,
          next: input.value,
          label: input.label ?? label,
        },
      };
    },
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prev !== ctx.action.next) {
        pushEdit(ctx.action);
      }
      toast.success("تم تحديث الرابط");
      utils.contactInfo.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteContactUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!enabled || upsertMutation.isPending) return;
    if (draft === normalizedValue) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          value: draft,
          label,
        });
      },
    });
  };

  const handleCancel = () => {
    setDraft(normalizedValue);
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleSave();
    }
  };

  const canEdit = enabled && allowEdit;

  if ((!enabled && hideWhenDisabled) || (!enabled && !displayValue)) return null;

  const hrefValue = displayValue ? (formatHref ? formatHref(displayValue) : displayValue) : "#";
  const linkTarget = target ?? "_blank";
  const linkRel = rel ?? (linkTarget === "_blank" ? "noreferrer" : undefined);

  return (
    <div className={cn("relative inline-flex items-center gap-2 group", className)}>
      <a
        href={hrefValue}
        target={linkTarget}
        rel={linkRel}
        aria-label={ariaLabel}
        className={linkClassName}
        onClick={(event) => {
          if (!canEdit || showEditButton) return;
          event.preventDefault();
          event.stopPropagation();
          setIsEditing(true);
          setDraft(displayValue);
        }}
      >
        {children}
      </a>
      {canEdit && !showEditButton && (
        <span className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
          <Pencil className="w-3 h-3" />
          تعديل
        </span>
      )}
      {canEdit && showEditButton && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing(true);
            setDraft(displayValue);
          }}
          className={cn(
            "absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full border border-white/20 bg-black/60 text-white text-[11px] px-2 py-1 opacity-100 md:opacity-0 transition md:group-hover:opacity-100 hover:bg-black/70",
            editButtonClassName
          )}
          aria-label={`تعديل ${label}`}
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {canEdit && isEditing && (
        <div className="absolute top-full right-0 mt-2 z-30 w-64 rounded-xl border border-white/15 bg-background p-3 text-right shadow-xl">
          <div className="text-xs font-semibold mb-2">{label}</div>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "الرابط"}
            className={cn("mb-2", editorClassName)}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Check className="w-4 h-4 ml-2" />
              )}
              حفظ
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

type EditableImageProps = {
  src: string;
  alt?: string;
  fieldKey: string;
  label: string;
  category: string;
  className?: string;
  imgClassName?: string;
  overlayClassName?: string;
};

export function EditableImage({
  src,
  alt = "",
  fieldKey,
  label,
  category,
  className,
  imgClassName,
  overlayClassName,
}: EditableImageProps) {
  const { enabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(src);
  const { requestConfirm, ConfirmDialog } = useInlineConfirm();
  const imagePositions = useSiteImagePositions();
  const position = imagePositions[fieldKey];
  const hasOffset = Boolean(position?.offsetX || position?.offsetY);
  const positionStyle = hasOffset
    ? {
        transform: `translate(${position?.offsetX ?? 0}px, ${position?.offsetY ?? 0}px)`,
      }
    : undefined;
  const [offsetDraft, setOffsetDraft] = useState({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (isEditing) return;
    const nextOffsetX = position?.offsetX ?? 0;
    const nextOffsetY = position?.offsetY ?? 0;
    setDraftUrl((prev) => (prev === src ? prev : src));
    setOffsetDraft((prev) =>
      prev.offsetX === nextOffsetX && prev.offsetY === nextOffsetY
        ? prev
        : { offsetX: nextOffsetX, offsetY: nextOffsetY }
    );
  }, [src, position?.offsetX, position?.offsetY, isEditing]);

  const upsertMutation = trpc.siteImages.upsert.useMutation({
    onMutate: (input) => ({
      action: {
        kind: "siteImage" as const,
        key: input.key,
        prevUrl: src,
        nextUrl: input.url,
        alt: input.alt,
        category: input.category,
        label,
      },
    }),
    onSuccess: (_data, _input, ctx) => {
      if (ctx?.action && ctx.action.prevUrl !== ctx.action.nextUrl) {
        pushEdit(ctx.action);
      }
      toast.success("تم تحديث الصورة");
      utils.siteImages.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteImagesUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const uploadMutation = trpc.siteImages.upload.useMutation({
    onSuccess: (data) => {
      const nextUrl = data?.url ?? src;
      if (nextUrl && nextUrl !== src) {
        pushEdit({
          kind: "siteImage",
          key: fieldKey,
          prevUrl: src,
          nextUrl,
          alt,
          category,
          label,
        });
      }
      toast.success("تم رفع الصورة");
      utils.siteImages.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("siteImagesUpdatedAt", String(Date.now()));
      }
      setIsEditing(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveUrl = () => {
    if (!enabled || upsertMutation.isPending) return;
    const urlChanged = draftUrl !== src;
    const offsetChanged =
      offsetDraft.offsetX !== (position?.offsetX ?? 0) ||
      offsetDraft.offsetY !== (position?.offsetY ?? 0);
    if (!urlChanged && !offsetChanged) {
      setIsEditing(false);
      return;
    }
    requestConfirm({
      onConfirm: () => {
        upsertMutation.mutate({
          key: fieldKey,
          url: draftUrl,
          alt,
          category,
          offsetX: offsetDraft.offsetX,
          offsetY: offsetDraft.offsetY,
        });
      },
    });
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    requestConfirm({
      title: "تأكيد رفع الصورة",
      description: "هل تريد رفع الصورة وحفظ التعديل الآن؟",
      confirmLabel: "رفع وحفظ",
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1] ?? "";
          if (!base64) {
            toast.error("تعذر قراءة الصورة");
            return;
          }
          uploadMutation.mutate({
            key: fieldKey,
            base64,
            mimeType: file.type,
            alt,
            category,
            offsetX: offsetDraft.offsetX,
            offsetY: offsetDraft.offsetY,
          });
        };
        reader.readAsDataURL(file);
      },
    });
  };

  return (
    <div className={cn("relative group", className)} style={positionStyle}>
      <img src={src} alt={alt} className={imgClassName} />
      {enabled && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsEditing((prev) => !prev);
          }}
          className={cn(
            "absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white opacity-100 md:opacity-0 transition md:group-hover:opacity-100",
            overlayClassName
          )}
        >
          <ImageIcon className="w-3 h-3" />
          تعديل الصورة
        </button>
      )}

      {enabled && isEditing && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-background p-4 text-right shadow-xl">
            <div className="text-sm font-semibold mb-2">{label}</div>
            <Input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="رابط الصورة"
              className="mb-3"
            />
            <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  الموضع (px)
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={offsetDraft.offsetX}
                    onChange={(e) =>
                      setOffsetDraft({
                        offsetX: Number(e.target.value) || 0,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                    className="h-8 w-20 text-xs"
                    dir="ltr"
                    placeholder="X"
                  />
                  <Input
                    type="number"
                    value={offsetDraft.offsetY}
                    onChange={(e) =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: Number(e.target.value) || 0,
                      })
                    }
                    className="h-8 w-20 text-xs"
                    dir="ltr"
                    placeholder="Y"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: offsetDraft.offsetY - 10,
                      })
                    }
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX + 10,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX - 10,
                        offsetY: offsetDraft.offsetY,
                      })
                    }
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setOffsetDraft({
                        offsetX: offsetDraft.offsetX,
                        offsetY: offsetDraft.offsetY + 10,
                      })
                    }
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setOffsetDraft({ offsetX: 0, offsetY: 0 })}
                >
                  تصفير الموضع
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Upload className="w-3 h-3" />
                رفع صورة جديدة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveUrl}
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Check className="w-4 h-4 ml-2" />
                  )}
                  حفظ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="w-4 h-4 ml-2" />
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

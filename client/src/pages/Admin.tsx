import { useState, useEffect, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Image, 
  Package, 
  MessageSquare, 
  Upload,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Home,
  Monitor,
  Link2,
  Clock,
  Copy,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  Undo2,
  Redo2,
  Pencil,
  ShieldCheck,
  Phone,
  Camera,
  Heart,
  HelpCircle,
  Receipt,
  PlusCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";
import { Link } from "wouter";
import {
  sessionPackages,
  sessionPackagesWithPrints,
  weddingPackages,
  additionalServices,
} from "@/config/siteConfig";
import { pushEdit, useEditHistory, type EditAction } from "@/lib/editHistory";
import { PackageCard } from "@/pages/Services";
import { servicesStyles } from "@/styles/servicesStyles";
import { parseContentValue, serializeContentValue } from "@/lib/contentMeta";
import { buildContentCatalog } from "@/lib/contentCatalog";
import { useTestimonialsData } from "@/hooks/useSiteData";
import { isExplicitlyHidden, isExplicitlyVisible } from "@/lib/visibility";

export default function Admin() {
  const utils = trpc.useUtils();
  const statusQuery = trpc.adminAccess.status.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const loginMutation = trpc.adminAccess.login.useMutation({
    onSuccess: () => {
      utils.adminAccess.status.invalidate();
      toast.success("تم تسجيل الدخول");
    },
    onError: (error) => toast.error(error.message),
  });
  const logoutMutation = trpc.adminAccess.logout.useMutation({
    onSuccess: () => {
      utils.adminAccess.status.invalidate();
      toast.success("تم تسجيل الخروج");
    },
    onError: (error) => toast.error(error.message),
  });

  if (statusQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!statusQuery.data?.authenticated) {
    return (
      <AdminLogin
        isLoading={loginMutation.isPending}
        loginDisabled={statusQuery.data?.loginDisabled}
        envIssues={statusQuery.data?.envIssues}
        onSubmit={(username, password) => {
          loginMutation.mutate({ username, password });
        }}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={() => logoutMutation.mutate()}
      logoutPending={logoutMutation.isPending}
    />
  );
}

function AdminDashboard({
  onLogout,
  logoutPending,
}: {
  onLogout: () => void;
  logoutPending: boolean;
}) {
  const [largeText, setLargeText] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("adminLargeText") === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("adminLargeText", largeText ? "1" : "0");
  }, [largeText]);

  return (
    <div
      className="min-h-screen bg-background"
      dir="rtl"
      data-admin-panel
      data-admin-large={largeText ? "1" : "0"}
    >
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="text-xl font-bold">لوحة التحكم</h1>
            <span className="text-sm text-muted-foreground">مرحباً، المدير</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 ml-2" />
                الموقع
              </Button>
            </Link>
            <Button
              variant={largeText ? "secondary" : "outline"}
              size="sm"
              onClick={() => setLargeText((prev) => !prev)}
              className="hidden md:inline-flex"
            >
              {largeText ? "تصغير النص" : "تكبير النص"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              disabled={logoutPending}
            >
              {logoutPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <LogOut className="w-4 h-4 ml-2" />
              )}
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <LiveEditor largeText={largeText} setLargeText={setLargeText} />
      </main>
    </div>
  );
}

function AdminLogin({
  onSubmit,
  isLoading,
  loginDisabled,
  envIssues,
}: {
  onSubmit: (username: string, password: string) => void;
  isLoading: boolean;
  loginDisabled?: boolean;
  envIssues?: string[];
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showEnvDetails, setShowEnvDetails] = useState(false);
  const canSubmit = username.trim().length > 0 && password.length > 0;
  const showLockNotice = Boolean(loginDisabled);

  return (
    <div
      className="min-h-screen bg-background relative overflow-hidden"
      dir="rtl"
    >
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gradient-to-br from-amber-200/20 via-amber-100/10 to-transparent blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-0 right-[-120px] h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-300/10 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-2">
              <Sparkles className="w-3 h-3" />
              بوابة آمنة
            </Badge>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                لوحة تحكم الموقع
                <span className="block text-muted-foreground text-lg md:text-xl font-normal mt-2">
                  دخول مُخصّص للإدارة فقط مع حماية للجلسة.
                </span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                عشان نضمن إن أي تعديلات على المحتوى تتم بأمان، محتاجين تسجيل
                دخول سريع قبل المتابعة.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  جلسة محمية
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  الجلسة بتنتهي تلقائياً عشان الأمان، وتقدر تعمل خروج بضغطة واحدة.
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4 backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="w-4 h-4" />
                  دخول سريع
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  محتاج اسم مستخدم وكلمة مرور فقط بدون أي خطوات إضافية.
                </p>
              </div>
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto border-border/70 bg-card/70 shadow-xl shadow-black/10 backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                تسجيل الدخول
              </CardTitle>
              <CardDescription>
                أدخل بيانات الدخول للوصول إلى لوحة التحكم.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showLockNotice && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-destructive">
                      تسجيل الأدمن متوقف مؤقتًا
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowEnvDetails((prev) => !prev)}
                    >
                      {showEnvDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    لازم تضبط متغيرات البيئة في السيرفر علشان صفحة الأدمن تفتح.
                  </p>
                  {showEnvDetails && (
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="font-semibold text-foreground/80">النواقص الحالية:</div>
                      <ul className="list-disc pr-4 space-y-1">
                        {(envIssues?.length ? envIssues : ["ADMIN_USER/ADMIN_PASS", "JWT_SECRET"]).map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                      <div className="font-semibold text-foreground/80">المطلوب ضبطه:</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          ADMIN_USER
                        </span>
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          ADMIN_PASS
                        </span>
                        <span className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                          JWT_SECRET
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmit(username.trim(), password);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="admin-user">اسم المستخدم</Label>
                  <Input
                    id="admin-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-pass">كلمة المرور</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور"
                    autoComplete="current-password"
                  />
                </div>
                <Separator />
                <Button
                  className="w-full"
                  type="submit"
                  disabled={!canSubmit || isLoading || showLockNotice}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Lock className="w-4 h-4 ml-2" />
                  )}
                  دخول
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Portfolio Manager Component
// ============================================
type ManagerProps = {
  onRefresh?: () => void;
};

type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
};

function useConfirmDialog() {
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

type PositionValue = { offsetX: number; offsetY: number };

function toOffset(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function PositionControls({
  value,
  onChange,
  onSave,
  disabled,
  step = 10,
}: {
  value: PositionValue;
  onChange: (next: PositionValue) => void;
  onSave: () => void;
  disabled?: boolean;
  step?: number;
}) {
  const applyDelta = (dx: number, dy: number) => {
    onChange({ offsetX: value.offsetX + dx, offsetY: value.offsetY + dy });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Move className="w-3 h-3" />
          الموضع (px)
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value.offsetX}
            onChange={(e) => onChange({ offsetX: Number(e.target.value) || 0, offsetY: value.offsetY })}
            className="h-8 w-20 text-xs"
            dir="ltr"
            placeholder="X"
          />
          <Input
            type="number"
            value={value.offsetY}
            onChange={(e) => onChange({ offsetX: value.offsetX, offsetY: Number(e.target.value) || 0 })}
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
            disabled={disabled}
            onClick={() => applyDelta(0, -step)}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(step, 0)}
          >
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(-step, 0)}
          >
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => applyDelta(0, step)}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" type="button" onClick={onSave} disabled={disabled}>
          حفظ الموضع
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => onChange({ offsetX: 0, offsetY: 0 })}
          disabled={disabled}
        >
          تصفير الموضع
        </Button>
      </div>
    </div>
  );
}

function PortfolioManager({ onRefresh }: ManagerProps) {
  const { data: images, refetch, isLoading } = trpc.portfolio.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.portfolio.upload.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الصورة بنجاح");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.portfolio.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصورة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الصورة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newImage, setNewImage] = useState({ title: "", category: "wedding", file: null as File | null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        title: string;
        category: string;
        url: string;
        visible: boolean;
        sortOrder: number;
        offsetX: number;
        offsetY: number;
      }
    >
  >({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage({ ...newImage, file });
    }
  };

  const handleUpload = async () => {
    if (!newImage.file || !newImage.title) {
      toast.error("يرجى إدخال العنوان واختيار صورة");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await createMutation.mutateAsync({
        title: newImage.title,
        base64,
        mimeType: newImage.file!.type,
        category: newImage.category,
      });
      setNewImage({ title: "", category: "wedding", file: null });
    };
    reader.readAsDataURL(newImage.file);
  };

  const openEdit = (image: any) => {
    setEditingId(image.id);
    setDrafts((prev) => ({
      ...prev,
      [image.id]: {
        title: image.title ?? "",
        category: image.category ?? "wedding",
        url: image.url ?? "",
        visible: isExplicitlyVisible(image.visible),
        sortOrder: Number.isFinite(image.sortOrder) ? Number(image.sortOrder) : 0,
        offsetX: toOffset(image.offsetX),
        offsetY: toOffset(image.offsetY),
      },
    }));
  };

  const closeEdit = () => setEditingId(null);

  const handleUpdate = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.title || !draft.url) {
      toast.error("يرجى إدخال العنوان والرابط");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      title: draft.title,
      category: draft.category,
      url: draft.url,
      visible: draft.visible,
      sortOrder: draft.sortOrder,
      offsetX: draft.offsetX,
      offsetY: draft.offsetY,
    });
    closeEdit();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const visibleImages = (images ?? []).filter((img) => isExplicitlyVisible(img.visible));
  const hiddenImages = (images ?? []).filter((img) => isExplicitlyHidden(img.visible));

  const toggleImageVisibility = async (id: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id, visible });
  };

  const renderImageCard = (image: any) => {
    const draft = drafts[image.id];
    const isEditing = editingId === image.id;
    const isVisible = isExplicitlyVisible(image.visible);
    return (
      <div key={image.id} className="border border-white/10 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4">
            <img
              src={image.url}
              alt={image.title}
              className="w-16 h-16 rounded-md object-cover border border-white/10"
            />
            <div>
              <div className="font-semibold">{image.title}</div>
              <div className="text-xs text-muted-foreground">
                {image.category} • ترتيب {image.sortOrder ?? 0}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isVisible ? "secondary" : "outline"}>
              {isVisible ? "ظاهر" : "مخفي"}
            </Badge>
            {!isVisible ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleImageVisibility(image.id, true)}
                disabled={updateMutation.isPending}
              >
                استعادة
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => (isEditing ? closeEdit() : openEdit(image))}>
              {isEditing ? "إغلاق" : "تعديل"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                requestConfirm(
                  isVisible
                    ? {
                        title: "إخفاء الصورة",
                        description: `سيتم نقل صورة "${image.title}" إلى الصور المخفية ويمكن استعادتها لاحقًا.`,
                        confirmLabel: "إخفاء",
                        cancelLabel: "إلغاء",
                        onConfirm: () => toggleImageVisibility(image.id, false),
                      }
                    : {
                        title: "حذف الصورة",
                        description: `هل تريد حذف صورة "${image.title}" نهائيًا؟`,
                        confirmLabel: "حذف",
                        cancelLabel: "إلغاء",
                        onConfirm: () => deleteMutation.mutate({ id: image.id }),
                      }
                )
              }
            >
              {isVisible ? "حذف" : "حذف نهائي"}
            </Button>
          </div>
        </div>

        {isEditing && draft ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>عنوان الصورة</Label>
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, title: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>تصنيف الصورة</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={draft.category}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, category: e.target.value },
                  }))
                }
              >
                <option value="wedding">زفاف</option>
                <option value="engagement">خطوبة</option>
                <option value="outdoor">جلسات خارجية</option>
                <option value="portrait">بورتريه</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>رابط الصورة</Label>
              <Input
                value={draft.url}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, url: e.target.value },
                  }))
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>ترتيب الظهور</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, sortOrder: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="text-sm">إظهار الصورة</span>
              <Switch
                checked={draft.visible}
                onCheckedChange={(value) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, visible: Boolean(value) },
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <PositionControls
                value={{ offsetX: draft.offsetX, offsetY: draft.offsetY }}
                onChange={(next) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [image.id]: { ...draft, offsetX: next.offsetX, offsetY: next.offsetY },
                  }))
                }
                onSave={() => {
                  requestConfirm({
                    title: "تأكيد حفظ الموضع",
                    description: `حفظ موضع الصورة "${draft.title}"؟`,
                    onConfirm: async () => {
                      await updateMutation.mutateAsync({
                        id: image.id,
                        offsetX: draft.offsetX,
                        offsetY: draft.offsetY,
                      });
                    },
                  });
                }}
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button onClick={() => handleUpdate(image.id)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={closeEdit}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style>{servicesStyles}</style>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة صورة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="عنوان الصورة"
              value={newImage.title}
              onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newImage.category}
              onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
            >
              <option value="wedding">زفاف</option>
              <option value="engagement">خطوبة</option>
              <option value="outdoor">جلسات خارجية</option>
              <option value="portrait">بورتريه</option>
            </select>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <Button onClick={handleUpload} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
            رفع الصورة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            قائمة الأعمال
          </CardTitle>
          <CardDescription>عدّل عنوان الصورة، التصنيف، الرابط، والترتيب بسهولة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleImages.map(renderImageCard)}

          {visibleImages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد صور في المعرض بعد</p>
              <p className="text-sm">قم بإضافة صور جديدة من الأعلى</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            الصور المخفية
          </CardTitle>
          <CardDescription>استعد أي صورة مخفية بضغطة واحدة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hiddenImages.length > 0 ? (
            hiddenImages.map(renderImageCard)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد صور مخفية</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// About Manager Component
// ============================================
function AboutManager({ onRefresh }: ManagerProps) {
  const { data: content, refetch, isLoading } = trpc.siteContent.getAll.useQuery();
  const { data: images, refetch: refetchImages } = trpc.siteImages.getAll.useQuery();
  const upsertContentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التعديلات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const upsertImageMutation = trpc.siteImages.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الصورة");
      refetchImages();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();

  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingImages, setEditingImages] = useState<Record<string, string>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});
  const [editingImagePositions, setEditingImagePositions] = useState<Record<string, PositionValue>>({});

  useEffect(() => {
    if (content) {
      const map: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        map[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingContent(map);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content]);

  useEffect(() => {
    if (images) {
      const map: Record<string, string> = {};
      const positions: Record<string, PositionValue> = {};
      images.forEach((item) => {
        map[item.key] = item.url;
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingImages(map);
      setEditingImagePositions(positions);
    }
  }, [images]);

  const handleSave = async (key: string, label: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    const nextValue = serializeContentValue({
      text: editingContent[key] || "",
      hidden: editingMeta[key]?.hidden,
      scale: editingMeta[key]?.scale,
    });
    const prevValue = (content ?? []).find((item) => item.key === key)?.value ?? "";
    await upsertContentMutation.mutateAsync({
      key,
      value: nextValue,
      category: "about",
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
    if (prevValue !== nextValue) {
      pushEdit({
        kind: "siteContent",
        key,
        prev: prevValue,
        next: nextValue,
        category: "about",
        label,
      });
    }
  };

  const handleSaveImage = async (key: string, label: string) => {
    const pos = editingImagePositions[key] ?? { offsetX: 0, offsetY: 0 };
    const prevUrl = (images ?? []).find((item) => item.key === key)?.url ?? "";
    const nextUrl = editingImages[key] || "";
    await upsertImageMutation.mutateAsync({
      key,
      url: nextUrl,
      alt: label,
      category: "about",
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
    if (prevUrl !== nextUrl) {
      pushEdit({
        kind: "siteImage",
        key,
        prevUrl,
        nextUrl,
        alt: label,
        category: "about",
        label,
      });
    }
  };

  const groups = [
    {
      title: "الهيدر",
      items: [
        { key: "about_kicker", label: "الشريط العلوي", multiline: false },
        { key: "about_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_description", label: "الوصف الرئيسي", multiline: true },
        { key: "about_cta_primary", label: "زر احجز الآن", multiline: false },
        { key: "about_cta_secondary", label: "زر الأسعار والباقات", multiline: false },
      ],
    },
    {
      title: "قسم القصة",
      items: [
        { key: "about_subtitle", label: "العنوان الفرعي", multiline: false },
        { key: "about_story_title", label: "عنوان القصة", multiline: false },
        { key: "about_story_description", label: "وصف القصة", multiline: true },
      ],
    },
    {
      title: "الإحصائيات",
      items: [
        { key: "about_stat_1_number", label: "رقم الإحصائية 1", multiline: false },
        { key: "about_stat_1_label", label: "عنوان الإحصائية 1", multiline: false },
        { key: "about_stat_2_number", label: "رقم الإحصائية 2", multiline: false },
        { key: "about_stat_2_label", label: "عنوان الإحصائية 2", multiline: false },
        { key: "about_stat_3_number", label: "رقم الإحصائية 3", multiline: false },
        { key: "about_stat_3_label", label: "عنوان الإحصائية 3", multiline: false },
      ],
    },
    {
      title: "زر المعرض",
      items: [{ key: "about_portfolio_link", label: "نص زر المعرض", multiline: false }],
    },
    {
      title: "قسم المميزات",
      items: [
        { key: "about_features_kicker", label: "العنوان الصغير", multiline: false },
        { key: "about_features_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_features_desc", label: "الوصف", multiline: true },
        { key: "about_feature_1_title", label: "ميزة 1 - عنوان", multiline: false },
        { key: "about_feature_1_desc", label: "ميزة 1 - وصف", multiline: true },
        { key: "about_feature_2_title", label: "ميزة 2 - عنوان", multiline: false },
        { key: "about_feature_2_desc", label: "ميزة 2 - وصف", multiline: true },
        { key: "about_feature_3_title", label: "ميزة 3 - عنوان", multiline: false },
        { key: "about_feature_3_desc", label: "ميزة 3 - وصف", multiline: true },
      ],
    },
    {
      title: "آراء العملاء",
      items: [
        { key: "about_testimonials_kicker", label: "العنوان الصغير", multiline: false },
        { key: "about_testimonials_title", label: "العنوان الرئيسي", multiline: false },
        { key: "about_testimonial_1_quote", label: "رأي 1 - النص", multiline: true },
        { key: "about_testimonial_1_name", label: "رأي 1 - الاسم", multiline: false },
        { key: "about_testimonial_2_quote", label: "رأي 2 - النص", multiline: true },
        { key: "about_testimonial_2_name", label: "رأي 2 - الاسم", multiline: false },
      ],
    },
    {
      title: "دعوة للتواصل",
      items: [
        { key: "about_cta_title", label: "العنوان", multiline: true },
        { key: "about_cta_desc", label: "الوصف", multiline: true },
        { key: "about_cta_primary_contact", label: "زر تواصل الآن", multiline: false },
        { key: "about_cta_secondary_packages", label: "زر شوف الباقات", multiline: false },
      ],
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>صفحة من أنا</CardTitle>
          <CardDescription>تعديل محتوى صفحة من أنا بالكامل من هنا.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>صورة من أنا</Label>
            <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center">
              <Input
                value={editingImages.aboutImage || ""}
                onChange={(e) => setEditingImages({ ...editingImages, aboutImage: e.target.value })}
                placeholder="رابط الصورة"
                dir="ltr"
              />
              <Button
                size="icon"
                onClick={() => handleSaveImage("aboutImage", "صورة من أنا")}
                disabled={upsertImageMutation.isPending}
              >
                <Save className="w-4 h-4" />
              </Button>
            </div>
            <PositionControls
              value={editingImagePositions.aboutImage ?? { offsetX: 0, offsetY: 0 }}
              onChange={(next) =>
                setEditingImagePositions((prev) => ({ ...prev, aboutImage: next }))
              }
              onSave={() =>
                requestConfirm({
                  title: "تأكيد حفظ الموضع",
                  description: "حفظ موضع صورة من أنا؟",
                  onConfirm: () => handleSaveImage("aboutImage", "صورة من أنا"),
                })
              }
              disabled={upsertImageMutation.isPending}
            />
          </div>

          {groups.map((group, idx) => (
            <div key={group.title} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold">{group.title}</h4>
                {idx > 0 ? <Separator className="flex-1" /> : null}
              </div>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center">
                      {item.multiline ? (
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                        />
                      )}
                      <Button
                        size="icon"
                        onClick={() => handleSave(item.key, item.label)}
                        disabled={upsertContentMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <PositionControls
                      value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                      onChange={(next) =>
                        setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                      }
                      onSave={() =>
                        requestConfirm({
                          title: "تأكيد حفظ الموضع",
                          description: `حفظ موضع "${item.label}"؟`,
                          onConfirm: () => handleSave(item.key, item.label),
                        })
                      }
                      disabled={upsertContentMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Content Manager Component
// ============================================
function ContentManager({
  onRefresh,
  searchSeed,
  searchText,
}: ManagerProps & { searchSeed?: number; searchText?: string }) {
  const { data: content, refetch, isLoading } = trpc.siteContent.getAll.useQuery();
  const { data: packagesData } = trpc.packages.getAll.useQuery();
  const testimonials = useTestimonialsData();
  const upsertMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();

  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});

  const fallbackPackages = useMemo(
    () => [
      ...sessionPackages.map((pkg) => ({ ...pkg, category: "session" })),
      ...sessionPackagesWithPrints.map((pkg) => ({ ...pkg, category: "prints" })),
      ...weddingPackages.map((pkg) => ({ ...pkg, category: "wedding" })),
      ...additionalServices.map((pkg) => ({ ...pkg, category: "addon" })),
    ],
    []
  );

  const packageList = useMemo(() => {
    if (packagesData && packagesData.length) return packagesData as any[];
    return fallbackPackages;
  }, [packagesData, fallbackPackages]);

  const catalog = useMemo(
    () => buildContentCatalog({ packages: packageList, testimonials }),
    [packageList, testimonials]
  );

  useEffect(() => {
    if (content) {
      const contentMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contentMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      const mergedContent = { ...catalog.fallbackMap, ...contentMap };
      setEditingContent(mergedContent);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content, catalog.fallbackMap]);

  const handleSave = async (key: string, category: string, label?: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    const nextValue = serializeContentValue({
      text: editingContent[key] || "",
      hidden: editingMeta[key]?.hidden,
      scale: editingMeta[key]?.scale,
    });
    const prevValue = (content ?? []).find((item) => item.key === key)?.value ?? "";
    await upsertMutation.mutateAsync({
      key,
      value: nextValue,
      category,
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
    if (prevValue !== nextValue) {
      pushEdit({
        kind: "siteContent",
        key,
        prev: prevValue,
        next: nextValue,
        category,
        label: label ?? key,
      });
    }
  };


  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if (!searchText) return;
    setSearchTerm(searchText);
  }, [searchSeed]);
  const handleCopyKey = async (key: string) => {
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(key);
      toast.success("تم نسخ المفتاح");
    } catch {
      toast.error("تعذر نسخ المفتاح");
    }
  };

  const handleResetToDefault = (key: string) => {
    const fallback = catalog.fallbackMap[key] ?? "";
    setEditingContent((prev) => ({ ...prev, [key]: fallback }));
  };

  const categoryOrder = [
    "home",
    "services",
    "about",
    "contact",
    "portfolio",
    "share",
    "cta",
    "nav",
    "footer",
    "shared",
  ];
  const categoryLabels: Record<string, string> = {
    home: "الصفحة الرئيسية",
    services: "صفحة الخدمات",
    about: "صفحة من أنا",
    contact: "صفحة التواصل",
    portfolio: "صفحة الأعمال",
    share: "صفحة المشاركة",
    cta: "الدعوة للتواصل",
    nav: "القائمة العلوية",
    footer: "التذييل",
    shared: "نصوص عامة",
  };

  const items = useMemo(() => {
    const contentList = content ?? [];
    const metaByKey = new Map<string, { label?: string; category?: string }>();
    contentList.forEach((item: any) => {
      metaByKey.set(item.key, { label: item.label, category: item.category });
    });

    const catalogItems = catalog.items;
    const catalogKeys = new Set(catalogItems.map((item) => item.key));
    const extraItems = contentList
      .filter((item: any) => !catalogKeys.has(item.key))
      .map((item: any) => ({
        key: item.key,
        label: item.label ?? item.key,
        category: item.category ?? "shared",
      }));

    return [...catalogItems, ...extraItems].map((item) => {
      const meta = metaByKey.get(item.key);
      return {
        key: item.key,
        label: meta?.label ?? item.label ?? item.key,
        category: meta?.category ?? item.category ?? "shared",
      };
    });
  }, [content, catalog.items]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!normalizedSearch) return true;
    const value = (editingContent[item.key] ?? catalog.fallbackMap[item.key] ?? "").toLowerCase();
    return (
      item.key.toLowerCase().includes(normalizedSearch) ||
      item.label.toLowerCase().includes(normalizedSearch) ||
      value.includes(normalizedSearch)
    );
  });

  const groupedItems = useMemo(() => {
    const buckets: Record<string, typeof filteredItems> = {};
    filteredItems.forEach((item) => {
      if (!buckets[item.category]) buckets[item.category] = [];
      buckets[item.category].push(item);
    });
    const extra = Object.keys(buckets).filter((key) => !categoryOrder.includes(key)).sort();
    const ordered = [...categoryOrder, ...extra];
    return ordered
      .filter((key) => buckets[key]?.length)
      .map((key) => ({
        key,
        label: categoryLabels[key] ?? key,
        items: buckets[key].sort((a, b) => a.label.localeCompare(b.label, "ar")),
      }));
  }, [filteredItems, categoryOrder, categoryLabels]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تعديل النصوص</CardTitle>
          <CardDescription>كل نصوص الموقع المسجلة في خانات قابلة للتعديل والحفظ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالكلمة داخل النص أو بالاسم أو المفتاح..."
              className="w-full sm:max-w-sm"
            />
            <Badge variant="secondary" className="text-xs">
              {filteredItems.length} نص
            </Badge>
          </div>

          {groupedItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              لا توجد نصوص مطابقة للبحث الحالي.
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.key} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{group.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.key} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Label>{item.label}</Label>
                        <span className="text-xs text-muted-foreground break-all">{item.key}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="نسخ المفتاح"
                          onClick={() => handleCopyKey(item.key)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="استرجاع النص الافتراضي"
                          onClick={() => handleResetToDefault(item.key)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        {editingMeta[item.key]?.hidden ? (
                          <Badge variant="outline" className="text-[10px]">
                            مخفي
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center">
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          placeholder={item.label}
                          rows={2}
                        />
                        <Button
                          size="icon"
                          onClick={() => handleSave(item.key, item.category, item.label)}
                          disabled={upsertMutation.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                      <PositionControls
                        value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                        onChange={(next) =>
                          setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                        }
                        onSave={() =>
                          requestConfirm({
                            title: "تأكيد حفظ الموضع",
                            description: `حفظ موضع "${item.label}"؟`,
                            onConfirm: () => handleSave(item.key, item.category, item.label),
                          })
                        }
                        disabled={upsertMutation.isPending}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Hidden Edits Manager Component
// ============================================
function HiddenEditsManager({ onRefresh }: ManagerProps) {
  const { data: content, refetch, isLoading } = trpc.siteContent.getAll.useQuery();
  const { data: packagesData } = trpc.packages.getAll.useQuery();
  const { data: packageHistory } = trpc.packages.history.getAll.useQuery();
  const testimonials = useTestimonialsData();
  const utils = trpc.useUtils();
  const packagesById = useMemo(() => {
    const map = new Map<string, string>();
    const list = (packagesData ?? []) as any[];
    list.forEach((pkg) => {
      if (pkg?.id != null) {
        map.set(String(pkg.id), String(pkg.name ?? `الباقة ${pkg.id}`));
      }
    });
    return map;
  }, [packagesData]);
  const upsertMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const [bulkPackageRestoring, setBulkPackageRestoring] = useState(false);
  const packageUpdateMutation = trpc.packages.update.useMutation({
    onSuccess: () => {
      if (!bulkPackageRestoring) {
        toast.success("تم تحديث الباقة");
      }
      utils.packages.getAll.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const restoreHistoryMutation = trpc.packages.history.restore.useMutation({
    onSuccess: () => {
      toast.success("تم استعادة النسخة");
      utils.packages.getAll.invalidate();
      utils.packages.history.getAll.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const clearHistoryMutation = trpc.packages.history.clear.useMutation({
    onSuccess: () => {
      toast.success("تم تفريغ سجل الباقات");
      utils.packages.history.getAll.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const snapshotHistoryMutation = trpc.packages.history.snapshot.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء لقطة حالية للباقات");
      utils.packages.history.getAll.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const deleteMutation = trpc.siteContent.delete.useMutation({
    onSuccess: () => {
      if (bulkDeleting) return;
      toast.success("تم حذف النص");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();

  const [filterStatus, setFilterStatus] = useState<"all" | "hidden" | "cleared">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fallbackPackages = useMemo(
    () => [
      ...sessionPackages.map((pkg) => ({ ...pkg, category: "session" })),
      ...sessionPackagesWithPrints.map((pkg) => ({ ...pkg, category: "prints" })),
      ...weddingPackages.map((pkg) => ({ ...pkg, category: "wedding" })),
      ...additionalServices.map((pkg) => ({ ...pkg, category: "addon" })),
    ],
    []
  );

  const packageList = useMemo(() => {
    if (packagesData && packagesData.length) return packagesData as any[];
    return fallbackPackages;
  }, [packagesData, fallbackPackages]);

  const defaultPackagesByName = useMemo(() => {
    const map = new Map<string, any>();
    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    fallbackPackages.forEach((pkg) => {
      if (!pkg?.name) return;
      map.set(normalize(String(pkg.name)), pkg);
    });
    return { map, normalize };
  }, [fallbackPackages]);

  const catalog = useMemo(
    () => buildContentCatalog({ packages: packageList, testimonials }),
    [packageList, testimonials]
  );

  const items = useMemo(() => {
    const contentList = content ?? [];
    const metaByKey = new Map<string, { label?: string; category?: string }>();
    contentList.forEach((item: any) => {
      metaByKey.set(item.key, { label: item.label, category: item.category });
    });

    const catalogItems = catalog.items;
    const catalogKeys = new Set(catalogItems.map((item) => item.key));
    const extraItems = contentList
      .filter((item: any) => !catalogKeys.has(item.key))
      .map((item: any) => ({
        key: item.key,
        label: item.label ?? item.key,
        category: item.category ?? "shared",
      }));

    return [...catalogItems, ...extraItems].map((item) => {
      const meta = metaByKey.get(item.key);
      return {
        key: item.key,
        label: meta?.label ?? item.label ?? item.key,
        category: meta?.category ?? item.category ?? "shared",
      };
    });
  }, [content, catalog.items]);

  const contentState = useMemo(() => {
    const map = new Map<string, { text: string; hidden: boolean; raw: string }>();
    (content ?? []).forEach((item: any) => {
      const parsed = parseContentValue(item.value);
      map.set(item.key, { text: parsed.text, hidden: parsed.hidden, raw: parsed.raw });
    });
    return map;
  }, [content]);

  const hiddenItems = items.filter((item) => contentState.get(item.key)?.hidden);
  const clearedItems = items.filter((item) => {
    const state = contentState.get(item.key);
    if (!state) return false;
    if (state.hidden) return false;
    const text = (state.text ?? "").trim();
    if (text.length) return false;
    const fallback = (catalog.fallbackMap[item.key] ?? "").trim();
    return fallback.length > 0;
  });

  const flaggedItems = [
    ...hiddenItems.map((item) => ({ ...item, status: "hidden" as const })),
    ...clearedItems.map((item) => ({ ...item, status: "cleared" as const })),
  ].sort((a, b) => a.label.localeCompare(b.label, "ar"));

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = flaggedItems.filter((item) => {
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (!normalizedSearch) return true;
    return (
      item.key.toLowerCase().includes(normalizedSearch) ||
      item.label.toLowerCase().includes(normalizedSearch)
    );
  });

  const parsePackageKey = (key: string) => {
    const featureMatch = key.match(/^package_(\d+)_feature_(\d+)$/);
    if (featureMatch) {
      return {
        id: featureMatch[1],
        field: "feature",
        line: Number(featureMatch[2]),
      };
    }
    const fieldMatch = key.match(
      /^package_(\d+)_(name|price|description|badge|price_note|popular_label|vip_label)$/
    );
    if (fieldMatch) {
      return {
        id: fieldMatch[1],
        field: fieldMatch[2],
        line: null as number | null,
      };
    }
    return null;
  };

  const packageFieldLabel = (field: string, line?: number | null) => {
    if (field === "feature") return `سطر ${line}`;
    if (field === "name") return "اسم الباقة";
    if (field === "price") return "سعر الباقة";
    if (field === "description") return "وصف الباقة";
    if (field === "badge") return "شارة الباقة";
    if (field === "price_note") return "ملاحظة السعر";
    if (field === "popular_label") return "شارة الأكثر طلبًا";
    if (field === "vip_label") return "شارة VIP";
    return "عنصر";
  };

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        title: string;
        kind: "package" | "generic";
        items: (typeof filtered)[number][];
        packageId?: string;
      }
    >();

    filtered.forEach((item) => {
      const pkg = parsePackageKey(item.key);
      if (pkg) {
        const packageName = packagesById.get(pkg.id) ?? `الباقة ${pkg.id}`;
        const groupId = `package:${pkg.id}`;
        const existing = groups.get(groupId);
        if (!existing) {
          groups.set(groupId, {
            id: groupId,
            title: `كارت ${packageName}`,
            kind: "package",
            items: [item],
            packageId: pkg.id,
          });
        } else {
          existing.items.push(item);
        }
      } else {
        const groupId = `generic:${item.key}`;
        groups.set(groupId, {
          id: groupId,
          title: item.label,
          kind: "generic",
          items: [item],
        });
      }
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.label.localeCompare(b.label, "ar")),
    }));
  }, [filtered, packagesById]);
  const allContentEdits = useMemo(() => flaggedItems, [flaggedItems]);
  const hiddenContentEdits = useMemo(
    () => hiddenItems.map((item) => ({ ...item, status: "hidden" as const })),
    [hiddenItems]
  );
  const clearedContentEdits = useMemo(
    () => clearedItems.map((item) => ({ ...item, status: "cleared" as const })),
    [clearedItems]
  );

  const resolveTextPreview = (key: string) => {
    const state = contentState.get(key);
    const currentText = (state?.text ?? "").trim();
    const fallbackText = (catalog.fallbackMap[key] ?? "").toString().trim();
    return {
      currentText,
      fallbackText,
      preview: currentText || fallbackText || "—",
    };
  };

  const handleDeleteContent = (key: string, label: string) => {
    requestConfirm({
      title: "حذف نهائي للنص",
      description: `هل تريد حذف "${label}" نهائيًا؟ سيعود للنص الافتراضي تلقائيًا.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      onConfirm: () => deleteMutation.mutateAsync({ key }),
    });
  };

  const runBulkDelete = async (
    list: Array<{ key: string }>,
    successMessage?: string
  ) => {
    setBulkDeleting(true);
    try {
      for (const item of list) {
        await deleteMutation.mutateAsync({ key: item.key });
      }
      if (successMessage) {
        toast.success(successMessage);
      }
      refetch();
      onRefresh?.();
    } finally {
      setBulkDeleting(false);
    }
  };

  const restoreAllDefaultPackages = async () => {
    if (!packageEdits.length) return;
    setBulkPackageRestoring(true);
    try {
      for (const pkg of packageEdits) {
        const fallbackPkg = defaultPackagesByName.map.get(
          defaultPackagesByName.normalize(pkg.name)
        );
        if (!fallbackPkg) continue;
        await restorePackageAll(pkg.id, fallbackPkg);
      }
      toast.success("تم استعادة كل الباقات الافتراضية");
      utils.packages.getAll.invalidate();
      onRefresh?.();
    } finally {
      setBulkPackageRestoring(false);
    }
  };

  const handleClearContentEdits = () => {
    if (!allContentEdits.length) {
      toast.info("لا توجد تعديلات لمسحها");
      return;
    }
    requestConfirm({
      title: "تفريغ التعديلات المخفية والمحذوفة",
      description:
        "سيتم حذف جميع التعديلات المخفية والمحذوفة نهائيًا والرجوع للنصوص الافتراضية.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: () => runBulkDelete(allContentEdits, "تم تفريغ التعديلات المخفية والمحذوفة"),
    });
  };

  const handleClearPackageHistoryOnly = () => {
    if (historyCount === 0) {
      toast.info("لا يوجد سجل تعديلات للباقات لمسحه");
      return;
    }
    requestConfirm({
      title: "تفريغ سجل تعديلات الباقات",
      description: "سيتم حذف كل سجل تغييرات الباقات نهائيًا مع الاحتفاظ بالقيم الحالية.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: () => clearHistoryMutation.mutate(),
    });
  };

  const handleClearAllEdits = () => {
    if (!allContentEdits.length && !packageEdits.length && historyCount === 0) {
      toast.info("لا توجد تعديلات لمسحها");
      return;
    }
    requestConfirm({
      title: "تفريغ كل التعديلات",
      description:
        "سيتم حذف كل التعديلات المخفية/المحذوفة، واستعادة الباقات الافتراضية، ومسح سجل الباقات بالكامل.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: async () => {
        if (allContentEdits.length) {
          await runBulkDelete(allContentEdits);
        }
        if (packageEdits.length) {
          await restoreAllDefaultPackages();
        }
        if (historyCount > 0) {
          await clearHistoryMutation.mutateAsync();
        }
        toast.success("تم تفريغ كل التعديلات");
        refetch();
        utils.packages.getAll.invalidate();
        utils.packages.history.getAll.invalidate();
        onRefresh?.();
      },
    });
  };

  const handleClearHiddenEdits = () => {
    if (!hiddenContentEdits.length) {
      toast.info("لا توجد تعديلات مخفية لمسحها");
      return;
    }
    requestConfirm({
      title: "تفريغ المخفي فقط",
      description: "سيتم حذف كل العناصر المخفية والرجوع للنصوص الافتراضية.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: () => runBulkDelete(hiddenContentEdits, "تم تفريغ التعديلات المخفية"),
    });
  };

  const handleClearClearedEdits = () => {
    if (!clearedContentEdits.length) {
      toast.info("لا توجد تعديلات محذوفة لمسحها");
      return;
    }
    requestConfirm({
      title: "تفريغ المحذوف فقط",
      description: "سيتم حذف كل العناصر المحذوفة والرجوع للنصوص الافتراضية.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: () => runBulkDelete(clearedContentEdits, "تم تفريغ التعديلات المحذوفة"),
    });
  };

  const handleRestore = async (
    key: string,
    category: string,
    label: string,
    status: "hidden" | "cleared"
  ) => {
    const entry = contentState.get(key);
    const currentText = entry?.text ?? "";
    const fallback = catalog.fallbackMap[key] ?? "";
    const nextText = status === "hidden" ? currentText : fallback;
    const nextValue = serializeContentValue({ text: nextText, hidden: false });
    await upsertMutation.mutateAsync({
      key,
      value: nextValue,
      category,
      label,
    });
  };

  const packageEdits = useMemo(() => {
    const diffs: Array<{
      id: number;
      name: string;
      changes: Array<{
        field: "price" | "description" | "features" | "badge" | "priceNote" | "popular";
        label: string;
        current: string;
        fallback: string;
      }>;
    }> = [];
    const normalize = defaultPackagesByName.normalize;
    const defaults = defaultPackagesByName.map;
    (packagesData ?? []).forEach((pkg: any) => {
      if (!pkg?.name) return;
      const baseline = defaults.get(normalize(String(pkg.name)));
      if (!baseline) return;
      const changes: Array<{
        field: "price" | "description" | "features" | "badge" | "priceNote" | "popular";
        label: string;
        current: string;
        fallback: string;
      }> = [];
      const currentPrice = String(pkg.price ?? "");
      const fallbackPrice = String(baseline.price ?? "");
      if (currentPrice !== fallbackPrice) {
        changes.push({
          field: "price",
          label: "السعر",
          current: currentPrice || "—",
          fallback: fallbackPrice || "—",
        });
      }
      const currentDesc = String(pkg.description ?? "");
      const fallbackDesc = String(baseline.description ?? "");
      if (currentDesc !== fallbackDesc) {
        changes.push({
          field: "description",
          label: "الوصف",
          current: currentDesc || "—",
          fallback: fallbackDesc || "—",
        });
      }
      const currentBadge = String(pkg.badge ?? "");
      const fallbackBadge = String(baseline.badge ?? "");
      if (currentBadge !== fallbackBadge) {
        changes.push({
          field: "badge",
          label: "شارة الباقة",
          current: currentBadge || "—",
          fallback: fallbackBadge || "—",
        });
      }
      const currentNote = String(pkg.priceNote ?? "");
      const fallbackNote = String(baseline.priceNote ?? "");
      if (currentNote !== fallbackNote) {
        changes.push({
          field: "priceNote",
          label: "ملاحظة السعر",
          current: currentNote || "—",
          fallback: fallbackNote || "—",
        });
      }
      const currentPopular = Boolean(pkg.popular);
      const fallbackPopular = Boolean(baseline.popular);
      if (currentPopular !== fallbackPopular) {
        changes.push({
          field: "popular",
          label: "الأكثر طلبًا",
          current: currentPopular ? "نعم" : "لا",
          fallback: fallbackPopular ? "نعم" : "لا",
        });
      }
      const currentFeatures = Array.isArray(pkg.features) ? pkg.features : [];
      const fallbackFeatures = Array.isArray(baseline.features) ? baseline.features : [];
      if (JSON.stringify(currentFeatures) !== JSON.stringify(fallbackFeatures)) {
        changes.push({
          field: "features",
          label: "المميزات",
          current: currentFeatures.length ? currentFeatures.join(" • ") : "—",
          fallback: fallbackFeatures.length ? fallbackFeatures.join(" • ") : "—",
        });
      }
      if (changes.length) {
        diffs.push({
          id: pkg.id,
          name: String(pkg.name),
          changes,
        });
      }
    });
    return diffs;
  }, [packagesData, defaultPackagesByName]);

  const packageHistoryGroups = useMemo(() => {
    const entries = (packageHistory ?? []).slice().sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt as any).getTime();
      const bTime = new Date(b.createdAt as any).getTime();
      return bTime - aTime;
    });
    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        entries: any[];
      }
    >();
    entries.forEach((entry: any) => {
      const id = String(entry.packageId ?? entry.snapshot?.id ?? "");
      const name =
        packagesById.get(id) ??
        entry.snapshot?.name ??
        `الباقة ${entry.packageId ?? ""}`;
      const existing = groups.get(id);
      if (!existing) {
        groups.set(id, { id, name, entries: [entry] });
      } else {
        existing.entries.push(entry);
      }
    });
    return Array.from(groups.values());
  }, [packageHistory, packagesById]);

  const historyCount = (packageHistory ?? []).length;
  const lastHistoryEntry = (packageHistory ?? [])
    .slice()
    .sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt as any).getTime();
      const bTime = new Date(b.createdAt as any).getTime();
      return bTime - aTime;
    })[0];

  const lastSnapshotEntry = (packageHistory ?? [])
    .filter((entry: any) => entry.action === "snapshot")
    .sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt as any).getTime();
      const bTime = new Date(b.createdAt as any).getTime();
      return bTime - aTime;
    })[0];

  const formatHistoryTime = (value: any) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("ar-EG");
    } catch {
      return String(value);
    }
  };

  const handleClearHistory = () => {
    requestConfirm({
      title: "تفريغ سجل الباقات",
      description: "سيتم حذف جميع السجلات نهائيًا ولا يمكن الرجوع عنها.",
      confirmLabel: "تفريغ",
      cancelLabel: "إلغاء",
      onConfirm: () => clearHistoryMutation.mutate(),
    });
  };

  const handleSnapshotHistory = () => {
    requestConfirm({
      title: "إنشاء لقطة حالية",
      description: "سيتم حفظ نسخة من كل الباقات الحالية في السجل.",
      confirmLabel: "إنشاء لقطة",
      cancelLabel: "إلغاء",
      onConfirm: () => snapshotHistoryMutation.mutate(),
    });
  };

  const diffPackageSnapshot = (current: any, previous?: any) => {
    if (!previous) return ["نسخة أولى أو نسخة بعد الحذف"];
    const lines: string[] = [];
    const compare = (label: string, curr: any, prev: any) => {
      const a = curr ?? "";
      const b = prev ?? "";
      if (String(a) !== String(b)) {
        lines.push(`${label}: ${b || "—"} → ${a || "—"}`);
      }
    };
    compare("الاسم", current?.name, previous?.name);
    compare("السعر", current?.price, previous?.price);
    compare("الوصف", current?.description, previous?.description);
    compare("شارة الباقة", current?.badge, previous?.badge);
    compare("ملاحظة السعر", current?.priceNote, previous?.priceNote);
    compare(
      "الأكثر طلبًا",
      current?.popular ? "نعم" : "لا",
      previous?.popular ? "نعم" : "لا"
    );
    const currFeatures = Array.isArray(current?.features) ? current.features : [];
    const prevFeatures = Array.isArray(previous?.features) ? previous.features : [];
    if (JSON.stringify(currFeatures) !== JSON.stringify(prevFeatures)) {
      lines.push(`المميزات: ${prevFeatures.length} → ${currFeatures.length}`);
    }
    return lines.length ? lines : ["بدون تغيير ظاهر"];
  };

  const restorePackageField = async (
    pkgId: number,
    field: "price" | "description" | "features" | "badge" | "priceNote" | "popular",
    fallbackPkg: any
  ) => {
    const payload: any = { id: pkgId };
    if (field === "price") payload.price = String(fallbackPkg.price ?? "");
    if (field === "description") payload.description = String(fallbackPkg.description ?? "");
    if (field === "badge") payload.badge = String(fallbackPkg.badge ?? "");
    if (field === "priceNote") payload.priceNote = String(fallbackPkg.priceNote ?? "");
    if (field === "popular") payload.popular = Boolean(fallbackPkg.popular);
    if (field === "features")
      payload.features = Array.isArray(fallbackPkg.features) ? fallbackPkg.features : [];
    await packageUpdateMutation.mutateAsync(payload);
  };

  const restorePackageAll = async (pkgId: number, fallbackPkg: any) => {
    await packageUpdateMutation.mutateAsync({
      id: pkgId,
      name: String(fallbackPkg.name ?? ""),
      price: String(fallbackPkg.price ?? ""),
      description: String(fallbackPkg.description ?? ""),
      badge: String(fallbackPkg.badge ?? ""),
      priceNote: String(fallbackPkg.priceNote ?? ""),
      popular: Boolean(fallbackPkg.popular),
      features: Array.isArray(fallbackPkg.features) ? fallbackPkg.features : [],
    });
  };

  const handleRestoreGroup = (group: (typeof grouped)[number]) => {
    requestConfirm({
      title: "استعادة الكارت بالكامل",
      description: `هل تريد استعادة كل تعديلات "${group.title}"؟`,
      confirmLabel: "استعادة",
      cancelLabel: "إلغاء",
      onConfirm: async () => {
        for (const item of group.items) {
          await handleRestore(item.key, item.category, item.label, item.status);
        }
      },
    });
  };

  const handleDeleteGroup = (group: (typeof grouped)[number]) => {
    requestConfirm({
      title: "حذف الكارت نهائيًا",
      description: `هل تريد حذف كل تعديلات "${group.title}" نهائيًا؟`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      onConfirm: async () => {
        for (const item of group.items) {
          await deleteMutation.mutateAsync({ key: item.key });
        }
      },
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5" />
              التعديلات المخفية والمحذوفة
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearHiddenEdits}
                disabled={deleteMutation.isPending || bulkDeleting}
              >
                تفريغ المخفي فقط
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearClearedEdits}
                disabled={deleteMutation.isPending || bulkDeleting}
              >
                تفريغ المحذوف فقط
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearPackageHistoryOnly}
                disabled={clearHistoryMutation.isPending}
              >
                تفريغ سجل الباقات
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearAllEdits}
                disabled={deleteMutation.isPending || bulkDeleting}
              >
                تفريغ الكل
              </Button>
            </div>
          </div>
          <CardDescription>
            استعد أي تعديل مخفي أو محذوف، أو احذفه نهائيًا ليعود للنص الافتراضي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو المفتاح..."
              className="w-full sm:max-w-sm"
            />
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="كل التعديلات" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">كل التعديلات</SelectItem>
                <SelectItem value="hidden">المخفية فقط</SelectItem>
                <SelectItem value="cleared">المحذوفة فقط</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {filtered.length} نتيجة
            </Badge>
          </div>

          {grouped.length > 0 ? (
            grouped.map((group) => (
              <div key={group.id} className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{group.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.items.length} تعديل
                    </div>
                  </div>
                  {group.kind === "package" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreGroup(group)}
                        disabled={upsertMutation.isPending || deleteMutation.isPending}
                      >
                        استعادة الكارت بالكامل
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteGroup(group)}
                        disabled={deleteMutation.isPending}
                      >
                        حذف الكارت نهائيًا
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => {
                    const pkg = parsePackageKey(item.key);
                    const fieldLabel = pkg
                      ? packageFieldLabel(pkg.field, pkg.line)
                      : item.label;
                    const textInfo = resolveTextPreview(item.key);
                    return (
                      <div
                        key={item.key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                      >
                        <div className="text-sm">
                          <div className="font-semibold">{fieldLabel}</div>
                          <div className="text-xs text-muted-foreground">{item.key}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            النص: {textInfo.preview}
                          </div>
                          <div className="mt-1">
                            <Badge
                              variant={item.status === "hidden" ? "outline" : "secondary"}
                              className="text-[10px]"
                            >
                              {item.status === "hidden" ? "مخفي" : "محذوف"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleRestore(item.key, item.category, item.label, item.status)
                            }
                            disabled={upsertMutation.isPending || deleteMutation.isPending}
                          >
                            استعادة
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteContent(item.key, item.label)}
                            disabled={deleteMutation.isPending}
                          >
                            حذف نهائي
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد تعديلات مخفية أو محذوفة</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            تعديلات الباقات
          </CardTitle>
          <CardDescription>
            يعرض تغييرات الباقات مقارنة بالنصوص الافتراضية (مثل السعر والوصف والمميزات).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {packageEdits.length > 0 ? (
            packageEdits.map((pkg) => {
              const fallbackPkg = defaultPackagesByName.map.get(
                defaultPackagesByName.normalize(pkg.name)
              );
              return (
                <div key={pkg.id} className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">كارت {pkg.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pkg.changes.length} تغيير
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restorePackageAll(pkg.id, fallbackPkg)}
                      disabled={packageUpdateMutation.isPending}
                    >
                      استعادة الكارت بالكامل
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {pkg.changes.map((change) => (
                      <div
                        key={change.field}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                      >
                        <div className="text-sm">
                          <div className="font-semibold">{change.label}</div>
                          <div className="text-xs text-muted-foreground">
                            الحالي: {change.current}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            الافتراضي: {change.fallback}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            restorePackageField(pkg.id, change.field, fallbackPkg)
                          }
                          disabled={packageUpdateMutation.isPending}
                        >
                          استعادة الحقل
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا توجد تغييرات على الباقات حالياً</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              سجل تغييرات الباقات
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  {historyCount} نسخة
                </Badge>
                <span>
                  آخر تعديل: {lastHistoryEntry ? formatHistoryTime(lastHistoryEntry.createdAt) : "—"}
                </span>
                <span>
                  آخر لقطة: {lastSnapshotEntry ? formatHistoryTime(lastSnapshotEntry.createdAt) : "—"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSnapshotHistory}
                disabled={snapshotHistoryMutation.isPending}
              >
                إنشاء لقطة حالية
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearHistory}
                disabled={clearHistoryMutation.isPending}
              >
                تفريغ السجل
              </Button>
            </div>
          </div>
          <CardDescription>
            كل تعديل محفوظ بتاريخ ونسخة يمكن الرجوع إليها.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {packageHistoryGroups.length > 0 ? (
            packageHistoryGroups.map((group) => (
              <div key={group.id} className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                <div className="text-sm font-semibold">كارت {group.name}</div>
                <div className="space-y-2">
                  {group.entries.map((entry: any, index: number) => {
                    const current = entry.snapshot ?? {};
                    const previous = group.entries[index + 1]?.snapshot;
                    const lines = diffPackageSnapshot(current, previous);
                    const actionLabel =
                      entry.action === "create"
                        ? "إنشاء"
                        : entry.action === "delete"
                        ? "حذف"
                        : entry.action === "restore"
                        ? "استعادة"
                        : entry.action === "snapshot"
                        ? "لقطة"
                        : "تعديل";
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2"
                      >
                        <div className="text-sm">
                          <div className="font-semibold">
                            {actionLabel} — {formatHistoryTime(entry.createdAt)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground space-y-1">
                            {lines.map((line, idx) => (
                              <div key={`${entry.id}-${idx}`}>{line}</div>
                            ))}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreHistoryMutation.mutate({ entryId: entry.id })}
                          disabled={restoreHistoryMutation.isPending}
                        >
                          استعادة هذه النسخة
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>لا يوجد سجل تغييرات للباقات بعد</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Packages Manager Component
// ============================================
function PackagesManager({ onRefresh }: ManagerProps) {
  const { data: packages, refetch, isLoading } = trpc.packages.getAll.useQuery();
  const { data: content } = trpc.siteContent.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.packages.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الباقة");
      refetch();
      onRefresh?.();
      setNewPackage({ name: "", price: "", description: "", category: "session", features: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.packages.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الباقة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.packages.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الباقة");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newPackage, setNewPackage] = useState({
    name: "",
    price: "",
    description: "",
    category: "session",
    features: "",
  });
  const [packageSearch, setPackageSearch] = useState("");
  const [packageCategoryFilter, setPackageCategoryFilter] = useState("all");
  const [seedBusy, setSeedBusy] = useState(false);
  const seedAttempted = useRef(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        name: string;
        price: string;
        description: string;
        category: string;
        features: string;
        popular: boolean;
        visible: boolean;
        sortOrder: number;
        offsetX: number;
        offsetY: number;
      }
    >
  >({});

  const handleCreate = async () => {
    if (!newPackage.name || !newPackage.price) {
      toast.error("يرجى إدخال اسم الباقة والسعر");
      return;
    }
    const maxSort = (packages ?? [])
      .filter((pkg: any) => (pkg?.category ?? "session") === newPackage.category)
      .reduce((acc, pkg: any) => {
        const value = Number(pkg?.sortOrder) || 0;
        return value > acc ? value : acc;
      }, 0);
    const nextSort = maxSort + 1;
    await createMutation.mutateAsync({
      name: newPackage.name,
      price: newPackage.price,
      description: newPackage.description,
      category: newPackage.category,
      features: newPackage.features.split("\n").filter(Boolean),
      sortOrder: nextSort,
    });
  };

  const seedDefaults = async () => {
    if (seedBusy) return;
    setSeedBusy(true);
    try {
      const defaults = [
        ...sessionPackages.map((p) => ({ ...p, category: "session" })),
        ...sessionPackagesWithPrints.map((p) => ({ ...p, category: "prints" })),
        ...weddingPackages.map((p) => ({ ...p, category: "wedding" })),
        ...additionalServices.map((p) => ({ ...p, category: "addon" })),
      ];
      let order = 1;
      for (const pkg of defaults) {
        await createMutation.mutateAsync({
          name: pkg.name,
          price: String(pkg.price ?? ""),
          description: pkg.description ?? "",
          features: Array.isArray(pkg.features) ? pkg.features : [],
          category: pkg.category as string,
          popular: Boolean(pkg.popular),
          visible: true,
          sortOrder: order,
        });
        order += 1;
      }
      toast.success("تم تجهيز الباقات الافتراضية");
      refetch();
      onRefresh?.();
    } catch (error: any) {
      toast.error(error?.message ?? "تعذر تجهيز الباقات");
    } finally {
      setSeedBusy(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (seedAttempted.current) return;
    if ((packages ?? []).length === 0) {
      seedAttempted.current = true;
      seedDefaults();
    }
  }, [isLoading, packages]);

  const openEdit = (pkg: any) => {
    setEditingId(pkg.id);
    setDrafts((prev) => ({
      ...prev,
      [pkg.id]: {
        name: pkg.name ?? "",
        price: pkg.price ?? "",
        description: pkg.description ?? "",
        category: pkg.category ?? "session",
        features: Array.isArray(pkg.features) ? pkg.features.join("\n") : "",
        popular: Boolean(pkg.popular),
        visible: isExplicitlyVisible(pkg.visible),
        sortOrder: Number.isFinite(pkg.sortOrder) ? Number(pkg.sortOrder) : 0,
        offsetX: toOffset(pkg.offsetX),
        offsetY: toOffset(pkg.offsetY),
      },
    }));
  };

  const closeEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.name || !draft.price) {
      toast.error("يرجى إدخال اسم الباقة والسعر");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      name: draft.name,
      price: draft.price,
      description: draft.description,
      category: draft.category,
      features: draft.features.split("\n").filter(Boolean),
      popular: draft.popular,
      visible: draft.visible,
      sortOrder: draft.sortOrder,
      offsetX: draft.offsetX,
      offsetY: draft.offsetY,
    });
    closeEdit();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const contentMap = (content ?? []).reduce<Record<string, string>>((acc, item: any) => {
    const parsed = parseContentValue(item.value);
    acc[item.key] = parsed.hidden ? "" : parsed.text;
    return acc;
  }, {});
  const categoryLabel: Record<string, string> = {
    session: contentMap.services_sessions_title || "جلسات التصوير",
    prints: contentMap.services_prints_title || "المطبوعات",
    wedding: contentMap.services_wedding_title || "Full Day",
    addon: contentMap.services_addons_title || "إضافات",
  };
  const visiblePackages = (packages ?? []).filter((pkg) => isExplicitlyVisible(pkg.visible));
  const hiddenPackages = (packages ?? []).filter((pkg) => isExplicitlyHidden(pkg.visible));
  const sortByOrder = (list: any[]) =>
    [...list].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  const categoryOrder = [
    { id: "session", label: categoryLabel.session },
    { id: "wedding", label: categoryLabel.wedding },
    { id: "addon", label: categoryLabel.addon },
    { id: "prints", label: categoryLabel.prints },
  ];
  const visibleByCategory = {
    session: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "session")),
    wedding: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "wedding")),
    addon: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "addon")),
    prints: sortByOrder(visiblePackages.filter((pkg) => pkg.category === "prints")),
  };
  const hiddenByCategory = {
    session: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "session")),
    wedding: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "wedding")),
    addon: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "addon")),
    prints: sortByOrder(hiddenPackages.filter((pkg) => pkg.category === "prints")),
  };

  const normalizedPackageSearch = packageSearch.trim().toLowerCase();
  const matchesPackageSearch = (pkg: any) => {
    if (!normalizedPackageSearch) return true;
    const haystack = `${pkg.name ?? ""} ${pkg.price ?? ""} ${pkg.description ?? ""}`.toLowerCase();
    return haystack.includes(normalizedPackageSearch);
  };
  const activeCategories =
    packageCategoryFilter === "all"
      ? categoryOrder
      : categoryOrder.filter((cat) => cat.id === packageCategoryFilter);
  const visibleListForCategory = (categoryId: string) =>
    ((visibleByCategory as any)[categoryId] ?? []).filter(matchesPackageSearch);
  const hiddenListForCategory = (categoryId: string) =>
    ((hiddenByCategory as any)[categoryId] ?? []).filter(matchesPackageSearch);
  const visibleFilteredCount = activeCategories.reduce(
    (sum, cat) => sum + visibleListForCategory(cat.id).length,
    0
  );
  const hiddenFilteredCount = activeCategories.reduce(
    (sum, cat) => sum + hiddenListForCategory(cat.id).length,
    0
  );

  const togglePackageVisibility = async (pkgId: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id: pkgId, visible });
  };

  const changePackageOrder = async (pkg: any, delta: number) => {
    const current = Number.isFinite(pkg.sortOrder) ? Number(pkg.sortOrder) : 0;
    const next = Math.max(0, current + delta);
    await updateMutation.mutateAsync({ id: pkg.id, sortOrder: next });
  };

  const renderPackageCard = (pkg: any) => {
    const draft = drafts[pkg.id];
    const isEditing = editingId === pkg.id;
    const isVisible = isExplicitlyVisible(pkg.visible);
    const previewKind =
      pkg.category === "wedding"
        ? "wedding"
        : pkg.category === "prints"
        ? "prints"
        : pkg.category === "addon"
        ? "addon"
        : "session";
    return (
      <div key={pkg.id} className="border border-white/10 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{pkg.name}</div>
            <div className="text-sm text-muted-foreground">
              {pkg.price} • {categoryLabel[pkg.category ?? "session"]} • ترتيب #{pkg.sortOrder ?? 0}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => changePackageOrder(pkg, -1)}
              disabled={updateMutation.isPending}
              title="تقديم"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => changePackageOrder(pkg, 1)}
              disabled={updateMutation.isPending}
              title="تأخير"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Badge variant={isVisible ? "secondary" : "outline"}>
              {isVisible ? "ظاهر" : "مخفي"}
            </Badge>
            {!isVisible ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePackageVisibility(pkg.id, true)}
                disabled={updateMutation.isPending}
              >
                استعادة
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => (isEditing ? closeEdit() : openEdit(pkg))}
            >
              {isEditing ? "إغلاق" : "تعديل"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                requestConfirm(
                  isVisible
                    ? {
                        title: "إخفاء الباقة",
                        description: `سيتم نقل الباقة "${pkg.name}" إلى الباقات المخفية ويمكن استعادتها لاحقًا.`,
                        confirmLabel: "إخفاء",
                        cancelLabel: "إلغاء",
                        onConfirm: () => togglePackageVisibility(pkg.id, false),
                      }
                    : {
                        title: "حذف الباقة",
                        description: `هل تريد حذف الباقة "${pkg.name}" نهائيًا؟`,
                        confirmLabel: "حذف",
                        cancelLabel: "إلغاء",
                        onConfirm: () => deleteMutation.mutate({ id: pkg.id }),
                      }
                )
              }
            >
              {isVisible ? "حذف" : "حذف نهائي"}
            </Button>
          </div>
        </div>

        {!isEditing ? (
          <div className="admin-package-preview">
            <PackageCard
              pkg={pkg as any}
              kind={previewKind as any}
              whatsappNumber={undefined}
              contentMap={contentMap}
            />
          </div>
        ) : null}

        {isEditing && draft ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الباقة</Label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>السعر</Label>
              <Input
                value={draft.price}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, price: e.target.value },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, category: e.target.value },
                  }))
                }
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="session">جلسات التصوير</option>
                <option value="prints">المطبوعات</option>
                <option value="wedding">Full Day</option>
                <option value="addon">إضافات</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>ترتيب الظهور</Label>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, sortOrder: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={draft.description}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, description: e.target.value },
                  }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المميزات (كل ميزة في سطر)</Label>
              <Textarea
                value={draft.features}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, features: e.target.value },
                  }))
                }
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: {
                        ...draft,
                        features: draft.features ? `${draft.features}\n` : "",
                      },
                    }))
                  }
                >
                  إضافة سطر
                </Button>
                <span className="text-xs text-muted-foreground">
                  كل سطر يظهر كبند داخل الكارت بنفس التصميم.
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">مميزة (Popular)</span>
                <Switch
                  checked={draft.popular}
                  onCheckedChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: { ...draft, popular: Boolean(value) },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">إظهار الباقة</span>
                <Switch
                  checked={draft.visible}
                  onCheckedChange={(value) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pkg.id]: { ...draft, visible: Boolean(value) },
                    }))
                  }
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <PositionControls
                value={{ offsetX: draft.offsetX, offsetY: draft.offsetY }}
                onChange={(next) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [pkg.id]: { ...draft, offsetX: next.offsetX, offsetY: next.offsetY },
                  }))
                }
                onSave={() =>
                  requestConfirm({
                    title: "تأكيد حفظ الموضع",
                    description: `حفظ موضع الباقة "${draft.name}"؟`,
                    onConfirm: async () => {
                      await updateMutation.mutateAsync({
                        id: pkg.id,
                        offsetX: draft.offsetX,
                        offsetY: draft.offsetY,
                      });
                    },
                  })
                }
                disabled={updateMutation.isPending}
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                onClick={() => handleUpdate(pkg.id)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
                حفظ التعديلات
              </Button>
              <Button variant="outline" onClick={closeEdit}>
                إلغاء
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة باقة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="اسم الباقة"
              value={newPackage.name}
              onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
            />
            <Input
              placeholder="السعر (مثال: $500)"
              value={newPackage.price}
              onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تصنيف الباقة</Label>
              <select
                value={newPackage.category}
                onChange={(e) => setNewPackage({ ...newPackage, category: e.target.value })}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="session">جلسات التصوير</option>
                <option value="prints">المطبوعات</option>
                <option value="wedding">Full Day</option>
                <option value="addon">إضافات</option>
              </select>
            </div>
          </div>
          <Textarea
            placeholder="وصف الباقة"
            value={newPackage.description}
            onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
          />
          <Textarea
            placeholder="المميزات (كل ميزة في سطر جديد)"
            value={newPackage.features}
            onChange={(e) => setNewPackage({ ...newPackage, features: e.target.value })}
            rows={4}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setNewPackage((prev) => ({
                  ...prev,
                  features: prev.features ? `${prev.features}\n` : "",
                }))
              }
            >
              إضافة سطر
            </Button>
            <span className="text-xs text-muted-foreground">
              كل سطر يظهر كبند داخل الكارت بنفس التصميم.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={seedDefaults}
              disabled={seedBusy}
            >
              {seedBusy ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Package className="w-4 h-4 ml-2" />}
              تجهيز الباقات الافتراضية
            </Button>
            <span className="text-xs text-muted-foreground">
              لو القائمة فاضية، الزر ده يضيف الباقات الافتراضية تلقائياً.
            </span>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
            إضافة الباقة
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            قائمة الباقات
          </CardTitle>
          <CardDescription>عدّل الباقات مباشرة، أو غيّر الترتيب والظهور.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={packageSearch}
              onChange={(e) => setPackageSearch(e.target.value)}
              placeholder="ابحث بالاسم أو السعر..."
              className="w-full sm:max-w-sm"
            />
            <Select value={packageCategoryFilter} onValueChange={setPackageCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="كل الأقسام" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">كل الأقسام</SelectItem>
                <SelectItem value="session">جلسات التصوير</SelectItem>
                <SelectItem value="wedding">Full Day</SelectItem>
                <SelectItem value="addon">إضافات</SelectItem>
                <SelectItem value="prints">المطبوعات</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="text-xs">
              {visibleFilteredCount} نتيجة
            </Badge>
          </div>
          {categoryOrder.map((category) => {
            if (!activeCategories.find((item) => item.id === category.id)) return null;
            const list = visibleListForCategory(category.id);
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{category.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">
                  {list.length > 0 ? (
                    list.map(renderPackageCard)
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      لا توجد باقات في هذا القسم حالياً.
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visibleFilteredCount === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{normalizedPackageSearch ? "لا توجد نتائج مطابقة للبحث" : "لا توجد باقات بعد"}</p>
              {!normalizedPackageSearch && (
                <p className="text-xs mt-2">سيتم تجهيز الباقات الافتراضية تلقائياً.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="w-5 h-5" />
            الباقات المخفية
          </CardTitle>
          <CardDescription>يمكنك استعادة أي باقة مخفية بضغطة واحدة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeCategories.map((category) => {
            const list = hiddenListForCategory(category.id);
            if (!list.length) return null;
            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-semibold">{category.label}</h4>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-4">{list.map(renderPackageCard)}</div>
              </div>
            );
          })}

          {hiddenFilteredCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <EyeOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>{normalizedPackageSearch ? "لا توجد نتائج مطابقة للبحث" : "لا توجد باقات مخفية"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Testimonials Manager Component
// ============================================
function TestimonialsManager({ onRefresh, compact }: ManagerProps & { compact?: boolean }) {
  const { data: testimonials, refetch, isLoading } = trpc.testimonials.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.testimonials.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الرأي");
      refetch();
      onRefresh?.();
      setNewTestimonial({ name: "", quote: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.testimonials.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الرأي");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.testimonials.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الرأي");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newTestimonial, setNewTestimonial] = useState({ name: "", quote: "" });
  const [positionDrafts, setPositionDrafts] = useState<Record<number, PositionValue>>({});

  useEffect(() => {
    if (testimonials) {
      const next: Record<number, PositionValue> = {};
      testimonials.forEach((item: any) => {
        next[item.id] = {
          offsetX: toOffset(item.offsetX),
          offsetY: toOffset(item.offsetY),
        };
      });
      setPositionDrafts(next);
    }
  }, [testimonials]);

  const handleCreate = async () => {
    if (!newTestimonial.name || !newTestimonial.quote) {
      toast.error("يرجى إدخال الاسم والرأي");
      return;
    }
    await createMutation.mutateAsync(newTestimonial);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const visibleTestimonials = (testimonials ?? []).filter((t) => isExplicitlyVisible(t.visible));
  const hiddenTestimonials = (testimonials ?? []).filter((t) => isExplicitlyHidden(t.visible));

  const toggleTestimonialVisibility = async (id: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id, visible });
  };

  const renderTestimonial = (testimonial: any) => {
    const isVisible = isExplicitlyVisible(testimonial.visible);
    if (compact) {
      return (
        <div key={testimonial.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm italic text-muted-foreground">"{testimonial.quote}"</p>
              <p className="mt-2 text-sm font-semibold">- {testimonial.name}</p>
            </div>
            <div className="flex items-center gap-1">
              {!isVisible ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleTestimonialVisibility(testimonial.id, true)}
                  title="استعادة"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  requestConfirm(
                    isVisible
                      ? {
                          title: "إخفاء الرأي",
                          description: `سيتم نقل رأي "${testimonial.name}" إلى الآراء المخفية ويمكن استعادته لاحقًا.`,
                          confirmLabel: "إخفاء",
                          cancelLabel: "إلغاء",
                          onConfirm: () => toggleTestimonialVisibility(testimonial.id, false),
                        }
                      : {
                          title: "حذف الرأي",
                          description: `هل تريد حذف رأي "${testimonial.name}" نهائيًا؟`,
                          confirmLabel: "حذف",
                          cancelLabel: "إلغاء",
                          onConfirm: () => deleteMutation.mutate({ id: testimonial.id }),
                        }
                  )
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Card key={testimonial.id}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <p className="text-lg italic mb-4">"{testimonial.quote}"</p>
              <p className="font-semibold">- {testimonial.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isVisible ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleTestimonialVisibility(testimonial.id, true)}
                >
                  استعادة
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  requestConfirm(
                    isVisible
                      ? {
                          title: "إخفاء الرأي",
                          description: `سيتم نقل رأي "${testimonial.name}" إلى الآراء المخفية ويمكن استعادته لاحقًا.`,
                          confirmLabel: "إخفاء",
                          cancelLabel: "إلغاء",
                          onConfirm: () => toggleTestimonialVisibility(testimonial.id, false),
                        }
                      : {
                          title: "حذف الرأي",
                          description: `هل تريد حذف رأي "${testimonial.name}" نهائيًا؟`,
                          confirmLabel: "حذف",
                          cancelLabel: "إلغاء",
                          onConfirm: () => deleteMutation.mutate({ id: testimonial.id }),
                        }
                  )
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <PositionControls
              value={positionDrafts[testimonial.id] ?? { offsetX: 0, offsetY: 0 }}
              onChange={(next) =>
                setPositionDrafts((prev) => ({ ...prev, [testimonial.id]: next }))
              }
              onSave={() =>
                requestConfirm({
                  title: "تأكيد حفظ الموضع",
                  description: `حفظ موضع رأي "${testimonial.name}"؟`,
                  onConfirm: async () => {
                    const pos = positionDrafts[testimonial.id] ?? { offsetX: 0, offsetY: 0 };
                    await updateMutation.mutateAsync({
                      id: testimonial.id,
                      offsetX: pos.offsetX,
                      offsetY: pos.offsetY,
                    });
                  },
                })
              }
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const addForm = (
    <div className="space-y-4">
      <Input
        placeholder="اسم العميل"
        value={newTestimonial.name}
        onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
      />
      <Textarea
        placeholder="رأي العميل"
        value={newTestimonial.quote}
        onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
        rows={3}
      />
      <Button onClick={handleCreate} disabled={createMutation.isPending} className={compact ? "w-full" : ""}>
        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
        إضافة الرأي
      </Button>
    </div>
  );

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {compact ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Plus className="w-4 h-4" />
            إضافة رأي عميل
          </div>
          {addForm}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              إضافة رأي عميل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {addForm}
          </CardContent>
        </Card>
      )}

      <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {visibleTestimonials.map(renderTestimonial)}
      </div>

      {visibleTestimonials.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد آراء عملاء بعد</p>
        </div>
      )}

      {hiddenTestimonials.length > 0 ? (
        <div className={compact ? "flex items-center gap-2 text-xs text-muted-foreground" : "flex items-center gap-2 text-sm text-muted-foreground"}>
          <EyeOff className="w-4 h-4" />
          آراء مخفية (يمكن الاستعادة)
        </div>
      ) : null}

      <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
        {hiddenTestimonials.map(renderTestimonial)}
      </div>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// FAQs Manager Component
// ============================================
function FaqManager({ onRefresh }: ManagerProps) {
  const { data: faqs, refetch, isLoading } = trpc.faqs.getAll.useQuery();
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const createMutation = trpc.faqs.create.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة السؤال");
      refetch();
      onRefresh?.();
      setNewFaq({ question: "", answer: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.faqs.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث السؤال");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = trpc.faqs.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف السؤال");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [drafts, setDrafts] = useState<Record<number, { question: string; answer: string; sortOrder: number }>>({});

  useEffect(() => {
    if (!faqs) return;
    const next: Record<number, { question: string; answer: string; sortOrder: number }> = {};
    faqs.forEach((item: any) => {
      next[item.id] = {
        question: item.question ?? "",
        answer: item.answer ?? "",
        sortOrder: item.sortOrder ?? 0,
      };
    });
    setDrafts(next);
  }, [faqs]);

  const handleCreate = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      toast.error("يرجى إدخال السؤال والإجابة");
      return;
    }
    const maxSort = Math.max(0, ...(faqs ?? []).map((f: any) => f.sortOrder ?? 0));
    await createMutation.mutateAsync({
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim(),
      sortOrder: maxSort + 1,
    });
  };

  const handleSave = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error("يرجى إدخال السؤال والإجابة");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      sortOrder: draft.sortOrder ?? 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const visibleFaqs = (faqs ?? []).filter((f: any) => isExplicitlyVisible(f.visible));
  const hiddenFaqs = (faqs ?? []).filter((f: any) => isExplicitlyHidden(f.visible));

  const toggleFaqVisibility = async (id: number, visible: boolean) => {
    await updateMutation.mutateAsync({ id, visible });
  };

  const renderFaq = (faq: any) => {
    const isVisible = isExplicitlyVisible(faq.visible);
    const draft = drafts[faq.id] ?? {
      question: faq.question ?? "",
      answer: faq.answer ?? "",
      sortOrder: faq.sortOrder ?? 0,
    };

    return (
      <Card key={faq.id}>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={draft.question}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [faq.id]: { ...draft, question: e.target.value },
                }))
              }
              placeholder="نص السؤال"
              className="md:col-span-2"
            />
            <Input
              type="number"
              value={draft.sortOrder}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [faq.id]: { ...draft, sortOrder: Number(e.target.value) },
                }))
              }
              placeholder="الترتيب"
            />
          </div>
          <Textarea
            value={draft.answer}
            onChange={(e) =>
              setDrafts((prev) => ({
                ...prev,
                [faq.id]: { ...draft, answer: e.target.value },
              }))
            }
            rows={4}
            placeholder="نص الإجابة"
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave(faq.id)}
              disabled={updateMutation.isPending}
            >
              <Save className="w-4 h-4 ml-2" />
              حفظ
            </Button>
            <div className="flex items-center gap-2">
              {!isVisible ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleFaqVisibility(faq.id, true)}
                >
                  استعادة
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    requestConfirm({
                      title: "إخفاء السؤال",
                      description: `سيتم نقل السؤال إلى الأسئلة المخفية ويمكن استعادته لاحقًا.`,
                      confirmLabel: "إخفاء",
                      cancelLabel: "إلغاء",
                      onConfirm: () => toggleFaqVisibility(faq.id, false),
                    })
                  }
                >
                  إخفاء
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  requestConfirm({
                    title: "حذف السؤال نهائيًا",
                    description: "هل تريد حذف السؤال نهائيًا؟ لا يمكن التراجع بعد الحذف.",
                    confirmLabel: "حذف",
                    cancelLabel: "إلغاء",
                    onConfirm: () => deleteMutation.mutate({ id: faq.id }),
                  })
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إضافة سؤال جديد
          </CardTitle>
          <CardDescription>أضف سؤال وإجابة ليظهروا في صفحة الأسئلة الشائعة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="نص السؤال"
            value={newFaq.question}
            onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
          />
          <Textarea
            placeholder="نص الإجابة"
            value={newFaq.answer}
            onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
            rows={4}
          />
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Plus className="w-4 h-4 ml-2" />}
            إضافة السؤال
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {visibleFaqs.map(renderFaq)}
      </div>

      {visibleFaqs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد أسئلة بعد</p>
        </div>
      )}

      {hiddenFaqs.length > 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <EyeOff className="w-4 h-4" />
          أسئلة مخفية (يمكن الاستعادة)
        </div>
      ) : null}

      <div className="space-y-4">
        {hiddenFaqs.map(renderFaq)}
      </div>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Contact Manager Component
// ============================================
function ContactManager({ onRefresh }: ManagerProps) {
  const { data: contactInfo, refetch, isLoading } = trpc.contactInfo.getAll.useQuery();
  const { data: content, refetch: refetchContent } = trpc.siteContent.getAll.useQuery();
  const contactInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { requestConfirm, ConfirmDialog } = useConfirmDialog();
  const upsertContactMutation = trpc.contactInfo.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const upsertContentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ النصوص");
      refetchContent();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const [editingContact, setEditingContact] = useState<Record<string, string>>({});
  const [editingContactMeta, setEditingContactMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [editingMeta, setEditingMeta] = useState<Record<string, { hidden?: boolean; scale?: number }>>({});
  const [editingPositions, setEditingPositions] = useState<Record<string, PositionValue>>({});

  useEffect(() => {
    if (contactInfo) {
      const contactMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      contactInfo.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contactMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
      });
      setEditingContact(contactMap);
      setEditingContactMeta(meta);
    }
  }, [contactInfo]);

  useEffect(() => {
    if (content) {
      const contentMap: Record<string, string> = {};
      const meta: Record<string, { hidden?: boolean; scale?: number }> = {};
      const positions: Record<string, PositionValue> = {};
      content.forEach((item) => {
        const parsed = parseContentValue(item.value);
        contentMap[item.key] = parsed.text;
        meta[item.key] = { hidden: parsed.hidden, scale: parsed.scale };
        positions[item.key] = {
          offsetX: toOffset((item as any).offsetX),
          offsetY: toOffset((item as any).offsetY),
        };
      });
      setEditingContent(contentMap);
      setEditingMeta(meta);
      setEditingPositions(positions);
    }
  }, [content]);

  const handleSaveContact = async (key: string, label: string) => {
    const nextValue = serializeContentValue({
      text: editingContact[key] || "",
      hidden: editingContactMeta[key]?.hidden,
      scale: editingContactMeta[key]?.scale,
    });
    const prevValue = (contactInfo ?? []).find((item) => item.key === key)?.value ?? "";
    await upsertContactMutation.mutateAsync({
      key,
      value: nextValue,
      label,
    });
    if (prevValue !== nextValue) {
      pushEdit({
        kind: "contactInfo",
        key,
        prev: prevValue,
        next: nextValue,
        label,
      });
    }
  };

  const handleSaveContent = async (key: string, label: string) => {
    const pos = editingPositions[key] ?? { offsetX: 0, offsetY: 0 };
    const nextValue = serializeContentValue({
      text: editingContent[key] || "",
      hidden: editingMeta[key]?.hidden,
      scale: editingMeta[key]?.scale,
    });
    const prevValue = (content ?? []).find((item) => item.key === key)?.value ?? "";
    await upsertContentMutation.mutateAsync({
      key,
      value: nextValue,
      category: "contact",
      label,
      offsetX: pos.offsetX,
      offsetY: pos.offsetY,
    });
    if (prevValue !== nextValue) {
      pushEdit({
        kind: "siteContent",
        key,
        prev: prevValue,
        next: nextValue,
        category: "contact",
        label,
      });
    }
  };

  const focusContactField = (key: string) => {
    const el = contactInputRefs.current[key];
    if (!el) return;
    el.focus();
    el.select();
  };

  const contactFields = [
    { key: "phone", label: "رقم الهاتف" },
    { key: "whatsapp", label: "رقم الواتساب" },
    { key: "email", label: "البريد الإلكتروني" },
    { key: "location", label: "الموقع" },
    { key: "instagram", label: "رابط إنستجرام" },
    { key: "facebook", label: "رابط فيسبوك" },
    { key: "tiktok", label: "رابط تيك توك" },
  ];

  const textGroups = [
    {
      title: "الهيدر",
      items: [
        { key: "contact_kicker", label: "الشريط العلوي", multiline: false },
        { key: "contact_title", label: "العنوان الرئيسي", multiline: false },
        { key: "contact_subtitle", label: "الوصف", multiline: true },
      ],
    },
    {
      title: "الأزرار السريعة",
      items: [
        { key: "contact_quick_whatsapp", label: "زر واتساب سريع", multiline: false },
        { key: "contact_quick_call", label: "زر مكالمة سريع", multiline: false },
      ],
    },
    {
      title: "نموذج التواصل",
      items: [
        { key: "contact_form_title", label: "عنوان النموذج", multiline: false },
        { key: "contact_label_name", label: "تسمية الاسم", multiline: false },
        { key: "contact_placeholder_name", label: "Placeholder الاسم", multiline: false },
        { key: "contact_label_date", label: "تسمية التاريخ", multiline: false },
        { key: "contact_label_package", label: "تسمية الباقة", multiline: false },
        { key: "contact_placeholder_package", label: "Placeholder الباقة", multiline: false },
        { key: "contact_label_phone", label: "تسمية الهاتف", multiline: false },
        { key: "contact_placeholder_phone", label: "Placeholder الهاتف", multiline: false },
        { key: "contact_label_price", label: "تسمية السعر", multiline: false },
        { key: "contact_placeholder_price", label: "Placeholder السعر", multiline: false },
        { key: "contact_label_addons", label: "تسمية الإضافات", multiline: false },
        { key: "contact_addons_placeholder", label: "Placeholder الإضافات", multiline: false },
        { key: "contact_addons_empty", label: "نص الإضافات الفارغ", multiline: false },
        { key: "contact_label_prints", label: "تسمية المطبوعات", multiline: false },
        { key: "contact_prints_placeholder", label: "Placeholder المطبوعات", multiline: false },
        { key: "contact_prints_empty", label: "نص المطبوعات الفارغ", multiline: false },
        { key: "contact_reset_button", label: "زر إلغاء الاختيارات", multiline: false },
      ],
    },
    {
      title: "تنبيهات الحجز",
      items: [
        { key: "services_vip_line_1", label: "تنبيه حجز اليوم", multiline: true },
        { key: "services_vip_line_2", label: "تنبيه الأسعار النهائية", multiline: true },
      ],
    },
    {
      title: "الإيصال",
      items: [
        { key: "contact_receipt_title", label: "عنوان الإيصال", multiline: false },
        { key: "contact_receipt_heading", label: "عنوان قسم الإيصال", multiline: false },
        { key: "contact_receipt_copy", label: "زر نسخ الإيصال", multiline: false },
        { key: "contact_receipt_label_name", label: "حقل الاسم", multiline: false },
        { key: "contact_receipt_label_phone", label: "حقل الهاتف", multiline: false },
        { key: "contact_receipt_label_date", label: "حقل التاريخ", multiline: false },
        { key: "contact_receipt_label_package", label: "حقل الباقة", multiline: false },
        { key: "contact_receipt_label_addons", label: "حقل الإضافات", multiline: false },
        { key: "contact_receipt_label_prints", label: "حقل المطبوعات", multiline: false },
        { key: "contact_receipt_label_total", label: "حقل الإجمالي", multiline: false },
        { key: "contact_receipt_empty", label: "قيمة فارغة", multiline: false },
        { key: "contact_submit_button", label: "زر تأكيد الحجز", multiline: false },
        { key: "contact_submit_helper", label: "تنبيه تأكيد الحجز", multiline: true },
      ],
    },
    {
      title: "معلومات التواصل",
      items: [
        { key: "contact_info_title", label: "عنوان معلومات التواصل", multiline: false },
        { key: "contact_info_desc", label: "وصف معلومات التواصل", multiline: true },
        { key: "contact_info_phone_label", label: "عنوان الهاتف", multiline: false },
        { key: "contact_info_whatsapp_label", label: "عنوان واتساب", multiline: false },
        { key: "contact_info_email_label", label: "عنوان البريد", multiline: false },
        { key: "contact_info_location_label", label: "عنوان الموقع", multiline: false },
      ],
    },
    {
      title: "السوشيال",
      items: [
        { key: "contact_follow_title", label: "عنوان تابعنا", multiline: false },
        { key: "contact_floating_label", label: "زر واتساب العائم", multiline: false },
      ],
    },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>معلومات التواصل</CardTitle>
          <CardDescription>قم بتحديث معلومات التواصل وروابط السوشيال ميديا</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactFields.map((field) => (
            <div key={field.key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label className="w-full sm:w-32 shrink-0">{field.label}</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
                <Input
                  value={editingContact[field.key] || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, [field.key]: e.target.value })}
                  placeholder={field.label}
                  dir="ltr"
                  ref={(el) => {
                    contactInputRefs.current[field.key] = el;
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => focusContactField(field.key)}
                    aria-label={`تعديل ${field.label}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => handleSaveContact(field.key, field.label)}
                    disabled={upsertContactMutation.isPending}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نصوص صفحة تواصل معي</CardTitle>
          <CardDescription>تعديل جميع النصوص والعناوين داخل صفحة التواصل.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {textGroups.map((group, idx) => (
            <div key={group.title} className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold">{group.title}</h4>
                {idx > 0 ? <Separator className="flex-1" /> : null}
              </div>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center">
                      {item.multiline ? (
                        <Textarea
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                          rows={2}
                        />
                      ) : (
                        <Input
                          value={editingContent[item.key] || ""}
                          onChange={(e) =>
                            setEditingContent({ ...editingContent, [item.key]: e.target.value })
                          }
                        />
                      )}
                      <Button
                        size="icon"
                        onClick={() => handleSaveContent(item.key, item.label)}
                        disabled={upsertContentMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    <PositionControls
                      value={editingPositions[item.key] ?? { offsetX: 0, offsetY: 0 }}
                      onChange={(next) =>
                        setEditingPositions((prev) => ({ ...prev, [item.key]: next }))
                      }
                      onSave={() =>
                        requestConfirm({
                          title: "تأكيد حفظ الموضع",
                          description: `حفظ موضع "${item.label}"؟`,
                          onConfirm: () => handleSaveContent(item.key, item.label),
                        })
                      }
                      disabled={upsertContentMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

// ============================================
// Sections Manager Component
// ============================================
function SectionsManager({ onRefresh }: ManagerProps) {
  const { data: sections, refetch, isLoading } = trpc.sections.getAll.useQuery();
  const upsertMutation = trpc.sections.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ التغييرات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });
  const toggleMutation = trpc.sections.toggleVisibility.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الإعدادات");
      refetch();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  // Initialize default sections if empty
  useEffect(() => {
    if (sections && sections.length === 0) {
      const defaultSections = [
        { key: "hero", name: "القسم الرئيسي (Hero)", page: "home", sortOrder: 1 },
        { key: "about_preview", name: "قسم من أنا", page: "home", sortOrder: 2 },
        { key: "portfolio_preview", name: "معرض الأعمال", page: "home", sortOrder: 3 },
        { key: "services_preview", name: "الخدمات", page: "home", sortOrder: 4 },
        { key: "testimonials", name: "آراء العملاء", page: "home", sortOrder: 5 },
        { key: "cta", name: "قسم الدعوة للتواصل", page: "home", sortOrder: 6 },
      ];
      defaultSections.forEach((section) => {
        upsertMutation.mutate({ ...section, visible: true });
      });
    }
  }, [sections]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const defaultSections = [
    { key: "hero", name: "القسم الرئيسي (Hero)", page: "home" },
    { key: "about_preview", name: "قسم من أنا", page: "home" },
    { key: "portfolio_preview", name: "معرض الأعمال", page: "home" },
    { key: "services_preview", name: "الخدمات", page: "home" },
    { key: "testimonials", name: "آراء العملاء", page: "home" },
    { key: "cta", name: "قسم الدعوة للتواصل", page: "home" },
  ];

  const getSectionVisibility = (key: string) => {
    const section = sections?.find((s) => s.key === key);
    return isExplicitlyVisible(section?.visible);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إدارة الأقسام</CardTitle>
          <CardDescription>تحكم في إظهار أو إخفاء أقسام الموقع</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultSections.map((section) => (
            <div key={section.key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{section.name}</p>
                <p className="text-sm text-muted-foreground">الصفحة: {section.page === "home" ? "الرئيسية" : section.page}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={section.key} className="text-sm">
                  {getSectionVisibility(section.key) ? "ظاهر" : "مخفي"}
                </Label>
                <Switch
                  id={section.key}
                  checked={getSectionVisibility(section.key)}
                  onCheckedChange={(checked) => {
                    toggleMutation.mutate({ key: section.key, visible: checked });
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Share Links Manager Component
// ============================================
type ShareLinkItem = {
  code: string;
  expiresAt: string | null;
  createdAt: string;
  note?: string | null;
  revokedAt?: string | null;
};

function formatShareDate(value: string | null | undefined) {
  if (!value) return "دائم";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ShareLinksManager({ onRefresh }: ManagerProps) {
  const utils = trpc.useUtils();
  const [ttlHours, setTtlHours] = useState(24);
  const [isPermanent, setIsPermanent] = useState(false);
  const [note, setNote] = useState("");
  const [latestLinkUrl, setLatestLinkUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const cacheKey = "admin_share_links_cache";
  const [cachedLinks, setCachedLinks] = useState<ShareLinkItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as ShareLinkItem[]) : [];
    } catch {
      return [];
    }
  });
  const updateCache = (updater: (prev: ShareLinkItem[]) => ShareLinkItem[]) => {
    setCachedLinks((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
      }
      return next;
    });
  };
  const listQuery = trpc.shareLinks.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  useEffect(() => {
    if (!listQuery.data) return;
    setCachedLinks(() => {
      const next = listQuery.data;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
      }
      return next;
    });
  }, [listQuery.data, cacheKey]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "تأكيد",
  });
  const links = Array.isArray(listQuery.data) ? listQuery.data : cachedLinks;
  const isLoading = listQuery.isLoading && cachedLinks.length === 0;

  const buildShareUrl = (code: string) => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/s/${code}/services`;
  };

  const createMutation = trpc.shareLinks.create.useMutation({
    onSuccess: (data) => {
      setNote("");
      setIsPermanent(false);
      if (data?.code) {
        const url = buildShareUrl(data.code);
        if (url) setLatestLinkUrl(url);
        const createdAt = new Date().toISOString();
        updateCache((prev) => {
          const next: ShareLinkItem = {
            code: data.code,
            note: data.note ?? null,
            expiresAt: data.expiresAt,
            createdAt,
            revokedAt: null,
          };
          return [next, ...prev.filter((item) => item.code !== data.code)];
        });
      }
      toast.success(isPermanent ? "تم إنشاء الرابط الدائم" : "تم إنشاء الرابط المؤقت");
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const extendMutation = trpc.shareLinks.extend.useMutation({
    onSuccess: (data, variables) => {
      toast.success("تم تمديد الرابط");
      if (data?.expiresAt) {
        updateCache((prev) =>
          prev.map((item) =>
            item.code === variables.code
              ? { ...item, expiresAt: data.expiresAt }
              : item
          )
        );
      }
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeMutation = trpc.shareLinks.revoke.useMutation({
    onSuccess: () => {
      toast.success("تم تعطيل الرابط");
      utils.shareLinks.list.invalidate();
      onRefresh?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreate = () => {
    if (!isPermanent && (!Number.isFinite(ttlHours) || ttlHours < 1)) {
      toast.error("يرجى إدخال مدة صحيحة بالساعات");
      return;
    }
    const hoursLabel = ttlHours === 1 ? "ساعة واحدة" : `${ttlHours} ساعة`;
    const payloadNote = note.trim() || undefined;
    setConfirmState({
      open: true,
      title: "تأكيد إنشاء الرابط",
      description: isPermanent
        ? "هل تريد إنشاء رابط دائم؟"
        : `هل تريد إنشاء رابط مؤقت لمدة ${hoursLabel}؟`,
      confirmLabel: "إنشاء",
      onConfirm: () => {
        createMutation.mutate(
          isPermanent
            ? { permanent: true, note: payloadNote }
            : { ttlHours, note: payloadNote }
        );
      },
    });
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  const handleRemove = (code: string) => {
    setConfirmState({
      open: true,
      title: "تعطيل الرابط",
      description: "هل تريد تعطيل هذا الرابط المؤقت؟",
      confirmLabel: "تعطيل",
      onConfirm: () => {
        updateCache((prev) =>
          prev.map((item) =>
            item.code === code
              ? { ...item, revokedAt: new Date().toISOString() }
              : item
          )
        );
        revokeMutation.mutate({ code });
      },
    });
  };


  const now = Date.now();
  const sortedLinks = [...links].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLinks = sortedLinks.filter((link) => {
    const expiresAtMs = link.expiresAt ? new Date(link.expiresAt).getTime() : null;
    const isExpired = expiresAtMs ? expiresAtMs <= now : false;
    const isRevoked = Boolean(link.revokedAt);
    const status = isRevoked ? "revoked" : isExpired ? "expired" : "active";
    const matchesStatus = statusFilter === "all" || statusFilter === status;
    if (!normalizedSearch) return matchesStatus;
    const haystack = `${link.code} ${link.note ?? ""}`.toLowerCase();
    return matchesStatus && haystack.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
          }
        }}
      >
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            {confirmState.description ? (
              <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmState.onConfirm;
                setConfirmState((prev) => ({ ...prev, open: false, onConfirm: undefined }));
                action?.();
              }}
            >
              {confirmState.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            إنشاء رابط مؤقت
          </CardTitle>
          <CardDescription>
            أنشئ رابط مشاركة ينتهي تلقائياً بعد مدة محددة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="share-ttl">المدة (بالساعات)</Label>
              <Input
                id="share-ttl"
                type="number"
                min={1}
                max={168}
                value={ttlHours}
                onChange={(e) => {
                  setIsPermanent(false);
                  setTtlHours(Number(e.target.value));
                }}
                disabled={isPermanent}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-note">ملاحظة (اختياري)</Label>
              <Input
                id="share-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: لينك لمعاينة جلسة جديدة"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(1);
              }}
            >
              ساعة واحدة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(3);
              }}
            >
              3 ساعات
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(5);
              }}
            >
              5 ساعات
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(24);
              }}
            >
              24 ساعة
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsPermanent(false);
                setTtlHours(72);
              }}
            >
              3 أيام
            </Button>
            <Button
              type="button"
              variant={isPermanent ? "default" : "secondary"}
              size="sm"
              onClick={() => setIsPermanent(true)}
            >
              دائم
            </Button>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Link2 className="w-4 h-4 ml-2" />
            )}
            إنشاء الرابط
          </Button>

          {latestLinkUrl && (
            <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
              <Label>آخر رابط تم إنشاؤه</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={latestLinkUrl}
                  readOnly
                  className="dir-ltr text-xs sm:text-sm w-full"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(latestLinkUrl)}
                >
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            الروابط التي أنشأتها
          </CardTitle>
          <CardDescription>
            هذه القائمة محفوظة على السيرفر ويمكن التحكم بها من أي جهاز.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {sortedLinks.length === 0 && (
            <div className="text-sm text-muted-foreground">
              لم يتم إنشاء أي روابط بعد.
            </div>
          )}

          {sortedLinks.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالكود أو الملاحظة..."
                className="w-full sm:max-w-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="فلترة الحالة" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">سارية</SelectItem>
                    <SelectItem value="expired">منتهية</SelectItem>
                    <SelectItem value="revoked">ملغية</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-xs">
                  {filteredLinks.length} نتيجة
                </Badge>
              </div>
            </div>
          )}

          {sortedLinks.length > 0 && filteredLinks.length === 0 && (
            <div className="text-sm text-muted-foreground">
              لا توجد روابط مطابقة لبحثك.
            </div>
          )}

          {filteredLinks.map((link) => {
            const expiresAtMs = link.expiresAt
              ? new Date(link.expiresAt).getTime()
              : Number.NaN;
            const isExpired = Number.isNaN(expiresAtMs)
              ? false
              : expiresAtMs <= now;
            const isRevoked = Boolean(link.revokedAt);
            const url = buildShareUrl(link.code);

            return (
              <div
                key={link.code}
                className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isRevoked || isExpired ? "destructive" : "secondary"}>
                {isRevoked ? "ملغي" : isExpired ? "منتهي" : "ساري"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ينتهي في {formatShareDate(link.expiresAt)}
              </span>
            </div>
                  <div className="text-xs text-muted-foreground">
                    {formatShareDate(link.createdAt)}
                  </div>
                </div>

                {link.note && (
                  <div className="text-sm text-muted-foreground">{link.note}</div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">الرابط</Label>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      value={url}
                      readOnly
                      className="dir-ltr text-xs sm:text-sm w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopy(url)}
                        disabled={isRevoked}
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        نسخ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(link.code)}
                        disabled={revokeMutation.isPending || isRevoked}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        تعطيل
                      </Button>
                    </div>
                  </div>
                </div>

                {link.expiresAt ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">تمديد سريع:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 1 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +1 ساعة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 3 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +3 ساعات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 5 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +5 ساعات
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 24 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +24 ساعة
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => extendMutation.mutate({ code: link.code, hours: 72 })}
                      disabled={isRevoked || extendMutation.isPending}
                    >
                      +3 أيام
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Live Editor Component
// ============================================
function LiveEditor({
  largeText,
  setLargeText,
}: {
  largeText: boolean;
  setLargeText: Dispatch<SetStateAction<boolean>>;
}) {
  const [activeSection, setActiveSection] = useState(() => {
    return "links";
  });
  const [globalQuery, setGlobalQuery] = useState("");
  const [contentSearchText, setContentSearchText] = useState("");
  const [contentSearchSeed, setContentSearchSeed] = useState(0);
  const contentQuery = trpc.siteContent.getAll.useQuery(undefined, {
    staleTime: 30_000,
  });
  const catalog = useMemo(() => buildContentCatalog(), []);
  const catalogFallbacks = catalog.fallbackMap;
  const [historyBusy, setHistoryBusy] = useState(false);
  const utils = trpc.useUtils();
  const {
    canUndo,
    canRedo,
    takeUndo,
    takeRedo,
    restoreUndo,
    restoreRedo,
  } = useEditHistory();

  const contentMutation = trpc.siteContent.upsert.useMutation({
    onSuccess: () => utils.siteContent.getAll.invalidate(),
  });
  const contactMutation = trpc.contactInfo.upsert.useMutation({
    onSuccess: () => utils.contactInfo.getAll.invalidate(),
  });
  const imageMutation = trpc.siteImages.upsert.useMutation({
    onSuccess: () => utils.siteImages.getAll.invalidate(),
  });

  const refreshPreview = (showToast = false) => {
    if (typeof window === "undefined") return;
    const stamp = String(Date.now());
    window.localStorage.setItem("siteContentUpdatedAt", stamp);
    window.localStorage.setItem("siteImagesUpdatedAt", stamp);
    window.localStorage.setItem("sitePackagesUpdatedAt", stamp);
    window.localStorage.setItem("siteContactUpdatedAt", stamp);
    window.localStorage.setItem("siteTestimonialsUpdatedAt", stamp);
    window.localStorage.setItem("sitePortfolioUpdatedAt", stamp);
    window.localStorage.setItem("siteFaqUpdatedAt", stamp);
    if (showToast) toast.success("تم تحديث المزامنة");
  };

  const applyAction = async (action: EditAction, direction: "undo" | "redo") => {
    if (action.kind === "siteContent") {
      const value = direction === "undo" ? action.prev : action.next;
      await contentMutation.mutateAsync({
        key: action.key,
        value,
        category: action.category,
        label: action.label,
      });
      return;
    }
    if (action.kind === "contactInfo") {
      const value = direction === "undo" ? action.prev : action.next;
      await contactMutation.mutateAsync({
        key: action.key,
        value,
        label: action.label,
      });
      return;
    }
    if (action.kind === "siteImage") {
      const url = direction === "undo" ? action.prevUrl : action.nextUrl;
      await imageMutation.mutateAsync({
        key: action.key,
        url,
        alt: action.alt,
        category: action.category,
      });
    }
  };

  const handleUndo = async () => {
    if (historyBusy) return;
    const action = takeUndo();
    if (!action) return;
    setHistoryBusy(true);
    try {
      await applyAction(action, "undo");
      refreshPreview();
      toast.success("تم الرجوع عن آخر تعديل");
    } catch (error: any) {
      restoreUndo(action);
      toast.error(error?.message ?? "تعذر الرجوع عن التعديل");
    } finally {
      setHistoryBusy(false);
    }
  };

  const handleRedo = async () => {
    if (historyBusy) return;
    const action = takeRedo();
    if (!action) return;
    setHistoryBusy(true);
    try {
      await applyAction(action, "redo");
      refreshPreview();
      toast.success("تم التقدم في التعديل");
    } catch (error: any) {
      restoreRedo(action);
      toast.error(error?.message ?? "تعذر التقدم في التعديل");
    } finally {
      setHistoryBusy(false);
    }
  };

  const sections = [
    {
      id: "links",
      title: "الروابط المؤقتة",
      description: "إنشاء روابط معاينة مؤقتة وإدارتها.",
      icon: Link2,
      render: () => <ShareLinksManager onRefresh={refreshPreview} />,
    },
    {
      id: "content",
      title: "تعديل النصوص",
      description: "كل نصوص الموقع في خانات قابلة للتعديل والحفظ.",
      icon: Pencil,
      render: () => (
        <ContentManager
          onRefresh={refreshPreview}
          searchSeed={contentSearchSeed}
          searchText={contentSearchText}
        />
      ),
    },
    {
      id: "hidden-edits",
      title: "التعديلات المخفية والمحذوفة",
      description: "استعادة أو حذف نهائي للتعديلات المخفية والمحذوفة.",
      icon: EyeOff,
      render: () => <HiddenEditsManager onRefresh={refreshPreview} />,
    },
    {
      id: "about",
      title: "صفحة من أنا",
      description: "تعديل نصوص وصور صفحة من أنا.",
      icon: Camera,
      render: () => <AboutManager onRefresh={refreshPreview} />,
    },
    {
      id: "packages",
      title: "الباقات",
      description: "إضافة الباقات وتعديل تفاصيلها وترتيبها.",
      icon: Package,
      render: () => <PackagesManager onRefresh={refreshPreview} />,
    },
    {
      id: "portfolio",
      title: "المعرض",
      description: "إدارة صور المعرض وترتيبها.",
      icon: Image,
      render: () => <PortfolioManager onRefresh={refreshPreview} />,
    },
    {
      id: "testimonials",
      title: "آراء العملاء",
      description: "إضافة وحذف الآراء والتحكم في ظهورها.",
      icon: MessageSquare,
      render: () => <TestimonialsManager onRefresh={refreshPreview} />,
    },
    {
      id: "faq",
      title: "الأسئلة الشائعة",
      description: "إضافة الأسئلة والإجابات وترتيبها.",
      icon: HelpCircle,
      render: () => <FaqManager onRefresh={refreshPreview} />,
    },
    {
      id: "contact",
      title: "بيانات التواصل",
      description: "أرقام التواصل وروابط السوشيال.",
      icon: Phone,
      render: () => <ContactManager onRefresh={refreshPreview} />,
    },
  ];

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];
  const normalizedGlobalQuery = globalQuery.trim().toLowerCase();
  const sectionMatches = normalizedGlobalQuery
    ? sections.filter(
        (section) =>
          section.title.toLowerCase().includes(normalizedGlobalQuery) ||
          section.description.toLowerCase().includes(normalizedGlobalQuery)
      )
    : sections;
  const quickResults = useMemo(() => {
    if (!normalizedGlobalQuery) return [] as Array<{ key: string; label: string; category: string }>;
    const contentList = (contentQuery.data ?? []) as Array<{
      key: string;
      value: string;
      label?: string | null;
      category?: string | null;
    }>;
    const baseRows =
      contentList.length > 0
        ? contentList.map((row) => {
            const parsed = parseContentValue(row.value ?? "");
            return {
              key: row.key,
              label: row.label ?? row.key,
              category: row.category ?? "shared",
              value: parsed.text ?? "",
            };
          })
        : catalog.items.map((item) => ({
            key: item.key,
            label: item.label ?? item.key,
            category: item.category ?? "shared",
            value: catalogFallbacks[item.key] ?? "",
          }));
    const withFallback = baseRows.map((row) => ({
      ...row,
      value: row.value || catalogFallbacks[row.key] || "",
    }));
    return withFallback
      .filter((row) => {
        const key = row.key.toLowerCase();
        const label = row.label.toLowerCase();
        const value = row.value.toLowerCase();
        return (
          key.includes(normalizedGlobalQuery) ||
          label.includes(normalizedGlobalQuery) ||
          value.includes(normalizedGlobalQuery)
        );
      })
      .slice(0, 8)
      .map((row) => ({
        key: row.key,
        label: row.label,
        category: row.category,
        value: row.value,
      }));
  }, [normalizedGlobalQuery, contentQuery.data, catalogFallbacks, catalog.items]);

  const renderSnippet = (value: string, query: string) => {
    const clean = value?.trim() ?? "";
    if (!clean) return "—";
    if (!query) return clean.slice(0, 90);
    const lower = clean.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) return clean.slice(0, 90);
    const start = Math.max(0, idx - 26);
    const end = Math.min(clean.length, idx + query.length + 26);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < clean.length ? "…" : "";
    return (
      <>
        {prefix}
        {clean.slice(start, idx)}
        <span className="text-primary font-semibold">
          {clean.slice(idx, idx + query.length)}
        </span>
        {clean.slice(idx + query.length, end)}
        {suffix}
      </>
    );
  };

  let sectionStatus: React.ReactNode = null;
  if (normalizedGlobalQuery) {
    if (sectionMatches.length) {
      sectionStatus = (
        <div className="flex flex-wrap items-center gap-2">
          {sectionMatches.map((section) => (
            <Button
              key={section.id}
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveSection(section.id);
                setGlobalQuery("");
              }}
            >
              {section.title}
            </Button>
          ))}
        </div>
      );
    } else if (quickResults.length === 0) {
      sectionStatus = (
        <div className="text-xs text-muted-foreground">
          لا توجد نتائج مطابقة للبحث الحالي.
        </div>
      );
    }
  }

  useEffect(() => {
    if (!sections.find((section) => section.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [activeSection, sections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("adminActiveSection", active.id);
  }, [active.id]);

  const triggerContentSearch = () => {
    const query = globalQuery.trim();
    if (!query) return;
    setActiveSection("content");
    setContentSearchText(query);
    setContentSearchSeed((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{active.title}</h2>
          <p className="text-sm text-muted-foreground">{active.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo || historyBusy}
          >
            <Undo2 className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo || historyBusy}
          >
            <Redo2 className="w-4 h-4 ml-2" />
            تقدم
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refreshPreview(true)}>
            <Monitor className="w-4 h-4 ml-2" />
            تحديث المزامنة
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/?adminPreview=1" target="_blank" rel="noreferrer">
              صفحة التعديلات
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="ابحث في الأقسام أو نصوص الموقع..."
              className="w-full sm:max-w-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  triggerContentSearch();
                }
              }}
            />
            <Badge variant="secondary" className="text-xs">
              {sectionMatches.length} قسم
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerContentSearch}
              disabled={!normalizedGlobalQuery}
            >
              بحث داخل النصوص
            </Button>
          </div>
          {normalizedGlobalQuery && quickResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                نتائج النصوص:
              </div>
              <div className="grid gap-2">
                {quickResults.map((row) => (
                  <button
                    key={row.key}
                    type="button"
                    className="w-full text-right rounded-lg border border-white/10 bg-black/20 hover:border-primary/35 transition-colors px-3 py-2"
                    onClick={() => {
                      setActiveSection("content");
                      setContentSearchText(globalQuery.trim());
                      setContentSearchSeed((prev) => prev + 1);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{row.label}</span>
                      <span className="text-[10px] text-muted-foreground">{row.key}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {renderSnippet(row.value, normalizedGlobalQuery)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {normalizedGlobalQuery ? (
            sectionStatus
          ) : (
            <div className="text-xs text-muted-foreground">
              اكتب أي كلمة واضغط Enter للبحث داخل نصوص الموقع.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="md:hidden">
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="text-sm font-semibold">التنقل السريع</div>
            <select
              value={active.id}
              onChange={(event) => setActiveSection(event.target.value)}
              aria-label="اختر القسم"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              {active.description}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="hidden lg:block h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" />
              القوائم
            </CardTitle>
            <CardDescription>اختر القسم الذي تريد تعديله.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === active.id;
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </Button>
              );
            })}
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <a href="/?adminPreview=1" target="_blank" rel="noreferrer">
                <Monitor className="w-4 h-4" />
                صفحة التعديلات
              </a>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {active.render()}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="admin-bottom-actions grid grid-cols-4 gap-2 px-3 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo || historyBusy}
            className="w-full"
          >
            <Undo2 className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo || historyBusy}
            className="w-full"
          >
            <Redo2 className="w-4 h-4 ml-1" />
            تقدم
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshPreview(true)}
            className="w-full"
          >
            <Monitor className="w-4 h-4 ml-1" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full">
            <a href="/?adminPreview=1" target="_blank" rel="noreferrer">
              <Monitor className="w-4 h-4 ml-1" />
              معاينة
            </a>
          </Button>
        </div>
        <div className="px-3 pb-2">
          <Button
            variant={largeText ? "secondary" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => setLargeText((prev) => !prev)}
          >
            {largeText ? "تصغير النص" : "تكبير النص"}
          </Button>
        </div>
      </div>
    </div>
  );
}

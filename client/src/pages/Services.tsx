import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check,
  Sparkles,
  Camera,
  Heart,
  Receipt,
  Plus,
  PlusCircle,
  ArrowLeft,
  Phone,
  Gift,
  ArrowDown,
  Gem,
} from "lucide-react";
import {
  pageTexts,
  ctaTexts,
  customPrintGroups,
} from "@/config/siteConfig";
import { useContactData, usePackagesData, useContentData } from "@/hooks/useSiteData";
import { EditableText, useInlineEditMode } from "@/components/InlineEdit";
import { getOffsetStyle } from "@/lib/positioning";
import { servicesStyles } from "@/styles/servicesStyles";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Pkg = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  featured?: boolean;
  badge?: string;
  priceNote?: string;
  offsetX?: number;
  offsetY?: number;
};
type AddonPkg = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  emoji?: string;
  priceNote?: string;
  offsetX?: number;
  offsetY?: number;
};

const isCustomPackage = (pkg: any) => {
  if (!pkg) return false;
  const id = String(pkg?.id ?? "");
  const name = String(pkg?.name ?? "").trim();
  const price = String(pkg?.price ?? "");
  const category = String(pkg?.category ?? "");
  if (id === "special-montage-design") return true;
  if (category === "prints" && /خصص/.test(name)) return true;
  if (category === "prints" && /تحدد|تحدد السعر|أنت من تحدد/.test(price)) return true;
  return false;
};

function CoupleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M4 20c.5-3 2.2-4.8 4-4.8s3.5 1.8 4 4.8" />
      <path d="M12.5 20c.4-2.2 1.8-3.8 3.5-3.8 1.6 0 3 1.6 3.4 3.8" />
      <path d="M4.8 6.2l3.2-3.2 3.2 3.2" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.46 0 .1 5.36.1 11.96c0 2.1.56 4.15 1.62 5.96L0 24l6.2-1.62a11.95 11.95 0 0 0 5.86 1.5h.01c6.6 0 11.96-5.36 11.96-11.96 0-3.2-1.25-6.2-3.51-8.44ZM12.07 21.9h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.96.98-3.58-.24-.37a9.9 9.9 0 0 1-1.56-5.36C2.16 6.5 6.6 2.06 12.06 2.06c2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.9 6.98c0 5.46-4.44 9.97-9.87 9.97Zm5.77-7.48c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.68.16-.2.31-.78 1-.96 1.2-.18.2-.35.24-.66.08-.31-.16-1.3-.48-2.47-1.54-.92-.82-1.54-1.84-1.72-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.35.47-.52.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.68-1.65-.93-2.27-.24-.58-.49-.5-.68-.5h-.58c-.2 0-.52.08-.8.39-.28.31-1.06 1.03-1.06 2.5 0 1.47 1.08 2.9 1.23 3.1.16.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.82-.74 2.08-1.45.26-.7.26-1.3.18-1.45-.08-.14-.28-.23-.58-.39Z"
        fill="currentColor"
      />
    </svg>
  );
}

function buildWhatsAppHref(text: string, whatsappNumber: string | undefined) {
  const phone = (whatsappNumber ?? "").replace(/[^\d]/g, "");
  if (!phone) return "";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function buildContactHref({
  packageId,
  printIds,
}: {
  packageId?: string;
  printIds?: string[];
}) {
  const params = new URLSearchParams();
  if (packageId) params.set("package", packageId);
  if (printIds?.length) params.set("prints", printIds.join(","));
  const query = params.toString();
  return query ? `/contact?${query}` : "/contact";
}

function parsePriceValue(raw?: string) {
  if (!raw) return null;
  let v = raw;
  v = v.replace(/٬/g, "").replace(/٫/g, ".");
  const cleaned = v.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/,/g, "");
  } else if (!hasDot && hasComma) {
    if (/\d+,\d{3}/.test(normalized)) {
      normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(/,/g, ".");
    }
  }
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function formatPriceNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function extractPriceUnit(raw?: string) {
  if (!raw) return "";
  return raw.replace(/[0-9.,\s]/g, "").trim();
}

const customPrintItems = customPrintGroups.reduce((acc, group) => {
  if (Array.isArray(group.items)) {
    acc.push(...group.items);
  }
  return acc;
}, [] as typeof customPrintGroups[number]["items"]);
const customPrintIdSet = new Set(customPrintItems.map((item) => item.id));
const PRINTS_STORAGE_KEY = "prefill_print_ids";

const asText = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};

function readStoredPrintIds() {
  try {
    const raw = sessionStorage.getItem(PRINTS_STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((id) => typeof id === "string" && customPrintIdSet.has(id));
  } catch {
    return [] as string[];
  }
}

function persistPrintIds(ids: string[]) {
  try {
    if (!ids.length) {
      sessionStorage.removeItem(PRINTS_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PRINTS_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore storage errors
  }
}


function getNavOffsetPx() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset").trim();
  const n = parseInt(v.replace("px", ""), 10);
  return Number.isFinite(n) ? n : 96;
}

function getSectionScrollMarginPx() {
  return getNavOffsetPx() + 78;
}

function SectionHeader({
  title,
  subtitle,
  icon,
  subtitleClassName,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  subtitleClassName?: string;
}) {
  return (
    <div className="text-center mb-7 md:mb-9">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-black/20 backdrop-blur-md mt-2 mb-0 rounded-full">
        {icon ? <span className="section-icon">{icon}</span> : null}
        <span className={["text-xs md:text-sm text-foreground/80", subtitleClassName ?? ""].join(" ")}>
          {subtitle ?? "تفاصيل واضحة • جودة ثابتة • ستايل فاخر"}
        </span>
      </div>
      <div className="mt-2 h-px w-40 md:w-48 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}

function PrimaryCTA({ whatsappNumber, label }: { whatsappNumber: string | undefined; label: React.ReactNode }) {
  void whatsappNumber;
  return (
    <Link href="/contact">
      <Button
        size="lg"
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-border-glow cta-size"
      >
        {label}
      </Button>
    </Link>
  );
}

export function PackageCard({
  pkg,
  kind,
  whatsappNumber,
  contentMap,
  preselectedPrintIds,
  onPreselectedPrintIdsChange,
}: {
  pkg: Pkg;
  kind: "session" | "prints" | "wedding" | "addon";
  whatsappNumber: string | undefined;
  contentMap: Record<string, string>;
  preselectedPrintIds?: string[];
  onPreselectedPrintIdsChange?: (ids: string[]) => void;
}) {
  if (!pkg) return null;
  const { enabled: inlineEditEnabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const addFeatureMutation = trpc.packages.update.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة سطر جديد");
      utils.packages.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sitePackagesUpdatedAt", String(Date.now()));
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const isVipPlus = (p: any) => p?.id === "full-day-vip-plus" || p?.featured === true;
  const isWedding = kind === "wedding";
  const isAddon = kind === "addon";
  const vip = isWedding && isVipPlus(pkg);
  const forcePopular = ["full-day-vip-plus", "media-coverage", "session-2"].includes(pkg.id);
  const isCustom = isCustomPackage(pkg);
  const isSessionCard = kind === "session" && !isCustom;
  const weddingTone = isWedding;
  const popular = !!pkg.popular || forcePopular;
  const popularTopCenter = popular;
  const isPro = pkg.id === "session-2";
  const featureList = (Array.isArray(pkg.features) ? pkg.features : []).map((feature) =>
    typeof feature === "string" ? feature : feature == null ? "" : String(feature)
  );
  const isCollapsible = (isWedding && featureList.length > 6) || (isAddon && featureList.length > 2);
  const baseKey = `package_${pkg.id}`;
  const getValue = (key: string, fallback = "") =>
    asText(contentMap[key] as string | undefined, fallback);
  const badgeValue = (contentMap[`${baseKey}_badge`] ?? pkg.badge) as string | undefined;
  const customDescription = getValue(`${baseKey}_description`, pkg.description ?? "").trim();
  const [localCustomIds, setLocalCustomIds] = useState<string[]>([]);
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(!isCollapsible);
  const sharedPrintIds = useMemo(
    () => (preselectedPrintIds ?? []).filter((id) => customPrintIdSet.has(id)),
    [preselectedPrintIds]
  );
  const selectedCustomIds = isCustom ? sharedPrintIds : [];
  const setSelectedCustomIds = (next: string[]) => {
    if (!isCustom) return;
    const safeNext = next.filter((id) => customPrintIdSet.has(id));
    if (onPreselectedPrintIdsChange) {
      onPreselectedPrintIdsChange(safeNext);
    } else {
      setLocalCustomIds(safeNext);
    }
    persistPrintIds(safeNext);
  };
  const effectiveCustomIds = isCustom ? (preselectedPrintIds ? selectedCustomIds : localCustomIds) : [];
  const clampQuantity = (value: number) => Math.min(5, Math.max(1, value));
  const getQuantity = (id: string) => clampQuantity(customQuantities[id] ?? 1);
  const setQuantity = (id: string, next: number) => {
    const qty = clampQuantity(next);
    setCustomQuantities((prev) => ({ ...prev, [id]: qty }));
  };
  const clearQuantity = (id: string) => {
    setCustomQuantities((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const customTotal = useMemo(() => {
    return effectiveCustomIds.reduce((sum, id) => {
      const item = customPrintItems.find((entry) => entry.id === id);
      const price = parsePriceValue(item?.price);
      if (!price) return sum;
      const qty = getQuantity(id);
      return sum + price * qty;
    }, 0);
  }, [effectiveCustomIds, customQuantities]);
  const proNoteText = isPro
    ? getValue("services_pro_note_text", "MEDIA COVERAGE REELS & TIKTOK").trim()
    : "";
  const contactHref = isCustom
    ? buildContactHref({ printIds: effectiveCustomIds })
    : buildContactHref({ packageId: pkg.id, printIds: sharedPrintIds });

  const featureItems = featureList.map((feature, index) => {
    const fieldKey = `${baseKey}_feature_${index + 1}`;
    const value = asText(contentMap[fieldKey] ?? feature, "");
    return { index, feature, fieldKey, value, isSynthetic: false };
  });

  const orderedFeatures = (() => {
    if (!isPro) return featureItems;
    const items = [...featureItems];
    const isMediaLine = (text: string) =>
      /media/i.test(text) || text.includes("ريلز") || text.includes("تيك");

    const moveItem = (predicate: (text: string) => boolean, toIndex: number) => {
      const fromIndex = items.findIndex((item) => predicate(item.value));
      if (fromIndex === -1) return;
      const [item] = items.splice(fromIndex, 1);
      items.splice(Math.min(toIndex, items.length), 0, item);
    };

    moveItem((text) => text.includes("عدد غير محدود"), 0);

    const mediaIndex = items.findIndex((item) => isMediaLine(item.value));
    if (mediaIndex !== -1) {
      moveItem((text) => isMediaLine(text), 1);
    } else if (proNoteText) {
      items.splice(Math.min(1, items.length), 0, {
        index: -1,
        feature: proNoteText,
        fieldKey: "services_pro_note_text",
        value: proNoteText,
        isSynthetic: true,
      });
    }

    return items;
  })();

  const Icon =
    isCustom ? (
      <Receipt className="package-icon text-primary" />
    ) : kind === "wedding" || kind === "prints" ? (
      <CoupleIcon className="package-icon text-primary" />
    ) : kind === "addon" ? (
      <PlusCircle className="package-icon text-primary" />
    ) : (
      <Camera className="package-icon text-primary" />
    );

  const waInquiryText = getValue("services_whatsapp_inquiry_text", "حابب استفسر ❤️");
  const waInquiryHref = buildWhatsAppHref(waInquiryText, whatsappNumber);
  const handleCardClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!isCollapsible || isExpanded) return;
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded(true);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isCollapsible || isExpanded) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsExpanded(true);
    }
  };

  const handleAddFeatureLine = () => {
    if (!inlineEditEnabled || addFeatureMutation.isPending) return;
    const id = Number(pkg.id);
    if (!Number.isFinite(id)) {
      toast.error("لا يمكن إضافة سطر جديد لهذه الباقة");
      return;
    }
    const current = Array.isArray(pkg.features) ? pkg.features : [];
    const next = [...current, "سطر جديد"];
    addFeatureMutation.mutate({ id, features: next });
  };

  return (
    <div
      style={getOffsetStyle(pkg.offsetX, pkg.offsetY)}
      className={isCustom ? "md:col-span-2" : undefined}
    >
      <div
        role={isCollapsible ? "button" : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        aria-expanded={isCollapsible ? isExpanded : undefined}
        onClickCapture={handleCardClickCapture}
        onKeyDown={handleCardKeyDown}
        className={[
          "relative overflow-visible bg-card border transition-all duration-300 group premium-border services-card",
          isSessionCard ? "p-6 md:p-7" : "p-7 md:p-8",
          isCustom ? "custom-package" : "",
          isCollapsible && !isExpanded ? "full-day-collapsed" : "",
          popular ? "popular-card" : "",
          weddingTone
            ? "border-primary/45 shadow-[0_0_70px_rgba(255,200,80,0.12)] hover:shadow-[0_0_95px_rgba(255,200,80,0.18)] hover:-translate-y-2"
            : popular || isPro
            ? "border-primary/30 shadow-lg shadow-primary/15 hover:-translate-y-2"
            : "border-white/10 hover:border-primary/35 hover:-translate-y-2 hover:shadow-[0_25px_80px_rgba(0,0,0,0.55)]",
        ].join(" ")}
      >
      {popularTopCenter ? (
        <div className="popular-badge popular-badge--top">
          <EditableText
            value={contentMap[`${baseKey}_popular_label`]}
            fallback="الأكثر طلباً"
            fieldKey={`${baseKey}_popular_label`}
            category="services"
            label={`شارة الأكثر طلباً - ${pkg.name}`}
          />
        </div>
      ) : null}

      {isSessionCard ? (
        <div className="price-corner package-price">
          <EditableText
            value={contentMap[`${baseKey}_price`]}
            fallback={pkg.price}
            fieldKey={`${baseKey}_price`}
            category="services"
            label={`سعر الباقة ${pkg.name}`}
          />
          {(contentMap[`${baseKey}_price_note`] ?? pkg.priceNote) ? (
            <span className="price-corner-note">
              <EditableText
                value={contentMap[`${baseKey}_price_note`]}
                fallback={pkg.priceNote ?? ""}
                fieldKey={`${baseKey}_price_note`}
                category="services"
                label={`ملاحظة السعر ${pkg.name}`}
                multiline
              />
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={[
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          weddingTone || popular || isPro ? "opacity-40" : "opacity-0 group-hover:opacity-100",
          "bg-[radial-gradient(circle_at_30%_20%,rgba(255,200,80,0.14),transparent_60%)]",
        ].join(" ")}
      />

      <div className={["relative z-10", isCustom ? "custom-body" : ""].join(" ")}>
        <div
          className={[
            isSessionCard ? "flex flex-col gap-3 mb-4" : "flex flex-col gap-4 mb-6",
            isCustom
              ? "items-start text-right sm:flex-row sm:items-start sm:justify-between"
              : "sm:flex-row sm:items-start sm:justify-between",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border border-white/10 bg-black/15 backdrop-blur-md flex items-center justify-center">
              {Icon}
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <div className="flex flex-col items-start gap-2">
                  <h3
                    className={[
                      "text-xl md:text-2xl font-bold leading-tight",
                      vip ? "text-primary" : "",
                      isCustom ? "custom-title" : "",
                    ].join(" ")}
                  >
                    <EditableText
                      value={contentMap[`${baseKey}_name`]}
                      fallback={isCustom ? "خصص باقتك علي زوقك" : pkg.name}
                      fieldKey={`${baseKey}_name`}
                      category="services"
                      label={`اسم الباقة ${pkg.name}`}
                    />
                  </h3>
                  {isCustom ? (
                    <div className="custom-line custom-line--compact">
                      <EditableText
                        value={contentMap[`${baseKey}_price`]}
                        fallback={pkg.price}
                        fieldKey={`${baseKey}_price`}
                        category="services"
                        label={`سعر الباقة ${pkg.name}`}
                        className="custom-note-text package-price"
                      />
                    </div>
                  ) : null}
                  {isCustom && customDescription ? (
                    <div className="custom-line custom-line--compact">
                      <EditableText
                        value={contentMap[`${baseKey}_description`]}
                        fallback={isCustom ? "خصص باقتك علي زوقك" : customDescription}
                        fieldKey={`${baseKey}_description`}
                        category="services"
                        label={`وصف الباقة ${pkg.name}`}
                        multiline
                        className="custom-description"
                      />
                    </div>
                  ) : null}
                </div>
                {vip && (
                  <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] md:text-xs font-semibold tracking-wide rounded-full border border-amber-300/50 text-amber-100/90 bg-[linear-gradient(135deg,rgba(255,215,140,0.22),rgba(255,180,60,0.12))] shadow-[0_10px_28px_rgba(255,200,80,0.18)] backdrop-blur-sm relative md:-translate-y-[1px]">
                    <EditableText
                      value={contentMap[`${baseKey}_vip_label`]}
                      fallback="VIP PLUS"
                      fieldKey={`${baseKey}_vip_label`}
                      category="services"
                      label={`شارة VIP - ${pkg.name}`}
                    />
                  </span>
                )}
                {badgeValue && !vip ? (
                  <span className="pro-badge">
                    <EditableText
                      value={contentMap[`${baseKey}_badge`]}
                      fallback={badgeValue ?? ""}
                      fieldKey={`${baseKey}_badge`}
                      category="services"
                      label={`شارة الباقة ${pkg.name}`}
                    />
                  </span>
                ) : null}
                {popular && !popularTopCenter ? (
                  <span className="popular-badge">
                    <EditableText
                      value={contentMap[`${baseKey}_popular_label`]}
                      fallback="الأكثر طلباً"
                      fieldKey={`${baseKey}_popular_label`}
                      category="services"
                      label={`شارة الأكثر طلباً - ${pkg.name}`}
                    />
                  </span>
                ) : null}
              </div>
              {!isCustom ? (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  <EditableText
                    value={contentMap[`${baseKey}_description`]}
                    fallback={pkg.description}
                    fieldKey={`${baseKey}_description`}
                    category="services"
                    label={`وصف الباقة ${pkg.name}`}
                    multiline
                  />
                </p>
              ) : null}
          </div>
          </div>
        </div>

        <div
          className={[
            "full-day-body",
            isCollapsible ? "full-day-body--collapsible" : "",
            isCollapsible && !isExpanded ? "full-day-body--collapsed" : "",
            isAddon ? "addon-body" : "",
          ].join(" ")}
        >
          <div className="text-right sm:text-left">
            {isCustom ? (
              <div className="custom-line custom-line--compact">
                <EditableText
                  value={contentMap.services_custom_prints_note}
                  fallback="المطبوعات ليست اجباري يمكن الاستغناء عنها والحجز بدونها"
                  fieldKey="services_custom_prints_note"
                  category="services"
                  label="تنبيه المطبوعات - خصص باقتك"
                  multiline
                  className="custom-note-text"
                />
              </div>
            ) : !isSessionCard ? (
              <>
                <div className="text-primary font-bold text-2xl md:text-3xl leading-none package-price">
                  <EditableText
                    value={contentMap[`${baseKey}_price`]}
                    fallback={pkg.price}
                    fieldKey={`${baseKey}_price`}
                    category="services"
                    label={`سعر الباقة ${pkg.name}`}
                  />
                </div>
                {(contentMap[`${baseKey}_price_note`] ?? pkg.priceNote) ? (
                  <div className={["text-xs mt-2", vip ? "text-primary/90" : "text-muted-foreground"].join(" ")}>
                    <EditableText
                      value={contentMap[`${baseKey}_price_note`]}
                      fallback={pkg.priceNote}
                      fieldKey={`${baseKey}_price_note`}
                      category="services"
                      label={`ملاحظة السعر ${pkg.name}`}
                      multiline
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

        {orderedFeatures.length && !isCustom ? (
          <ul className="space-y-3 mb-6 md:mb-7">
            {orderedFeatures.map((item, i) => {
              const featureValue = item.value;
              const showProTag = false;
              const showMediaTag = featureValue.includes("MEDIA COVERAGE REELS");
              const label = item.isSynthetic
                ? "ملاحظة برو"
                : `ميزة ${item.index + 1} - ${pkg.name}`;
              return (
                <li key={item.fieldKey ?? i} className="flex items-start text-sm">
                  <Check size={16} className="text-primary ml-2 mt-1 flex-shrink-0" />
                  <span className="text-foreground/90 leading-relaxed font-medium">
                    <EditableText
                      value={contentMap[item.fieldKey]}
                      fallback={item.feature}
                      fieldKey={item.fieldKey}
                      category="services"
                      label={label}
                      multiline
                    />
                    {showProTag ? (
                      <span className="pro-note-tag">
                        <EditableText
                          value={contentMap.services_pro_tag}
                          fallback="مصور خاص"
                          fieldKey="services_pro_tag"
                          category="services"
                          label="وسم مصور خاص"
                        />
                      </span>
                    ) : null}
                    {showMediaTag ? (
                      <span className="pro-note-tag media-tag-glow">
                        <EditableText
                          value={contentMap.services_media_tag}
                          fallback="مصور خاص"
                          fieldKey="services_media_tag"
                          category="services"
                          label="وسم مصور خاص (إعلامي)"
                        />
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {inlineEditEnabled && !isCustom ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={handleAddFeatureLine}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] text-white/90 hover:bg-black/60 transition"
              disabled={addFeatureMutation.isPending}
            >
              <Plus className="w-3 h-3" />
              إضافة سطر جديد
            </button>
          </div>
        ) : null}

        {isCustom ? (
          <div className="custom-builder">
            <div className="custom-hint">
              علّم على الأيقونة بجانب اختيارك والسعر هيتجمعلك تحت تلقائي
            </div>
            {customPrintGroups.map((group, index) => (
              <div key={group.id} className="custom-group">
                <div className="custom-group-title">
                  <span className="custom-step-tag">الخطوة {index + 1}</span>
                  {group.title}
                  {group.id === "vip-bags" ? (
                    <span className="custom-vip-tag">VIP</span>
                  ) : null}
                </div>
                <div className="custom-group-items">
                  {group.items.map((item) => {
                    const checked = effectiveCustomIds.includes(item.id);
                    const quantity = getQuantity(item.id);
                    const basePrice = parsePriceValue(item.price);
                    const unit = extractPriceUnit(item.price);
                    const computedPrice =
                      basePrice !== null ? `${formatPriceNumber(basePrice * quantity)}${unit}` : item.price;
                    const toggleItem = (force?: boolean) => {
                      const next = new Set(effectiveCustomIds);
                      const shouldSelect = force ?? !next.has(item.id);
                      if (shouldSelect) {
                        next.add(item.id);
                        if (!customQuantities[item.id]) {
                          setQuantity(item.id, 1);
                        }
                      } else {
                        next.delete(item.id);
                        clearQuantity(item.id);
                      }
                      setSelectedCustomIds(Array.from(next));
                    };
                    return (
                      <div key={item.id} className="custom-item">
                        <Checkbox
                          checked={checked}
                          className="custom-checkbox"
                          onCheckedChange={(value) => {
                            const isChecked = value === true;
                            toggleItem(isChecked);
                          }}
                        />
                        <div
                          className="custom-item-label"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleItem()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleItem();
                            }
                          }}
                        >
                          <div className="custom-item-title">{item.label}</div>
                          {checked ? (
                            <div className="custom-qty" onClick={(event) => event.stopPropagation()}>
                              <span className="custom-qty-label">
                                <span className="custom-qty-dot" />
                                اختر العدد
                              </span>
                              <div className="custom-qty-controls">
                                <button
                                  type="button"
                                  className="custom-qty-btn"
                                  onClick={() => setQuantity(item.id, quantity - 1)}
                                  disabled={quantity <= 1}
                                >
                                  -
                                </button>
                                <span className="custom-qty-value">{quantity}</span>
                                <button
                                  type="button"
                                  className="custom-qty-btn"
                                  onClick={() => setQuantity(item.id, quantity + 1)}
                                  disabled={quantity >= 5}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="custom-item-price tabular-nums package-price"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleItem()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleItem();
                            }
                          }}
                        >
                          <span>{checked && quantity > 1 ? computedPrice : item.price}</span>
                          {checked && quantity > 1 ? (
                            <span className="custom-item-mult">x{quantity}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="custom-total-row">
              <div className="custom-total">
                📦 إجمالي السعر = {customTotal ? `${formatPriceNumber(customTotal)}ج` : "—"}
              </div>
            </div>
          </div>
        ) : null}

        {isCustom ? (
          <div className="custom-cta">
            <Link href={contactHref} className="w-full">
              <Button
                variant="outline"
                className="custom-cta-btn border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none cta-glow cta-border-glow cta-size w-full"
              >
                <EditableText
                  value={contentMap.services_custom_cta}
                  fallback="احجز الآن"
                  fieldKey="services_custom_cta"
                  category="services"
                  label="زر احجز الآن (خصص باقتك)"
                />
                <ArrowLeft className="mr-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className={isSessionCard ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
            <Link href={contactHref}>
              <Button
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-border-glow cta-size"
              >
                <EditableText
                  value={contentMap.services_primary_cta}
                  fallback={ctaTexts.bookNow ?? "احجز الآن"}
                  fieldKey="services_primary_cta"
                  category="services"
                  label="زر احجز الآن (الباقات)"
                />
              </Button>
            </Link>

            <Link href="/package-details">
              <Button
                variant="outline"
                className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none cta-glow cta-border-glow cta-size"
              >
                <EditableText
                  value={contentMap.services_secondary_cta}
                  fallback="اسأل عن التفاصيل"
                  fieldKey="services_secondary_cta"
                  category="services"
                  label="زر اسأل عن التفاصيل"
                />
                <ArrowLeft className="mr-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {vip && (
          <div className="mt-5 text-xs vip-note">
            <EditableText
              value={contentMap.services_vip_note}
              fallback="* تسعير VIP Plus بيتم تحديده حسب تفاصيل اليوم والمكان وعدد ساعات التغطية."
              fieldKey="services_vip_note"
              category="services"
              label="ملاحظة VIP"
              multiline
            />
          </div>
        )}
        </div>

        {isCollapsible && !isExpanded ? (
          <>
            <div className={["full-day-fade", isAddon ? "addon-fade" : ""].join(" ")} />
            {isAddon ? (
              <div className="addon-hint">اضغط لاظهار باقي التفاصيل</div>
            ) : (
              <div className="full-day-hint">
                <span className="full-day-hint-pill">
                  <ArrowDown className="w-4 h-4" />
                  اضغط لعرض باقي التفاصيل
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>
      </div>
    </div>
  );
}

function MonthlyOfferCard({
  contentMap,
  contactHref,
}: {
  contentMap: Record<string, string>;
  contactHref: string;
}) {
  const getValue = (key: string, fallback = "") =>
    asText(contentMap[key] as string | undefined, fallback);
  const featureList = [
    { key: "services_monthly_offer_feature_1", fallback: "ألبوم كبير مقاس 80x30 عدد من 20 ل 40 صورة" },
    { key: "services_monthly_offer_feature_2", fallback: "تابلوه أنيميشن كبير 70x50 جودة عالية مع طبقة حماية" },
    { key: "services_monthly_offer_feature_3", fallback: "ألبوم آخر مصغر أنيق او كروت صغيرة لصور السيشن" },
    { key: "services_monthly_offer_feature_4", fallback: "ساعة حائط كبيرة مصممة بصوركم الخاصة" },
    { key: "services_monthly_offer_feature_5", fallback: "REELS & TIKTOK" },
    { key: "services_monthly_offer_feature_6", fallback: "عدد غير محدود من الصور" },
    { key: "services_monthly_offer_feature_7", fallback: "وقت مفتوح" },
  ];

  const badgeText = (getValue("services_monthly_offer_badge", "خصم 🔥") ?? "").trim();

  return (
    <div className="monthly-offer-card">
      <div className="monthly-offer-sparkle" />

      {badgeText ? (
        <div className="monthly-offer-stamp">
          <EditableText
            value={getValue("services_monthly_offer_badge")}
            fallback="خصم 🔥"
            fieldKey="services_monthly_offer_badge"
            category="services"
            label="شارة عرض الشهر"
          />
        </div>
      ) : null}

      <div className="monthly-offer-top">
        <div className="monthly-offer-header">
          <h3 className="monthly-offer-title">
            <EditableText
              value={getValue("services_monthly_offer_title")}
              fallback="العرض الحصري"
              fieldKey="services_monthly_offer_title"
              category="services"
              label="عنوان عرض الشهر"
            />
          </h3>
          <p className="monthly-offer-subtitle">
            <EditableText
              value={getValue("services_monthly_offer_subtitle")}
              fallback="عرض حصري لفترة محدودة فقط"
              fieldKey="services_monthly_offer_subtitle"
              category="services"
              label="وصف عرض الشهر"
              multiline
            />
          </p>
        </div>

        <div className="monthly-offer-price">
          <div className="monthly-offer-price-label">
            <EditableText
              value={getValue("services_monthly_offer_price_label")}
              fallback="السعر الخاص"
              fieldKey="services_monthly_offer_price_label"
              category="services"
              label="عنوان سعر عرض الشهر"
            />
          </div>
          <div className="monthly-offer-price-value">
            <EditableText
              value={getValue("services_monthly_offer_price")}
              fallback="$4500"
              fieldKey="services_monthly_offer_price"
              category="services"
              label="سعر عرض الشهر"
            />
          </div>
        </div>
      </div>

      <ul className="monthly-offer-features">
        {featureList.map((feature) => (
          <li key={feature.key} className="monthly-offer-feature">
            <span className="monthly-offer-bullet" />
            <span>
              <EditableText
                value={getValue(feature.key)}
                fallback={feature.fallback}
                fieldKey={feature.key}
                category="services"
                label={`ميزة عرض الشهر - ${feature.key}`}
                multiline
              />
            </span>
          </li>
        ))}
      </ul>

      <div className="monthly-offer-cta-row">
        <Link href={contactHref}>
          <Button
            variant="outline"
            className="monthly-offer-book"
          >
            <EditableText
              value={getValue("services_monthly_offer_cta")}
              fallback="احجز الآن"
              fieldKey="services_monthly_offer_cta"
              category="services"
              label="زر احجز الآن (عرض الشهر)"
            />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function QuickNav({
  active,
  onJump,
  stuck,
  navRef,
  contentMap,
}: {
  active: string;
  onJump: (id: string) => void;
  stuck: boolean;
  navRef: React.Ref<HTMLDivElement>;
  contentMap: Record<string, string>;
}) {
  const items = [
    { id: "sessions", labelKey: "services_sessions_title", fallback: pageTexts.services.sessionsTitle },
    { id: "wedding", labelKey: "services_wedding_title", fallback: pageTexts.services.weddingTitle },
    { id: "addons", labelKey: "services_addons_title", fallback: pageTexts.services.addonsTitle },
    { id: "prints", labelKey: "services_prints_title", fallback: "المطبوعات" },
  ];

  return (
    <div
      className={["z-40 quicknav-float", stuck ? "quicknav-stuck" : ""].join(" ")}
      style={stuck ? { top: "calc(var(--nav-offset, 96px) - 6px)" } : undefined}
      ref={navRef}
    >
      <div className="container mx-auto px-4 py-2 sm:py-3">
        <div className="quicknav-row flex items-center gap-1.5 overflow-x-auto scrollbar-hide justify-start md:justify-center snap-x snap-mandatory -mx-4 px-4">
          {items.map((it) => {
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => onJump(it.id)}
                className={[
                  "shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold transition-all duration-200 rounded-full tap-target border quicknav-btn snap-start",
                  isActive ? "quicknav-btn--active" : "quicknav-btn--idle",
                ].join(" ")}
              >
                <EditableText
                  value={contentMap[it.labelKey]}
                  fallback={it.fallback}
                  fieldKey={it.labelKey}
                  category="services"
                  label={`عنوان التنقل ${it.fallback}`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Services() {
  const { contactInfo } = useContactData();
  const content = useContentData();
  const { enabled: inlineEditEnabled } = useInlineEditMode();
  const utils = trpc.useUtils();
  const addAddonFeatureMutation = trpc.packages.update.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة سطر جديد");
      utils.packages.getAll.invalidate();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sitePackagesUpdatedAt", String(Date.now()));
      }
    },
    onError: (error) => toast.error(error.message),
  });
  const {
    sessionPackages,
    sessionPackagesWithPrints,
    weddingPackages,
    additionalServices,
  } = usePackagesData();
  const customPackage = useMemo(() => {
    const all = [
      ...sessionPackages,
      ...sessionPackagesWithPrints,
      ...weddingPackages,
      ...additionalServices,
    ];
    return all.find(isCustomPackage);
  }, [sessionPackages, sessionPackagesWithPrints, weddingPackages, additionalServices]);
  const addonsPackages = useMemo(
    () => additionalServices.filter((pkg) => pkg.id !== "special-montage-design"),
    [additionalServices]
  );
  const handleAddAddonLine = (service: any) => {
    if (!inlineEditEnabled || addAddonFeatureMutation.isPending) return;
    const id = Number(service?.id);
    if (!Number.isFinite(id)) {
      toast.error("لا يمكن إضافة سطر جديد لهذا الكرت");
      return;
    }
    const current = Array.isArray(service?.features) ? service.features : [];
    const next = [...current, "سطر جديد"];
    addAddonFeatureMutation.mutate({ id, features: next });
  };
  const hasProSession = useMemo(
    () => sessionPackages.some((pkg: any) => pkg?.id === "session-2"),
    [sessionPackages]
  );
  const contentMap = content.contentMap ?? {};
  const legacyServicesSubtitle = "اختار الباقة المناسبة… وكلها بتتعمل بنفس الجودة والاهتمام بالتفاصيل";
  const rawServicesSubtitle = asText(
    contentMap.services_subtitle ?? pageTexts.services.subtitle ?? "",
    ""
  ).trim();
  const servicesSubtitleText = rawServicesSubtitle === legacyServicesSubtitle ? "" : rawServicesSubtitle;
  const [prefillPrintIds, setPrefillPrintIds] = useState<string[]>(() => readStoredPrintIds());
  const [activeSection, setActiveSection] = useState("sessions");
  const [isNavStuck, setIsNavStuck] = useState(false);
  const [showMonthlyOffer, setShowMonthlyOffer] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const navAnchorRef = useRef<HTMLDivElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);
  const monthlyContactHref = buildContactHref({});

  const ids = useMemo(() => ["sessions", "wedding", "addons", "prints"], []);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const offset = getSectionScrollMarginPx();
    const top = el.getBoundingClientRect().top + window.scrollY - offset;

    setActiveSection(id);
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "smooth" });
  };

  useEffect(() => {
    let raf = 0;

    const updateMetrics = () => {
      const navEl = navRef.current;
      if (navEl) setNavHeight(navEl.offsetHeight);
    };

    updateMetrics();

    const computeActiveByScroll = () => {
      const offset = getSectionScrollMarginPx() + 8;
      const y = window.scrollY + offset;

      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= y) current = id;
      }
      setActiveSection(current);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        computeActiveByScroll();
        const navEl = navRef.current;
        const anchor = navAnchorRef.current;
        if (navEl && anchor) {
          const offset = getNavOffsetPx() - 2;
          const anchorTop = anchor.getBoundingClientRect().top;
          setIsNavStuck(anchorTop <= offset);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("resize", updateMetrics);
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", updateMetrics);
    };
  }, [ids]);

  const sectionStyle = useMemo(() => {
    return { scrollMarginTop: `${getSectionScrollMarginPx()}px` } as React.CSSProperties;
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div
        className="border-y border-primary/20 bg-[linear-gradient(90deg,rgba(255,200,80,0.16),rgba(255,200,80,0.05),transparent)]"
        style={{ marginTop: "var(--nav-offset, 96px)" }}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-sm text-foreground/90">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary">
              <Gift className="w-4 h-4" />
              <EditableText
                value={contentMap.services_promo_badge}
                fallback="هديّة"
                fieldKey="services_promo_badge"
                category="services"
                label="شارة العرض"
              />
            </span>
            <span>
              <EditableText
                value={contentMap.services_promo_text}
                fallback="عند الحجز اسأل عن هديتك"
                fieldKey="services_promo_text"
                category="services"
                label="نص العرض"
              />
            </span>
            <ArrowDown className="promo-arrow w-4 h-4 text-primary/70" />
          </div>
        </div>
      </div>

      <header className="pt-7 md:pt-10 pb-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-background/35 to-background" />
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_20%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none hero-grain opacity-[0.10]" />

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-black/20 backdrop-blur-md mb-4 rounded-full">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm text-foreground/80">
              <EditableText
                value={contentMap.services_kicker}
                fallback="كلها بتتعمل بنفس الجودة والاهتمام بالتفاصيل"
                fieldKey="services_kicker"
                category="services"
                label="عنوان صغير (الخدمات)"
              />
            </span>
          </div>

          <h1 className="text-4xl md:text-7xl font-bold mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EditableText
              value={contentMap.services_title}
              fallback={pageTexts.services.title}
              fieldKey="services_title"
              category="services"
              label="عنوان صفحة الخدمات"
            />
          </h1>
          {servicesSubtitleText ? (
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed services-subtitle-glow">
              <EditableText
                value={contentMap.services_subtitle}
                fallback={pageTexts.services.subtitle}
                fieldKey="services_subtitle"
                category="services"
                label="وصف صفحة الخدمات"
                multiline
              />
            </p>
          ) : null}

        </div>
      </header>

      <div ref={navAnchorRef} className="h-px" aria-hidden="true" />
      {isNavStuck ? <div style={{ height: navHeight }} aria-hidden="true" /> : null}
      <QuickNav
        active={activeSection}
        onJump={jumpTo}
        stuck={isNavStuck}
        navRef={navRef}
        contentMap={contentMap}
      />

      <section id="sessions" className="pt-6 pb-10 md:pt-10 md:pb-14" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_sessions_title}
                fallback={pageTexts.services.sessionsTitle}
                fieldKey="services_sessions_title"
                category="services"
                label="عنوان قسم السيشن"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_sessions_subtitle}
                fallback="تفاصيل تستاهل وقتك"
                fieldKey="services_sessions_subtitle"
                category="services"
                label="وصف قسم السيشن"
              />
            }
            subtitleClassName="section-subtitle-glow"
            icon={<Camera className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {sessionPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg as any}
                kind="session"
                whatsappNumber={contactInfo.whatsappNumber}
                contentMap={contentMap}
                preselectedPrintIds={prefillPrintIds}
                onPreselectedPrintIdsChange={setPrefillPrintIds}
              />
            ))}

          </div>
        </div>
      </section>

      <section
        id="wedding"
        className="py-10 md:py-16 bg-card border-y border-white/5"
        style={sectionStyle}
      >
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_wedding_title}
                fallback={pageTexts.services.weddingTitle}
                fieldKey="services_wedding_title"
                category="services"
                label="عنوان قسم الزفاف"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_wedding_subtitle}
                fallback="تغطية يوم كامل • فريق • تفاصيل • تسليم سريع"
                fieldKey="services_wedding_subtitle"
                category="services"
                label="وصف قسم الزفاف"
              />
            }
            icon={<Heart className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {weddingPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg as any}
                kind="wedding"
                whatsappNumber={contactInfo.whatsappNumber}
                contentMap={contentMap}
                preselectedPrintIds={prefillPrintIds}
                onPreselectedPrintIdsChange={setPrefillPrintIds}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="addons" className="py-10 md:py-16" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <EditableText
                value={contentMap.services_addons_title}
                fallback={pageTexts.services.addonsTitle}
                fieldKey="services_addons_title"
                category="services"
                label="عنوان قسم الإضافات"
              />
            }
            subtitle={
              <EditableText
                value={contentMap.services_addons_subtitle}
                fallback="اختيارات إضافية تزود التجربة جمال"
                fieldKey="services_addons_subtitle"
                category="services"
                label="وصف قسم الإضافات"
              />
            }
            icon={<PlusCircle className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {addonsPackages.map((service) => (
              <div key={service.id} style={getOffsetStyle(service.offsetX, service.offsetY)}>
                <div className="relative bg-card p-7 md:p-8 border border-white/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 premium-border group overflow-hidden services-addon-card">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,200,80,0.12),transparent_60%)]" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold flex flex-wrap items-center gap-2">
                      {service.emoji ? <span className="text-base">{service.emoji}</span> : null}
                      <EditableText
                        value={contentMap[`package_${service.id}_name`]}
                        fallback={service.name}
                        fieldKey={`package_${service.id}_name`}
                        category="services"
                        label={`اسم الإضافة ${service.name}`}
                      />
                      {["wedding-party", "media-coverage", "promo-video"].includes(service.id) ? (
                        <span className="addon-special-tag">مصور خاص</span>
                      ) : null}
                    </h3>
                    <span className="text-primary font-bold">
                      <EditableText
                        value={contentMap[`package_${service.id}_price`]}
                        fallback={service.price}
                        fieldKey={`package_${service.id}_price`}
                        category="services"
                        label={`سعر الإضافة ${service.name}`}
                      />
                    </span>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                    <EditableText
                      value={contentMap[`package_${service.id}_description`]}
                      fallback={service.description}
                      fieldKey={`package_${service.id}_description`}
                      category="services"
                      label={`وصف الإضافة ${service.name}`}
                      multiline
                    />
                  </p>
                  <ul className="space-y-3">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-sm">
                        <Check size={14} className="text-primary ml-2 mt-1 flex-shrink-0" />
                        <span className="text-foreground/90 font-medium">
                          <EditableText
                            value={contentMap[`package_${service.id}_feature_${i + 1}`]}
                            fallback={feature}
                            fieldKey={`package_${service.id}_feature_${i + 1}`}
                            category="services"
                            label={`ميزة الإضافة ${i + 1} - ${service.name}`}
                            multiline
                          />
                        </span>
                      </li>
                    ))}
                  </ul>

                  {inlineEditEnabled ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleAddAddonLine(service)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] text-white/90 hover:bg-black/60 transition"
                        disabled={addAddonFeatureMutation.isPending}
                      >
                        <Plus className="w-3 h-3" />
                        إضافة سطر جديد
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-7">
                    <PrimaryCTA
                      whatsappNumber={contactInfo.whatsappNumber}
                      label={
                        <EditableText
                          value={contentMap.services_primary_cta}
                          fallback={ctaTexts.bookNow ?? "احجز الآن"}
                          fieldKey="services_primary_cta"
                          category="services"
                          label="زر احجز الآن (الإضافات)"
                        />
                      }
                    />
                  </div>

                </div>
              </div>
            </div>
            ))}
          </div>

        </div>
      </section>

      <section id="prints" className="py-10 md:py-16" style={sectionStyle}>
        <div className="container mx-auto px-4">
          <SectionHeader
            title={
              <span className="prints-title-wrap">
                <EditableText
                  value={contentMap.services_prints_title}
                  fallback="المطبوعات"
                  fieldKey="services_prints_title"
                  category="services"
                  label="عنوان قسم المطبوعات"
                />
                <span className="prints-optional-tag">(اختياري)</span>
              </span>
            }
            subtitle={
              <EditableText
                value={contentMap.services_prints_subtitle}
                fallback="اختار العناصر اللي تناسبك واتحسب الإجمالي فوراً"
                fieldKey="services_prints_subtitle"
                category="services"
                label="وصف قسم المطبوعات"
              />
            }
            icon={<Receipt className="w-4 h-4 text-primary" />}
          />

          <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto">
            {customPackage ? (
              <div className="flex flex-col items-center gap-6">
                <PackageCard
                  pkg={customPackage as any}
                  kind="addon"
                  whatsappNumber={contactInfo.whatsappNumber}
                  contentMap={contentMap}
                  preselectedPrintIds={prefillPrintIds}
                  onPreselectedPrintIdsChange={setPrefillPrintIds}
                />

                <div className="monthly-offer-cta">
                  <div className="monthly-offer-hint">
                    <EditableText
                      value={contentMap.services_monthly_offer_hint}
                      fallback="اضغط هنا 👇"
                      fieldKey="services_monthly_offer_hint"
                      category="services"
                      label="تلميح عرض الشهر"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="monthly-offer-btn border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none cta-glow cta-border-glow cta-size"
                    onClick={() => setShowMonthlyOffer((prev) => !prev)}
                    aria-expanded={showMonthlyOffer}
                  >
                    <span className="monthly-offer-btn-text">
                      <EditableText
                        value={contentMap.services_monthly_offer_button}
                        fallback="خصم🔥"
                        fieldKey="services_monthly_offer_button"
                        category="services"
                        label="زر خصم (عرض الشهر)"
                      />
                    </span>
                  </Button>

                  {showMonthlyOffer ? (
                    <div className="monthly-offer-panel">
                      <MonthlyOfferCard
                        contentMap={contentMap}
                        contactHref={monthlyContactHref}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-8 md:pb-12">
        <div className="text-center text-muted-foreground mt-10 text-sm leading-relaxed space-y-2">
          <div>
            <EditableText
              value={contentMap.services_note_1}
              fallback="اطمئن التزامي في المواعيد وجودة التسليم جزء من شغلي، مش ميزة إضافية."
              fieldKey="services_note_1"
              category="services"
              label="ملاحظة الخدمات 1"
              multiline
            />
          </div>
          <div>
            <EditableText
              value={contentMap.services_note_2}
              fallback="* الأسعار قد تختلف حسب الموقع والتفاصيل الإضافية. غير شامل رسوم اللوكيشن."
              fieldKey="services_note_2"
              category="services"
              label="ملاحظة الخدمات 2"
              multiline
            />
          </div>
          <div>
            <EditableText
              value={contentMap.services_note_3}
              fallback="حجز اليوم بالأسبقية — Full Day لو اليوم محجوز لعريس تاني قبلك بنعتذر."
              fieldKey="services_note_3"
              category="services"
              label="ملاحظة الخدمات 3"
              multiline
            />
          </div>
          <div>
            <EditableText
              value={contentMap.services_note_4}
              fallback="الحجز يتم بتأكيد على واتساب + ديبوزيت تأكيد."
              fieldKey="services_note_4"
              category="services"
              label="ملاحظة الخدمات 4"
              multiline
            />
          </div>
          <div>
            <EditableText
              value={contentMap.services_note_5}
              fallback="الاستفسار فقط لا يعتبر حجزًا ويتم إلغاؤه تلقائيًا بدون تأكيد."
              fieldKey="services_note_5"
              category="services"
              label="ملاحظة الخدمات 5"
              multiline
            />
          </div>
          <div>
            <EditableText
              value={contentMap.services_note_6}
              fallback="أقدر أساعدك في أي شيء خارج التصوير يوم الزفاف (خدمات ونصائح مجانية)."
              fieldKey="services_note_6"
              category="services"
              label="ملاحظة الخدمات 6"
              multiline
            />
          </div>
        </div>
      </div>

      <style>{servicesStyles}</style>

      <Footer />
    </div>
  );
}

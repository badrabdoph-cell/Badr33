import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FieldErrors, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Send,
  Sparkles,
  Copy,
  ChevronDown,
  Receipt,
  Gem,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  pageTexts,
  customPrintGroups,
} from "@/config/siteConfig";
import { useContactData, usePackagesData, useContentData } from "@/hooks/useSiteData";
import { EditableContactText, EditableLinkIcon, EditableText } from "@/components/InlineEdit";

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "اكتب الاسم" })
    .min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z
    .string()
    .min(10, { message: "اكتب رقم الهاتف" })
    .regex(/^[0-9+\s()-]+$/, { message: "اكتب رقم صحيح (أرقام فقط)" }),
  date: z.string().min(1, { message: "اختر التاريخ" }),
  packageId: z.string().min(1, { message: "اختر الباقة الأساسية" }),
  addonIds: z.array(z.string()).optional(),
  printIds: z.array(z.string()).optional(),
});

const PRINTS_STORAGE_KEY = "prefill_print_ids";

function readStoredPrintIds(validIds: Set<string>) {
  try {
    const raw = sessionStorage.getItem(PRINTS_STORAGE_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((id) => typeof id === "string" && validIds.has(id));
  } catch {
    return [] as string[];
  }
}

function toEnglishDigits(input: string) {
  const ar = "٠١٢٣٤٥٦٧٨٩";
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return input
    .split("")
    .map((ch) => {
      const iAr = ar.indexOf(ch);
      if (iAr !== -1) return String(iAr);
      const iFa = fa.indexOf(ch);
      if (iFa !== -1) return String(iFa);
      return ch;
    })
    .join("");
}

function normalizePhone(raw: string) {
  let v = toEnglishDigits(raw);
  v = v.replace(/[^\d+]/g, "");
  if (v.includes("+") && !v.startsWith("+")) v = v.replace(/\+/g, "");
  v = v.startsWith("+") ? "+" + v.slice(1).replace(/\+/g, "") : v;
  return v;
}

function parsePriceValue(raw?: string) {
  if (!raw) return null;
  let v = toEnglishDigits(raw);
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

function extractPriceUnit(raw?: string) {
  if (!raw) return "";
  const unit = toEnglishDigits(raw).replace(/[0-9.,٬٫\s]/g, "").trim();
  return unit ? ` ${unit}` : "";
}

function formatPriceNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatDatePreview(value: string) {
  if (!value) return "";
  const normalized = toEnglishDigits(value).trim();
  const parts = normalized.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day} / ${month} / ${year}`;
    }
  }
  return normalized;
}

function parseIsoDate(value: string) {
  if (!value) return undefined;
  const normalized = toEnglishDigits(value).trim();
  const parts = normalized.split("-");
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts.map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

type WheelOption = { value: number; label: string };

function WheelColumn({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: WheelOption[];
  onChange: (next: number) => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollEndRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const itemHeight = 28;
  const listHeight = 136;
  const spacerHeight = (listHeight - itemHeight) / 2;
  const isFixed = options.length <= 1;

  useEffect(() => {
    if (!listRef.current) return;
    const index = options.findIndex((opt) => opt.value === value);
    if (index === -1) return;
    const target = index * itemHeight;
    if (isUserScrollingRef.current) return;
    if (Math.abs(listRef.current.scrollTop - target) < 1) return;
    listRef.current.scrollTo({ top: target, behavior: "smooth" });
  }, [options, value]);

  const handleScroll = () => {
    if (isFixed) return;
    if (!listRef.current) return;
    isUserScrollingRef.current = true;
    if (scrollEndRef.current) {
      window.clearTimeout(scrollEndRef.current);
    }
    scrollEndRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 140);
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      if (!listRef.current) return;
      const rawIndex = listRef.current.scrollTop / itemHeight;
      const index = Math.round(rawIndex);
      const option = options[Math.min(Math.max(index, 0), options.length - 1)];
      if (option && option.value !== value) {
        onChange(option.value);
      }
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (scrollEndRef.current) {
        window.clearTimeout(scrollEndRef.current);
      }
    };
  }, []);

  return (
    <div className="wheel-column-wrap">
      <div className="wheel-label">{label}</div>
      <div className={["wheel-column", isFixed ? "wheel-column--fixed" : ""].join(" ")}>
        <div className="wheel-highlight" aria-hidden="true" />
        <div
          ref={listRef}
          className={["wheel-list", isFixed ? "wheel-list--fixed" : ""].join(" ")}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
        >
          <div className="wheel-spacer" style={{ height: spacerHeight }} />
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={[
                "wheel-item",
                option.value === value ? "wheel-item--selected" : "",
              ].join(" ")}
              onClick={() => {
                if (isFixed) return;
                onChange(option.value);
              }}
              disabled={isFixed}
            >
              {option.label}
            </button>
          ))}
          <div className="wheel-spacer" style={{ height: spacerHeight }} />
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon({ size = 22 }: { size?: number }) {
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

export default function Contact() {
  const { contactInfo, socialLinks } = useContactData();
  const content = useContentData();
  const [location] = useLocation();
  const {
    sessionPackages,
    sessionPackagesWithPrints,
    weddingPackages,
    additionalServices,
  } = usePackagesData();
  const contentMap = content.contentMap ?? {};
  const getValue = (key: string, fallback = "") => (contentMap[key] as string | undefined) ?? fallback;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [printsOpen, setPrintsOpen] = useState(false);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const prefillLocationRef = useRef<string>("");
  type PackageOption = {
    id: string;
    label: string;
    price: string;
    badge?: string;
    isDiscount?: boolean;
  };
  const clampPrintQty = (value: number) => Math.min(5, Math.max(1, value));
  const getPrintQty = (id: string) => clampPrintQty(printQuantities[id] ?? 1);
  const setPrintQty = (id: string, next: number) => {
    const qty = clampPrintQty(next);
    setPrintQuantities((prev) => ({ ...prev, [id]: qty }));
  };
  const clearPrintQty = (id: string) => {
    setPrintQuantities((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", phone: "", date: "", packageId: "", addonIds: [], printIds: [] },
    mode: "onBlur",
  });

  const packageOptions = useMemo(() => {
    const isCustomPackage = (pkg: any) => {
      const id = String(pkg?.id ?? "");
      const name = String(pkg?.name ?? "").trim();
      const price = String(pkg?.price ?? "");
      const category = String(pkg?.category ?? "");
      if (id === "special-montage-design") return true;
      if (category === "prints" && /خصص/.test(name)) return true;
      if (category === "prints" && /تحدد|تحدد السعر|أنت من تحدد/.test(price)) return true;
      return false;
    };
    const map = (items: Array<{ id: string; name: string; price: string; category?: string }>): PackageOption[] =>
      items
        .filter((p) => !isCustomPackage(p))
        .map((p) => {
          const baseKey = `package_${p.id}`;
          return {
            id: p.id,
            label: getValue(`${baseKey}_name`, p.name),
            price: getValue(`${baseKey}_price`, p.price),
          };
        });
    const monthlyOfferPrice = getValue("services_monthly_offer_price", "$4500");
    const monthlyOfferOption: PackageOption = {
      id: "monthly-offer",
      label: getValue("services_monthly_offer_title", "العرض الحصري"),
      price: monthlyOfferPrice,
      badge: getValue("services_monthly_offer_badge", "خصم 🔥"),
      isDiscount: true,
    };
    const ordered = [
      ...map(sessionPackages as any),
      ...map(weddingPackages as any),
    ];
    return [monthlyOfferOption, ...ordered];
  }, [sessionPackages, sessionPackagesWithPrints, weddingPackages, contentMap]);

  const addonOptions = useMemo(() => {
    const list = (additionalServices ?? []) as Array<{
      id: string;
      name: string;
      price: string;
      emoji?: string;
      priceNote?: string;
    }>;
    return list.map((a) => {
      const baseKey = `package_${a.id}`;
      return {
        id: a.id,
        label: getValue(`${baseKey}_name`, a.name),
        price: getValue(`${baseKey}_price`, a.price),
        emoji: a.emoji,
        priceNote: getValue(`${baseKey}_price_note`, a.priceNote ?? ""),
      };
    });
  }, [additionalServices, contentMap]);

  const printGroups = customPrintGroups;
  const printOptions = useMemo(
    () =>
      customPrintGroups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupTitle: group.title,
        }))
      ),
    []
  );

  const watchedName = useWatch({ control: form.control, name: "name" }) ?? "";
  const watchedPhone = useWatch({ control: form.control, name: "phone" }) ?? "";
  const watchedDate = useWatch({ control: form.control, name: "date" }) ?? "";
  const watchedPackageId = useWatch({ control: form.control, name: "packageId" }) ?? "";
  const watchedAddonIds = useWatch({ control: form.control, name: "addonIds" }) ?? [];
  const watchedPrintIds = useWatch({ control: form.control, name: "printIds" }) ?? [];
  const datePreview = useMemo(() => formatDatePreview(watchedDate), [watchedDate]);
  const minYear = 2026;
  const maxYear = 2027;
  const todayInRange = useMemo(() => {
    const today = new Date();
    const clampedYear = Math.min(Math.max(today.getFullYear(), minYear), maxYear);
    const clampedMonth = today.getMonth() + 1;
    const maxDay = getDaysInMonth(clampedYear, clampedMonth);
    const clampedDay = Math.min(today.getDate(), maxDay);
    return new Date(clampedYear, clampedMonth - 1, clampedDay);
  }, [minYear, maxYear]);
  const selectedDate = useMemo(() => {
    const parsed = parseIsoDate(watchedDate);
    if (!parsed) return undefined;
    const parsedYear = parsed.getFullYear();
    if (parsedYear >= minYear && parsedYear <= maxYear) return parsed;
    return new Date(minYear, parsed.getMonth(), parsed.getDate());
  }, [watchedDate]);
  const yearRangeStart = minYear;
  const yearRangeEnd = maxYear;
  const baseDate = selectedDate ?? (calendarOpen ? todayInRange : new Date(minYear, 0, 1));
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth() + 1;
  const baseDay = baseDate.getDate();
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const value = index + 1;
        return { value, label: String(value) };
      }),
    []
  );
  const yearOptions = useMemo(
    () =>
      Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
        const value = minYear + index;
        return { value, label: String(value) };
      }),
    [minYear, maxYear]
  );
  const dayOptions = useMemo(() => {
    const maxDay = getDaysInMonth(baseYear, baseMonth);
    return Array.from({ length: maxDay }, (_, index) => {
      const value = index + 1;
      return { value, label: String(value) };
    });
  }, [baseYear, baseMonth]);

  const updateDateParts = (next: { day?: number; month?: number; year?: number }) => {
    const nextYear = Math.min(Math.max(next.year ?? baseYear, minYear), maxYear);
    const nextMonth = next.month ?? baseMonth;
    const maxDay = getDaysInMonth(nextYear, nextMonth);
    const nextDay = Math.min(next.day ?? baseDay, maxDay);
    const nextDate = new Date(nextYear, nextMonth - 1, nextDay);
    form.setValue("date", formatIsoDate(nextDate), { shouldDirty: true, shouldValidate: true });
  };

  const openCalendar = () => {
    setCalendarOpen(true);
  };

  useEffect(() => {
    if (prefillLocationRef.current === location) return;
    prefillLocationRef.current = location;
    const params = new URLSearchParams(window.location.search);
    const packageParam = params.get("package")?.trim();
    const printsParam = params.get("prints")?.trim();
    const addonsParam = params.get("addons")?.trim();

    if (packageParam && !form.getValues("packageId")) {
      const isValidPackage = packageOptions.some((pkg) => pkg.id === packageParam);
      if (isValidPackage) {
        form.setValue("packageId", packageParam);
      }
    }

    if ((form.getValues("printIds") ?? []).length === 0) {
      const validPrintIds = new Set(printOptions.map((item) => item.id));
      const nextPrints = printsParam
        ? printsParam
            .split(",")
            .map((id) => id.trim())
            .filter((id) => validPrintIds.has(id))
        : [];
      if (nextPrints.length) {
        form.setValue("printIds", nextPrints);
      } else {
        const storedPrints = readStoredPrintIds(validPrintIds);
        if (storedPrints.length) form.setValue("printIds", storedPrints);
      }
    }

    if (addonsParam && (form.getValues("addonIds") ?? []).length === 0) {
      const validAddonIds = new Set(addonOptions.map((item) => item.id));
      const nextAddons = addonsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => validAddonIds.has(id));
      if (nextAddons.length) form.setValue("addonIds", nextAddons);
    }
  }, [location, addonOptions, packageOptions, printOptions, form]);

  useEffect(() => {
    try {
      if (!watchedPrintIds.length) {
        sessionStorage.removeItem(PRINTS_STORAGE_KEY);
      } else {
        sessionStorage.setItem(PRINTS_STORAGE_KEY, JSON.stringify(watchedPrintIds));
      }
    } catch {
      // ignore storage errors
    }
  }, [watchedPrintIds]);

  const selectedPackage = useMemo(
    () => packageOptions.find((p) => p.id === watchedPackageId),
    [packageOptions, watchedPackageId]
  );
  const isMonthlyOfferSelected = selectedPackage?.id === "monthly-offer";
  const monthlyOfferDetails = useMemo(() => {
    if (!isMonthlyOfferSelected) return [] as string[];
    const title = getValue("services_monthly_offer_title", "العرض الحصري");
    const price = getValue("services_monthly_offer_price", "$4500");
    const subtitle = getValue("services_monthly_offer_subtitle", "عرض حصري لفترة محدودة فقط");
    const features = [
      getValue("services_monthly_offer_feature_1", "ألبوم كبير مقاس 80x30 عدد من 20 ل 40 صورة"),
      getValue("services_monthly_offer_feature_2", "تابلوه أنيميشن كبير 70x50 جودة عالية مع طبقة حماية"),
      getValue("services_monthly_offer_feature_3", "ألبوم آخر مصغر أنيق او كروت صغيرة لصور السيشن"),
      getValue("services_monthly_offer_feature_4", "ساعة حائط كبيرة مصممة بصوركم الخاصة"),
      getValue("services_monthly_offer_feature_5", "REELS & TIKTOK"),
      getValue("services_monthly_offer_feature_6", "عدد غير محدود من الصور"),
      getValue("services_monthly_offer_feature_7", "وقت مفتوح"),
    ];
    const lines = [
      title,
      `${getValue("contact_receipt_offer_price_label", "السعر")}: ${price}`,
      subtitle,
      ...features,
    ];
    return lines.filter((line) => line && line.trim().length);
  }, [isMonthlyOfferSelected, contentMap]);

  const selectedAddons = useMemo(
    () => addonOptions.filter((a) => watchedAddonIds.includes(a.id)),
    [addonOptions, watchedAddonIds]
  );
  const selectedPrints = useMemo(
    () => printOptions.filter((p) => watchedPrintIds.includes(p.id)),
    [printOptions, watchedPrintIds]
  );

  const addonsText = selectedAddons.length
    ? selectedAddons.map((a) => a.label).join("، ")
    : getValue("contact_addons_empty", "—");

  const addonsPreview = selectedAddons.length
    ? selectedAddons.map((a) => a.label).join("، ")
    : getValue("contact_addons_placeholder", "اختر الإضافات أو اتركها فارغة");

  const printsText = selectedPrints.length
    ? selectedPrints
        .map((p) => {
          const qty = getPrintQty(p.id);
          return `${p.label}${qty > 1 ? ` (عدد ${qty})` : ""}`;
        })
        .join("، ")
    : getValue("contact_prints_empty", "—");
  const printsPreview = selectedPrints.length
    ? selectedPrints
        .map((p) => {
          const qty = getPrintQty(p.id);
          return `${p.label}${qty > 1 ? ` (عدد ${qty})` : ""}`;
        })
        .join("، ")
    : getValue("contact_prints_placeholder", "اختر المطبوعات أو اتركها فارغة كما تشاء");


  const priceValue = useMemo(() => {
    const addonsTotal = selectedAddons.reduce((sum, addon) => {
      const addonNumber = parsePriceValue(addon.price);
      return addonNumber === null ? sum : sum + addonNumber;
    }, 0);
    const printsTotal = selectedPrints.reduce((sum, item) => {
      const itemNumber = parsePriceValue(item.price);
      if (itemNumber === null) return sum;
      const qty = getPrintQty(item.id);
      return sum + itemNumber * qty;
    }, 0);
    const extrasTotal = addonsTotal + printsTotal;
    const packagePrice = selectedPackage?.price;
    const packageNumber = packagePrice ? parsePriceValue(packagePrice) : null;

    const unit =
      extractPriceUnit(packagePrice) ||
      extractPriceUnit(selectedAddons.find((a) => a.price)?.price) ||
      extractPriceUnit(selectedPrints.find((p) => p.price)?.price);

    if (packageNumber === null) {
      if (extrasTotal > 0) {
        const totalText = formatPriceNumber(extrasTotal);
        return unit ? `${totalText}${unit}` : totalText;
      }
      return packagePrice ?? "";
    }

    const total = packageNumber + extrasTotal;
    const totalText = formatPriceNumber(total);
    return unit ? `${totalText}${unit}` : totalText;
  }, [selectedPackage, selectedAddons, selectedPrints, printQuantities]);

  const totalLine = useMemo(() => {
    const emptyValue = getValue("contact_receipt_empty", "—");
    const totalValue = priceValue || emptyValue;
    const suffix = priceValue ? ` ${getValue("contact_receipt_only_suffix", "فقط")}` : "";
    return `${getValue("contact_receipt_label_total", "الإجمالي")}: ${totalValue}${suffix}`;
  }, [priceValue, contentMap]);
  const receiptEmptyValue = useMemo(() => getValue("contact_receipt_empty", "—"), [contentMap]);
  const receiptNoneValue = useMemo(() => getValue("contact_receipt_none", "بدون"), [contentMap]);
  const receiptRows = useMemo(
    () => [
      {
        label: getValue("contact_receipt_label_name", "الاسم"),
        value: watchedName || receiptEmptyValue,
      },
      {
        label: getValue("contact_receipt_label_phone", "الهاتف"),
        value: watchedPhone || receiptEmptyValue,
      },
      {
        label: getValue("contact_receipt_label_date", "التاريخ"),
        value: (datePreview || watchedDate) || receiptEmptyValue,
      },
      {
        label: getValue("contact_receipt_label_package", "الباقة"),
        value: selectedPackage?.label || receiptEmptyValue,
      },
    ],
    [
      watchedName,
      watchedPhone,
      watchedDate,
      datePreview,
      selectedPackage,
      receiptEmptyValue,
      contentMap,
    ]
  );
  const receiptTotalValue = useMemo(() => {
    if (!priceValue) return receiptEmptyValue;
    const suffix = getValue("contact_receipt_only_suffix", "فقط");
    return `${priceValue} ${suffix}`;
  }, [priceValue, receiptEmptyValue, contentMap]);

  const receiptText = useMemo(() => {
    const emptyValue = getValue("contact_receipt_empty", "—");
    const noneValue = getValue("contact_receipt_none", "بدون");
    const formatListLines = (
      items: Array<{ label: string }>,
      fallback: string,
      bullet: string
    ) => {
      if (!items.length) return [fallback];
      return items.map((item) => `${bullet}${item.label}`);
    };

    const addonLines = formatListLines(selectedAddons, noneValue, "- ");
    const printLines = selectedPrints.length
      ? selectedPrints.map((item) => {
          const qty = getPrintQty(item.id);
          return `• ${item.label}${qty > 1 ? ` (عدد ${qty})` : ""}`;
        })
      : [noneValue];
    const offerLines = monthlyOfferDetails.length
      ? [getValue("contact_receipt_offer_heading", "تفاصيل العرض الحصري"), ...monthlyOfferDetails.map((line) => `• ${line}`)]
      : [];

    const lines = [
      getValue("contact_receipt_title", "إيصال حجز ❤️"),
      `${getValue("contact_receipt_label_name", "الاسم")}: ${watchedName || emptyValue}`,
      `${getValue("contact_receipt_label_phone", "الهاتف")}: ${watchedPhone || emptyValue}`,
      `${getValue("contact_receipt_label_date", "التاريخ")}: ${watchedDate || emptyValue}`,
      `${getValue("contact_receipt_label_package", "الباقة")}: ${selectedPackage?.label || emptyValue}`,
      ...offerLines,
      `${getValue("contact_receipt_label_addons", "الإضافات")}:`,
      ...addonLines,
      `${getValue("contact_receipt_label_prints", "المطبوعات")}:`,
      ...printLines,
      totalLine,
    ];
    return lines.join("\n");
  }, [
    watchedName,
    watchedPhone,
    watchedDate,
    selectedPackage,
    selectedAddons,
    selectedPrints,
    totalLine,
    monthlyOfferDetails,
    contentMap,
    printQuantities,
  ]);

  const whatsappReceiptHref = useMemo(
    () => buildWhatsAppHref(receiptText, contactInfo.whatsappNumber),
    [receiptText, contactInfo.whatsappNumber]
  );

  const whatsappBookingHref = useMemo(
    () => buildWhatsAppHref("عايز احجز اوردر ❤️", contactInfo.whatsappNumber),
    [contactInfo.whatsappNumber]
  );
  const telHref = useMemo(
    () => `tel:${(contactInfo.phone ?? "").replace(/\s/g, "")}`,
    [contactInfo.phone]
  );

  const fieldClass =
    "h-12 bg-black/35 border border-white/20 text-foreground placeholder:text-white/50 focus:border-primary/70 focus:ring-2 focus:ring-primary/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-md transition-[border,box-shadow,background]";
  const labelClass = "text-sm font-semibold text-foreground/90 tracking-wide";
  const requiredFieldOrder: Array<keyof z.infer<typeof formSchema>> = [
    "name",
    "phone",
    "date",
    "packageId",
  ];

  const scrollToField = (field: keyof z.infer<typeof formSchema>) => {
    const el = document.querySelector(`[data-field="${field}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("field-shake");
    window.setTimeout(() => {
      el.classList.add("field-shake");
    }, 10);
    if (typeof (el as HTMLElement).focus === "function") {
      el.focus({ preventScroll: true });
    }
  };

  const onSendReceipt = () => {
    if (!whatsappReceiptHref) {
      toast.error("أدخل البيانات كاملة أولاً.");
      return;
    }
    window.open(whatsappReceiptHref, "_blank");
  };

  const onInvalid = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    const firstMissing = requiredFieldOrder.find((field) => errors[field]);
    if (!firstMissing) return;
    if (firstMissing === "date") {
      openCalendar();
    }
    toast.error("يرجى إكمال البيانات الأساسية أولاً.");
    scrollToField(firstMissing);
  };

  const onResetSelections = () => {
    form.setValue("date", "");
    form.setValue("packageId", "");
    form.setValue("addonIds", []);
    form.setValue("printIds", []);
    setPrintQuantities({});
    try {
      sessionStorage.removeItem(PRINTS_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const onCopyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      toast.success("تم نسخ الإيصال.");
    } catch {
      toast.error("تعذر النسخ. جرّب مرة أخرى.");
    }
  };

  useEffect(() => {
    document.documentElement.style.scrollPaddingTop = "120px";
    return () => {
      document.documentElement.style.scrollPaddingTop = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <header className="pt-32 pb-10 bg-card relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_15%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/20 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm text-foreground/80">
              <EditableText
                value={contentMap.contact_kicker}
                fallback="رد سريع • تنظيم مواعيد • تفاصيل واضحة"
                fieldKey="contact_kicker"
                category="contact"
                label="عنوان صغير (تواصل)"
              />
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EditableText
              value={contentMap.contact_title}
              fallback={pageTexts.contact.title}
              fieldKey="contact_title"
              category="contact"
              label="عنوان صفحة التواصل"
            />
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            <EditableText
              value={contentMap.contact_subtitle}
              fallback={pageTexts.contact.subtitle}
              fieldKey="contact_subtitle"
              category="contact"
              label="وصف صفحة التواصل"
              multiline
            />
          </p>
        </div>
      </header>

      {/* Quick Actions */}
      <section className="border-y border-white/10 bg-background/70 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <a
              href={whatsappBookingHref}
              target="_blank"
              rel="noreferrer"
              className="premium-border bg-card/40 border border-white/10 px-4 py-4 flex items-center justify-center gap-2 hover:border-primary/35 transition-colors"
            >
              <span className="text-primary">
                <WhatsAppIcon />
              </span>
              <span className="text-sm font-semibold">
                <EditableText
                  value={contentMap.contact_quick_whatsapp}
                  fallback="واتساب"
                  fieldKey="contact_quick_whatsapp"
                  category="contact"
                  label="زر واتساب سريع"
                />
              </span>
            </a>

            <a
              href={telHref}
              className="premium-border bg-card/40 border border-white/10 px-4 py-4 flex items-center justify-center gap-2 hover:border-primary/35 transition-colors"
            >
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">
                <EditableText
                  value={contentMap.contact_quick_call}
                  fallback="مكالمة"
                  fieldKey="contact_quick_call"
                  category="contact"
                  label="زر مكالمة سريع"
                />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Form FIRST on mobile */}
            <div className="order-1 lg:order-2 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="contact-hint">
                  <Receipt className="w-4 h-4 contact-hint-icon" />
                  <span>
                    <EditableText
                      value={contentMap.services_vip_line_2}
                      fallback="بعد الحجز، تكون الأسعار نهائية كما في إيصال حجزك، بدون أي زيادات أو رسوم إضافية."
                      fieldKey="services_vip_line_2"
                      category="services"
                      label="تنبيه الأسعار النهائية"
                      multiline
                    />
                  </span>
                </div>
                <div className="contact-hint">
                  <Gem className="w-4 h-4 contact-hint-icon" />
                  <span>
                    <EditableText
                      value={contentMap.services_vip_line_1}
                      fallback="- VIP بمجرد حجزك لليوم، مش بيتحجز لغيرك حتى لو سنة."
                      fieldKey="services_vip_line_1"
                      category="services"
                      label="تنبيه حجز اليوم"
                      multiline
                    />
                  </span>
                </div>
              </div>

              <div className="bg-card/60 p-7 md:p-10 border border-white/15 premium-border shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-md">
                <h2 className="text-2xl font-bold mb-6">
                  <EditableText
                    value={contentMap.contact_form_title}
                    fallback={pageTexts.contact.formTitle}
                    fieldKey="contact_form_title"
                    category="contact"
                    label="عنوان نموذج التواصل"
                  />
                </h2>

              <Form {...form}>
                <form className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_name}
                            fallback="الاسم بالكامل"
                            fieldKey="contact_label_name"
                            category="contact"
                            label="حقل الاسم"
                          />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={getValue("contact_placeholder_name", "أدخل اسمك")}
                            {...field}
                            className={`${fieldClass} ${form.formState.errors.name ? "field-error" : ""}`}
                            data-field="name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_phone}
                            fallback="رقم الهاتف"
                            fieldKey="contact_label_phone"
                            category="contact"
                            label="حقل الهاتف"
                          />
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={getValue("contact_placeholder_phone", "01xxxxxxxxx")}
                            value={field.value}
                            onChange={(e) => field.onChange(normalizePhone(e.target.value))}
                            className={`${fieldClass} text-right ${form.formState.errors.phone ? "field-error" : ""}`}
                            data-field="phone"
                            dir="ltr"
                            inputMode="tel"
                            autoComplete="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_date}
                            fallback="تاريخ المناسبة"
                            fieldKey="contact_label_date"
                            category="contact"
                            label="حقل التاريخ"
                          />
                        </FormLabel>
                        <FormControl>
                          <button
                            type="button"
                            className={`${fieldClass} date-trigger ${form.formState.errors.date ? "field-error" : ""}`}
                            onClick={openCalendar}
                            data-field="date"
                          >
                            <span className="date-trigger-value" dir="ltr">
                              {field.value
                                ? datePreview
                                : getValue("contact_placeholder_date", "يوم / شهر / سنة")}
                            </span>
                            <CalendarIcon className="date-trigger-icon" />
                          </button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="packageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_package}
                            fallback="اختر الباقة"
                            fieldKey="contact_label_package"
                            category="contact"
                            label="حقل الباقة"
                          />
                        </FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger
                              className={`w-full ${fieldClass} ${form.formState.errors.packageId ? "field-error" : ""}`}
                              data-field="packageId"
                            >
                              {selectedPackage?.id === "monthly-offer" ? (
                                <div className="package-option-row package-option-row--trigger">
                                  <span className="package-option-label">{selectedPackage.label}</span>
                                  <span className="package-option-meta">
                                    <span className="package-option-badge package-option-badge--discount">
                                      <Sparkles className="package-option-badge-icon" />
                                      <span>{selectedPackage.badge ?? "خصم 🔥"}</span>
                                    </span>
                                    <span className="package-option-price">{selectedPackage.price}</span>
                                  </span>
                                </div>
                              ) : (
                                <SelectValue
                                  placeholder={getValue("contact_placeholder_package", "اختر الباقة المناسبة")}
                                />
                              )}
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-background/95 backdrop-blur-md">
                              {packageOptions.map((opt, index) => {
                                const isVip =
                                  /vip/i.test(opt.label) || /vip/i.test(String(opt.price ?? ""));
                                const isDiscount = opt.id === "monthly-offer";
                                return (
                                  <Fragment key={opt.id}>
                                    <SelectItem
                                      value={opt.id}
                                      className="rounded-md px-3 py-3 text-sm data-[highlighted]:bg-primary/10 data-[state=checked]:bg-primary/15 data-[state=checked]:text-foreground"
                                    >
                                      <span className="package-option-row">
                                        <span className="package-option-label">{opt.label}</span>
                                        <span className="package-option-meta">
                                          {isDiscount ? (
                                            <span className="package-option-badge package-option-badge--discount">
                                              <Sparkles className="package-option-badge-icon" />
                                              <span>{opt.badge ?? "خصم"}</span>
                                            </span>
                                          ) : isVip ? (
                                            <span className="package-option-badge">VIP</span>
                                          ) : null}
                                          <span className="package-option-price">{opt.price}</span>
                                        </span>
                                      </span>
                                    </SelectItem>
                                    {index < packageOptions.length - 1 ? (
                                      <SelectSeparator className="mx-3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-70" />
                                    ) : null}
                                  </Fragment>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addonIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_addons}
                            fallback="اختيارات الإضافات (اختياري)"
                            fieldKey="contact_label_addons"
                            category="contact"
                            label="حقل الإضافات"
                          />
                        </FormLabel>
                        <FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={`w-full ${fieldClass} h-auto min-h-12 border px-3 rounded-md flex items-start justify-between text-sm gap-3 py-2`}
                              >
                                {selectedAddons.length ? (
                                  <ul className="flex-1 min-w-0 text-right list-disc list-inside space-y-1 text-foreground/90 leading-relaxed">
                                    {selectedAddons.map((addon) => (
                                      <li key={addon.id} className="whitespace-normal">
                                        {addon.label}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground">{addonsPreview}</span>
                                )}
                                <ChevronDown className="w-4 h-4 text-muted-foreground/70 mt-1" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-[min(92vw,360px)] border border-white/10 bg-background/95 backdrop-blur-md p-3"
                            >
                              <div className="space-y-3">
                                {addonOptions.length ? (
                                  addonOptions.map((opt) => {
                                    const checked = (field.value ?? []).includes(opt.id);
                                    return (
                                      <label key={opt.id} className="flex items-start gap-3 text-sm">
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={(value) => {
                                            const next = new Set(field.value ?? []);
                                            const isChecked = value === true;
                                            if (isChecked) {
                                              next.add(opt.id);
                                            } else {
                                              next.delete(opt.id);
                                            }
                                            field.onChange(Array.from(next));
                                          }}
                                        />
                                        <div className="flex-1 space-y-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                              {opt.emoji ? <span className="text-base">{opt.emoji}</span> : null}
                                              <span>{opt.label}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground tabular-nums">{opt.price}</span>
                                          </div>
                                          {opt.priceNote ? (
                                            <div className="text-[11px] text-muted-foreground/70 pr-6">
                                              {opt.priceNote}
                                            </div>
                                          ) : null}
                                        </div>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <div className="text-sm text-muted-foreground">لا توجد إضافات حالياً.</div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="printIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          <EditableText
                            value={contentMap.contact_label_prints}
                            fallback="المطبوعات (اختياري)"
                            fieldKey="contact_label_prints"
                            category="contact"
                            label="حقل المطبوعات"
                          />
                        </FormLabel>
                        <FormControl>
                          <Popover open={printsOpen} onOpenChange={setPrintsOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={`w-full ${fieldClass} h-auto min-h-12 border px-3 rounded-md flex items-start justify-between text-sm gap-3 py-2`}
                              >
                                {selectedPrints.length ? (
                                  <ul className="flex-1 min-w-0 text-right list-disc list-inside space-y-1 text-foreground/90 leading-relaxed">
                                    {selectedPrints.map((item) => {
                                      const qty = getPrintQty(item.id);
                                      return (
                                        <li key={item.id} className="whitespace-normal flex items-center gap-2">
                                          <span>{item.label}</span>
                                          {qty > 1 ? <span className="print-qty-pill">(عدد {qty})</span> : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground">{printsPreview}</span>
                                )}
                                <ChevronDown className="w-4 h-4 text-muted-foreground/70 mt-1" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className="w-[min(92vw,360px)] border border-white/10 bg-background/95 backdrop-blur-md p-3"
                            >
                              <div
                                className="prints-popover-body space-y-3"
                                onWheel={(event) => event.stopPropagation()}
                                onTouchMove={(event) => event.stopPropagation()}
                              >
                                {printGroups.length ? (
                                  printGroups.map((group) => (
                                    <div key={group.id} className="space-y-2">
                                      <div className="text-xs font-semibold text-primary/90">
                                        {group.title}
                                      </div>
                                      <div className="space-y-2">
                                        {group.items.map((item) => {
                                          const checked = (field.value ?? []).includes(item.id);
                                          const qty = getPrintQty(item.id);
                                          const basePrice = parsePriceValue(item.price);
                                          const unit = extractPriceUnit(item.price);
                                          const computedPrice =
                                            basePrice !== null ? `${formatPriceNumber(basePrice * qty)}${unit}` : item.price;
                                          return (
                                            <label key={item.id} className="print-option">
                                              <Checkbox
                                                checked={checked}
                                                onCheckedChange={(value) => {
                                                  const next = new Set(field.value ?? []);
                                                  const isChecked = value === true;
                                                  if (isChecked) {
                                                    next.add(item.id);
                                                    if (!printQuantities[item.id]) {
                                                      setPrintQty(item.id, 1);
                                                    }
                                                  } else {
                                                    next.delete(item.id);
                                                    clearPrintQty(item.id);
                                                  }
                                                  field.onChange(Array.from(next));
                                                }}
                                              />
                                              <div className="print-option-body">
                                                <div className="print-option-row">
                                                  <span className="print-option-label">{item.label}</span>
                                                  <span className="print-option-price tabular-nums">
                                                    {checked && qty > 1 ? computedPrice : item.price}
                                                  </span>
                                                </div>
                                                {checked ? (
                                                  <div
                                                    className="print-qty"
                                                    onClick={(event) => {
                                                      event.preventDefault();
                                                      event.stopPropagation();
                                                    }}
                                                  >
                                                    <span className="print-qty-label">
                                                      <span className="print-qty-dot" />
                                                      اختر العدد
                                                    </span>
                                                    <div className="print-qty-controls">
                                                      <button
                                                        type="button"
                                                        className="print-qty-btn"
                                                        onClick={() => setPrintQty(item.id, qty - 1)}
                                                        disabled={qty <= 1}
                                                      >
                                                        -
                                                      </button>
                                                      <span className="print-qty-value">{qty}</span>
                                                      <button
                                                        type="button"
                                                        className="print-qty-btn"
                                                        onClick={() => setPrintQty(item.id, qty + 1)}
                                                        disabled={qty >= 5}
                                                      >
                                                        +
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : null}
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-muted-foreground">لا توجد مطبوعات حالياً.</div>
                                )}
                              </div>
                              <div className="prints-popover-footer">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setPrintsOpen(false)}
                                >
                                  تم
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label className={labelClass}>
                      <EditableText
                        value={contentMap.contact_label_price}
                        fallback="الإجمالي"
                        fieldKey="contact_label_price"
                        category="contact"
                        label="عنوان السعر"
                      />
                    </Label>
                    <Input
                      value={priceValue}
                      readOnly
                      placeholder={getValue("contact_placeholder_price", "سيظهر السعر تلقائياً")}
                      className={`${fieldClass} text-right font-semibold text-primary/90 tabular-nums`}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={onResetSelections}
                      >
                        <EditableText
                          value={contentMap.contact_reset_button}
                          fallback="إلغاء وارجع اختار من تاني"
                          fieldKey="contact_reset_button"
                          category="contact"
                          label="زر إلغاء الاختيارات"
                        />
                      </Button>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-black/35 via-background/80 to-black/40 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="absolute inset-0 pointer-events-none opacity-50 [background:radial-gradient(circle_at_20%_0%,rgba(255,200,80,0.18),transparent_55%)]" />
                    <div className="relative flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Receipt className="w-4 h-4 text-primary" />
                        <EditableText
                          value={contentMap.contact_receipt_heading}
                          fallback="الإيصال"
                          fieldKey="contact_receipt_heading"
                          category="contact"
                          label="عنوان الإيصال"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={onCopyReceipt}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Copy size={14} />
                        <EditableText
                          value={contentMap.contact_receipt_copy}
                          fallback="نسخ"
                          fieldKey="contact_receipt_copy"
                          category="contact"
                          label="زر نسخ الإيصال"
                        />
                      </button>
                    </div>
                    <div className="receipt-body">
                      <div className="receipt-grid">
                        {receiptRows.map((row) => (
                          <div key={row.label} className="receipt-card">
                            <span className="receipt-label">{row.label}</span>
                            <span className="receipt-value">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {isMonthlyOfferSelected && monthlyOfferDetails.length ? (
                        <div className="receipt-section">
                          <div className="receipt-section-header">
                            <span className="receipt-label">
                              {getValue("contact_receipt_offer_heading", "تفاصيل العرض الحصري")}
                            </span>
                            <span className="receipt-pill receipt-pill--active">
                              {getValue("contact_receipt_offer_tag", "عرض")}
                            </span>
                          </div>
                          <ul className="receipt-bullets">
                            {monthlyOfferDetails.map((line, index) => (
                              <li key={`${line}-${index}`}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="receipt-section">
                        <div className="receipt-section-header">
                          <span className="receipt-label">
                            {getValue("contact_receipt_label_addons", "الإضافات")}
                          </span>
                          <span
                            className={`receipt-pill ${selectedAddons.length ? "receipt-pill--active" : "receipt-pill--muted"}`}
                          >
                            {selectedAddons.length ? selectedAddons.length : receiptNoneValue}
                          </span>
                        </div>
                        {selectedAddons.length ? (
                          <ul className="receipt-tags">
                            {selectedAddons.map((addon) => (
                              <li key={addon.id}>{addon.label}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <div className="receipt-section">
                        <div className="receipt-section-header">
                          <span className="receipt-label">
                            {getValue("contact_receipt_label_prints", "المطبوعات")}
                          </span>
                          <span
                            className={`receipt-pill ${selectedPrints.length ? "receipt-pill--active" : "receipt-pill--muted"}`}
                          >
                            {selectedPrints.length ? selectedPrints.length : receiptNoneValue}
                          </span>
                        </div>
                        {selectedPrints.length ? (
                          <ul className="receipt-tags">
                            {selectedPrints.map((print) => {
                              const qty = getPrintQty(print.id);
                              return (
                                <li key={print.id}>
                                  {print.label}
                                  {qty > 1 ? ` (عدد ${qty})` : ""}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </div>

                      <div className="receipt-total">
                        <span className="receipt-label">
                          {getValue("contact_receipt_label_total", "الإجمالي")}
                        </span>
                        <span className="receipt-value receipt-value--total">{receiptTotalValue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div
                      className="md:static md:bg-transparent md:border-0 md:p-0
                                 sticky bottom-0 z-20 -mx-7 px-7 pb-3 pt-3
                                 bg-card/92 backdrop-blur-md border-t border-white/10"
                      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
                        onClick={form.handleSubmit(onSendReceipt, onInvalid)}
                      >
                        <EditableText
                          value={contentMap.contact_submit_button}
                          fallback="تأكيد الحجز"
                          fieldKey="contact_submit_button"
                          category="contact"
                          label="زر تأكيد الحجز"
                        />
                        <Send size={18} className="mr-2" />
                      </Button>

                      <p className="text-[11px] text-muted-foreground/75 text-center mt-3 leading-relaxed">
                        <EditableText
                          value={contentMap.contact_submit_helper}
                          fallback="بالضغط على تأكيد الحجز، سيتم فتح واتساب بإيصال جاهز حسب اختياراتك."
                          fieldKey="contact_submit_helper"
                          category="contact"
                          label="تنبيه تأكيد الحجز"
                          multiline
                        />
                      </p>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

            {/* Info SECOND on mobile */}
            <div className="order-2 lg:order-1 space-y-10">
              <div className="premium-border bg-card/40 border border-white/10 p-7 md:p-9">
                <h2 className="text-2xl font-bold mb-4 text-primary">
                  <EditableText
                    value={contentMap.contact_info_title}
                    fallback={pageTexts.contact.infoTitle}
                    fieldKey="contact_info_title"
                    category="contact"
                    label="عنوان معلومات التواصل"
                  />
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-7">
                  <EditableText
                    value={contentMap.contact_info_desc}
                    fallback={pageTexts.contact.infoDescription}
                    fieldKey="contact_info_desc"
                    category="contact"
                    label="وصف معلومات التواصل"
                    multiline
                  />
                </p>

                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/15 border border-white/10 flex items-center justify-center text-primary">
                      <Phone size={22} />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold">
                        <EditableText
                          value={contentMap.contact_info_phone_label}
                          fallback="الهاتف"
                          fieldKey="contact_info_phone_label"
                          category="contact"
                          label="عنوان الهاتف"
                        />
                      </h4>
                      <a
                        href={telHref}
                        className="text-muted-foreground hover:text-primary transition-colors dir-ltr block"
                      >
                        <EditableContactText
                          value={contactInfo.phone}
                          fallback={contactInfo.phone ?? ""}
                          fieldKey="phone"
                          label="رقم الهاتف"
                        />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/15 border border-white/10 flex items-center justify-center text-primary">
                      <span className="text-primary">
                        <WhatsAppIcon size={22} />
                      </span>
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold">
                        <EditableText
                          value={contentMap.contact_info_whatsapp_label}
                          fallback="واتساب"
                          fieldKey="contact_info_whatsapp_label"
                          category="contact"
                          label="عنوان واتساب"
                        />
                      </h4>
                      <a
                        href={whatsappBookingHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors dir-ltr block"
                      >
                        <EditableContactText
                          value={contactInfo.whatsappNumber}
                          fallback={contactInfo.whatsappNumber ?? ""}
                          fieldKey="whatsapp"
                          label="رقم واتساب"
                        />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/15 border border-white/10 flex items-center justify-center text-primary">
                      <Mail size={22} />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold">
                        <EditableText
                          value={contentMap.contact_info_email_label}
                          fallback="البريد الإلكتروني"
                          fieldKey="contact_info_email_label"
                          category="contact"
                          label="عنوان البريد"
                        />
                      </h4>
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <EditableContactText
                          value={contactInfo.email}
                          fallback={contactInfo.email ?? ""}
                          fieldKey="email"
                          label="البريد الإلكتروني"
                        />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black/15 border border-white/10 flex items-center justify-center text-primary">
                      <MapPin size={22} />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold">
                        <EditableText
                          value={contentMap.contact_info_location_label}
                          fallback="الموقع"
                          fieldKey="contact_info_location_label"
                          category="contact"
                          label="عنوان الموقع"
                        />
                      </h4>
                      <p className="text-muted-foreground">
                        <EditableContactText
                          value={contactInfo.location}
                          fallback={contactInfo.location ?? ""}
                          fieldKey="location"
                          label="الموقع"
                          multiline
                        />
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="premium-border bg-card/40 border border-white/10 p-7 md:p-9">
                <h2 className="text-xl font-bold mb-5">
                  <EditableText
                    value={contentMap.contact_follow_title}
                    fallback="تابعنا على"
                    fieldKey="contact_follow_title"
                    category="contact"
                    label="عنوان تابعنا"
                  />
                </h2>
                <div className="flex flex-wrap gap-3">
                  <EditableLinkIcon
                    value={socialLinks.instagram}
                    fieldKey="instagram"
                    label="رابط إنستجرام"
                    placeholder="https://instagram.com/..."
                    ariaLabel="Instagram"
                    linkClassName="hero-social-btn hero-social--ig"
                    allowEdit={false}
                  >
                    <Instagram size={22} />
                  </EditableLinkIcon>
                  <EditableLinkIcon
                    value={socialLinks.facebook}
                    fieldKey="facebook"
                    label="رابط فيسبوك"
                    placeholder="https://facebook.com/..."
                    ariaLabel="Facebook"
                    linkClassName="hero-social-btn hero-social--fb"
                    allowEdit={false}
                  >
                    <Facebook size={22} />
                  </EditableLinkIcon>
                  <EditableLinkIcon
                    value={socialLinks.tiktok}
                    fieldKey="tiktok"
                    label="رابط تيك توك"
                    placeholder="https://tiktok.com/..."
                    ariaLabel="TikTok"
                    linkClassName="hero-social-btn hero-social--tt"
                    allowEdit={false}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                    </svg>
                  </EditableLinkIcon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a
        href={whatsappBookingHref}
        target="_blank"
        rel="noreferrer"
        className="fixed z-50 premium-border bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg flex items-center gap-2 px-5 py-3 md:px-0 md:py-0 md:w-14 md:h-14 md:rounded-full rounded-full"
        style={{ right: "1rem", bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        title="تواصل عبر واتساب"
      >
        <WhatsAppIcon />
        <span className="text-sm font-semibold md:hidden">
          <EditableText
            value={contentMap.contact_floating_label}
            fallback="واتساب"
            fieldKey="contact_floating_label"
            category="contact"
            label="زر واتساب العائم"
          />
        </span>
      </a>

      <style>{`
        .contact-hint {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.4);
          background:
            linear-gradient(140deg, rgba(255,210,120,0.18), rgba(10,10,14,0.65) 65%),
            radial-gradient(circle at 20% 20%, rgba(255,245,210,0.25), transparent 60%);
          color: rgba(255,245,220,0.95);
          font-size: 12.5px;
          line-height: 1.6;
          text-shadow: 0 0 18px rgba(255,210,130,0.55);
          box-shadow: 0 12px 30px rgba(0,0,0,0.35), 0 0 22px rgba(255,210,130,0.18);
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }
        .contact-hint::after {
          content: "";
          position: absolute;
          inset: -120% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.6) 46%, transparent 70%);
          transform: translateX(-120%);
          animation: contact-shine 5.5s ease-in-out infinite;
          opacity: 0.55;
          pointer-events: none;
        }
        .contact-hint-icon {
          color: rgba(255,220,150,0.95);
          filter: drop-shadow(0 0 10px rgba(255,210,130,0.6));
        }
        .date-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          text-align: right;
          cursor: pointer;
        }
        .date-trigger-value {
          flex: 1;
          color: rgba(255,245,220,0.9);
          text-shadow: 0 0 12px rgba(255,210,130,0.35);
          letter-spacing: 0.04em;
        }
        .date-trigger-icon {
          width: 18px;
          height: 18px;
          color: rgba(255,210,120,0.8);
          filter: drop-shadow(0 0 10px rgba(255,210,130,0.35));
        }
        .field-error {
          border-color: rgba(255,90,90,0.9) !important;
          box-shadow:
            0 0 0 2px rgba(255,80,80,0.2),
            0 0 16px rgba(255,80,80,0.35);
        }
        .field-shake {
          animation: field-shake 0.32s ease-in-out;
        }
        @keyframes field-shake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        .date-modal-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(0,0,0,0.6);
          z-index: 120;
        }
        .date-modal-panel {
          width: min(92vw, 360px);
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(8,8,10,0.96), rgba(8,8,10,0.9));
          box-shadow: 0 24px 70px rgba(0,0,0,0.55);
          padding: 14px;
          font-family: "Cairo", sans-serif;
        }
        .date-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .date-modal-title {
          font-size: 0.85rem;
          color: rgba(255,245,220,0.75);
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .date-modal-close {
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(255,210,120,0.08);
          color: rgba(255,245,220,0.95);
          padding: 8px 24px;
          border-radius: 999px;
          font-size: 1rem;
          letter-spacing: 0.08em;
          font-family: "Cairo", sans-serif;
          font-weight: 700;
          box-shadow: 0 0 14px rgba(255,210,130,0.35);
          position: relative;
          overflow: hidden;
        }
        .date-modal-close::after {
          content: "";
          position: absolute;
          inset: -50% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.55) 45%, transparent 70%);
          transform: translateX(-140%);
          animation: date-cta-shine 2.8s ease-in-out infinite;
          opacity: 0.6;
          pointer-events: none;
        }
        .date-modal-footer {
          display: flex;
          justify-content: center;
          margin-top: 12px;
        }
        .wheel-picker {
          display: flex;
          flex-direction: row;
          direction: rtl;
          gap: 10px;
          padding: 4px 0;
          justify-content: center;
        }
        .wheel-column-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          max-width: 88px;
          min-width: 74px;
        }
        .wheel-label {
          text-align: center;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,235,200,0.9);
          text-shadow: 0 0 12px rgba(255,210,130,0.45);
          font-family: "Cairo", sans-serif;
        }
        .wheel-column {
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255,220,160,0.18);
          background:
            linear-gradient(180deg, rgba(28,24,20,0.85), rgba(8,8,12,0.96)),
            radial-gradient(circle at 20% 20%, rgba(255,210,120,0.2), transparent 60%);
          padding: 0;
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px rgba(255,210,120,0.12),
            0 10px 26px rgba(0,0,0,0.5);
        }
        .wheel-column--fixed {
          opacity: 0.8;
        }
        .wheel-column--fixed .wheel-item {
          color: rgba(255,235,200,0.85);
        }
        .wheel-column--fixed .wheel-item--selected {
          color: rgba(255,245,220,0.98);
          text-shadow:
            0 0 12px rgba(255,210,130,0.7),
            0 0 24px rgba(255,210,130,0.45);
        }
        .wheel-list {
          height: 136px;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          scrollbar-width: none;
          text-align: center;
          direction: ltr;
          -webkit-overflow-scrolling: touch;
        }
        .wheel-list--fixed {
          overflow: hidden;
          pointer-events: none;
        }
        .wheel-list::-webkit-scrollbar {
          display: none;
        }
        .wheel-item {
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.05rem;
          font-weight: 700;
          font-family: "Cairo", sans-serif;
          color: rgba(255,255,255,0.65);
          font-variant-numeric: tabular-nums;
          scroll-snap-align: center;
          transition: color 0.2s ease, text-shadow 0.2s ease, transform 0.2s ease;
          width: 100%;
          text-align: center;
          line-height: 1;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          outline: none;
        }
        .wheel-item--selected {
          color: rgba(255,245,220,0.98);
          font-weight: 700;
          text-shadow:
            0 0 10px rgba(255,210,130,0.65),
            0 0 18px rgba(255,210,130,0.35);
          background: transparent;
          border-radius: 0;
          box-shadow: none;
        }
        .wheel-item:disabled {
          cursor: default;
          opacity: 0.7;
        }
        .wheel-highlight {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 68%;
          height: 28px;
          transform: translate(-50%, -50%);
          border-radius: 6px;
          border: 1.5px solid rgba(255,210,120,0.6);
          background: transparent;
          box-shadow: 0 0 18px rgba(255,210,130,0.45);
          pointer-events: none;
          animation: wheel-glow 2.6s ease-in-out infinite;
          opacity: 1;
        }
        .wheel-column::after {
          content: "";
          position: absolute;
          inset: -120% -20%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.4) 45%, transparent 70%);
          transform: translateX(-120%);
          animation: wheel-shine 5.2s ease-in-out infinite;
          opacity: 0.4;
          pointer-events: none;
        }
        @keyframes wheel-glow {
          0%, 100% { box-shadow: 0 0 18px rgba(255,210,130,0.28); }
          50% { box-shadow: 0 0 26px rgba(255,210,130,0.45); }
        }
        @keyframes wheel-shine {
          0% { transform: translateX(-120%); }
          65% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes date-cta-shine {
          0% { transform: translateX(-140%); }
          55% { transform: translateX(140%); }
          100% { transform: translateX(140%); }
        }
        .receipt-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-size: 0.95rem;
          color: rgba(255,245,230,0.9);
          padding: 14px;
          border-radius: var(--surface-radius);
          border: 1px solid rgba(255,210,120,0.22);
          background: linear-gradient(145deg, rgba(14,14,20,0.7), rgba(8,8,12,0.45));
          box-shadow: 0 16px 40px rgba(0,0,0,0.35);
        }
        .receipt-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 640px) {
          .receipt-grid {
            grid-template-columns: 1fr;
          }
        }
        .receipt-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          border-radius: var(--surface-radius);
          border: 1px solid rgba(255,210,120,0.18);
          background: rgba(18,18,24,0.55);
        }
        .receipt-label {
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          color: rgba(255,235,210,0.82);
          white-space: nowrap;
        }
        .receipt-value {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255,245,230,0.95);
          text-align: right;
          word-break: break-word;
        }
        .receipt-value--total {
          font-size: 1.1rem;
          color: rgba(255,220,150,0.95);
          text-shadow: 0 0 16px rgba(255,210,130,0.5);
        }
        .receipt-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .receipt-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .receipt-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06);
          color: rgba(255,245,230,0.88);
          min-width: 44px;
        }
        .receipt-pill--active {
          border-color: rgba(255,210,120,0.45);
          background: rgba(255,210,120,0.12);
          color: rgba(255,235,190,0.95);
        }
        .receipt-pill--muted {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.6);
        }
        .receipt-tags {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .receipt-tags li {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(10,10,14,0.4);
          font-size: 0.88rem;
          color: rgba(255,245,230,0.92);
        }
        .receipt-bullets {
          margin: 10px 0 0;
          padding: 0 18px 0 0;
          list-style: disc;
          display: grid;
          gap: 6px;
          color: rgba(255,245,230,0.92);
          font-size: 0.9rem;
          line-height: 1.7;
        }
        .receipt-bullets li::marker {
          color: rgba(255,210,130,0.85);
        }
        .receipt-muted {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.55);
        }
        .receipt-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: var(--surface-radius);
          border: 1px solid rgba(255,210,120,0.45);
          background: linear-gradient(135deg, rgba(255,210,120,0.18), rgba(10,10,14,0.5));
          box-shadow: 0 12px 30px rgba(0,0,0,0.35);
        }
        .package-option-row {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .package-option-row--trigger {
          align-items: center;
        }
        .package-option-label {
          color: rgba(255,245,230,0.92);
          text-shadow: 0 0 12px rgba(255,210,130,0.25);
          font-weight: 600;
        }
        .package-option-meta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .package-option-badge {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          color: #fff4d5;
          border: 1px solid rgba(255,210,120,0.55);
          background: linear-gradient(120deg, rgba(255,210,120,0.45), rgba(255,255,255,0.1));
          box-shadow: 0 0 14px rgba(255,200,80,0.45);
        }
        .package-option-badge--discount {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-color: rgba(255,200,120,0.8);
          background: linear-gradient(120deg, rgba(255,200,120,0.7), rgba(255,255,255,0.12));
          box-shadow: 0 0 18px rgba(255,180,80,0.55);
        }
        .package-option-badge-icon {
          width: 12px;
          height: 12px;
          color: rgba(255,255,255,0.95);
          filter: drop-shadow(0 0 8px rgba(255,210,130,0.75));
        }
        .package-option-price {
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255,230,190,0.95);
          text-shadow:
            0 0 12px rgba(255,210,130,0.45),
            0 0 20px rgba(255,210,130,0.25);
          white-space: nowrap;
        }
        .prints-popover-body {
          max-height: 60vh;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding-right: 4px;
        }
        .prints-popover-body::-webkit-scrollbar {
          width: 6px;
        }
        .prints-popover-body::-webkit-scrollbar-thumb {
          background: rgba(255,210,120,0.4);
          border-radius: 999px;
        }
        .prints-popover-body::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }
        .prints-popover-footer {
          margin-top: 10px;
        }
        .print-option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.95rem;
          padding: 8px 6px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,10,14,0.45);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .print-option:hover {
          border-color: rgba(255,210,120,0.35);
          box-shadow: 0 0 18px rgba(255,210,130,0.2);
        }
        .print-option-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .print-option-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .print-option-label {
          color: rgba(255,245,230,0.92);
          font-size: 0.92rem;
        }
        .print-option-price {
          font-size: 0.78rem;
          color: rgba(255,235,200,0.85);
        }
        .print-qty {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 10px;
          border: 1px dashed rgba(255,210,120,0.45);
          background: rgba(12,12,16,0.55);
          box-shadow: inset 0 0 0 1px rgba(255,210,120,0.12);
        }
        .print-qty-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,230,190,0.95);
        }
        .print-qty-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,210,120,0.95);
          box-shadow: 0 0 10px rgba(255,210,130,0.75);
          animation: custom-dot-pulse 1.6s ease-in-out infinite;
        }
        .print-qty-controls {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .print-qty-btn {
          width: 22px;
          height: 22px;
          border-radius: 8px;
          border: 1px solid rgba(255,210,120,0.6);
          background: rgba(10,10,14,0.7);
          color: rgba(255,245,220,0.95);
          font-weight: 700;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .print-qty-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .print-qty-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 0 12px rgba(255,210,130,0.45);
        }
        .print-qty-value {
          min-width: 20px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,245,220,0.95);
        }
        .print-qty-pill {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.55);
          color: rgba(255,230,190,0.95);
        }
        @keyframes contact-shine {
          0% { transform: translateX(-120%); }
          65% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes custom-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>

      {typeof document !== "undefined" && calendarOpen
        ? createPortal(
            <div
              className="date-modal-overlay"
              onClick={() => setCalendarOpen(false)}
            >
              <div
                className="date-modal-panel"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="date-modal-header">
                  <span className="date-modal-title">اختر التاريخ</span>
                </div>
                <div className="md:hidden">
                  <div className="wheel-picker">
                    <WheelColumn
                      label="اليوم"
                      value={baseDay}
                      options={dayOptions}
                      onChange={(day) => updateDateParts({ day })}
                    />
                    <WheelColumn
                      label="الشهر"
                      value={baseMonth}
                      options={monthOptions}
                      onChange={(month) => updateDateParts({ month })}
                    />
                    <WheelColumn
                      label="السنة"
                      value={baseYear}
                      options={yearOptions}
                      onChange={(year) => updateDateParts({ year })}
                    />
                  </div>
                </div>

                <div className="hidden md:block">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (!date) return;
                      form.setValue("date", formatIsoDate(date), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setCalendarOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={yearRangeStart}
                    toYear={yearRangeEnd}
                    formatters={{
                      formatMonthDropdown: (date) =>
                        String(date.getMonth() + 1).padStart(2, "0"),
                      formatYearDropdown: (date) =>
                        String(date.getFullYear()),
                      formatDay: (date) =>
                        String(date.getDate()).padStart(2, "0"),
                    }}
                  />
                </div>
                <div className="date-modal-footer">
                  <button
                    type="button"
                    className="date-modal-close"
                    onClick={() => setCalendarOpen(false)}
                  >
                    تم
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <Footer />
    </div>
  );
}

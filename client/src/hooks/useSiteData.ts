import { useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { parseContentValue } from "@/lib/contentMeta";
import { isExplicitlyVisible } from "@/lib/visibility";
import {
  additionalServices,
  contactInfo as fallbackContact,
  homeHero,
  sessionPackages,
  sessionPackagesWithPrints,
  socialLinks as fallbackSocial,
  faqItems as fallbackFaqItems,
  testimonials as fallbackTestimonials,
  weddingPackages,
  siteImages,
  aboutContent,
} from "@/config/siteConfig";

type PackageLike = {
  id: string | number;
  name: string;
  price: string;
  description?: string | null;
  features?: string[] | null;
  category?: string | null;
  popular?: boolean | null;
  featured?: boolean | null;
  emoji?: string | null;
  badge?: string | null;
  priceNote?: string | null;
  visible?: boolean | null;
  sortOrder?: number | null;
  offsetX?: number | null;
  offsetY?: number | null;
};

function normalizePackages(list: PackageLike[]) {
  return list
    .map((pkg) => ({
      id: String(pkg.id),
      name: pkg.name,
      price: pkg.price,
      description: pkg.description ?? "",
      features: Array.isArray(pkg.features) ? pkg.features : [],
      category: pkg.category ?? "session",
      popular: Boolean(pkg.popular),
      featured: Boolean(pkg.featured),
      emoji: pkg.emoji ?? undefined,
      badge: pkg.badge ?? undefined,
      priceNote: pkg.priceNote ?? undefined,
      visible: isExplicitlyVisible(pkg.visible),
      sortOrder: pkg.sortOrder ?? 0,
      offsetX: typeof pkg.offsetX === "number" ? pkg.offsetX : 0,
      offsetY: typeof pkg.offsetY === "number" ? pkg.offsetY : 0,
    }))
    .filter((pkg) => pkg.visible)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function useContactData() {
  const { data, refetch } = trpc.contactInfo.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "siteContactUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const map = useMemo(() => {
    const out: Record<string, string> = {};
    (data ?? []).forEach((item) => {
      const parsed = parseContentValue(item.value);
      out[item.key] = parsed.hidden ? "" : parsed.text;
    });
    return out;
  }, [data]);

  const contactInfo = {
    phone: map.phone ?? fallbackContact.phone,
    whatsappNumber: map.whatsapp ?? map.whatsappNumber ?? fallbackContact.whatsappNumber,
    email: map.email ?? fallbackContact.email,
    location: map.location ?? fallbackContact.location,
  };

  const socialLinks = {
    instagram: map.instagram ?? fallbackSocial.instagram,
    facebook: map.facebook ?? fallbackSocial.facebook,
    tiktok: map.tiktok ?? fallbackSocial.tiktok,
  };

  return { contactInfo, socialLinks };
}

export function usePackagesData() {
  const { data, refetch } = trpc.packages.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sitePackagesUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const fallbackList: PackageLike[] = [
    ...sessionPackages.map((p) => ({ ...p, category: "session" })),
    ...sessionPackagesWithPrints.map((p) => ({ ...p, category: "prints" })),
    ...weddingPackages.map((p) => ({ ...p, category: "wedding" })),
    ...additionalServices.map((p) => ({ ...p, category: "addon" })),
  ];

  const normalized = normalizePackages(
    data && data.length ? (data as PackageLike[]) : fallbackList
  );

  const byCategory = {
    session: normalized.filter((p) => p.category === "session"),
    prints: normalized.filter((p) => p.category === "prints"),
    wedding: normalized.filter((p) => p.category === "wedding"),
    addon: normalized.filter((p) => p.category === "addon"),
  };

  return {
    sessionPackages: byCategory.session,
    sessionPackagesWithPrints: byCategory.prints,
    weddingPackages: byCategory.wedding,
    additionalServices: byCategory.addon,
  };
}

export function useTestimonialsData() {
  const { data, refetch } = trpc.testimonials.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "siteTestimonialsUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const list = useMemo(() => {
    const source = data && data.length ? data : fallbackTestimonials;
    return source
      .map((item: any) => ({
        name: item.name,
        quote: item.quote,
        visible: isExplicitlyVisible(item.visible),
        sortOrder: item.sortOrder ?? 0,
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      }))
      .filter((t: any) => t.visible)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [data]);

  return list;
}

export function useFaqData() {
  const { data, refetch } = trpc.faqs.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "siteFaqUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const list = useMemo(() => {
    const source = data && data.length ? data : fallbackFaqItems;
    return source
      .map((item: any, index: number) => ({
        id: item.id ?? index,
        question: item.question,
        answer: item.answer,
        visible: isExplicitlyVisible(item.visible),
        sortOrder: item.sortOrder ?? 0,
      }))
      .filter((t: any) => t.visible)
      .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [data]);

  return list;
}

export function usePortfolioData() {
  const { data, refetch } = trpc.portfolio.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sitePortfolioUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const gallery = useMemo(() => {
    if (data && data.length) {
      return data
        .filter((img: any) => isExplicitlyVisible(img.visible))
        .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((img: any) => ({
          id: img.id,
          src: img.url,
          title: img.title,
          category: img.category,
          offsetX: typeof img.offsetX === "number" ? img.offsetX : 0,
          offsetY: typeof img.offsetY === "number" ? img.offsetY : 0,
        }));
    }
    return (siteImages.portfolioGallery ?? []).map((img) => ({
      ...img,
      id: null,
      offsetX: 0,
      offsetY: 0,
    }));
  }, [data]);

  return { gallery };
}

export function useContentData() {
  const { data, refetch } = trpc.siteContent.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "siteContentUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const map = useMemo(() => {
    const out: Record<string, string> = {};
    (data ?? []).forEach((item) => {
      const parsed = parseContentValue(item.value);
      out[item.key] = parsed.hidden ? "" : parsed.text;
    });
    return out;
  }, [data]);

  const positionMap = useMemo(() => {
    const out: Record<string, { offsetX: number; offsetY: number }> = {};
    (data ?? []).forEach((item: any) => {
      out[item.key] = {
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);

  return {
    contentMap: map,
    positionMap,
    heroTitle: map.hero_title ?? "",
    heroSubtitle: map.hero_subtitle ?? "",
    heroDescription: map.hero_description ?? homeHero.subTextAr ?? "",
    aboutSubtitle: map.about_subtitle ?? aboutContent.subtitle ?? "",
    aboutTitle: map.about_title ?? aboutContent.title ?? "",
    aboutDescription: map.about_description ?? aboutContent.description ?? "",
    ctaTitle: map.cta_title ?? "",
    ctaDescription: map.cta_description ?? "",
  };
}

export function useSiteImagesData() {
  const { data, refetch } = trpc.siteImages.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "siteImagesUpdatedAt") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refetch]);

  const map = useMemo(() => {
    const out: Record<
      string,
      { url: string; alt?: string | null; offsetX: number; offsetY: number }
    > = {};
    (data ?? []).forEach((item: any) => {
      out[item.key] = {
        url: item.url,
        alt: item.alt,
        offsetX: typeof item.offsetX === "number" ? item.offsetX : 0,
        offsetY: typeof item.offsetY === "number" ? item.offsetY : 0,
      };
    });
    return out;
  }, [data]);

  return { imageMap: map };
}

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Check,
  Star,
  Sparkles,
  ZoomIn,
  Instagram,
  Facebook,
  ArrowDownRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  photographerInfo,
  siteImages,
  aboutContent,
  homeHero,
  homeServicesPreview,
  externalPortfolioUrl,
} from "@/config/siteConfig";
import { useContactData, useContentData, usePortfolioData, useTestimonialsData, useSiteImagesData } from "@/hooks/useSiteData";
import { EditableImage, EditableLinkIcon, EditableText, useInlineEditMode } from "@/components/InlineEdit";
import { getOffsetStyle } from "@/lib/positioning";

function ServiceIcon({ title }: { title: string }) {
  const t = title.toLowerCase();
  if (t.includes("زفاف") || t.includes("wedding")) return <CoupleIcon className="w-12 h-12 text-primary mb-6" />;
  if (t.includes("vip")) return <Sparkles className="w-12 h-12 text-primary mb-6" />;
  return <Camera className="w-12 h-12 text-primary mb-6" />;
}

function CoupleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20 30c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M44 30c5 0 9-4 9-9s-4-9-9-9-9 4-9 9 4 9 9 9Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M6 54c2-9 10-15 19-15s17 6 19 15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M22 54c2-8 9-13 16-13s14 5 16 13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 18c0 4-3 7-7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M32 18c0 4 3 7 7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarsRow() {
  return (
    <div className="flex items-center gap-1 text-primary testimonial-stars">
      <Star className="w-4 h-4" />
      <Star className="w-4 h-4" />
      <Star className="w-4 h-4" />
      <Star className="w-4 h-4" />
      <Star className="w-4 h-4" />
    </div>
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

function MosaicCard({
  img,
  onClick,
  className,
  eager = false,
  imageKey,
  imageLabel,
}: {
  img: { src: string; title: string; offsetX?: number; offsetY?: number };
  onClick: () => void;
  className?: string;
  eager?: boolean;
  imageKey?: string;
  imageLabel?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const { enabled } = useInlineEditMode();
  const trigger = () => {
    if (!enabled) onClick();
  };
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (enabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    trigger();
  };

  return (
    <div style={getOffsetStyle(img.offsetX, img.offsetY)}>
      <div
        className={[
          "mosaic-card premium-border border border-white/10 overflow-hidden group",
          loaded ? "is-loaded" : "",
          className ?? "",
        ].join(" ")}
        onClick={handleClick}
        aria-label="Open external portfolio"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            trigger();
          }
        }}
        style={{
          backgroundImage: `url('${img.src}')`,
        }}
      >
      {enabled && imageKey ? (
        <div className="absolute top-3 right-3 z-20">
          <EditableImage
            src={img.src}
            alt={img.title}
            fieldKey={imageKey}
            category="portfolio"
            label={imageLabel ?? "صورة المعرض"}
            className="w-fit"
            imgClassName="hidden"
            overlayClassName="opacity-100"
          />
        </div>
      ) : null}
      <img
        src={img.src}
        alt={img.title}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className="mosaic-img"
      />

      <div className="absolute inset-0 mosaic-overlay" />
      <div className="absolute inset-0 mosaic-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center">
        <span className="camera-badge">📸</span>
      </div>
      </div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLElement | null>(null);
  const { contactInfo, socialLinks } = useContactData();
  const { enabled: inlineEditEnabled } = useInlineEditMode();
  const [, setLocation] = useLocation();
  const content = useContentData();
  const contentMap = content.contentMap ?? {};
  const testimonials = useTestimonialsData();
  const { gallery } = usePortfolioData();
  const { imageMap } = useSiteImagesData();

  const heroImage = imageMap.heroImage?.url ?? siteImages.heroImage;
  const heroImageMobile =
    imageMap.heroImageMobile?.url ?? siteImages.heroImageMobile ?? heroImage;
  const aboutImage = imageMap.aboutImage?.url ?? siteImages.aboutImage;
  const heroOffsetX = imageMap.heroImage?.offsetX ?? 0;
  const heroOffsetY = imageMap.heroImage?.offsetY ?? 0;
  const getValue = (key: string, fallback: string = "") =>
    (contentMap[key] as string | undefined) ?? fallback;
  const handleAboutStoryClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (inlineEditEnabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const formatWhatsAppHref = (value: string) => {
    const phone = (value ?? "").replace(/[^\d]/g, "");
    return phone ? `https://wa.me/${phone}` : "";
  };

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (heroRef.current) {
          const scrolled = window.scrollY;
          heroRef.current.style.transform = `translate3d(${heroOffsetX}px, ${heroOffsetY + scrolled * 0.35}px, 0)`;
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [heroOffsetX, heroOffsetY]);

  const heroFallbackNode = useMemo(() => {
    const h = homeHero?.headlineAr;
    if (h) {
      return (
        <>
          {h.line1Prefix} <span className="italic text-primary">{h.highlight}</span>
          <br />
          {h.line2}
        </>
      );
    }
    return (
      <>
        مش مجرد <span className="italic text-primary">صور</span>
        <br />
        دي ذكريات متعاشة
      </>
    );
  }, []);

  const heroFallbackText = useMemo(() => {
    const h = homeHero?.headlineAr;
    if (h) {
      return `${h.line1Prefix} ${h.highlight}\n${h.line2}`.trim();
    }
    return "مش مجرد صور\nدي ذكريات متعاشة";
  }, []);

  const galleryWithKeys = useMemo(() => {
    if (!gallery.length) return [];
    return gallery.map((img, index) => {
      const editKey = img.id ? `portfolio_${img.id}` : `portfolio_fallback_${index + 1}`;
      const override = imageMap[editKey]?.url;
      return {
        ...img,
        src: override ?? img.src,
        editKey,
        editLabel: `صورة المعرض ${index + 1}`,
      };
    });
  }, [gallery, imageMap]);

  const safeGallery = useMemo(() => {
    if (!galleryWithKeys.length) return [];
    const min = 16;
    if (galleryWithKeys.length >= min) return galleryWithKeys;
    const times = Math.ceil(min / galleryWithKeys.length);
    const out: typeof galleryWithKeys = [];
    for (let i = 0; i < times; i++) out.push(...galleryWithKeys);
    return out;
  }, [galleryWithKeys]);

  const mobileGallery = useMemo(() => {
    if (!galleryWithKeys.length) return [];
    if (galleryWithKeys.length <= 8) return galleryWithKeys;
    return galleryWithKeys.slice(0, 8);
  }, [galleryWithKeys]);

  const desktopGallery = useMemo(() => {
    if (!safeGallery.length) return [];
    return safeGallery.slice(0, 5);
  }, [safeGallery]);

  const collageLayout = [
    "gallery-hero",
    "gallery-tall",
    "gallery-wide",
    "gallery-stack",
    "gallery-stack-2",
  ];

  const topTestimonials = useMemo(() => (testimonials ?? []).slice(0, 3), [testimonials]);

  const goPortfolio = () => {
    window.location.href = externalPortfolioUrl;
  };

  const setSpot = (clientX: number, clientY: number) => {
    const el = portfolioRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    el.style.setProperty("--spot-x", `${x}%`);
    el.style.setProperty("--spot-y", `${y}%`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative z-10">
      <Navbar />

      {/* HERO */}
      <header className="relative min-h-[60vh] md:min-h-[80vh] w-full overflow-hidden flex items-center justify-center pt-[calc(var(--nav-offset,96px)+8px)]">
        <div
          ref={heroRef}
          className="absolute inset-0 w-full h-[120%] bg-cover bg-center z-0 will-change-transform hero-image"
          style={{
            // @ts-ignore
            "--hero-image": `url('${heroImage}')`,
            "--hero-image-mobile": `url('${heroImageMobile}')`,
            filter: "brightness(0.36)",
          }}
        />

        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/10 via-background/25 to-background" />
        <div className="absolute inset-0 z-10 pointer-events-none [background:radial-gradient(circle_at_50%_35%,rgba(255,200,80,0.10),transparent_55%)]" />
        <div className="absolute inset-0 z-10 pointer-events-none hero-grain opacity-[0.12]" />
        <div className="absolute inset-x-0 bottom-0 h-28 md:h-40 z-10 pointer-events-none hero-bottom-fade" />

        <div className="absolute top-6 right-6 z-30 flex flex-col gap-2">
          <EditableImage
            src={heroImage}
            alt="Hero"
            fieldKey="heroImage"
            category="home"
            label="صورة الهيرو"
            className="w-fit"
            imgClassName="hidden"
            overlayClassName="opacity-100"
          />
          <EditableImage
            src={heroImageMobile}
            alt="Hero mobile"
            fieldKey="heroImageMobile"
            category="home"
            label="صورة الهيرو للموبايل"
            className="w-fit"
            imgClassName="hidden"
            overlayClassName="opacity-100"
          />
        </div>

        <div className="relative z-20 container mx-auto px-4 text-center flex flex-col items-center -translate-y-1 md:-translate-y-6 animate-in fade-in zoom-in duration-1000">
          <h2 className="text-primary text-lg md:text-xl tracking-[0.3em] uppercase mb-4 font-medium">
            <EditableText
              value={contentMap.home_hero_overline}
              fallback={photographerInfo.title}
              fieldKey="home_hero_overline"
              category="home"
              label="عنوان الهيرو العلوي"
            />
          </h2>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            <EditableText
              value={content.heroTitle}
              fallback={heroFallbackText}
              fallbackNode={heroFallbackNode}
              fieldKey="hero_title"
              category="home"
              label="عنوان الصفحة الرئيسية"
              multiline
              className="block"
              displayClassName="whitespace-pre-line"
            />
          </h1>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="hero-follow-title">
              <EditableText
                value={contentMap.home_follow_title}
                fallback="تابعنا"
                fieldKey="home_follow_title"
                category="home"
                label="عنوان تابعنا"
              />
            </div>
            <div className="hero-follow-icons">
              <EditableLinkIcon
                value={socialLinks.instagram}
                fieldKey="instagram"
                label="رابط إنستجرام"
                placeholder="https://instagram.com/..."
                ariaLabel="Instagram"
                linkClassName="hero-social-btn hero-social--ig"
                allowEdit={false}
              >
                <Instagram size={20} />
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
                <Facebook size={20} />
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
                  width="20"
                  height="20"
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
              <EditableLinkIcon
                value={contactInfo.whatsappNumber}
                fieldKey="whatsapp"
                label="رقم واتساب"
                placeholder="2010xxxxxxx"
                ariaLabel="WhatsApp"
                formatHref={formatWhatsAppHref}
                linkClassName="hero-social-btn hero-social--wa"
                allowEdit={false}
              >
                <WhatsAppIcon size={20} />
              </EditableLinkIcon>
            </div>
            <div className="hero-follow-glow hero-follow-glow--tight" aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* SERVICES PREVIEW */}
      <section id="services" className="py-16 md:py-20 relative">
        <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(circle_at_15%_25%,rgba(255,200,80,0.10),transparent_55%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
              <EditableText
                value={getValue("home_services_kicker")}
                fallback="الخدمات"
                fieldKey="home_services_kicker"
                category="home"
                label="عنوان صغير (الخدمات)"
              />
            </h3>
            <h2 className="text-4xl md:text-5xl font-bold">
              <EditableText
                value={getValue("home_services_title")}
                fallback="باقات التصوير"
                fieldKey="home_services_title"
                category="home"
                label="عنوان قسم الخدمات"
              />
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
              <EditableText
                value={getValue("home_services_desc")}
                fallback="كلها بتتعمل بنفس الجودة والاهتمام بالتفاصيل لأن التزامي في المواعيد وجودة التسليم جزء من شغلي، مش ميزة إضافية."
                fieldKey="home_services_desc"
                category="home"
                label="وصف قسم الخدمات"
                multiline
              />
            </p>
            <p className="text-muted-foreground mt-5 mb-3 max-w-2xl mx-auto leading-relaxed">
              <EditableText
                value={content.heroDescription}
                fallback={homeHero?.subTextAr || photographerInfo.descriptionAr || ""}
                fieldKey="hero_description"
                category="home"
                label="وصف القسم الرئيسي"
                multiline
                className="block"
              />
            </p>
            <div className="mt-2 flex justify-center">
              <Link href="/services">
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
                >
                  <EditableText
                    value={getValue("home_services_button")}
                    fallback="شوف الباقات"
                    fieldKey="home_services_button"
                    category="home"
                    label="زر شوف الباقات"
                  />
                  <ArrowDownRight className="w-4 h-4 cta-icon" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {homeServicesPreview.map((card, idx) => {
              const featured = !!card.featured;
              const tone = ["tone-amber", "tone-rose", "tone-emerald"][idx % 3];
              const titleIcon = [
                <Camera key="cam" size={15} />,
                <CoupleIcon key="couple" className="w-4 h-4" />,
                <Sparkles key="spark" size={15} />,
              ][idx % 3];
              const isSignature = card.id === "home-service-sessions";
              const baseKey = `home_service_${card.id}`;

              const handleCardClick = (event?: MouseEvent<HTMLDivElement>) => {
                if (inlineEditEnabled) {
                  event?.preventDefault();
                  event?.stopPropagation();
                  return;
                }
                setLocation("/services");
              };

              return (
                <div
                  key={card.id}
                  className={[
                    "relative overflow-hidden group transition-all duration-300 package-card flex flex-col",
                    "bg-card p-8 border rounded-2xl",
                    featured
                      ? "border-primary/30 shadow-2xl shadow-black/50 md:-translate-y-4"
                      : "border-white/10 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(0,0,0,0.55)]",
                    "premium-border",
                    tone,
                    "cursor-pointer",
                  ].join(" ")}
                  role="link"
                  tabIndex={0}
                  aria-label="فتح صفحة الخدمات"
                  onClick={handleCardClick}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardClick();
                    }
                  }}
                >
                  <div
                    className={[
                      "absolute inset-0 pointer-events-none transition-opacity duration-300 card-glow",
                      featured ? "opacity-45" : "opacity-0 group-hover:opacity-100",
                    ].join(" ")}
                  />
                  <div className="card-tap-hint" aria-hidden="true">
                    اضغط للتفاصيل
                  </div>

                  {card.badge ? (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1">
                      <EditableText
                        value={getValue(`${baseKey}_badge`)}
                        fallback={card.badge}
                        fieldKey={`${baseKey}_badge`}
                        category="home"
                        label={`شارة ${card.title}`}
                      />
                    </div>
                  ) : null}

                  {card.vipLabel ? (
                    <div className="vip-label">
                      <EditableText
                        value={getValue(`${baseKey}_vip_label`)}
                        fallback={card.vipLabel}
                        fieldKey={`${baseKey}_vip_label`}
                        category="home"
                        label={`شارة VIP ${card.title}`}
                      />
                    </div>
                  ) : null}

                  <div className="relative z-10 flex flex-col h-full">
                    <div className={featured ? "" : "group-hover:scale-110 transition-transform duration-300"}>
                      <ServiceIcon title={card.title} />
                    </div>

                    <h3 className="card-title-chip">
                      <span className="title-icon">{titleIcon}</span>
                      <span>
                        <EditableText
                          value={getValue(`${baseKey}_title`)}
                          fallback={card.title}
                          fieldKey={`${baseKey}_title`}
                          category="home"
                          label={`عنوان كارت ${card.title}`}
                        />
                      </span>
                    </h3>

                    <div className="card-fade">
                      <p
                        className={[
                          "text-muted-foreground mb-3 leading-relaxed text-sm md:text-base",
                          isSignature ? "card-desc--glow" : "",
                        ].join(" ")}
                      >
                        <EditableText
                          value={getValue(`${baseKey}_description`)}
                          fallback={card.description}
                          fieldKey={`${baseKey}_description`}
                          category="home"
                          label={`وصف كارت ${card.title}`}
                          multiline
                        />
                      </p>
                      {card.note ? (
                        <div className="card-note">
                          <EditableText
                            value={getValue(`${baseKey}_note`)}
                            fallback={card.note}
                            fieldKey={`${baseKey}_note`}
                            category="home"
                            label={`ملاحظة كارت ${card.title}`}
                          />
                        </div>
                      ) : null}

                      <ul className="text-sm text-muted-foreground space-y-2 pb-2">
                        {card.bullets.map((b, bIdx) => (
                          <li key={`${card.id}-b-${bIdx}`} className="flex items-start">
                            <Check size={15} className="ml-2 mt-1 text-primary" />
                            <span>
                              <EditableText
                                value={getValue(`${baseKey}_bullet_${bIdx + 1}`)}
                                fallback={b}
                                fieldKey={`${baseKey}_bullet_${bIdx + 1}`}
                                category="home"
                                label={`نقطة ${bIdx + 1} - ${card.title}`}
                                multiline
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6 mt-auto" />

                    <div className="flex items-center justify-between gap-4">
                      <Link href="/services">
                        <Button
                          variant="outline"
                          className="rounded-none cta-glow cta-size border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <EditableText
                            value={getValue(`${baseKey}_cta`)}
                            fallback="عرض التفاصيل"
                            fieldKey={`${baseKey}_cta`}
                            category="home"
                            label={`زر الكارت ${card.title}`}
                          />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="py-16 md:py-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1 group overflow-hidden">
              <div className="absolute -top-4 -left-4 w-full h-full border border-primary/30 z-0 hidden md:block" />
              <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/55 via-transparent to-black/15" />

              <EditableImage
                src={aboutImage}
                alt="Badr Photography Style"
                fieldKey="aboutImage"
                category="about"
                label="صورة قسم من أنا"
                className="relative z-0 w-full h-[600px] md:h-[600px]"
                imgClassName="
                  w-full h-[600px] object-cover
                  saturate-[1.35] contrast-[1.12] brightness-[1.05]
                  transition-transform duration-[1100ms] ease-out
                  scale-[1.06] md:scale-100
                  md:group-hover:scale-[1.12]
                  shadow-[0_30px_120px_rgba(0,0,0,0.65)]
                "
              />
            </div>

            <div className="order-1 md:order-2 text-right">
              <h3 className="about-subtitle">
                <EditableText
                  value={content.aboutSubtitle}
                  fallback={aboutContent.subtitle ?? ""}
                  fieldKey="about_subtitle"
                  category="about"
                  label="عنوان فرعي (من أنا)"
                />
              </h3>
              <h2 className="about-name">
                <EditableText
                  value={content.aboutTitle?.trim() ? content.aboutTitle : undefined}
                  fallback={aboutContent.title ?? ""}
                  fieldKey="about_title"
                  category="about"
                  label="عنوان صفحة من أنا"
                  multiline
                />
              </h2>
              <Link
                href="/about"
                className="about-story-link"
                onClick={handleAboutStoryClick}
                aria-label="افتح قسم من أنا"
              >
                <div className="about-story">
                  <div className="about-story-mask">
                    <p className="about-text">
                      <EditableText
                        value={content.aboutDescription}
                        fallback={aboutContent.description ?? ""}
                        fieldKey="about_description"
                        category="about"
                        label="وصف صفحة من أنا"
                        multiline
                      />
                    </p>
                  </div>
                  <span className="about-more">عرض المزيد</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Story Gallery */}
      <section
        ref={(el) => {
          portfolioRef.current = el;
        }}
        className="py-16 md:py-20 relative overflow-hidden"
        onMouseMove={(e) => setSpot(e.clientX, e.clientY)}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) setSpot(t.clientX, t.clientY);
        }}
        style={{
          // @ts-ignore
          "--spot-x": "50%",
          "--spot-y": "35%",
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-45 [background:radial-gradient(circle_at_85%_25%,rgba(255,200,80,0.10),transparent_55%)]" />
        <div className="absolute inset-0 pointer-events-none spotlight-layer" />
        <div className="absolute inset-0 pointer-events-none gallery-frame" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="relative">
            <div className="md:hidden">
              <div className="gallery-rail">
                {mobileGallery.map((img, i) => (
                  <MosaicCard
                    key={`m-${img.src}-${i}`}
                    img={img}
                    onClick={goPortfolio}
                    eager={i < 2}
                    className="gallery-slide aspect-[4/5]"
                    imageKey={img.editKey}
                    imageLabel={img.editLabel}
                  />
                ))}
              </div>
              <div className="gallery-hint">
                <EditableText
                  value={getValue("home_gallery_hint")}
                  fallback="اسحب لمشاهدة المزيد"
                  fieldKey="home_gallery_hint"
                  category="home"
                  label="تلميح المعرض"
                />
              </div>

            </div>

            <div className="hidden md:block">
              <div className="gallery-collage">
                {desktopGallery.map((img, i) => (
                  <MosaicCard
                    key={`d-${img.src}-${i}`}
                    img={img}
                    onClick={goPortfolio}
                    eager={i < 2}
                    className={["gallery-card h-full", collageLayout[i] ?? ""].join(" ")}
                    imageKey={img.editKey}
                    imageLabel={img.editLabel}
                  />
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto">
            {aboutContent.stats.map((s, index) => (
              <div
                key={s.label}
                className="bg-card/40 border border-white/10 backdrop-blur-sm px-3 py-4 text-center premium-border"
              >
                <div className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground">
                  <EditableText
                    value={getValue(`about_stat_${index + 1}_number`)}
                    fallback={s.number}
                    fieldKey={`about_stat_${index + 1}_number`}
                    category="about"
                    label={`رقم الإحصائية ${index + 1}`}
                  />
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">
                  <EditableText
                    value={getValue(`about_stat_${index + 1}_label`)}
                    fallback={s.label}
                    fieldKey={`about_stat_${index + 1}_label`}
                    category="about"
                    label={`عنوان الإحصائية ${index + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO CTA */}
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(circle_at_35%_25%,rgba(255,200,80,0.12),transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
            <EditableText
              value={getValue("home_portfolio_kicker")}
              fallback="المعرض"
              fieldKey="home_portfolio_kicker"
              category="home"
              label="عنوان المعرض الصغير"
            />
          </h3>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <EditableText
              value={getValue("home_portfolio_title")}
              fallback="شوف جزء من تصويري بالكوالتي الكاملة"
              fieldKey="home_portfolio_title"
              category="home"
              label="عنوان قسم المعرض"
              multiline
            />
          </h2>

          <a
            href={externalPortfolioUrl}
            className="border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none inline-flex items-center gap-2 cta-glow cta-size"
            target="_blank"
            rel="noreferrer"
          >
            <EditableText
              value={getValue("home_portfolio_button")}
              fallback="عرض المعرض كامل"
              fieldKey="home_portfolio_button"
              category="home"
              label="زر المعرض"
            />
            <ZoomIn className="w-4 h-4" />
          </a>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <EditableLinkIcon
              value={socialLinks.instagram}
              fieldKey="instagram"
              label="رابط إنستجرام"
              placeholder="https://instagram.com/..."
              ariaLabel="Instagram"
              linkClassName="portfolio-social portfolio-social--ig"
              allowEdit={false}
            >
              <Instagram size={18} />
            </EditableLinkIcon>
            <EditableLinkIcon
              value={socialLinks.facebook}
              fieldKey="facebook"
              label="رابط فيسبوك"
              placeholder="https://facebook.com/..."
              ariaLabel="Facebook"
              linkClassName="portfolio-social portfolio-social--fb"
              allowEdit={false}
            >
              <Facebook size={18} />
            </EditableLinkIcon>
            <EditableLinkIcon
              value={socialLinks.tiktok}
              fieldKey="tiktok"
              label="رابط تيك توك"
              placeholder="https://tiktok.com/..."
              ariaLabel="TikTok"
              linkClassName="portfolio-social portfolio-social--tt"
              allowEdit={false}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
            <EditableLinkIcon
              value={contactInfo.whatsappNumber}
              fieldKey="whatsapp"
              label="رقم واتساب"
              placeholder="2010xxxxxxx"
              ariaLabel="WhatsApp"
              formatHref={formatWhatsAppHref}
              linkClassName="portfolio-social portfolio-social--wa"
              allowEdit={false}
            >
              <WhatsAppIcon size={18} />
            </EditableLinkIcon>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 md:py-20 bg-card border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(circle_at_20%_30%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
              <EditableText
                value={getValue("home_testimonials_kicker")}
                fallback="آراء العملاء"
                fieldKey="home_testimonials_kicker"
                category="home"
                label="عنوان قسم الآراء الصغير"
              />
            </h3>
            <h2 className="text-3xl md:text-5xl font-bold">
              <EditableText
                value={getValue("home_testimonials_title")}
                fallback="عرساني🫶"
                fieldKey="home_testimonials_title"
                category="home"
                label="عنوان قسم الآراء"
              />
            </h2>
            <p className="testimonials-glow mt-4 max-w-2xl mx-auto leading-relaxed">
              <EditableText
                value={getValue("home_testimonials_desc")}
                fallback="أهم حاجة… الناس تطلع مبسوطة ومرتاحه من أول لحظة لحد التسليم ❤️"
                fieldKey="home_testimonials_desc"
                category="home"
                label="وصف قسم الآراء"
                multiline
              />
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: "Mohamed & Heba",
                quote:
                  "بجد احلي فوتوغرافر اتعاملنا معاه في خطوبتنا والصور مشاء الله طالعه احلي مما كنا عايزين كمان وانشاء الله مش اخر تعامل ♥️",
              },
              {
                name: "Basent & Abdo",
                quote:
                  "الصور احنا مش مصدقين حلاوتها بجد ولا الألوان خطيره اكيد مش اخر مره ما بينا انشاء الله ♥️",
              },
              {
                name: "Norhan & Hossam",
                quote:
                  "صور الفرح مشاء الله جميله اوي اوي عجبت كل صحابنا وأهلنا دا غير البرومو التحفه اللي اتعرض في الفرح كلو انبهر بيه ♥️",
              },
              {
                name: "Shahd",
                quote:
                  "سيشن عيد ميلادي كان خطير بجد متصورتش صور بالحلاوه دي قبل كد تسلم ايدك ❤️",
              },
            ].map((t, i) => {
              const keyBase = `home_testimonial_${i + 1}`;
              return (
              <div
                key={i}
                className="bg-background/45 border border-white/10 p-5 md:p-6 premium-border testimonial-card hover:border-primary/25 transition-colors"
              >
                <StarsRow />
                <p className="text-sm md:text-base text-muted-foreground italic leading-relaxed mt-3 mb-4">
                  "<EditableText
                    value={getValue(`${keyBase}_quote`)}
                    fallback={t.quote}
                    fieldKey={`${keyBase}_quote`}
                    category="home"
                    label={`نص رأي ${i + 1}`}
                    multiline
                  />"
                </p>
                <div className="text-sm md:text-base font-bold">
                  <EditableText
                    value={getValue(`${keyBase}_name`)}
                    fallback={t.name}
                    fieldKey={`${keyBase}_name`}
                    category="home"
                    label={`اسم رأي ${i + 1}`}
                  />
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      <style>{`
        .hero-image { background-image: var(--hero-image); }
        @media (max-width: 640px) {
          .hero-image { background-image: var(--hero-image-mobile); }
        }

        .hero-grain {
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          mix-blend-mode: overlay;
        }
        .hero-bottom-fade {
          background: linear-gradient(
            180deg,
            rgba(0,0,0,0) 0%,
            hsl(var(--background)) 85%
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }


        .package-card {
          background:
            linear-gradient(150deg, rgba(22,22,30,0.96), rgba(8,8,12,0.98)),
            radial-gradient(circle at 20% 15%, rgba(255,245,220,0.10), transparent 55%);
          box-shadow: 0 28px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,220,170,0.2) inset;
          border-color: rgba(255,225,190,0.2);
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
        }
        .package-card:hover {
          box-shadow:
            0 32px 110px rgba(0,0,0,0.6),
            0 0 45px rgba(255,210,120,0.18),
            0 0 0 1px rgba(255,220,170,0.28) inset;
        }
        .package-card:focus-visible {
          outline: 2px solid rgba(255,210,120,0.65);
          outline-offset: 4px;
        }
        .package-card .card-glow {
          animation: glow-drift 6s ease-in-out infinite;
        }
        .card-tap-hint {
          position: absolute;
          top: 18px;
          left: 18px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(10,10,14,0.55);
          color: rgba(255,235,200,0.92);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 12px 30px rgba(0,0,0,0.35);
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 200ms ease, transform 200ms ease;
          pointer-events: none;
          z-index: 2;
        }
        .package-card:hover .card-tap-hint,
        .package-card:focus-visible .card-tap-hint {
          opacity: 1;
          transform: translateY(0);
        }

        .card-title-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid rgba(255,225,190,0.35);
          background: rgba(12,12,16,0.6);
          color: #fff2d6;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.4), inset 0 0 18px rgba(255,230,190,0.15);
          position: relative;
          overflow: hidden;
        }
        .card-title-chip::after {
          content: "";
          position: absolute;
          inset: -40% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 72%);
          transform: translateX(-120%);
          animation: social-shine 6s ease-in-out infinite;
          opacity: 0.35;
          pointer-events: none;
        }
        .title-icon {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,225,190,0.4);
          background: rgba(255,225,190,0.12);
          color: #fff3d6;
          box-shadow: inset 0 0 14px rgba(255,225,190,0.2);
        }
        .card-desc--glow {
          color: rgba(255,245,220,0.92);
          text-shadow: 0 0 14px rgba(255,220,170,0.35);
          font-weight: 600;
        }
        .card-note {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,235,200,0.85);
          text-shadow: 0 0 12px rgba(255,220,170,0.35);
          margin-bottom: 12px;
        }

        .about-subtitle {
          display: inline-block;
          font-size: 12px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          font-weight: 700;
          color: rgba(255,210,120,0.9);
          position: relative;
          margin-bottom: 12px;
        }
        .about-subtitle::after {
          content: "";
          display: block;
          width: 60px;
          height: 2px;
          margin-top: 10px;
          background: linear-gradient(90deg, transparent, rgba(255,210,120,0.8), transparent);
          box-shadow: 0 0 12px rgba(255,200,80,0.4);
        }
        .about-name {
          font-size: clamp(28px, 4vw, 46px);
          font-weight: 700;
          margin-bottom: 14px;
          font-family: "Playfair Display", serif;
          color: rgba(255,245,225,0.98);
          text-shadow:
            0 8px 24px rgba(0,0,0,0.35),
            0 0 18px rgba(255,210,120,0.25);
        }
        .about-story-link {
          display: block;
          color: inherit;
          text-decoration: none;
        }
        .about-story {
          position: relative;
          cursor: pointer;
        }
        .about-story-mask {
          max-height: 170px;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0));
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0));
        }
        .about-more {
          position: absolute;
          bottom: 8px;
          right: 0;
          z-index: 1;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,220,150,0.95);
          background: rgba(11,11,15,0.55);
          border: 1px solid rgba(255,210,120,0.35);
          padding: 6px 12px;
          border-radius: 999px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        }
        .about-text {
          color: rgba(255,255,255,0.72);
          font-size: clamp(15px, 1.6vw, 18px);
          line-height: 1.9;
          margin-bottom: 8px;
          font-family: "Cairo", sans-serif;
        }

        .about-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(12,12,16,0.55);
          color: rgba(255,255,255,0.8);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 12px 30px rgba(0,0,0,0.35);
        }

        .card-glow {
          background: radial-gradient(circle at 30% 20%, var(--tone, rgba(255,200,80,0.18)), transparent 55%);
        }
        .tone-amber { --tone: rgba(255,200,80,0.18); }
        .tone-rose { --tone: rgba(255,140,170,0.18); }
        .tone-emerald { --tone: rgba(110,240,200,0.16); }

        .card-fade {
          position: relative;
          max-height: 280px;
          overflow: hidden;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0));
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0));
        }
        @media (min-width: 768px) {
          .card-fade { max-height: 300px; }
        }

        .vip-label {
          position: absolute;
          top: 14px;
          left: 18px;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.5);
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          background: linear-gradient(120deg, rgba(255,210,120,0.55), rgba(255,255,255,0.12));
          color: #fff5d6;
          text-shadow: 0 0 20px rgba(255,210,130,0.8);
          animation: vip-shine 2.8s ease-in-out infinite;
          pointer-events: none;
          box-shadow: 0 18px 50px rgba(255,200,80,0.25);
        }

        .camera-badge {
          font-size: 16px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.45);
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        }

        .spotlight-layer {
          background: radial-gradient(
            circle at var(--spot-x, 50%) var(--spot-y, 35%),
            rgba(255,200,80,0.14),
            transparent 55%
          );
          opacity: 0.9;
        }

        .gallery-frame {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,200,80,0.12), transparent 45%),
            repeating-linear-gradient(
              135deg,
              rgba(255,255,255,0.05) 0 2px,
              transparent 2px 14px
            );
          opacity: 0.32;
          mix-blend-mode: screen;
        }

        .gallery-rail {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(72%, 1fr);
          gap: 14px;
          overflow-x: auto;
          padding: 6px 2px 10px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
        }
        .gallery-rail::-webkit-scrollbar { display: none; }
        .gallery-slide { scroll-snap-align: center; }
        .gallery-rail .mosaic-card {
          animation: rail-float 6.2s ease-in-out infinite;
        }
        .gallery-rail .mosaic-card:nth-child(2n) {
          animation-delay: -1.6s;
        }
        .gallery-rail .mosaic-card::after {
          content: "";
          position: absolute;
          inset: -35%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.28) 45%, transparent 70%);
          transform: translateX(-120%);
          animation: rail-shine 3.8s ease-in-out infinite;
          mix-blend-mode: screen;
          opacity: 0.7;
          pointer-events: none;
        }
        .gallery-hint {
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.55);
          margin-top: 10px;
        }

        .gallery-collage {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          grid-auto-rows: 34px;
          gap: 14px;
        }
        @media (min-width: 1024px) {
          .gallery-collage { grid-auto-rows: 38px; }
        }

        .gallery-hero { grid-column: 1 / span 7; grid-row: 1 / span 12; }
        .gallery-tall { grid-column: 8 / span 5; grid-row: 1 / span 9; }
        .gallery-wide { grid-column: 1 / span 6; grid-row: 13 / span 7; }
        .gallery-stack { grid-column: 7 / span 6; grid-row: 10 / span 6; }
        .gallery-stack-2 { grid-column: 7 / span 6; grid-row: 16 / span 5; }

        .gallery-card {
          border-radius: 26px;
          box-shadow: 0 28px 90px rgba(0,0,0,0.48);
          background: rgba(10,10,10,0.55);
          --tilt: 0deg;
        }
        .gallery-card::before {
          content:"";
          position:absolute;
          inset: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          pointer-events:none;
        }
        .gallery-card::after {
          content:"";
          position:absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.10), transparent 40%);
          opacity: 0.45;
          pointer-events:none;
        }
        .gallery-collage .gallery-card:nth-child(2) { --tilt: 0.6deg; }
        .gallery-collage .gallery-card:nth-child(3) { --tilt: -0.5deg; }
        .gallery-collage .gallery-card:nth-child(4) { --tilt: 0.4deg; }
        .gallery-collage .gallery-card:nth-child(5) { --tilt: -0.3deg; }

        .mosaic-card {
          position: relative;
          width: 100%;
          border-radius: 18px;
          background-size: cover;
          background-position: center;
          background-color: rgba(255,255,255,0.02);
          box-shadow: 0 22px 70px rgba(0,0,0,0.45);
          transition: transform 240ms ease;
          transform: rotate(var(--tilt, 0deg));
        }
        .mosaic-card:hover { transform: translateY(-3px) scale(1.01) rotate(var(--tilt, 0deg)); }
        .mosaic-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 220ms ease;
        }
        .gallery-rail .mosaic-img {
          transform: scale(1.03);
          transition: opacity 220ms ease, transform 800ms ease, filter 800ms ease;
          filter: saturate(1.08) contrast(1.04);
        }
        .mosaic-card.is-loaded .mosaic-img { opacity: 1; }
        .mosaic-overlay {
          background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.05), transparent);
          opacity: 0.95;
        }
        .mosaic-glow {
          background: radial-gradient(circle at 30% 20%, rgba(255,200,80,0.22), transparent 60%);
          mix-blend-mode: screen;
        }

        .gallery-collage .gallery-card {
          border-radius: 26px;
          box-shadow: 0 28px 90px rgba(0,0,0,0.48);
        }

        .portfolio-social {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(12,12,16,0.5);
          color: rgba(255,255,255,0.8);
          box-shadow: 0 12px 35px rgba(0,0,0,0.45);
          transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
          position: relative;
          overflow: hidden;
        }
        .portfolio-social::after {
          content: "";
          position: absolute;
          inset: -40% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 72%);
          transform: translateX(-120%);
          animation: social-shine 5.2s ease-in-out infinite;
          opacity: 0.35;
          pointer-events: none;
        }
        .portfolio-social:hover {
          transform: translateY(-2px) scale(1.03);
          border-color: rgba(255,200,80,0.4);
          box-shadow: 0 18px 50px rgba(0,0,0,0.55), 0 0 20px rgba(255,200,80,0.15);
        }
        .portfolio-social--ig,
        .portfolio-social--fb,
        .portfolio-social--tt,
        .portfolio-social--wa { color: #f7e4bf; border-color: rgba(255,210,120,0.35); }

        .testimonials-glow {
          color: rgba(255,255,255,0.85);
          text-shadow: 0 0 14px rgba(255,210,130,0.45), 0 0 30px rgba(255,210,130,0.25);
        }
        .testimonial-stars {
          text-shadow: 0 0 12px rgba(255,210,130,0.65), 0 0 24px rgba(255,210,130,0.35);
          filter: drop-shadow(0 8px 16px rgba(255,200,80,0.35));
        }
        .testimonial-card {
          position: relative;
          background:
            linear-gradient(160deg, rgba(18,18,26,0.85), rgba(8,8,12,0.96));
          border-color: rgba(255,210,120,0.2);
          box-shadow: 0 22px 70px rgba(0,0,0,0.5);
          overflow: hidden;
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
        }
        .testimonial-card::after {
          content: "";
          position: absolute;
          inset: -40% -10%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 48%, transparent 70%);
          transform: translateX(-120%);
          animation: social-shine 6s ease-in-out infinite;
          opacity: 0.25;
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .portfolio-social {
            width: 44px;
            height: 44px;
            border-radius: 12px;
          }
        }

        @keyframes rail-float {
          0%, 100% { transform: translateY(0) scale(1) rotate(var(--tilt, 0deg)); }
          50% { transform: translateY(-4px) scale(1.02) rotate(var(--tilt, 0deg)); }
        }
        @keyframes rail-shine {
          0% { transform: translateX(-120%); }
          60% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes vip-shine {
          0%, 100% { opacity: 0.8; text-shadow: 0 0 18px rgba(255,210,130,0.45); }
          50% { opacity: 1; text-shadow: 0 0 28px rgba(255,220,150,0.8); }
        }
        @keyframes glow-drift {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          50% { transform: translateY(-8px); opacity: 0.6; }
        }
        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @media (max-width: 768px) {
          .package-card { animation: float-soft 7s ease-in-out infinite; }
          .package-card:nth-child(2) { animation-delay: -1.8s; }
          .package-card:nth-child(3) { animation-delay: -3.6s; }
          .testimonial-card { animation: float-soft 8s ease-in-out infinite; }
          .testimonial-card:nth-child(2) { animation-delay: -2s; }
          .testimonial-card:nth-child(3) { animation-delay: -4s; }
        }
        @media (max-width: 640px) {
          .package-card {
            padding: 24px;
            box-shadow: 0 18px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,220,170,0.16) inset;
          }
          .testimonial-card {
            box-shadow: 0 14px 45px rgba(0,0,0,0.45);
          }
          .card-title-chip {
            font-size: 16px;
            letter-spacing: 0.06em;
            padding: 8px 14px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .package-card,
          .testimonial-card,
          .hero-follow-glow,
          .card-glow,
          .hero-social-btn::after,
          .portfolio-social::after { animation: none !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Instagram, Facebook, Sparkles, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navLinks, photographerInfo, ctaTexts } from "@/config/siteConfig";
import { useContactData, useContentData } from "@/hooks/useSiteData";
import { EditableLinkIcon, EditableText } from "@/components/InlineEdit";

const isExternal = (href: string) => /^https?:\/\//i.test(href);

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

export default function Navbar() {
  const navRef = useRef<HTMLElement | null>(null);
  const { contactInfo, socialLinks } = useContactData();
  const content = useContentData();
  const contentMap = content.contentMap ?? {};

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const setOffset = () => {
      const h = el.getBoundingClientRect().height;
      const extra = 16;
      document.documentElement.style.setProperty("--nav-offset", `${Math.ceil(h + extra)}px`);
    };

    setOffset();

    const ro = new ResizeObserver(() => setOffset());
    ro.observe(el);

    window.addEventListener("resize", setOffset);
    window.addEventListener("orientationchange", setOffset);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setOffset);
      window.removeEventListener("orientationchange", setOffset);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const formatWhatsAppHref = (value: string) => {
    const phone = (value ?? "").replace(/[^\d]/g, "");
    return phone ? `https://wa.me/${phone}` : "";
  };
  const formatTelHref = (value: string) => {
    const phone = (value ?? "").replace(/\s/g, "");
    return phone ? `tel:${phone}` : "";
  };

  return (
    <nav
      ref={navRef as any}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/85 backdrop-blur-md border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
          : "bg-transparent"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      aria-label="Main navigation"
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent pointer-events-none" />

      <div className={cn("container mx-auto px-4", scrolled ? "py-3" : "py-4")}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl md:text-3xl font-bold tracking-wider text-foreground hover:text-primary transition-colors flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 tap-target leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <span>
              <EditableText
                value={contentMap.nav_brand_primary}
                fallback="BADR ABDO"
                fieldKey="nav_brand_primary"
                category="nav"
                label="اسم البراند الرئيسي"
              />
            </span>
            <span className="text-primary text-sm md:text-base font-semibold tracking-[0.2em] uppercase">
              <EditableText
                value={contentMap.nav_brand_secondary}
                fallback="Photograpy"
                fieldKey="nav_brand_secondary"
                category="nav"
                label="اسم البراند الفرعي"
              />
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-foreground/60 border border-white/10 px-2 py-1 ml-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <EditableText
                value={contentMap.nav_brand_badge}
                fallback="Luxury"
                fieldKey="nav_brand_badge"
                category="nav"
                label="شارة البراند"
              />
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-8 space-x-reverse">
            {navLinks.map((link, index) => {
              const active = !isExternal(link.href) && location === link.href;
              const labelKey = `nav_label_${index + 1}`;

              if (isExternal(link.href)) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "text-sm font-medium tracking-wide transition-colors hover:text-primary relative group",
                      "text-foreground/80"
                    )}
                  >
                    <EditableText
                      value={contentMap[labelKey]}
                      fallback={link.label}
                      fieldKey={labelKey}
                      category="nav"
                      label={`عنوان القائمة ${index + 1}`}
                    />
                    <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
                  </a>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors hover:text-primary relative group",
                    active ? "text-primary" : "text-foreground/80"
                  )}
                >
                  <EditableText
                    value={contentMap[labelKey]}
                    fallback={link.label}
                    fieldKey={labelKey}
                    category="nav"
                    label={`عنوان القائمة ${index + 1}`}
                  />
                  <span
                    className={cn(
                      "absolute -bottom-2 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full",
                      active ? "w-full" : ""
                    )}
                  />
                </Link>
              );
            })}
          </div>

          {/* Desktop social + CTA */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <EditableLinkIcon
              value={socialLinks.instagram}
              fieldKey="instagram"
              label="رابط إنستجرام"
              placeholder="https://instagram.com/..."
              ariaLabel="Instagram"
              linkClassName="social-orb tap-target"
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
              linkClassName="social-orb tap-target"
              allowEdit={false}
            >
              <Facebook size={18} />
            </EditableLinkIcon>

            <Link href="/contact">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.cta_book_now}
                  fallback={ctaTexts.bookNow}
                  fieldKey="cta_book_now"
                  category="cta"
                  label="زر احجز الآن (الهيدر)"
                />
              </Button>
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="md:hidden flex items-center gap-2">
            <EditableLinkIcon
              value={contactInfo.phone}
              fieldKey="phone"
              label="رقم الهاتف"
              placeholder="01xxxxxxxxx"
              ariaLabel="Call"
              formatHref={formatTelHref}
              linkClassName="social-orb social-orb--phone tap-target"
              allowEdit={false}
            >
              <Phone size={18} />
            </EditableLinkIcon>

            <EditableLinkIcon
              value={contactInfo.whatsappNumber}
              fieldKey="whatsapp"
              label="رقم واتساب"
              placeholder="2010xxxxxxx"
              ariaLabel="WhatsApp"
              formatHref={formatWhatsAppHref}
              linkClassName="social-orb social-orb--wa tap-target"
              allowEdit={false}
            >
              <WhatsAppIcon size={18} />
            </EditableLinkIcon>

            <button
              className="w-11 h-11 border border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-center text-foreground hover:text-primary transition-colors tap-target"
              onClick={() => setIsOpen((v) => !v)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
        aria-hidden={!isOpen}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

        <div
          className={cn(
            "absolute inset-x-0 bottom-0",
            "bg-background border-t border-white/10",
            "rounded-t-2xl",
            "transition-transform duration-300",
            isOpen ? "translate-y-0" : "translate-y-full"
          )}
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-3 pb-2 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-white/10" />
          </div>

          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="text-right">
              <div className="text-sm text-foreground/80">
                <EditableText
                  value={contentMap.nav_mobile_title}
                  fallback="القائمة"
                  fieldKey="nav_mobile_title"
                  category="nav"
                  label="عنوان قائمة الموبايل"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <EditableText
                  value={contentMap.nav_mobile_subtitle}
                  fallback="اختر صفحة"
                  fieldKey="nav_mobile_subtitle"
                  category="nav"
                  label="وصف قائمة الموبايل"
                />
              </div>
            </div>

            <button
              className="w-11 h-11 border border-white/10 bg-black/15 flex items-center justify-center text-foreground hover:text-primary transition-colors tap-target"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2">
              {navLinks.map((link, index) => {
                const active = !isExternal(link.href) && location === link.href;
                const labelKey = `nav_label_${index + 1}`;

                if (isExternal(link.href)) {
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-4 border rounded-xl tap-target transition-colors",
                        "bg-black/10 border-white/10 text-foreground hover:border-primary/35 hover:text-primary"
                      )}
                    >
                      <span className="text-base font-semibold">
                        <EditableText
                          value={contentMap[labelKey]}
                          fallback={link.label}
                          fieldKey={labelKey}
                          category="nav"
                          label={`عنوان القائمة ${index + 1}`}
                        />
                      </span>
                      <ArrowLeft className="w-4 h-4 text-foreground/60" />
                    </a>
                  );
                }

                return (
                  <Link key={link.label} href={link.href}>
                    <a
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-4 border rounded-xl tap-target transition-colors",
                        active
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-black/10 border-white/10 text-foreground hover:border-primary/35 hover:text-primary"
                      )}
                    >
                      <span className="text-base font-semibold">
                        <EditableText
                          value={contentMap[labelKey]}
                          fallback={link.label}
                          fieldKey={labelKey}
                          category="nav"
                          label={`عنوان القائمة ${index + 1}`}
                        />
                      </span>
                      <ArrowLeft className={cn("w-4 h-4", active ? "text-primary" : "text-foreground/60")} />
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Link href="/contact">
                <a className="w-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none font-semibold tap-target text-center cta-glow cta-size">
                  <EditableText
                    value={contentMap.cta_book_now}
                    fallback={ctaTexts.bookNow}
                    fieldKey="cta_book_now"
                    category="cta"
                    label="زر احجز الآن (الموبايل)"
                  />
                </a>
              </Link>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              <EditableText
                value={contentMap.nav_mobile_footer}
                fallback={`${photographerInfo.name} • ${photographerInfo.title}`}
                fieldKey="nav_mobile_footer"
                category="nav"
                label="نص الفوتر في الموبايل"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

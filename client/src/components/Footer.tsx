import { Link, useLocation } from "wouter";
import { Instagram, Facebook, Phone, Mail, MapPin, ArrowLeft, ArrowDownRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { photographerInfo, navLinks, ctaTexts } from "@/config/siteConfig";
import { useContactData, useContentData } from "@/hooks/useSiteData";
import { EditableContactText, EditableLinkIcon, EditableText } from "@/components/InlineEdit";

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

function buildWhatsAppHref(text: string, whatsappNumber: string | undefined) {
  const phone = (whatsappNumber ?? "").replace(/[^\d]/g, "");
  if (!phone) return "";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

export default function Footer() {
  const [location] = useLocation();
  const { contactInfo, socialLinks } = useContactData();
  const content = useContentData();
  const contentMap = content.contentMap ?? {};
  const isServicesPage = location === "/services";

  const phoneClean = (contactInfo.phone ?? "").replace(/\s/g, "");
  const telHref = phoneClean ? `tel:${phoneClean}` : "";
  const mailHref = contactInfo.email ? `mailto:${contactInfo.email}` : "";

  const waInquiryHref = buildWhatsAppHref("حابب استفسر ❤️", contactInfo.whatsappNumber);
  const formatWhatsAppHref = (value: string) => {
    const phone = (value ?? "").replace(/[^\d]/g, "");
    return phone ? `https://wa.me/${phone}` : "";
  };

  return (
    <footer className="relative border-t border-white/10 bg-card/30 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-35 [background:radial-gradient(circle_at_20%_10%,rgba(255,200,80,0.10),transparent_60%)]" />

      <div className="relative z-10 border-b border-white/10 bg-background/20 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 bg-black/15">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs text-foreground/80">
                  <EditableText
                    value={contentMap.footer_badge_text}
                    fallback="رد سريع • تنظيم مواعيد • تسليم مرتب"
                    fieldKey="footer_badge_text"
                    category="footer"
                    label="شريط الفوتر العلوي"
                  />
                </span>
              </div>

              <h3 className="text-xl md:text-2xl font-bold mt-3">
                <EditableText
                  value={contentMap.footer_cta_title}
                  fallback="جاهز نبدأ؟ ابعت التفاصيل وهنرتب كل حاجة"
                  fieldKey="footer_cta_title"
                  category="footer"
                  label="عنوان دعوة الفوتر"
                  multiline
                />
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Link href="/contact">
                <Button
                  variant="outline"
                  className="w-full md:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
                >
                  <EditableText
                    value={contentMap.footer_cta_primary}
                    fallback={ctaTexts.bookNow}
                    fieldKey="footer_cta_primary"
                    category="cta"
                    label="زر الفوتر الأساسي"
                  />
                </Button>
              </Link>

              <Link href={isServicesPage ? "/" : "/services"}>
                <a className="w-full md:w-auto border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded-none inline-flex items-center justify-center gap-2 cta-glow cta-size">
                  <ArrowDownRight className="w-4 h-4 text-primary" />
                  <EditableText
                    value={isServicesPage ? undefined : contentMap.footer_cta_secondary}
                    fallback={isServicesPage ? "الذهاب الي الصفحه الرئيسيه" : "اعرف الأسعار والباقات المتاحة"}
                    fieldKey="footer_cta_secondary"
                    category="cta"
                    label="زر الفوتر الثانوي"
                  />
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center md:text-right">
            <div className="text-2xl font-bold tracking-wider">
              <span className="text-foreground">
                <EditableText
                  value={contentMap.footer_brand_name}
                  fallback={photographerInfo.brandName ?? photographerInfo.name}
                  fieldKey="footer_brand_name"
                  category="footer"
                  label="اسم البراند في الفوتر"
                />
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              <EditableText
                value={contentMap.footer_brand_desc}
                fallback={
                  photographerInfo.descriptionAr ??
                  "تصوير يركز على اللحظة… ويطلعها بأفضل شكل. ستايل سينمائي فاخر واهتمام بالتفاصيل."
                }
                fieldKey="footer_brand_desc"
                category="footer"
                label="وصف البراند في الفوتر"
                multiline
              />
            </p>
            <p className="text-xs text-muted-foreground/80 mt-2">
              <EditableText
                value={contentMap.footer_brand_line}
                fallback="حكاية زفافك تستحق لقطة سينمائية — نشتغل بأعلى جودة وتسليم مرتب."
                fieldKey="footer_brand_line"
                category="footer"
                label="سطر هوية البراند"
                multiline
              />
            </p>

            <div className="mt-6 flex items-center justify-center md:justify-start gap-3">
              <EditableLinkIcon
                value={socialLinks.instagram}
                fieldKey="instagram"
                label="رابط إنستجرام"
                placeholder="https://instagram.com/..."
                ariaLabel="Instagram"
                linkClassName="social-orb"
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
                linkClassName="social-orb"
                allowEdit={false}
              >
                <Facebook size={18} />
              </EditableLinkIcon>

              <EditableLinkIcon
                value={contactInfo.whatsappNumber}
                fieldKey="whatsapp"
                label="رقم واتساب"
                placeholder="2010xxxxxxx"
                ariaLabel="WhatsApp"
                formatHref={formatWhatsAppHref}
                linkClassName="social-orb social-orb--wa"
                allowEdit={false}
              >
                <WhatsAppIcon size={18} />
              </EditableLinkIcon>
            </div>
          </div>

          <div className="text-center md:text-right">
            <h4 className="text-lg font-bold mb-4">
              <EditableText
                value={contentMap.footer_links_title}
                fallback="روابط سريعة"
                fieldKey="footer_links_title"
                category="footer"
                label="عنوان روابط سريعة"
              />
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((l, index) => {
                const active = !isExternal(l.href) && location === l.href;
                const labelKey = `nav_label_${index + 1}`;

                if (isExternal(l.href)) {
                  return (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-3 border border-white/10 bg-black/10 hover:border-primary/35 hover:text-primary transition-colors tap-target inline-flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold">
                        <EditableText
                          value={contentMap[labelKey]}
                          fallback={l.label}
                          fieldKey={labelKey}
                          category="nav"
                          label={`عنوان القائمة ${index + 1}`}
                        />
                      </span>
                      <ArrowLeft className="w-4 h-4 text-foreground/50" />
                    </a>
                  );
                }

                return (
                  <Link key={l.href} href={l.href}>
                    <a
                      className={cn(
                        "px-4 py-3 border border-white/10 bg-black/10 hover:border-primary/35 hover:text-primary transition-colors tap-target inline-flex items-center justify-between",
                        active ? "text-primary border-primary/30 bg-primary/10" : "text-foreground/80"
                      )}
                    >
                      <span className="text-sm font-semibold">
                        <EditableText
                          value={contentMap[labelKey]}
                          fallback={l.label}
                          fieldKey={labelKey}
                          category="nav"
                          label={`عنوان القائمة ${index + 1}`}
                        />
                      </span>
                      <ArrowLeft className="w-4 h-4 text-foreground/50" />
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="text-center md:text-right">
            <h4 className="text-lg font-bold mb-4">
              <EditableText
                value={contentMap.footer_contact_title}
                fallback="تواصل"
                fieldKey="footer_contact_title"
                category="footer"
                label="عنوان التواصل"
              />
            </h4>

            <div className="space-y-3">
              {telHref ? (
                <a
                  href={telHref}
                  className="premium-border w-full px-4 py-4 border border-white/10 bg-black/10 hover:border-primary/35 transition-colors flex items-center justify-between tap-target"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 border border-white/10 bg-black/15 flex items-center justify-center text-primary">
                      <Phone size={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        <EditableText
                          value={contentMap.footer_contact_call_label}
                          fallback="مكالمة"
                          fieldKey="footer_contact_call_label"
                          category="footer"
                          label="عنوان المكالمة"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground dir-ltr">
                        <EditableContactText
                          value={contactInfo.phone}
                          fallback=""
                          fieldKey="phone"
                          label="رقم الهاتف"
                        />
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-foreground/50" />
                </a>
              ) : null}

              {waInquiryHref ? (
                <a
                  href={waInquiryHref}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-border w-full px-4 py-4 border border-white/10 bg-black/10 hover:border-primary/35 transition-colors flex items-center justify-between tap-target"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 border border-white/10 bg-black/15 flex items-center justify-center text-primary">
                      <WhatsAppIcon size={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        <EditableText
                          value={contentMap.footer_contact_whatsapp_label}
                          fallback="واتساب"
                          fieldKey="footer_contact_whatsapp_label"
                          category="footer"
                          label="عنوان الواتساب"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground dir-ltr">
                        <EditableContactText
                          value={contactInfo.whatsappNumber ?? contactInfo.phone}
                          fallback=""
                          fieldKey="whatsapp"
                          label="رقم الواتساب"
                        />
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-foreground/50" />
                </a>
              ) : null}

              {mailHref ? (
                <a
                  href={mailHref}
                  className="premium-border w-full px-4 py-4 border border-white/10 bg-black/10 hover:border-primary/35 transition-colors flex items-center justify-between tap-target"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 border border-white/10 bg-black/15 flex items-center justify-center text-primary">
                      <Mail size={20} />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        <EditableText
                          value={contentMap.footer_contact_email_label}
                          fallback="إيميل"
                          fieldKey="footer_contact_email_label"
                          category="footer"
                          label="عنوان الإيميل"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <EditableContactText
                          value={contactInfo.email}
                          fallback=""
                          fieldKey="email"
                          label="البريد الإلكتروني"
                        />
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-foreground/50" />
                </a>
              ) : null}

              {contactInfo.location ? (
                <div className="premium-border w-full px-4 py-4 border border-white/10 bg-black/10 flex items-center gap-3">
                  <div className="w-11 h-11 border border-white/10 bg-black/15 flex items-center justify-center text-primary">
                    <MapPin size={20} />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      <EditableText
                        value={contentMap.footer_contact_location_label}
                        fallback="الموقع"
                        fieldKey="footer_contact_location_label"
                        category="footer"
                        label="عنوان الموقع"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <EditableContactText
                        value={contactInfo.location}
                        fallback=""
                        fieldKey="location"
                        label="الموقع"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-muted-foreground/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <div>
              <EditableText
                value={contentMap.footer_copyright}
                fallback={`© ${new Date().getFullYear()} ${photographerInfo.name}. All rights reserved.`}
                fieldKey="footer_copyright"
                category="footer"
                label="حقوق النشر"
              />
            </div>
            <div className="text-muted-foreground/70">
              <EditableText
                value={contentMap.footer_built_by}
                fallback="Built with a cinematic touch ✨"
                fieldKey="footer_built_by"
                category="footer"
                label="تذييل الفوتر"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "env(safe-area-inset-bottom)" }} />

      <style>{`
        .premium-border { position: relative; }
        .premium-border::before {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255,255,255,0.06);
          pointer-events: none;
          border-radius: inherit;
        }
      `}</style>
    </footer>
  );
}

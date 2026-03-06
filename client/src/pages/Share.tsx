import { trpc } from "@/lib/trpc";
import { Router, Route, Switch, Redirect, useLocation } from "wouter";
import { Facebook, Instagram, Loader2, XCircle } from "lucide-react";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Faq from "@/pages/Faq";
import Services from "@/pages/Services";
import Contact from "@/pages/Contact";
import Portfolio from "@/pages/Portfolio";
import NotFound from "@/pages/NotFound";
import PackageDetails from "@/pages/PackageDetails";
import { useContactData, useContentData } from "@/hooks/useSiteData";
import { EditableText } from "@/components/InlineEdit";

type ShareProps = {
  token?: string;
  code?: string;
};

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.46 0 .1 5.36.1 11.96c0 2.1.56 4.15 1.62 5.96L0 24l6.2-1.62a11.95 11.95 0 0 0 5.86 1.5h.01c6.6 0 11.96-5.36 11.96-11.96 0-3.2-1.25-6.2-3.51-8.44ZM12.07 21.9h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.96.98-3.58-.24-.37a9.9 9.9 0 0 1-1.56-5.36C2.16 6.5 6.6 2.06 12.06 2.06c2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.9 6.98c0 5.46-4.44 9.97-9.87 9.97Zm5.77-7.48c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.68.16-.2.31-.78 1-.96 1.2-.18.2-.35.24-.66.08-.31-.16-1.3-.48-2.47-1.54-.92-.82-1.54-1.84-1.72-2.15-.18-.31-.02-.48.14-.64.14-.14.31-.35.47-.52.16-.18.2-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.68-1.65-.93-2.27-.24-.58-.49-.5-.68-.5h-.58c-.2 0-.52.08-.8.39-.28.31-1.06 1.03-1.06 2.5 0 1.47 1.08 2.9 1.23 3.1.16.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.82-.74 2.08-1.45.26-.7.26-1.3.18-1.45-.08-.14-.28-.23-.58-.39Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function SiteRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/faq" component={Faq} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/services" component={Services} />
      <Route path="/package-details" component={PackageDetails} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function Share({ token, code }: ShareProps) {
  const { contactInfo, socialLinks } = useContactData();
  const { contentMap } = useContentData();
  const shortQuery = trpc.shareLinks.validateShort.useQuery(
    { code: code ?? "" },
    { enabled: Boolean(code), staleTime: 0, refetchOnWindowFocus: true }
  );
  const tokenQuery = trpc.shareLinks.validate.useQuery(
    { token: token ?? "" },
    { enabled: !code && Boolean(token), staleTime: 0, refetchOnWindowFocus: true }
  );

  const data = code ? shortQuery.data : tokenQuery.data;
  const isLoading = code ? shortQuery.isLoading : tokenQuery.isLoading;
  const isError = code ? shortQuery.isError : tokenQuery.isError;

  const isValid = Boolean(data?.valid);
  const basePath = code ? `/s/${code}` : token ? `/share/${token}` : "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          جاري التأكد من صلاحية الرابط...
        </div>
      </div>
    );
  }

  if (isError || !isValid || !basePath) {
    const whatsapp = (contactInfo.whatsappNumber ?? "").replace(/[^\d]/g, "");
    const requestMessage = "ابعتلي رابط جديد للويب سايت ❤️";
    const whatsappHref = whatsapp ? `https://wa.me/${whatsapp}` : "";
    const whatsappRequestHref = whatsapp
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(requestMessage)}`
      : "";
    const socials = [
      {
        key: "instagram",
        href: socialLinks.instagram,
        label: "Instagram",
        icon: Instagram,
        className: "hero-social-btn hero-social--ig",
      },
      {
        key: "facebook",
        href: socialLinks.facebook,
        label: "Facebook",
        icon: Facebook,
        className: "hero-social-btn hero-social--fb",
      },
      {
        key: "tiktok",
        href: socialLinks.tiktok,
        label: "TikTok",
        icon: TikTokIcon,
        className: "hero-social-btn hero-social--tt",
      },
      {
        key: "whatsapp",
        href: whatsappHref,
        label: "WhatsApp",
        icon: WhatsAppIcon,
        className: "hero-social-btn hero-social--wa",
      },
    ].filter((item) => Boolean(item.href));

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="relative w-full max-w-xl text-center space-y-5 rounded-2xl border border-white/10 bg-card/50 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_15%,rgba(255,200,80,0.18),transparent_60%)]" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-sm text-foreground/80">
              <XCircle className="w-4 h-4 text-primary" />
              <EditableText
                value={contentMap.share_expired_badge}
                fallback="انتهت صلاحية الرابط"
                fieldKey="share_expired_badge"
                category="share"
                label="شارة انتهاء رابط المشاركة"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <EditableText
                value={contentMap.share_expired_title}
                fallback="الرابط مدته خلصت"
                fieldKey="share_expired_title"
                category="share"
                label="عنوان انتهاء رابط المشاركة"
              />
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              <EditableText
                value={contentMap.share_expired_message}
                fallback="اطلب رابط جديد من بدر وهيوصلك فورًا."
                fieldKey="share_expired_message"
                category="share"
                label="وصف انتهاء رابط المشاركة"
                multiline
              />
            </p>
          </div>

          {socials.length > 0 && (
            <div className="relative z-10 mt-4">
              <div className="hero-follow-icons hero-follow-icons--compact hero-social-compact">
                {socials.map((social) => {
                  const Icon = social.icon as any;
                  return (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className={social.className}
                    >
                      <Icon size={20} />
                    </a>
                  );
                })}
              </div>
              <div className="hero-follow-glow hero-follow-glow--compact" aria-hidden="true" />
            </div>
          )}

          {whatsappRequestHref ? (
            <div className="relative z-10 share-request-cta">
              <a
                href={whatsappRequestHref}
                target="_blank"
                rel="noreferrer"
                className="share-request-btn"
              >
                <span className="share-request-pulse" aria-hidden="true" />
                <span className="share-request-label">اطلب رابط جديد</span>
                <span className="share-request-icon" aria-hidden="true">
                  <WhatsAppIcon size={18} />
                </span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Router base={basePath}>
      <SiteRoutes />
    </Router>
  );
}

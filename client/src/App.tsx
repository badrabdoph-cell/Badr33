import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalErrorWidget from "./components/GlobalErrorWidget";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useContactData } from "@/hooks/useSiteData";
import Home from "./pages/Home";
import About from "./pages/About";
import Faq from "./pages/Faq";
import Portfolio from "./pages/Portfolio";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import Share from "./pages/Share";
import PackageDetails from "./pages/PackageDetails";

function getNavOffsetPx() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset").trim();
  const n = parseInt(v.replace("px", ""), 10);
  return Number.isFinite(n) ? n : 96; // fallback safe
}

function scrollToIdWithOffset(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;

  const offset = getNavOffsetPx();
  const top = el.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: "auto" });
  return true;
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // ادي الصفحة فرصة ترندر
    requestAnimationFrame(() => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const ok = scrollToIdWithOffset(id);
        if (ok) return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [location]);

  return null;
}

function buildWhatsAppHref(text: string, whatsappNumber: string | undefined) {
  const phone = (whatsappNumber ?? "").replace(/[^\d]/g, "");
  if (!phone) return "";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
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

function FloatingWhatsApp() {
  const { contactInfo } = useContactData();
  const href = buildWhatsAppHref("❤️", contactInfo.whatsappNumber);
  if (!href) return null;

  return (
    <a href={href} className="wa-float" target="_blank" rel="noreferrer" aria-label="WhatsApp">
      <WhatsAppIcon size={18} />
    </a>
  );
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/s/:code/:rest*">
          {(params) => <Share code={params.code} />}
        </Route>
        <Route path="/s/:code">
          {(params) => <Share code={params.code} />}
        </Route>
        <Route path="/share/:token/:rest*">
          {(params) => <Share token={params.token} />}
        </Route>
        <Route path="/share/:token">
          {(params) => <Share token={params.token} />}
        </Route>
        <Route path="/about" component={About} />
        <Route path="/faq" component={Faq} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/services" component={Services} />
        <Route path="/package-details" component={PackageDetails} />
        <Route path="/contact" component={Contact} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <div dir="rtl">
          <TooltipProvider>
            <Toaster position="top-center" />
            <Router />
            <GlobalErrorWidget />
            <FloatingWhatsApp />
          </TooltipProvider>
          <style>{`
            .wa-float {
              position: fixed;
              right: 16px;
              bottom: 16px;
              z-index: 90;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 46px;
              height: 46px;
              border-radius: 16px;
              background:
                linear-gradient(135deg, rgba(255,215,140,0.12), rgba(255,200,120,0.08)),
                linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
              color: rgba(247,228,191,0.95);
              border: 1px solid rgba(255,220,170,0.28);
              box-shadow:
                0 16px 40px rgba(0,0,0,0.35),
                inset 0 0 0 1px rgba(255,255,255,0.18),
                0 0 22px rgba(255,210,130,0.35),
                0 0 60px rgba(255,210,130,0.22);
              overflow: hidden;
              backdrop-filter: blur(12px) saturate(130%);
              -webkit-backdrop-filter: blur(12px) saturate(130%);
              transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
              animation: wa-pulse 3.2s ease-in-out infinite;
            }
            .wa-float::before {
              content: "";
              position: absolute;
              inset: 0;
              border-radius: inherit;
              background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 70%);
              transform: translateX(-120%);
              animation: wa-shine 5.2s ease-in-out infinite;
              opacity: 0.45;
              pointer-events: none;
            }
            .wa-float::after {
              content: "";
              position: absolute;
              inset: -6px;
              border-radius: 18px;
              box-shadow: 0 0 26px rgba(255,220,150,0.45), 0 0 60px rgba(255,210,130,0.25);
              opacity: 0.6;
              pointer-events: none;
              animation: wa-halo 3.4s ease-in-out infinite;
            }
            .wa-float:hover {
              transform: translateY(-1px);
              border-color: rgba(255,220,170,0.45);
              box-shadow:
                0 18px 50px rgba(0,0,0,0.45),
                0 0 30px rgba(255,220,150,0.5),
                0 0 70px rgba(255,210,130,0.3);
            }
            @media (max-width: 768px) {
              .wa-float {
                right: 12px;
                left: auto;
                bottom: calc(env(safe-area-inset-bottom) + 18px);
                width: 44px;
                height: 44px;
                border-radius: 14px;
              }
            }
            @keyframes wa-shine {
              0% { transform: translateX(-120%); }
              70% { transform: translateX(120%); }
              100% { transform: translateX(120%); }
            }
            @keyframes wa-pulse {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-1px) scale(1.03); }
            }
            @keyframes wa-halo {
              0%, 100% { opacity: 0.45; }
              50% { opacity: 0.85; }
            }
          `}</style>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

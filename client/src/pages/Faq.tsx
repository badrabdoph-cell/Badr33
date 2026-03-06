import { useMemo, useState } from "react";
import { Search, Sparkles, Instagram, Facebook } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useContactData, useContentData, useFaqData } from "@/hooks/useSiteData";
import { EditableLinkIcon, EditableText } from "@/components/InlineEdit";

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

function TikTokIcon({ size = 18 }: { size?: number }) {
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

export default function Faq() {
  const { contactInfo, socialLinks } = useContactData();
  const { contentMap } = useContentData();
  const faqs = useFaqData();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const normalizeArabic = (value: string) => {
    return (value ?? "")
      .toLowerCase()
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ؤئ]/g, "ء")
      .replace(/[^\u0621-\u063A\u0641-\u064A0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };
  const normalized = normalizeArabic(query);
  const filtered = useMemo(() => {
    if (!normalized) return faqs;
    const queryTokens = normalized.split(" ").filter(Boolean);
    return faqs
      .map((item) => {
        const haystack = normalizeArabic(`${item.question} ${item.answer}`);
        const questionNorm = normalizeArabic(item.question);
        let score = 0;

        if (haystack.includes(normalized)) score += 100;
        if (questionNorm.startsWith(normalized)) score += 60;

        const textTokens = haystack.split(" ").filter(Boolean);
        queryTokens.forEach((token) => {
          if (!token) return;
          if (haystack.includes(token)) score += 12;
          const fuzzyHit = textTokens.some(
            (t) => t.startsWith(token) || token.startsWith(t)
          );
          if (fuzzyHit) score += 8;
        });

        return { item, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.item);
  }, [faqs, normalized]);

  const formatWhatsAppHref = (value: string) => {
    const phone = (value ?? "").replace(/[^\d]/g, "");
    return phone ? `https://wa.me/${phone}` : "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <header className="pt-32 pb-10 bg-card relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_15%,rgba(255,200,80,0.12),transparent_60%)]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/20 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm text-foreground/80">
              <EditableText
                value={contentMap.faq_kicker}
                fallback="FAQs"
                fieldKey="faq_kicker"
                category="faq"
                label="كلمة افتتاحية (الأسئلة الشائعة)"
              />
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EditableText
              value={contentMap.faq_title}
              fallback="الأسئلة الشائعة"
              fieldKey="faq_title"
              category="faq"
              label="عنوان صفحة الأسئلة الشائعة"
            />
          </h1>

          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            <EditableText
              value={contentMap.faq_subtitle}
              fallback="كل إجابة واضحة وسريعة عشان تختار براحة."
              fieldKey="faq_subtitle"
              category="faq"
              label="وصف صفحة الأسئلة الشائعة"
              multiline
            />
          </p>
        </div>
      </header>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="faq-search-shell">
            <Search className="w-4 h-4 text-primary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={contentMap.faq_search_placeholder ?? "ابحث عن سؤالك هنا..."}
              className="faq-search-input"
              aria-label="بحث الأسئلة الشائعة"
            />
          </div>

          <div className="mt-8 space-y-4">
            {filtered.map((item) => {
              const isOpen = openId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={["faq-card", isOpen ? "is-open" : ""].join(" ")}
                  onClick={() => setOpenId(isOpen ? null : (item.id as number))}
                  aria-expanded={isOpen}
                >
                  <span className="faq-plus" aria-hidden="true">+</span>
                  <div className="faq-card-content">
                    <h3 className="faq-question">{item.question}</h3>
                    <div className="faq-answer">{item.answer}</div>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                لا توجد نتائج مطابقة للبحث.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
              <EditableText
                value={contentMap.faq_social_title}
                fallback="تابعنا على السوشيال"
                fieldKey="faq_social_title"
                category="faq"
                label="عنوان سوشيال الأسئلة الشائعة"
              />
            </h3>
          </div>

          <div className="hero-follow-icons hero-follow-icons--compact faq-social-icons">
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
              <TikTokIcon size={20} />
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
          <div className="hero-follow-glow hero-follow-glow--compact faq-social-glow" aria-hidden="true" />
        </div>
      </section>

      <Footer />

      <style>{`
        .faq-search-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,210,120,0.35);
          background: rgba(12,12,16,0.65);
          padding: 12px 18px;
          box-shadow: 0 18px 45px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04);
        }
        .faq-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #f7e4bf;
          font-size: 16px;
        }
        .faq-search-input::placeholder {
          color: rgba(255,235,200,0.55);
        }

        .faq-card {
          width: 100%;
          text-align: right;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid rgba(255,210,120,0.22);
          background: rgba(12,12,16,0.75);
          color: inherit;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 55px rgba(0,0,0,0.45);
          transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
          animation: faq-float 2.8s ease-in-out infinite;
        }
        .faq-card::before {
          content: "";
          position: absolute;
          inset: -40% -20%;
          background: radial-gradient(circle, rgba(255,200,120,0.18), transparent 60%);
          opacity: 0.35;
          pointer-events: none;
        }
        .faq-card:hover,
        .faq-card:focus-visible {
          transform: translateY(-4px);
          border-color: rgba(255,210,120,0.45);
          box-shadow: 0 28px 70px rgba(0,0,0,0.55), 0 0 26px rgba(255,200,80,0.18);
        }
        .faq-card:focus-visible {
          outline: 2px solid rgba(255,210,120,0.65);
          outline-offset: 4px;
        }
        .faq-plus {
          position: absolute;
          top: 14px;
          left: 14px;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(255,210,120,0.45);
          background: rgba(12,12,16,0.7);
          color: #f7e4bf;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
          transition: transform 220ms ease, background 220ms ease, color 220ms ease;
        }
        .faq-card.is-open .faq-plus {
          transform: rotate(45deg);
          background: rgba(255,210,120,0.15);
          color: #fff3d6;
        }
        .faq-card-content {
          width: 100%;
          padding-left: 30px;
        }
        .faq-question {
          font-size: 17px;
          font-weight: 700;
          color: rgba(255,245,220,0.95);
          margin-bottom: 8px;
        }
        .faq-answer {
          max-height: 0;
          overflow: hidden;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          line-height: 1.8;
          transition: max-height 260ms ease, opacity 200ms ease;
          opacity: 0;
        }
        .faq-card.is-open .faq-answer {
          max-height: 420px;
          opacity: 1;
        }

        .faq-social-icons .hero-social-btn {
          animation: faq-social-float 3.6s ease-in-out infinite;
        }
        .faq-social-icons .hero-social-btn:nth-child(2) { animation-delay: -1s; }
        .faq-social-icons .hero-social-btn:nth-child(3) { animation-delay: -2s; }
        .faq-social-icons .hero-social-btn:nth-child(4) { animation-delay: -3s; }

        @keyframes faq-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes faq-social-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @media (max-width: 640px) {
          .faq-card {
            padding: 16px;
          }
          .faq-question { font-size: 15px; }
          .faq-answer { font-size: 13px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .faq-card,
          .faq-social-icons .hero-social-btn {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

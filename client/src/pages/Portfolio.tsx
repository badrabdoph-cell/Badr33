import { useEffect } from "react";
import { externalPortfolioUrl } from "@/config/siteConfig";
import { useContentData } from "@/hooks/useSiteData";
import { EditableText } from "@/components/InlineEdit";

export default function Portfolio() {
  const content = useContentData();
  const contentMap = content.contentMap ?? {};

  useEffect(() => {
    // ✅ تحويل فوري (بدون ما نعرض محتوى داخلي)
    window.location.replace(externalPortfolioUrl);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-2xl font-bold mb-2">
          <EditableText
            value={contentMap.portfolio_redirect_title}
            fallback="جاري تحويلك للمعرض…"
            fieldKey="portfolio_redirect_title"
            category="portfolio"
            label="عنوان تحويل المعرض"
          />
        </div>
        <p className="text-muted-foreground mb-6">
          <EditableText
            value={contentMap.portfolio_redirect_desc}
            fallback="لو ما تمش التحويل تلقائيًا، اضغط الزر."
            fieldKey="portfolio_redirect_desc"
            category="portfolio"
            label="وصف تحويل المعرض"
          />
        </p>
        <a
          href={externalPortfolioUrl}
          className="inline-flex items-center justify-center border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors px-10 py-4 rounded-none"
        >
          <EditableText
            value={contentMap.portfolio_redirect_button}
            fallback="فتح المعرض"
            fieldKey="portfolio_redirect_button"
            category="portfolio"
            label="زر تحويل المعرض"
          />
        </a>
      </div>
    </div>
  );
}

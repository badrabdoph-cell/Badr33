import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, Heart, Star, ArrowLeft } from "lucide-react";
import { aboutContent, photographerInfo, siteImages, ctaTexts, externalPortfolioUrl } from "@/config/siteConfig";
import { useContentData, useSiteImagesData } from "@/hooks/useSiteData";
import SmartImage from "@/components/SmartImage";
import { EditableImage, EditableText } from "@/components/InlineEdit";
import { getOffsetStyle } from "@/lib/positioning";

export default function About() {
  const content = useContentData();
  const { imageMap } = useSiteImagesData();
  const contentMap = content.contentMap ?? {};
  const aboutImg = imageMap.aboutImage?.url ?? siteImages.aboutImage ?? siteImages.heroImage;
  const sharedTestimonials = [
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
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <header className="pt-32 pb-10 bg-card relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url('${aboutImg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-background/40 to-background" />
        <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_15%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="absolute inset-0 pointer-events-none hero-grain opacity-[0.10]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 bg-black/20 backdrop-blur-md mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs md:text-sm text-foreground/80">
              <EditableText
                value={contentMap.about_kicker}
                fallback="ستايل سينمائي • تفاصيل • تسليم احترافي"
                fieldKey="about_kicker"
                category="about"
                label="كلمة افتتاحية (من أنا)"
              />
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EditableText
              value={content.aboutTitle?.trim() ? content.aboutTitle : undefined}
              fallback={aboutContent.title || "عن بدر"}
              fieldKey="about_title"
              category="about"
              label="عنوان صفحة من أنا"
              multiline
            />
          </h1>

          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 leading-relaxed">
            <EditableText
              value={content.aboutDescription}
              fallback={
                aboutContent.description ||
                photographerInfo.descriptionAr ||
                "تصوير يركز على اللحظة… ويطلعها بأفضل شكل."
              }
              fieldKey="about_description"
              category="about"
              label="وصف صفحة من أنا"
              multiline
            />
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.about_cta_primary}
                  fallback={ctaTexts.bookNow ?? "احجز الآن"}
                  fieldKey="about_cta_primary"
                  category="about"
                  label="زر احجز الآن (من أنا)"
                />
              </Button>
            </Link>

            <Link href="/services">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.about_cta_secondary}
                  fallback="الأسعار والباقات"
                  fieldKey="about_cta_secondary"
                  category="about"
                  label="زر الأسعار والباقات (من أنا)"
                />
              </Button>
            </Link>
          </div>

          <div className="mt-10 h-px w-64 mx-auto bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
        </div>
      </header>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="order-1 lg:order-2 relative overflow-hidden premium-border">
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/55 via-transparent to-black/10 z-10" />
              <div className="absolute top-4 right-4 z-20">
                <EditableImage
                  src={aboutImg}
                  alt="About"
                  fieldKey="aboutImage"
                  category="about"
                  label="صورة صفحة من أنا"
                  className="w-fit"
                  imgClassName="hidden"
                  overlayClassName="opacity-100"
                />
              </div>

              <SmartImage
                src={aboutImg}
                alt="About"
                className="w-full h-[520px] md:h-[620px] object-cover shadow-[0_30px_120px_rgba(0,0,0,0.65)]"
                priority={false}
                sizes="(max-width: 1024px) 100vw, 50vw"
                style={getOffsetStyle(imageMap.aboutImage?.offsetX, imageMap.aboutImage?.offsetY)}
              />
            </div>

            <div className="order-2 lg:order-1 text-right">
              <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
                <EditableText
                  value={content.aboutSubtitle}
                  fallback={aboutContent.subtitle ?? "الستايل"}
                  fieldKey="about_subtitle"
                  category="about"
                  label="عنوان فرعي (من أنا)"
                />
              </h3>

              <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
                <EditableText
                  value={contentMap.about_story_title}
                  fallback="تصوير يحافظ على الإحساس… قبل الشكل"
                  fieldKey="about_story_title"
                  category="about"
                  label="عنوان قصة من أنا"
                  multiline
                />
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-8 text-base md:text-lg">
                <EditableText
                  value={contentMap.about_story_description}
                  fallback={
                    aboutContent.description ||
                    "بحب أصوّر اللحظات الطبيعية من غير مبالغة… مع اهتمام بالتفاصيل والإضاءة واللون. الهدف إن الصور تحسّها حقيقية وفخمة في نفس الوقت."
                  }
                  fieldKey="about_story_description"
                  category="about"
                  label="وصف قصة من أنا"
                  multiline
                />
              </p>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {(aboutContent.stats ?? []).map((s, index) => (
                  <div
                    key={`${s.label}-${index}`}
                    className="bg-card/40 border border-white/10 backdrop-blur-sm px-3 py-4 text-center premium-border"
                  >
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                      <EditableText
                        value={contentMap[`about_stat_${index + 1}_number`]}
                        fallback={s.number}
                        fieldKey={`about_stat_${index + 1}_number`}
                        category="about"
                        label={`رقم الإحصائية ${index + 1}`}
                      />
                    </div>
                    <div className="text-[11px] sm:text-sm text-muted-foreground mt-1">
                      <EditableText
                        value={contentMap[`about_stat_${index + 1}_label`]}
                        fallback={s.label}
                        fieldKey={`about_stat_${index + 1}_label`}
                        category="about"
                        label={`عنوان الإحصائية ${index + 1}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <a href={externalPortfolioUrl} target="_blank" rel="noreferrer">
                  <Button
                    variant="outline"
                    className="about-work-btn group border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none cta-glow cta-size"
                  >
                    <EditableText
                      value={contentMap.about_work_button}
                      fallback="شوف الشغل"
                      fieldKey="about_work_button"
                      category="about"
                      label="زر شوف الشغل (من أنا)"
                    />
                    <ArrowLeft className="mr-2 w-4 h-4 transition-transform group-hover:-translate-x-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-card border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(circle_at_15%_25%,rgba(255,200,80,0.10),transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
              <EditableText
                value={contentMap.about_features_kicker}
                fallback="ليه تختارني؟"
                fieldKey="about_features_kicker"
                category="about"
                label="عنوان صغير (ليه تختارني؟)"
              />
            </h3>
            <h2 className="text-3xl md:text-5xl font-bold">
              <EditableText
                value={contentMap.about_features_title}
                fallback="تفاصيل بتفرق"
                fieldKey="about_features_title"
                category="about"
                label="عنوان قسم المميزات"
              />
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
              <EditableText
                value={contentMap.about_features_desc}
                fallback="نفس الجودة… في كل باقة. ونفس الاهتمام… في كل لقطة."
                fieldKey="about_features_desc"
                category="about"
                label="وصف قسم المميزات"
                multiline
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background/45 border border-white/10 p-7 premium-border group hover:border-primary/25 transition-colors">
              <Camera className="w-10 h-10 text-primary mb-5" />
              <h3 className="text-xl font-bold mb-3">
                <EditableText
                  value={contentMap.about_feature_1_title}
                  fallback="إضاءة وستايل سينمائي"
                  fieldKey="about_feature_1_title"
                  category="about"
                  label="عنوان الميزة 1"
                />
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                <EditableText
                  value={contentMap.about_feature_1_desc}
                  fallback="ألوان متزنة، Skin tones طبيعية، ولمسة فخمة من غير مبالغة."
                  fieldKey="about_feature_1_desc"
                  category="about"
                  label="وصف الميزة 1"
                  multiline
                />
              </p>
            </div>

            <div className="bg-background/45 border border-white/10 p-7 premium-border group hover:border-primary/25 transition-colors">
              <Heart className="w-10 h-10 text-primary mb-5" />
              <h3 className="text-xl font-bold mb-3">
                <EditableText
                  value={contentMap.about_feature_2_title}
                  fallback="لقطات إحساس مش “بوزات”"
                  fieldKey="about_feature_2_title"
                  category="about"
                  label="عنوان الميزة 2"
                />
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                <EditableText
                  value={contentMap.about_feature_2_desc}
                  fallback="توجيه بسيط… ولقطات طبيعية حقيقية، عشان اليوم يفضل حي في الصور."
                  fieldKey="about_feature_2_desc"
                  category="about"
                  label="وصف الميزة 2"
                  multiline
                />
              </p>
            </div>

            <div className="bg-background/45 border border-white/10 p-7 premium-border group hover:border-primary/25 transition-colors">
              <Sparkles className="w-10 h-10 text-primary mb-5" />
              <h3 className="text-xl font-bold mb-3">
                <EditableText
                  value={contentMap.about_feature_3_title}
                  fallback="تفاصيل وتسليم مرتب"
                  fieldKey="about_feature_3_title"
                  category="about"
                  label="عنوان الميزة 3"
                />
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                <EditableText
                  value={contentMap.about_feature_3_desc}
                  fallback="تنظيم قبل التصوير، اختيار أفضل لقطات، وتسليم بجودة عالية."
                  fieldKey="about_feature_3_desc"
                  category="about"
                  label="وصف الميزة 3"
                  multiline
                />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-primary text-sm tracking-widest uppercase mb-2 font-bold">
              <EditableText
                value={contentMap.about_testimonials_kicker}
                fallback="آراء العملاء"
                fieldKey="about_testimonials_kicker"
                category="about"
                label="عنوان صغير (آراء العملاء)"
              />
            </h3>
            <h2 className="text-3xl md:text-5xl font-bold">
              <EditableText
                value={contentMap.about_testimonials_title}
                fallback="قصص سعيدة"
                fieldKey="about_testimonials_title"
                category="about"
                label="عنوان قسم آراء العملاء"
              />
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
            {sharedTestimonials.slice(0, 4).map((t, i) => {
              const keyBase = `home_testimonial_${i + 1}`;
              return (
              <div
                key={i}
                className="bg-card/40 border border-white/10 p-7 premium-border hover:border-primary/25 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3 text-primary">
                  <Star className="w-4 h-4" />
                  <Star className="w-4 h-4" />
                  <Star className="w-4 h-4" />
                  <Star className="w-4 h-4" />
                  <Star className="w-4 h-4" />
                </div>
                <p className="text-muted-foreground italic leading-relaxed mb-5">
                  “
                  <EditableText
                    value={contentMap[`${keyBase}_quote`]}
                    fallback={t.quote}
                    fieldKey={`${keyBase}_quote`}
                    category="home"
                    label={`رأي العميل ${i + 1}`}
                    multiline
                  />
                  ”
                </p>
                <div className="font-bold">
                  <EditableText
                    value={contentMap[`${keyBase}_name`]}
                    fallback={t.name}
                    fieldKey={`${keyBase}_name`}
                    category="home"
                    label={`اسم العميل ${i + 1}`}
                  />
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-primary/5 border-t border-white/5 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            <EditableText
              value={contentMap.about_cta_title}
              fallback="جاهز نثبت يومك بصور تفضل معاك؟"
              fieldKey="about_cta_title"
              category="about"
              label="عنوان CTA (من أنا)"
              multiline
            />
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            <EditableText
              value={contentMap.about_cta_desc}
              fallback="ابعت التفاصيل بسرعة… وهنرتب كل حاجة بشكل مريح وواضح."
              fieldKey="about_cta_desc"
              category="about"
              label="وصف CTA (من أنا)"
              multiline
            />
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.about_cta_primary_contact}
                  fallback={ctaTexts.contactNow ?? "تواصل الآن"}
                  fieldKey="about_cta_primary_contact"
                  category="about"
                  label="زر تواصل الآن (من أنا)"
                />
              </Button>
            </Link>
            <Link href="/services">
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none w-full sm:w-auto cta-glow cta-size"
              >
                <EditableText
                  value={contentMap.about_cta_secondary_packages}
                  fallback="شوف الباقات"
                  fieldKey="about_cta_secondary_packages"
                  category="about"
                  label="زر شوف الباقات (من أنا)"
                />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        .hero-grain {
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          mix-blend-mode: overlay;
        }

      `}</style>

      <Footer />
    </div>
  );
}

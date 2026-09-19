import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import Image from 'next/image';

import {
  IconChat,
  IconCheck,
  IconChevronLeft,
  IconClock,
  IconMapPin,
  IconPackage,
  IconSearch,
  IconShieldCheck,
  IconSmartphone,
  IconStar,
  IconStore,
  IconUsers,
  IconWrench,
} from '@/components/icon';
import { SpotlightCard } from '@/components/spotlight-card';

/**
 * Marketing landing page — premium product intro, Arabic-first, RTL.
 * Server-rendered; motion is CSS-only (respects reduced-motion).
 *
 * Truthfulness contract: every capability below maps to the real product
 * (mobile roles, fault guide, verified discovery, request lifecycle,
 * chat/rating rules, merchant catalog, guarantee banner copy). No metrics,
 * reviews, cities, prices, or store availability are invented — visuals are
 * real app scenes labelled as such, and the FAQ restates documented behavior.
 */

const NAV_LINKS = [
  { href: '#appliances', label: 'الأجهزة' },
  { href: '#how', label: 'كيف يعمل' },
  { href: '#roles', label: 'الأدوار' },
  { href: '#trust', label: 'الثقة' },
  { href: '#faq', label: 'أسئلة شائعة' },
];

const APPLIANCES = [
  {
    src: '/scenes/appliance_washing_machine.webp',
    alt: 'رسم توضيحي من التطبيق لجهاز غسالة',
    title: 'غسالات',
    faults: ['الغسالة لا تعمل إطلاقًا', 'اهتزاز قوي أثناء العصر', 'تسرب مياه'],
  },
  {
    src: '/scenes/appliance_refrigerator.webp',
    alt: 'رسم توضيحي من التطبيق لجهاز ثلاجة',
    title: 'ثلاجات',
    faults: ['ضعف التبريد', 'تراكم الثلج في الفريزر', 'صوت مرتفع'],
  },
  {
    src: '/scenes/appliance_air_conditioner.webp',
    alt: 'رسم توضيحي من التطبيق لجهاز مكيف',
    title: 'مكيفات',
    faults: ['المكيف لا يبرد', 'تنقيط مياه', 'رائحة غير مستحبة'],
  },
] as const;

const FAQS = [
  {
    q: 'كيف أصف العطل في التطبيق؟',
    a: 'تختار الجهاز ثم العطل من دليل الأعطال — مثل «ضعف التبريد» أو «تسرب مياه» — أو تكتب وصفك الخاص، ثم تضيف الموقع. هذه هي الخطوات نفسها التي يبني عليها طلب الصيانة.',
  },
  {
    q: 'كيف أختار الفني المناسب؟',
    a: 'تبحث في دليل الفنيين وتصفّي حسب التخصص والمنطقة والتقييم، ثم تفتح ملف الفني: الشارة الموثّقة والتخصص ومناطق الخدمة والتقييمات والمراجعات — وتؤكد الطلب من هناك.',
  },
  {
    q: 'كيف أتابع طلبي بعد إرساله؟',
    a: 'كل طلب يمر بحالات واضحة: تم الطلب، ثم تم قبول الطلب، ثم الفني في الطريق، ثم قيد التنفيذ، ثم تم الإنجاز — مع إمكانية الإلغاء. الحالة المعروضة هي آخر حالة سجّلها الفني؛ لا يوجد تتبع مباشر للموقع ولا وقت وصول تقديري.',
  },
  {
    q: 'هل يمكنني التواصل مع الفني وتقييمه؟',
    a: 'نعم: المحادثة داخل الطلب متاحة أثناء سير الخدمة لتنسيق الزيارة، والتقييم يُفتح بعد تسجيل اكتمال الخدمة. الطلبات الملغاة لا تتيح المحادثة أو التقييم.',
  },
  {
    q: 'ماذا يفعل التاجر في المنصة؟',
    a: 'التاجر يوثّق ملفه ثم يعرض منتجات الأجهزة ومستلزماتها في كتالوج — مع اسم وسعر اختياري بالريال — ويدير ملفه التجاري من التطبيق نفسه.',
  },
] as const;

export default function LandingHome() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: color.surface.base }}>
      <a href="#main" className="skip-link">
        تخطَّ إلى المحتوى
      </a>

      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${color.border.default}`,
        }}
      >
        <div
          className="shell"
          style={{
            padding: `${spacing[3]}px ${spacing[5]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: radius.sm,
                backgroundColor: color.brand.navy,
                color: color.brand.gold,
              }}
            >
              <IconShieldCheck size={21} />
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: Number(typography.weight.bold) as 700,
                color: color.text.primary,
              }}
            >
              الخبير
            </span>
          </div>
          <nav
            aria-label="التنقل الرئيسي"
            className="hide-sm"
            style={{ display: 'flex', gap: spacing[5], alignItems: 'center' }}
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="nav-link"
                style={{
                  color: color.text.secondary,
                  fontSize: 14.5,
                  textDecoration: 'none',
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href="#download"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[2],
              padding: '9px 18px',
              backgroundColor: color.brand.navy,
              color: '#fff',
              borderRadius: radius.pill,
              fontSize: 13.5,
              fontWeight: Number(typography.weight.medium) as 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <IconSmartphone size={15} />
            احصل على التطبيق
          </a>
        </div>
      </header>

      <main id="main">
        {/* Hero — cinematic */}
        <section aria-labelledby="hero-title" className="hero-cinematic">
          <div
            className="shell hero-grid"
            style={{ padding: `${spacing[12]}px ${spacing[5]} ${spacing[10]}px` }}
          >
            <div className="hero-copy">
              <span
                className="rise-in"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  padding: '6px 14px',
                  borderRadius: radius.pill,
                  backgroundColor: color.brand.goldSoft,
                  color: '#5c450c',
                  fontSize: 13,
                  fontWeight: Number(typography.weight.medium) as 500,
                  marginBottom: spacing[4],
                }}
              >
                <IconShieldCheck size={14} />
                منصة عربية للأجهزة المنزلية
              </span>
              <h1
                id="hero-title"
                className="rise-in hero-h1"
                style={{
                  fontSize: typography.size.display,
                  fontWeight: Number(typography.weight.bold) as 700,
                  lineHeight: 1.35,
                  color: '#fff',
                  margin: 0,
                  animationDelay: '0.08s',
                }}
              >
                صيانة الغسالات والثلاجات
                <br />
                والمكيفات — بالعربية
              </h1>
              <p
                className="rise-in hero-copy-light"
                style={{
                  fontSize: 17,
                  lineHeight: 1.9,
                  margin: `${spacing[4]}px 0 0`,
                  maxWidth: 540,
                  animationDelay: '0.16s',
                }}
              >
                الخبير يجمع ثلاثة أدوار في تطبيق واحد: العميل يطلب الصيانة من
                دليل الأعطال ويختار فنيًا موثّقًا، والفني يستقبل الطلبات ويدير
                خدماته، والتاجر يعرض منتجات الأجهزة في كتالوج واحد.
              </p>
              <div
                className="rise-in"
                style={{
                  display: 'flex',
                  gap: spacing[3],
                  marginTop: spacing[6],
                  flexWrap: 'wrap',
                  animationDelay: '0.24s',
                }}
              >
                <a
                  href="#how"
                  className="btn-gold"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: '13px 26px',
                    backgroundColor: color.brand.gold,
                    color: color.brand.navyDeep,
                    borderRadius: radius.sm,
                    fontSize: 15,
                    fontWeight: Number(typography.weight.semibold) as 600,
                    textDecoration: 'none',
                  }}
                >
                  كيف يعمل؟
                  <IconChevronLeft size={16} />
                </a>
                <a
                  href="#roles"
                  className="btn-ghost"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '13px 26px',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    borderRadius: radius.sm,
                    fontSize: 15,
                    fontWeight: Number(typography.weight.medium) as 500,
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.35)',
                  }}
                >
                  عميل أم فني أم تاجر؟
                </a>
              </div>
              <ul
                className="rise-in"
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  gap: spacing[6],
                  margin: `${spacing[8]}px 0 0`,
                  padding: 0,
                  flexWrap: 'wrap',
                  animationDelay: '0.32s',
                }}
              >
                <HeroPoint
                  title="ظهور للموثّقين فقط"
                  body="دليل الفنيين يعرض الحسابات الموثّقة"
                />
                <HeroPoint
                  title="حالات طلب واضحة"
                  body="من القبول حتى الإنجاز أو الإلغاء"
                />
                <HeroPoint
                  title="تقييم بعد الإتمام"
                  body="مراجعات مرتبطة بخدمة مكتملة"
                />
              </ul>
            </div>

            {/* Hero visual: real app scenes */}
            <div className="visual-stack">
              <figure style={{ margin: 0 }} className="soft-float">
                <div className="img-frame">
                  <Image
                    src="/scenes/customer_home_hero.webp"
                    alt="غرفة معيشة فيها غسالة وثلاجة ومكيف — من الرسوم الأصلية لتطبيق الخبير"
                    width={800}
                    height={600}
                    priority
                    sizes="(max-width: 960px) 100vw, 480px"
                  />
                </div>
                <figcaption className="caption-on-dark" style={{ marginTop: 10 }}>
                  من الرسوم الأصلية داخل تطبيق الخبير.
                </figcaption>
              </figure>
              <div className="visual-row">
                <figure style={{ margin: 0 }}>
                  <div className="img-frame">
                    <Image
                      src="/scenes/tracking_on_the_way.webp"
                      alt="رسم حالة الفني في الطريق من شاشة تتبع الطلب"
                      width={400}
                      height={300}
                      loading="lazy"
                      sizes="(max-width: 720px) 100vw, 220px"
                    />
                  </div>
                </figure>
                <figure style={{ margin: 0 }}>
                  <div className="img-frame">
                    <Image
                      src="/scenes/service_request_service.webp"
                      alt="رسم خدمة الصيانة من شاشة إنشاء طلب الخدمة"
                      width={400}
                      height={300}
                      loading="lazy"
                      sizes="(max-width: 720px) 100vw, 220px"
                    />
                  </div>
                </figure>
              </div>
            </div>
          </div>
        </section>

        {/* Appliances */}
        <section
          id="appliances"
          aria-labelledby="appliances-title"
          className="reveal"
          style={{ backgroundColor: color.surface.subtle, padding: `${spacing[10]}px 0` }}
        >
          <div className="shell">
            <SectionHead
              id="appliances-title"
              eyebrow="تخصص واحد"
              title="ثلاثة أجهزة — نعرف أعطالها بالاسم"
              sub="دليل الأعطال داخل التطبيق مبني على هذه الأجهزة، وهذه أمثلة حقيقية لعناوين الأعطال كما تظهر عند إنشاء الطلب — مع صيانة دورية عامة وتركيب أو نقل الجهاز."
            />
            <div className="grid-3" style={{ marginTop: spacing[8] }}>
              {APPLIANCES.map((a) => (
                <SpotlightCard
                  key={a.title}
                  style={{
                    backgroundColor: color.surface.base,
                    border: `1px solid ${color.border.default}`,
                    borderRadius: radius.md,
                    padding: spacing[5],
                    boxShadow: '0 1px 4px rgba(11, 31, 58, 0.06)',
                  }}
                >
                  <div
                    className="img-frame-light"
                    style={{ borderRadius: radius.sm, marginBottom: spacing[4] }}
                  >
                    <Image
                      src={a.src}
                      alt={a.alt}
                      width={480}
                      height={360}
                      loading="lazy"
                      sizes="(max-width: 720px) 100vw, 320px"
                    />
                  </div>
                  <h3
                    style={{
                      fontSize: typography.size.h3,
                      fontWeight: Number(typography.weight.semibold) as 600,
                      margin: `0 0 ${spacing[2]}px`,
                      color: color.text.primary,
                    }}
                  >
                    {a.title}
                  </h3>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    {a.faults.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13.5,
                          color: color.text.secondary,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{ color: color.success.DEFAULT, display: 'inline-flex' }}
                        >
                          <IconCheck size={15} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="reveal"
          style={{ padding: `${spacing[10]}px 0` }}
        >
          <div className="shell">
            <SectionHead
              id="how-title"
              eyebrow="كيف يعمل"
              title="من العطل إلى التقييم في أربع خطوات"
              sub="المسار نفسه في التطبيق لكل طلب — بلا اختصارات مخفية."
            />
            <div className="grid-4" style={{ marginTop: spacing[8] }}>
              <StepCard
                n="١"
                title="صِف العطل"
                body="اختر الجهاز والعطل من دليل الأعطال أو اكتب وصفك، ثم حدد الموقع."
                Icon={IconWrench}
              />
              <StepCard
                n="٢"
                title="اختر فنيًا موثّقًا"
                body="ابحث وصفِّ حسب التخصص والمنطقة والتقييم، وافتح الملف قبل التأكيد."
                Icon={IconSearch}
              />
              <StepCard
                n="٣"
                title="تابع الحالات"
                body="تم الطلب ← القبول ← في الطريق ← قيد التنفيذ ← الإنجاز — وتواصل بالمحادثة أثناء سير الخدمة."
                Icon={IconClock}
              />
              <StepCard
                n="٤"
                title="قيّم بعد الإتمام"
                body="التقييم يُفتح بعد تسجيل الاكتمال، ويُبنى سجل الفني على خدمات مكتملة."
                Icon={IconStar}
              />
            </div>
            <div
              className="grid-2"
              style={{ marginTop: spacing[6], alignItems: 'stretch' }}
            >
              <figure style={{ margin: 0 }}>
                <div className="img-frame-light">
                  <Image
                    src="/scenes/fault_diagnosis_visual.webp"
                    alt="رسم تشخيص العطل من دليل الأعطال داخل التطبيق"
                    width={640}
                    height={480}
                    loading="lazy"
                    sizes="(max-width: 720px) 100vw, 520px"
                  />
                </div>
                <figcaption className="caption" style={{ marginTop: 8 }}>
                  دليل الأعطال: اختيار الجهاز ثم العطل — رسم أصلي من داخل التطبيق.
                </figcaption>
              </figure>
              <figure style={{ margin: 0 }}>
                <div className="img-frame-light">
                  <Image
                    src="/scenes/technician_discovery_hero.webp"
                    alt="رسم اكتشاف الفنيين من شاشة البحث داخل التطبيق"
                    width={640}
                    height={480}
                    loading="lazy"
                    sizes="(max-width: 720px) 100vw, 520px"
                  />
                </div>
                <figcaption className="caption" style={{ marginTop: 8 }}>
                  اكتشاف الفنيين: بحث وتصفية وملفات موثّقة — رسم أصلي من داخل التطبيق.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Roles */}
        <section
          id="roles"
          aria-labelledby="roles-title"
          className="reveal"
          style={{ backgroundColor: color.surface.subtle, padding: `${spacing[10]}px 0` }}
        >
          <div className="shell">
            <SectionHead
              id="roles-title"
              eyebrow="ثلاثة أدوار"
              title="كل دور له مساره — في التطبيق نفسه"
              sub="أنواع الحسابات في المنصة ثلاثة فقط، وهذا ما يفعله كل دور فعلًا."
            />
            <div className="grid-3" style={{ marginTop: spacing[8] }}>
              <RoleCard
                Icon={IconUsers}
                title="عميل"
                tagline="اطلب صيانة لأجهزتك وتابع طلباتك"
                points={[
                  'بحث عن فنيين مع تصفية بالتخصص والمنطقة والتقييم',
                  'ملف فني بشارة تحقق وتقييمات ومراجعات',
                  'طلب بحالات واضحة ومحادثة أثناء سير الخدمة',
                  'تقييم بعد اكتمال الخدمة',
                ]}
              />
              <RoleCard
                Icon={IconWrench}
                title="فني"
                tagline="استقبل طلبات الصيانة وأدر خدماتك"
                points={[
                  'ملف تخصصات وأجهزة ومناطق خدمة',
                  'إدارة الطلبات عبر الحالات نفسها',
                  'إدارة التوفر والخدمات المقدمة',
                  'سجل تقييمات مبني على خدمات مكتملة',
                ]}
              />
              <RoleCard
                Icon={IconStore}
                title="تاجر"
                tagline="اعرض منتجاتك وأدر وجودك التجاري"
                points={[
                  'كتالوج منتجات الأجهزة ومستلزماتها',
                  'سعر اختياري بالريال لكل منتج',
                  'ملف تاجر موثّق يدار من التطبيق',
                  'لوحة متابعة للمنتجات والوجود التجاري',
                ]}
              />
            </div>
            <figure style={{ margin: `${spacing[6]}px 0 0` }}>
              <div className="img-frame-light">
                <Image
                  src="/scenes/merchant_dashboard_hero.webp"
                  alt="رسم لوحة التاجر من داخل التطبيق"
                  width={1024}
                  height={560}
                  loading="lazy"
                  sizes="(max-width: 960px) 100vw, 1024px"
                />
              </div>
              <figcaption className="caption" style={{ marginTop: 8 }}>
                لوحة التاجر: المنتجات والوجود التجاري — رسم أصلي من داخل التطبيق.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Trust */}
        <section
          id="trust"
          aria-labelledby="trust-title"
          className="reveal"
          style={{ padding: `${spacing[10]}px 0` }}
        >
          <div className="shell">
            <SectionHead
              id="trust-title"
              eyebrow="الثقة"
              title="الثقة تصميم — لا شعار"
              sub="آليات تحقق وشفافية تعمل في كل طلب، لا وعود عامة."
            />
            <div className="grid-2" style={{ marginTop: spacing[8], alignItems: 'stretch' }}>
              <div
                style={{
                  display: 'grid',
                  gap: spacing[4],
                  alignContent: 'start',
                }}
              >
                <TrustRow
                  Icon={IconShieldCheck}
                  title="الظهور للموثّقين فقط"
                  body="إدارة المنصة هي جهة التوثيق، ودليل الفنيين يعرض الحسابات الموثّقة فقط — وغير الموثّق لا يظهر في البحث."
                />
                <TrustRow
                  Icon={IconStar}
                  title="تقييمات مرتبطة بخدمة"
                  body="ملف كل فني يعرض التقييم وعدد المراجعات وآراء العملاء، والتقييم الجديد يُكتب بعد اكتمال الخدمة."
                />
                <TrustRow
                  Icon={IconChat}
                  title="محادثة داخل الطلب"
                  body="تنسيق الزيارة يتم بالمحادثة المرتبطة بالطلب أثناء سير الخدمة — لا قنوات جانبية ضائعة."
                />
                <TrustRow
                  Icon={IconMapPin}
                  title="موقع واضح من البداية"
                  body="الطلب يحمل الموقع منذ الإنشاء، والحالات اللاحقة — القبول والطريق والتنفيذ — مسجّلة بتسلسل واحد."
                />
                <div
                  style={{
                    border: `1px solid ${color.border.default}`,
                    borderRadius: radius.md,
                    padding: spacing[5],
                    backgroundColor: color.surface.subtle,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[2],
                    }}
                  >
                    <span style={{ color: color.brand.navy, display: 'inline-flex' }}>
                      <IconPackage size={18} />
                    </span>
                    <strong style={{ fontSize: 14.5 }}>ماذا يعرض التطبيق فعلًا؟</strong>
                  </div>
                  <p
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.9,
                      color: color.text.secondary,
                      margin: 0,
                    }}
                  >
                    لافتة «ضمان الخدمة الذهبي» داخل التطبيق تصف الخدمة بأنها
                    «خدمة معتمدة + فنيون موثوقون + ضمان على جميع الإصلاحات».
                    نعرض هذا النص كما هو في التطبيق — دون إضافة مدد أو شروط غير
                    معلنة هنا.
                  </p>
                </div>
              </div>
              <figure style={{ margin: 0 }}>
                <div className="img-frame-light">
                  <Image
                    src="/scenes/technician_trust.webp"
                    alt="رسم الثقة والشفافية من ملف الفني داخل التطبيق"
                    width={640}
                    height={640}
                    loading="lazy"
                    sizes="(max-width: 960px) 100vw, 520px"
                  />
                </div>
                <figcaption className="caption" style={{ marginTop: 8 }}>
                  ملف الفني يعرض البيانات والتقييمات كما هي في سجل المنصة — رسم
                  أصلي من داخل التطبيق.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="reveal"
          style={{ backgroundColor: color.surface.subtle, padding: `${spacing[10]}px 0` }}
        >
          <div className="shell-narrow">
            <SectionHead
              id="faq-title"
              eyebrow="أسئلة شائعة"
              title="إجابات بأسلوب التطبيق نفسه"
              sub="كل إجابة تصف سلوكًا موجودًا فعلًا — لا تقديرات ولا التزامات مخترعة."
            />
            <div style={{ display: 'grid', gap: spacing[3], marginTop: spacing[8] }}>
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  style={{
                    backgroundColor: color.surface.base,
                    border: `1px solid ${color.border.default}`,
                    borderRadius: radius.md,
                    padding: `${spacing[4]}px ${spacing[5]}px`,
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: Number(typography.weight.semibold) as 600,
                      color: color.text.primary,
                    }}
                  >
                    {f.q}
                  </summary>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.9,
                      color: color.text.secondary,
                      margin: `${spacing[2]}px 0 0`,
                    }}
                  >
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section
          id="download"
          aria-labelledby="download-title"
          className="reveal"
          style={{ padding: `${spacing[10]}px ${spacing[5]}` }}
        >
          <div
            className="shell"
            style={{
              backgroundColor: color.brand.navyDeep,
              borderRadius: radius.lg,
              padding: `${spacing[10]}px ${spacing[6]}`,
              textAlign: 'center',
              color: '#fff',
              position: 'relative',
              overflow: 'clip',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(560px 240px at 50% -20%, rgba(233,168,36,0.25), transparent 65%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative' }}>
              <h2
                id="download-title"
                style={{
                  fontSize: typography.size.h2,
                  fontWeight: Number(typography.weight.bold) as 700,
                  margin: 0,
                }}
              >
                جهازك يحتاج صيانة؟ ابدأ من دليل الأعطال.
              </h2>
              <p
                style={{
                  color: '#B8C4D6',
                  fontSize: 15.5,
                  lineHeight: 1.9,
                  marginTop: spacing[3],
                  maxWidth: 560,
                  marginInline: 'auto',
                }}
              >
                الخبير تطبيق جوال بثلاثة أدوار: عميل وفني وتاجر — بالعربية أولًا،
                ومتخصص في الغسالات والثلاجات والمكيفات.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: spacing[3],
                  justifyContent: 'center',
                  marginTop: spacing[6],
                  flexWrap: 'wrap',
                }}
              >
                <a
                  href="#how"
                  className="btn-gold"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: '12px 26px',
                    backgroundColor: color.brand.gold,
                    color: color.brand.navyDeep,
                    borderRadius: radius.sm,
                    fontSize: 14.5,
                    fontWeight: Number(typography.weight.semibold) as 600,
                    textDecoration: 'none',
                  }}
                >
                  <IconSmartphone size={16} />
                  تعرّف على مسار الطلب
                </a>
                <a
                  href="#roles"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '12px 26px',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    borderRadius: radius.sm,
                    fontSize: 14.5,
                    fontWeight: Number(typography.weight.medium) as 500,
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.35)',
                  }}
                >
                  اختر دورك
                </a>
              </div>
              <p style={{ color: '#8fa0b8', fontSize: 12.5, marginTop: spacing[5], marginBottom: 0 }}>
                روابط متاجر التطبيقات تُنشر هنا عند الإتاحة — لا ندّعي توفرًا غير حقيقي.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{ borderTop: `1px solid ${color.border.default}`, padding: `${spacing[6]}px 0` }}
      >
        <div
          className="shell"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <span style={{ color: color.brand.navy, display: 'inline-flex' }} aria-hidden="true">
              <IconShieldCheck size={17} />
            </span>
            <span style={{ fontSize: 13.5, color: color.text.secondary }}>
              الخبير — منصة عربية لصيانة الأجهزة المنزلية: غسالات وثلاجات ومكيفات
            </span>
          </div>
          <nav aria-label="روابط الصفحة" style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap' }}>
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                style={{ fontSize: 12.5, color: color.text.secondary, textDecoration: 'none' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <span style={{ fontSize: 12.5, color: color.text.secondary }}>
            © 2026 Al-Khabir. جميع الحقوق محفوظة.
          </span>
        </div>
      </footer>

      {/* Structured data: no ratings, no offers, no invented org facts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'الخبير — Al-Khabir',
            inLanguage: 'ar',
            description:
              'منصة عربية لصيانة الأجهزة المنزلية: غسالات وثلاجات ومكيفات، بثلاثة أدوار: عميل وفني وتاجر.',
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}

function HeroPoint({ title, body }: { title: string; body: string }) {
  return (
    <li style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: '50%',
          backgroundColor: 'rgba(233,168,36,0.16)',
          color: color.brand.gold,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <IconCheck size={14} />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {title}
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#9fb0c7', marginTop: 2 }}>
          {body}
        </span>
      </span>
    </li>
  );
}

function SectionHead({
  id,
  eyebrow,
  title,
  sub,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
      <span
        style={{
          fontSize: 13,
          fontWeight: Number(typography.weight.medium) as 500,
          color: '#5c450c',
          backgroundColor: color.brand.goldSoft,
          padding: '4px 14px',
          borderRadius: radius.pill,
          display: 'inline-block',
          marginBottom: spacing[3],
        }}
      >
        {eyebrow}
      </span>
      <h2
        id={id}
        style={{
          fontSize: typography.size.h2,
          fontWeight: Number(typography.weight.bold) as 700,
          color: color.text.primary,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: color.text.secondary,
          fontSize: 15.5,
          lineHeight: 1.9,
          margin: `${spacing[3]}px auto 0`,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

function StepCard({
  n,
  title,
  body,
  Icon,
}: {
  n: string;
  title: string;
  body: string;
  Icon: typeof IconWrench;
}) {
  return (
    <div
      style={{
        backgroundColor: color.surface.base,
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.md,
        padding: spacing[5],
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[3],
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            backgroundColor: color.brand.navy,
            color: color.brand.gold,
            fontSize: 15,
            fontWeight: Number(typography.weight.bold) as 700,
          }}
        >
          {n}
        </span>
        <span style={{ color: color.text.secondary, display: 'inline-flex' }} aria-hidden="true">
          <Icon size={19} />
        </span>
      </div>
      <h3
        style={{
          fontSize: 15.5,
          fontWeight: Number(typography.weight.semibold) as 600,
          margin: `0 0 ${spacing[2]}px`,
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.85, color: color.text.secondary, margin: 0 }}>
        {body}
      </p>
    </div>
  );
}

function RoleCard({
  Icon,
  title,
  tagline,
  points,
}: {
  Icon: typeof IconUsers;
  title: string;
  tagline: string;
  points: ReadonlyArray<string>;
}) {
  return (
    <SpotlightCard
      style={{
        backgroundColor: color.surface.base,
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.md,
        padding: spacing[5],
        boxShadow: '0 1px 4px rgba(11, 31, 58, 0.06)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: radius.sm,
          backgroundColor: color.surface.subtle,
          color: color.brand.navy,
          marginBottom: spacing[4],
        }}
      >
        <Icon size={22} />
      </span>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: `0 0 4px` }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: color.text.secondary, margin: `0 0 ${spacing[3]}px` }}>
        {tagline}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {points.map((p) => (
          <li
            key={p}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 13,
              lineHeight: 1.8,
              color: color.text.secondary,
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: color.success.DEFAULT, display: 'inline-flex', marginTop: 3 }}
            >
              <IconCheck size={14} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </SpotlightCard>
  );
}

function TrustRow({
  Icon,
  title,
  body,
}: {
  Icon: typeof IconShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing[3],
        backgroundColor: color.surface.base,
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.md,
        padding: spacing[5],
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: color.brand.navy,
          color: color.brand.gold,
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </span>
      <span>
        <strong style={{ display: 'block', fontSize: 14.5, marginBottom: 4 }}>{title}</strong>
        <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.85, color: color.text.secondary }}>
          {body}
        </span>
      </span>
    </div>
  );
}

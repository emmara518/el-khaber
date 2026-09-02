# الخبير — Project Constitution

**Path:** `docs/01_PROJECT.md`
**Version:** 1.0
**Status:** Authoritative project baseline
**Language:** Arabic (RTL product), English technical identifiers

---

## 1. Purpose of this file

This file defines the identity, boundaries, objectives, vocabulary, and non-negotiable baseline of **الخبير**. Any AI coding agent, designer, developer, QA engineer, or future contributor must read this file before changing the product.

This is a product/engineering constitution, not a replacement for the signed legal agreement. Where a legal matter conflicts with a technical assumption, the signed written agreement is the legal source of truth.

---

## 2. Product identity

- **Product name:** الخبير
- **Positioning:** منصة متخصصة في صيانة وإصلاح الأجهزة المنزلية.
- **Primary appliance scope:**
  - غسالات
  - ثلاجات
  - تكييفات
- **Core marketplace actors:**
  - عميل
  - فني
  - تاجر
- **Application model:** تطبيق Mobile واحد Multi-Role، وليس ثلاثة تطبيقات منفصلة.
- **Account model:** أثناء التسجيل يختار المستخدم Role واحدًا أساسيًا: `customer | technician | merchant`.
- **Related web surface:** Landing Page/marketing website.
- **Administrative surface:** Admin Dashboard.

---

## 3. Core business objective

الخبير يهدف إلى أن يكون طبقة موثوقة لربط مستخدمي الأجهزة المنزلية بالخدمة المناسبة، مع محتوى تشخيص الأعطال، الوصول إلى الفنيين، تنفيذ ومتابعة طلبات الخدمة، وتوفير مساحات تجارية للتجار وفق النطاق المعتمد.

**Business model baseline:** الإيرادات الأساسية تعتمد على **اشتراكات** للـ3 أنواع من المستخدمين، مع امتيازات تختلف حسب نوع الحساب والباقـة.

---

## 4. Confirmed roles

### 4.1 Customer — العميل
يستخدم التطبيق للبحث عن خدمة/فني، استكشاف الأجهزة والأعطال، إنشاء طلب خدمة، متابعة الطلب، التواصل مع الفني، وتقييم الخدمة.

### 4.2 Technician — الفني
يستخدم التطبيق لعرض ملفه وتخصصه وخدماته، استقبال الطلبات وإدارتها وفق الصلاحيات، التواصل مع العملاء، وبناء التقييمات والظهور داخل المنصة.

### 4.3 Merchant — التاجر
يستخدم التطبيق كطرف تجاري داخل المنصة لعرض المنتجات/المحتوى التجاري المتفق عليه وإدارة وجوده وفق الخطة والصلاحيات الممنوحة.

### 4.4 Admin
الـAdmin ليس Role تجاريًا من الأدوار الثلاثة الأساسية للمستخدمين النهائيين. هو دور إداري داخلي لإدارة المنصة، وتفاصيله موجودة في `09_ADMIN.md`.

---

## 5. Product pillars

1. **خدمات الأجهزة المنزلية**
2. **دليل الأعطال**
3. **الوصول إلى الفني المناسب**
4. **إدارة طلب الخدمة من البداية حتى التقييم**
5. **الاشتراكات والمزايا حسب نوع الحساب**
6. **التجار والـMarketplace ضمن النطاق المعتمد**
7. **المحتوى المجتمعي/الإخباري/AI عندما يكون ضمن الـMVP المعتمد**

---

## 6. Customer core journey

```text
Splash
  ↓
Onboarding
  ↓
اختيار نوع الحساب
  ↓
Login / Register
  ↓
Home
  ├── دليل الأعطال
  │     ↓
  │   اختيار الجهاز
  │     ↓
  │   اختيار العطل
  │     ↓
  │   التشخيص/المعلومة
  │     ↓
  │   البحث عن فني
  │
  └── البحث عن فني
        ↓
      قائمة الفنيين
        ↓
      ملف الفني
        ↓
      طلب خدمة
        ↓
      تأكيد الطلب
        ↓
      تتبع الطلب
        ├── Chat Dialog
        └── إنهاء الخدمة
              ↓
           التقييم
```

---

## 7. Confirmed UI reference screens

النسخة البصرية الحالية تستند إلى الشاشات التي تم اعتماد اتجاهها خلال التصميم:

1. Onboarding screen 1
2. Onboarding screen 2
3. Account type selection
4. Login
5. Customer Home
6. Fault Guide
7. Technician Search
8. Technician Profile
9. Service Request
10. Order Confirmation
11. Order Tracking
12. Technician Chat Dialog
13. Service Rating

هذه الشاشات هي **Reference Screens** للـVisual Direction، وليست تصريحًا تلقائيًا بإضافة أي Feature غير موثقة.

---

## 8. Visual identity baseline

- Primary direction: Premium, clean, trustworthy, specialized.
- Core palette: Navy + Gold/Amber + Off-white/White.
- RTL-first.
- Rounded cards, restrained shadows, generous whitespace.
- Device imagery must focus on household appliances.
- Avoid generic “all-trades marketplace” imagery.
- Brand language must consistently use:
  - الخبير
  - عميل
  - فني
  - تاجر
- Avoid substituting “مركز صيانة” as a user role.

Exact design tokens live in `04_UI_UX.md`.

---

## 9. Scope protection

The team must distinguish between:

### Confirmed scope
Items explicitly established in the current product discussion and/or signed agreement:
- Landing Page
- Mobile App
- Customer/Technician/Merchant roles
- Appliance domain: washing machines, refrigerators, air conditioners
- Fault Guide
- Search/filtering for technicians
- Technician profiles
- Service request flow
- Order tracking
- Technician chat dialog
- Ratings/reviews
- Subscription model
- Merchant/Marketplace capability
- Admin Dashboard
- Notifications
- The broader content concepts noted for the platform (News/Banner, Community, AI) are product directions but exact MVP depth must be approved before implementation.

### Not automatically included
- New appliance categories
- A generic marketplace for arbitrary trades or products
- Three separate mobile applications
- Unapproved payment/commission models
- Unapproved loyalty/rewards systems
- Unapproved social features
- Unapproved financial products
- Any major feature introduced during coding without scope approval

---

## 10. Commercial baseline from the signed agreement

The signed agreement states:

- **Implementation value:** 90,000 EGP.
- **Execution period:** 12 weeks.
- **Payment structure:** 15,000 EGP at start; 12 weekly payments of 5,000 EGP; 15,000 EGP at final delivery/stable operation.
- If the project is completed and fully delivered before 12 weeks, the remaining balance is due at delivery under the stated clause.
- Delay of a weekly payment by more than 7 days permits temporary work suspension without responsibility for delivery delay caused by the non-payment.
- The agreement records **5%** as the equity/partnership share and states it is separate from the 90,000 EGP implementation value.
- The signed document states that source code and technical assets become property of the project legal entity after final delivery and full payment.
- The signed document states prior oral agreements are not binding; the written signed document is the final reference.

These points are included here to prevent the engineering documentation from contradicting the signed agreement. See `08_SUBSCRIPTIONS.md` for commercial subscription logic and `10_ENGINEERING_RULES.md` for change-control.

---

## 11. Delivery philosophy

Official contractual delivery window: **12 weeks**.

Internal execution goal may be materially earlier, but early delivery must not reduce:
- QA
- security checks
- data integrity
- role isolation
- subscription correctness
- production readiness
- documented handover

---

## 12. Definition of “done” at product level

A feature is not considered done merely because the main UI works.

It is done only when:

- UI matches the approved design direction.
- Role permissions are enforced.
- Loading/error/empty states exist where needed.
- Backend validation exists.
- Data persistence works.
- Tests cover the critical path.
- No secrets are hard-coded.
- No known blocking regression remains.
- Documentation is updated when behavior or contract changes.

---

## 13. Terminology

| Arabic | Canonical technical term |
|---|---|
| العميل | Customer |
| الفني | Technician |
| التاجر | Merchant |
| دليل الأعطال | Fault Guide |
| طلب خدمة | Service Request |
| متابعة الطلب | Order Tracking |
| تقييم الخدمة | Service Rating |
| الاشتراك | Subscription |
| الباقة | Plan |
| الامتياز/الميزة | Entitlement |
| لوحة التحكم | Admin Dashboard |
| الخبير | Brand/Product |

No alternative role labels should be introduced in product logic.

---

## 14. Source-of-truth hierarchy

When information conflicts, resolve in this order:

1. Signed written legal agreement for legal/commercial/IP matters.
2. Explicit written product decision approved by the founders/CTO.
3. This constitution and its individual domain files.
4. Existing production behavior, only when documented and intentionally preserved.
5. AI/model assumptions — **never authoritative**.

When ambiguity can materially affect money, permissions, data, legal ownership, or security, **stop and request clarification instead of guessing**.

---

## 15. Rule for AI agents

Before changing code, an agent must determine:

- Which product role is affected.
- Which user flow is affected.
- Which UI reference applies.
- Which database entities are affected.
- Which API contract is affected.
- Whether subscription entitlements are affected.
- Whether admin behavior is affected.
- Whether the signed agreement is implicated.

No agent may invent a feature merely because it seems commercially useful.

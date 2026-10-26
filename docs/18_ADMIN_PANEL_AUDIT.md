# 18 — تقرير تدقيق لوحة الإدارة (WP-Admin)

> **التاريخ:** 2026-10-22
> **النطاق:** `apps/admin` (لوحة الإدارة) + مسارات `/admin/*` في `apps/api`
> **المنهجية:** تحليل ثابت للشيفرة + تحقق حي كامل في البيئة المعزولة (قاعدة بيانات اختبار tmpfs + API + اللوحة + Playwright و axe-core) بدورَي `super_admin` و `support_admin`
> **قاعدة:** هذا التقرير تقييم فقط — لم يُعدَّل أي ملف مصدر خلال التدقيق. الأدلة البصرية في `docs/assets/admin-audit/`.

---

## A. الملخص التنفيذي

| البند | النتيجة |
|---|---|
| **الحكم** | ✅ **تحقق ناجح مع تحفظات** (Verified with reservations) |
| نتائج P0 | **لا توجد** |
| نتائج P1 | 1 |
| نتائج P2 | 5 |
| نتائج P3 | 9 |
| اختبارات الواجهة المنطقية | 27/27 ناجحة (`admin-api.spec.ts`) |
| اختبارات الوحدة للـAPI الإداري | **0** (فجوة P1) |
| نتائج axe-core (login + 10 تابات) | نظيف إلا: تباين ذهبي واحد (serious) وعنوان جدول فارغ (minor) |
| RTL / عربي | سليم بنيوياً؛ لا مشاكل اتجاه مكتشفة |
| الإنفاذ الأمني للخادم | **مثبت حياً**: كل محاولة غير مصرّحة انتهت بـ403 واضح |

**الخلاصة:** الخادم الإداري سليم المرجعية — الحرس `AdminRoles` يُنفَّذ كل الطرق (قبول المدفوعات للـsuper فقط، منع الحذف/الإثبات عن الـsupport بنجاح). الواجهة جاهزة للاستخدام الداخلي مع دفعة إصلاح أولية صغيرة (تمكين الأزرار حسب الدور + لون النص الذهبي + مزامنة التوثيق)، والفجوة المهيكلة الوحيدة هي غياب تام لاختبارات وحدة الـAPI الإداري رغم كونه الطبقة الحاكمة.

---

## B. جرد الواجهة والمسارات

### B.1 صفحة الدخول (`/login`)
- `login/page.tsx`: بريد + كلمة مرور، رسائل خطأ عربية معرّبة (`INVALID_CREDENTIALS` → نص عربي)، تفاعل مع `Post /admin/auth/login`.
- مثبت حياً: دخول ناجح يوجه إلى `/`، الدخول مرئي عربي RTL كامل (سكرينشوت `audit-login.png`).

### B.2 لوحة القيادة (`/dashboard` — ملف واحد `dashboard/page.tsx`، 1707 سطراً)
| التاب | الأدوار (الخادم) | الأدوار (الواجهة `TAB_ROLES`) | مطابقة |
|---|---|---|---|
| metrics | الكل | مطابقة | ✔ |
| users | super, ops, support | مطابقة | ✔ |
| technicians | super, ops, support (list) / **super, ops** (تغيير التوثيق) | مطابقة مع إظهار الأزرار للجميع ضمن الأدوار المذكورة | ✔ (مع P2-1/P2-2 في style الإجراء) |
| merchants | نفس ما سبق | مطابقة | ✔ |
| requests | super, ops, support (list) / super, ops (تغيير الحالة، تعيين فني) | مطابقة | ✔ |
| reviews | super, ops, content, support (list) / **super, content** (حذف) | مطابقة على مستوى التاب | ✔ لكن أزرار الحذف ظاهرة للجميع (P2-1) |
| payments | super, ops, support (list) / **super** (قبول/إبطال) | مطابقة على مستوى التاب | ✔ لكن أزرار القبول ظاهرة للجميع (P2-1) |
| grants | **super فقط** | مطابقة | ✔ (مثبت حياً: التاب مخفي عن support) |
| notify | super, ops, support | مطابقة | ✔ |
| audit | **super, ops فقط** | مطابقة (مثبت حياً: support لا يره) | ✔ |

### B.3 مسارات الخادم المنفذة (`apps/api/src/admin`)
- `POST /admin/auth/login` + مستندات؛ `GET /admin/metrics`
- `GET /admin/users`, `GET /admin/users/:id` (بدون واجهة تفاصيل — P3-9)
- `GET /admin/technicians`, `POST /admin/technicians/:id/verification`
- `GET /admin/merchants`, `POST /admin/merchants/:id/verification`
- `GET /admin/requests`, `POST /admin/requests/:id/status`, `POST /admin/requests/:id/assign`
- `GET /admin/reviews`, `POST /admin/reviews/:id/remove`
- `GET /admin/payments`, `GET /admin/payments/:id`, `POST /admin/payments/:id/decision`
- `GET /admin/payments/submissions/:id/proof-url` (super, ops)
- `GET /admin/subscription-grants`, `POST /admin/subscription-grants`
- `POST /admin/notifications/send`
- `GET /admin/audit-logs` (super, ops)

### B.4 مكتبة العميل (`apps/admin/src/lib/admin-api.ts` + `.spec.ts`)
- غلاف واحد، عرض معين (envelope)، تحويل الأخطاء إلى رسائل عربية عبر `AdminApiError`، إدارة جلسة `localStorage`، آلية `withAuth` استعادة، 27 اختبار منطقي.
- دالة كاشفة مشتركة `requestEnvelope` مع `JSON.parse` خارج `try` (P3-5).

---

## C. ما تحقق حياً (البيئة المعزولة)

### C.1 تهيئة
- Container Postgres tmpfs معزول (منفذ **5433**, `khabir_test`) عبر `docker-compose.test.yml` + `apps/api/scripts/provision-test-db.mjs` (migrations + safety marker).
- حسابان إداريان موثقان في قاعدة الاختبار: `audit-super@example.test` (super) و `audit-support@example.test` (support).
- API حي على منفذ **3010** مقيّد بتلك القاعدة (صحة `GET /api/v1/health` → 200).
- اللوحة حية على منفذ **3001** مع `${NEXT_PUBLIC_API_URL}=http://localhost:3010`.
- كل شيء أُوقف وأُزيل بعد التدقيق (لا آثار في المستودع).

### C.2 إثباتات سلوكية (Playwright)
| إثبت | النتيجة | الشاهد |
|---|---|---|
| دخول super ناجح + عرض لوحة القيادة | ✔ | `audit-dashboard-metrics.png` |
| جولة الـ10 تابات | ✔ | `audit-tab-*.png` |
| مصفوفة أزرار «قبول» للمدفوعات لـsuper: فعّالة فقط للصفوف pending وقيمة others disabled | ✔ من laptop | `audit-tab-payments.png`, `audit-payment-detail-full.png` |
| support: تاب المنح **مخفي** كلياً | ✔ | `audit-support-payments.png` |
| support: أزرار قبول المدفوعات مخفية (تفاصيل فقط) | ✔ | نفس ما سبق |
| support: زر حذف تقييم ظاهر لكن → 403 «لا تملك صلاحية لهذا الإجراء» | ✔ (P2-1) | `audit-support-delete-review.png`, `audit-support-403-banner.png` |
| support: زر «معاينة الإثبات» ظاهر لكن → 403 | ✔ (P2-2) | `audit-support-proof-403.png` |
| اختبار بيانات دفعة سفلية لمفتاح `proof_storage_key` (تحديث مختبري ثم تظهر الزر) | ✔ | `audit-super-proof-preview.png` |
| أجهزة موبايل (390×740, 320×700) | نظيفة بلا كسور تخطيط | `audit-mobile-metrics.png`, `audit-mobile-320.png` |

### C.3 مسح WCAG (axe-core)
- صفحة الدخول + جميع التابات: **نظيفة**: الصفحة الوحيدة التي بها مشاكل:
  - تاب التقييم: `color-contrast` **serious** — `★ 5/5` ذهب `#E9A824` على أبيض (2.08:1 مقابل 4.5:1 المطلوب، خط عادي بحجم 13.5px) → P2-3.
  - تاب التدقيق: `empty-table-header` minor → P3-1.

---

## D. النتائج حسب الخطورة

> كل عنصر يحتوي: `الموقع` · `الدليل` · `التأثير` · `الإصلاح`

### P0 — لا يوجد 🟢
لا عائق إطلاق. لا ثغرة كشف بيانات، لا تجاوز صلاحيات محتمل للخادم، لا لحظة فقدان منطق.

### P1 — عائق هيكلي (بنيوي) 🟠

#### P1-1 · لا غياب أي اختبارات وحدة على وحدة `apps/api/src/admin`
- **الموقع:** `apps/api` — 9 ملفات `*.spec.ts` إجمالاً ولا يغطي أي منها `src/admin`.
- **الدليل:** البحث المنهجي الزمني (rg) → لا ملف spec للمتحكم أو الخدمات الإدارية.
- **التأثير:** الخادم الإداري هو الطبقة الحاكمة (RBAC، قرارات مالية، التدقيق) وهي غير مغطاة بلا اختبار آلي. كل تغيير قادم يعتمد كلياً على موافقة بشرية/اختبار e2e غير موثوق.
- **الإصلاح:** حزمة اختبارات NestJS بتغطية:
  1. مصفوفة الأدوار لكل endpoint (سريع: multiple roles × endpoint → 200/403).
  2. منطق `setVerification` (same-status → 409، سبب إلزامي للـ rejected/suspended).
  3. `decidePayment` (pending-only، super فقط، بصمة غير قابلة للعدول).
  4. `removeReview` (سبب، إعادة حساب عدد التقييمات، تسجيل تحقق).
  5. `grant` (super فقط، idempotent في الحدود المختارة).

### P2 — جودة رئيسية قبل ما هو مثالي 🟡

#### P2-1 · أزرار الإجراءات غير المكفولة بالدور في الواجهة ( مصفوفة تمكين غائبة)
- **الموقع:** `dashboard/page.tsx` صفوف الجداول وأزرار الأفعال (بارزاً الآن: زر حذف التقييم، أزرار قبول المدفوعات، أزرار تغيير التوثيق). لا توجد آلية لتمكين الأزرار في الواجهة بالاعتماد على `adminRole`.
- **الدليل الحي:** حساب support: يرى زر حذف التقييم، بعد النقر يستلم 403 «لا تملك صلاحية لهذا الإجراء» (`audit-support-delete-review.png` + `audit-support-403-banner.png`)، والخادم (admin.controller.ts:262) يسمح بـsuper+content فقط.
- **التأثير:** إحباط المستخدم + رحلات شبكية مقحومة ومنطق وهمي في الواجهة.
- **الإصلاح:** خريطة صلاحيات الحد من خلال `useAdmin` الحالية (هي متاحة مسبقاً من `/admin/me` أو الحالة المحفوظة) + طبقة `<ActionAuth>…` مثل `TAB_ROLES`؛ أزرار تغييرわれて `disabled` مع `aria-disabled` + توضيح على hover («محجوز لصلاحية أعلى»).

#### P2-2 · زر «معاينة الإثبات» ظاهر لدعم عملاء بلا صلاحية
- **الموقع:** `dashboard/page.tsx:1242-1280` (`ProofPreviewButton` + شرط الظهور `proofStorageKey != null` فقط)؛ الخادم: `admin-proof.controller.ts:32` (super+ops فقط).
- **الدليل الحي:** حساب support يرى الزر ويحصل على 403 (`audit-support-proof-403.png`).
- **التأثير:** نفس عائلة P2-1، وسيئ خاصةً لعملاء الدعم قد يفسِّروا الخطأ كخلل.
- **الإصلاح:** إدراج معاينة الإثبات في خريطة الأدوار كما في P2-1 (إظهار «غير متاح لصلاحيتك» بدل الزر).

#### P2-3 · تباين لوني امتلائي: النص الذهبي `★ N/5`
- **الموقع:** `dashboard/page.tsx:1028` يجري `color.brand.gold`=$('#F7B32B'-like) على أبيض.
- **الدليل:** `axe` الآن يوقّع `color-contrast` على الموضع: 13.5px حجم خط عادي (ليس كبيراً) مع نطاق فسحة صغيرة؛ الفحص: нравится **2.08:1** (تتطلب **4.5:1**).
- **الإصلاح:** استبدال بسطر واحد: `color.brand.goldInk` (#7A5A00) للنص فقط، وبقاء الGold بالنموذج المعلّم/الأيقونة (والتوكن موجود مسبقاً في `packages/ui-tokens/src/color.ts`).

#### P2-4 · يعتمند البحث على الأمام فقريّاً (مع إفصاح في الواجهة)
- **الموقع:** صف كلمة `page.tsx` line 208-209 (فلترة في الذاكرة في تاب on direct rows)؛ `placeholder` يدّقق «البحث في الصفحة الحالية».
- **المظهر:** نتائج `q` الخاص بالعناوين خامل في الشكل بسبب أن الخادم لا يرى الاستعلام؛ عبر معيار التصفية سينكسر التبعية.
- **الإصلاح (بلا ميل لاعتبارها نقطة صرف):** تمرير `q` إلى الـendpoints السابقة (متوافقة: تقبل `q` في `technicians|merchants|users` والفلاتر الحالة من الخادم `requests`)، وإظهار «نتائج عبر الصفحات — تحميل 10 من 100» مع زر حذف البحث.

#### P2-5 · شذوذ توثيقي ممنهجي (Docs Drift)
| وثيقة | ما توثقه | تنفيذ فعلي | مصداقية التنفيذ |
|---|---|---|---|
| `docs/07_API.md:844` و`docs/09 §19` | 401 لأخطاء الصلاحية | 403 من `admin-roles.guard.ts` | 403 مُثبت حياً |
| `docs/09 §19` | payments决定: super+finance | **super فقط** (canDecidePayment) وغير Roles مشددة | ✔ |
| `docs/09 §19` | payments delete: super+ops+content+support | super+content فقط (`admin.controller.ts:262`) | 403 مثبت لتدعم |
| `docs/09 §18` | `/admin/appliances`, `/faults`, `/services`, `/content`, `/subscriptions` (مدمجة) | **غير منفذة إطلاقاً** | — |
| `dashboard/page.tsx:83` (تعليق مصدر) | «API يعيد كل تعديل بـ401» | في التوثيق: 403 أيضاً | تعليق مصدر تجريبي عنه |

- **الإصلاح:** كتابة إصلاح واحد من الناحية: توحيد «403 = صلاحية، 401 = غير مصادق»، تصحيح matrices §18/§19، إزالة/تحويل عناصر §18، وتحديث كومنت الملف.

### P3 — تحسينات وترتيب 🔦

| # | البند | الموضع | الملاحظة/الإصلاح |
|---|---|---|---|
| P3-1 | تاب التدقيق: العمود `#` عنوان جدول فارغ + «السبب » خانة بدون ملاحظة؛ التواريخ ISO `createdAt.slice(0,10)` بالألوان الإنجليزية | `dashboard/page.tsx` (صفوف audit) + header | لقب عنوان صريح («م»)؛ إظهار رسالة «مسجَّل ضمن التدقيق الداخلي» للفارغ؛ توطين التاريخ (Posted) بحسلة مسافة عربية |
| P3-2 | تاب المنح: بطاقات placeholders بمََار UUID خام و«0.00 ر.س» أصلي | `dashboard/page.tsx: grants render` | «معاينة صندوقية» بديلاً عن UUID، ومنع إظهار بطاقات فارغة قبل البيانات |
| P3-3 | مُصوِّر الإشعارات: `type` حقل نص حر (بدون قائمة محدودة أو قوالب) | `dashboard/page.tsx: notify compose` | `select` من قائمة محدودة + قوالب سريعة |
| P3-4 | ألوان صلبة خارج التوكنز: `globals.css` (#F3C4C4, #BFE6CF, #fff) + خلفيات soft للـbanners (#2E9B5F على #EAF7EF ≈ 3.05:1؛ #D94A4A على #FDECEC ≈ 3.4:1) | `dashboard/page.tsx:470-472`, `login/page.tsx:196-199`, `globals.css` | انتقالنا توكنز؛ باستخدام ألوان النص المرمّزة حساب app: `success.ink #1F6B41` / `error.ink #B3261E` على الخلفيات soft |
| P3-5 | `JSON.parse` خارج `try` داخل `requestEnvelope` → استثناء بلا رسالة ودّية | `admin-api.ts` | try/catch مفرد لرفع `AdminApiError('PARSE')` |
| P3-6 | تخزين التوكنات `localStorage` (XSS → سرقة جلسة؛ لا دورة إعادة تلقائية) | `admin-api.ts` | موثق مقبول ضمن البيئة الداخلية؛ الطريق ل없ا: مايكرو-أقسام `httpOnly` أو `memory token + refresh rotation` |
| P3-7 | `AssignControl` يطلب أول 100 فني موثق بلا مؤشر/تنقل | `dashboard/page.tsx:1368+` | إجمالي عرض «أول 100 من N» + إدخال معرف يدوي في نهاية القائمة |
| P3-8 | تعارض إعدادات الاختبار: `docker-compose.test.yml` (5433, khabir:khabir) مقابل `run-http-e2e.mjs` الافتراضي (55432, khabir_test:khabir_test_pw) | `apps/api/scripts/run-http-e2e.mjs` | للاختبار الجاهز: توحيد الافتراضي مع compose أو تفحص `TEST_DATABASE_URL` (يدعمها الآن بسكربت يذكره بأوضح طريقة) |
| P3-9 | `GET /admin/users/:id` منفذ على الخادم دون `view` الواجهة | `dashboard/page.tsx users` | لا(detail) الآن (التصميم سليم: التوثيق يعيش في التقنيات/التجار)؛ إضافة عرض تفاصيل يحسن هذه الفقرة (سجل تدقيق، إشعارات أُرسلت، الاشتراك) |

---

## E. الأمن والصلاحيات (RBAC) — ما ثبت حياً

| مبدأ | الحكم | التفصيل |
|---|---|---|
| الإنفاذ من الخادم حصرياً | 🟢 مثبت | `AdminRoles` Guard يُنفذ على كل endpoint مخلِّف؛ كل محاولة غير مصرح بها في اللوحة (delete review, proof preview, approve payment) للدعم انتهت برسالة 403 واضحة. الاتكاء UI على `TAB_ROLES` للإخفاء وليس الاستيثاق — صحيح مبدئياً |
| لا فراغات صمت في الأخطاء | 🟢 | الدخول غير الصحيح → رسالة عربية واضحة (بدون تفصيل وجود)؛ لا كشف السجل |
| تسجيل التدقيق | 🟢 | كل عملية (توثيق، تقرير دفع، حذف تقييم، إرسال إشعار، منح) تسجل actor/الهدف/الأمر بالأمر `admin.audit` |
| الجلسات | 🟡 | `localStorage` في المتصفح (P3-6)؛ النهدية قصيرة الأجل؛ عمليات الشيخوخة (som-واحدة) بلا تجديد — مقبولة للوحة الداخلية |
| لا `dangerouslySetInnerHTML`، لا مفتاح أمني مخفي | 🟢 | فحص الشيفرة نظيف — لا innerHTML، لا تحقق API keys/Composer طبقة العميل |
| CORS | 🟢 | يبدو من `CORS_ORIGINS`; اللوحة في `localhost` فقط يتصرف |
| لا طبقة تحديد على `decideUserVerification` للمستخدم | 🟢 | التوثيق مسجل دائم بحسب `Technician/erchantProfile.verificationStatus` — الذي يخضع `setVerification` الموحد؛ لا مسار إطلاق `users/:id/verification` — سليم مبدئياً وليس فجوة |

**اللمس الاختراق الجامع:** من تخمين سابق عن غياب «تحقق المستخدم» كان خاطئاً — المشهد المصرف للمقابل (الصف الدائم) منفذ بأدوارد super+ops في الخادم ولكل الأنواع، ويحفظ السبب ويُعلم المستخدم. ✔ تم التحقق من `setVerificationBody` (admin.controller.ts:44-50): الخدمة تفرض السبب في حالة rejected/suspended؛ الواجهة تطالب به حقاً.

---

## F. تجربة الاستخدام والواجهة (UI/UX)

**سبريت القوي**
- بنية RTL مثالية والابتداء عربيًا أولاً؛ Sidebar حواف إنشائية؛ صفحات معلومات سياقية في كل تاب (`TAB_CONTEXT`)؛ Elasticsearch/Filters مع فهم من مطابقة الخادم.
- أفعال التدمير محمية بتأكيد مزدوج (confirm + سبب الإلزام حيث يقتضي)؛ شريط المعلومات السبريت إلى الحوار المستلَم.
- الحالات تغطي Loading/error/empty مع رسائل مصرّحة.
- Surrounds UX «لا تملك صلاحية لهذا الإجراء» تظهر بشكل مرئي في وقت (لا صمت خبيث).
- تمرر رسائل الخطأات أمجّمة بشكل موحد (403/409/404 → عربي بسلوك مميز).

**مرابعة (كما في D)**
- 🟡 الأزرار الظاهرة للدعم وتنتهي بـ403 (P2-1، P2-2) — أكبر خسر UX ليس التباين بل حجم الاستياء.
- 🟡 النص الذهبي ضعيف القراءة (P2-3).
- 🔦 UUID «خام» و0.00 مقلقات (P3-2)، حقل type حر (P3-3)، تواريخ ISO (P3-1).

**إمكانية الوصول**
- axe صادق: 0 قلصاً في login + 8 تابات، 1 serious تواجه Tu + 1 minor سجل — بتقدير شبه ممتاز مفاجئ للجدة الصفحة الكبيرة.
- استخدام `aria` التسميات داخل الغرفة (برفات التصفية labeled) — مقبول.
- المفاتيح: التنقل بالتوك TAB/Shift Tab معلوم؛ لا مخصصات دقة أخرى.

**الموبايل** — التخطيط المتقدم وظيف على 390px و320px بلا كسر شيوع.

---

## G. خط القياس الاختباري (Test Baseline)

| طبقة | الحالة | التفصيل |
|---|---|---|
| وحدة الواجهة المنطقية | 🟢 27/27 | `admin-api.spec.ts` (رسائل، مصفوفة، معاينة ملفات، معاينة الإثبات) |
| اختبارات الوحدة للخادم الإداري | 🔴 0 | (P1-1) — الفجوة المهيكلة الوحيدة |
| typecheck/lint الواجهة | 🟢 نظيف | جلسة سابقة |
| HTTP e2e | 🟡 غير مُشغّل وجراجاً | الافتراضي يشير لـ UAT (غير مقبول في تدقيق)؛ التصحيح عبر `TEST_DATABASE_URL` مع compose اليعزول: `pnpm exec node apps/api/scripts/run-http-e2e.mjs` بعد لا يُطلق إلا مع ضد فحص كامل |
| تحقق حي يدوي (Playwright) | 🟢 تشغيلية كاملة | قسم C |

**ملاحظة المرفظ:** غياب اختبارات siempre الخادم وهو الحاكم — يعني أن غياب regression في Vault المستندات المالية يعتمد على نظافتكاكة يدوية؛ أول خطوة بعد P2 هي الحزمة (P1-1).

---

## H. خريطة الطريق (Roadmap)

### الدفعة الأولى (يومَان — قبل أي استخدام فعلي)
1. **P2-1 + P2-2:** خريطة `ACTIONS_ROLES` وتعميمها على كل أزرار الإجراءات (حذف تقييم، مقابض الإثبات، قبول مدفوعات، تغييرات التوثيق) — يعني تعطيل أو إخفاء حسب الدور + تلميح عربي. ~نصف ألف شهير.
2. **P2-3:** سطر واحد: `color.brand.gold` → `color.brand.goldInk` عند عرض النص الذهبي.
3. **P2-5:** تحديث `docs/07_API.md` (401→403 في `§844`) + `docs/09 §18/§19` (matrices الحالية الخضراء + إزالة مسارات وهمية) + تعليق `dashboard/page.tsx:83`.
4. **P3-1** (سريع): رقم لعمود `#` + توطين التواريخ.

### الدفعة الثانية (أسبوع)
5. **P1-1:** مجموعة اختبارات وحدة الخادم الإداري (RBAC matrix generator + business invariants) — أولوية ملاك العائلة.
6. **P2-4:** ربط البحث بالخادم (`q`) مع مؤشر نتائج بشمولية.
7. **P3-3/P3-5/P3-7:** type قائمة إشعارات + try/catch للparse + حد 100 مع بشارة.
8. **P3-4:** توحيد الألوان عبر توكنز ink/soft.

### الدفعة الثالثة (احتياطي)
9. **P3-6:** مراجعة دورة الجلسة (refresh rotation أو httpOnly).
10. **P3-8:** توحيد prepهاية التساسة المعزولة مرة واحدة.
11. **P3-9:** عرض تفاصيل المستخدم.
12. توثيق وضع Ops الواجهة، استخدام admin مخصصة for content/finance — بعد سلامة الإزياح القوائم السابقة.

---

## I. حكم الجاهزية والملاحق

### I.1 الحكم

> **✅ VERIFIED WITH RESERVATIONS — «تحقق ناجح مع تحفظات»**
>
> الخادم الإداري (`/admin/*`) مستوياته المثبتة قوية: إنفاذ صلاحيات الخادم حيد، تسجيل تدقيق قائم، تحقق حي كامل للإضاءة مع أدوار حقيقية على متن اجراء ومكلل بناء النجاح في القواعد الدوليه.
> التحفظات الثلاث الدقيقة:
> 1. 0 اختبار وحدة على «الحَيكَة» نفسها (P1-1) — أبرز ما يجعل SGORA Когда skeleton الثقة في الامتداد لا في السحر.
> 2. اكتظاظ أزرار غير مصرح بها في الواجهة ومع 403 بعد النقر (P2-1/2-2) — تجربة داخلية مت END but ليس التي تجلب الانبساط.
> 3. وثيقة عملي متندخرة (P2-5) — مثُّك توثيق المرجع للفريق عملياً.

**لا يوجد عائق P0 ولا سبب للتأجيل؛ الدفعة الأولى في H تحسم التحفظات 2 و3 في يومَي عمل.**

### I.2 الأدلة البصرية
كل اللقطات في `docs/assets/admin-audit/`:
`audit-landing`, `audit-login`, `audit-dashboard-metrics`, `audit-tab-{requests,users,technicians,merchants,reviews,payments,grants,notify,audit}`, `audit-payment-detail`, `audit-payment-detail-full`, `audit-super-proof-preview`, `audit-support-payments`, `audit-support-delete-review`, `audit-support-delete-after`, `audit-support-403-banner`, `audit-support-proof-403`, `audit-mobile-metrics`, `audit-mobile-320` (بصيغة `.png`).

### I.3 إعادة بناء البيئة المعزولة (للمراجعين)
```bash
# 1) قاعدة اختبار معزولة
docker compose -f docker-compose.test.yml up -d
TEST_DATABASE_URL='postgresql://khabir:khabir@localhost:5433/khabir_test' \
  node apps/api/scripts/provision-test-db.mjs

# 2) حسابا تدقيق (مثلاً عبر create-admin.ts تفاعلياً أو seed-qa.mjs)

# 3) API على منفذ مؤقت
DATABASE_URL='...5433/khabir_test' DIRECT_URL='...5433/khabir_test' \
  PORT=3010 CORS_ORIGINS='http://localhost:3001' pnpm --filter @khabir/api start

# 4) اللوحة
NEXT_PUBLIC_API_URL=http://localhost:3010 pnpm --filter @khabir/admin dev -- --port 3001
```
(بعد الانتهاء: `docker compose -f docker-compose.test.yml down -v` + إيقاف العملية.)

### I.4 حدود التدقيق (ما لم يغط)
- الأدوار `operations_admin`, `content_admin`, `finance_admin` لم تختبر حياً (بنى المصفوفة قد اجتازت الخادم بالمنطق نفسه؛ يوصى بتمرير جولة واحدة إضافية post-fix).
- لا هجوم مستخدم (fuzzing/pentest)، ولا فحص إنتاجية من الإنتاجي؛ لا مراجعة عمليات النشر.
- إرسال إشعار فوهة مختبرة سلوك استلام المستخدم النهائي (فقط واجهة المسار).

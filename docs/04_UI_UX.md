# الخبير — UI/UX Design System

**Path:** `docs/04_UI_UX.md`
**Version:** 1.0
**Status:** Visual source of truth

---

## 1. Design objective

The visual language of **الخبير** must feel:

- Premium
- Clean
- Trustworthy
- Specialized in home appliances
- Modern Arabic-first
- Calm rather than noisy

The product must not visually resemble a generic classified-ads board or a generic all-trades marketplace.

---

## 2. Approved visual direction

The accepted reference screens establish:

- White/off-white primary canvas
- Dark Navy for primary structure and strong CTAs
- Gold/Amber for accents and selected states
- Soft gray borders and muted text
- Rounded cards
- Low-intensity shadows
- Large whitespace
- Arabic RTL hierarchy
- Appliance-focused photography/visuals

---

## 3. Color tokens

These tokens form the baseline. Implementation should centralize them in a single theme/token file rather than scattering hex values.

```text
color.brand.navy       = #0B1F3A
color.brand.navyDeep   = #06172D
color.brand.gold       = #E9A824
color.brand.goldSoft   = #F7E7BD
color.surface.base     = #FFFFFF
color.surface.subtle   = #F7F8FA
color.text.primary     = #10213A
color.text.secondary   = #697586
color.border.default   = #E4E8EE
color.success          = #2E9B5F
color.successSoft      = #EAF7EF
color.error            = #D94A4A
color.errorSoft        = #FDECEC
color.warning          = #C88311
color.overlay.scrim    = rgba(0,0,0,0.55)
```

If the existing project already contains a documented theme, it should be reconciled with these tokens instead of creating a second competing theme. Any change requires CTO/UI approval.

---

## 4. Typography

The product is Arabic-first and RTL.

Typography rules:
- Use a highly legible modern Arabic sans-serif.
- Use consistent font weights rather than decorative type treatments.
- Titles: strong/semi-bold.
- Body: regular/medium.
- CTA: medium/semi-bold.
- Never use all-caps English styling as a substitute for Arabic hierarchy.

Recommended semantic sizes:

```text
Display / Hero: 32–40
H1:              28–32
H2:              22–26
H3:              18–20
Body:            15–17
Caption:         12–14
Button:          15–17
```

Actual device scaling must use the platform typography system.

---

## 5. Spacing scale

Use a base 4 px rhythm:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Default page horizontal padding:
- Small/mobile: 16–20 px
- Large layouts: adapt responsively

Do not use arbitrary spacing values repeatedly. Prefer tokenized spacing.

---

## 6. Radius system

```text
radius.sm = 10
radius.md = 14
radius.lg = 20
radius.xl = 28
radius.pill = 999
```

Cards should feel soft, not inflated.

---

## 7. Shadows

Use subtle elevation:

- Card elevation: low
- Floating CTA: medium
- Dialog: high

Avoid heavy black shadows or glassmorphism unless explicitly approved.

---

## 8. RTL rules

- Primary layout direction: RTL.
- Text alignment follows Arabic semantics.
- Icons that imply direction must mirror where the symbol is directional.
- System/media controls that have platform-fixed semantics may remain unchanged.
- Navigation/back behavior must be consistent with the platform.

Never implement RTL by simply flipping the entire screen bitmap.

---

## 9. Header pattern

Typical header:

```text
[Back / Context]     [Brand / Title]     [Notifications / Menu]
```

The exact header composition changes by screen, but the visual language stays consistent.

Do not crowd the top bar with unnecessary actions.

---

## 10. Bottom navigation

Customer baseline:
- الرئيسية
- المفضلة
- طلب خدمة
- طلباتي
- حسابي

The central service CTA may be visually elevated.

For Technician and Merchant, navigation may differ semantically but should reuse the same visual system.

---

## 11. Buttons

### Primary
- Navy background
- White label
- Rounded
- Strong enough to be obvious

### Accent/CTA
- Gold background for high-conversion moments such as “طلب خدمة” or selected states where the context supports it.

### Secondary
- White/transparent surface
- Navy text
- Defined border when needed

### Destructive
- Error semantic color
- Never reuse brand gold for destructive actions

All buttons must have:
- default
- pressed
- disabled
- loading
- error state where relevant

---

## 12. Form inputs

Inputs must show:
- Label or clear placeholder
- Focus state
- Error state
- Disabled state
- Validation feedback
- Keyboard/input type

Never rely on placeholder text as the only label for important fields.

---

## 13. Cards

Cards are a major visual primitive.

Use cards for:
- Technician results
- Appliance categories
- Fault categories
- Order summaries
- Subscription plans
- Merchant products

Rules:
- One clear purpose per card.
- Strong title hierarchy.
- Avoid excessive decoration.
- Keep metadata compact.

---

## 14. Technician card

Canonical information hierarchy:

1. Photo/avatar
2. Name
3. Specialty
4. Verification
5. Rating + review count
6. Distance/availability when relevant
7. Key service/benefit
8. CTA

Do not overload the card with the entire profile.

---

## 15. Appliance card

Primary appliance categories:

- غسالات
- ثلاجات
- تكييفات

Each card should emphasize:
- appliance image
- Arabic label
- contextual action

Do not introduce unrelated appliance categories in the primary navigation without approved scope expansion.

---

## 16. Fault Guide UI

The UI should feel like a diagnostic tool, not a generic article list.

Suggested hierarchy:

```text
دليل الأعطال
↓
Search problem
↓
Choose appliance
↓
Choose symptom
↓
Result / explanation
↓
Find a technician
```

Use concise issue cards and readable diagnostic content.

---

## 17. Search & filters

Search should be visually dominant but not overwhelming.

Filters should use chips/pills or a filter sheet depending on density.

Selected filters:
- visible
- dismissible
- consistent
- reflected in query/state

Never create a filter that is not supported by backend logic.

---

## 18. Technician profile

Visual hierarchy:

```text
Profile hero
↓
Verification + rating
↓
Stats
↓
Services
↓
Portfolio (if enabled)
↓
Reviews
↓
Guarantee/trust section
↓
Sticky Request Service CTA
```

The CTA is the conversion anchor.

---

## 19. Service request UI

Use a step-aware composition.

Recommended structure:
1. Appliance
2. Problem
3. Description
4. Photos
5. Location
6. Appointment
7. Summary

The form should progressively expose complexity rather than presenting everything at once when possible.

---

## 20. Order tracking UI

Use a state tracker with clear semantic labels.

Example:

```text
تم الطلب
   ↓
تم التواصل
   ↓
في الطريق
   ↓
قيد التنفيذ
   ↓
تم الإنجاء
```

The exact backend status enum is authoritative; UI labels map to it.

---

## 21. Chat dialog

The agreed pattern is a **dismissible modal/dialog** over the current service context.

Required visual elements:
- Scrim overlay
- Technician header
- Close control
- Conversation area
- Input composer
- Send button
- Optional attachment

Dialog must not feel like a separate app.

---

## 22. Subscription UI

Three tiers:
- عادي
- Platinum
- VIP

The design should emphasize:
- Current plan
- Most important benefits
- Upgrade path
- Billing cadence
- Renewal status

Do not show a benefit as active unless the backend entitlement says it is active.

---

## 23. Empty/loading/error states

Every list or asynchronous module should define:

### Loading
- Skeleton or compact loading indicator
- Preserve layout stability

### Empty
- Clear explanation
- Useful CTA

### Error
- Human-readable message
- Retry

### Offline
- Clear offline status where relevant
- Avoid destructive data loss

---

## 24. Accessibility baseline

- Sufficient text contrast.
- Touch targets approximately 44 px or platform equivalent.
- Do not rely on color alone for selected/verified/error states.
- Support dynamic text where platform allows.
- Semantic labels for icons.
- Test RTL readability.

---

## 25. Image direction

Images must reinforce appliance specialization.

Preferred:
- Washing machines
- Refrigerators
- Air conditioners
- Professional technicians working with those appliances

Avoid:
- Generic electricians/plumbers as hero imagery
- Unrelated home improvement visuals
- Generic multi-trade marketplace stock art

---

## 26. Screen consistency rules

A new screen must reuse:
- theme tokens
- typography
- spacing
- card primitives
- button primitives
- navigation patterns
- status badges

Before creating a new component, search the codebase for an existing equivalent.

---

## 27. Design acceptance checklist

A screen is accepted only when:

- RTL is correct.
- Brand treatment matches the reference direction.
- No arbitrary colors exist.
- Spacing is tokenized.
- Primary CTA is obvious.
- Loading/empty/error states are defined.
- Role-specific information is visible only where appropriate.
- It behaves correctly across supported screen sizes.

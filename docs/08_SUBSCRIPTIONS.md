# الخبير — Subscription & Entitlement System

**Path:** `docs/08_SUBSCRIPTIONS.md`
**Version:** 1.0
**Status:** Commercial logic baseline

---

## 1. Business model

الخبير يعتمد على **الاشتراكات** كأحد/الـcore revenue models، مع اشتراكات مخصصة لكل Role من الأدوار الأساسية:

- عميل
- فني
- تاجر

كل Role لديه خطط:

- عادي
- Platinum
- VIP

**Important:** الـ5% equity في الشركة ليست اشتراكًا ولا علاقة لها بمنظومة الاشتراكات.

---

## 2. Subscription design principle

The subscription product is not just a price page. It is:

```text
Role
 ↓
Plan
 ↓
Entitlements
 ↓
Feature access / limits / visibility
```

The user should understand:
- What plan they have.
- What benefits they receive.
- What changes when they upgrade.
- Renewal/expiry status.

---

## 3. Canonical plans

### Basic / عادي
Entry-level plan.

### Platinum
Mid-tier paid plan with stronger benefits.

### VIP
Highest-value tier with the strongest approved entitlements.

Exact prices are **TBD/configurable** until commercially approved. They must not be hard-coded into components.

---

## 4. Role-specific value proposition

### 4.1 Customer
Customer pays for **convenience, priority, support, access, and approved premium experiences**.

Candidate benefits from the previously discussed product direction:
- priority support
- premium offers/discounts
- access to enhanced features
- additional convenience benefits

These are **proposed**, not binding, until commercially approved.

### 4.2 Technician
Technician pays for **visibility, tools, credibility, and opportunities**.

Candidate benefits:
- improved visibility
- featured placement where approved
- larger portfolio/service presentation
- statistics/insights
- verification/premium badge if policy permits
- priority support

Critical wording rule:
A plan may improve visibility or access to opportunities, but the product must not claim that a subscription guarantees a specific number of customers or revenue.

### 4.3 Merchant
Merchant pays for **commercial visibility and marketplace capabilities**.

Candidate benefits:
- enhanced product/catalog presence
- priority visibility
- analytics
- promotional tools
- verified badge where approved
- priority support

Exact marketplace benefits require explicit product confirmation because the signed agreement does not fully specify merchant transaction mechanics.

---

## 5. Entitlement model

Each entitlement has a stable technical key.

Suggested keys:

```text
priority_support
featured_visibility
advanced_search
analytics_basic
analytics_advanced
portfolio_extended
catalog_extended
promotional_tools
verified_badge
premium_offers
advanced_ai_access
```

Only approved entitlements should be activated.

---

## 6. Limits

Entitlements may have:
- boolean access
- numeric limit
- percentage/priority weight
- quota per period

Examples:

```text
portfolio_items_limit = 10
catalog_products_limit = 100
featured_slots = 1
```

Do not encode these limits in UI components.

---

## 7. Effective subscription

A user may have only one effective active plan per role unless a future billing architecture explicitly supports stacking.

Effective entitlement calculation:

```text
eligible role
 + active subscription status
 + current billing period
 + plan entitlements
 = effective access
```

---

## 8. Subscription lifecycle

Canonical statuses:

```text
pending
trialing
active
past_due
cancelled
expired
```

Rules:
- Expired subscriptions lose paid entitlements at the defined expiration point.
- Cancelled may mean “cancel renewal” while access remains active until period end.
- Payment failure rules must be explicit before production billing launch.

---

## 9. Upgrade

Typical behavior:

```text
Basic → Platinum
Basic → VIP
Platinum → VIP
```

The product must clearly explain when the new benefits activate.

If provider billing requires proration, the server/payment provider is authoritative.

---

## 10. Downgrade

Typical behavior:

```text
VIP → Platinum
Platinum → Basic
```

Downgrade semantics must be explicit:
- immediate, or
- end of current billing period.

Do not improvise this in the client.

---

## 11. Cancellation

Cancellation should be designed as cancellation of renewal unless the business explicitly requires immediate termination.

Users should see:
- current plan
- renewal date
- access end date if known
- consequences of cancellation

---

## 12. Payment model

Payment provider is not specified by the signed agreement.

The architecture must isolate provider-specific code.

Never:
- trust client “payment success” flags,
- store raw card data,
- activate paid entitlements before verified payment success.

---

## 13. Feature gating

### Client
May hide or explain unavailable features.

### Server
Must enforce entitlement.

Example:

```text
if !can(user, "featured_visibility")
    reject feature action
```

The frontend being visually hidden is never considered security.

---

## 14. Subscription page UX

The page should contain:

1. Current plan.
2. Billing period.
3. Key benefits.
4. Compare plans.
5. Upgrade CTA.
6. Renewal/cancellation status.
7. Support/help path.

Avoid overwhelming users with dozens of benefits.

---

## 15. Commercial safety

The product team must not:
- advertise guaranteed jobs,
- invent guaranteed savings,
- show fake discount percentages,
- claim verified benefits that the backend does not enforce.

---

## 16. MVP recommendation

For a fast first release, prioritize a small set of high-value entitlements rather than many weak ones.

Suggested first implementation:

### Customer
- priority support
- premium offer access
- selected premium convenience feature(s)

### Technician
- featured visibility
- expanded portfolio
- basic analytics
- priority support

### Merchant
- enhanced visibility
- catalog allowance
- basic analytics
- priority support

These remain a **proposal pending final commercial approval**.

---

## 17. Admin control

Admins should be able to:
- activate/deactivate plans
- change price
- edit plan display name/description
- attach/detach entitlements
- change limits
- view active subscriptions
- handle exceptional subscription status where authorized

Changes should be audited.

---

## 18. Data consistency

Subscription display must always reconcile with the backend effective state.

Never let the client “remember” a paid plan longer than the server says it is active.

---

## 19. Subscription Definition of Done

Subscription functionality is complete only when:
- plan list loads from backend
- role filtering works
- entitlement calculation works
- paid actions are protected server-side
- renewal/expiry semantics are defined
- failure states exist
- admin can manage the data where intended
- analytics can distinguish plan and conversion events

# الخبير — Product Specification

**Path:** `docs/02_PRODUCT.md`
**Version:** 1.0
**Status:** Authoritative product baseline

---

## 1. Product thesis

**الخبير** is a specialized home-appliance service platform focused on maintenance and repair for:

- Washing machines
- Refrigerators
- Air conditioners

The app uses a single mobile application with role-aware experiences for:

- Customer
- Technician
- Merchant

The platform’s core value is to reduce the friction from **“my appliance has a problem”** to **“I found the right person to help me”**.

---

## 2. Product principles

1. **Specialization over breadth:** stay focused on home appliances.
2. **Trust before conversion:** profiles, verification, ratings, guarantees, and transparent information matter.
3. **Diagnose before dispatch when useful:** Fault Guide should reduce uncertainty.
4. **One app, role-based experience:** do not create three separate apps for the three roles.
5. **Subscription value must be tangible:** every paid plan must expose real, enforceable benefits.
6. **No fake outcomes:** do not promise that a subscription guarantees customers or revenue unless the business explicitly approves such a claim.
7. **Mobile-first:** core customer, technician, and merchant workflows belong in the mobile app.
8. **Admin control:** operational content and user management must not require source-code changes when the intended product design expects admin control.

---

## 3. Core product modules

### 3.1 Onboarding
Purpose: explain the product value quickly and establish the premium/trustworthy visual identity.

Approved direction:
- Appliance-focused imagery.
- Minimal copy.
- Navigation to role selection.

### 3.2 Account Role Selection
The user chooses one of:
- Customer
- Technician
- Merchant

The selected role determines downstream onboarding, permissions, dashboards, and features.

### 3.3 Authentication
Supported baseline:
- Login
- Registration
- Session management
- Password recovery
- Role-aware account state

Social login may only be implemented if included in the approved technical scope.

### 3.4 Customer Home
Primary jobs:
- Search for service/appliance/technician.
- Reach Fault Guide.
- Discover appliance categories.
- Discover trusted technicians.
- Access orders, favorites, account, and service request action.

### 3.5 Fault Guide
The Fault Guide is a core differentiator.

Minimum conceptual flow:

```text
Choose Appliance
      ↓
Choose Fault / Symptom
      ↓
Show fault guidance
      ↓
Optional next step: Find a Technician
```

For each fault article/diagnostic item, content may include:
- Symptom
- Likely cause(s)
- Safe/basic checks
- When a technician is needed
- Relevant appliance/service category

Do not provide hazardous repair instructions or instructions requiring specialized electrical/mechanical intervention unless separately reviewed and approved.

### 3.6 Technician Search
Search dimensions may include:
- Appliance category
- Service/specialty
- Problem/symptom when known
- Location/distance
- Rating
- Availability
- Price, if the business model exposes price before booking

The UI should communicate why a technician is shown, not only who is shown.

### 3.7 Technician Profile
The profile should build trust through:
- Name
- Role/specialty
- Verification state
- Rating/review count
- Experience
- Completed services when available
- Services offered
- Portfolio/media when approved
- Availability
- Relevant guarantees/benefits
- CTA: Request Service

### 3.8 Service Request
Core customer flow:
1. Appliance
2. Problem
3. Problem description
4. Optional photos
5. Location
6. Appointment/date/time, if scheduling is enabled
7. Review summary
8. Confirm request

### 3.9 Order Tracking
Order states must be system-controlled. Example conceptual states:
- Pending
- Contacted
- On the way
- In progress
- Completed
- Cancelled

Actual statuses must remain centralized in `06_DATABASE.md` and `07_API.md`.

### 3.10 Technician Chat
Chat is opened as a **dismissible dialog** from the tracking/request context rather than forcing a full-page navigation when the intended UX is contextual communication.

Requirements:
- Close/dismiss
- Conversation history
- Message composer
- Attachment control only when technically and operationally approved
- Delivery/read semantics only if implemented
- Abuse/reporting path if required

### 3.11 Service Rating
After completion:
- 1–5 star rating
- Optional structured feedback tags
- Optional comment
- Problem solved? Yes/No

The outcome can influence:
- Technician profile
- Search ranking signals
- Trust indicators

### 3.12 Notifications
Baseline notification concepts:
- Service request status changes
- Technician contact/arrival updates
- Subscription events
- Important platform messages

Notification preferences should be role-aware where needed.

### 3.13 Subscriptions
Three conceptual plan tiers are used across roles:
- عادي
- Platinum
- VIP

Exact prices, entitlements, limits, and billing rules must be treated as configurable product data, not hard-coded UI text.

### 3.14 Merchant / Marketplace
The merchant side exists within the platform, but the scope is intentionally limited to the business-approved appliance-related marketplace experience.

Do not expand into a generic marketplace for arbitrary categories without explicit scope approval.

### 3.15 News / Banner / Community / AI
These concepts appear in the product planning notes and are considered part of the broader platform direction. Their exact MVP depth is not sufficiently specified to allow the AI agent to invent full implementations.

Implementation rule:
- UI shell may be prepared when approved.
- Business behavior, data model, moderation, AI prompts, or complex flows require explicit product acceptance.

---

## 4. Customer product requirements

### P0 — Must have for MVP core
- Onboarding
- Role selection
- Login/Register
- Home
- Fault Guide
- Technician Search
- Technician Profile
- Service Request
- Order Confirmation
- Order Tracking
- Technician Chat Dialog
- Service Rating
- Basic subscriptions/entitlements if part of first commercial release

### P1 — Important but can be staged
- Advanced search/filtering
- Favorites
- Rich notification center
- Expanded merchant marketplace capabilities
- Enhanced analytics

### P2 — Requires explicit scope approval
- Deep AI diagnosis
- Community social graph
- Complex marketplace checkout/fulfillment
- Loyalty/rewards
- Advanced promotional engine

---

## 5. Technician product requirements

Minimum technician experience:

1. Role-aware onboarding
2. Profile creation
3. Appliance/service specialties
4. Verification status
5. Incoming service requests
6. Request detail
7. Accept/reject workflow, if approved
8. Status update workflow
9. Chat with customer
10. Completion workflow
11. Ratings visibility
12. Subscription management
13. Account settings

Technician features that affect ranking/visibility must be governed by entitlement rules from `08_SUBSCRIPTIONS.md`.

---

## 6. Merchant product requirements

Minimum merchant experience must support the agreed commercial purpose without broadening the marketplace.

Potentially includes, subject to detailed approval:
- Merchant profile
- Product/catalog presence
- Product management
- Subscription plan
- Merchant status/verification
- Order inquiries or marketplace orders if the business confirms that flow

The exact merchant transaction flow is intentionally not invented here because the signed agreement only establishes a product store/marketplace at a high level.

---

## 7. Trust model

The product should use consistent trust signals:
- Verified badge
- Rating
- Review count
- Experience
- Completed service count when real data exists
- Availability
- Clear service description
- Relevant guarantees only when actually enforceable

Fake ratings, fake completed service counts, or fake verification must never be used in production.

Seed/demo data is allowed only in explicitly labeled development environments.

---

## 8. Business model baseline

Revenue model:

```text
Customer subscription
Technician subscription
Merchant subscription
        ↓
Subscription revenue
```

Each role may see different plan entitlements.

The product must avoid a one-size-fits-all subscription experience because the value proposition is different for each role.

---

## 9. Product metrics

At minimum, the product should be instrumentable for:

- Registration completion rate
- Role selection distribution
- Fault Guide usage
- Technician search usage
- Technician profile views
- Service request creation rate
- Request completion rate
- Cancellation rate
- Rating completion rate
- Subscription conversion rate
- Plan upgrade/downgrade rate
- Merchant activation rate

Analytics implementation details belong in architecture documentation and must respect privacy and security requirements.

---

## 10. Acceptance principle

A product decision is “confirmed” only when one of the following exists:
- explicit founder/CTO written approval,
- approved design/specification,
- signed contractual requirement.

A model-generated idea, handwritten brainstorming note, or unapproved mockup is not by itself permission to expand scope.

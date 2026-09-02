# الخبير — User Flows

**Path:** `docs/03_USER_FLOWS.md`
**Version:** 1.0
**Status:** Authoritative interaction baseline

---

## 1. Flow notation

- **P0:** critical MVP path
- **P1:** important supporting path
- **P2:** optional/phase feature
- **CTA:** primary action
- **Role:** Customer / Technician / Merchant / Admin

Every flow must define:
- Entry point
- Preconditions
- Steps
- Success state
- Failure state
- Permissions
- Exit/back behavior

---

## 2. Global app flow

```text
Launch
 ↓
Splash
 ↓
Onboarding
 ↓
Select Account Type
 ├── Customer
 ├── Technician
 └── Merchant
 ↓
Login / Register
 ↓
Role Dashboard
```

Existing authenticated users should bypass onboarding/login when a valid session exists, subject to session policy.

---

## 3. Onboarding flow — P0

```text
Onboarding 1
 ↓
Onboarding 2
 ↓
Account Role Selection
```

Rules:
- “Skip” behavior must be consistent.
- Returning users should not be forced through onboarding again unless reset.
- Onboarding is explanatory, not a data collection form.

---

## 4. Account selection flow — P0

Screen title:
**اختر نوع حسابك**

Roles:
- عميل
- فني
- تاجر

Interaction:
1. Tap role card.
2. Selected state becomes visually explicit.
3. Tap login or registration CTA.
4. Selected role is preserved as part of the intended account journey.

Security rule:
Role selection in the UI is not enough. Backend must validate actual account role on every protected request.

---

## 5. Login flow — P0

```text
Select Role
 ↓
Phone / Credential Input
 ↓
Password / OTP depending on approved auth design
 ↓
Validate
 ├── Success → Role Dashboard
 └── Failure → Inline error
```

Do not allow a customer UI to act as a technician merely because a role button was manipulated client-side.

---

## 6. Customer Home flow — P0

Primary areas:
- Location/context
- Search
- Fault Guide entry
- Appliance categories
- Trusted technicians
- Service request CTA
- Orders
- Favorites
- Account

Primary intended customer actions:

### A. Fault-first path
```text
Home
 ↓
دليل الأعطال
 ↓
Choose Appliance
 ↓
Choose Fault
 ↓
Read Guidance
 ↓
Find Technician (optional)
```

### B. Technician-first path
```text
Home
 ↓
Search / Find Technician
 ↓
Filters
 ↓
Technician List
 ↓
Technician Profile
 ↓
Request Service
```

---

## 7. Fault Guide flow — P0

```text
Fault Guide
 ↓
Choose Appliance
 ├── Washing Machine
 ├── Refrigerator
 └── Air Conditioner
 ↓
Choose Symptom
 ↓
Fault Result
 ├── Likely Cause
 ├── Safe/basic checks
 ├── When to call a technician
 └── Find Technician
```

Rules:
- Fault content comes from managed data/content sources.
- Do not hard-code long diagnostic content directly in screen components.
- Avoid unsafe instructions.
- If content is missing, show a useful empty state rather than fabricated diagnosis.

---

## 8. Technician search flow — P0

```text
Search
 ↓
Optional appliance/problem context
 ↓
Filter
 ├── Distance
 ├── Rating
 ├── Availability
 └── Other approved filters
 ↓
Results
 ↓
Open Profile
```

A selected filter must persist visually and in query state until cleared.

If no results:
- Explain the absence.
- Offer to widen the search or change filters.
- Do not fabricate experts.

---

## 9. Technician profile flow — P0

```text
Technician Search
 ↓
Technician Profile
 ├── Verification
 ├── Rating
 ├── Experience
 ├── Services
 ├── Portfolio (if enabled)
 ├── Reviews
 └── Guarantees (if applicable)
 ↓
Request Service
```

CTA remains accessible during the profile experience when the UX is approved for sticky action behavior.

---

## 10. Service request flow — P0

```text
Technician Profile
 ↓
Request Service
 ↓
Select Appliance
 ↓
Select Problem
 ↓
Problem Description
 ↓
Optional Photos
 ↓
Location
 ↓
Appointment (if enabled)
 ↓
Review Summary
 ↓
Confirm Request
```

Validation:
- Appliance is required.
- Problem is required unless “Other” is supported with description.
- Location must be valid when a location-dependent service is required.
- Appointment must comply with available slots when scheduling is enabled.

---

## 11. Order confirmation flow — P0

```text
Request Form
 ↓
Confirm Screen
 ↓
Confirm Service Request
 ↓
Success State
 ↓
Order Tracking
```

The confirmation screen must show the user’s final data before submission, including:
- Technician
- Service
- Appliance
- Problem
- Location
- Appointment
- Price/estimate semantics if applicable

No hidden changes between summary and final submission.

---

## 12. Order tracking flow — P0

```text
Tracking
 ├── Current Status
 ├── Technician
 ├── Service Details
 ├── Location/ETA when supported
 ├── Chat
 ├── Call/Profile actions
 └── Completion
```

The state tracker must use backend order state, not a locally invented timer or progress bar.

---

## 13. Chat dialog flow — P0

Chat opens as a dismissible overlay/dialog from the service context.

```text
Tracking / Technician Context
 ↓
Open Chat Dialog
 ↓
Read history / compose message
 ↓
Send
 ↓
Dismiss
```

Rules:
- Chat dialog can close without losing the order context.
- Conversation should retain scroll position when practical.
- The user must be able to return to tracking instantly.
- Message permissions depend on the related service/order relationship.

---

## 14. Service completion & rating — P0

```text
Order Status = Completed
 ↓
Rating Screen
 ↓
5-star rating
 ↓
Optional structured reasons
 ↓
Optional comment
 ↓
Problem solved? Yes/No
 ↓
Submit
 ↓
Success
```

A user should not be allowed to submit multiple ratings for the same service unless the business explicitly supports editing/re-rating.

---

## 15. Customer subscription flow — P1/P0 depending on launch

```text
Account / Subscription Entry
 ↓
Plans
 ├── عادي
 ├── Platinum
 └── VIP
 ↓
Compare entitlements
 ↓
Select plan
 ↓
Payment/activation according to approved billing
 ↓
Active subscription
```

Entitlements must be enforced server-side.

---

## 16. Technician flow — P0/P1

```text
Technician onboarding
 ↓
Profile setup
 ↓
Select specialties/services
 ↓
Verification state
 ↓
Technician dashboard
 ├── Incoming Requests
 ├── Active Jobs
 ├── Completed Jobs
 ├── Ratings
 ├── Subscription
 └── Account
```

### Request handling
```text
Incoming Request
 ↓
Open Request
 ├── Accept
 ├── Reject (if approved)
 └── Ask/Chat
 ↓
Update status
 ↓
Complete
```

Technician cannot mutate customer data outside permitted fields.

---

## 17. Merchant flow — P0/P1

```text
Merchant onboarding
 ↓
Merchant profile
 ↓
Subscription
 ↓
Merchant workspace
 ├── Catalog/Products (if enabled)
 ├── Orders/Requests (if enabled)
 ├── Visibility
 └── Account
```

Because the detailed merchant transaction model is not fully specified in the signed agreement, the coding agent must not invent a full checkout/settlement system without approval.

---

## 18. Admin flow

```text
Admin login
 ↓
Dashboard
 ├── Users
 ├── Technicians
 ├── Merchants
 ├── Appliances
 ├── Fault Guide
 ├── Services
 ├── Requests/Orders
 ├── Reviews
 ├── Subscriptions
 ├── Notifications
 └── Content/Settings
```

See `09_ADMIN.md`.

---

## 19. Global error flows

Every critical flow needs at least:

### Network failure
- Preserve user input where safe.
- Show actionable retry.

### Validation failure
- Inline field-level feedback.
- Never silently discard values.

### Authorization failure
- Explain insufficient permission.
- Do not expose hidden data.

### Session expiry
- Prompt for re-authentication.
- Preserve intended navigation when safe.

### Empty state
- Explain why the state is empty.
- Offer next action.

---

## 20. Back behavior

Back navigation must obey platform expectations and must never unexpectedly:
- submit forms,
- duplicate requests,
- clear unsaved data without warning,
- exit an active critical flow without confirmation.

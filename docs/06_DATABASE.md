# الخبير — Database Specification

**Path:** `docs/06_DATABASE.md`
**Version:** 1.0
**Status:** Logical schema source of truth

---

## 1. Database objective

The schema must support the three business roles, appliance domain, Fault Guide, technician discovery, service requests/orders, chat, ratings, subscriptions, merchant capability, notifications, and Admin operations without duplicating core identity data.

The definitions below are logical and vendor-neutral. The implementation must map them to the selected database technology with migrations.

---

## 2. Identity model

### users

Core account record.

Suggested fields:

```text
id
phone/email identifier as approved
password_hash or external_auth_reference
role ENUM(customer, technician, merchant)
status ENUM(active, suspended, pending, deleted)
created_at
updated_at
last_login_at
```

Rules:
- One primary application role per account.
- Role is authoritative on the server.
- Soft deletion/anonymization strategy must be defined before production if required.

---

## 3. Customer profile

### customer_profiles

```text
id
user_id FK users.id UNIQUE
first_name
last_name
avatar_url
preferred_location_id nullable
created_at
updated_at
```

Customer-owned personal data must be protected.

---

## 4. Technician profile

### technician_profiles

```text
id
user_id FK users.id UNIQUE
display_name
bio
avatar_url
verification_status
experience_years
completed_services_count
rating_average
rating_count
availability_status
created_at
updated_at
```

Derived metrics such as rating_average should not be freely client-controlled.

---

## 5. Merchant profile

### merchant_profiles

```text
id
user_id FK users.id UNIQUE
business_name
bio
logo_url
verification_status
contact_phone
location_id nullable
created_at
updated_at
```

---

## 6. Location model

### locations

```text
id
label
address_text
city
region
country
latitude
longitude
created_at
updated_at
```

Use a privacy-conscious strategy for customer locations. Store exact coordinates only when required.

---

## 7. Appliances

### appliance_categories

Canonical baseline:
- washing_machine
- refrigerator
- air_conditioner

Suggested fields:

```text
id
name_ar
slug
icon_url/image_url
is_active
sort_order
created_at
updated_at
```

### appliance_models (optional)

Use only if model-level tracking is approved.

```text
id
appliance_category_id FK
brand_name
model_name
metadata_json
is_active
```

Do not add model complexity if MVP does not need it.

---

## 8. Fault Guide

### faults

```text
id
appliance_category_id FK
name_ar
slug
severity_level nullable
summary_ar
guidance_ar
safety_note_ar nullable
when_to_call_technician_ar nullable
publish_status ENUM(draft, review, published, archived)
sort_order
created_at
updated_at
```

Publishing workflow (Task 10B CTO decision 1, aligned with 09_ADMIN.md §8):

- `publish_status` is the authoritative publication state:
  `draft → review → published → archived`.
- There is NO independent `is_active` column on this table.
  "Active/published" is derived from `publish_status = 'published'`.
- The mobile Fault Guide consumes `published` content only.

Where the original spec listed `is_active`, it is superseded by
`publish_status` per the Task 10B CTO decision.

### fault_service_links

```text
fault_id FK
service_id FK
```

Used to connect a fault to relevant technician service categories.

---

## 9. Services

### services

```text
id
appliance_category_id FK
name_ar
slug
description_ar
is_active
sort_order
created_at
updated_at
```

### technician_services

```text
technician_id FK technician_profiles.id
service_id FK services.id
price_from nullable
is_active
```

Price data must follow the business’s approved pricing semantics.

---

## 10. Technician visibility and verification

Do not store “VIP technician” as a hard-coded permanent property if it is actually a subscription entitlement.

Use:
- subscription plan
- entitlement calculation
- verification status
- ranking signals

Visibility order must be computed from policy and business rules, not from arbitrary UI flags.

---

## 11. Service requests / orders

### service_requests

Logical fields:

```text
id
customer_id FK users.id
technician_id FK technician_profiles.id
appliance_category_id FK
service_id FK nullable
fault_id FK nullable
status ENUM
problem_title
problem_description
location_id FK
scheduled_at nullable
estimated_price_from nullable
estimated_price_to nullable
final_price nullable
created_at
accepted_at nullable
started_at nullable
completed_at nullable
cancelled_at nullable
updated_at
```

---

## 12. Order status history

### service_request_status_history

```text
id
service_request_id FK
from_status
 to_status
changed_by_user_id FK
note nullable
created_at
```

Every significant status transition should be auditable.

---

## 13. Service request photos

### service_request_media

```text
id
service_request_id FK
uploaded_by_user_id FK
storage_key
mime_type
file_size
created_at
```

Never store the entire binary file in the main relational record unless the architecture intentionally supports it.

---

## 14. Reviews

### reviews

```text
id
service_request_id FK UNIQUE unless multiple review policy is approved
customer_id FK
technician_id FK
rating INT 1..5
comment nullable
problem_resolved BOOLEAN nullable
created_at
updated_at
```

### review_tags

Structured feedback examples:
- سرعة الاستجابة
- الالتزام بالموعد
- جودة الإصلاح
- حسن التعامل
- سعر مناسب

Tags must be configured, not hard-coded into business logic.

---

## 15. Chat

### conversations

```text
id
service_request_id FK
created_at
updated_at
closed_at nullable
```

### conversation_participants

```text
conversation_id FK
user_id FK
role_snapshot nullable
joined_at
```

### messages

```text
id
conversation_id FK
sender_user_id FK
message_type ENUM(text, image, file, system)
body nullable
created_at
read_at nullable
```

Use an attachment table if attachments are supported.

---

## 16. Favorites

### favorites

Generic structure is allowed only if ownership is clear.

At minimum:

```text
id
user_id FK
technician_id nullable
merchant_id nullable
created_at
```

If the database benefits from stricter typed relations, use separate favorite tables.

---

## 17. Subscription plans

### subscription_plans

```text
id
role ENUM(customer, technician, merchant)
code
name_ar
name_en nullable
billing_interval
price
currency
is_active
sort_order
created_at
updated_at
```

Canonical product tiers:
- ordinary/basic = `basic` / “عادي”
- platinum = `platinum` / “Platinum”
- vip = `vip` / “VIP”

Exact pricing is configurable and not hard-coded.

---

## 18. Entitlements

### entitlements

```text
id
code
name_ar
description_ar
feature_group
is_active
```

### plan_entitlements

```text
plan_id FK
entitlement_id FK
limit_value nullable
metadata_json nullable
```

This lets a plan grant:
- visibility
- support level
- catalog limits
- analytics
- other approved benefits

without rewriting business code.

---

## 19. User subscriptions

### subscriptions

```text
id
user_id FK
plan_id FK
status ENUM(active, trialing, past_due, cancelled, expired, pending)
started_at
current_period_start
current_period_end
cancelled_at nullable
renewal_enabled
provider_reference nullable
created_at
updated_at
```

---

## 20. Payment transactions

### payment_transactions

Only implement if a payment provider is part of the approved release.

```text
id
subscription_id nullable
user_id FK
provider
provider_transaction_id
amount
currency
status
metadata_json
created_at
updated_at
```

Never store raw card credentials.

---

## 21. Merchant products / marketplace

### products

Logical baseline:

```text
id
merchant_id FK merchant_profiles.id
name_ar
slug
description_ar
price nullable
stock_quantity nullable
image_url nullable
status
created_at
updated_at
```

### product_categories

Only appliance-related categories approved for the product.

### marketplace_orders (optional)

This entity must not be activated in the MVP unless the merchant purchase flow is explicitly confirmed.

---

## 22. Notifications

### notifications

```text
id
user_id FK
type
title_ar
body_ar
data_json
read_at nullable
created_at
```

---

## 23. Admin audit log

### audit_logs

```text
id
actor_user_id FK nullable
entity_type
entity_id
action
before_json nullable
after_json nullable
created_at
```

Sensitive data should not be dumped into audit logs unnecessarily.

---

## 24. Indexing baseline

Index at minimum:
- users.role
- users.status
- technician_profiles.verification_status
- technician_profiles.rating_average
- technician_profiles.availability_status
- service_requests.customer_id
- service_requests.technician_id
- service_requests.status
- service_requests.created_at
- reviews.technician_id
- messages.conversation_id + created_at
- subscriptions.user_id + status
- products.merchant_id + status

Location search may require geospatial indexes depending on database.

---

## 25. Data ownership rules

### Customer
Can read/write only customer-owned fields and resources.

### Technician
Can read/write only technician-owned profile/service resources and authorized service-request transitions.

### Merchant
Can read/write only merchant-owned business resources.

### Admin
Access is policy-controlled and audited.

---

## 26. Migration rules

Every schema change must be:
- backward-aware when needed,
- represented as migration code,
- tested,
- deployable in sequence.

Do not make destructive schema changes during an unrelated feature.

---

## 27. Data integrity rules

- Use foreign keys where supported.
- Use uniqueness constraints for identities and one-per-order relationships.
- Validate enum transitions.
- Do not trust client-calculated totals.
- Do not trust client-provided ratings or derived metrics.

---

## 28. Privacy rules

Minimum principle:
**collect only what the feature needs.**

Customer location, phone, messages, and service information are sensitive operational data and must have controlled access.

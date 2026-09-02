# الخبير — Technical Architecture

**Path:** `docs/05_TECH_ARCHITECTURE.md`
**Version:** 1.0
**Status:** Architecture baseline

---

## 1. Architectural objective

Build a maintainable, secure, modular platform that can be implemented rapidly without creating technical debt that blocks the next phase.

The architecture must support:
- One multi-role mobile app
- Landing Page
- Backend/API
- Database
- Admin Dashboard
- Notifications
- Subscription entitlements
- Fault Guide content
- Technician search and profiles
- Service requests/orders
- Chat
- Ratings
- Merchant presence

---

## 2. Stack policy

**Critical rule:** the signed commercial scope does not dictate a specific framework or cloud provider.

The coding agent must:
1. Inspect the existing repository.
2. Preserve the existing stable stack whenever practical.
3. Avoid framework migration during MVP unless explicitly approved.
4. Document any architectural change.

If the existing repository is greenfield and stack selection is required, the CTO chooses the stack and records the decision here before implementation.

Recommended selection criteria:
- Strong Arabic/RTL support
- Mobile capability
- Mature auth/session libraries
- Typed API/data validation
- Production-grade database migrations
- Efficient local AI-assisted development
- Good testing ecosystem
- Low operational complexity for MVP

---

## 3. Logical architecture

```text
┌─────────────────────────────────────┐
│        Client Applications           │
│  Mobile App | Landing | Admin Web    │
└──────────────────┬──────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────┐
│              API Layer               │
│ Auth | Users | Faults | Search       │
│ Requests | Orders | Chat | Reviews   │
│ Subscriptions | Merchants | Admin    │
└──────────────────┬──────────────────┘
                   ▼
┌─────────────────────────────────────┐
│         Application Services         │
│ Role policy | Entitlements           │
│ Matching | Notifications | Rules     │
└──────────────────┬──────────────────┘
                   ▼
┌─────────────────────────────────────┐
│          Persistence Layer           │
│ Database | Object Storage | Cache    │
└─────────────────────────────────────┘
```

---

## 4. Modular boundaries

Suggested backend/application modules:

```text
/auth
/users
/customers
/technicians
/merchants
/appliances
/fault-guide
/services
/search
/service-requests
/orders
/chat
/reviews
/subscriptions
/notifications
/marketplace
/admin
/analytics
```

The actual folder names must follow the existing repository conventions if they already exist.

---

## 5. Role and permission architecture

Three user roles:

```text
customer
technician
merchant
```

Admin permissions are separate.

Never trust:
- hidden buttons,
- client route guards alone,
- user-provided role fields,
- local storage flags

Backend must enforce authorization.

---

## 6. Authentication

Requirements:
- Secure credential handling
- Short-lived access tokens/session strategy appropriate to stack
- Refresh/session mechanism when required
- Password hashing by a vetted library
- Rate limiting on auth-sensitive endpoints
- Account lock/abuse strategy appropriate to deployment

No plaintext passwords.

---

## 7. Authorization

Authorization should be policy-based where practical.

Examples:

```text
Customer → can create own service requests
Customer → can view own orders
Technician → can view assigned/eligible requests
Technician → can update allowed service states
Merchant → can manage own merchant resources
Admin → can manage platform resources according to admin permission
```

Ownership checks are mandatory.

---

## 8. Subscription entitlement architecture

Use a central policy:

```text
User
 ↓
Role
 ↓
Active Subscription
 ↓
Plan
 ↓
Entitlements
 ↓
Feature Access
```

Do not duplicate subscription rules across every screen.

Example conceptual check:

```text
can(user, "advanced_search")
can(user, "featured_visibility")
can(user, "priority_support")
```

Actual entitlement keys live in `08_SUBSCRIPTIONS.md`.

---

## 9. Search architecture

Search must support a consistent query model across:
- technician search
- appliance/fault content search
- merchant/product search when enabled

Search should be server-backed for authoritative filtering and pagination.

Avoid fetching the entire dataset to the mobile client and filtering locally.

---

## 10. Service request/order architecture

The order lifecycle must be represented as a domain state machine or equivalent controlled transitions.

Client must not be able to arbitrarily set:

```text
status = completed
```

Instead, transition endpoints/services validate:
- current state
- actor role
- ownership/assignment
- allowed next state

---

## 11. Chat architecture

Chat must be associated with a business context such as a service request/order.

Rules:
- Users only see threads they are authorized to see.
- Messages are immutable after send unless a documented edit/delete model exists.
- Attachment uploads are validated and access-controlled.
- Rate limits apply.

---

## 12. Fault Guide architecture

Fault content should be data-driven.

Entities include:
- Appliance category
- Fault/symptom
- Guidance content
- Related service/specialty

Content should be manageable from Admin where appropriate.

---

## 13. Merchant architecture

Merchant resources must be tenant-like: a merchant can only mutate its own data.

Marketplace implementation should remain bounded to the appliance ecosystem approved by the product.

Do not introduce a generalized seller marketplace engine unless explicitly approved.

---

## 14. Notifications

Abstract notification delivery behind a service interface:

```text
NotificationService
 ├── in-app
 ├── push
 └── email/SMS when approved
```

The business event should not be tightly coupled to one delivery channel.

---

## 15. File/media handling

All uploads must define:
- allowed MIME types
- max size
- storage location
- access policy
- retention/deletion behavior

User-uploaded photos must never be publicly accessible by default unless public access is explicitly intended.

---

## 16. Database architecture

Use migrations and controlled schema changes.

Never modify production tables manually without a migration or documented controlled procedure.

See `06_DATABASE.md`.

---

## 17. API architecture

Use consistent API conventions:
- versioning strategy
- resource-oriented routes
- consistent errors
- pagination
- validation
- authentication
- authorization

See `07_API.md`.

---

## 18. Environment separation

At minimum:

```text
local/development
staging
production
```

Production secrets must never live in source control.

---

## 19. Configuration management

Use environment configuration for:
- API URLs
- database URLs
- storage credentials
- push provider credentials
- payment provider keys
- AI provider keys

The codebase may reference environment variables, never secret values.

---

## 20. Observability

Baseline:
- structured application logs
- error tracking
- request correlation when practical
- key business events
- health check

Do not log:
- passwords
- auth tokens
- private messages unnecessarily
- sensitive customer data without need

---

## 21. Performance baseline

Core goals:
- fast first screen
- paginated lists
- optimized images
- minimal over-fetching
- cache static/reference content where safe
- debounce search
- avoid unnecessary rerenders
- avoid blocking the UI on non-critical work

No performance optimization should compromise correctness of permissions or data.

---

## 22. Security baseline

Mandatory:
- input validation
- output encoding where needed
- authorization on every protected resource
- secure file uploads
- rate limiting on abuse-prone endpoints
- secret management
- dependency patching
- secure cookies/tokens where applicable
- SQL/NoSQL injection protections through vetted abstractions

Security-sensitive changes require CTO review.

---

## 23. Testing architecture

Required layers:

1. Unit tests for critical pure logic.
2. API/service tests for permissions and state transitions.
3. Integration tests for core workflows.
4. UI/component tests for reusable critical components where practical.
5. Manual device QA for the main customer journey.

---

## 24. Deployment baseline

Deployment must include:
- build artifact
- environment configuration
- database migration step
- health verification
- rollback plan

Never deploy an untested schema change directly to production.

---

## 25. Git policy

Suggested:

```text
main        = production-ready
feature/*   = isolated work
fix/*       = bug fixes
```

Commits should be small and meaningful.

Avoid giant commits that mix:
- feature work
- refactoring
- formatting
- dependency migration

---

## 26. Architecture Decision Records

Any significant decision must be recorded, e.g.:

```text
ADR-001 Authentication strategy
ADR-002 Database choice
ADR-003 Mobile stack
ADR-004 Subscription entitlement model
```

The repository may store ADRs outside the 10 constitution files; the constitution files remain the baseline.

---

## 27. Architecture freeze rule

Once implementation starts:
- no broad framework migration,
- no database rewrite,
- no navigation rewrite,
- no authentication replacement,
unless the CTO explicitly approves it as a planned change.

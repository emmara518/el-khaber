# الخبير — Admin Dashboard

**Path:** `docs/09_ADMIN.md`
**Version:** 1.0
**Status:** Admin product baseline

---

## 1. Purpose

The Admin Dashboard is the operational control plane for **الخبير**.

Its job is not to reproduce every mobile screen; it is to control the data, users, content, policies, subscriptions, and operational states needed to run the platform.

---

## 2. Admin security

Admin access must be more strongly protected than regular user access.

Required:
- authenticated admin session
- explicit permissions
- audit logging for sensitive actions
- least privilege
- no shared generic admin account in production

---

## 3. Admin roles

Do not assume all admins have full power.

Recommended permission groups:

```text
super_admin
operations_admin
content_admin
support_admin
finance_admin (if billing needs it)
```

Whether these are separate users/roles is a deployment decision, but permissions must be explicit.

---

## 4. Admin dashboard home

At a glance:
- users count
- technicians count
- merchants count
- active service requests
- completed requests
- subscription metrics
- flagged/recent issues
- system health indicators where available

Avoid adding decorative metrics with no operational meaning.

---

## 5. User management

### Customer management
- Search
- View profile
- Account status
- Subscription
- Service history summary
- Support metadata

### Technician management
- Search/filter
- Verify/review verification state
- View services
- View ratings
- View request history
- Subscription
- Visibility status

### Merchant management
- Search/filter
- Verification
- Business data
- Catalog summary
- Subscription
- Visibility status

---

## 6. Verification

Technician and merchant verification must be an explicit state, not an arbitrary badge toggle.

Example:

```text
pending
verified
rejected
suspended
```

Admin actions should be audited.

---

## 7. Appliance management

Manage:
- appliance categories
- labels
- icons/images
- active/inactive state
- sorting

Primary baseline:
- غسالات
- ثلاجات
- تكييفات

Adding new categories requires product approval.

---

## 8. Fault Guide management

Admin can manage:
- fault title
- appliance category
- symptom
- guidance
- safety note
- when to call a technician
- related service
- publish status
- sort order

### Publishing workflow

```text
Draft
 ↓
Review
 ↓
Published
 ↓
Archived
```

The mobile app should consume published content only.

---

## 9. Service management

Admin manages:
- service categories
- appliance association
- labels
- active state
- sort order

Do not hard-code the service catalog in mobile UI.

---

## 10. Technician/service operations

Operational view should support:
- active requests
- statuses
- technician assignment
- cancellation context
- completion
- issue flags

Admin override actions must be limited and audited.

---

## 11. Review moderation

Admin can:
- inspect reviews
- flag/remove content when policy allows
- view complaint context
- audit moderation action

Never delete a review merely because it is negative unless platform policy/legal grounds allow removal.

---

## 12. Subscription management

Admin capabilities:
- view plans
- activate/deactivate plan
- edit pricing
- edit entitlements
- set limits
- view active subscriptions
- view payment state where available
- handle manual exceptions under controlled permission

All material changes are audited.

---

## 13. Merchant/Marketplace management

Admin can manage the approved marketplace surface:
- merchant status
- product categories
- product moderation
- featured content if enabled
- marketplace configuration

The Admin must not silently broaden the marketplace taxonomy beyond the approved product strategy.

---

## 14. Notifications

Admin may create operational notifications/announcements where approved.

Capabilities:
- target audience
- title/body
- channel
- scheduled send if enabled
- status
- audit

Do not send bulk notifications without an explicit target definition.

---

## 15. Content management

Potential content domains:
- onboarding copy
- banners
- Fault Guide content
- news/articles if enabled
- community moderation if enabled
- policy/help pages

News/Community/AI are not to be implemented as a full CMS beyond the approved MVP scope.

---

## 16. Reports

Minimum operational reports:
- user growth
- active technicians
- active merchants
- service request volume
- completion/cancellation rate
- subscription count
- subscription revenue if billing is integrated
- rating trends

Reports must be derived from actual data.

---

## 17. Audit log

Record:
- who did the action
- what entity
- what changed
- when
- relevant reason/comment when necessary

High-value examples:
- change plan price
- verify/suspend technician
- change merchant verification
- edit Fault Guide content
- override order status
- moderate review

---

## 18. Admin UX principles

- Data-dense but clear.
- Strong filters.
- Search first.
- Batch operations only where safe.
- Confirmation for destructive actions.
- Clear status badges.
- No hidden side effects.

---

## 19. Admin permissions matrix

| Action | Super Admin | Ops | Content | Support | Finance |
|---|---:|---:|---:|---:|---:|
| View users | ✅ | ✅ | — | ✅ | — |
| Suspend user | ✅ | ✅ | — | — | — |
| Verify technician | ✅ | ✅ | — | — | — |
| Edit Fault Guide | ✅ | — | ✅ | — | — |
| Manage reviews | ✅ | ✅ | ✅ | ✅ | — |
| Manage plans | ✅ | — | — | — | ✅ |
| View subscriptions | ✅ | ✅ | — | ✅ | ✅ |
| Change pricing | ✅ | — | — | — | ✅ |
| Override service status | ✅ | ✅ | — | — | — |
| View audit logs | ✅ | limited | limited | limited | limited |

These are recommended permission boundaries and can be adjusted by CTO/business owners.

---

## 20. Admin Definition of Done

- Every admin route protected.
- Role permissions enforced server-side.
- Critical mutations audited.
- Lists paginated.
- Search/filter works.
- Destructive actions confirmed.
- Empty/loading/error states exist.
- Admin cannot accidentally operate on the wrong tenant/user/resource.

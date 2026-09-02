# الخبير — Engineering Rules & AI Coding Constitution

**Path:** `docs/10_ENGINEERING_RULES.md`
**Version:** 1.0
**Status:** NON-NEGOTIABLE engineering rules

---

# 0. The rule above all rules

**Do not break the constitution to make a feature appear finished.**

Correctness, security, permissions, data integrity, and scope discipline are more important than speed.

---

# 1. Mandatory reading order for AI agents

Before coding any non-trivial task, read:

1. `01_PROJECT.md`
2. `02_PRODUCT.md`
3. `03_USER_FLOWS.md`
4. `04_UI_UX.md`
5. `05_TECH_ARCHITECTURE.md`
6. `06_DATABASE.md`
7. `07_API.md`
8. `08_SUBSCRIPTIONS.md` when billing/entitlements are relevant
9. `09_ADMIN.md` when admin behavior is relevant
10. `10_ENGINEERING_RULES.md`

The agent must only read the files relevant to the task deeply, but `10_ENGINEERING_RULES.md` is always mandatory.

---

# 2. Human roles

## 2.1 Founder / Product Owner

Owns:
- business priorities
- commercial decisions
- final feature priorities
- content/data availability
- business acceptance

Does not unilaterally bypass technical/security controls.

## 2.2 CTO

Owns:
- architecture
- technology choices
- technical quality
- security direction
- code standards
- technical roadmap
- production readiness
- technical team coordination
- architecture approval

## 2.3 Product / Business Analyst

Owns:
- requirements clarity
- user stories
- acceptance criteria
- backlog hygiene
- scope control

## 2.4 UI/UX

Owns:
- flows
- visual system
- screen specifications
- states
- accessibility baseline

## 2.5 Mobile Engineer

Owns:
- mobile UI
- client state
- API integration
- navigation
- device behavior

## 2.6 Backend Engineer

Owns:
- API
- domain rules
- database integration
- authorization
- business logic

## 2.7 QA

Owns:
- test plans
- regression
- acceptance verification
- bug evidence

## 2.8 DevOps / Release

Owns:
- CI/CD
- environments
- deployment
- secrets
- observability
- rollback

In a small team, one person can occupy multiple roles, but responsibilities must remain distinct.

---

# 3. AI agent role

The AI coding agent is an **implementation assistant, not the product owner**.

It may:
- inspect code
- propose plans
- implement approved tasks
- write tests
- refactor within scope
- update documentation

It may not:
- invent requirements
- redefine product roles
- silently change business economics
- change IP assumptions
- bypass authentication/authorization
- weaken security for convenience
- perform broad migrations without approval

---

# 4. Task intake protocol

Every task must begin with:

```text
TASK:
ROLE AFFECTED:
FLOW AFFECTED:
SCOPE:
FILES LIKELY TO CHANGE:
DEPENDENCIES:
RISK:
ACCEPTANCE CRITERIA:
```

If the task is ambiguous in a money/auth/data/IP/security area, stop and ask.

---

# 5. Task sizing

Use:

```text
XS = < 1 hour
S  = 1–3 hours
M  = 3–8 hours
L  = 1–2 days
XL = > 2 days; MUST be split
```

The size is an engineering estimate, not a contractual promise.

An XL task must be decomposed into smaller independently verifiable tasks.

---

# 6. Task priority

```text
P0 = blocks product/core flow/security/data integrity
P1 = important business capability
P2 = enhancement
P3 = nice-to-have
```

Rule:
**Do P0 before P1. Do P1 before P2.**

---

# 7. Mandatory workflow

Every implementation follows:

```text
READ
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
VERIFY
 ↓
DOCUMENT
 ↓
REPORT
```

---

# 8. No coding from screenshots alone

Screenshots define visual intent, not the full system contract.

Before implementing a screen, verify:
- flow
- data source
- permissions
- loading/error states
- backend support
- acceptance criteria

---

# 9. No speculative features

If a model thinks:
> “This would be useful…”

that is **not** permission to implement it.

Add it to a proposal/backlog instead.

---

# 10. Scope freeze

Once a sprint/task begins:
- do not sneak unrelated features into the same change,
- do not rewrite unrelated components,
- do not change architecture merely because a cleaner solution is tempting.

Necessary refactors are allowed only when directly required for the feature or to fix a blocking defect.

---

# 11. Existing code first

Before creating a new component/service/hook/helper:

1. Search for an existing equivalent.
2. Reuse it if it is valid.
3. Extend it if the behavior is shared.
4. Create new only when separation is justified.

Avoid duplicate abstractions.

---

# 12. Smallest safe change

Prefer the smallest change that fully satisfies the requirement.

Do not modify:
- unrelated files
- unrelated database tables
- unrelated APIs
- unrelated UI

unless the change is necessary and documented.

---

# 13. No hidden breaking changes

Never silently break:
- public API contracts
- database shape
- auth flow
- navigation
- existing data
- role permissions
- subscriptions

Breaking changes require explicit review.

---

# 14. Role security rules

The app has exactly three end-user roles:

```text
customer
technician
merchant
```

Role names must not drift to:
- center
- maintenance center
- seller
- provider
as replacements in core authorization logic.

Admin is separate.

---

# 15. Backend authority rule

The backend is authoritative for:
- identity
- roles
- permissions
- subscriptions
- entitlements
- prices/totals
- order status
- ratings ownership
- resource ownership

The frontend is never trusted for these.

---

# 16. Source code / IP consistency rule

The signed agreement controls IP ownership.

The current signed agreement states source code and technical assets become property of the project legal entity after final delivery and full payment.

Engineering documentation must **not contradict the signed contract** by claiming personal ownership after that transfer condition is satisfied.

---

# 17. Subscription rules

- Do not hard-code pricing.
- Do not trust a local “premium=true” flag.
- Do not unlock premium functionality only in UI.
- Entitlements must be server-enforced.
- Changes to entitlements must update `08_SUBSCRIPTIONS.md`.

---

# 18. Data rules

Never:
- delete production data casually,
- run destructive migrations without backups/rollback considerations,
- expose user private data to the wrong role,
- trust client-calculated financial totals,
- store secrets in records unnecessarily.

---

# 19. Database change protocol

Any schema change must provide:

```text
Reason
Migration
Rollback/mitigation
Tests
Affected API
Affected UI
```

If schema changes affect active clients, consider backward compatibility.

---

# 20. API change protocol

Any API contract change requires updating:
- `07_API.md`
- shared types/schema
- backend tests
- client integration

Never patch an API response ad hoc for one screen without considering all consumers.

---

# 21. UI change protocol

Any significant visual change must preserve:
- Navy + Gold + Off-white direction
- RTL
- spacing scale
- typography system
- navigation consistency
- accessibility baseline

Do not introduce a second visual language.

---

# 22. Testing rules

At minimum, before marking P0 work done:

### Static
- typecheck
- lint
- format check when configured

### Functional
- happy path
- validation path
- permission denial path
- empty state
- error state

### Regression
- affected core flow
- authentication if auth touched
- subscriptions if billing touched

---

# 23. Testing the three roles

Whenever shared role logic changes, test:

```text
Customer
Technician
Merchant
```

and, where relevant:

```text
Admin
```

Do not test only the currently selected UI role.

---

# 24. Security rules

- No secrets in repository.
- No plaintext passwords.
- No trust in client role claims.
- No unsafe file upload paths.
- No authorization bypass via route manipulation.
- No detailed server errors in production.
- Use vetted dependencies.

---

# 25. Dependency rules

Before adding a dependency:
- verify an existing package does not already solve it,
- check compatibility,
- check maintenance status when appropriate,
- keep dependency footprint reasonable.

Do not add a major framework because a tiny utility is missing.

---

# 26. AI-generated code review rule

Generated code must be treated exactly like human-written code:
- inspect it,
- test it,
- check security,
- check edge cases,
- check duplication.

“AI wrote it” is never a quality argument.

---

# 27. Commit rules

Commit messages should be meaningful.

Examples:

```text
feat(fault-guide): add appliance fault browsing
feat(requests): add service request creation flow
fix(auth): prevent role escalation via client payload
refactor(ui): unify technician cards
```

Avoid commits like:
```text
update
changes
final
fixed
```

---

# 28. Pull/merge rules

A change should be reviewable.

Prefer:
- one feature
- one bug class
- one coherent refactor

Avoid mixing everything in one PR.

---

# 29. Definition of Done — UI task

- Matches design direction.
- Responsive.
- RTL correct.
- Loading state.
- Empty state.
- Error state.
- Accessibility baseline.
- Correct navigation.
- Correct role visibility.
- No console/runtime errors.

---

# 30. Definition of Done — Backend task

- Validation.
- Authorization.
- Error model.
- Tests.
- Logging where appropriate.
- No secret leakage.
- DB migration if required.
- API documentation update.

---

# 31. Definition of Done — Database task

- Migration created.
- Constraints/indexes evaluated.
- Seed strategy if needed.
- Rollback/mitigation considered.
- Related APIs updated.
- Tests updated.

---

# 32. Definition of Done — Subscription task

- Plan data is configurable.
- Entitlement is represented in backend policy.
- UI reflects server state.
- Expiry/cancel behavior defined.
- Payment verification enforced if billing is real.
- Role-specific behavior tested.

---

# 33. Definition of Done — Release

A release candidate must pass:

```text
Install
 ↓
Onboarding
 ↓
Role Selection
 ↓
Auth
 ↓
Customer Core Flow
 ↓
Technician Core Flow
 ↓
Merchant Core Flow
 ↓
Admin critical checks
 ↓
Subscription checks
 ↓
Regression
 ↓
Production build
```

---

# 34. Local AI workflow for the project

The project is developed locally with open/code-first tooling and AI coding models.

AI model examples may include **MiniMax M3** and other locally available/open tooling.

Model choice is not part of product architecture.

The same repository constitution applies regardless of which model is currently driving implementation.

---

# 35. Required AI task prompt

Use the following baseline instruction for every implementation task:

> You are an implementation agent working on the الخبير platform. Before changing code, read the relevant constitution files under `docs/`, especially `01_PROJECT.md`, `02_PRODUCT.md`, `03_USER_FLOWS.md`, `04_UI_UX.md`, `05_TECH_ARCHITECTURE.md`, `06_DATABASE.md`, `07_API.md`, `08_SUBSCRIPTIONS.md`, `09_ADMIN.md`, and this file as applicable. Treat them as the project source of truth. Do not invent requirements. Preserve the three end-user roles: customer, technician, merchant. Preserve RTL and the approved Navy/Gold/Off-white design language. Enforce authorization server-side. Reuse existing code before creating new abstractions. Make the smallest safe change. Do not modify unrelated features. If a requirement is ambiguous and affects money, permissions, data, authentication, security, or legal/IP matters, stop and request clarification. Before finishing, run the relevant tests/typecheck/lint, verify error/loading/empty states, update affected documentation, and report what changed, what was tested, and any remaining risk.

---

# 36. Task report template

Every meaningful AI task should end with:

```text
TASK COMPLETED

Summary:

Files changed:

Behavior added/changed:

Tests run:

Validation:

Risks / known limitations:

Documentation updated:

Next safe step:
```

---

# 37. Stop conditions

The agent must stop rather than guess when:

- payment semantics are unclear,
- legal/IP ownership conflicts appear,
- a role should gain authority it did not previously have,
- a destructive migration is needed,
- a new third-party provider is required,
- a new large feature expands the agreed scope,
- security cannot be implemented safely with available information.

---

# 38. Final non-negotiables

```text
NO invented features.
NO role escalation.
NO client-trusted permissions.
NO secrets in source.
NO silent API breaks.
NO silent schema breaks.
NO arbitrary design drift.
NO fake data in production.
NO subscription entitlement unlocked only on the client.
NO destructive production changes without control.
NO undocumented major architectural changes.
```

---

# 39. Working philosophy

**Ship fast, but not recklessly.**

The target is an early, polished, production-capable MVP within the agreed delivery window — not a fragile demo that merely resembles the approved screenshots.

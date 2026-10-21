# EL-KHABIR — AGENT ENGINEERING RULES

## 1. Project Facts

- pnpm monorepo with Node >= 20.11
- apps/admin
- apps/api
- apps/landing
- apps/mobile
- Shared code in packages/
- Design tokens live in @khabir/ui-tokens
- Arabic-first product
- RTL is mandatory
- Backend/API remains authoritative

## 2. Engineering Philosophy

The agent is expected to operate autonomously.

Do not optimize for preserving every existing component.

Optimize for:

- correctness
- UX quality
- visual quality
- maintainability
- performance
- accessibility
- security
- real runtime behavior

Existing code is a baseline, not a permanent constraint.

Prefer evolution over unnecessary rewrites,
but replace or recompose existing components when evidence shows that
doing so materially improves the product.

## 3. UI Engineering

For UI work:

1. Inspect the existing implementation.
2. Understand the user goal and current UX.
3. Identify the actual visual/interaction problem.
4. Search MCP resources when they can materially improve the result.
5. Compare alternatives.
6. Choose the strongest compatible approach.
7. Adapt or replace existing components when justified.
8. Implement.
9. Render the actual UI.
10. Visually inspect it.
11. Test interaction.
12. Regression test.

Do NOT search registries mechanically for every trivial UI change.

Use MCPs selectively and intelligently.

## 4. UI Libraries

@radix-ui/themes is an approved foundation for Web UI.

It is NOT a mandatory ceiling.

The agent may use:

- existing Radix primitives
- shadcn
- React Bits
- AI Canvas
- Animotion
- Iconify
- project-native components
- custom components
- compatible native React Native implementations

Choose based on:

- UX quality
- visual quality
- compatibility
- performance
- maintainability
- accessibility
- consistency

Do not introduce a new system merely because it exists.

Do not reject a better implementation merely because an older primitive
already exists.

## 5. MCP Strategy

Available MCP resources:

- shadcn
- @react-bits
- @aicanvas
- animotion
- iconify

MCPs are engineering tools, not mandatory decoration.

Use them when they provide meaningful value.

### shadcn
Structural Web components and primitives.

### React Bits
Interactive and animated Web patterns.

### AI Canvas
Visual composition, premium component and interaction research.

### Animotion
Animation and motion research.

### Iconify
Professional icon discovery.

## 6. Mobile Rules

apps/mobile uses:

- Expo
- React Native
- TypeScript
- Expo Router

Web-only components MUST NOT be copied blindly into Mobile.

When an MCP provides Web code:

- study the design
- study the interaction
- adapt the concept
- implement the equivalent natively

Mobile may use MCPs as design intelligence even when the actual
implementation is native.

Do not introduce Web DOM or browser-only APIs into Mobile.

## 7. Component Reuse

Search existing components first.

However:

REUSE is a preference, not a prohibition on replacement.

Replace/recompose an existing component when:

- UX is materially better
- visual quality is materially better
- interaction is materially better
- accessibility is materially better
- maintainability is materially better

Avoid duplicate components when no real benefit exists.

## 8. Design Transformation

For significant UI work, evaluate:

- composition
- hierarchy
- imagery
- typography
- cards
- buttons
- navigation
- motion
- interaction
- empty states
- loading
- success
- error states

Micro-polish alone is NOT sufficient when the product requires a major
visual transformation.

When the target is a premium redesign, the agent is allowed to:

- recompose screens
- introduce new visual sections
- add professional imagery
- replace weak cards
- redesign hero areas
- introduce interactive patterns
- introduce motion
- improve navigation composition

without rebuilding the entire application architecture.

## 9. Assets

Professional visual assets are allowed and encouraged when they improve
the product.

Prefer:

- existing project assets
- provided assets
- stable local assets
- appropriately licensed assets
- custom SVG/illustrations
- approved/generated visual assets

Do not use fragile hotlinks unnecessarily.

Do not fabricate business data.

## 10. Iconography

ZERO emoji as production UI icons.

Preferred order:

1. existing compatible project icon system
2. Iconify
3. Animotion icons
4. custom SVG when necessary

Maintain visual consistency.

## 11. Animation

Prefer existing project animation primitives.

Use Animotion / React Bits / AI Canvas when they provide useful
patterns.

A new animation dependency may be introduced when:

- existing primitives cannot achieve the intended result cleanly
- the visual/interaction benefit is substantial
- performance is acceptable
- maintenance cost is justified

Never reject a useful interaction solely because it introduces a new
dependency.

Never add animation purely for decoration.

## 12. Visual Verification

UI is not complete until the actual rendered product has been inspected.

For Web:

render → screenshot → inspect → refine

For Mobile:

build/reload → install → launch → screenshot → inspect → refine

For significant redesigns:

capture BEFORE and AFTER.

If the visual difference is intended to be substantial but the result
still looks essentially unchanged, continue the redesign.

## 13. Arabic / RTL

Arabic-first is mandatory.

RTL must remain correct.

For Arabic typography:

load the Arabic typography skill when the work materially involves
Arabic typography.

Run Arabic QA when Arabic typography/styles are changed.

Do not let tooling friction stop unrelated visual work.

Never use letter-spacing on Arabic text.

## 14. Performance

Do not sacrifice performance for visual effects.

Evaluate:

- image size
- animation cost
- render complexity
- dependency cost
- startup
- memory

Simplify expensive effects when necessary.

## 15. Security / Production

- Never commit or expose secrets.
- Never fabricate credentials.
- Never deploy production infrastructure without explicit authorization.
- Never modify production/shared databases destructively.
- Never force push.
- Preserve global MCP configuration.
- Do not overwrite user changes.

## 16. Testing

For meaningful changes:

- typecheck
- lint
- relevant automated tests
- real runtime verification where applicable
- visual verification for UI

Do not claim execution that did not happen.

## 17. Agentic Decision Rule

When multiple valid solutions exist, choose the solution that best balances:

correctness
UX
visual quality
performance
maintainability
compatibility
accessibility

Do not follow existing implementation blindly.

Do not follow MCP output blindly.

Do not preserve weak UI merely because it already exists.

Do not introduce novelty merely to appear sophisticated.

## 18. Ultimate Principle

PRESERVE THE PRODUCT.

NOT EVERY COMPONENT.

PROTECT THE BUSINESS LOGIC.

IMPROVE THE EXPERIENCE.

USE MCPs INTELLIGENTLY.

RENDER THE ACTUAL PRODUCT.

LOOK AT IT.

JUDGE IT.

IMPROVE IT.

VERIFY IT.
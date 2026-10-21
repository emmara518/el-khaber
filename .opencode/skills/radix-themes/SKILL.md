---
name: radix-themes
description: Use when the user mentions "radix", "@radix-ui/themes", "Radix Themes", "Theme provider", or asks to add Radix UI components/styling to any app in this monorepo. Covers install, root layout wiring, and RTL (Arabic) setup.
---

# Radix Themes in الخبير monorepo

Radix Themes (`@radix-ui/themes`) is the approved component library for app UIs in this repo.

## Install

Install per-app, never at the root:

```sh
pnpm --filter @khabir/admin add @radix-ui/themes
# same pattern for landing: pnpm --filter @khabir/landing add @radix-ui/themes
```

Next.js apps here are Next 15 + React 18.3 — compatible with `@radix-ui/themes`.

## Root layout wiring (Next.js App Router)

1. Import the stylesheet once, before any custom CSS, in the root layout:

```tsx
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
```

2. Wrap children in `<Theme>` inside the `<body>`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Theme accentColor="indigo" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
```

## RTL (Arabic)

This project is Arabic-first. RTL comes from `dir="rtl"` on `<html>` (already set in the root layouts) — Radix Themes reads it automatically. Keep `lang="ar"` untouched.

## Server Components

`@radix-ui/themes` components render fine in Server Components; no `"use client"` needed unless you attach event handlers/state to them.

## Rules

- Do NOT import styles.css in multiple files — once in the root layout only.
- Do NOT wrap parts of the tree in more than one `<Theme>` without intent (nested Themes override tokens).
- After installing/wiring, verify with `pnpm --filter @khabir/admin typecheck` (or the app's own typecheck).
- Design tokens live in `@khabir/ui-tokens` — map token values (colors, radii) into the `<Theme>` props rather than hardcoding.

import { color } from '@khabir/ui-tokens';

import type { CSSProperties } from 'react';

import './globals.css';

export const metadata = {
  title: 'الخبير — Admin',
  description: 'Al-Khabir internal admin dashboard',
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E9A824%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%230B1F3A%22 stroke=%22none%22/%3E%3Cpath d=%22M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z%22/%3E%3Cpath d=%22m9 12l2 2l4-4%22/%3E%3C/svg%3E',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{
        '--navy': color.brand.navy,
        '--navy-deep': color.brand.navyDeep,
        '--gold': color.brand.gold,
        '--gold-soft': color.brand.goldSoft,
        '--surface': color.surface.base,
        '--subtle': color.surface.subtle,
        '--border': color.border.default,
        '--text': color.text.primary,
        '--muted': color.text.secondary,
        '--success': color.success.DEFAULT,
        '--error': color.error.DEFAULT,
        '--warning': color.warning.DEFAULT,
      } as CSSProperties}>{children}</body>
    </html>
  );
}

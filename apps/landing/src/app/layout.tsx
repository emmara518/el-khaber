import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'الخبير — صيانة الأجهزة المنزلية بالعربية',
    template: '%s | الخبير',
  },
  description:
    'الخبير منصة عربية لصيانة الأجهزة المنزلية: غسالات وثلاجات ومكيفات. اطلب كعميل، وقدّم خدماتك كفني موثّق، واعرض منتجاتك كتاجر — مع دليل أعطال، وتتبّع للطلب، وتقييمات.',
  keywords: [
    'صيانة الأجهزة المنزلية',
    'فني غسالات',
    'فني ثلاجات',
    'فني مكيفات',
    'دليل الأعطال',
    'الخبير',
  ],
  authors: [{ name: 'Al-Khabir' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ar',
    title: 'الخبير — صيانة الأجهزة المنزلية بالعربية',
    description:
      'عميل وفني وتاجر في منصة واحدة: دليل أعطال، فنيون موثّقون، تتبّع مباشر، وتقييم بعد كل خدمة.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'الخبير — صيانة الأجهزة المنزلية بالعربية',
    description:
      'غسالات وثلاجات ومكيفات: اطلب الصيانة، تابع طلبك، وقيّم الخدمة — بالعربية أولًا.',
  },
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23E9A824%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Crect width=%2224%22 height=%2224%22 rx=%226%22 fill=%22%230B1F3A%22 stroke=%22none%22/%3E%3Cpath d=%22M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z%22/%3E%3Cpath d=%22m9 12l2 2l4-4%22/%3E%3C/svg%3E',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1F3A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

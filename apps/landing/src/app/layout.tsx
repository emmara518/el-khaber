export const metadata = {
  title: 'الخبير — Al-Khabir',
  description: 'Premium, Arabic-first home-appliance service platform',
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

export const metadata = {
  title: 'الخبير — Admin',
  description: 'Al-Khabir internal admin dashboard',
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

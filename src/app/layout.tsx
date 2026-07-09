import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '济南大学2026新生答疑助手',
  description: '济大学长在线答疑，帮你解决入学前后的一切疑问',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Hunt Dashboard',
  description: 'Private company research dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

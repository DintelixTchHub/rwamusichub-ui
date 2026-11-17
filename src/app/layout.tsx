import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/scroll-reveal';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rwanda Music Hub',
  description: 'Meet your next collaborator. Find work. Build your music career.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><ScrollReveal>{children}</ScrollReveal></body>
    </html>
  );
}

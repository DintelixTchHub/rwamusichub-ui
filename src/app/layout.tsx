import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ScrollReveal } from '@/components/scroll-reveal';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://music.dcintelix.rw'),
  title: ' | Connect, Discover and Grow',
  description: 'Discover musicians, music organizations and professional opportunities across Rwanda. Connect with the music industry through .',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: ' | Connect, Discover and Grow',
    description: 'Discover musicians, music organizations and professional opportunities across Rwanda.',
    url: 'https://music.dcintelix.rw',
    siteName: '',
    locale: 'en_RW',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: ' — Connect, Collaborate, Grow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: ' | Connect, Discover and Grow',
    description: 'Discover musicians, music organizations and professional opportunities across Rwanda.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><ScrollReveal>{children}</ScrollReveal></body>
    </html>
  );
}

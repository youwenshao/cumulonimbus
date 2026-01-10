import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Cumulonimbus - Build Apps from Ideas',
  description: 'Transform your ideas into working web applications through natural conversation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-surface-50 font-sans">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

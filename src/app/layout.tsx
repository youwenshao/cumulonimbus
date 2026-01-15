import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

// Font loaders must be called at module scope with const
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['monospace'],
});

// Using Georgia as fallback for serif (defined as object since we don't need Google Fonts for serif)
const sourceSerifPro = {
  variable: '--font-serif',
  className: '',
};

export const metadata: Metadata = {
  title: 'Cumulonimbus - Solving Problems at the Speed of Thought',
  description: 'A powerful, intelligent atmosphere where creation happens naturally. Build apps through natural conversation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerifPro.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

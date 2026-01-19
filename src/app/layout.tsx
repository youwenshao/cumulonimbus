import type { Metadata } from 'next';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from 'sonner';
import './globals.css';

// Using system fonts to avoid Google Fonts network dependency during build
const inter = {
  variable: '--font-sans',
  className: '',
};

const jetbrainsMono = {
  variable: '--font-mono',
  className: '',
};

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
            <Toaster position="bottom-right" theme="system" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

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

// #region agent log
fetch('http://127.0.0.1:7242/ingest/acc56320-b9cc-4e4e-9d28-472a8b4e9a94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.tsx:24',message:'Checking NEXT_PUBLIC_APP_URL',data:{url:process.env.NEXT_PUBLIC_APP_URL},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'1'})}).catch(()=>{});
// #endregion

function getSafeMetadataBase() {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://cumulonimbus.app';
  try {
    return new URL(url);
  } catch (e) {
    console.error('Invalid NEXT_PUBLIC_APP_URL:', url);
    return new URL('https://cumulonimbus.app');
  }
}

export const metadata: Metadata = {
  metadataBase: getSafeMetadataBase(),
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

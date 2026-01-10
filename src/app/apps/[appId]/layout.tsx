import { SessionProvider } from '@/components/providers/SessionProvider';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}

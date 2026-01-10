import { SessionProvider } from '@/components/providers/SessionProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}

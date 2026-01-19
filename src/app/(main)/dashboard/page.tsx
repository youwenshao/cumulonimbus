import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { NavigationRail } from '@/components/ui';
import { DashboardContent } from './DashboardContent';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const [user, apps] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true }
    }),
    prisma.app.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        subdomain: true,
        isAlwaysOn: true,
      },
    })
  ]);

  return (
    <div className="h-screen bg-surface-base flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <DashboardContent 
        apps={apps} 
        userEmail={session.user.email || ''} 
        userPlan={user?.plan || 'FREE'}
      />
    </div>
  );
}

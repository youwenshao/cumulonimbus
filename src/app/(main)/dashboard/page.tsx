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

  const [user, apps, conversations] = await Promise.all([
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
    }),
    // Fetch recent conversations (not completed)
    prisma.conversation.findMany({
      where: { 
        userId: session.user.id,
        phase: { not: 'COMPLETE' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        appId: true,
        messages: true,
        phase: true,
        spec: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  // Transform conversations for the client
  const conversationsWithDetails = conversations.map(conv => {
    let lastMessage = '';
    let messageCount = 0;
    let readinessScore = 0;

    try {
      const messages = JSON.parse(conv.messages || '[]');
      messageCount = messages.length;
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        lastMessage = lastMsg.content?.substring(0, 100) || '';
        if (lastMessage.length === 100) lastMessage += '...';
      }
    } catch {
      // Ignore parse errors
    }

    try {
      const spec = conv.spec ? JSON.parse(conv.spec) : null;
      readinessScore = spec?.readinessScore || 0;
    } catch {
      // Ignore parse errors
    }

    return {
      id: conv.id,
      appId: conv.appId,
      phase: conv.phase,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage,
      messageCount,
      readinessScore,
    };
  });

  return (
    <div className="h-screen bg-surface-base flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <DashboardContent 
        apps={apps} 
        conversations={conversationsWithDetails}
        userEmail={session.user.email || ''} 
        userPlan={user?.plan || 'FREE'}
      />
    </div>
  );
}

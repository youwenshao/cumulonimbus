import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Plus, ExternalLink, Settings } from 'lucide-react';
import { NavigationRail, Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const apps = await prisma.app.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="h-screen bg-black flex">
      {/* Navigation Rail - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <NavigationRail />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-outline-mid bg-surface-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Your Apps</h1>
              <p className="text-text-secondary">Manage your generated applications</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                {session.user.email}
              </span>
              <Link href="/api/auth/signout" className="btn-ghost px-3 py-1.5 text-sm">
                Sign Out
              </Link>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Applications</h2>
                <p className="text-text-secondary">Your generated web applications</p>
              </div>
              <Button asChild>
                <Link href="/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New App
                </Link>
              </Button>
            </div>

            {apps.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app, index) => (
                  <AppCard key={app.id} app={app} index={index} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card variant="outlined" padding="lg" className="text-center max-w-md mx-auto animate-fade-in">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-red flex items-center justify-center">
        <Plus className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">
        No apps yet
      </h3>
      <p className="text-text-secondary mb-8 leading-relaxed">
        Describe what you want to track and we&apos;ll build a personalized app for you in seconds.
      </p>
      <Button asChild size="lg">
        <Link href="/create">
          <Plus className="w-4 h-4 mr-2" />
          Create Your First App
        </Link>
      </Button>
    </Card>
  );
}

function AppCard({
  app,
  index
}: {
  app: {
    id: string;
    name: string;
    description: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  index: number;
}) {
  const statusStyles = {
    ACTIVE: 'bg-pastel-green text-white',
    DRAFT: 'bg-pastel-yellow text-black',
    GENERATING: 'bg-pastel-blue text-white',
    ARCHIVED: 'bg-surface-light text-text-secondary',
  };

  return (
    <Card
      variant="outlined"
      padding="lg"
      className="animate-confident hover:border-accent-red/50 transition-all duration-300 group"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[app.status as keyof typeof statusStyles] || statusStyles.DRAFT}`}>
          {app.status}
        </div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-surface-light rounded-lg transition-all">
          <Settings className="w-4 h-4 text-text-tertiary" />
        </button>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">
        {app.name}
      </h3>
      <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
        {app.description || 'No description available'}
      </p>

      <div className="text-xs text-text-tertiary mb-4">
        Created {formatDate(app.createdAt)}
      </div>

      <Button asChild variant="secondary" size="sm" className="w-full">
        <Link href={`/apps/${app.id}`}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open App
        </Link>
      </Button>
    </Card>
  );
}

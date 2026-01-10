import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { Plus, Sparkles, ExternalLink, Trash2, MoreVertical } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-surface-100 to-primary-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display text-surface-900">Cumulonimbus</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-surface-600">
                {session.user.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-surface-500 hover:text-surface-700"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-surface-900">Your Apps</h1>
            <p className="text-surface-600 mt-1">Manage your generated applications</p>
          </div>
          <Link
            href="/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25"
          >
            <Plus className="w-5 h-5" />
            Create New App
          </Link>
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
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-3xl p-12 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary-600" />
      </div>
      <h2 className="text-2xl font-bold font-display text-surface-900 mb-3">
        No apps yet
      </h2>
      <p className="text-surface-600 max-w-md mx-auto mb-8">
        Describe what you want to track and we will build a personalized app for you in seconds.
      </p>
      <Link
        href="/create"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25"
      >
        <Plus className="w-5 h-5" />
        Create Your First App
      </Link>
    </div>
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
  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-yellow-100 text-yellow-700',
    GENERATING: 'bg-blue-100 text-blue-700',
    ARCHIVED: 'bg-surface-100 text-surface-600',
  };

  return (
    <div 
      className="glass rounded-2xl p-6 hover:shadow-lg transition-all animate-slide-up group"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[app.status as keyof typeof statusColors] || statusColors.DRAFT}`}>
          {app.status}
        </div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-surface-100 rounded-lg transition-all">
          <MoreVertical className="w-4 h-4 text-surface-500" />
        </button>
      </div>

      <h3 className="text-lg font-semibold font-display text-surface-900 mb-2">
        {app.name}
      </h3>
      <p className="text-sm text-surface-600 line-clamp-2 mb-4">
        {app.description || 'No description'}
      </p>

      <div className="text-xs text-surface-500 mb-4">
        Created {formatDate(app.createdAt)}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/apps/${app.id}`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Settings, Search, ArrowUpDown, LogOut } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/utils';

type App = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type SortOption = 'name' | 'date' | 'status';

interface DashboardContentProps {
  apps: App[];
  userEmail: string;
}

export function DashboardContent({ apps, userEmail }: DashboardContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedApps = useMemo(() => {
    let filtered = apps.filter((app) => {
      const query = searchQuery.toLowerCase();
      return (
        app.name.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.status.toLowerCase().includes(query)
      );
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [apps, searchQuery, sortBy, sortOrder]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('asc');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="border-b border-outline-mid bg-surface-dark/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif font-medium text-white">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-tertiary">{userEmail}</span>
            <Link 
              href="/api/auth/signout" 
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-white hover:bg-surface-light rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {apps.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-light border border-outline-mid rounded-lg text-white placeholder-text-tertiary focus:outline-none focus:border-accent-red/50 focus:ring-1 focus:ring-accent-red/50 transition-all"
                  />
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-tertiary mr-2">Sort by:</span>
                  <button
                    onClick={() => toggleSort('name')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                      sortBy === 'name'
                        ? 'bg-accent-red text-white'
                        : 'bg-surface-light text-text-secondary hover:text-white hover:bg-surface-mid'
                    }`}
                  >
                    Name
                    {sortBy === 'name' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSort('date')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                      sortBy === 'date'
                        ? 'bg-accent-red text-white'
                        : 'bg-surface-light text-text-secondary hover:text-white hover:bg-surface-mid'
                    }`}
                  >
                    Date
                    {sortBy === 'date' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleSort('status')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                      sortBy === 'status'
                        ? 'bg-accent-red text-white'
                        : 'bg-surface-light text-text-secondary hover:text-white hover:bg-surface-mid'
                    }`}
                  >
                    Status
                    {sortBy === 'status' && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Create Button */}
                <Button asChild>
                  <Link href="/create" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create
                  </Link>
                </Button>
              </div>

              {/* Results Summary */}
              <div className="mb-4">
                <p className="text-sm text-text-tertiary">
                  {filteredAndSortedApps.length === apps.length
                    ? `${apps.length} ${apps.length === 1 ? 'app' : 'apps'} total`
                    : `${filteredAndSortedApps.length} of ${apps.length} apps`}
                </p>
              </div>

              {/* Apps Grid */}
              {filteredAndSortedApps.length === 0 ? (
                <Card variant="outlined" padding="lg" className="text-center">
                  <p className="text-text-secondary">No apps match your search.</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedApps.map((app, index) => (
                    <AppCard key={app.id} app={app} index={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card variant="outlined" padding="lg" className="text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center">
          <Plus className="w-8 h-8 text-accent-red" />
        </div>
        <h3 className="text-3xl font-serif font-medium text-white mb-3">No apps yet</h3>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Create your first app to get started. Describe what you want and we&apos;ll build it for you.
        </p>
        <Button asChild size="lg">
          <Link href="/create" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First App
          </Link>
        </Button>
      </Card>
    </div>
  );
}

function AppCard({
  app,
  index,
}: {
  app: App;
  index: number;
}) {
  const statusStyles = {
    ACTIVE: 'bg-pastel-green/20 text-pastel-green border border-pastel-green/30',
    DRAFT: 'bg-pastel-yellow/20 text-pastel-yellow border border-pastel-yellow/30',
    GENERATING: 'bg-pastel-blue/20 text-pastel-blue border border-pastel-blue/30',
    ARCHIVED: 'bg-surface-light text-text-tertiary border border-outline-mid',
  };

  return (
    <Card
      variant="outlined"
      padding="lg"
      className="animate-confident hover:border-accent-red/50 transition-all duration-300 group relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusStyles[app.status as keyof typeof statusStyles] || statusStyles.DRAFT
          }`}
        >
          {app.status}
        </div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-surface-light rounded-lg transition-all">
          <Settings className="w-4 h-4 text-text-tertiary hover:text-white" />
        </button>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{app.name}</h3>
      <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
        {app.description || 'No description available'}
      </p>

      <div className="text-xs text-text-tertiary mb-4">
        Created {formatDate(app.createdAt)}
      </div>

      <Button asChild variant="secondary" size="sm" className="w-full group/btn">
        <Link href={`/apps/${app.id}`} className="flex items-center justify-center gap-2">
          Open
          <ExternalLink className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </Link>
      </Button>
    </Card>
  );
}

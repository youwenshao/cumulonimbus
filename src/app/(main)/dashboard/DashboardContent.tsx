'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Settings, Search, ArrowUpDown, LogOut, MoreVertical, Pencil, Copy, Archive, Trash, ArchiveRestore } from 'lucide-react';
import { Button, Card, DropdownMenu, DropdownItem, DropdownSeparator, Modal } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

type App = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  // spec and config are needed for duplication but not displayed in the list directly usually
  // However, the duplication endpoint might handle fetching full details or we trust the API to copy based on ID.
  // The POST /api/apps requires spec and config, but if we implement a duplicate endpoint or use the client side data...
  // Wait, the POST /api/apps expects { name, description, spec, config }.
  // But the app list here only has summary data.
  // We need to fetch the full app details to duplicate it properly using POST /api/apps, 
  // OR we can rely on the backend to handle duplication if we had a duplicate endpoint.
  // Since we don't have a specific duplicate endpoint, we'll need to fetch the single app data first or update the list query to include spec/config.
  // Updating the list query in DashboardPage is better to avoid N+1 requests on duplication if we want to do it client side without a new endpoint.
  // But for now, let's assume we can fetch it or just pass what we have if spec/config are available.
  // Actually, let's modify the DashboardPage to include spec/config in the initial fetch, or fetch on demand.
  // Fetching on demand is cleaner for payload size.
  // I'll add a fetchAppDetails function.
};

type SortOption = 'name' | 'date' | 'status';

interface DashboardContentProps {
  apps: App[];
  userEmail: string;
}

export function DashboardContent({ apps: initialApps, userEmail }: DashboardContentProps) {
  const [apps, setApps] = useState<App[]>(initialApps);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [editModalApp, setEditModalApp] = useState<App | null>(null);
  const [deleteModalApp, setDeleteModalApp] = useState<App | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

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

  // Actions
  const handleEdit = (app: App) => {
    setEditModalApp(app);
    setEditName(app.name);
    setEditDescription(app.description);
  };

  const handleUpdateApp = async () => {
    if (!editModalApp) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/apps/${editModalApp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to update app');

      const { app: updatedApp } = await response.json();

      setApps(apps.map((a) => (a.id === updatedApp.id ? { ...a, ...updatedApp } : a)));
      toast.success('App updated successfully');
      setEditModalApp(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update app');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (app: App) => {
    setDeleteModalApp(app);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalApp) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/apps/${deleteModalApp.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete app');

      setApps(apps.filter((a) => a.id !== deleteModalApp.id));
      toast.success('App deleted successfully');
      setDeleteModalApp(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete app');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (app: App) => {
    try {
      toast.loading('Duplicating app...');
      
      // 1. Fetch full app details to get spec and config
      const detailsResponse = await fetch(`/api/apps/${app.id}`);
      if (!detailsResponse.ok) throw new Error('Failed to fetch app details');
      const { app: fullApp } = await detailsResponse.json();

      // 2. Create new app
      const response = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${fullApp.name} (Copy)`,
          description: fullApp.description,
          spec: fullApp.spec,
          config: fullApp.config,
        }),
      });

      if (!response.ok) throw new Error('Failed to duplicate app');

      const { app: newApp } = await response.json();

      setApps([newApp, ...apps]);
      toast.dismiss();
      toast.success('App duplicated successfully');
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('Failed to duplicate app');
    }
  };

  const handleArchive = async (app: App) => {
    const newStatus = app.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const action = app.status === 'ARCHIVED' ? 'unarchived' : 'archived';

    try {
      // Optimistic update
      setApps(apps.map((a) => (a.id === app.id ? { ...a, status: newStatus } : a)));

      const response = await fetch(`/api/apps/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Revert on failure
        setApps(apps.map((a) => (a.id === app.id ? { ...a, status: app.status } : a)));
        throw new Error(`Failed to ${action} app`);
      }

      toast.success(`App ${action} successfully`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} app`);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('App ID copied to clipboard');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="border-b border-outline-mid bg-surface-base/50 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif font-medium text-text-primary">Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-tertiary">{userEmail}</span>
            <Link 
              href="/api/auth/signout" 
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-all duration-200"
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
                    className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-outline-mid rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-yellow/50 focus:ring-1 focus:ring-accent-yellow/50 transition-all"
                  />
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-tertiary mr-2">Sort by:</span>
                  <button
                    onClick={() => toggleSort('name')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1 ${
                      sortBy === 'name'
                        ? 'bg-accent-yellow text-text-primary'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-layer'
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
                        ? 'bg-accent-yellow text-text-primary'
                        : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-mid'
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
                        ? 'bg-accent-yellow text-text-primary'
                        : 'bg-surface-light text-text-secondary hover:text-text-primary hover:bg-surface-mid'
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
                    <AppCard 
                      key={app.id} 
                      app={app} 
                      index={index}
                      onEdit={() => handleEdit(app)}
                      onDuplicate={() => handleDuplicate(app)}
                      onArchive={() => handleArchive(app)}
                      onDelete={() => handleDelete(app)}
                      onCopyId={() => handleCopyId(app.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModalApp}
        onClose={() => setEditModalApp(null)}
        title="Edit App"
        description="Update the details of your application."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModalApp(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateApp} loading={isSubmitting}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-text-secondary">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-outline-mid rounded-lg text-text-primary focus:outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all"
              placeholder="App Name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-text-secondary">
              Description
            </label>
            <textarea
              id="description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 bg-surface-elevated border border-outline-mid rounded-lg text-text-primary focus:outline-none focus:border-accent-yellow focus:ring-1 focus:ring-accent-yellow transition-all resize-none h-32"
              placeholder="Describe your app..."
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModalApp}
        onClose={() => setDeleteModalApp(null)}
        title="Delete App"
        description="Are you sure you want to delete this app? This action cannot be undone."
        variant="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalApp(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} loading={isSubmitting}>
              Delete App
            </Button>
          </>
        }
      >
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
          <p>You are about to delete <strong>{deleteModalApp?.name}</strong>.</p>
          <p className="mt-1">All associated data and generated code will be permanently removed.</p>
        </div>
      </Modal>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card variant="outlined" padding="lg" className="text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center">
          <Plus className="w-8 h-8 text-accent-yellow" />
        </div>
        <h3 className="text-3xl font-serif font-medium text-text-primary mb-3">No apps yet</h3>
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

interface AppCardProps {
  app: App;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCopyId: () => void;
}

function AppCard({
  app,
  index,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onCopyId,
}: AppCardProps) {
  const statusStyles = {
    ACTIVE: 'bg-pastel-green/20 text-pastel-green border border-pastel-green/30',
    DRAFT: 'bg-pastel-yellow/20 text-pastel-yellow border border-pastel-yellow/30',
    GENERATING: 'bg-pastel-blue/20 text-pastel-blue border border-pastel-blue/30',
    ARCHIVED: 'bg-surface-elevated text-text-tertiary border border-outline-mid',
  };

  return (
    <Card
      variant="outlined"
      padding="lg"
      className="animate-confident hover:border-accent-yellow/50 transition-all duration-300 group relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 rounded-xl">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/create?appId=${app.id}&mode=guided`} className="flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/apps/${app.id}`} className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            Visit
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusStyles[app.status as keyof typeof statusStyles] || statusStyles.DRAFT
          }`}
        >
          {app.status}
        </div>
        
        <DropdownMenu
          trigger={({ onClick }) => (
            <button
              onClick={onClick}
              className="p-1.5 hover:bg-surface-elevated rounded-lg transition-all text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 relative z-20"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        >
          <DropdownItem icon={<Pencil />} onClick={onEdit}>
            Edit Details
          </DropdownItem>
          <DropdownItem icon={<Copy />} onClick={onDuplicate}>
            Duplicate
          </DropdownItem>
          <DropdownItem 
            icon={app.status === 'ARCHIVED' ? <ArchiveRestore /> : <Archive />} 
            onClick={onArchive}
          >
            {app.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
          </DropdownItem>
          <DropdownItem icon={<Settings className="w-4 h-4" />} onClick={onCopyId}>
             Copy ID
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Trash />} danger onClick={onDelete}>
            Delete
          </DropdownItem>
        </DropdownMenu>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-1">{app.name}</h3>
      <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
        {app.description || 'No description available'}
      </p>

      <div className="text-xs text-text-tertiary">
        Created {formatDate(app.createdAt)}
      </div>
    </Card>
  );
}

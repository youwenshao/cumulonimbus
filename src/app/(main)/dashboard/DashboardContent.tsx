'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, Settings, Search, ArrowUpDown, LogOut, MoreVertical, Pencil, Copy, Archive, Trash, ArchiveRestore, MessageSquare, Play, Clock } from 'lucide-react';
import { Button, Card, DropdownMenu, DropdownItem, DropdownSeparator, Modal } from '@/components/ui';
import { formatDate, getAppUrl } from '@/lib/utils';
import { toast } from 'sonner';

type App = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  subdomain: string | null;
  isAlwaysOn: boolean;
};

type Conversation = {
  id: string;
  appId: string | null;
  phase: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
  messageCount: number;
  readinessScore: number;
};

type SortOption = 'name' | 'date' | 'status';
type TabOption = 'apps' | 'conversations';

interface DashboardContentProps {
  apps: App[];
  conversations: Conversation[];
  userEmail: string;
  userPlan: string;
}

export function DashboardContent({ apps: initialApps, conversations: initialConversations, userEmail, userPlan }: DashboardContentProps) {
  const [apps, setApps] = useState<App[]>(initialApps);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeTab, setActiveTab] = useState<TabOption>('apps');
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

  const handleToggleAlwaysOn = async (appId: string, isAlwaysOn: boolean) => {
    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAlwaysOn }),
      });

      if (!response.ok) throw new Error('Failed to update hosting settings');

      setApps(apps.map((a) => (a.id === appId ? { ...a, isAlwaysOn } : a)));
      toast.success(isAlwaysOn ? 'Always-on enabled' : 'Always-on disabled');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update hosting settings');
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('App ID copied to clipboard');
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      setConversations(conversations.filter(c => c.id !== conversationId));
      toast.success('Conversation deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete conversation');
    }
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
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 border-b border-outline-mid">
            <button
              onClick={() => setActiveTab('apps')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'apps'
                  ? 'text-accent-yellow border-accent-yellow'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-outline-mid'
              }`}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Apps ({apps.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'conversations'
                  ? 'text-accent-yellow border-accent-yellow'
                  : 'text-text-secondary border-transparent hover:text-text-primary hover:border-outline-mid'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversations ({conversations.length})
              </span>
            </button>
          </div>

          {/* Apps Tab */}
          {activeTab === 'apps' && (
            apps.length === 0 ? (
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
                        userPlan={userPlan}
                        onEdit={() => handleEdit(app)}
                        onDuplicate={() => handleDuplicate(app)}
                        onArchive={() => handleArchive(app)}
                        onDelete={() => handleDelete(app)}
                        onCopyId={() => handleCopyId(app.id)}
                        onToggleAlwaysOn={(isAlwaysOn) => handleToggleAlwaysOn(app.id, isAlwaysOn)}
                      />
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            conversations.length === 0 ? (
              <EmptyConversationsState />
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-text-tertiary">
                    {conversations.length} active {conversations.length === 1 ? 'conversation' : 'conversations'}
                  </p>
                  <Button asChild>
                    <Link href="/create?mode=demo" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      New Conversation
                    </Link>
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {conversations.map((conversation, index) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      index={index}
                      onDelete={() => handleDeleteConversation(conversation.id)}
                    />
                  ))}
                </div>
              </>
            )
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
  userPlan: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCopyId: () => void;
  onToggleAlwaysOn: (isAlwaysOn: boolean) => void;
}

function AppCard({
  app,
  index,
  userPlan,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onCopyId,
  onToggleAlwaysOn,
}: AppCardProps) {
  const statusStyles = {
    ACTIVE: 'bg-pastel-green/20 text-pastel-green border border-pastel-green/30',
    DRAFT: 'bg-pastel-yellow/20 text-pastel-yellow border border-pastel-yellow/30',
    GENERATING: 'bg-pastel-blue/20 text-pastel-blue border border-pastel-blue/30',
    ARCHIVED: 'bg-surface-elevated text-text-tertiary border border-outline-mid',
  };

  const isPro = userPlan === 'PRO' || userPlan === 'PLUS';
  
  // Dynamically determine host for URL generation
  const [host, setHost] = useState<string>('');
  
  useEffect(() => {
    setHost(window.location.host);
  }, []);

  // Use the centralized getAppUrl helper which handles subdomain vs path-based routing
  const liveUrl = app.subdomain && host
    ? getAppUrl(app.subdomain, host)
    : null;

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
        {liveUrl ? (
          <Button asChild size="sm">
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Visit Live
            </a>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href={`/apps/${app.id}`} className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Preview
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
              statusStyles[app.status as keyof typeof statusStyles] || statusStyles.DRAFT
            }`}
          >
            {app.status}
          </div>
          {app.subdomain && (
            <div className="flex items-center gap-1.5 text-[10px] text-accent-yellow font-mono bg-accent-yellow/5 px-2 py-0.5 rounded border border-accent-yellow/10">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow animate-pulse" />
              {app.subdomain}.nebula
            </div>
          )}
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

      <div className="flex items-center justify-between mt-auto">
        <div className="text-[10px] text-text-tertiary">
          Created {formatDate(app.createdAt)}
        </div>
        
        {isPro && app.status === 'ACTIVE' && (
          <div className="flex items-center gap-2 bg-surface-elevated px-2 py-1 rounded-md border border-outline-light">
            <span className="text-[10px] text-text-secondary font-medium">Always-on</span>
            <button
              onClick={() => onToggleAlwaysOn(!app.isAlwaysOn)}
              className={`w-7 h-4 rounded-full transition-colors relative ${
                app.isAlwaysOn ? 'bg-accent-yellow' : 'bg-surface-mid'
              }`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                app.isAlwaysOn ? 'left-3.5' : 'left-0.5'
              }`} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function EmptyConversationsState() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Card variant="outlined" padding="lg" className="text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-yellow/10 border border-accent-yellow/20 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-accent-yellow" />
        </div>
        <h3 className="text-2xl font-serif font-medium text-text-primary mb-3">No active conversations</h3>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Start a new conversation with the AI Architect to design and build your next app.
        </p>
        <Button asChild size="lg">
          <Link href="/create?mode=demo" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Start New Conversation
          </Link>
        </Button>
      </Card>
    </div>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  index: number;
  onDelete: () => void;
}

function ConversationCard({ conversation, index, onDelete }: ConversationCardProps) {
  const phaseStyles = {
    PROBE: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    PICTURE: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    PLAN: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    EXPLORING: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    REFINING: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    READY: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  };

  const readinessColor = conversation.readinessScore >= 80 
    ? 'text-emerald-500' 
    : conversation.readinessScore >= 50 
      ? 'text-amber-500' 
      : 'text-text-tertiary';

  return (
    <Card
      variant="outlined"
      padding="lg"
      className="animate-confident hover:border-accent-yellow/50 transition-all duration-300 group relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-surface-base/90 backdrop-blur-sm flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 rounded-xl">
        <Button asChild size="sm">
          <Link href={`/create?conversationId=${conversation.id}&mode=demo`} className="flex items-center gap-2">
            <Play className="w-3.5 h-3.5" />
            Resume
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
              phaseStyles[conversation.phase.toUpperCase() as keyof typeof phaseStyles] || phaseStyles.PROBE
            }`}
          >
            {conversation.phase}
          </div>
          {conversation.readinessScore > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-surface-layer rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    conversation.readinessScore >= 80 ? 'bg-emerald-500' : 
                    conversation.readinessScore >= 50 ? 'bg-amber-500' : 'bg-text-tertiary'
                  }`}
                  style={{ width: `${conversation.readinessScore}%` }}
                />
              </div>
              <span className={`text-[10px] ${readinessColor}`}>{conversation.readinessScore}%</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-text-tertiary">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-xs">{conversation.messageCount}</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed min-h-[3.5rem]">
          {conversation.lastMessage || 'No messages yet'}
        </p>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
        <Clock className="w-3 h-3" />
        <span>Updated {formatDate(conversation.updatedAt)}</span>
      </div>
    </Card>
  );
}

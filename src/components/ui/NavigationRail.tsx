'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationRailProps {
  className?: string;
}

const navigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    active: ['/dashboard'],
  },
  {
    label: 'Create',
    href: '/create',
    icon: Plus,
    active: ['/create'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    active: ['/settings'],
  },
];

export function NavigationRail({ className }: NavigationRailProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('rail-width bg-black border-r border-outline-mid flex flex-col items-center py-6', className)}>
      {/* Logo/Brand at top - Yellow circle representing the dot from the "i" */}
      <div className="mb-8">
        <Link
          href="/"
          className="block group relative"
          title="Home"
        >
          <div className="w-10 h-10 rounded-full bg-accent-red transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent-red/50">
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-surface-dark text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 top-1/2 -translate-y-1/2">
            Home
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-outline-mid mb-4"></div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col items-center space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active.some(path => pathname?.startsWith(path));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative',
                isActive
                  ? 'bg-accent-red text-white shadow-lg shadow-accent-red/30'
                  : 'text-outline-mid hover:text-white hover:bg-surface-light hover:scale-105'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-3 py-1.5 bg-surface-dark text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User avatar at bottom */}
      <div className="mt-auto">
        <button 
          className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-text-tertiary hover:text-white hover:bg-surface-mid transition-all duration-200 hover:scale-105 group relative"
          title="Profile"
        >
          <User className="w-5 h-5" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-surface-dark text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-outline-light/20 shadow-xl bottom-0">
            Profile
          </div>
        </button>
      </div>
    </nav>
  );
}

export default NavigationRail;
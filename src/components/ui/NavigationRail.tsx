'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cloud, Folder, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationRailProps {
  className?: string;
}

const navigationItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: Cloud,
    active: ['/dashboard', '/'],
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: Folder,
    active: ['/projects'],
  },
  {
    label: 'Create',
    href: '/create',
    icon: Cloud,
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
      {/* Logo/Brand at top */}
      <div className="mb-8">
        <Link href="/" className="block">
          <div className="w-8 h-8 rounded-lg bg-accent-red flex items-center justify-center">
            <Cloud className="w-4 h-4 text-white" />
          </div>
        </Link>
      </div>

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
                  ? 'bg-accent-red text-white'
                  : 'text-outline-mid hover:text-white hover:bg-surface-light'
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-surface-dark text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User avatar at bottom */}
      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-text-tertiary hover:text-white transition-colors cursor-pointer">
          <Users className="w-4 h-4" />
        </div>
      </div>
    </nav>
  );
}

export default NavigationRail;
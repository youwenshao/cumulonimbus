'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PreviewMockupProps {
  children: React.ReactNode;
  viewMode?: 'mobile' | 'tablet' | 'desktop';
  onViewModeChange?: (mode: 'mobile' | 'tablet' | 'desktop') => void;
  className?: string;
}

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1200, height: 800, label: 'Desktop' },
};

export function PreviewMockup({
  children,
  viewMode = 'desktop',
  onViewModeChange,
  className,
}: PreviewMockupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const device = DEVICE_SIZES[viewMode];

  // Scale factor for fitting in container
  const maxWidth = viewMode === 'desktop' ? 800 : viewMode === 'tablet' ? 500 : 280;
  const scale = Math.min(1, maxWidth / device.width);

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Device Selector */}
      {onViewModeChange && (
        <div className="flex items-center gap-2 bg-surface-base rounded-lg p-1">
          {(['mobile', 'tablet', 'desktop'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === mode
                  ? 'bg-accent-yellow text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              )}
            >
              {DEVICE_SIZES[mode].label}
            </button>
          ))}
        </div>
      )}

      {/* Device Frame */}
      <div
        className={cn(
          'relative transition-all duration-300',
          isExpanded && 'fixed inset-4 z-50 flex items-center justify-center bg-black/80'
        )}
      >
        {/* Frame Container */}
        <div
          className={cn(
            'relative bg-gray-900 rounded-3xl shadow-2xl transition-all duration-300',
            viewMode === 'mobile' && 'p-3',
            viewMode === 'tablet' && 'p-4',
            viewMode === 'desktop' && 'p-2 rounded-xl'
          )}
          style={{
            transform: isExpanded ? 'scale(1)' : `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Device Notch (Mobile) */}
          {viewMode === 'mobile' && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
          )}

          {/* Device Top Bar (Desktop) */}
          {viewMode === 'desktop' && (
            <div className="bg-gray-800 rounded-t-lg px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded px-3 py-1 text-xs text-gray-400 text-center">
                  localhost:3000/apps/preview
                </div>
              </div>
            </div>
          )}

          {/* Screen */}
          <div
            className={cn(
              'bg-surface-base overflow-hidden',
              viewMode === 'mobile' && 'rounded-2xl',
              viewMode === 'tablet' && 'rounded-xl',
              viewMode === 'desktop' && 'rounded-b-lg'
            )}
            style={{
              width: device.width,
              height: device.height,
            }}
          >
            <div className="h-full overflow-auto">
              {children}
            </div>
          </div>

          {/* Home Indicator (Mobile/Tablet) */}
          {(viewMode === 'mobile' || viewMode === 'tablet') && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
          )}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'absolute -top-3 -right-3 w-8 h-8 bg-surface-elevated border border-outline-light rounded-full',
            'flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-base',
            'transition-all z-20'
          )}
        >
          {isExpanded ? '×' : '⤢'}
        </button>
      </div>

      {/* Device Info */}
      <div className="text-xs text-text-secondary">
        {device.width} × {device.height}
      </div>
    </div>
  );
}

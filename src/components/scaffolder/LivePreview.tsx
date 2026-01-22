'use client';

import { useState, useRef } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  RefreshCw, 
  ExternalLink,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn, getAppUrl } from '@/lib/utils';

type DeviceView = 'mobile' | 'tablet' | 'desktop';

interface LivePreviewProps {
  appId: string;
  subdomain?: string;
  appName: string;
  onReportIssue?: () => void;
  onAccept?: () => void;
  className?: string;
}

const DEVICE_DIMENSIONS: Record<DeviceView, { width: number; label: string }> = {
  mobile: { width: 375, label: 'Mobile' },
  tablet: { width: 768, label: 'Tablet' },
  desktop: { width: 1200, label: 'Desktop' },
};

export function LivePreview({ 
  appId, 
  subdomain,
  appName, 
  onReportIssue, 
  onAccept,
  className 
}: LivePreviewProps) {
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenInNewTab = () => {
    const host = window.location.host;
    const url = subdomain 
      ? getAppUrl(subdomain, host)
      : `/apps/${appId}`;
    window.open(url, '_blank');
  };

  // Generate preview URL using the robust getAppUrl helper
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const previewUrl = subdomain && host
    ? getAppUrl(subdomain, host)
    : `/apps/${appId}?preview=true`;
  const currentDevice = DEVICE_DIMENSIONS[deviceView];

  return (
    <div className={cn(
      'bg-surface-dark border border-outline-mid rounded-xl overflow-hidden flex flex-col',
      isFullscreen && 'fixed inset-4 z-50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-mid bg-surface-light">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-accent-yellow" />
          <div>
            <h3 className="font-medium text-text-primary">{appName}</h3>
            <p className="text-xs text-text-secondary">Live Preview</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Device Toggle */}
          <div className="flex items-center bg-surface-dark rounded-lg p-1">
            <button
              onClick={() => setDeviceView('mobile')}
              className={cn(
                'p-2 rounded-md transition-colors',
                deviceView === 'mobile' 
                  ? 'bg-accent-yellow text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Mobile view"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView('tablet')}
              className={cn(
                'p-2 rounded-md transition-colors',
                deviceView === 'tablet' 
                  ? 'bg-accent-yellow text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Tablet view"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView('desktop')}
              className={cn(
                'p-2 rounded-md transition-colors',
                deviceView === 'desktop' 
                  ? 'bg-accent-yellow text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              )}
              title="Desktop view"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleRefresh}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 bg-gray-800 flex items-center justify-center p-4 overflow-auto min-h-[500px]">
        <div 
          className={cn(
            'bg-white rounded-lg shadow-2xl transition-all duration-300 relative',
            deviceView === 'mobile' && 'rounded-3xl border-8 border-gray-900'
          )}
          style={{
            width: deviceView === 'desktop' ? '100%' : `${currentDevice.width}px`,
            maxWidth: '100%',
            height: deviceView === 'desktop' ? '100%' : 'auto',
            minHeight: deviceView === 'desktop' ? '100%' : '600px',
          }}
        >
          {/* Device notch for mobile */}
          {deviceView === 'mobile' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-10" />
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20 rounded-lg">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent-yellow mx-auto mb-2" />
                <p className="text-text-primary text-sm">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-20 rounded-lg">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-text-primary text-sm mb-2">Failed to load preview</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-accent-yellow text-text-primary rounded-lg text-sm hover:bg-accent-yellow/90"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Iframe */}
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full min-h-[500px] border-0 rounded-lg"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`Preview of ${appName}`}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="border-t border-outline-mid bg-surface-light px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Review your app and make sure everything looks correct.
          </p>
          <div className="flex items-center gap-3">
            {onReportIssue && (
              <button
                onClick={onReportIssue}
                className="flex items-center gap-2 px-4 py-2 bg-surface-dark border border-outline-light rounded-lg text-text-primary hover:bg-surface-light transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Report Issues
              </button>
            )}
            {onAccept && (
              <button
                onClick={onAccept}
                className="flex items-center gap-2 px-6 py-2 bg-accent-yellow text-text-primary rounded-lg font-medium hover:bg-accent-yellow/90 transition-colors"
              >
                <Check className="w-4 h-4" />
                Accept & Go to App
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePreview;

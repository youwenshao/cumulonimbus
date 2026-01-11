'use client';

/**
 * LivePreview Component
 * Displays real-time preview of generated app components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LayoutNode, Schema, GeneratedComponent } from '@/lib/scaffolder-v2/types';
import { generatePreviewHTML, generateSchemaPreviewHTML } from '@/lib/scaffolder-v2/preview';

interface LivePreviewProps {
  conversationId: string;
  schema?: Schema;
  layout?: LayoutNode;
  className?: string;
}

export function LivePreview({ 
  conversationId, 
  schema, 
  layout,
  className = '' 
}: LivePreviewProps) {
  const [components, setComponents] = useState<Map<string, GeneratedComponent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Connect to preview SSE stream
  useEffect(() => {
    if (!conversationId) return;

    const eventSource = new EventSource(`/api/scaffolder-v2/preview/${conversationId}`);

    eventSource.addEventListener('connected', () => {
      console.log('[LivePreview] Connected to preview stream');
    });

    eventSource.addEventListener('component', (event) => {
      try {
        const data = JSON.parse(event.data);
        setComponents(prev => {
          const next = new Map(prev);
          next.set(data.name, {
            name: data.name,
            filename: `${data.name}.tsx`,
            code: data.code,
          });
          return next;
        });
        setProgress(data.progress || 0);
      } catch (err) {
        console.error('[LivePreview] Failed to parse component event:', err);
      }
    });

    eventSource.addEventListener('layout', (event) => {
      try {
        const data = JSON.parse(event.data);
        // Layout updates are handled via props, not SSE
        setProgress(data.progress || 0);
      } catch (err) {
        console.error('[LivePreview] Failed to parse layout event:', err);
      }
    });

    eventSource.addEventListener('complete', () => {
      setIsLoading(false);
      setProgress(100);
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setError(data.error);
      } catch {
        setError('Preview connection error');
      }
      setIsLoading(false);
    });

    eventSource.onerror = () => {
      // Don't show error for normal disconnects
      if (eventSource.readyState === EventSource.CLOSED) {
        return;
      }
      console.error('[LivePreview] SSE connection error');
    };

    return () => {
      eventSource.close();
    };
  }, [conversationId]);

  // Update iframe content when layout or schema changes
  useEffect(() => {
    if (!iframeRef.current) return;

    let html: string;

    if (layout && schema) {
      // Full preview with layout
      html = generatePreviewHTML(layout, components, schema);
    } else if (schema) {
      // Schema-only preview
      html = generateSchemaPreviewHTML(schema);
    } else {
      // Empty state
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0a0a0a;
              color: #666;
              font-family: sans-serif;
            }
          </style>
        </head>
        <body>
          <div>Preview will appear here</div>
        </body>
        </html>
      `;
    }

    // Write to iframe
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [layout, schema, components]);

  return (
    <div className={`live-preview ${className}`}>
      {/* Progress bar */}
      {isLoading && progress > 0 && progress < 100 && (
        <div className="preview-progress">
          <div 
            className="preview-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="preview-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        className="preview-iframe"
        title="App Preview"
        sandbox="allow-scripts"
      />

      <style jsx>{`
        .live-preview {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          background: #0a0a0a;
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-progress {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #333;
          z-index: 10;
        }

        .preview-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #f43f5e, #ec4899);
          transition: width 0.3s ease;
        }

        .preview-error {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          z-index: 10;
        }

        .preview-error button {
          margin-left: auto;
          background: none;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .preview-error button:hover {
          opacity: 1;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background: #0a0a0a;
        }
      `}</style>
    </div>
  );
}

export default LivePreview;

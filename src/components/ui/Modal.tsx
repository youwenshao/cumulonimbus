'use client';

import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'danger';
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'default',
  className,
}: ModalProps) {
  // Prevent scrolling when modal is open
  if (typeof window !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
              />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  'relative w-full max-w-lg overflow-hidden rounded-xl border bg-surface-base shadow-2xl',
                  variant === 'danger' ? 'border-red-500/20' : 'border-outline-mid',
                  className
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                  <div className="space-y-1">
                    <h3 className={cn(
                      "text-xl font-serif font-medium",
                      variant === 'danger' ? 'text-red-500' : 'text-text-primary'
                    )}>
                      {title}
                    </h3>
                    {description && (
                      <p className="text-sm text-text-secondary">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-text-tertiary hover:bg-surface-elevated hover:text-text-primary transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 pt-2">
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="bg-surface-elevated/50 p-6 pt-4 border-t border-outline-light flex justify-end gap-3">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>,
            document.body
          )}
        </Fragment>
      )}
    </AnimatePresence>
  );
}

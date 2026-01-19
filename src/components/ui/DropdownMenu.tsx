'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Context to share close state with items
const DropdownMenuContext = createContext<{ onClose: () => void }>({ onClose: () => {} });

interface DropdownMenuProps {
  trigger: React.ReactNode | ((props: { onClick: (e: React.MouseEvent) => void }) => React.ReactNode);
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  className
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <DropdownMenuContext.Provider value={{ onClose: () => setIsOpen(false) }}>
      <div className="relative inline-block">
        {typeof trigger === 'function'
          ? trigger({ onClick: handleTriggerClick })
          : React.isValidElement(trigger)
          ? React.cloneElement(trigger, {
              onClick: handleTriggerClick,
            } as any)
          : (
            <div onClick={handleTriggerClick}>
              {trigger}
            </div>
          )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.1 }}
              className={cn(
                "absolute z-[100] min-w-[180px] overflow-hidden rounded-xl border border-outline-mid bg-surface-base shadow-xl py-1 mt-1",
                align === 'end' ? 'right-0' : 'left-0',
                className
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  danger?: boolean;
}

export function DropdownItem({ 
  children, 
  icon, 
  danger, 
  className,
  onClick,
  ...props 
}: DropdownItemProps) {
  const { onClose } = useContext(DropdownMenuContext);

  return (
    <button
      onClick={(e) => {
        if (onClick) onClick(e);
        onClose();
      }}
      className={cn(
        "relative flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
        danger 
          ? "text-red-500 hover:bg-red-500/10" 
          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
        className
      )}
      {...props}
    >
      {icon && <span className="h-4 w-4 [&>svg]:w-full [&>svg]:h-full">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-outline-light" />;
}

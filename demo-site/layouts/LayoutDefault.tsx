import React from 'react';
import '../style.css';

export default function LayoutDefault({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen dark">
      {children}
    </div>
  );
}

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'minimal';
  className?: string;
}

export function Logo({ size = 'md', variant = 'default', className }: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const redDot = variant === 'default' ? (
    <span className="relative inline-flex items-center justify-center" style={{ width: '0.6em', height: '0.6em' }}>
      <span className="absolute inset-0 bg-accent-red rounded-full animate-pulse-red"></span>
      <span className="absolute inset-0 bg-accent-red rounded-full opacity-75"></span>
    </span>
  ) : null;

  return (
    <div className={cn('flex items-center font-bold font-sans', sizeClasses[size], className)}>
      <span className="text-white">Cumul</span>
      {redDot}
      <span className="text-white">nimbus</span>
    </div>
  );
}

export default Logo;
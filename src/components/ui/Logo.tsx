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

  // The "i" with a red pulsing dot as its tittle (the dot above the i)
  const styledI = variant === 'default' ? (
    <span className="relative inline-block text-white">
      {/* Red pulsing dot positioned above the dotless i */}
      <span 
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: '0.05em', width: '0.28em', height: '0.28em' }}
      >
        <span className="absolute inset-0 bg-accent-red rounded-full animate-pulse-red"></span>
        <span className="absolute inset-0 bg-accent-red rounded-full opacity-75"></span>
      </span>
      {/* Dotless i (ı) so we use our custom red dot as the tittle */}
      ı
    </span>
  ) : (
    <span className="text-white">i</span>
  );

  return (
    <div className={cn('flex items-center font-bold font-sans', sizeClasses[size], className)}>
      <span className="text-white">Cumulon</span>
      {styledI}
      <span className="text-white">mbus</span>
    </div>
  );
}

export default Logo;
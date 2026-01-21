import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Generates a URL-friendly slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
    .replace(/^-+|-+$/g, '') // Trim leading/trailing -
    .substring(0, 50); // Limit length
}

/**
 * Generates a unique subdomain for an app
 */
export function generateSubdomain(name: string): string {
  const slug = slugify(name) || 'app';
  const shortId = Math.random().toString(36).substring(2, 6);
  return `${slug}-${shortId}`;
}

/**
 * Gets the base domain from a host string
 */
export function getBaseDomain(host: string): string {
  const domains = [
    'cumulonimbus.app',
    'www.cumulonimbus.app',
    'cumulonimbus-silk.vercel.app',
    'localhost:3000'
  ];
  
  // Find the longest matching domain to handle www vs naked domain correctly
  const matches = domains
    .filter(d => host === d || host.endsWith(`.${d}`))
    .sort((a, b) => b.length - a.length);
    
  return matches[0] || process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
}

/**
 * Extracts the subdomain from a host string based on known base domains
 */
export function getSubdomain(host: string): string | null {
  const baseDomain = getBaseDomain(host);
  
  if (host === baseDomain) return null;
  
  const subdomain = host.replace(`.${baseDomain}`, '');
  
  // Ignore 'www' if it's treated as a subdomain but we want it as a base domain
  if (subdomain === 'www') return null;
  
  return subdomain;
}

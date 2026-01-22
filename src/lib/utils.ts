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
 * Known base domains that the app can be served from.
 * These are domains where we host the main application.
 */
const KNOWN_BASE_DOMAINS = [
  'cumulonimbus.app',
  'www.cumulonimbus.app',
  'cumulonimbus-silk.vercel.app',
];

/**
 * Domains that support wildcard subdomains for app hosting.
 * Vercel preview deployments (.vercel.app) don't support wildcards due to SSL limitations.
 */
const WILDCARD_SUPPORTED_DOMAINS = [
  'cumulonimbus.app',
  'www.cumulonimbus.app',
];

/**
 * Gets the base domain from a host string.
 * Handles localhost, known production domains, and Vercel deployments.
 */
export function getBaseDomain(host: string): string {
  // Normalize host by removing port if present
  const normalizedHost = host.split(':')[0];

  // Handle localhost variants
  if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return normalizedHost;
  }

  // Build complete list of domains to check
  const domains = [...KNOWN_BASE_DOMAINS];

  // Add Vercel deployment URLs if present
  if (process.env.VERCEL_URL) {
    domains.push(process.env.VERCEL_URL.split(':')[0]);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    domains.push(process.env.NEXT_PUBLIC_VERCEL_URL.split(':')[0]);
  }
  if (process.env.NEXT_PUBLIC_DOMAIN) {
    domains.push(process.env.NEXT_PUBLIC_DOMAIN.split(':')[0]);
  }
  
  // Find the longest matching domain to handle www vs naked domain correctly
  const matches = domains
    .filter(d => d && (normalizedHost === d || normalizedHost.endsWith(`.${d}`)))
    .sort((a, b) => b.length - a.length);
    
  if (matches.length > 0) {
    return matches[0];
  }

  // Default fallback
  return (process.env.NEXT_PUBLIC_DOMAIN || normalizedHost).split(':')[0];
}

/**
 * Checks if a domain supports wildcard subdomains.
 * Used to determine whether to use subdomain-based or path-based app routing.
 */
export function supportsWildcardSubdomains(domain: string): boolean {
  const normalizedDomain = domain.split(':')[0];

  // Localhost always supports subdomains for development
  if (normalizedDomain === 'localhost' || normalizedDomain === '127.0.0.1') {
    return true;
  }

  // Check against known wildcard-supporting domains
  return WILDCARD_SUPPORTED_DOMAINS.some(d => normalizedDomain === d || normalizedDomain.endsWith(`.${d}`));
}

/**
 * Extracts the subdomain from a host string based on known base domains
 */
export function getSubdomain(host: string): string | null {
  const normalizedHost = host.split(':')[0];
  const baseDomain = getBaseDomain(normalizedHost);
  
  if (normalizedHost === baseDomain) return null;
  
  // Only extract subdomain if the host actually ends with the base domain
  if (!normalizedHost.endsWith(`.${baseDomain}`)) return null;
  
  const subdomain = normalizedHost.slice(0, -(baseDomain.length + 1));
  
  // Ignore 'www' if it's treated as a subdomain but we want it as a base domain
  if (subdomain === 'www') return null;
  
  return subdomain;
}

/**
 * Generates the correct URL for an app based on the current environment.
 * Uses subdomain routing where supported, falls back to path-based routing otherwise.
 */
export function getAppUrl(subdomain: string, host: string): string {
  const normalizedHost = host.split(':')[0];
  const domain = getBaseDomain(normalizedHost);
  const protocol = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? 'http' : 'https';
  
  // Keep the port if we are on localhost
  const domainWithPort = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? host : domain;

  if (supportsWildcardSubdomains(domain)) {
    // Use subdomain-based routing: https://my-app.cumulonimbus.app
    return `${protocol}://${subdomain}.${domainWithPort}`;
  } else {
    // Use path-based routing: https://cumulonimbus-silk.vercel.app/s/my-app
    return `${protocol}://${domainWithPort}/s/${subdomain}`;
  }
}

/**
 * Gets the protocol for a given host (http for localhost, https otherwise)
 */
export function getProtocol(host: string): string {
  const normalizedHost = host.split(':')[0];
  return normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? 'http' : 'https';
}

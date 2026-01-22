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
  'cumulonimbus-silk.vercel.app',
];

/**
 * Domains that support wildcard subdomains for app hosting.
 * Vercel preview deployments (.vercel.app) don't support wildcards due to SSL limitations.
 */
const WILDCARD_SUPPORTED_DOMAINS = [
  'cumulonimbus.app',
];

/**
 * Gets the base domain from a host string.
 * Handles localhost, known production domains, and Vercel deployments.
 * Always returns the naked apex domain (strips www).
 */
export function getBaseDomain(host: string): string {
  // Normalize host by removing port and stripping www. prefix
  let normalizedHost = host.split(':')[0];
  if (normalizedHost.startsWith('www.')) {
    normalizedHost = normalizedHost.slice(4);
  }

  // Handle localhost variants
  if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return normalizedHost;
  }

  // Build complete list of domains to check
  const domains = [...KNOWN_BASE_DOMAINS];

  // Add Vercel deployment URLs if present (also stripped of www if they had it)
  const vercelUrl = (process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || '').split(':')[0];
  if (vercelUrl) {
    const strippedVercel = vercelUrl.startsWith('www.') ? vercelUrl.slice(4) : vercelUrl;
    domains.push(strippedVercel);
  }
  
  const publicDomain = (process.env.NEXT_PUBLIC_DOMAIN || '').split(':')[0];
  if (publicDomain) {
    const strippedPublic = publicDomain.startsWith('www.') ? publicDomain.slice(4) : publicDomain;
    domains.push(strippedPublic);
  }
  
  // Find the longest matching domain
  const matches = domains
    .filter(d => d && (normalizedHost === d || normalizedHost.endsWith(`.${d}`)))
    .sort((a, b) => b.length - a.length);
    
  if (matches.length > 0) {
    return matches[0];
  }

  // Default fallback
  return normalizedHost;
}

/**
 * Checks if a domain supports wildcard subdomains.
 * Used to determine whether to use subdomain-based or path-based app routing.
 * 
 * NOTE: Currently disabled to avoid DNS and SSL wildcard certificate issues.
 * All domains now use path-based routing (/s/app-id) instead of subdomains.
 */
export function supportsWildcardSubdomains(domain: string): boolean {
  // Always return false to use path-based routing for all domains
  return false;
}

/**
 * Extracts the subdomain from a host string based on known base domains
 */
export function getSubdomain(host: string): string | null {
  const normalizedHost = host.split(':')[0];
  const baseDomain = getBaseDomain(normalizedHost);
  
  // If the host is exactly the base domain (or www.base domain), there's no app subdomain
  if (normalizedHost === baseDomain || normalizedHost === `www.${baseDomain}`) return null;
  
  // Only extract subdomain if the host actually ends with the base domain
  if (!normalizedHost.endsWith(`.${baseDomain}`)) return null;
  
  // Extract everything before the base domain (including the dot)
  // e.g., app.www.cumulonimbus.app -> app.www
  const prefix = normalizedHost.slice(0, -(baseDomain.length + 1));
  
  // If the prefix ends with .www, strip it
  // e.g., app.www -> app
  if (prefix.endsWith('.www')) {
    return prefix.slice(0, -4);
  }
  
  // If the prefix is just www, it's not an app subdomain
  if (prefix === 'www') return null;
  
  return prefix;
}

/**
 * Generates the correct URL for an app based on the current environment.
 * Always uses path-based routing (/s/app-id) to avoid DNS and SSL wildcard issues.
 */
export function getAppUrl(subdomain: string, host: string): string {
  const normalizedHost = host.split(':')[0];
  let domain = getBaseDomain(normalizedHost);
  const protocol = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? 'http' : 'https';
  
  // Ensure we use the naked domain
  if (domain.startsWith('www.')) {
    domain = domain.slice(4);
  }

  // Keep the port if we are on localhost
  const domainWithPort = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? host : domain;

  // Always use path-based routing: https://domain.com/s/my-app
  return `${protocol}://${domainWithPort}/s/${subdomain}`;
}

/**
 * Gets the protocol for a given host (http for localhost, https otherwise)
 */
export function getProtocol(host: string): string {
  const normalizedHost = host.split(':')[0];
  return normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' ? 'http' : 'https';
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getBaseDomain, getSubdomain } from '@/lib/utils';

/**
 * Middleware for centralized authentication and route protection
 * and Nebula subdomain routing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const domain = getBaseDomain(host);

  // --- Demo Subdomain Routing ---
  const subdomain = getSubdomain(host);
  const isDemoSubdomain = subdomain === 'demo';
  
  if (isDemoSubdomain && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    // For the demo subdomain, we serve the static site from public/demo-static
    // We rewrite to the index.html or the specific path (including assets)
    const url = new URL(`/demo-static${pathname === '/' ? '/index.html' : pathname}`, request.url);
    return NextResponse.rewrite(url);
  }

  // --- Nebula Routing (Subdomain or Path-based fallback for Vercel) ---
  // Subdomain is any subdomain that isn't 'www' or 'demo'
  const isAppSubdomain = subdomain && subdomain !== 'www' && subdomain !== 'demo';
  const isPathRouting = host === domain && pathname.startsWith('/s/');
  
  if ((isAppSubdomain || isPathRouting) && !pathname.startsWith('/api/nebula/serve') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/_next')) {
    let appId = '';
    let originalPath = pathname;

    if (isAppSubdomain) {
      appId = subdomain;
    } else {
      // Path format: /s/my-app/some-page -> appId: my-app, originalPath: /some-page
      const parts = pathname.split('/');
      appId = parts[2];
      originalPath = '/' + parts.slice(3).join('/') || '/';
    }
    
    // Construct the rewrite URL
    const url = request.nextUrl.clone();
    url.pathname = '/api/nebula/serve';
    url.searchParams.set('appId', appId);
    url.searchParams.set('originalPath', originalPath);
    
    return NextResponse.rewrite(url);
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/api/auth',
    '/api/nebula/serve', // Allow Nebula serving to be accessible (internally it handles its own security)
    '/demo-static', // Allow access to static demo assets
  ];

  // Check if the path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  ) || pathname.endsWith('.js') || pathname.endsWith('.css');

  // Allow public routes without authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no token, redirect to signin
    if (!token) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    // User is authenticated, allow access
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware authentication error:', error);
    
    // If authentication check fails (e.g., database down), redirect to error page
    const url = new URL('/auth/error', request.url);
    url.searchParams.set('error', 'Configuration');
    return NextResponse.redirect(url);
  }
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|demo-static|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

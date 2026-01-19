import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware for centralized authentication and route protection
 * and Nebula subdomain routing.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';

  // #region agent log hypothesis_3
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts',message:'Incoming request',data:{host,pathname,url:request.url,cookies:request.cookies.getAll().map(c => c.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  // --- Nebula Subdomain Routing ---
  const isSubdomain = host !== domain && host.endsWith(`.${domain}`);
  
  if (isSubdomain && !pathname.startsWith('/api/nebula/serve') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/_next')) {
    const subdomain = host.split('.')[0];
    
    // Construct the rewrite URL to the main domain
    const url = new URL(`/api/nebula/serve`, `http://${domain}`);
    url.searchParams.set('appId', subdomain);
    url.searchParams.set('originalPath', pathname);
    
    // #region agent log hypothesis_3
    fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts',message:'Rewriting subdomain request',data:{from:host + pathname,to:url.toString(),subdomain},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

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
  ];

  // Check if the path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

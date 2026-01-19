import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware for centralized authentication and route protection
 * Protects all /(main) routes and API routes except public ones
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/api/auth',
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

import { NextRequest, NextResponse } from 'next/server';
import { nebulaSupervisor } from '@/lib/nebula/supervisor';
import { getSubdomain } from '@/lib/utils';

// Use Node.js runtime for esbuild compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { appId?: string } }
) {
  // This route is called after middleware rewrites it with appId and originalPath in searchParams
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  
  // Try multiple sources for appId (in order of priority):
  // 1. request.nextUrl.searchParams - Next.js rewrite URL
  // 2. url.searchParams - standard URL
  // 3. Subdomain extraction from host
  let appId = request.nextUrl.searchParams.get('appId') 
           || url.searchParams.get('appId');

  // Fallback: If appId is missing but we're on a subdomain, extract from host
  // This handles direct access to the API route without middleware rewrite
  if (!appId) {
    appId = getSubdomain(host);
  }

  // Fallback: Extract from path for /s/[appId] routing if middleware rewrite params are lost
  if (!appId && url.pathname.startsWith('/s/')) {
    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      appId = parts[2];
      // Also attempt to recover originalPath
      // /s/appId/foo -> /foo
      const originalPath = '/' + parts.slice(3).join('/') || '/';
      // If originalPath wasn't passed via params, we might want to set it here, 
      // though the payload construction later uses url.searchParams.get('originalPath') || url.pathname
      // We might need to fix that too.
    }
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && !appId) {
    console.log(`🔍 Nebula Serve Debug:`, {
      requestUrl: request.url,
      nextUrl: request.nextUrl.toString(),
      nextUrlSearchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      urlSearchParams: Object.fromEntries(url.searchParams.entries()),
      host,
      subdomain: getSubdomain(host),
    });
  }

  if (!appId) {
    return NextResponse.json({ error: 'App ID required' }, { status: 400 });
  }

  try {
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (e) {
        console.warn('Failed to read request body');
      }
    }

    const path = url.searchParams.get('originalPath') || (url.pathname.startsWith('/s/') ? '/' + url.pathname.split('/').slice(3).join('/') : url.pathname) || '/';

    const payload = {
      method: request.method,
      path: path,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    };

    const response = await nebulaSupervisor.request(appId, payload);

    if (response.error) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    // Determine Content-Type based on path
    let contentType = response.headers?.['Content-Type'] || response.headers?.['content-type'];
    if (!contentType) {
      const originalPath = url.searchParams.get('originalPath') || (url.pathname.startsWith('/s/') ? '/' + url.pathname.split('/').slice(3).join('/') : url.pathname) || '/';
      if (originalPath.endsWith('.js')) contentType = 'application/javascript';
      else if (originalPath.endsWith('.css')) contentType = 'text/css';
      else if (originalPath.endsWith('.png')) contentType = 'image/png';
      else if (originalPath.endsWith('.jpg') || originalPath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (originalPath.endsWith('.svg')) contentType = 'image/svg+xml';
      else if (originalPath.endsWith('.json')) contentType = 'application/json';
      else contentType = 'text/html';
    }

    // Nebula apps return a simplified response object
    // { status, body, headers }
    return new Response(response.body, {
      status: response.status || 200,
      headers: {
        ...response.headers,
        'Content-Type': contentType,
      },
    });
  } catch (error: any) {
    console.error(`Nebula Serve Error [${appId}]:`, error);
    
    // Provide more detailed error in development
    const isDev = process.env.NODE_ENV === 'development';
    const errorMessage = isDev 
      ? `Nebula Service Error: ${error.message}` 
      : 'Nebula Service Unavailable';
    
    return NextResponse.json({ 
      error: errorMessage,
      ...(isDev && { stack: error.stack })
    }, { status: 503 });
  }
}

// Support other methods
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

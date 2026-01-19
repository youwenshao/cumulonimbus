import { NextRequest, NextResponse } from 'next/server';
import { nebulaSupervisor } from '@/lib/nebula/supervisor';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { appId?: string } }
) {
  // This route is called after middleware rewrites it
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
  
  let appId = url.searchParams.get('appId');

  // Fallback: If appId is missing but we're on a subdomain, use the subdomain
  if (!appId && host !== domain && host.endsWith(`.${domain}`)) {
    appId = host.split('.')[0];
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

    const path = url.searchParams.get('originalPath') || url.pathname;

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
      const originalPath = url.searchParams.get('originalPath') || url.pathname;
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
    return NextResponse.json({ error: 'Nebula Service Unavailable' }, { status: 503 });
  }
}

// Support other methods
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

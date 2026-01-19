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

  // #region agent log hypothesis_4
  fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'serve/route.ts',message:'Processing request',data:{appId,host,url:request.url,searchParams:Object.fromEntries(url.searchParams.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (!appId) {
    return NextResponse.json({ error: 'App ID required' }, { status: 400 });
  }

  try {
    const payload = {
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries()),
    };

    const response = await nebulaSupervisor.request(appId, payload);

    // #region agent log hypothesis_4
    fetch('http://127.0.0.1:7243/ingest/abdc0eda-3bc5-4723-acde-13a524455249',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'serve/route.ts',message:'Response from supervisor',data:{appId,responseStatus:response.status,hasBody:!!response.body,bodyLength:response.body?.length,error:response.error},timestamp:Date.now(),sessionId:'debug-session',runId:'subdomain-fix',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    if (response.error) {
      return NextResponse.json({ error: response.error }, { status: 500 });
    }

    // Determine Content-Type based on path
    let contentType = 'text/html';
    const originalPath = url.searchParams.get('originalPath') || url.pathname;
    if (originalPath.endsWith('.js')) contentType = 'application/javascript';
    else if (originalPath.endsWith('.css')) contentType = 'text/css';
    else if (originalPath.endsWith('.png')) contentType = 'image/png';
    else if (originalPath.endsWith('.jpg') || originalPath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (originalPath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (originalPath.endsWith('.json')) contentType = 'application/json';

    // Nebula apps return a simplified response object
    // { status, body, headers }
    return new Response(response.body, {
      status: response.status || 200,
      headers: {
        'Content-Type': contentType,
        ...response.headers,
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

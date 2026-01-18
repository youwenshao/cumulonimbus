
import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeManager } from '@/lib/runtime-manager/instance';

export const dynamic = 'force-dynamic';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { appId: string; path: string[] } }
) {
  const { appId, path } = params;
  const manager = getRuntimeManager();
  
  // 1. Find environment
  const env = await manager.getEnvironmentByAppId(appId);
  
  if (!env || !env.url) {
    return NextResponse.json(
      { error: 'Runtime environment not available' },
      { status: 503 }
    );
  }

  // 2. Construct target URL
  const targetPath = path.join('/');
  const searchParams = request.nextUrl.search;
  const targetUrl = `${env.url}/${targetPath}${searchParams}`;

  try {
    // 3. Forward request
    // We need to exclude some headers that might conflict (host, connection, etc)
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    
    // Create body for non-GET/HEAD methods
    const body = (request.method !== 'GET' && request.method !== 'HEAD') 
      ? await request.blob() 
      : undefined;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // @ts-ignore - Next.js fetch extension for revalidation
      next: { revalidate: 0 }
    });

    // 4. Return response
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to runtime' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: any) { return proxyRequest(req, ctx); }
export async function POST(req: NextRequest, ctx: any) { return proxyRequest(req, ctx); }
export async function PUT(req: NextRequest, ctx: any) { return proxyRequest(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any) { return proxyRequest(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any) { return proxyRequest(req, ctx); }

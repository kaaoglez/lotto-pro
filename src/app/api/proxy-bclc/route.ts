import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Proxy for BCLC ZIP downloads.
 * Client-side fetcher uses this to download ZIP files from BCLC
 * (which may not have CORS headers for direct browser access).
 *
 * Only allows BCLC domains for security.
 */
const ALLOWED_DOMAINS = [
  'www.playnow.com',
  'playnow.com',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Security: only allow BCLC domains
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    console.log('[proxy-bclc] Fetching:', url.substring(0, 80));
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LottoDashboard/1.0',
        'Accept': 'application/zip, application/octet-stream, */*',
      },
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      console.error('[proxy-bclc] HTTP error:', response.status);
      return NextResponse.json({ error: `Upstream HTTP ${response.status}` }, { status: response.status });
    }

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=600', // Cache 10 min
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('[proxy-bclc] Fetch error:', String(e).substring(0, 120));
    return NextResponse.json({ error: 'Failed to fetch from BCLC' }, { status: 502 });
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

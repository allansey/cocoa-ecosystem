import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const streamUrl = searchParams.get('url') || 'http://192.168.137.164:81/stream';

  try {
    const upstreamRes = await fetch(streamUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'multipart/x-mixed-replace, image/*',
        'User-Agent': 'CocoaEcosystem-Proxy/1.0',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new Response('Could not connect to camera stream', { status: 502 });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame';

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(`Camera Stream Error: ${err.message}`, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const streamUrl = searchParams.get('url') || 'http://192.168.137.164:81/stream';

  // 1. Try single frame capture endpoint first (/capture)
  const captureUrl = streamUrl.replace(':81/stream', '/capture').replace('/stream', '/capture');
  
  try {
    const res = await fetch(captureUrl, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(2500)
    });

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 1000) {
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }
  } catch {
    // Fallback to reading frame from stream
  }

  // 2. Try grabbing 1 frame from MJPEG stream
  try {
    const streamRes = await fetch(streamUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });

    if (streamRes.ok && streamRes.body) {
      const reader = streamRes.body.getReader();
      let chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (totalBytes < 500000) {
        const { value, done } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalBytes += value.length;

        // Check for JPEG SOI (0xFF, 0xD8) and EOI (0xFF, 0xD9)
        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const c of chunks) {
          combined.set(c, offset);
          offset += c.length;
        }

        let start = -1;
        let end = -1;
        for (let i = 0; i < combined.length - 1; i++) {
          if (combined[i] === 0xFF && combined[i + 1] === 0xD8 && start === -1) {
            start = i;
          }
          if (combined[i] === 0xFF && combined[i + 1] === 0xD9 && start !== -1) {
            end = i + 2;
            break;
          }
        }

        if (start !== -1 && end !== -1 && end > start) {
          reader.cancel();
          const jpegSlice = combined.slice(start, end);
          return new NextResponse(jpegSlice, {
            status: 200,
            headers: {
              'Content-Type': 'image/jpeg',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Could not fetch frame: ${err.message}` }, { status: 502 });
  }

  return NextResponse.json({ error: 'No valid JPEG frame extracted from camera' }, { status: 502 });
}

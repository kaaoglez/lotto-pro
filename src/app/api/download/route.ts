import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'download', 'lotto-pro-complete.zip');
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="lotto-pro-complete.zip"',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('[download] Error:', e);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

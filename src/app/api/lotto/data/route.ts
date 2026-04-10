import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';

export async function GET() {
  try {
    const draws = await getAllDraws(false);
    const frequency: { number: number; frequency: number }[] = [];
    for (let i = 1; i <= 50; i++) frequency.push({ number: i, frequency: 0 });
    for (const draw of draws) { for (const n of draw.numbers) frequency[n - 1].frequency++; }

    return NextResponse.json({
      totalMainDraws: draws.length,
      dateRange: { start: draws[draws.length - 1]?.drawDate || '', end: draws[0]?.drawDate || '' },
      lastDraw: draws[0],
      recentDraws: draws.slice(0, 30),
      frequency,
    });
  } catch (e) {
    console.error('[data] Error:', e);
    return NextResponse.json({ error: 'No se pudo leer la base de datos' }, { status: 500 });
  }
}

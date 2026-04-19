import { NextResponse } from 'next/server';
import { getAllMaxDraws } from '@/lib/lotto-max-store';

export async function GET() {
  try {
    const draws = await getAllMaxDraws(true);

    const frequency: { number: number; frequency: number }[] = [];
    for (let i = 1; i <= 52; i++) frequency.push({ number: i, frequency: 0 });
    for (const draw of draws) { for (const n of draw.numbers) frequency[n - 1].frequency++; }

    return NextResponse.json({
      success: true,
      totalDraws: draws.length,
      totalMainDraws: draws.length,
      currentLastDraw: draws[0].drawNumber,
      currentLastDrawDate: draws[0].drawDate,
      lastDraw: { drawNumber: draws[0].drawNumber, drawDate: draws[0].drawDate, numbers: draws[0].numbers, bonus: draws[0].bonus },
      dateRange: { start: draws[draws.length - 1]?.drawDate || '', end: draws[0]?.drawDate || '' },
      recentDraws: draws.slice(0, 30),
      frequency,
      newDrawsCount: 0,
      newDraws: [],
      source: 'BCLC Official',
    });
  } catch (err) {
    return NextResponse.json({ error: 'No se pudieron obtener datos. Intenta de nuevo.' }, { status: 500 });
  }
}

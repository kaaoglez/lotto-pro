import { NextResponse } from 'next/server';
import { getAll649Draws } from '@/lib/lotto-649-store';

export async function GET() {
  try {
    const draws = await getAll649Draws(true);

    const numberFrequency: Record<string, number> = {};
    const bonusFrequency: Record<string, number> = {};
    for (let i = 1; i <= 49; i++) { numberFrequency[String(i)] = 0; bonusFrequency[String(i)] = 0; }
    const oddEvenStats: Record<string, number> = {};
    let withPairs = 0, withTriples = 0;
    for (const draw of draws) {
      for (const n of draw.numbers) numberFrequency[String(n)]++;
      bonusFrequency[String(draw.bonus)]++;
      const odd = draw.numbers.filter(n => n % 2 === 1).length;
      const key = `${odd}/${6 - odd}`;
      oddEvenStats[key] = (oddEvenStats[key] || 0) + 1;
      let consec = 0;
      for (let i = 1; i < draw.numbers.length; i++) { if (draw.numbers[i] === draw.numbers[i - 1] + 1) consec++; }
      if (consec >= 1) withPairs++;
      if (consec >= 2) withTriples++;
    }
    const topHot = Object.entries(numberFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, f]) => [parseInt(n), f] as [number, number]);
    const topCold = Object.entries(numberFrequency).sort((a, b) => a[1] - b[1]).slice(0, 10).map(([n, f]) => [parseInt(n), f] as [number, number]);

    return NextResponse.json({
      success: true,
      totalDraws: draws.length,
      totalMainDraws: draws.length,
      currentLastDraw: draws[0].drawNumber,
      currentLastDrawDate: draws[0].drawDate,
      lastDraw: { drawNumber: draws[0].drawNumber, drawDate: draws[0].drawDate, numbers: draws[0].numbers, bonus: draws[0].bonus },
      dateRange: { start: draws[draws.length - 1]?.drawDate || '', end: draws[0]?.drawDate || '' },
      numberFrequency, bonusFrequency, topHotNumbers: topHot, topColdNumbers: topCold,
      consecutiveStats: { withPairs, withTriples, percentWithPair: +(withPairs / draws.length * 100).toFixed(1) },
      oddEvenStats,
      newDrawsCount: 0,
      newDraws: [],
      source: 'BCLC Official',
    });
  } catch (err) {
    return NextResponse.json({ error: 'No se pudieron obtener datos. Intenta de nuevo.' }, { status: 500 });
  }
}

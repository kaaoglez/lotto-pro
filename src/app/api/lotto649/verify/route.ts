import { NextResponse } from 'next/server';
import { getAll649Draws } from '@/lib/lotto-649-store';

export async function POST(req: Request) {
  try {
    const { numbers } = await req.json();
    if (!Array.isArray(numbers) || numbers.length !== 6) return NextResponse.json({ error: 'Se necesitan 6 numeros' }, { status: 400 });

    const draws = await getAll649Draws();
    const sorted = [...numbers].sort((a, b) => a - b);
    const numSet = new Set(sorted);
    const summary: Record<number, number> = {};
    let bestMatches: { drawNumber: number; drawDate: string; matches: number; drawnNumbers: number[]; bonus: number; bonusMatch: boolean }[] = [];

    for (const draw of draws) {
      const matches = draw.numbers.filter(n => numSet.has(n)).length;
      summary[matches] = (summary[matches] || 0) + 1;
      if (matches >= 3) {
        bestMatches.push({ drawNumber: draw.drawNumber, drawDate: draw.drawDate, matches, drawnNumbers: draw.numbers, bonus: draw.bonus, bonusMatch: numSet.has(draw.bonus) });
      }
    }

    bestMatches.sort((a, b) => b.matches - a.matches || a.drawNumber - b.drawNumber);
    const topBest = bestMatches.slice(0, 10);

    return NextResponse.json({
      numbers: sorted, totalChecked: draws.length, summary,
      bestMatches: topBest, bestMatchCount: topBest.length > 0 ? topBest[0].matches : 0,
    });
  } catch (e) {
    console.error('[verify-649] Error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
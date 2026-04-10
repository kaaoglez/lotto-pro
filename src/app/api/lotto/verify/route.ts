import { NextRequest, NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { numbers: number[]; draws?: string };
    const { numbers } = body;

    if (!numbers || numbers.length !== 7) {
      return NextResponse.json({ error: 'Ingresa exactamente 7 números' }, { status: 400 });
    }

    const allDraws = await getAllDraws();
    const userSet = new Set(numbers);
    const summary = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const results: { drawNumber: number; drawDate: string; matches: number; drawnNumbers: number[]; bonus: number; bonusMatch: boolean }[] = [];

    for (const draw of allDraws) {
      const matches = draw.numbers.filter(n => userSet.has(n)).length;
      if (matches >= 4) {
        summary[matches as keyof typeof summary]++;
        results.push({ drawNumber: draw.drawNumber, drawDate: draw.drawDate, matches, drawnNumbers: draw.numbers, bonus: draw.bonus, bonusMatch: userSet.has(draw.bonus) });
      }
    }

    results.sort((a, b) => b.matches - a.matches || b.drawDate.localeCompare(a.drawDate));

    return NextResponse.json({
      numbers, totalChecked: allDraws.length, summary,
      bestMatches: results.slice(0, 50), bestMatchCount: results[0]?.matches || 0,
    });
  } catch (e) {
    console.error('[verify] Error:', e);
    return NextResponse.json({ error: 'Error en la verificación' }, { status: 500 });
  }
}

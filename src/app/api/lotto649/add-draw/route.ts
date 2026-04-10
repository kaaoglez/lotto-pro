import { NextRequest, NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-649-store';
import fs from 'fs';
import path from 'path';

function isWritable(): boolean {
  try { fs.accessSync(process.cwd(), fs.constants.W_OK); return true; } catch { return false; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draws } = body as { draws: { drawDate: string; numbers: number[]; bonus: number }[] };

    if (!draws || !Array.isArray(draws) || draws.length === 0) {
      return NextResponse.json({ error: 'Envía un array de sorteos en "draws"' }, { status: 400 });
    }

    if (!isWritable()) {
      return NextResponse.json({ error: 'No se pueden agregar sorteos en este entorno. Usa "Actualizar desde BCLC" para obtener los datos más recientes.' }, { status: 503 });
    }

    const dataPath = path.join(process.cwd(), 'public', 'lotto649-data.json');
    const existingDraws = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const existingDates = new Set(existingDraws.map((d: any) => d.drawDate));
    let nextDrawNumber = existingDraws[0]?.drawNumber ? existingDraws[0].drawNumber + 1 : 1;
    const added = [];

    for (const draw of draws) {
      if (!draw.drawDate || !draw.numbers || draw.bonus == null) {
        return NextResponse.json({ error: 'Cada sorteo necesita drawDate, numbers (6) y bonus' }, { status: 400 });
      }
      if (draw.numbers.length !== 6) {
        return NextResponse.json({ error: `El sorteo ${draw.drawDate} debe tener 6 números` }, { status: 400 });
      }
      if (draw.numbers.some(n => n < 1 || n > 49)) {
        return NextResponse.json({ error: `Números fuera de rango en sorteo ${draw.drawDate}` }, { status: 400 });
      }
      if (new Set(draw.numbers).size !== 6) {
        return NextResponse.json({ error: `Números duplicados en sorteo ${draw.drawDate}` }, { status: 400 });
      }
      if (existingDates.has(draw.drawDate)) {
        return NextResponse.json({ error: `El sorteo ${draw.drawDate} ya existe en la base de datos` }, { status: 409 });
      }

      existingDates.add(draw.drawDate);
      const newDraw = {
        drawNumber: nextDrawNumber++, sequenceNumber: 0,
        drawDate: draw.drawDate,
        numbers: [...draw.numbers].sort((a, b) => a - b),
        bonus: draw.bonus,
      };
      added.push(newDraw);
    }

    const updatedDraws = [...added, ...existingDraws];

    const numberFrequency: Record<string, number> = {};
    const bonusFrequency: Record<string, number> = {};
    for (let i = 1; i <= 49; i++) { numberFrequency[String(i)] = 0; bonusFrequency[String(i)] = 0; }
    const oddEvenStats: Record<string, number> = {};
    let withPairs = 0, withTriples = 0;
    for (const draw of updatedDraws) {
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

    const summary = {
      totalMainDraws: updatedDraws.length,
      dateRange: { start: updatedDraws[updatedDraws.length - 1].drawDate, end: updatedDraws[0].drawDate },
      lastDraw: updatedDraws[0], numberFrequency, bonusFrequency, topHotNumbers: topHot, topColdNumbers: topCold,
      consecutiveStats: { withPairs, withTriples, percentWithPair: +(withPairs / updatedDraws.length * 100).toFixed(1) },
      oddEvenStats,
    };

    fs.writeFileSync(dataPath, JSON.stringify(updatedDraws, null, 2), 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'public', 'lotto649-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

    return NextResponse.json({ success: true, added: added.length, newTotal: updatedDraws.length, lastDraw: added[0] });
  } catch (err) {
    console.error('[add-draw-649] Error:', err);
    return NextResponse.json({ error: 'Error interno al agregar sorteos' }, { status: 500 });
  }
}

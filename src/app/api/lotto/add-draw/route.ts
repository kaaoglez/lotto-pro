import { NextRequest, NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';
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

    const dataPath = path.join(process.cwd(), 'public', 'lotto-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const existingDraws = data.allMainDraws;

    const existingDates = new Set(existingDraws.map(d => d.drawDate));
    let nextDrawNumber = existingDraws[0]?.drawNumber ? existingDraws[0].drawNumber + 1 : 1;
    const added = [];

    for (const draw of draws) {
      if (!draw.drawDate || !draw.numbers || !draw.bonus) {
        return NextResponse.json({ error: 'Cada sorteo necesita drawDate, numbers (7) y bonus' }, { status: 400 });
      }
      if (draw.numbers.length !== 7) {
        return NextResponse.json({ error: `El sorteo ${draw.drawDate} debe tener 7 números` }, { status: 400 });
      }
      if (draw.numbers.some(n => n < 1 || n > 52)) {
        return NextResponse.json({ error: `Números fuera de rango en sorteo ${draw.drawDate}` }, { status: 400 });
      }
      if (new Set(draw.numbers).size !== 7) {
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
    const frequency = [];
    for (let i = 1; i <= 52; i++) frequency.push({ number: i, frequency: 0 });
    for (const draw of updatedDraws) { for (const n of draw.numbers) frequency[n - 1].frequency++; }

    const summary = {
      totalMainDraws: updatedDraws.length,
      dateRange: { start: updatedDraws[updatedDraws.length - 1].drawDate, end: updatedDraws[0].drawDate },
      lastDraw: updatedDraws[0],
      recentDraws: updatedDraws.slice(0, 30),
      frequency,
    };
    const fullData = { ...summary, allMainDraws: updatedDraws };

    fs.writeFileSync(dataPath, JSON.stringify(fullData, null, 2), 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'public', 'lotto-summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

    return NextResponse.json({ success: true, added: added.length, newTotal: updatedDraws.length, lastDraw: added[0] });
  } catch (err) {
    console.error('Error adding draws:', err);
    return NextResponse.json({ error: 'Error interno al agregar sorteos' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const draws = await getAllDraws();
    return NextResponse.json({
      totalDraws: draws.length,
      lastDrawDate: draws[0]?.drawDate,
      firstDrawDate: draws[draws.length - 1]?.drawDate,
      lastDrawNumber: draws[0]?.drawNumber,
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo leer la base de datos' }, { status: 500 });
  }
}

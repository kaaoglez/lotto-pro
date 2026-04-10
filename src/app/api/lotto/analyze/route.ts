import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';

export async function POST(request: NextRequest) {
  try {
    const { numbers } = await request.json() as { numbers: number[] };

    if (!numbers || numbers.length !== 7) {
      return NextResponse.json({ error: 'Ingresa exactamente 7 números' }, { status: 400 });
    }
    if (numbers.some(n => n < 1 || n > 50)) {
      return NextResponse.json({ error: 'Números deben estar entre 1 y 50' }, { status: 400 });
    }
    if (new Set(numbers).size !== 7) {
      return NextResponse.json({ error: 'Los números deben ser únicos' }, { status: 400 });
    }

    const allDraws = await getAllDraws();

    const sorted = [...numbers].sort((a, b) => a - b);
    const rules: { name: string; value: string; status: 'ok' | 'warn' | 'fail'; detail: string }[] = [];
    let score = 0;

    // 1. Suma Total (range 130-210)
    const sum = sorted.reduce((a, b) => a + b, 0);
    const sumOk = sum >= 130 && sum <= 210;
    if (sumOk) score += 20;
    else if (sum >= 110 && sum <= 230) { score += 10; }
    rules.push({
      name: 'Suma Total', value: String(sum),
      status: sumOk ? 'ok' : (sum >= 110 && sum <= 230 ? 'warn' : 'fail'),
      detail: sumOk ? `✓ ${sum} está en rango 130-210` : `✗ ${sum} fuera del rango ideal 130-210`
    });

    // 2. Paridad (3/4 or 4/3)
    const evens = sorted.filter(n => n % 2 === 0).length;
    const odds = 7 - evens;
    const parityStr = `${evens}P / ${odds}I`;
    const parityOk = (evens === 3 || evens === 4);
    if (parityOk) score += 20;
    else if (evens >= 2 && evens <= 5) { score += 10; }
    rules.push({
      name: 'Paridad', value: parityStr,
      status: parityOk ? 'ok' : (evens >= 2 && evens <= 5 ? 'warn' : 'fail'),
      detail: parityOk ? `✓ Balance ideal ${parityStr}` : `✗ Se prefiere 3/4 o 4/3, tienes ${parityStr}`
    });

    // 3. Gaps / Saltos (ideal 5.0 - 9.0)
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapOk = avgGap >= 5.0 && avgGap <= 9.0;
    if (gapOk) score += 20;
    else if (avgGap >= 4.0 && avgGap <= 10.0) { score += 10; }
    rules.push({
      name: 'Salto Promedio', value: avgGap.toFixed(1),
      status: gapOk ? 'ok' : (avgGap >= 4.0 && avgGap <= 10.0 ? 'warn' : 'fail'),
      detail: gapOk ? `✓ Gap ${avgGap.toFixed(1)} en rango 5.0-9.0` : `✗ Gap ${avgGap.toFixed(1)} fuera del rango ideal 5.0-9.0`
    });

    // 4. Consecutivos (max 1 pair)
    let consecPairs = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) consecPairs++;
    }
    const consecOk = consecPairs <= 1;
    if (consecOk) score += 20;
    else if (consecPairs === 2) { score += 10; }
    rules.push({
      name: 'Consecutivos', value: consecPairs === 0 ? 'Ninguno' : `${consecPairs} par(es)`,
      status: consecOk ? 'ok' : (consecPairs === 2 ? 'warn' : 'fail'),
      detail: consecOk ? `✓ Máximo 1 par consecutivo` : `✗ Demasiados consecutivos (${consecPairs} pares)`
    });

    // 5. Sectores / Décadas (min 4/5)
    const sectors = [0, 0, 0, 0, 0];
    for (const n of sorted) sectors[Math.min(4, Math.floor((n - 1) / 10))]++;
    const covered = sectors.filter(s => s > 0).length;
    const sectorOk = covered >= 4;
    if (sectorOk) score += 20;
    else if (covered === 3) { score += 8; }
    rules.push({
      name: 'Sectores', value: `${covered}/5 [${sectors.join('-')}]`,
      status: sectorOk ? 'ok' : (covered === 3 ? 'warn' : 'fail'),
      detail: sectorOk ? `✓ ${covered}/5 sectores cubiertos` : `✗ Se requieren mínimo 4/5, tienes ${covered}/5`
    });

    // Bonus: check repeat with last draw
    const lastDraw = allDraws[0];
    const repeats = sorted.filter(n => lastDraw.numbers.includes(n)).length;
    const repeatInfo = repeats > 0
      ? `${repeats} número(s) repetido(s) del último sorteo: [${sorted.filter(n => lastDraw.numbers.includes(n)).join(',')}]`
      : 'Sin números repetidos del último sorteo';

    score = Math.min(100, score);
    const isMasterpiece = score >= 85;

    return NextResponse.json({
      numbers: sorted, dnaScore: score, isMasterpiece, rules, repeatInfo,
      bonusNumber: lastDraw.bonus, lastDrawDate: lastDraw.drawDate, lastDrawNumbers: lastDraw.numbers,
    });
  } catch (e) {
    console.error('[analyze] Error:', e);
    return NextResponse.json({ error: 'Error en el análisis' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';

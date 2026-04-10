import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-649-store';

interface DiagRule { name: string; value: string; status: 'ok' | 'warn' | 'fail'; detail: string }

function calcDNA(nums: number[]): { score: number; rules: DiagRule[] } {
  const rules: DiagRule[] = [];
  let score = 0;

  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum >= 100 && sum <= 175) { score += 25; rules.push({ name: 'Suma', value: String(sum), status: 'ok', detail: 'Rango ideal 100-175' }); }
  else if (sum >= 85 && sum <= 200) { score += 15; rules.push({ name: 'Suma', value: String(sum), status: 'warn', detail: 'Fuera del rango optimo (100-175)' }); }
  else { score += 5; rules.push({ name: 'Suma', value: String(sum), status: 'fail', detail: 'Suma extrema, baja probabilidad' }); }

  const odd = nums.filter(n => n % 2 === 1).length;
  const even = 6 - odd;
  const parityKey = `${odd}/${even}`;
  if (['3/3', '4/2', '2/4'].includes(parityKey)) { score += 20; rules.push({ name: 'Paridad', value: `${odd} Imp / ${even} Par`, status: 'ok', detail: 'Distribucion optima' }); }
  else if (['5/1', '1/5'].includes(parityKey)) { score += 10; rules.push({ name: 'Paridad', value: `${odd} Imp / ${even} Par`, status: 'warn', detail: 'Distribucion desbalanceada' }); }
  else { score += 3; rules.push({ name: 'Paridad', value: `${odd} Imp / ${even} Par`, status: 'fail', detail: 'Paridad extrema, muy rara' }); }

  const sorted = [...nums].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap >= 5.0 && avgGap <= 9.0) { score += 20; rules.push({ name: 'Gaps', value: avgGap.toFixed(1), status: 'ok', detail: 'Promedio ideal 5.0-9.0' }); }
  else if (avgGap >= 3.5 && avgGap <= 11.0) { score += 12; rules.push({ name: 'Gaps', value: avgGap.toFixed(1), status: 'warn', detail: 'Fuera del rango optimo (5.0-9.0)' }); }
  else { score += 4; rules.push({ name: 'Gaps', value: avgGap.toFixed(1), status: 'fail', detail: 'Gaps irregulares' }); }

  let consecPairs = 0;
  for (let i = 0; i < sorted.length - 1; i++) { if (sorted[i + 1] - sorted[i] === 1) consecPairs++; }
  if (consecPairs === 0 || consecPairs === 1) { score += 15; rules.push({ name: 'Consecutivos', value: consecPairs === 0 ? 'Ninguno' : '1 par', status: 'ok', detail: 'Maximo 1 par recomendado' }); }
  else if (consecPairs === 2) { score += 8; rules.push({ name: 'Consecutivos', value: '2 pares', status: 'warn', detail: 'Muchos consecutivos' }); }
  else { score += 2; rules.push({ name: 'Consecutivos', value: `${consecPairs} pares`, status: 'fail', detail: 'Exceso de consecutivos' }); }

  const sectors = [0, 0, 0, 0, 0];
  for (const n of nums) { if (n <= 10) sectors[0]++; else if (n <= 20) sectors[1]++; else if (n <= 30) sectors[2]++; else if (n <= 40) sectors[3]++; else sectors[4]++; }
  const activeSectors = sectors.filter(s => s > 0).length;
  if (activeSectors >= 4) { score += 20; rules.push({ name: 'Sectores', value: `${activeSectors}/5`, status: 'ok', detail: 'Buena distribucion' }); }
  else if (activeSectors >= 3) { score += 12; rules.push({ name: 'Sectores', value: `${activeSectors}/5`, status: 'warn', detail: 'Minimo 3 sectores recomendados' }); }
  else { score += 3; rules.push({ name: 'Sectores', value: `${activeSectors}/5`, status: 'fail', detail: 'Muy concentrado en pocos sectores' }); }

  return { score: Math.min(100, score), rules };
}

export async function POST(req: Request) {
  try {
    const { numbers } = await req.json();
    if (!Array.isArray(numbers) || numbers.length !== 6) return NextResponse.json({ error: 'Se necesitan 6 numeros' }, { status: 400 });
    for (const n of numbers) if (typeof n !== 'number' || n < 1 || n > 49) return NextResponse.json({ error: 'Numeros deben estar entre 1 y 49' }, { status: 400 });
    if (new Set(numbers).size !== 6) return NextResponse.json({ error: 'No se permiten duplicados' }, { status: 400 });

    const sorted = [...numbers].sort((a, b) => a - b);
    const { score, rules } = calcDNA(sorted);

    const draws = await getAllDraws();
    const totalDraws = draws.length;
    const lastDraw = draws[0];

    let repeatCount = 0;
    const numKey = sorted.join(',');
    for (const d of draws) {
      if (d.numbers.sort((a, b) => a - b).join(',') === numKey) repeatCount++;
    }

    const repeatInfo = repeatCount === 0
      ? `Esta combinacion NO ha salido en ${totalDraws} sorteos`
      : `Esta combinacion ha salido ${repeatCount} vez(es) en ${totalDraws} sorteos`;

    return NextResponse.json({
      numbers: sorted, dnaScore: score, isMasterpiece: score >= 85, rules, repeatInfo,
      bonusNumber: lastDraw.bonus, lastDrawDate: lastDraw.drawDate, lastDrawNumbers: lastDraw.numbers,
    });
  } catch (e) {
    console.error('[analyze-649] Error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

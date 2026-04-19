import { NextResponse } from 'next/server';
import { getAll649Draws } from '@/lib/lotto-649-store';

interface DrawEntry { numbers: number[]; }

function calcDNA(nums: number[]): number {
  let score = 0;
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum >= 100 && sum <= 175) score += 25;
  else if (sum >= 85 && sum <= 200) score += 15;
  else score += 5;

  const odd = nums.filter(n => n % 2 === 1).length;
  const pk = `${odd}/${6 - odd}`;
  if (['3/3', '4/2', '2/4'].includes(pk)) score += 20;
  else if (['5/1', '1/5'].includes(pk)) score += 10;
  else score += 3;

  const sorted = [...nums].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap >= 5.0 && avgGap <= 9.0) score += 20;
  else if (avgGap >= 3.5 && avgGap <= 11.0) score += 12;
  else score += 4;

  let cp = 0;
  for (let i = 0; i < sorted.length - 1; i++) if (sorted[i + 1] - sorted[i] === 1) cp++;
  if (cp <= 1) score += 15;
  else if (cp === 2) score += 8;
  else score += 2;

  const sectors = [0, 0, 0, 0, 0];
  for (const n of nums) { if (n <= 10) sectors[0]++; else if (n <= 20) sectors[1]++; else if (n <= 30) sectors[2]++; else if (n <= 40) sectors[3]++; else sectors[4]++; }
  const active = sectors.filter(s => s > 0).length;
  if (active >= 4) score += 20;
  else if (active >= 3) score += 12;
  else score += 3;

  return Math.min(100, score);
}

export async function GET() {
  try {
    const draws = await getAll649Draws();
    const existingKeys = new Set(draws.map(d => d.numbers.sort((a, b) => a - b).join(',')));
    const lines: { numbers: number[]; score: number }[] = [];
    let attempts = 0;

    while (lines.length < 5 && attempts < 5000) {
      attempts++;
      const nums = new Set<number>();
      while (nums.size < 6) nums.add(Math.floor(Math.random() * 49) + 1);
      const arr = [...nums].sort((a, b) => a - b);
      const key = arr.join(',');
      if (existingKeys.has(key)) continue;
      const s = calcDNA(arr);
      if (s >= 70) lines.push({ numbers: arr, score: s });
    }

    return NextResponse.json({ generated: lines.length, lines });
  } catch (e) {
    console.error('[generate-649] Error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

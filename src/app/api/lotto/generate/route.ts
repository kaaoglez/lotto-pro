import { NextResponse } from 'next/server';

function evaluateDNA(numbers: number[]): { score: number; ok: boolean } {
  const sorted = [...numbers].sort((a, b) => a - b);
  let score = 0;

  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum >= 130 && sum <= 210) score += 20;
  else if (sum >= 110 && sum <= 230) score += 10;

  const evens = sorted.filter(n => n % 2 === 0).length;
  if (evens === 3 || evens === 4) score += 20;
  else if (evens >= 2 && evens <= 5) score += 10;

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap >= 5.0 && avgGap <= 9.0) score += 20;
  else if (avgGap >= 4.0 && avgGap <= 10.0) score += 10;

  let consecPairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) consecPairs++;
  }
  if (consecPairs <= 1) score += 20;
  else if (consecPairs === 2) score += 10;

  const sectors = [0, 0, 0, 0, 0];
  for (const n of sorted) sectors[Math.min(4, Math.floor((n - 1) / 10))]++;
  const covered = sectors.filter(s => s > 0).length;
  if (covered >= 4) score += 20;
  else if (covered === 3) score += 8;

  return { score: Math.min(100, score), ok: score >= 85 };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOneLine(): number[] {
  const used = new Set<number>();
  while (used.size < 7) {
    used.add(randomInt(1, 52));
  }
  return Array.from(used);
}

export async function GET() {
  const lines: { numbers: number[]; score: number }[] = [];
  const existingSets = new Set<string>();

  let attempts = 0;
  const maxAttempts = 50000;

  while (lines.length < 10 && attempts < maxAttempts) {
    attempts++;
    const nums = generateOneLine();
    const key = nums.join(',');
    if (existingSets.has(key)) continue;

    existingSets.add(key);
    const { score, ok } = evaluateDNA(nums);
    if (ok) {
      lines.push({ numbers: nums.sort((a, b) => a - b), score });
    }
  }

  return NextResponse.json({
    lines,
    attempts,
    generated: lines.length,
  });
}

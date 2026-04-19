import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-649-store';
import { getS49RuleName, getS49RuleDetail, getNoneStr, getPairsStr, formatRepeatInfo, getErrorMessage } from '@/lib/dna-i18n';

type Locale = 'es' | 'en' | 'fr' | 'cn';

interface DiagRule { name: string; value: string; status: 'ok' | 'warn' | 'fail'; detail: string }

function calcDNA(nums: number[], locale: Locale): { score: number; rules: DiagRule[] } {
  const rules: DiagRule[] = [];
  let score = 0;

  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum >= 100 && sum <= 175) { score += 25; rules.push({ name: getS49RuleName(locale, 'sum'), value: String(sum), status: 'ok', detail: getS49RuleDetail(locale, 'sum', 'ok') }); }
  else if (sum >= 85 && sum <= 200) { score += 15; rules.push({ name: getS49RuleName(locale, 'sum'), value: String(sum), status: 'warn', detail: getS49RuleDetail(locale, 'sum', 'warn') }); }
  else { score += 5; rules.push({ name: getS49RuleName(locale, 'sum'), value: String(sum), status: 'fail', detail: getS49RuleDetail(locale, 'sum', 'fail') }); }

  const odd = nums.filter(n => n % 2 === 1).length;
  const even = 6 - odd;
  const parityValue = `${odd}I / ${even}P`;
  if (['3/3', '4/2', '2/4'].includes(`${odd}/${even}`)) { score += 20; rules.push({ name: getS49RuleName(locale, 'parity'), value: parityValue, status: 'ok', detail: getS49RuleDetail(locale, 'parity', 'ok') }); }
  else if (['5/1', '1/5'].includes(`${odd}/${even}`)) { score += 10; rules.push({ name: getS49RuleName(locale, 'parity'), value: parityValue, status: 'warn', detail: getS49RuleDetail(locale, 'parity', 'warn') }); }
  else { score += 3; rules.push({ name: getS49RuleName(locale, 'parity'), value: parityValue, status: 'fail', detail: getS49RuleDetail(locale, 'parity', 'fail') }); }

  const sorted = [...nums].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avgGap >= 5.0 && avgGap <= 9.0) { score += 20; rules.push({ name: getS49RuleName(locale, 'gaps'), value: avgGap.toFixed(1), status: 'ok', detail: getS49RuleDetail(locale, 'gaps', 'ok') }); }
  else if (avgGap >= 3.5 && avgGap <= 11.0) { score += 12; rules.push({ name: getS49RuleName(locale, 'gaps'), value: avgGap.toFixed(1), status: 'warn', detail: getS49RuleDetail(locale, 'gaps', 'warn') }); }
  else { score += 4; rules.push({ name: getS49RuleName(locale, 'gaps'), value: avgGap.toFixed(1), status: 'fail', detail: getS49RuleDetail(locale, 'gaps', 'fail') }); }

  let consecPairs = 0;
  for (let i = 0; i < sorted.length - 1; i++) { if (sorted[i + 1] - sorted[i] === 1) consecPairs++; }
  if (consecPairs === 0 || consecPairs === 1) { score += 15; rules.push({ name: getS49RuleName(locale, 'consec'), value: consecPairs === 0 ? getNoneStr(locale) : getPairsStr(locale, 1), status: 'ok', detail: getS49RuleDetail(locale, 'consec', 'ok') }); }
  else if (consecPairs === 2) { score += 8; rules.push({ name: getS49RuleName(locale, 'consec'), value: getPairsStr(locale, 2), status: 'warn', detail: getS49RuleDetail(locale, 'consec', 'warn') }); }
  else { score += 2; rules.push({ name: getS49RuleName(locale, 'consec'), value: getPairsStr(locale, consecPairs), status: 'fail', detail: getS49RuleDetail(locale, 'consec', 'fail') }); }

  const sectors = [0, 0, 0, 0, 0];
  for (const n of nums) { if (n <= 10) sectors[0]++; else if (n <= 20) sectors[1]++; else if (n <= 30) sectors[2]++; else if (n <= 40) sectors[3]++; else sectors[4]++; }
  const activeSectors = sectors.filter(s => s > 0).length;
  if (activeSectors >= 4) { score += 20; rules.push({ name: getS49RuleName(locale, 'sectors'), value: `${activeSectors}/5`, status: 'ok', detail: getS49RuleDetail(locale, 'sectors', 'ok') }); }
  else if (activeSectors >= 3) { score += 12; rules.push({ name: getS49RuleName(locale, 'sectors'), value: `${activeSectors}/5`, status: 'warn', detail: getS49RuleDetail(locale, 'sectors', 'warn') }); }
  else { score += 3; rules.push({ name: getS49RuleName(locale, 'sectors'), value: `${activeSectors}/5`, status: 'fail', detail: getS49RuleDetail(locale, 'sectors', 'fail') }); }

  return { score: Math.min(100, score), rules };
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { numbers: number[]; locale?: string };
    const { numbers } = body;
    const locale: Locale = ['en', 'fr', 'cn'].includes(body.locale) ? body.locale as Locale : 'es';

    if (!Array.isArray(numbers) || numbers.length !== 6) return NextResponse.json({ error: getErrorMessage(locale, 'exact_count', { count: 6 }) }, { status: 400 });
    for (const n of numbers) if (typeof n !== 'number' || n < 1 || n > 49) return NextResponse.json({ error: getErrorMessage(locale, 'range', { max: 49 }) }, { status: 400 });
    if (new Set(numbers).size !== 6) return NextResponse.json({ error: getErrorMessage(locale, 'unique') }, { status: 400 });

    const sorted = [...numbers].sort((a, b) => a - b);
    const { score, rules } = calcDNA(sorted, locale);

    const draws = await getAllDraws();
    const totalDraws = draws.length;
    const lastDraw = draws[0];

    const repeatedNums = sorted.filter(n => lastDraw.numbers.includes(n));
    const repeatInfo = formatRepeatInfo(locale, repeatedNums.length, totalDraws, repeatedNums);

    return NextResponse.json({
      numbers: sorted, dnaScore: score, isMasterpiece: score >= 85, rules, repeatInfo,
      bonusNumber: lastDraw.bonus, lastDrawDate: lastDraw.drawDate, lastDrawNumbers: lastDraw.numbers,
    });
  } catch (e) {
    console.error('[analyze-649] Error:', e);
    return NextResponse.json({ error: getErrorMessage('es', 'analysis_error') }, { status: 500 });
  }
}

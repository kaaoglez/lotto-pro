import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';
import { getMaxRuleName, getMaxRuleDetail, getNoneStr, getPairsStr, formatRepeatInfo, getErrorMessage } from '@/lib/dna-i18n';

type Locale = 'es' | 'en' | 'fr' | 'cn';

// Lotto Max: 7 numbers from 1-52
// Expected sum: (1+52)/2 * 7 = 185.5
// Expected avg gap: (52-1)/(7-1) = 8.5
// Sectors: 6 sectors of ~9 numbers each (1-9, 10-18, 19-26, 27-35, 36-43, 44-52)

export async function POST(request: Request) {
  try {
    const body = await request.json() as { numbers: number[]; locale?: string };
    const { numbers } = body;
    const locale: Locale = ['en', 'fr', 'cn'].includes(body.locale) ? body.locale as Locale : 'es';

    if (!numbers || numbers.length !== 7) {
      return NextResponse.json({ error: getErrorMessage(locale, 'exact_count', { count: 7 }) }, { status: 400 });
    }
    if (numbers.some(n => n < 1 || n > 52)) {
      return NextResponse.json({ error: getErrorMessage(locale, 'range', { max: 52 }) }, { status: 400 });
    }
    if (new Set(numbers).size !== 7) {
      return NextResponse.json({ error: getErrorMessage(locale, 'unique') }, { status: 400 });
    }

    const allDraws = await getAllDraws();

    const sorted = [...numbers].sort((a, b) => a - b);
    const rules: { name: string; value: string; status: 'ok' | 'warn' | 'fail'; detail: string }[] = [];
    let score = 0;

    // 1. Suma Total — expected ~186, ideal range 150-220
    const sum = sorted.reduce((a, b) => a + b, 0);
    const sumOk = sum >= 150 && sum <= 220;
    if (sumOk) score += 20;
    else if (sum >= 130 && sum <= 240) { score += 10; }
    const sumStatus = sumOk ? 'ok' : (sum >= 130 && sum <= 240 ? 'warn' : 'fail');
    rules.push({
      name: getMaxRuleName(locale, 'sum'), value: String(sum),
      status: sumStatus,
      detail: getMaxRuleDetail(locale, 'sum', sumStatus, String(sum)),
    });

    // 2. Paridad (3/4 or 4/3)
    const evens = sorted.filter(n => n % 2 === 0).length;
    const odds = 7 - evens;
    const parityStr = `${evens}P / ${odds}I`;
    const parityOk = (evens === 3 || evens === 4);
    if (parityOk) score += 20;
    else if (evens >= 2 && evens <= 5) { score += 10; }
    const parityStatus = parityOk ? 'ok' : (evens >= 2 && evens <= 5 ? 'warn' : 'fail');
    rules.push({
      name: getMaxRuleName(locale, 'parity'), value: parityStr,
      status: parityStatus,
      detail: getMaxRuleDetail(locale, 'parity', parityStatus, parityStr),
    });

    // 3. Gaps / Saltos — expected ~8.5, ideal range 6.0-11.0
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapOk = avgGap >= 6.0 && avgGap <= 11.0;
    if (gapOk) score += 20;
    else if (avgGap >= 4.5 && avgGap <= 12.5) { score += 10; }
    const gapStatus = gapOk ? 'ok' : (avgGap >= 4.5 && avgGap <= 12.5 ? 'warn' : 'fail');
    rules.push({
      name: getMaxRuleName(locale, 'gaps'), value: avgGap.toFixed(1),
      status: gapStatus,
      detail: getMaxRuleDetail(locale, 'gaps', gapStatus, avgGap.toFixed(1)),
    });

    // 4. Consecutivos (max 1 pair)
    let consecPairs = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) consecPairs++;
    }
    const consecOk = consecPairs <= 1;
    if (consecOk) score += 20;
    else if (consecPairs === 2) { score += 10; }
    const consecStatus = consecOk ? 'ok' : (consecPairs === 2 ? 'warn' : 'fail');
    const consecValue = consecPairs === 0 ? getNoneStr(locale) : getPairsStr(locale, consecPairs);
    rules.push({
      name: getMaxRuleName(locale, 'consec'), value: consecValue,
      status: consecStatus,
      detail: getMaxRuleDetail(locale, 'consec', consecStatus, consecValue),
    });

    // 5. Sectores — 6 sectors: 1-9, 10-18, 19-26, 27-35, 36-43, 44-52
    const sectors = [0, 0, 0, 0, 0, 0];
    for (const n of sorted) sectors[Math.min(5, Math.floor((n - 1) / 9))]++;
    const covered = sectors.filter(s => s > 0).length;
    const sectorOk = covered >= 4;
    if (sectorOk) score += 20;
    else if (covered === 3) { score += 8; }
    const sectorStatus = sectorOk ? 'ok' : (covered === 3 ? 'warn' : 'fail');
    rules.push({
      name: getMaxRuleName(locale, 'sectors'), value: `${covered}/6 [${sectors.join('-')}]`,
      status: sectorStatus,
      detail: getMaxRuleDetail(locale, 'sectors', sectorStatus, `${covered}/6`),
    });

    // Bonus: check repeat with last draw
    const lastDraw = allDraws[0];
    const repeatedNums = sorted.filter(n => lastDraw.numbers.includes(n));
    const repeatInfo = formatRepeatInfo(locale, repeatedNums.length, allDraws.length, repeatedNums);

    score = Math.min(100, score);
    const isMasterpiece = score >= 85;

    return NextResponse.json({
      numbers: sorted, dnaScore: score, isMasterpiece, rules, repeatInfo,
      bonusNumber: lastDraw.bonus, lastDrawDate: lastDraw.drawDate, lastDrawNumbers: lastDraw.numbers,
    });
  } catch (e) {
    console.error('[analyze] Error:', e);
    return NextResponse.json({ error: getErrorMessage('es', 'analysis_error') }, { status: 500 });
  }
}

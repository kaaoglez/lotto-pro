import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/lotto-max-store';
import { getMaxRuleName, getMaxRuleDetail, getNoneStr, getPairsStr, formatRepeatInfo, getErrorMessage } from '@/lib/dna-i18n';

type Locale = 'es' | 'en' | 'fr' | 'cn';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { numbers: number[]; locale?: string };
    const { numbers } = body;
    const locale: Locale = ['en', 'fr', 'cn'].includes(body.locale) ? body.locale as Locale : 'es';

    if (!numbers || numbers.length !== 7) {
      return NextResponse.json({ error: getErrorMessage(locale, 'exact_count', { count: 7 }) }, { status: 400 });
    }
    if (numbers.some(n => n < 1 || n > 50)) {
      return NextResponse.json({ error: getErrorMessage(locale, 'range', { max: 50 }) }, { status: 400 });
    }
    if (new Set(numbers).size !== 7) {
      return NextResponse.json({ error: getErrorMessage(locale, 'unique') }, { status: 400 });
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
      name: getMaxRuleName(locale, 'sum'), value: String(sum),
      status: sumOk ? 'ok' : (sum >= 110 && sum <= 230 ? 'warn' : 'fail'),
      detail: getMaxRuleDetail(locale, 'sum', sumOk ? 'ok' : (sum >= 110 && sum <= 230 ? 'warn' : 'fail'), String(sum)),
    });

    // 2. Paridad (3/4 or 4/3)
    const evens = sorted.filter(n => n % 2 === 0).length;
    const odds = 7 - evens;
    const parityStr = `${evens}P / ${odds}I`;
    const parityOk = (evens === 3 || evens === 4);
    if (parityOk) score += 20;
    else if (evens >= 2 && evens <= 5) { score += 10; }
    rules.push({
      name: getMaxRuleName(locale, 'parity'), value: parityStr,
      status: parityOk ? 'ok' : (evens >= 2 && evens <= 5 ? 'warn' : 'fail'),
      detail: getMaxRuleDetail(locale, 'parity', parityOk ? 'ok' : (evens >= 2 && evens <= 5 ? 'warn' : 'fail'), parityStr),
    });

    // 3. Gaps / Saltos (ideal 5.0 - 9.0)
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gapOk = avgGap >= 5.0 && avgGap <= 9.0;
    if (gapOk) score += 20;
    else if (avgGap >= 4.0 && avgGap <= 10.0) { score += 10; }
    rules.push({
      name: getMaxRuleName(locale, 'gaps'), value: avgGap.toFixed(1),
      status: gapOk ? 'ok' : (avgGap >= 4.0 && avgGap <= 10.0 ? 'warn' : 'fail'),
      detail: getMaxRuleDetail(locale, 'gaps', gapOk ? 'ok' : (avgGap >= 4.0 && avgGap <= 10.0 ? 'warn' : 'fail'), avgGap.toFixed(1)),
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

    // 5. Sectores / Décadas (min 4/5)
    const sectors = [0, 0, 0, 0, 0];
    for (const n of sorted) sectors[Math.min(4, Math.floor((n - 1) / 10))]++;
    const covered = sectors.filter(s => s > 0).length;
    const sectorOk = covered >= 4;
    if (sectorOk) score += 20;
    else if (covered === 3) { score += 8; }
    const sectorStatus = sectorOk ? 'ok' : (covered === 3 ? 'warn' : 'fail');
    rules.push({
      name: getMaxRuleName(locale, 'sectors'), value: `${covered}/5 [${sectors.join('-')}]`,
      status: sectorStatus,
      detail: getMaxRuleDetail(locale, 'sectors', sectorStatus, `${covered}/5`),
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

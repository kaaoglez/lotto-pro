/**
 * Shared DNA translation maps for analyze API routes.
 * Used by both Lotto Max and Lotto 6/49 analyze endpoints.
 */

type Locale = 'es' | 'en' | 'fr' | 'cn';

// ── Lotto Max ──
const maxRules: Record<Locale, Record<string, Record<string, string>>> = {
  es: {
    sum: { ok: '✓ {v} está en rango 130-210', warn: '⚠ {v} fuera del rango ideal 130-210', fail: '✗ {v} fuera del rango ideal 130-210' },
    parity: { ok: '✓ Balance ideal {v}', warn: '⚠ Se prefiere 3/4 o 4/3, tienes {v}', fail: '✗ Se prefiere 3/4 o 4/3, tienes {v}' },
    gaps: { ok: '✓ Gap {v} en rango 5.0-9.0', warn: '⚠ Gap {v} fuera del rango ideal 5.0-9.0', fail: '✗ Gap {v} fuera del rango ideal 5.0-9.0' },
    consec: { ok: '✓ Máximo 1 par consecutivo', warn: '⚠ Muchos consecutivos ({v} pares)', fail: '✗ Demasiados consecutivos ({v} pares)' },
    sectors: { ok: '✓ {v} sectores cubiertos', warn: '⚠ Se requieren mínimo 4/5, tienes {v}', fail: '✗ Se requieren mínimo 4/5, tienes {v}' },
  },
  en: {
    sum: { ok: '✓ {v} in range 130-210', warn: '⚠ {v} outside ideal range 130-210', fail: '✗ {v} outside ideal range 130-210' },
    parity: { ok: '✓ Ideal balance {v}', warn: '⚠ Prefer 3/4 or 4/3, you have {v}', fail: '✗ Prefer 3/4 or 4/3, you have {v}' },
    gaps: { ok: '✓ Gap {v} in range 5.0-9.0', warn: '⚠ Gap {v} outside ideal range 5.0-9.0', fail: '✗ Gap {v} outside ideal range 5.0-9.0' },
    consec: { ok: '✓ Max 1 consecutive pair', warn: '⚠ Many consecutive ({v} pairs)', fail: '✗ Too many consecutive ({v} pairs)' },
    sectors: { ok: '✓ {v} sectors covered', warn: '⚠ Minimum 4/5 required, you have {v}', fail: '✗ Minimum 4/5 required, you have {v}' },
  },
  fr: {
    sum: { ok: '✓ {v} dans la plage 130-210', warn: '⚠ {v} hors de la plage idéale 130-210', fail: '✗ {v} hors de la plage idéale 130-210' },
    parity: { ok: '✓ Équilibre idéal {v}', warn: '⚠ Préférer 3/4 ou 4/3, vous avez {v}', fail: '✗ Préférer 3/4 ou 4/3, vous avez {v}' },
    gaps: { ok: '✓ Écart {v} dans la plage 5.0-9.0', warn: '⚠ Écart {v} hors de la plage idéale 5.0-9.0', fail: '✗ Écart {v} hors de la plage idéale 5.0-9.0' },
    consec: { ok: '✓ Max 1 paire consécutive', warn: '⚠ Trop de consécutifs ({v} paires)', fail: '✗ Trop de consécutifs ({v} paires)' },
    sectors: { ok: '✓ {v} secteurs couverts', warn: '⚠ Minimum 4/5 requis, vous avez {v}', fail: '✗ Minimum 4/5 requis, vous avez {v}' },
  },
  cn: {
    sum: { ok: '✓ {v} 在范围 130-210 内', warn: '⚠ {v} 超出理想范围 130-210', fail: '✗ {v} 超出理想范围 130-210' },
    parity: { ok: '✓ 理想平衡 {v}', warn: '⚠ 建议3/4或4/3，当前 {v}', fail: '✗ 建议3/4或4/3，当前 {v}' },
    gaps: { ok: '✓ 间隔 {v} 在范围 5.0-9.0', warn: '⚠ 间隔 {v} 超出理想范围 5.0-9.0', fail: '✗ 间隔 {v} 超出理想范围 5.0-9.0' },
    consec: { ok: '✓ 最多1组连续号码', warn: '⚠ 连续号码过多（{v}组）', fail: '✗ 连续号码过多（{v}组）' },
    sectors: { ok: '✓ 覆盖 {v} 个区间', warn: '⚠ 至少需要4/5，当前 {v}', fail: '✗ 至少需要4/5，当前 {v}' },
  },
};

// ── Lotto 6/49 ──
const s49Rules: Record<Locale, Record<string, Record<string, string>>> = {
  es: {
    sum: { ok: 'Rango ideal 100-175', warn: 'Fuera del rango óptimo (100-175)', fail: 'Suma extrema, baja probabilidad' },
    parity: { ok: 'Distribución óptima', warn: 'Distribución desbalanceada', fail: 'Paridad extrema, muy rara' },
    gaps: { ok: 'Promedio ideal 5.0-9.0', warn: 'Fuera del rango óptimo (5.0-9.0)', fail: 'Gaps irregulares' },
    consec: { ok: 'Máximo 1 par recomendado', warn: 'Muchos consecutivos', fail: 'Exceso de consecutivos' },
    sectors: { ok: 'Buena distribución', warn: 'Mínimo 3 sectores recomendados', fail: 'Muy concentrado en pocos sectores' },
  },
  en: {
    sum: { ok: 'Ideal range 100-175', warn: 'Outside optimal range (100-175)', fail: 'Extreme sum, low probability' },
    parity: { ok: 'Optimal distribution', warn: 'Unbalanced distribution', fail: 'Extreme parity, very rare' },
    gaps: { ok: 'Ideal average 5.0-9.0', warn: 'Outside optimal range (5.0-9.0)', fail: 'Irregular gaps' },
    consec: { ok: 'Max 1 pair recommended', warn: 'Many consecutive', fail: 'Excessive consecutive' },
    sectors: { ok: 'Good distribution', warn: 'Minimum 3 sectors recommended', fail: 'Too concentrated in few sectors' },
  },
  fr: {
    sum: { ok: 'Plage idéale 100-175', warn: 'Hors de la plage optimale (100-175)', fail: 'Somme extrême, faible probabilité' },
    parity: { ok: 'Distribution optimale', warn: 'Distribution déséquilibrée', fail: 'Parité extrême, très rare' },
    gaps: { ok: 'Moyenne idéale 5.0-9.0', warn: 'Hors de la plage optimale (5.0-9.0)', fail: 'Écarts irréguliers' },
    consec: { ok: 'Max 1 paire recommandée', warn: 'Trop de consécutifs', fail: 'Excès de consécutifs' },
    sectors: { ok: 'Bonne distribution', warn: 'Minimum 3 secteurs recommandés', fail: 'Trop concentré dans peu de secteurs' },
  },
  cn: {
    sum: { ok: '理想范围 100-175', warn: '超出最佳范围 (100-175)', fail: '总和极端，概率很低' },
    parity: { ok: '最佳分布', warn: '分布不均衡', fail: '奇偶极端，非常罕见' },
    gaps: { ok: '理想平均间隔 5.0-9.0', warn: '超出最佳范围 (5.0-9.0)', fail: '间隔不规则' },
    consec: { ok: '建议最多1组连续', warn: '连续号码过多', fail: '连续号码过多' },
    sectors: { ok: '分布良好', warn: '建议至少3个区间', fail: '过于集中在少数区间' },
  },
};

// ── Rule names ──
const maxRuleNames: Record<Locale, Record<string, string>> = {
  es: { sum: 'Suma Total', parity: 'Paridad', gaps: 'Salto Promedio', consec: 'Consecutivos', sectors: 'Sectores' },
  en: { sum: 'Total Sum', parity: 'Parity', gaps: 'Avg Gap', consec: 'Consecutive', sectors: 'Sectors' },
  fr: { sum: 'Somme Totale', parity: 'Parité', gaps: 'Écart Moyen', consec: 'Consécutifs', sectors: 'Secteurs' },
  cn: { sum: '总和', parity: '奇偶比', gaps: '平均间隔', consec: '连续号码', sectors: '区间分布' },
};

const s49RuleNames: Record<Locale, Record<string, string>> = {
  es: { sum: 'Suma', parity: 'Paridad', gaps: 'Gaps', consec: 'Consecutivos', sectors: 'Sectores' },
  en: { sum: 'Sum', parity: 'Parity', gaps: 'Gaps', consec: 'Consecutive', sectors: 'Sectors' },
  fr: { sum: 'Somme', parity: 'Parité', gaps: 'Écarts', consec: 'Consécutifs', secteurs: 'Secteurs' },
  cn: { sum: '总和', parity: '奇偶比', gaps: '间隔', consec: '连续号码', sectors: '区间分布' },
};

// ── Value strings ──
const noneStr: Record<Locale, string> = {
  es: 'Ninguno', en: 'None', fr: 'Aucun', cn: '无',
};

const pairsStr: Record<Locale, (n: number) => string> = {
  es: (n) => `${n} par(es)`,
  en: (n) => `${n} pair(s)`,
  fr: (n) => `${n} paire(s)`,
  cn: (n) => `${n}组`,
};

// ── Repeat info ──
export function formatRepeatInfo(locale: Locale, repeatCount: number, totalDraws: number, repeatedNums: number[]): string {
  const nums = repeatedNums.join(',');
  if (repeatCount === 0) {
    const msgs: Record<Locale, string> = {
      es: `Sin números repetidos del último sorteo`,
      en: `No repeated numbers from last draw`,
      fr: `Aucun numéro répété du dernier tirage`,
      cn: `与最近一期开奖无重复号码`,
    };
    return msgs[locale];
  }
  const msgs: Record<Locale, string> = {
    es: `${repeatCount} número(s) repetido(s) del último sorteo: [${nums}]`,
    en: `${repeatCount} repeated number(s) from last draw: [${nums}]`,
    fr: `${repeatCount} numéro(s) répété(s) du dernier tirage : [${nums}]`,
    cn: `与最近一期有${repeatCount}个重复号码：[${nums}]`,
  };
  return msgs[locale];
}

// ── Error messages ──
export function getErrorMessage(locale: Locale, code: string, params?: Record<string, string | number>): string {
  const msgs: Record<Locale, Record<string, string>> = {
    es: {
      exact_count: 'Ingresa exactamente {count} números',
      range: 'Los números deben estar entre 1 y {max}',
      unique: 'Los números deben ser únicos',
      analysis_error: 'Error en el análisis',
    },
    en: {
      exact_count: 'Enter exactly {count} numbers',
      range: 'Numbers must be between 1 and {max}',
      unique: 'Numbers must be unique',
      analysis_error: 'Analysis error',
    },
    fr: {
      exact_count: 'Entrez exactement {count} nombres',
      range: 'Les nombres doivent être entre 1 et {max}',
      unique: 'Les nombres doivent être uniques',
      analysis_error: 'Erreur d\'analyse',
    },
    cn: {
      exact_count: '请输入恰好{count}个号码',
      range: '号码必须在1到{max}之间',
      unique: '号码不能重复',
      analysis_error: '分析错误',
    },
  };
  let msg = msgs[locale]?.[code] || msgs.es[code] || code;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, String(v));
    }
  }
  return msg;
}

// ── Exports ──
export function getMaxRuleName(locale: Locale, key: string): string {
  return maxRuleNames[locale]?.[key] || maxRuleNames.es[key] || key;
}

export function getS49RuleName(locale: Locale, key: string): string {
  return s49RuleNames[locale]?.[key] || s49RuleNames.es[key] || key;
}

export function getMaxRuleDetail(locale: Locale, key: string, status: string, value: string): string {
  const tpl = maxRules[locale]?.[key]?.[status] || maxRules.es[key]?.[status] || '';
  return tpl.replace('{v}', value);
}

export function getS49RuleDetail(locale: Locale, key: string, status: string): string {
  return s49Rules[locale]?.[key]?.[status] || s49Rules.es[key]?.[status] || '';
}

export function getNoneStr(locale: Locale): string {
  return noneStr[locale] || noneStr.es;
}

export function getPairsStr(locale: Locale, n: number): string {
  return pairsStr[locale]?.(n) || pairsStr.es(n);
}

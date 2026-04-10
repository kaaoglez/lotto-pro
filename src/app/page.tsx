'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Gauge, Dna, History, Sparkles, Upload, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Zap, Trophy, RotateCcw, Copy, Eye, Search,
  Database, Plus, Calendar, Save, Info, Ticket, Star, CircleDollarSign, Gift, Target, Download, RefreshCw
} from 'lucide-react';
import { fetchBCLCClient, clearCache } from '@/lib/bclc-client';

type LotteryType = 'lotto-max' | 'lotto-649';

interface LotteryConfig {
  key: LotteryType;
  name: string;
  shortName: string;
  numCount: number;
  maxNum: number;
  apiBase: string;
  description: string;
  prizeTable: PrizeTier[];
  getEstPrize: (match: string, jp: number) => string;
  getPrizeResult: (main: number, hasBonus: boolean) => PrizeTier | null;
}

interface PrizeTier {
  match: string;
  label: string;
  prize: string;
  odds: string;
  color: string;
}

interface DiagRule { name: string; value: string; status: 'ok' | 'warn' | 'fail'; detail: string }
interface AnalysisResponse {
  numbers: number[]; dnaScore: number; isMasterpiece: boolean;
  rules: DiagRule[]; repeatInfo: string; bonusNumber: number;
  lastDrawDate: string; lastDrawNumbers: number[];
}
interface MatchResult { drawNumber: number; drawDate: string; matches: number; drawnNumbers: number[]; bonus: number; bonusMatch: boolean }
interface VerifyResponse { numbers: number[]; totalChecked: number; summary: Record<number, number>; bestMatches: MatchResult[]; bestMatchCount: number }
interface GeneratedLine { numbers: number[]; score: number }
interface DBStatus { totalDraws: number; lastDrawDate: string; firstDrawDate: string; lastDrawNumber: number }

const LOTTERY_CONFIGS: Record<LotteryType, LotteryConfig> = {
  'lotto-max': {
    key: 'lotto-max', name: 'LOTTO MAX', shortName: 'MAX', numCount: 7, maxNum: 50, apiBase: '/api/lotto',
    description: '7 numeros · Rango 1-50 · Martes y Viernes',
    prizeTable: [
      { match: '7/7', label: '7 aciertos', prize: 'JACKPOT', odds: '1 en 33,294,800', color: 'from-yellow-400 to-amber-500' },
      { match: '6/7+B', label: '6 aciertos + Bonus', prize: '2.5% del Fondo', odds: '1 en 4,756,400', color: 'from-orange-400 to-red-500' },
      { match: '6/7', label: '6 aciertos', prize: '2.5% del Fondo', odds: '1 en 113,248', color: 'from-orange-400 to-amber-500' },
      { match: '5/7+B', label: '5 aciertos + Bonus', prize: '1.5% del Fondo', odds: '1 en 37,749', color: 'from-amber-400 to-orange-400' },
      { match: '5/7', label: '5 aciertos', prize: '3.5% del Fondo', odds: '1 en 1,841', color: 'from-amber-300 to-yellow-400' },
      { match: '4/7+B', label: '4 aciertos + Bonus', prize: '2.75% del Fondo', odds: '1 en 1,105', color: 'from-green-300 to-emerald-400' },
      { match: '4/7', label: '4 aciertos', prize: '$20', odds: '1 en 82.9', color: 'from-green-400 to-emerald-500' },
      { match: '3/7+B', label: '3 aciertos + Bonus', prize: '$20', odds: '1 en 82.9', color: 'from-green-400 to-emerald-500' },
      { match: '3/7', label: '3 aciertos', prize: 'Jugada Gratis $5', odds: '1 en 8.5', color: 'from-emerald-400 to-teal-500' },
    ],
    getEstPrize: (m, jp) => {
      if (m === '7/7') return jp >= 1_000_000 ? `$${(jp/1_000_000).toFixed(jp%1_000_000===0?0:1)}M` : `$${jp.toLocaleString('en-CA')}`;
      if (m === '6/7+B') return '~$'+Math.round(jp*0.025).toLocaleString('en-CA');
      if (m === '6/7') return '~$'+Math.round(jp*0.025).toLocaleString('en-CA');
      if (m === '5/7+B') return '~$'+Math.round(jp*0.015).toLocaleString('en-CA');
      if (m === '5/7') return '~$'+Math.round(jp*0.035).toLocaleString('en-CA');
      if (m === '4/7+B') return '~$'+Math.round(jp*0.0275).toLocaleString('en-CA');
      if (m === '4/7' || m === '3/7+B') return '$20';
      if (m === '3/7') return 'Gratis $5';
      return '-';
    },
    getPrizeResult: (main, hasB) => {
      if (main === 7) return LOTTERY_CONFIGS['lotto-max'].prizeTable[0];
      if (main === 6 && hasB) return LOTTERY_CONFIGS['lotto-max'].prizeTable[1];
      if (main === 6) return LOTTERY_CONFIGS['lotto-max'].prizeTable[2];
      if (main === 5 && hasB) return LOTTERY_CONFIGS['lotto-max'].prizeTable[3];
      if (main === 5) return LOTTERY_CONFIGS['lotto-max'].prizeTable[4];
      if (main === 4 && hasB) return LOTTERY_CONFIGS['lotto-max'].prizeTable[5];
      if (main === 4) return LOTTERY_CONFIGS['lotto-max'].prizeTable[6];
      if (main === 3 && hasB) return LOTTERY_CONFIGS['lotto-max'].prizeTable[7];
      if (main === 3) return LOTTERY_CONFIGS['lotto-max'].prizeTable[8];
      return null;
    },
  },
  'lotto-649': {
    key: 'lotto-649', name: 'LOTTO 6/49', shortName: '6/49', numCount: 6, maxNum: 49, apiBase: '/api/lotto649',
    description: '6 numeros · Rango 1-49 · Miercoles y Sabado',
    prizeTable: [
      { match: '6/6', label: '6 aciertos', prize: 'JACKPOT', odds: '1 en 13,983,816', color: 'from-yellow-400 to-amber-500' },
      { match: '5/6+B', label: '5 aciertos + Bonus', prize: '$25,000+', odds: '1 en 2,330,636', color: 'from-orange-400 to-red-500' },
      { match: '5/6', label: '5 aciertos', prize: '~$500', odds: '1 en 55,492', color: 'from-orange-400 to-amber-500' },
      { match: '4/6', label: '4 aciertos', prize: '~$50', odds: '1 en 1,033', color: 'from-amber-400 to-orange-400' },
      { match: '3/6', label: '3 aciertos', prize: '$10', odds: '1 en 56.7', color: 'from-amber-300 to-yellow-400' },
      { match: '2/6+B', label: '2 aciertos + Bonus', prize: '$5', odds: '1 en 81.2', color: 'from-green-300 to-emerald-400' },
      { match: 'GARANTIA', label: 'Premio Garantizado', prize: '$1,000,000', odds: '1 en 6.8', color: 'from-purple-400 to-fuchsia-500' },
    ],
    getEstPrize: (m, jp) => {
      if (m === '6/6') return jp >= 1_000_000 ? `$${(jp/1_000_000).toFixed(jp%1_000_000===0?0:1)}M` : `$${jp.toLocaleString('en-CA')}`;
      if (m === '5/6+B') return '$25,000+';
      if (m === '5/6') return '~$500';
      if (m === '4/6') return '~$50';
      if (m === '3/6') return '$10';
      if (m === '2/6+B') return '$5';
      if (m === 'GARANTIA') return '$1,000,000';
      return '-';
    },
    getPrizeResult: (main, hasB) => {
      if (main === 6) return LOTTERY_CONFIGS['lotto-649'].prizeTable[0];
      if (main === 5 && hasB) return LOTTERY_CONFIGS['lotto-649'].prizeTable[1];
      if (main === 5) return LOTTERY_CONFIGS['lotto-649'].prizeTable[2];
      if (main === 4) return LOTTERY_CONFIGS['lotto-649'].prizeTable[3];
      if (main === 3) return LOTTERY_CONFIGS['lotto-649'].prizeTable[4];
      if (main === 2 && hasB) return LOTTERY_CONFIGS['lotto-649'].prizeTable[5];
      return null;
    },
  },
};

// prize table, getEstPrize and getPrizeResult are now in LOTTERY_CONFIGS

function DNAGauge({ score, isMasterpiece }: { score: number; isMasterpiece: boolean }) {
  const s = Math.max(0, Math.min(100, score));
  const angle = (s / 100) * 180;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 80, cy = 80, r = 65;
  const ex = cx + r * Math.cos(rad), ey = cy + r * Math.sin(rad);
  const arc = (a: number, b: number, rad2: number) => {
    const sa = ((a - 90) * Math.PI) / 180, ea = ((b - 90) * Math.PI) / 180;
    return `M ${cx + rad2 * Math.cos(sa)} ${cy + rad2 * Math.sin(sa)} A ${rad2} ${rad2} 0 ${b - a > 180 ? 1 : 0} 1 ${cx + rad2 * Math.cos(ea)} ${cy + rad2 * Math.sin(ea)}`;
  };
  const color = isMasterpiece ? '#22c55e' : s >= 60 ? '#f97316' : '#ef4444';
  const label = isMasterpiece ? 'MAESTRA' : s >= 60 ? 'ACEPTABLE' : 'DEBIL';
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 160 100" className="w-56 h-36 sm:w-64 sm:h-40">
        <path d={arc(0, 180, r)} fill="none" stroke="#262626" strokeWidth="12" strokeLinecap="round" />
        <path d={arc(0, 180, r)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(s / 100) * Math.PI * r} ${Math.PI * r}`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={ex} cy={ey} r="5" fill={color} />
        <text x={cx} y={cy + 2} textAnchor="middle" fill="white" fontSize="28" fontWeight="900">{s}</text>
      </svg>
      <span className="text-[10px] tracking-widest text-gray-500 uppercase">DNA Score</span>
      <span className="text-lg font-black tracking-wider" style={{ color, textShadow: `0 0 10px ${color}` }}>{label}</span>
    </div>
  );
}

function Ball({ n, hl, sm, bonus, matched, dim }: { n: number; hl?: boolean; sm?: boolean; bonus?: boolean; matched?: boolean; dim?: boolean }) {
  const sz = sm ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';
  const w = sm ? 'w-8' : 'w-11';
  if (bonus) {
    return (
      <span className={`${w} ${sz.split(' ')[1]} bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30 rounded-full inline-flex items-center justify-center font-bold tabular-nums ring-2 ring-orange-500/30`}>
        {n}
        <span className="absolute -top-1 -right-1 text-[7px] font-bold text-orange-300 bg-[#141414] rounded-full px-0.5">B</span>
      </span>
    );
  }
  if (matched) {
    return (
      <span className={`${w} ${sz.split(' ')[1]} bg-gradient-to-br from-green-300 to-emerald-500 shadow-lg shadow-green-500/40 rounded-full inline-flex items-center justify-center font-bold tabular-nums ring-2 ring-green-400/50`}>{n}</span>
    );
  }
  if (dim) {
    return (
      <span className={`${w} ${sz.split(' ')[1]} bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-full inline-flex items-center justify-center font-bold tabular-nums text-gray-600`}>{n}</span>
    );
  }
  return (
    <span className={`${w} ${sz.split(' ')[1]} ${hl ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30' : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'} rounded-full inline-flex items-center justify-center font-bold tabular-nums`}>{n}</span>
  );
}

function SIcon({ s }: { s: 'ok' | 'warn' | 'fail' }) {
  if (s === 'ok') return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
  if (s === 'warn') return <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
}

type TabKey = 'a' | 'p' | 'h' | 'g' | 'd';

// =============================================
// Page: thin wrapper — only holds lottery state.
// key={lottery} on LottoDashboard forces a full
// remount (all useState re-initialize) on switch.
// =============================================
export default function Page() {
  const [lottery, setLottery] = useState<LotteryType>('lotto-max');
  return <LottoDashboard key={lottery} lottery={lottery} onSwitch={setLottery} />;
}

// =============================================
// LottoDashboard: all state + UI lives here.
// When lottery prop changes, React destroys this
// instance and creates a fresh one because of
// key={lottery} in the parent.
// =============================================
function LottoDashboard({ lottery, onSwitch }: { lottery: LotteryType; onSwitch: (lt: LotteryType) => void }) {
  const cfg = LOTTERY_CONFIGS[lottery];

  const [inputs, setInputs] = useState<string[]>(Array(cfg.numCount).fill(''));
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genLines, setGenLines] = useState<GeneratedLine[]>([]);
  const [lastDraw, setLastDraw] = useState<{ date: string; numbers: number[]; bonus: number } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>('p');

  // Prize check state
  const [prizeInputs, setPrizeInputs] = useState<string[]>(Array(cfg.numCount).fill(''));
  const [prizeBonus, setPrizeBonus] = useState('');
  const [prizeResult, setPrizeResult] = useState<{ mainMatches: number; hasBonus: boolean; tier: PrizeTier | null } | null>(null);
  const [jackpot, setJackpot] = useState<{ amount: number; formatted: string; nextDrawDate: string; fetchedAt: number } | null>(null);

  // DB Tab state
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [newDrawDate, setNewDrawDate] = useState('');
  const [newDrawNums, setNewDrawNums] = useState<string[]>(Array(cfg.numCount).fill(''));
  const [newDrawBonus, setNewDrawBonus] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{newDrawsCount: number; totalDraws: number; newDraws: {drawNumber: number; drawDate: string; numbers: number[]; bonus: number}[] } | null>(null);

  // Fetch data on mount (component remounts on lottery change via key={lottery})
  useEffect(() => {
    const loadData = async () => {
      // Try server API first
      try {
        const r = await fetch(`${cfg.apiBase}/data`);
        const d = await r.json();
        if (d?.lastDraw) {
          setLastDraw({ date: d.lastDraw.drawDate, numbers: d.lastDraw.numbers, bonus: d.lastDraw.bonus });
          setDbStatus({ totalDraws: d.totalMainDraws, lastDrawDate: d.lastDraw.drawDate, firstDrawDate: d.dateRange.start, lastDrawNumber: d.lastDraw.drawNumber });
          return;
        }
      } catch {}

      // Server failed — try client-side BCLC fallback (works on Vercel!)
      try {
        const draws = await fetchBCLCClient(lottery);
        if (draws.length > 0) {
          setLastDraw({ date: draws[0].drawDate, numbers: draws[0].numbers, bonus: draws[0].bonus });
          setDbStatus({
            totalDraws: draws.length,
            lastDrawDate: draws[0].drawDate,
            firstDrawDate: draws[draws.length - 1]?.drawDate || '',
            lastDrawNumber: draws[0].drawNumber,
          });
        }
      } catch (e) {
        console.warn('[init] All data sources failed:', String(e).substring(0, 80));
      }
    };
    loadData();

    fetch(`${cfg.apiBase}/jackpot`).then(r => r.json()).then(d => {
      if (d?.amount) setJackpot({ amount: d.amount, formatted: d.formatted, nextDrawDate: d.nextDrawDate, fetchedAt: d.fetchedAt });
    }).catch(() => {});
  }, []);

  const refreshDbStatus = async () => {
    // Try server API first
    try {
      const r = await fetch(`${cfg.apiBase}/data`);
      const d = await r.json();
      if (d?.lastDraw) {
        setLastDraw({ date: d.lastDraw.drawDate, numbers: d.lastDraw.numbers, bonus: d.lastDraw.bonus });
        setDbStatus({ totalDraws: d.totalMainDraws, lastDrawDate: d.lastDraw.drawDate, firstDrawDate: d.dateRange.start, lastDrawNumber: d.lastDraw.drawNumber });
        return;
      }
    } catch {}

    // Server failed — try client-side fallback
    try {
      clearCache(lottery); // Force fresh BCLC data
      const draws = await fetchBCLCClient(lottery);
      if (draws.length > 0) {
        setLastDraw({ date: draws[0].drawDate, numbers: draws[0].numbers, bonus: draws[0].bonus });
        setDbStatus({
          totalDraws: draws.length,
          lastDrawDate: draws[0].drawDate,
          firstDrawDate: draws[draws.length - 1]?.drawDate || '',
          lastDrawNumber: draws[0].drawNumber,
        });
      }
    } catch {}
  };

  const getNums = useCallback((arr: string[]): number[] | null => {
    const nums = arr.map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 1 && n <= cfg.maxNum);
    return nums.length === cfg.numCount && new Set(nums).size === cfg.numCount ? nums.sort((a, b) => a - b) : null;
  }, [cfg.maxNum, cfg.numCount]);

  const setIn = (i: number, v: string) => {
    const c = v.replace(/[^0-9]/g, '').slice(0, 2);
    const n = [...inputs]; n[i] = c; setInputs(n); setAnalysis(null);
  };
  const setPrizeIn = (i: number, v: string) => {
    const c = v.replace(/[^0-9]/g, '').slice(0, 2);
    const n = [...prizeInputs]; n[i] = c; setPrizeInputs(n); setPrizeResult(null);
  };
  const setPrizeBonusIn = (v: string) => {
    setPrizeBonus(v.replace(/[^0-9]/g, '').slice(0, 2));
    setPrizeResult(null);
  };

  const analyze = async () => {
    const nums = getNums(inputs);
    if (!nums) { toast.error(`Ingresa ${cfg.numCount} numeros unicos entre 1 y ${cfg.maxNum}`); return; }
    setAnalysis(null);
    try {
      const r = await fetch(`${cfg.apiBase}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: nums }) });
      const d: AnalysisResponse = await r.json();
      if (d.error) { toast.error(d.error); return; }
      setAnalysis(d);
      if (d.isMasterpiece) toast.success('Jugada Maestra! DNA Score >= 85%', { duration: 5000 });
    } catch { toast.error('Error de conexion'); }
  };

  const verify = async () => {
    const nums = getNums(inputs);
    if (!nums) { toast.error(`Ingresa ${cfg.numCount} numeros validos`); return; }
    setVerifying(true); setVerifyResult(null);
    try {
      const r = await fetch(`${cfg.apiBase}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ numbers: nums }) });
      setVerifyResult(await r.json());
    } catch { toast.error('Error de conexion'); }
    setVerifying(false);
  };

  const generate = async () => {
    setGenerating(true); setGenLines([]);
    try {
      const r = await fetch(`${cfg.apiBase}/generate`);
      const d = await r.json(); setGenLines(d.lines);
      toast.success(`${d.generated} lineas maestras generadas`);
    } catch { toast.error('Error de conexion'); }
    setGenerating(false);
  };

  const checkPrize = () => {
    const nums = getNums(prizeInputs);
    if (!nums) { toast.error(`Ingresa ${cfg.numCount} numeros unicos entre 1 y ${cfg.maxNum}`); return; }
    if (!lastDraw) { toast.error('Datos del sorteo no disponibles'); return; }

    const drawSet = new Set(lastDraw.numbers);
    const mainMatches = nums.filter(n => drawSet.has(n)).length;
    const userBonusNum = parseInt(prizeBonus);
    const hasBonus = (!isNaN(userBonusNum) && userBonusNum >= 1 && userBonusNum <= cfg.maxNum)
      ? (userBonusNum === lastDraw.bonus)
      : nums.includes(lastDraw.bonus);
    const tier = cfg.getPrizeResult(mainMatches, hasBonus);
    setPrizeResult({ mainMatches, hasBonus, tier });

    if (tier) {
      toast.success(`${tier.match} — ${tier.prize}!`, { duration: 6000 });
    } else {
      toast('Sin premio esta vez', { icon: '🎯' });
    }
  };

  // Save single draw
  const saveSingleDraw = async () => {
    const nums = newDrawNums.map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 1 && n <= cfg.maxNum);
    const bonus = parseInt(newDrawBonus);
    if (nums.length !== cfg.numCount || new Set(nums).size !== cfg.numCount) { toast.error(`Ingresa ${cfg.numCount} numeros unicos entre 1 y ${cfg.maxNum}`); return; }
    if (isNaN(bonus) || bonus < 1 || bonus > cfg.maxNum) { toast.error(`Bonus debe ser entre 1 y ${cfg.maxNum}`); return; }
    if (!newDrawDate) { toast.error('Ingresa la fecha del sorteo'); return; }
    setSaving(true);
    try {
      const r = await fetch(`${cfg.apiBase}/add-draw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draws: [{ drawDate: newDrawDate, numbers: nums, bonus }] })
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success(`Sorteo #${d.lastDraw.drawNumber} agregado! Total: ${d.newTotal} sorteos`);
      setNewDrawDate(''); setNewDrawNums(Array(cfg.numCount).fill('')); setNewDrawBonus('');
      refreshDbStatus();
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const saveBatchDraws = async () => {
    const lines = batchInput.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { toast.error('No hay sorteos para agregar'); return; }
    const draws: { drawDate: string; numbers: number[]; bonus: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].trim().split(/[,\s]+/);
      const expectedLen = 1 + cfg.numCount + 1;
      if (parts.length < expectedLen) { toast.error(`Linea ${i + 1}: formato invalido (necesita fecha + ${cfg.numCount} numeros + bonus)`); return; }
      draws.push({ drawDate: parts[0], numbers: parts.slice(1, 1 + cfg.numCount).map(Number), bonus: Number(parts[1 + cfg.numCount]) });
    }
    setSaving(true);
    try {
      const r = await fetch(`${cfg.apiBase}/add-draw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draws })
      });
      const d = await r.json();
      if (d.error) { toast.error(d.error); return; }
      toast.success(`${d.added} sorteos agregados! Total: ${d.newTotal}`);
      setBatchInput('');
      refreshDbStatus();
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const fetchFromBCLC = async () => {
    setFetching(true); setFetchResult(null);

    // --- STRATEGY 1: Try server API ---
    try {
      const r = await fetch(`${cfg.apiBase}/fetch-latest`);
      if (r.ok) {
        const d = await r.json();
        if (!d.error && d.lastDraw) {
          setFetchResult({ newDrawsCount: d.newDrawsCount, totalDraws: d.totalMainDraws, newDraws: d.newDraws || [] });
          setLastDraw({ date: d.lastDraw.drawDate, numbers: d.lastDraw.numbers, bonus: d.lastDraw.bonus });
          setDbStatus({
            totalDraws: d.totalMainDraws,
            lastDrawDate: d.lastDraw?.drawDate || '',
            firstDrawDate: d.dateRange?.start || '',
            lastDrawNumber: d.currentLastDraw || d.lastDraw?.drawNumber || 0,
          });
          if (d.newDrawsCount > 0) {
            toast.success(`${d.newDrawsCount} sorteo(s) nuevo(s)! Draw #${d.currentLastDraw}`, { duration: 5000 });
          } else {
            toast.info('Base de datos actualizada — Draw #' + (d.currentLastDraw || d.lastDraw?.drawNumber));
          }
          setFetching(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[fetch-latest] Server failed, trying client-side...', String(e).substring(0, 60));
    }

    // --- STRATEGY 2: Client-side BCLC fetch (bypasses Vercel serverless limitations!) ---
    try {
      console.log('[fetch-latest] Trying client-side BCLC fetch...');
      clearCache(lottery); // Force fresh data (ignore cache)
      const draws = await fetchBCLCClient(lottery);
      if (draws.length > 0) {
        const lastD = draws[0];
        setLastDraw({ date: lastD.drawDate, numbers: lastD.numbers, bonus: lastD.bonus });
        setDbStatus({
          totalDraws: draws.length,
          lastDrawDate: lastD.drawDate,
          firstDrawDate: draws[draws.length - 1]?.drawDate || '',
          lastDrawNumber: lastD.drawNumber,
        });
        setFetchResult({
          newDrawsCount: 0,
          totalDraws: draws.length,
          newDraws: [],
        });
        toast.success(`BCLC actualizado via navegador — Draw #${lastD.drawNumber} (${draws.length} sorteos)`, { duration: 5000 });
        setFetching(false);
        return;
      }
    } catch (e) {
      console.error('[fetch-latest] Client-side also failed:', String(e).substring(0, 100));
    }

    toast.error('No se pudo conectar con BCLC. Intenta mas tarde.');
    setFetching(false);
  };

  const loadLine = (nums: number[]) => { const n = Array(cfg.numCount).fill(''); for (let i = 0; i < cfg.numCount; i++) n[i] = String(nums[i]); setInputs(n); setAnalysis(null); toast.info('Linea cargada'); };
  const copyLine = (nums: number[]) => { navigator.clipboard.writeText(nums.join(' - ')); setCopiedIdx(nums[0]); toast.success('Copiado'); setTimeout(() => setCopiedIdx(null), 2000); };
  const clearAll = () => { setInputs(Array(cfg.numCount).fill('')); setAnalysis(null); setVerifyResult(null); };
  const canGo = inputs.every(s => s.length > 0);
  const prizeCanGo = prizeInputs.every(s => s.length > 0);

  const TABS: { k: TabKey; Ic: typeof Ticket; l: string }[] = [
    { k: 'p', Ic: Ticket, l: 'Verificar Premio' },
    { k: 'a', Ic: Gauge, l: 'Analizador ADN' },
    { k: 'h', Ic: History, l: 'Historico' },
    { k: 'g', Ic: Sparkles, l: 'Generador' },
    { k: 'd', Ic: Database, l: 'Base de Datos' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* HEADER with lottery selector + last draw */}
      <header className="border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lottery === 'lotto-max' ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-amber-400 to-orange-600'}`}><Dna className="w-5 h-5 text-black" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">{cfg.name}</h1>
              </div>
              <p className="text-[10px] tracking-widest text-gray-500 uppercase">Dashboard Estadistico</p>
            </div>
          </div>
          {/* Lottery Selector Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
            {(['lotto-max', 'lotto-649'] as LotteryType[]).map(lt => {
              const lc = LOTTERY_CONFIGS[lt];
              const isActive = lottery === lt;
              return (
                <button key={lt} onClick={() => onSwitch(lt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive
                    ? lt === 'lotto-max' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-black shadow-lg shadow-green-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}>
                  {lc.shortName}
                </button>
              );
            })}
          </div>
          {lastDraw && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] text-gray-500 tracking-wider">SORTEO #{dbStatus?.lastDrawNumber || '---'} · {lastDraw.date}</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {lastDraw.numbers.map((n, i) => <Ball key={i} n={n} sm hl />)}
                </div>
                <span className="text-gray-600 mx-0.5">+</span>
                <Ball n={lastDraw.bonus} sm bonus />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* TABS */}
      <div className="border-b border-white/5 bg-[#0f0f0f] overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 min-w-fit">
          {TABS.map(({ k, Ic, l }) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === k ? 'border-green-400 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Ic className="w-4 h-4" /><span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">

        {/* ============================================ */}
        {/* TAB: VERIFICAR PREMIO */}
        {/* ============================================ */}
        {tab === 'p' && (
          <div className="space-y-6">
            {/* Last draw + Next Jackpot - Side by side layout */}
            {lastDraw && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 3/4: Ultimo Sorteo */}
                <div className="md:col-span-3 bg-gradient-to-r from-[#141414] to-[#1a1a1a] border border-white/5 rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Ultimo Sorteo</h2>
                      <p className="text-[10px] text-gray-500 tracking-wider uppercase">#{dbStatus?.lastDrawNumber || '---'} · {lastDraw.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider w-full mb-1">Numeros Ganadores</span>
                    {lastDraw.numbers.map((n, i) => (
                      <div key={i} className="relative">
                        <Ball n={n} hl />
                      </div>
                    ))}
                    <span className="text-gray-600 text-lg mx-1">+</span>
                    <Ball n={lastDraw.bonus} bonus />
                    <span className="text-[9px] text-orange-400/70 ml-0.5 uppercase tracking-wider">Bonus</span>
                  </div>
                </div>
                {/* 1/4: Proximo Jackpot */}
                <div className="md:col-span-1 bg-gradient-to-b from-yellow-500/[0.07] to-amber-500/[0.03] border border-yellow-500/15 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2">
                  <Gift className="w-6 h-6 text-yellow-400" />
                  <span className="text-[9px] text-yellow-400/60 uppercase tracking-widest font-medium">Proximo Jackpot</span>
                  <span className="text-2xl font-black text-yellow-400 leading-tight" style={{ textShadow: '0 0 18px rgba(234,179,8,0.35)' }}>
                    {jackpot ? jackpot.formatted : '...'}
                  </span>
                  {jackpot?.nextDrawDate && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-yellow-400/50" />
                      <span className="text-[9px] text-gray-400 font-medium">{jackpot.nextDrawDate}</span>
                    </div>
                  )}
                  <span className="text-[8px] text-gray-600 mt-auto">* Estimado</span>
                </div>
              </div>
            )}

            {/* User numbers input for prize check — key forces re-creation on lottery switch */}
            <div key={`prize-inputs-${lottery}`} className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-green-400" />
                <h2 className="text-sm font-semibold text-white">Verifica tu Ticket — {cfg.name}</h2>
                <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ml-auto ${lottery === 'lotto-649' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>{cfg.numCount} NUMEROS</div>
              </div>
              <p className={`text-xs font-bold mb-4 ${lottery === 'lotto-649' ? 'text-amber-400' : 'text-green-400'}`}>Ingresa {cfg.numCount} numeros de tu boleto ({cfg.name})</p>
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start mb-4" key={`prize-fields-${lottery}`}>
                {Array.from({ length: cfg.numCount }, (_, i) => {
                  const val = prizeInputs[i] || '';
                  const num = parseInt(val);
                  const dup = num >= 1 && num <= cfg.maxNum && prizeInputs.filter((v, j) => j !== i && parseInt(v) === num).length > 0;
                  return (
                    <div key={`${lottery}-pn${i}`} className="relative">
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-600">N{i + 1}</span>
                      <input type="number" min="1" max={cfg.maxNum} inputMode="numeric" placeholder="-" value={val}
                        onChange={e => setPrizeIn(i, e.target.value)}
                        className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-lg font-bold rounded-xl bg-white/5 border-2 transition-all ${dup ? 'border-red-500/60 text-red-400' : num > cfg.maxNum ? 'border-orange-500/60 text-orange-400' : val ? 'border-green-500/40 text-green-400' : 'border-white/10 text-gray-400'} focus:outline-none focus:border-green-400`} />
                      {dup && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
                    </div>
                  );
                })}
                {/* Bonus input */}
                <div className="relative">
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-orange-500 font-semibold">BONUS</span>
                  <input type="number" min="1" max={cfg.maxNum} inputMode="numeric" placeholder="B" value={prizeBonus}
                    onChange={e => setPrizeBonusIn(e.target.value)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-lg font-bold rounded-xl bg-orange-500/5 border-2 transition-all ${prizeBonus ? 'border-orange-500/60 text-orange-400' : 'border-orange-500/20 text-orange-400/40'} focus:outline-none focus:border-orange-400 ring-1 ring-orange-500/10`} />
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mb-4">Opcional: Ingresa tu numero Bonus para comparacion directa. Si lo dejas vacio, se verifica automaticamente.</p>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={checkPrize} disabled={!prizeCanGo || !lastDraw}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-semibold text-sm transition-all disabled:opacity-30">
                  <Zap className="w-4 h-4" /> Verificar Premio
                </button>
                <button onClick={() => { setPrizeInputs(Array(cfg.numCount).fill('')); setPrizeBonus(''); setPrizeResult(null); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Limpiar
                </button>
              </div>
            </div>

            {/* Prize result */}
            {prizeResult && lastDraw && (
              <div className="space-y-5">
                {/* Visual comparison */}
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    Comparacion con el Sorteo
                  </h3>
                  {/* Draw numbers */}
                  <div className="mb-4">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Sorteo #{dbStatus?.lastDrawNumber} — {lastDraw.date}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {lastDraw.numbers.map((n, i) => {
                        const userNums = getNums(prizeInputs);
                        const isMatch = userNums?.includes(n);
                        return <Ball key={i} n={n} sm matched={isMatch} dim={!isMatch} />;
                      })}
                      <span className="text-gray-600 text-lg mx-0.5">+</span>
                      <Ball n={lastDraw.bonus} sm bonus matched={prizeResult.hasBonus} dim={!prizeResult.hasBonus} />
                    </div>
                  </div>
                  {/* User numbers */}
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Tu Boleto</span>
                    <div className="flex flex-wrap gap-2">
                      {getNums(prizeInputs)?.map((n, i) => {
                        const isMainMatch = lastDraw.numbers.includes(n);
                        const isBonusMatch = n === lastDraw.bonus;
                        return <Ball key={i} n={n} sm matched={isMainMatch || isBonusMatch} />;
                      }) || prizeInputs.map((_, i) => <Ball key={i} n={0} sm dim />)}
                      {prizeBonus && (
                        <>
                          <span className="text-gray-600 text-lg mx-0.5">+</span>
                          <Ball n={parseInt(prizeBonus)} sm bonus matched={parseInt(prizeBonus) === lastDraw.bonus} dim={parseInt(prizeBonus) !== lastDraw.bonus} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Match summary */}
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">{prizeResult.mainMatches}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Aciertos</div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">{prizeResult.mainMatches}/{cfg.numCount}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Match</div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <div className={`text-2xl font-black ${prizeResult.hasBonus ? 'text-orange-400' : 'text-gray-700'}`}>{prizeResult.hasBonus ? 'SI' : 'NO'}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Bonus</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prize won */}
                <div className={`rounded-2xl p-6 border ${prizeResult.tier
                  ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20'
                  : 'bg-[#141414] border-white/5'
                }`}>
                  {prizeResult.tier ? (
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className={`w-6 h-6 text-yellow-400`} />
                        <Star className={`w-5 h-5 text-amber-400`} />
                        <Trophy className={`w-6 h-6 text-yellow-400`} />
                      </div>
                      <div className="text-[10px] tracking-widest text-gray-400 uppercase">Categoria</div>
                      <div className={`text-3xl font-black bg-gradient-to-r ${prizeResult.tier.color} bg-clip-text text-transparent`}>
                        {prizeResult.tier.match}
                      </div>
                      <div className="text-sm text-gray-300">{prizeResult.tier.label}</div>
                      <div className="mt-3 py-3 px-6 rounded-xl bg-white/5 inline-block">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Premio</div>
                        <div className={`text-2xl font-black ${prizeResult.tier.prize === 'JACKPOT' ? 'text-yellow-400' : prizeResult.tier.prize.includes('$') ? 'text-green-400' : 'text-amber-400'}`}
                          style={prizeResult.tier.prize === 'JACKPOT' ? { textShadow: '0 0 20px rgba(234,179,8,0.5)' } : {}}>
                          {prizeResult.tier.prize === 'JACKPOT' && jackpot ? jackpot.formatted : prizeResult.tier.prize}
                        </div>
                        {jackpot && prizeResult.tier.prize !== 'JACKPOT' && !prizeResult.tier.prize.includes('$') && prizeResult.tier.prize !== 'Jugada Gratis $5' && (
                          <div className="text-xs text-gray-400 mt-1">~ {cfg.getEstPrize(prizeResult.tier.match, jackpot.amount)}</div>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-600">Probabilidad: {prizeResult.tier.odds}</div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <XCircle className="w-10 h-10 text-gray-700 mx-auto" />
                      <div className="text-lg font-bold text-gray-500">Sin Premio</div>
                      <p className="text-xs text-gray-600">Necesitas minimo 3/{cfg.numCount} aciertos para ganar</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prize table reference */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Tabla de Premios</h3>
                </div>
                {jackpot && (
                  <span className="text-[10px] text-yellow-400/70 font-mono">
                    Jackpot: {jackpot.formatted}
                    {jackpot.nextDrawDate && (
                      <span className="text-gray-500 ml-1.5">
                        <Calendar className="w-2.5 h-2.5 inline-block mr-0.5 -mt-px" />
                        {jackpot.nextDrawDate}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs">Match</th>
                      <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs hidden sm:table-cell">Descripcion</th>
                      <th className="text-left py-2.5 px-2 text-gray-500 font-medium text-xs">Premio</th>
                      {jackpot && (
                        <th className="text-right py-2.5 px-2 text-gray-500 font-medium text-xs">
                          <span>Valor Aprox.</span>
                          {jackpot.nextDrawDate && (
                            <span className="block text-[8px] font-normal text-gray-600 normal-case tracking-normal">{jackpot.nextDrawDate}</span>
                          )}
                        </th>
                      )}
                      <th className="text-right py-2.5 px-2 text-gray-500 font-medium text-xs hidden sm:table-cell">Probabilidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfg.prizeTable.map(t => {
                      const isHighlight = prizeResult?.tier?.match === t.match;
                      const estPrize = jackpot ? cfg.getEstPrize(t.match, jackpot.amount) : null;
                      return (
                        <tr key={t.match} className={`border-b border-white/5 last:border-0 ${isHighlight ? 'bg-green-500/10' : ''}`}>
                          <td className="py-2.5 px-2">
                            <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2 py-1 rounded-lg bg-gradient-to-r ${t.color} bg-clip-text text-transparent`}>
                              {t.match}
                              {t.match.includes('+B') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-xs text-gray-400 hidden sm:table-cell">{t.label}</td>
                          <td className="py-2.5 px-2">
                            <span className={`font-bold text-xs ${t.prize === 'JACKPOT' ? 'text-yellow-400' : t.prize.includes('$') ? 'text-green-400' : 'text-amber-400'}`}>
                              {t.prize === 'JACKPOT' && '🎁 '}{t.prize}
                            </span>
                          </td>
                          {jackpot && (
                            <td className="py-2.5 px-2 text-right">
                              <span className={`font-bold text-xs ${isHighlight ? 'text-white' : 'text-gray-300'}`}>
                                {estPrize}
                              </span>
                            </td>
                          )}
                          <td className="py-2.5 px-2 text-right text-xs text-gray-600 hidden sm:table-cell font-mono">{t.odds}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {jackpot && (
                <p className="text-[9px] text-gray-600 mt-3 text-center">
                  * Los valores aproximados se calculan como porcentaje del jackpot estimado para el proximo sorteo{jackpot.nextDrawDate ? ` (${jackpot.nextDrawDate})` : ''}. {lottery === 'lotto-max' ? 'Los premios fijos ($20, Gratis $5) son oficiales.' : 'Los premios fijos ($10, $5) son oficiales.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: ANALIZADOR ADN */}
        {/* ============================================ */}
        {tab === 'a' && (
          <div className="space-y-6">
            <div key={`adn-inputs-${lottery}`} className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1"><Gauge className="w-4 h-4 text-green-400" /><h2 className="text-sm font-semibold text-white">Ingresa tus {cfg.numCount} Numeros ({cfg.name})</h2></div>
              <p className={`text-xs font-bold mb-4 ${lottery === 'lotto-649' ? 'text-amber-400' : 'text-green-400'}`}>Rango 1-{cfg.maxNum} · {cfg.numCount} numeros · Sin duplicados</p>
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start mb-5" key={`adn-fields-${lottery}`}>
                {Array.from({ length: cfg.numCount }, (_, i) => {
                  const val = inputs[i] || '';
                  const num = parseInt(val);
                  const dup = num >= 1 && num <= cfg.maxNum && inputs.filter((v, j) => j !== i && parseInt(v) === num).length > 0;
                  return (<div key={`${lottery}-an${i}`} className="relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-600">N{i + 1}</span><input type="number" min="1" max={cfg.maxNum} inputMode="numeric" placeholder="-" value={val} onChange={e => setIn(i, e.target.value)} className={`w-12 h-12 sm:w-14 sm:h-14 text-center text-lg font-bold rounded-xl bg-white/5 border-2 transition-all ${dup ? 'border-red-500/60 text-red-400' : num > cfg.maxNum ? 'border-orange-500/60 text-orange-400' : val ? 'border-green-500/40 text-green-400' : 'border-white/10 text-gray-400'} focus:outline-none focus:border-green-400`} />{dup && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}</div>);
                })}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={analyze} disabled={!canGo} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-30"><Zap className="w-4 h-4" /> Analizar ADN</button>
                <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Limpiar</button>
                <button onClick={verify} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors"><Eye className="w-3.5 h-3.5" /> Verificar</button>
              </div>
              {verifyResult && (<div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5"><div className="flex items-center gap-2 mb-2"><History className="w-4 h-4 text-orange-400" /><span className="text-sm font-semibold">Verificacion Rapida</span></div><div className="flex gap-3 text-sm">{Array.from({length: cfg.numCount - 2}, (_, i) => i + 3).map(c => (<span key={c} className={`px-2.5 py-1 rounded-lg ${verifyResult.summary[c] > 0 ? 'bg-orange-500/20 text-orange-400 font-bold' : 'bg-white/5 text-gray-600'}`}>{c}/{cfg.numCount}: {verifyResult.summary[c] || 0}</span>))}</div></div>)}
            </div>

            {analysis && (
              <div className="space-y-5">
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <DNAGauge score={analysis.dnaScore} isMasterpiece={analysis.isMasterpiece} />
                    <div className="flex-1 space-y-3">
                      <div><p className="text-[10px] tracking-widest text-gray-500 uppercase mb-1.5">Tu Combinacion</p><div className="flex gap-2 flex-wrap">{analysis.numbers.map((n, i) => <Ball key={i} n={n} hl={analysis.isMasterpiece} />)}</div></div>
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/5"><Trophy className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /><p className="text-xs text-gray-400">{analysis.repeatInfo}</p></div>
                      <p className="text-[10px] text-gray-600">Ultimo sorteo: {analysis.lastDrawDate} · Bonus: {analysis.bonusNumber}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" />Tabla de Diagnostico</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/5"><th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Regla</th><th className="text-center py-2 px-3 text-gray-500 font-medium text-xs">Valor</th><th className="text-center py-2 px-3 text-gray-500 font-medium text-xs">Estado</th><th className="text-left py-2 px-3 text-gray-500 font-medium text-xs hidden sm:table-cell">Detalle</th></tr></thead>
                    <tbody>{analysis.rules.map(r => (<tr key={r.name} className="border-b border-white/5 last:border-0"><td className="py-2.5 px-3 font-medium text-gray-300">{r.name}</td><td className="py-2.5 px-3 text-center font-mono text-white">{r.value}</td><td className="py-2.5 px-3 text-center"><SIcon s={r.status} /></td><td className="py-2.5 px-3 text-xs text-gray-500 hidden sm:table-cell">{r.detail}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: HISTORICO */}
        {/* ============================================ */}
        {tab === 'h' && (
          <div className="space-y-5">
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1"><History className="w-4 h-4 text-orange-400" /><h2 className="text-sm font-semibold text-white">Verificador Historico</h2></div>
              <p className="text-xs text-gray-500 mb-4">Verifica contra {dbStatus?.totalDraws?.toLocaleString() || '---'} sorteos principales</p>
              <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start mb-4">
                {inputs.map((val, i) => (<input key={i} type="number" min="1" max={String(cfg.maxNum)} inputMode="numeric" placeholder={`N${i + 1}`} value={val} onChange={e => setIn(i, e.target.value)} className="w-12 h-12 text-center text-lg font-bold rounded-xl bg-white/5 border-2 border-white/10 text-gray-300 focus:outline-none focus:border-orange-400 transition-all" />))}
              </div>
              <button onClick={verify} disabled={!canGo} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-all disabled:opacity-30">{verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Verificar</button>
            </div>
            {verifyResult && (
              <div className="space-y-4">
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Resumen</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({length: Math.min(4, cfg.numCount - 2)}, (_, i) => i + 3).map(c => (<div key={c} className="text-center p-3 rounded-xl bg-white/5"><div className={`text-3xl font-black ${verifyResult.summary[c] > 0 ? 'text-orange-400' : 'text-gray-700'}`}>{verifyResult.summary[c] || 0}</div><div className="text-xs text-gray-500 mt-1">{c} acierto{c > 1 ? 's' : ''}</div></div>))}</div>
                  <p className="text-xs text-gray-600 mt-3 text-center">{verifyResult.totalChecked.toLocaleString()} sorteos · Mejor: {verifyResult.bestMatchCount}/{cfg.numCount}</p>
                </div>
                {verifyResult.bestMatches.length > 0 && (
                  <div className="bg-[#141414] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Coincidencias</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">{verifyResult.bestMatches.map((m, i) => (<div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg bg-white/3 hover:bg-white/5"><div className="flex items-center gap-2 min-w-[120px]"><span className="text-xs font-bold text-gray-500">#{m.drawNumber}</span><span className="text-xs text-gray-600">{m.drawDate}</span></div><div className="flex gap-1.5 flex-wrap">{m.drawnNumbers.map((n, j) => <Ball key={j} n={n} sm hl={verifyResult.numbers.includes(n)} />)}</div><span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${m.matches >= cfg.numCount - 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-400'}`}>{m.matches}/{cfg.numCount}</span></div>))}</div>
                  </div>
                )}
                {verifyResult.bestMatches.length === 0 && <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 text-center"><XCircle className="w-8 h-8 text-gray-700 mx-auto mb-2" /><p className="text-gray-500 text-sm">Sin coincidencias 3+</p></div>}
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: GENERADOR */}
        {/* ============================================ */}
        {tab === 'g' && (
          <div className="space-y-5">
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-green-400" /><h2 className="text-sm font-semibold text-white">Generador de Lineas</h2></div>
              <p className="text-xs text-gray-500 mb-4">Combinaciones con Score &gt; 70% — {cfg.numCount} numeros del 1 al {cfg.maxNum}</p>
              <button onClick={generate} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-semibold text-sm transition-all disabled:opacity-50">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {generating ? 'Generando...' : 'Generar Lineas'}</button>
            </div>
            {genLines.length > 0 && (
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" />{genLines.length} Lineas</h3>
                <div className="space-y-2">{genLines.map((line, i) => (<div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors group"><span className="text-xs text-gray-600 font-mono w-6 shrink-0">{i + 1}.</span><div className="flex gap-2 flex-wrap">{line.numbers.map((n, j) => <Ball key={j} n={n} sm hl />)}</div><div className="flex items-center gap-2 sm:ml-auto shrink-0"><span className="text-xs font-bold text-green-400 font-mono">{line.score}%</span><button onClick={() => loadLine(line.numbers)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all"><Upload className="w-3 h-3" /></button><button onClick={() => copyLine(line.numbers)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-all">{copiedIdx === line.numbers[0] ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}</button></div></div>))}</div>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: BASE DE DATOS */}
        {/* ============================================ */}
        {tab === 'd' && (
          <div className="space-y-5">
            {/* LOTTERY MODE BANNER - very visible indicator */}
            <div className={`rounded-2xl p-4 border-2 ${lottery === 'lotto-649'
              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30'
              : 'bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-black ${lottery === 'lotto-649'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : 'bg-gradient-to-br from-green-400 to-emerald-500'
                  }`}>{cfg.numCount}</div>
                  <div>
                    <div className="text-sm font-bold text-white">{cfg.name} — Modo Activo</div>
                    <div className="text-xs text-gray-400">{cfg.description}</div>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lottery === 'lotto-649'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  {cfg.numCount} Numeros · 1-{cfg.maxNum}
                </div>
              </div>
            </div>
            {dbStatus && (
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4"><Database className="w-4 h-4 text-blue-400" /><h2 className="text-sm font-semibold text-white">Estado de la Base de Datos</h2></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-2xl font-black text-green-400">{dbStatus.totalDraws.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Total Sorteos</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-2xl font-black text-white">#{dbStatus.lastDrawNumber}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Ultimo #</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-lg font-bold text-white">{dbStatus.lastDrawDate}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Fecha Ultimo</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 text-center">
                    <div className="text-lg font-bold text-white">{dbStatus.firstDrawDate}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Fecha Primero</div>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-gradient-to-r from-[#141414] to-[#0f1a14] border border-green-500/20 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-green-400" /><h3 className="text-sm font-semibold text-white">Auto-Actualizar desde BCLC</h3></div>
              <p className="text-xs text-gray-500 mb-4">Descarga el CSV oficial de BCLC (playnow.com) y actualiza automaticamente sin manual.</p>
              <button onClick={fetchFromBCLC} disabled={fetching} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-semibold text-sm transition-all disabled:opacity-50">
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {fetching ? 'Descargando...' : 'Actualizar Ahora'}
              </button>
              <p className="text-[10px] text-gray-600 mt-2">Fuente: playnow.com/resources/documents/downloadable-numbers/{lottery === 'lotto-max' ? 'LOTTOMAX' : '649'}.zip</p>
            </div>
            {fetchResult && (
              <div className={`rounded-2xl p-5 border ${fetchResult.newDrawsCount > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-[#141414] border-white/5'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {fetchResult.newDrawsCount > 0 ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Info className="w-4 h-4 text-blue-400" />}
                  <h4 className="text-sm font-semibold text-white">{fetchResult.newDrawsCount > 0 ? 'Sorteos Nuevos Encontrados!' : 'Base de Datos al Dia'}</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-white/5 text-center">
                    <div className="text-lg font-bold text-white">{fetchResult.totalDraws.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500">Total Sorteos</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 text-center">
                    <div className={`text-lg font-bold ${fetchResult.newDrawsCount > 0 ? 'text-green-400' : 'text-gray-600'}`}>+{fetchResult.newDrawsCount}</div>
                    <div className="text-[10px] text-gray-500">Nuevos</div>
                  </div>
                </div>
                {fetchResult.newDraws.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Nuevos sorteos:</span>
                    {fetchResult.newDraws.map(d => (
                      <div key={d.drawNumber} className="flex items-center gap-3 p-2 rounded-lg bg-white/3">
                        <span className="text-xs font-bold text-gray-500 w-16 shrink-0">#{d.drawNumber}</span>
                        <span className="text-xs text-gray-600">{d.drawDate}</span>
                        <div className="flex gap-1 ml-auto">{d.numbers.map((n, i) => <Ball key={i} n={n} sm hl />)}</div>
                        <Ball n={d.bonus} sm bonus />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-blue-400" /><h3 className="text-sm font-semibold text-white">Otras Formas de Actualizar</h3></div>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="p-3 rounded-xl bg-white/5 flex gap-3"><span className="text-green-400 font-bold text-base shrink-0">1.</span><div><span className="text-white font-medium">Formulario abajo</span> — Ingresa un sorteo a la vez.</div></div>
                <div className="p-3 rounded-xl bg-white/5 flex gap-3"><span className="text-green-400 font-bold text-base shrink-0">2.</span><div><span className="text-white font-medium">Modo Lote</span> — Pega multiples sorteos en texto.</div></div>
                <div className="p-3 rounded-xl bg-white/5 flex gap-3"><span className="text-green-400 font-bold text-base shrink-0">3.</span><div><span className="text-white font-medium">Script</span> — <code className="px-1.5 py-0.5 bg-white/10 rounded text-green-400 text-[11px]">node scripts/update-from-excel.mjs --excel archivo.xlsm</code></div></div>
              </div>
            </div>
            {/* AGREGAR SORTEO — key forces full re-creation when lottery changes */}
            <div key={`add-draw-${lottery}`} className="bg-[#141414] border border-white/5 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /><h3 className="text-sm font-semibold text-white">Agregar Sorteo — {cfg.name}</h3></div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider ${lottery === 'lotto-649' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>{cfg.numCount} NUMEROS · 1-{cfg.maxNum}</div>
              </div>
              {!batchMode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500 shrink-0" /><input type="date" value={newDrawDate} onChange={e => setNewDrawDate(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400" /></div>
                  <div><p className={`text-xs font-bold uppercase tracking-wider mb-2 ${lottery === 'lotto-649' ? 'text-amber-400' : 'text-green-400'}`}>Ingresa {cfg.numCount} Numeros ({cfg.name})</p><div className="flex flex-wrap gap-2" key={`inputs-${lottery}`}>{Array.from({ length: cfg.numCount }, (_, i) => (<div key={`${lottery}-n${i}`} className="relative"><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-600">N{i + 1}</span><input type="number" min="1" max={cfg.maxNum} inputMode="numeric" placeholder={String(i + 1)} value={newDrawNums[i] || ''} onChange={e => { const c = e.target.value.replace(/[^0-9]/g, '').slice(0, 2); const n = [...newDrawNums]; n[i] = c; setNewDrawNums(n); }} className="w-12 h-12 text-center text-lg font-bold rounded-xl bg-white/5 border-2 border-white/10 text-gray-300 focus:outline-none focus:border-green-400" /></div>))}</div></div>
                  <div><p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Bonus</p><input type="number" min="1" max={cfg.maxNum} inputMode="numeric" placeholder="Bonus" value={newDrawBonus} onChange={e => setNewDrawBonus(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} className="w-20 h-12 text-center text-lg font-bold rounded-xl bg-white/5 border-2 border-orange-500/30 text-orange-400 focus:outline-none focus:border-orange-400" /></div>
                  <button onClick={saveSingleDraw} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Formato: <code className="text-green-400">fecha n1 n2 ... n{cfg.numCount} bonus</code> ({cfg.numCount} numeros + bonus)</p>
                  <textarea key={`batch-${lottery}`} value={batchInput} onChange={e => setBatchInput(e.target.value)} placeholder={lottery === 'lotto-649'
                    ? '2026-04-08 10 21 24 30 36 38 41\n2026-04-04 5 12 18 25 33 44 7'
                    : '2026-04-10 3 8 15 19 23 29 37 4\n2026-04-14 2 11 22 33 38 44 47 9'
                  } rows={6} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-green-400 resize-none placeholder:text-gray-600" />
                  <button onClick={saveBatchDraws} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar {batchInput.trim().split('\n').filter(l => l.trim()).length} Sorteo(s)</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <span>{cfg.name} Dashboard · Solo fines informativos</span>
          <span>{dbStatus ? `Datos al ${dbStatus.lastDrawDate} · ${dbStatus.totalDraws.toLocaleString()} sorteos` : 'Cargando...'}</span>
        </div>
      </footer>
    </div>
  );
}

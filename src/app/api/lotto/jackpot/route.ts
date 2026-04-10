import { NextResponse } from 'next/server';

// In-memory cache: jackpot data for 30 minutes
let cachedJackpot: {
  amount: number;
  formatted: string;
  nextDrawDate: string;
  source: string;
  fetchedAt: number;
} | null = null;

const CACHE_TTL = 30 * 60 * 1000;

function formatCAD(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `$${amount.toLocaleString('en-CA')}`;
}

function cleanHTML(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

// Calculate the next Lotto Max draw date from the last draw date
// Lotto Max draws are on Tuesdays and Fridays
function calculateNextDrawDate(lastDrawDateStr: string): string {
  try {
    const lastDraw = new Date(lastDrawDateStr + 'T00:00:00');
    if (isNaN(lastDraw.getTime())) {
      // If no valid date, calculate from today
      return calculateNextDrawFromToday([2, 5]); // Tue, Fri
    }

    const day = lastDraw.getDay();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    let nextDraw: Date;
    if (day === 2) {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 3);
    } else if (day === 5) {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 4);
    } else {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 1);
      while (nextDraw.getDay() !== 2 && nextDraw.getDay() !== 5) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }
    }

    return `${days[nextDraw.getDay()]}, ${months[nextDraw.getMonth()]} ${nextDraw.getDate()}, ${nextDraw.getFullYear()}`;
  } catch {
    return calculateNextDrawFromToday([2, 5]);
  }
}

function calculateNextDrawFromToday(drawDays: number[]): string {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = new Date();
  const next = new Date(today);
  next.setDate(today.getDate() + 1);
  while (!drawDays.includes(next.getDay())) {
    next.setDate(next.getDate() + 1);
  }
  return `${days[next.getDay()]}, ${months[next.getMonth()]} ${next.getDate()}, ${next.getFullYear()}`;
}

/** Get last draw date from static JSON via HTTP (Vercel-compatible) */
async function getLastDrawDate(): Promise<string> {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/lotto-summary.json`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return '';
    const summary = await res.json();
    return summary.lastDraw?.drawDate || '';
  } catch {
    return '';
  }
}

// Source 1: ca.lottonumbers.com
async function fetchFromLottoNumbers(): Promise<{ amount: number; source: string } | null> {
  try {
    console.log('[jackpot] Trying ca.lottonumbers.com...');
    const r = await fetch('https://ca.lottonumbers.com/lotto-max/numbers/latest', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-CA' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const text = cleanHTML(await r.text());

    const m = text.match(/(?:the\s+)?jackpot\s+(?:for\s+the\s+next\s+draw\s+)?(?:is\s+)?(?:estimated\s+at\s+)?\$(\d+(?:\.\d+)?)\s*(?:million|M)/i);
    if (m) {
      const amount = Math.round(parseFloat(m[1]) * 1_000_000);
      console.log(`[jackpot] ca.lottonumbers.com: $${amount.toLocaleString()}`);
      return { amount, source: 'ca.lottonumbers.com' };
    }
    console.log('[jackpot] ca.lottonumbers.com: no match found');
  } catch (e) { console.log(`[jackpot] lottonumbers: ${String(e).substring(0, 80)}`); }
  return null;
}

// Source 2: lottomaxnumbers.com
async function fetchFromLottoMaxNumbers(): Promise<{ amount: number; source: string } | null> {
  try {
    console.log('[jackpot] Trying lottomaxnumbers.com...');
    const r = await fetch('https://www.lottomaxnumbers.com/numbers/2025', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-CA' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const text = cleanHTML(await r.text());

    const amounts = [...text.matchAll(/\$(\d{1,3}(?:,\d{3})+)/g)];
    if (amounts.length > 0) {
      for (const match of amounts) {
        const amount = parseInt(match[1].replace(/,/g, ''));
        if (amount >= 5_000_000 && amount <= 120_000_000) {
          console.log(`[jackpot] lottomaxnumbers.com: $${amount.toLocaleString()}`);
          return { amount, source: 'lottomaxnumbers.com' };
        }
      }
    }
    console.log('[jackpot] lottomaxnumbers.com: no match found');
  } catch (e) { console.log(`[jackpot] lottomaxnumbers: ${String(e).substring(0, 80)}`); }
  return null;
}

// Source 3: SaskLotteries
async function fetchFromSask(): Promise<{ amount: number; source: string } | null> {
  try {
    console.log('[jackpot] Trying SaskLotteries...');
    const r = await fetch('https://www.sasklotteries.ca/games/lotto-max', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-CA' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const text = cleanHTML(await r.text());

    const m = text.match(/LOTTO\s+MAX\s+\$(\d+(?:\.\d+)?)\s+Million/i);
    if (m) {
      const amount = Math.round(parseFloat(m[1]) * 1_000_000);
      console.log(`[jackpot] SaskLotteries: $${amount.toLocaleString()}`);
      return { amount, source: 'SaskLotteries' };
    }
  } catch (e) { console.log(`[jackpot] Sask: ${String(e).substring(0, 80)}`); }
  return null;
}

// Source 4: ALC (Atlantic Lottery)
async function fetchFromALC(): Promise<{ amount: number; source: string } | null> {
  try {
    console.log('[jackpot] Trying ALC...');
    const r = await fetch('https://www.alc.ca/content/alc/en/our-games/lotto/lotto-max.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const text = cleanHTML(await r.text());
    const m = text.match(/\$(\d{1,3}(?:,\d{3})+)\s*(?:Gold\s+Ball\s+)?Jackpot/i);
    if (m) {
      const amount = parseInt(m[1].replace(/,/g, ''));
      if (amount >= 5_000_000 && amount <= 120_000_000) {
        console.log(`[jackpot] ALC: $${amount.toLocaleString()}`);
        return { amount, source: 'Atlantic Lottery' };
      }
    }
  } catch (e) { console.log(`[jackpot] ALC: ${String(e).substring(0, 60)}`); }
  return null;
}

// Source 5: lotto.net
async function fetchFromLottoNet(): Promise<{ amount: number; source: string } | null> {
  try {
    console.log('[jackpot] Trying lotto.net...');
    const r = await fetch('https://www.lotto.net/canada-lotto-max/numbers', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'en-CA' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const text = cleanHTML(await r.text());

    const m = text.match(/estimated\s+jackpot\s+\$(\d+(?:\.\d+)?)\s*(?:million|M)/i);
    if (m) {
      const amount = Math.round(parseFloat(m[1]) * 1_000_000);
      console.log(`[jackpot] lotto.net: $${amount.toLocaleString()}`);
      return { amount, source: 'lotto.net' };
    }
  } catch (e) { console.log(`[jackpot] lotto.net: ${String(e).substring(0, 60)}`); }
  return null;
}

async function fetchJackpotAmount(): Promise<{ amount: number; source: string }> {
  let result = await fetchFromLottoNumbers();
  if (result) return result;

  result = await fetchFromLottoNet();
  if (result) return result;

  result = await fetchFromSask();
  if (result) return result;

  result = await fetchFromALC();
  if (result) return result;

  result = await fetchFromLottoMaxNumbers();
  if (result) return result;

  return { amount: 18_000_000, source: 'default ($18M base)' };
}

export async function GET() {
  if (cachedJackpot && Date.now() - cachedJackpot.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ ...cachedJackpot, cached: true });
  }

  console.log('[jackpot] Fetching fresh jackpot data...');
  const { amount, source } = await fetchJackpotAmount();

  const lastDrawDate = await getLastDrawDate();
  const nextDrawDate = lastDrawDate ? calculateNextDrawDate(lastDrawDate) : calculateNextDrawFromToday([2, 5]);

  cachedJackpot = {
    amount,
    formatted: formatCAD(amount),
    nextDrawDate,
    source,
    fetchedAt: Date.now(),
  };

  console.log(`[jackpot] Final: ${formatCAD(amount)} from ${source} | Next draw: ${nextDrawDate}`);
  return NextResponse.json(cachedJackpot);
}

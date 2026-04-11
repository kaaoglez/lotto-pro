import { NextResponse } from 'next/server';

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

function calculateNextDrawDate(lastDrawDateStr: string): string {
  try {
    const lastDraw = new Date(lastDrawDateStr + 'T00:00:00');
    if (isNaN(lastDraw.getTime())) {
      return calculateNextDrawFromToday([3, 6]); // Wed, Sat
    }
    const day = lastDraw.getDay();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    let nextDraw: Date;
    if (day === 3) {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 3);
    } else if (day === 6) {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 4);
    } else {
      nextDraw = new Date(lastDraw);
      nextDraw.setDate(lastDraw.getDate() + 1);
      while (nextDraw.getDay() !== 3 && nextDraw.getDay() !== 6) {
        nextDraw.setDate(nextDraw.getDate() + 1);
      }
    }
    return `${days[nextDraw.getDay()]}, ${months[nextDraw.getMonth()]} ${nextDraw.getDate()}, ${nextDraw.getFullYear()}`;
  } catch {
    return calculateNextDrawFromToday([3, 6]);
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
    const res = await fetch(`${baseUrl}/lotto649-summary.json`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return '';
    const summary = await res.json();
    return summary.lastDraw?.drawDate || '';
  } catch {
    return '';
  }
}

async function scrape649(): Promise<{ amount: number; source: string }> {
  const sources = [
    {
      url: 'https://www.olg.ca/en/lottery/play-lotto-649-encore/about.html',
      // Matches "GOLD BALL $26 MILLION" or "$26 MILLION" near "Next jackpot"
      patterns: [
        /GOLD\s+BALL\s+\$(\d+)\s+MILLION/i,
        /\$(\d+)\s+MILLION\s+Or\s+\$1\s+Million/i,
        /Next\s+jackpot.{0,20}?\$(\d+)\s+MILLION/i,
      ],
      name: 'OLG (Gold Ball)',
      multiplier: 1_000_000,
    },
    {
      url: 'https://www.olg.ca/en/lottery/play-lotto-649-encore/past-results.html',
      patterns: [
        /NEXT\s+GOLD\s+BALL\s+JACKPOT:\s+\$(\d+(?:,\d{3})+)/i,
        /GOLD\s+BALL\s+\$(\d+)\s+MILLION/i,
      ],
      name: 'OLG Past Results',
      multiplier: 1_000_000,
    },
    {
      url: 'https://www.sasklotteries.ca/games/lotto-6-49',
      patterns: [/LOTTO\s+6\/49\s+\$(\d+(?:\.\d+)?)\s+Million/i],
      name: 'SaskLotteries',
      multiplier: 1_000_000,
    },
    {
      url: 'https://www.alc.ca/content/alc/en/our-games/lotto/lotto-649.html',
      patterns: [/(?:6\/49|649).{0,50}?\$(\d{1,3}(?:,\d{3})+)/i],
      name: 'ALC',
      multiplier: 1,
    },
    {
      url: 'https://www.lottonumbers.com/canada/6-49',
      patterns: [/jackpot.{0,30}?\$(\d+(?:\.\d+)?)\s*(?:million|M)/i],
      name: 'lottonumbers.com',
      multiplier: 1_000_000,
    },
  ];

  for (const src of sources) {
    try {
      const r = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const text = cleanHTML(await r.text());

      for (const pattern of src.patterns) {
        const m = text.match(pattern);
        if (m) {
          let amount: number;
          const raw = m[1];
          if (raw.includes(',')) {
            amount = parseInt(raw.replace(/,/g, ''));
          } else {
            amount = Math.round(parseFloat(raw) * src.multiplier);
          }
          if (amount >= 1_000_000 && amount <= 100_000_000) {
            console.log(`[jackpot-649] ${src.name}: $${amount.toLocaleString()} (raw: ${raw})`);
            return { amount, source: src.name };
          }
        }
      }
    } catch (e) { console.log(`[jackpot-649] ${src.name}: ${String(e).substring(0, 80)}`); }
  }

  return { amount: 5_000_000, source: 'default ($5M base)' };
}

export async function GET() {
  if (cachedJackpot && Date.now() - cachedJackpot.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ ...cachedJackpot, cached: true });
  }

  console.log('[jackpot-649] Fetching...');
  const { amount, source } = await scrape649();
  const lastDrawDate = await getLastDrawDate();
  const nextDrawDate = lastDrawDate ? calculateNextDrawDate(lastDrawDate) : calculateNextDrawFromToday([3, 6]);

  cachedJackpot = { amount, formatted: formatCAD(amount), nextDrawDate, source, fetchedAt: Date.now() };
  console.log(`[jackpot-649] Final: ${formatCAD(amount)} from ${source} | Next: ${nextDrawDate}`);
  return NextResponse.json(cachedJackpot);
}

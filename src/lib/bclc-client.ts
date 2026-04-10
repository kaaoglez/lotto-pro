/**
 * Client-side BCLC Fetcher
 *
 * Downloads BCLC ZIP files directly in the browser via CORS proxy,
 * parses them with fflate (browser-compatible ZIP library),
 * and returns structured draw data.
 *
 * This bypasses ALL Vercel serverless limitations:
 * - No filesystem issues
 * - No adm-zip compatibility problems
 * - No 10s timeout
 * - No memory persistence issues
 */

import { unzipSync } from 'fflate';

export interface ClientDraw {
  drawNumber: number;
  sequenceNumber: number;
  drawDate: string;
  numbers: number[];
  bonus: number;
}

const BCLC_URLS: Record<string, string> = {
  'lotto-max': 'https://www.playnow.com/resources/documents/downloadable-numbers/LOTTOMAX.zip',
  'lotto-649': 'https://www.playnow.com/resources/documents/downloadable-numbers/649.zip',
};

const CACHE_KEY_PREFIX = 'bclc_draws_';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/** Get cached draws from sessionStorage */
function getFromCache(type: string): ClientDraw[] | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${type}`);
    if (!raw) return null;
    const { draws, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${type}`);
      return null;
    }
    return draws;
  } catch {
    return null;
  }
}

/** Save draws to sessionStorage cache */
function saveToCache(type: string, draws: ClientDraw[]): void {
  try {
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}${type}`, JSON.stringify({
      draws,
      timestamp: Date.now(),
    }));
  } catch {
    // sessionStorage might be full or unavailable
  }
}

/** Parse Lotto Max CSV line */
function parseLottoMaxLine(line: string): ClientDraw | null {
  const match = line.match(/^"LOTTO MAX",(\d+),(\d+),"(\d{4}-\d{2}-\d{2})",(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    drawNumber: parseInt(match[1]),
    sequenceNumber: parseInt(match[2]),
    drawDate: match[3],
    numbers: [parseInt(match[4]), parseInt(match[5]), parseInt(match[6]), parseInt(match[7]), parseInt(match[8]), parseInt(match[9]), parseInt(match[10])],
    bonus: parseInt(match[11]),
  };
}

/** Parse Lotto 6/49 CSV line */
function parseLotto649Line(line: string): ClientDraw | null {
  const match = line.match(/^"(?:LOTTO 6\/49|649)",(\d+),(\d+),"(\d{4}-\d{2}-\d{2})",(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    drawNumber: parseInt(match[1]),
    sequenceNumber: parseInt(match[2]),
    drawDate: match[3],
    numbers: [parseInt(match[4]), parseInt(match[5]), parseInt(match[6]), parseInt(match[7]), parseInt(match[8]), parseInt(match[9])],
    bonus: parseInt(match[10]),
  };
}

/**
 * Fetch and parse BCLC ZIP file from the browser.
 * Uses CORS proxy to bypass cross-origin restrictions.
 */
export async function fetchBCLCClient(type: 'lotto-max' | 'lotto-649'): Promise<ClientDraw[]> {
  // Check cache first
  const cached = getFromCache(type);
  if (cached && cached.length > 0) {
    console.log(`[bclc-client] Using cached ${type} data:`, cached.length, 'draws');
    return cached;
  }

  const bclcUrl = BCLC_URLS[type];
  const proxyUrl = `/api/proxy-bclc?url=${encodeURIComponent(bclcUrl)}`;
  const parseLine = type === 'lotto-max' ? parseLottoMaxLine : parseLotto649Line;
  const identifier = type === 'lotto-max' ? 'LOTTO MAX' : '"649"';

  console.log(`[bclc-client] Fetching ${type} from BCLC via proxy...`);

  // Download ZIP via CORS proxy
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`BCLC proxy returned ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  console.log(`[bclc-client] ZIP downloaded: ${(uint8.length / 1024).toFixed(1)}KB. Parsing...`);

  // Parse ZIP with fflate (browser-compatible)
  let csvText: string | null = null;
  try {
    const unzipped = unzipSync(uint8);
    for (const [filename, data] of Object.entries(unzipped)) {
      if (filename.endsWith('.csv') || filename.toUpperCase().includes(type === 'lotto-max' ? 'LOTTOMAX' : '649')) {
        csvText = new TextDecoder('utf-8').decode(data);
        break;
      }
    }
    // If no CSV found by extension, search all files
    if (!csvText) {
      for (const [, data] of Object.entries(unzipped)) {
        const text = new TextDecoder('utf-8').decode(data);
        if (text.includes(identifier)) {
          csvText = text;
          break;
        }
      }
    }
  } catch (e) {
    throw new Error('Failed to parse ZIP: ' + String(e).substring(0, 80));
  }

  if (!csvText) {
    throw new Error('No CSV data found in ZIP file');
  }

  // Parse CSV lines
  const draws: ClientDraw[] = [];
  for (const line of csvText.split(/\r?\n/).filter(l => l.trim())) {
    const parsed = parseLine(line);
    if (parsed && parsed.sequenceNumber === 0) {
      draws.push(parsed);
    }
  }

  // Sort by draw number descending (newest first)
  draws.sort((a, b) => b.drawNumber - a.drawNumber);

  if (draws.length === 0) {
    throw new Error('No draws found in CSV data');
  }

  // Cache the results
  saveToCache(type, draws);

  console.log(`[bclc-client] Parsed ${draws.length} draws from ${type} BCLC data`);
  return draws;
}

/**
 * Load draws with fallback chain:
 * 1. Try client-side BCLC fetch
 * 2. Fall back to static JSON via HTTP
 */
export async function getDrawsWithFallback(
  type: 'lotto-max' | 'lotto-649',
  staticFile: string
): Promise<ClientDraw[]> {
  // Try BCLC first
  try {
    return await fetchBCLCClient(type);
  } catch (e) {
    console.warn(`[bclc-client] BCLC fetch failed: ${String(e).substring(0, 80)}`);
  }

  // Fallback: load static JSON
  try {
    const res = await fetch(`/${staticFile}`);
    if (res.ok) {
      const data = await res.json();
      const draws = data.allMainDraws || (Array.isArray(data) ? data : []);
      if (draws.length > 0) {
        console.log(`[bclc-client] Using static JSON fallback: ${draws.length} draws`);
        return draws;
      }
    }
  } catch (e) {
    console.warn(`[bclc-client] Static JSON fallback failed: ${String(e).substring(0, 80)}`);
  }

  throw new Error('No data available from any source');
}

/** Clear the session cache for a specific lottery type */
export function clearCache(type?: string): void {
  if (type) {
    sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${type}`);
  } else {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(CACHE_KEY_PREFIX))
      .forEach(k => sessionStorage.removeItem(k));
  }
}

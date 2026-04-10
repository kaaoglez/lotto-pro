/**
 * Lotto Max Data Store — Vercel-compatible
 *
 * Loads data from BCLC (live) or falls back to static JSON via HTTP.
 * NO filesystem access — works on Vercel serverless and localhost.
 */

export interface LottoMaxDraw {
  drawNumber: number;
  sequenceNumber: number;
  drawDate: string;
  numbers: number[];
  bonus: number;
}

const BCLC_URL = 'https://www.playnow.com/resources/documents/downloadable-numbers/LOTTOMAX.zip';

/** Build base URL for fetching static assets */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Load draws from static JSON file via HTTP (works on Vercel) */
async function loadFromHTTP(): Promise<LottoMaxDraw[] | null> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/lotto-data.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.allMainDraws || (Array.isArray(data) ? data : null);
  } catch (e) {
    console.log('[max-store] HTTP load failed:', String(e).substring(0, 80));
    return null;
  }
}

function parseCSVLine(line: string) {
  const match = line.match(/^"LOTTO MAX",(\d+),(\d+),"(\d{4}-\d{2}-\d{2})",(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    drawNumber: parseInt(match[1]), sequenceNumber: parseInt(match[2]), drawDate: match[3],
    numbers: [parseInt(match[4]), parseInt(match[5]), parseInt(match[6]), parseInt(match[7]), parseInt(match[8]), parseInt(match[9]), parseInt(match[10])],
    bonus: parseInt(match[11]),
  };
}

async function fetchFromBCLC(timeout = 8000): Promise<LottoMaxDraw[]> {
  const response = await fetch(BCLC_URL, {
    headers: { 'User-Agent': 'LottoMaxDashboard/1.0' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Try adm-zip with various import patterns for compatibility
  let csv: string | null = null;
  try {
    const AdmZip = await import('adm-zip');
    const Zip = (AdmZip as any).default || AdmZip;
    const zip = new Zip(buffer);
    for (const e of zip.getEntries()) {
      if (e.entryName.endsWith('.csv') || e.entryName.toUpperCase().includes('LOTTOMAX')) {
        csv = zip.readAsText(e); break;
      }
    }
    if (!csv) {
      for (const e of zip.getEntries()) {
        if (!e.isDirectory) {
          const t = zip.readAsText(e);
          if (t.includes('LOTTO MAX')) { csv = t; break; }
        }
      }
    }
  } catch (zipErr) {
    console.error('[max-store] adm-zip failed:', String(zipErr).substring(0, 120));
    throw new Error('ZIP parse failed: ' + String(zipErr).substring(0, 60));
  }

  if (!csv) throw new Error('No CSV found in ZIP');
  const draws: LottoMaxDraw[] = [];
  for (const line of csv.split(/\r?\n/).filter(l => l.trim())) {
    const p = parseCSVLine(line);
    if (p && p.sequenceNumber === 0) draws.push(p);
  }
  draws.sort((a, b) => b.drawNumber - a.drawNumber);
  if (draws.length === 0) throw new Error('No draws parsed from CSV');
  return draws;
}

/**
 * Get all draws. Tries BCLC first, then HTTP static JSON fallback.
 * Works on both localhost and Vercel serverless.
 */
export async function getAllDraws(forceRefresh = false): Promise<LottoMaxDraw[]> {
  // 1. Try BCLC live data
  try {
    return await fetchFromBCLC(forceRefresh ? 15000 : 8000);
  } catch (e) {
    console.log('[max-store] BCLC unavailable:', String(e).substring(0, 80));
  }

  // 2. Fallback: static JSON via HTTP (works on Vercel!)
  const httpData = await loadFromHTTP();
  if (httpData && httpData.length > 0) {
    console.log('[max-store] Using static JSON fallback:', httpData.length, 'draws');
    return httpData;
  }

  // 3. Last resort: retry BCLC with longer timeout
  try {
    return await fetchFromBCLC(20000);
  } catch (e) {
    console.error('[max-store] All sources failed');
    throw new Error('No data available — BCLC is unreachable and no cached data exists');
  }
}

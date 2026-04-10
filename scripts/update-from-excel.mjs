/**
 * ========================================
 * SCRIPT: Actualizar Base de Datos Lotto Max
 * ========================================
 *
 * 3 formas de usar:
 *
 * 1. Desde Excel (requiere: npm install xlsx)
 *    node scripts/update-from-excel.mjs --excel ./upload/LOTTOMAX\ with\ data.xlsm
 *
 * 2. Agregar sorteos individuales por consola
 *    node scripts/update-from-excel.mjs --add 2026-04-10 3 8 15 19 23 29 37 4
 *
 * 3. Desde archivo CSV/texto (un sorteo por linea: fecha,n1,n2,n3,n4,n5,n6,n7,bonus)
 *    node scripts/update-from-excel.mjs --file nuevos-sorteos.csv
 *
 * El script actualiza:
 *   - public/lotto-data.json   (base de datos completa)
 *   - public/lotto-summary.json (resumen para la UI)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_PATH = resolve(PROJECT_ROOT, 'public', 'lotto-data.json');
const SUMMARY_PATH = resolve(PROJECT_ROOT, 'public', 'lotto-summary.json');

// --- Parse CLI args ---
const args = process.argv.slice(2);
const mode = args[0];

function usage() {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   Lotto Max — Actualizar Base de Datos              ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Uso:                                                ║
║                                                      ║
║  1. Desde Excel:                                     ║
║     node scripts/update-from-excel.mjs --excel <path> ║
║     (requiere: npm install xlsx)                     ║
║                                                      ║
║  2. Un sorteo individual:                            ║
║     node scripts/update-from-excel.mjs --add         ║
║       <fecha> <n1> <n2> <n3> <n4> <n5> <n6> <n7>    ║
║       <bonus>                                        ║
║     Ejemplo:                                         ║
║     node scripts/update-from-excel.mjs --add         ║
║       2026-04-10 3 8 15 19 23 29 37 4               ║
║                                                      ║
║  3. Desde archivo CSV/texto:                         ║
║     node scripts/update-from-excel.mjs --file <path> ║
║     Formato (una linea por sorteo):                  ║
║     fecha,n1,n2,n3,n4,n5,n6,n7,bonus                ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

// --- Data helpers ---
function loadExistingData() {
  if (!existsSync(DATA_PATH)) {
    console.error('❌ No se encontro lotto-data.json en public/');
    process.exit(1);
  }
  return JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
}

function buildSummary(allDraws) {
  const frequency = [];
  for (let i = 1; i <= 50; i++) frequency.push({ number: i, frequency: 0 });
  for (const draw of allDraws) {
    for (const n of draw.numbers) frequency[n - 1].frequency++;
  }
  return {
    totalMainDraws: allDraws.length,
    dateRange: {
      start: allDraws[allDraws.length - 1].drawDate,
      end: allDraws[0].drawDate,
    },
    lastDraw: allDraws[0],
    recentDraws: allDraws.slice(0, 30),
    frequency,
  };
}

function saveData(allDraws) {
  const summary = buildSummary(allDraws);
  const fullData = { ...summary, allMainDraws: allDraws };

  writeFileSync(DATA_PATH, JSON.stringify(fullData, null, 2), 'utf-8');
  writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`✅ Guardado: ${allDraws.length} sorteos totales`);
  console.log(`   📁 ${DATA_PATH}`);
  console.log(`   📁 ${SUMMARY_PATH}`);
  console.log(`   📅 Rango: ${summary.dateRange.start} → ${summary.dateRange.end}`);
  console.log(`   🎯 Ultimo sorteo: #${allDraws[0].drawNumber} del ${allDraws[0].drawDate}`);
}

function validateDraw(nums, bonus, date) {
  if (nums.length !== 7) return 'Se requieren exactamente 7 numeros';
  if (new Set(nums).size !== 7) return 'Los numeros deben ser unicos';
  if (nums.some(n => n < 1 || n > 50)) return 'Numeros deben estar entre 1 y 50';
  if (isNaN(bonus) || bonus < 1 || bonus > 50) return 'Bonus debe ser entre 1 y 50';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Fecha debe ser YYYY-MM-DD';
  return null;
}

// --- Mode: Add single draw ---
function addSingleDraw(date, numStrs, bonusStr) {
  const data = loadExistingData();
  const allDraws = data.allMainDraws;
  const nums = numStrs.map(Number);
  const bonus = Number(bonusStr);

  const err = validateDraw(nums, bonus, date);
  if (err) { console.error('❌', err); process.exit(1); }

  const existingDates = new Set(allDraws.map(d => d.drawDate));
  if (existingDates.has(date)) {
    console.error(`❌ El sorteo del ${date} ya existe en la base de datos`);
    process.exit(1);
  }

  const newDraw = {
    drawNumber: allDraws[0].drawNumber + 1,
    sequenceNumber: 0,
    drawDate: date,
    numbers: [...nums].sort((a, b) => a - b),
    bonus,
  };

  allDraws.unshift(newDraw);
  saveData(allDraws);
  console.log(`\n🎯 Nuevo sorteo agregado: #${newDraw.drawNumber}`);
  console.log(`   Fecha: ${date}`);
  console.log(`   Numeros: ${newDraw.numbers.join(', ')}`);
  console.log(`   Bonus: ${bonus}`);
}

// --- Mode: Add from text file ---
function addFromFile(filePath) {
  const full = resolve(process.cwd(), filePath);
  if (!existsSync(full)) {
    console.error(`❌ No se encontro el archivo: ${full}`);
    process.exit(1);
  }

  const content = readFileSync(full, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));

  const data = loadExistingData();
  const allDraws = data.allMainDraws;
  const existingDates = new Set(allDraws.map(d => d.drawDate));
  let nextNum = allDraws[0].drawNumber + 1;
  let added = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].trim().split(/[,\s\t]+/);
    if (parts.length < 9) {
      console.warn(`⚠️  Linea ${i + 1} omitida: formato invalido (se necesitan 9 campos)`);
      continue;
    }
    const date = parts[0];
    const nums = parts.slice(1, 8).map(Number);
    const bonus = Number(parts[8]);

    const err = validateDraw(nums, bonus, date);
    if (err) { console.warn(`⚠️  Linea ${i + 1} omitida: ${err}`); continue; }
    if (existingDates.has(date)) { console.warn(`⚠️  Linea ${i + 1} omitida: ${date} ya existe`); continue; }

    existingDates.add(date);
    allDraws.unshift({
      drawNumber: nextNum++,
      sequenceNumber: 0,
      drawDate: date,
      numbers: [...nums].sort((a, b) => a - b),
      bonus,
    });
    added++;
  }

  if (added === 0) {
    console.log('ℹ️  No se agregaron sorteos nuevos');
    process.exit(0);
  }

  saveData(allDraws);
  console.log(`\n✅ ${added} sorteos agregados de ${lines.length} lineas procesadas`);
}

// --- Mode: From Excel ---
async function updateFromExcel(excelPath) {
  const full = resolve(process.cwd(), excelPath);
  if (!existsSync(full)) {
    console.error(`❌ No se encontro el archivo: ${full}`);
    process.exit(1);
  }

  console.log('📖 Leyendo archivo Excel...');
  let XLSX;
  try {
    XLSX = (await import('xlsx')).default;
  } catch {
    console.error('❌ Se requiere la libreria "xlsx" para leer archivos Excel');
    console.error('   Instala con: npm install xlsx');
    process.exit(1);
  }

  const workbook = XLSX.readFile(full);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`   Hoja: ${sheetName}, ${rows.length} filas`);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    if (row.some(c => c.includes('draw') || c.includes('date') || c.includes('fecha') || c.includes('sorteo'))) {
      headerIdx = i;
      break;
    }
  }

  // If no header found, try to find date-like column
  if (headerIdx === -1) {
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const row = rows[i];
      if (row.some(c => {
        const s = String(c || '');
        return /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s);
      })) {
        headerIdx = i - 1;
        break;
      }
    }
  }

  if (headerIdx === -1) headerIdx = 0;

  const headers = rows[headerIdx]?.map(c => String(c || '').toLowerCase()) || [];
  console.log(`   Fila de encabezado: ${headerIdx}`);
  console.log(`   Encabezados: ${headers.join(' | ')}`);

  // Parse draws
  const draws = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 8) continue;

    // Try to find date column
    let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('fecha'));
    if (dateIdx === -1) dateIdx = 0;

    let dateVal = row[dateIdx];
    if (typeof dateVal === 'number') {
      // Excel serial date
      const d = new Date((dateVal - 25569) * 86400 * 1000);
      dateVal = d.toISOString().split('T')[0];
    } else {
      dateVal = String(dateVal || '').trim();
      // Parse various date formats
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateVal)) {
        const [m, d, y] = dateVal.split('/');
        dateVal = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) continue;

    // Find number columns - look for 7 consecutive numeric columns
    let numStartIdx = -1;
    for (let j = 0; j < row.length - 6; j++) {
      const slice = row.slice(j, j + 7);
      if (slice.every(c => typeof c === 'number' && c >= 1 && c <= 50)) {
        numStartIdx = j;
        break;
      }
    }
    if (numStartIdx === -1) continue;

    const nums = row.slice(numStartIdx, numStartIdx + 7).map(Number);
    const bonusIdx = numStartIdx + 7;
    const bonus = Number(row[bonusIdx]);

    if (nums.length === 7 && new Set(nums).size === 7 && bonus >= 1 && bonus <= 50) {
      draws.push({
        drawDate: dateVal,
        numbers: [...nums].sort((a, b) => a - b),
        bonus,
      });
    }
  }

  if (draws.length === 0) {
    console.error('❌ No se pudieron extraer sorteos del archivo Excel');
    console.error('   Verifica que el formato tenga: fecha, 7 numeros (1-50), bonus');
    process.exit(1);
  }

  // Sort by date descending (newest first)
  draws.sort((a, b) => b.drawDate.localeCompare(a.drawDate));

  console.log(`📊 ${draws.length} sorteos extraidos del Excel`);

  // Build full data
  const existingDates = new Set();
  const uniqueDraws = [];
  for (const draw of draws) {
    if (!existingDates.has(draw.drawDate)) {
      existingDates.add(draw.drawDate);
      uniqueDraws.push(draw);
    }
  }

  // Assign draw numbers
  const allDraws = uniqueDraws.map((d, i) => ({
    drawNumber: uniqueDraws.length - i,
    sequenceNumber: 0,
    ...d,
  }));

  saveData(allDraws);
  console.log(`\n🎉 Base de datos reconstruida completamente desde Excel`);
  console.log(`   Total: ${allDraws.length} sorteos`);
  console.log(`   Rango: ${allDraws[allDraws.length - 1].drawDate} → ${allDraws[0].drawDate}`);
}

// --- Main ---
if (!mode || mode === '--help' || mode === '-h') {
  usage();
}

if (mode === '--add') {
  if (args.length < 10) {
    console.error('❌ Uso: --add <fecha> <n1> <n2> <n3> <n4> <n5> <n6> <n7> <bonus>');
    console.error('   Ejemplo: --add 2026-04-10 3 8 15 19 23 29 37 4');
    process.exit(1);
  }
  const [, , date, ...numArgs] = args;
  const numStrs = numArgs.slice(0, 7);
  const bonusStr = numArgs[7];
  addSingleDraw(date, numStrs, bonusStr);
}

else if (mode === '--file') {
  if (!args[1]) {
    console.error('❌ Uso: --file <path-al-archivo>');
    process.exit(1);
  }
  addFromFile(args[1]);
}

else if (mode === '--excel') {
  if (!args[1]) {
    console.error('❌ Uso: --excel <path-al-archivo-excel>');
    console.error('   Ejemplo: --excel ./upload/LOTTOMAX\\ with\\ data.xlsm');
    process.exit(1);
  }
  updateFromExcel(args[1]);
}

else {
  console.error(`❌ Modo desconocido: ${mode}`);
  usage();
}

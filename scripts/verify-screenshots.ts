/**
 * Проверка срезов в src/data/snapshot.ts:
 * 1) хронологический порядок SNAPSHOTS;
 * 2) соответствие файлов в public/screenshots;
 * 3) при запуске с dev-сервером и OPENAI_API_KEY — сверка данных на скриншотах с таблицей (через /api/parse-snapshot-image).
 *
 * Запуск проверки порядка и файлов (без API):
 *   npx tsx scripts/verify-screenshots.ts
 *
 * Запуск с проверкой данных по скринам (нужны npm run dev и OPENAI_API_KEY в .env):
 *   npx tsx scripts/verify-screenshots.ts --parse
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SNAPSHOTS } from '../src/data/snapshot';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'public', 'screenshots');

const CHANNEL_ORDER = [
  'prodtomorrow', 'sshultse', 'pxPerson_produced', 'nix_ux_view', 'tooltipp',
  'trueredorescue', 'DesignDictatorship', 'dsgn_thinking', 'visuaaaals',
  'kuntsevich_design', 'lx_grzdv_links', 'yuliapohilko',
];

function checkChronologicalOrder(): boolean {
  let ok = true;
  for (let i = 1; i < SNAPSHOTS.length; i++) {
    const prev = new Date(SNAPSHOTS[i - 1].datetime).getTime();
    const curr = new Date(SNAPSHOTS[i].datetime).getTime();
    if (curr <= prev) {
      console.error(`❌ Порядок: срез ${i} (${SNAPSHOTS[i].label}) идёт раньше или равно предыдущему`);
      ok = false;
    }
  }
  if (ok) console.log('✅ Хронологический порядок SNAPSHOTS: верный');
  return ok;
}

function checkScreenshotFiles(): { ok: boolean; expected: string[] } {
  const expected = SNAPSHOTS.map((s) => {
    const [date] = s.datetime.split('T');
    const [y, m, d] = date.split('-');
    const time = s.time.replace(':', '-');
    return `slice-${y}-${m}-${d}-${time}.png`;
  });
  const files = fs.existsSync(SCREENSHOTS_DIR) ? fs.readdirSync(SCREENSHOTS_DIR) : [];
  let ok = true;
  for (const name of expected) {
    if (!files.includes(name)) {
      console.error(`❌ Файл отсутствует: public/screenshots/${name}`);
      ok = false;
    }
  }
  if (ok) console.log('✅ Файлы скриншотов в public/screenshots: все на месте');
  return { ok, expected };
}

async function parseImageAndCompare(baseUrl: string, sliceIndex: number): Promise<boolean> {
  const slice = SNAPSHOTS[sliceIndex];
  const [date] = slice.datetime.split('T');
  const [y, m, d] = date.split('-');
  const time = slice.time.replace(':', '-');
  const fileName = `slice-${y}-${m}-${d}-${time}.png`;
  const filePath = path.join(SCREENSHOTS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`  Пропуск: файл не найден ${fileName}`);
    return true;
  }
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  const res = await fetch(`${baseUrl}/api/parse-snapshot-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  ❌ ${slice.label}: API ошибка ${res.status} ${text.slice(0, 100)}`);
    return false;
  }
  let parsed: { members?: Record<string, number> };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error(`  ❌ ${slice.label}: невалидный JSON`);
    return false;
  }
  const members = parsed.members;
  if (!members || typeof members !== 'object') {
    console.error(`  ❌ ${slice.label}: в ответе нет members`);
    return false;
  }

  let match = true;
  for (const key of CHANNEL_ORDER) {
    const expected = slice.members[key];
    const actual = members[key] ?? members[key.replace(/_/g, '')];
    if (expected !== undefined && actual !== undefined && Number(actual) !== expected) {
      console.error(`  ❌ ${slice.label} · ${key}: в таблице ${expected}, на скрине ${actual}`);
      match = false;
    }
  }
  if (match) console.log(`  ✅ ${slice.label}`);
  return match;
}

async function main() {
  console.log('Проверка срезов snapshot.ts\n');

  let orderOk = checkChronologicalOrder();
  const { ok: filesOk } = checkScreenshotFiles();
  console.log('');

  const doParse = process.argv.includes('--parse');
  if (doParse) {
    const baseUrl = process.env.VITE_DEV_URL || 'http://localhost:5173';
    console.log(`Проверка данных на скриншотах (API: ${baseUrl})...\n`);
    let parseOk = true;
    for (let i = 0; i < SNAPSHOTS.length; i++) {
      const ok = await parseImageAndCompare(baseUrl, i);
      if (!ok) parseOk = false;
    }
    console.log('');
    if (parseOk) console.log('✅ Все скриншоты совпадают с данными в таблице');
    else console.error('❌ Есть расхождения (см. выше)');
    process.exit(orderOk && filesOk && parseOk ? 0 : 1);
  } else {
    console.log('Подсказка: для сверки данных на скриншотах с таблицей запустите');
    console.log('  npm run dev');
    console.log('  npx tsx scripts/verify-screenshots.ts --parse');
    console.log('(нужен OPENAI_API_KEY в .env)\n');
    process.exit(orderOk && filesOk ? 0 : 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

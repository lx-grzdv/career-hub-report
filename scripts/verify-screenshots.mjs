/**
 * Проверка срезов: хронологический порядок и наличие файлов скриншотов.
 * Запуск: node scripts/verify-screenshots.mjs
 *
 * Для сверки данных на скриншотах с таблицей (через API) используйте:
 *   npm run dev
 *   npx tsx scripts/verify-screenshots.ts --parse
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const snapshotPath = path.join(ROOT, 'src', 'data', 'snapshot.ts');
const screenshotsDir = path.join(ROOT, 'public', 'screenshots');

const content = fs.readFileSync(snapshotPath, 'utf8');

// Извлекаем datetime из SNAPSHOTS (только блок среза)
const snapStart = content.indexOf('export const SNAPSHOTS');
const sliceBlock = content.slice(snapStart);
const datetimeRe = /datetime:\s*'([^']+)'/g;
const sliceDatetimes = [...sliceBlock.matchAll(datetimeRe)].map((m) => m[1]);

let orderOk = true;
for (let i = 1; i < sliceDatetimes.length; i++) {
  const prev = new Date(sliceDatetimes[i - 1]).getTime();
  const curr = new Date(sliceDatetimes[i]).getTime();
  if (curr <= prev) {
    console.error(`❌ Порядок: срез ${i} (${sliceDatetimes[i]}) идёт раньше или равно предыдущему`);
    orderOk = false;
  }
}
if (orderOk) console.log('✅ Хронологический порядок SNAPSHOTS: верный');

const files = fs.existsSync(screenshotsDir) ? fs.readdirSync(screenshotsDir) : [];
let filesOk = true;
for (let i = 0; i < sliceDatetimes.length; i++) {
  const iso = sliceDatetimes[i]; // e.g. 2026-02-09T11:34:41
  const [date, timePart] = iso.split('T');
  const [y, m, d] = date.split('-');
  const time = (timePart || '').slice(0, 5).replace(':', '-'); // 11:34 -> 11-34
  const name = `slice-${y}-${m}-${d}-${time}.png`;
  if (!files.includes(name)) {
    console.error(`❌ Файл отсутствует: public/screenshots/${name}`);
    filesOk = false;
  }
}
if (filesOk) console.log('✅ Файлы скриншотов в public/screenshots: все на месте');

console.log('\nПодсказка: для сверки данных на скриншотах с таблицей:');
console.log('  npm run dev');
console.log('  npx tsx scripts/verify-screenshots.ts --parse');
console.log('(нужен OPENAI_API_KEY в .env)\n');

process.exit(orderOk && filesOk ? 0 : 1);

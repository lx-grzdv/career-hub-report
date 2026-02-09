/**
 * Генерация финального вывода по актуальным данным отчёта через OpenAI.
 * Запуск: npm run generate-conclusion (нужен OPENAI_API_KEY в .env)
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { snapshotMembers, SNAPSHOT_LABEL, REPORT_START_LABEL, SNAPSHOT_WAVE_NUMBER } from '../src/data/snapshot';
import { BASE_CHANNEL_DATA } from '../src/data/channelBase';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

type Row = (typeof BASE_CHANNEL_DATA)[number];

function mergeWithSnapshot(base: typeof BASE_CHANNEL_DATA): Row[] {
  return base.map((row) => {
    const username = row.channel.replace('@', '');
    const snapshotFinal = snapshotMembers[username];
    if (snapshotFinal == null) return row;
    const growth3 = snapshotFinal - row.current;
    const total = snapshotFinal - row.base;
    return { ...row, final: snapshotFinal, growth3, total };
  });
}

function buildSummary(channelData: Row[]) {
  const donors = channelData.filter((r) => r.type === 'donor');
  const beneficiaries = channelData.filter((r) => r.type === 'beneficiary');
  const sorted = [...channelData].sort((a, b) => b.total - a.total);
  const totalMin = Math.min(...channelData.map((r) => r.total));
  const totalMax = Math.max(...channelData.map((r) => r.total));
  const avgGrowth = Math.round(
    channelData.reduce((s, r) => s + r.total, 0) / channelData.length
  );
  const wave2Range = `+${Math.min(...channelData.map((r) => r.growth2))}…+${Math.max(...channelData.map((r) => r.growth2))}`;
  const wave3Range = `+${Math.min(...channelData.map((r) => r.growth3))}…+${Math.max(...channelData.map((r) => r.growth3))}`;
  const wave2Sorted = [...channelData].sort((a, b) => b.growth2 - a.growth2);
  const wave3Sorted = [...channelData].sort((a, b) => (b.growth3 ?? 0) - (a.growth3 ?? 0));
  const channelTable = channelData
    .map(
      (r) =>
        `${r.channel}: база ${r.base}, волна1 +${r.growth1}, волна2 +${r.growth2}, волна${SNAPSHOT_WAVE_NUMBER} +${r.growth3 ?? 0}, итого +${r.total}, тип ${r.type}`
    )
    .join('\n');
  return {
    snapshotLabel: SNAPSHOT_LABEL,
    reportStartLabel: REPORT_START_LABEL,
    donors: donors.map((r) => r.channel),
    beneficiaries: beneficiaries.map((r) => r.channel),
    topByGrowth: sorted.slice(0, 4).map((r) => ({ channel: r.channel, total: r.total })),
    wave2Leaders: wave2Sorted.slice(0, 4).map((r) => ({ channel: r.channel, growth2: r.growth2 })),
    wave3Leaders: wave3Sorted.slice(0, 4).map((r) => ({ channel: r.channel, growth3: r.growth3 ?? 0 })),
    totalGrowthRange: { min: totalMin, max: totalMax },
    averageGrowth: avgGrowth,
    channelCount: channelData.length,
    wave2Range,
    wave3Range,
    snapshotWaveNumber: SNAPSHOT_WAVE_NUMBER,
    channelTable,
  };
}

type InsightBlock = { category: string; title: string; content: string };

async function generateWithOpenAI(summary: ReturnType<typeof buildSummary>): Promise<{
  intro: string;
  bullets: string[];
  closing: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY не задан. Добавьте в .env или export OPENAI_API_KEY=...');
  }

  const prompt = `Ты аналитик. По данным отчёта папки Career Hub в Telegram сформируй краткий финальный вывод на русском.

Данные:
- Период: с ${summary.reportStartLabel} до снапшота ${summary.snapshotLabel}
- Каналов: ${summary.channelCount}
- Диапазон прироста по каналам: +${summary.totalGrowthRange.min}…+${summary.totalGrowthRange.max}
- Средний прирост: +${summary.averageGrowth}
- Доноры (высокий overlap): ${summary.donors.join(', ')}
- Бенефициары (низкий overlap): ${summary.beneficiaries.join(', ')}
- Топ по приросту: ${summary.topByGrowth.map((r) => `${r.channel} (+${r.total})`).join(', ')}

Ответь строго в формате JSON (без markdown, без \`\`\`):
{
  "intro": "Один абзац: как сработала папка (механизм выравнивания / балансир и т.п.). Без кавычек внутри.",
  "bullets": ["Первый вывод (ядро/доноры)", "Второй вывод (хвост/бенефициары)", "Третий вывод (распределение роста)"],
  "closing": "Один абзац: общий вывод про папки в Telegram (балансиры аудиторий и т.п.). Без кавычек внутри."
}

Только валидный JSON.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Пустой ответ от OpenAI');

  return JSON.parse(content) as { intro: string; bullets: string[]; closing: string };
}

async function generateInsightsWithOpenAI(
  summary: ReturnType<typeof buildSummary>
): Promise<InsightBlock[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const prompt = `Ты аналитик. По таблице данных отчёта папки Career Hub сформируй 6 блоков «Ключевые инсайты» на русском.

Важно: пиши именно наблюдения по данным — называй каналы по имени, указывай конкретные числа прироста (например: «@visuaaaals лидер волны 2 (+76)», «диапазон итого +76…+101»). Не давай общих определений терминов (не «доноры — это каналы с высоким overlap», а «доноры в этом срезе: @DesignDictatorship, @kuntsevich_design, @dsgn_thinking — у них малый direct-прирост, но они подтягивают других»).

Период: с ${summary.reportStartLabel} до снапшота ${summary.snapshotLabel}. Каналов: ${summary.channelCount}.

Таблица по каналам (база, волна1, волна2, волна${summary.snapshotWaveNumber}, итого, тип):
${summary.channelTable}

Сводка: доноры (тип donor): ${summary.donors.join(', ')}; бенефициары (тип beneficiary): ${summary.beneficiaries.join(', ')}. Топ по итогу: ${summary.topByGrowth.map((r) => `${r.channel} (+${r.total})`).join(', ')}. Лидеры волны 2: ${summary.wave2Leaders.map((r) => `${r.channel} (+${r.growth2})`).join(', ')}. Лидеры волны ${summary.snapshotWaveNumber}: ${summary.wave3Leaders.map((r) => `${r.channel} (+${r.growth3})`).join(', ')}. Диапазон итого: +${summary.totalGrowthRange.min}…+${summary.totalGrowthRange.max}, волна 2: ${summary.wave2Range}, волна ${summary.snapshotWaveNumber}: ${summary.wave3Range}.

Ответь строго в формате JSON (без markdown, без \`\`\`):
{
  "blocks": [
    { "category": "Высокий Overlap", "title": "ДОНОРЫ ЭКОСИСТЕМЫ", "content": "Наблюдение по данным: перечисли доноров из таблицы, укажи их прирост по волнам и итого; отметь, что direct-рост у них небольшой, но они работают как доноры для других." },
    { "category": "Низкий Overlap", "title": "ГЛАВНЫЕ БЕНЕФИЦИАРЫ", "content": "Наблюдение по данным: перечисли бенефициаров и их прирост; назови лидера волны 2 по имени и числу (+N)." },
    { "category": "Ключевой инсайт", "title": "НИЗКИЙ ПРИРОСТ ≠ СЛАБЫЙ КАНАЛ", "content": "Наблюдение по данным: приведи пример канала с низким приростом из таблицы и поясни, что это признак интеграции в ядро (донорство), а не слабости." },
    { "category": "Структурная роль", "title": "ДОНОРСТВО ≠ ТАЙМИНГ", "content": "Наблюдение по данным: на примере доноров из таблицы покажи, что их роль не от тайминга поста, а от насыщенности аудитории (цифры прироста по волнам)." },
    { "category": "Вторая и третья волны", "title": "ПОСТЕПЕННАЯ РАСПАКОВКА", "content": "Наблюдение по данным: укажи диапазоны прироста волна 2 (${summary.wave2Range}) и волна ${summary.snapshotWaveNumber} (${summary.wave3Range}); приведи каналы, у которых основной прирост пришёлся на 2–3 волну." },
    { "category": "Финальный эффект", "title": "ВЫРАВНИВАНИЕ ЭКОСИСТЕМЫ", "content": "Наблюдение по данным: укажи фактический диапазон итого +${summary.totalGrowthRange.min}…+${summary.totalGrowthRange.max}, отметь, что каналы вышли в близкий диапазон (привести 1–2 примера из таблицы)." }
  ]
}

Только валидный JSON. В каждом content — только факты из таблицы и сводки: каналы по имени, числа прироста, без общих формулировок.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    }),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return [];
  const parsed = JSON.parse(content) as { blocks?: InsightBlock[] };
  return Array.isArray(parsed.blocks) && parsed.blocks.length >= 6 ? parsed.blocks.slice(0, 6) : [];
}

function escapeForTs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
}

/** Экранирование для строки в TS с сохранением переносов строк (для content инсайтов). */
function escapeForTsMultiline(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function writeConclusionFile(conclusion: { intro: string; bullets: string[]; closing: string }) {
  const generatedAt = new Date().toISOString();
  const bulletsStr = conclusion.bullets.map((b) => `  '${escapeForTs(b)}',`).join('\n');
  const content = `/**
 * Финальный вывод отчёта. Сгенерировано скриптом generate-conclusion по актуальным данным.
 * Чтобы обновить: npm run generate-conclusion (OPENAI_API_KEY в .env)
 */
export interface ConclusionData {
  intro: string;
  bullets: string[];
  closing: string;
}

export const CONCLUSION_GENERATED_AT: string | null = '${generatedAt}';

export const CONCLUSION: ConclusionData = {
  intro: '${escapeForTs(conclusion.intro)}',
  bullets: [\n${bulletsStr}\n  ],
  closing: '${escapeForTs(conclusion.closing)}',
};
`;
  const outPath = join(rootDir, 'src/data/conclusion.ts');
  writeFileSync(outPath, content, 'utf-8');
  console.log('Записано:', outPath);
  console.log('Дата генерации:', generatedAt);
}

function writeInsightsFile(blocks: InsightBlock[]) {
  const generatedAt = new Date().toISOString();
  const blocksStr = blocks
    .map(
      (b) => `  {
    category: '${escapeForTs(b.category)}',
    title: '${escapeForTs(b.title)}',
    content: '${escapeForTsMultiline(b.content)}',
  }`
    )
    .join(',\n');
  const content = `/**
 * Ключевые инсайты. Сгенерировано скриптом generate-conclusion по актуальным данным.
 * Обновить: npm run generate-conclusion
 */
export interface InsightBlock {
  category: string;
  title: string;
  content: string;
}

export const INSIGHTS_GENERATED_AT: string | null = '${generatedAt}';

export const INSIGHTS: InsightBlock[] = [\n${blocksStr}\n];
`;
  const outPath = join(rootDir, 'src/data/insights.ts');
  writeFileSync(outPath, content, 'utf-8');
  console.log('Записано:', outPath);
}

async function main() {
  const channelData = mergeWithSnapshot(BASE_CHANNEL_DATA);
  const summary = buildSummary(channelData);
  console.log('Данные для вывода:', JSON.stringify(summary, null, 2));
  const [conclusion, insightBlocks] = await Promise.all([
    generateWithOpenAI(summary),
    generateInsightsWithOpenAI(summary),
  ]);
  writeConclusionFile(conclusion);
  if (insightBlocks.length >= 6) {
    writeInsightsFile(insightBlocks);
  } else {
    console.log('Инсайты не сгенерированы (оставляем текущие в src/data/insights.ts)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Генерация инсайтов по одному каналу через OpenAI.
 * Запуск: npx tsx scripts/generate-channel-insight.ts @tooltipp
 * Нужен OPENAI_API_KEY в .env
 */
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { snapshotMembers, SNAPSHOT_LABEL } from '../src/data/snapshot';
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

function buildChannelInsightPrompt(
  targetRow: Row & { final?: number; growth3?: number; total?: number },
  allChannelData: (Row & { final?: number })[],
  snapshotLabel: string
): string {
  const folderChannels = allChannelData.map((r) => r.channel).join(', ');
  const baselineData = allChannelData
    .map((r) => `${r.channel}: base=${r.base}, 11:30=${r.wave1}, 15:30=${r.wave2}, 18:06=${r.current}`)
    .join('\n');
  const snapshotData =
    snapshotLabel +
    '\n' +
    allChannelData.map((r) => `${r.channel}: ${(r as { final?: number }).final ?? r.current}`).join('\n');
  const optionalSnapshots = allChannelData
    .map((r) => `${r.channel}: 11:30=${r.wave1}, 15:30=${r.wave2}, 18:06=${r.current}`)
    .join('\n');

  const prompt = `Ты — аналитик роста Telegram-каналов внутри папки. Сгенерируй инсайты и гипотезы для ОДНОГО канала на основе числовых срезов подписчиков.

ВХОД:
- TARGET_CHANNEL: <handle>
- BASELINE_DATA, SNAPSHOT_DATA, OPTIONAL_SNAPSHOTS, FOLDER_CHANNELS — см. данные ниже.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1) Никаких определений терминов. Только выводы и гипотезы, подкреплённые числами.
2) Каждый инсайт — минимум 2 конкретные цифры.
3) Не выдумывать отсутствующие точки.
4) Сравни TARGET_CHANNEL с остальными: место в рейтинге по Total, профиль роста (импульс vs хвост), late-tail.
5) Гипотезы привязаны к данным (overlap, витрина, донорский эффект, тайминг).
6) Структура ответа: A) TL;DR  B) Метрики  C) Инсайты  D) Гипотезы  E) Что делать  F) Контекст сравнения. Пиши на русском.

ЧТО ПОСЧИТАТЬ: Start=11:00(base), Wave1=Δ(11:00→11:30), Wave2=Δ(11:30→15:30), Total=Δ(11:00→latest), LateTail=Δ(18:06→latest).

ДАННЫЕ:
TARGET_CHANNEL:
${targetRow.channel}

FOLDER_CHANNELS:
${folderChannels}

BASELINE_DATA:
${baselineData}

SNAPSHOT_DATA:
${snapshotData}

OPTIONAL_SNAPSHOTS (11:30, 15:30, 18:06):
${optionalSnapshots}
`;
  return prompt;
}

async function main() {
  const channelArg = process.argv[2];
  if (!channelArg) {
    console.error('Укажите канал: npx tsx scripts/generate-channel-insight.ts @tooltipp');
    process.exit(1);
  }
  const channel = channelArg.startsWith('@') ? channelArg : `@${channelArg}`;

  const channelData = mergeWithSnapshot(BASE_CHANNEL_DATA);
  const targetRow = channelData.find((r) => r.channel === channel);
  if (!targetRow) {
    console.error('Канал не найден в папке:', channel);
    console.error('Доступные:', channelData.map((r) => r.channel).join(', '));
    process.exit(1);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY не задан. Добавьте в .env');
    process.exit(1);
  }

  const prompt = buildChannelInsightPrompt(targetRow, channelData, SNAPSHOT_LABEL);

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
    console.error('OpenAI API:', res.status, err);
    process.exit(1);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error('Пустой ответ от OpenAI');
    process.exit(1);
  }

  console.log(content);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

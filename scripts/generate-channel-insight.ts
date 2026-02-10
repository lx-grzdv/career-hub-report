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
import { CHANNEL_PROFILES } from '../src/data/channelProfiles';

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
  const optionalProfile = CHANNEL_PROFILES[targetRow.channel] ?? '';
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

  const prompt = `Ты — аналитик роста Telegram‑каналов внутри ОДНОЙ папки. Дай короткий, «человеческий» разбор ОДНОГО канала по числам. Без канцелярита и без воды.

ВХОДНЫЕ ДАННЫЕ:
- TARGET_CHANNEL — один handle из папки
- BASELINE_DATA — строки вида "@chan: base=..., 11:30=..., 15:30=..., 18:06=..."
- SNAPSHOT_DATA — строки вида "@chan: latest=..." (последний срез)
- OPTIONAL_PROFILE (может отсутствовать) — 1–3 предложения описания канала (субъективная характеристика автора)
- FOLDER_CHANNELS — список всех каналов папки (включая TARGET_CHANNEL)

КЛЮЧЕВАЯ ИДЕЯ:
Твоя задача — аккуратно описать, ЧТО видно в данных и ЧЕМ канал отличается от фона папки. Не придумывай мотивацию людей и «универсальные советы».

СТРОГИЕ ПРАВИЛА:
1) Не давать рекомендации и «что делать». Вообще. Никаких action items.
2) Никаких определений терминов.
3) Не придумывать факты. Если данных не хватает — напиши «н/д».
4) Каждый вывод в секциях C и D должен содержать минимум 2 числа (например: "+44 и +23", "6/12 и +16.2%").
5) Обязательно джойни BASELINE_DATA и SNAPSHOT_DATA по каналу и построй ряд:
   T0=base(11:00), T1=11:30, T2=15:30, T3=18:06, T4=latest.
6) Санити‑чек: Total = T4 − T0. Если не сходится — напиши «конфликт данных» и больше ничего не анализируй.
7) Про «рабочее время/фон дня» можно писать ТОЛЬКО если ты сравнил окно с фоном папки (например, среднее по Δ23). Без такого сравнения не делай выводов про поведение людей.

ЧТО СЧИТАТЬ (обязательно, если есть данные):
- Δ01 = T1 − T0 (11:00→11:30)
- Δ12 = T2 − T1 (11:30→15:30)
- Δ23 = T3 − T2 (15:30→18:06)
- Δ34 = T4 − T3 (18:06→latest)
- Total = T4 − T0
- Growth% = Total / T0 * 100 (округли до 1 знака)
- Доли вкладов: Share01/12/23/34 = Δ / Total * 100 (до 1 знака)
- RankTotal: место по Total среди всех каналов (1 = лучший)
- RankTail: место по Δ34 среди всех каналов
- WindowBenchmarks: хотя бы среднее по папке для Δ23 (чтобы понимать фон рабочего окна)

ФОРМАТ ВЫХОДА (строго, только эти секции):
A) TL;DR — 1 предложение: место по Total, Total и %, и главная особенность профиля (где сделан рост).
B) Метрики — 8–12 коротких строк (base→latest, Total, Growth%, Δ01/Δ12/Δ23/Δ34, доли, RankTotal, RankTail, сравнение Δ23 с фоном папки).
C) Инсайты — 3–5 буллетов: что видно по каналу и чем он отличается от фона/соседей (везде цифры).
D) Гипотезы — 2–3 буллета: только аккуратные гипотезы, которые действительно следуют из профиля по окнам и OPTIONAL_PROFILE (если дан).
F) Контекст сравнения — 3–4 строки: соседи выше/ниже по Total (канал и число), и кто в топ‑3 по Total.

ДАННЫЕ:
TARGET_CHANNEL:
${targetRow.channel}

OPTIONAL_PROFILE:
${optionalProfile || 'н/д'}

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

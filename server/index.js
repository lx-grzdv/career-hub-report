/**
 * Локальный API для генерации инсайтов по каналу (OpenAI).
 * Запуск: node server/index.js (порт 3001). Vite проксирует /api сюда.
 * Нужен OPENAI_API_KEY в .env
 */
import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.INSIGHT_API_PORT || 3001;

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.options('/api/generate-channel-insight', (_req, res) => res.sendStatus(204));
app.options('/api/parse-snapshot-image', (_req, res) => res.sendStatus(204));
app.use(express.json({ limit: '20mb' }));

const EXPECTED_USERNAMES = [
  'prodtomorrow', 'sshultse', 'pxPerson_produced', 'nix_ux_view', 'tooltipp',
  'trueredorescue', 'DesignDictatorship', 'dsgn_thinking', 'visuaaaals',
  'kuntsevich_design', 'lx_grzdv_links', 'yuliapohilko',
];

function findCanonicalKey(modelKey) {
  const k = String(modelKey).replace('@', '').trim();
  const lower = k.toLowerCase();
  const found = EXPECTED_USERNAMES.find((u) => u.toLowerCase() === lower);
  return found || k;
}

const PARSE_SNAPSHOT_PROMPT = `This is a screenshot of the Telegram "Add folder" (Добавить папку) screen showing a list of channels and subscriber counts.
Extract for each channel: the username (without @) and the subscriber count number.
Use these exact usernames (match by channel position or visible name): prodtomorrow, sshultse, pxPerson_produced, nix_ux_view, tooltipp, trueredorescue, DesignDictatorship, dsgn_thinking, visuaaaals, kuntsevich_design, lx_grzdv_links, yuliapohilko.
Return ONLY a valid JSON object: { "username": number, ... } with no other text, no markdown.`;

app.post('/api/parse-snapshot-image', async (req, res) => {
  console.log('[parse-snapshot] Request received, body keys:', req.body ? Object.keys(req.body) : []);
  const { image } = req.body;
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Требуется поле image (base64 или data URL)' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY не задан. Добавьте в .env' });
  }

  const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;
  console.log('[parse-snapshot] Image length:', imageUrl.length, 'calling OpenAI...');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PARSE_SNAPSHOT_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `OpenAI: ${err}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(500).json({ error: 'Пустой ответ от OpenAI' });
    }

    let cleaned = content.replace(/^```json?\s*/i, '').replace(/\s*```\s*$/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    let members;
    try {
      members = JSON.parse(cleaned);
    } catch (parseErr) {
      return res.status(500).json({ error: `Некорректный JSON от нейросети: ${parseErr.message}. Ответ: ${content.slice(0, 200)}…` });
    }
    if (typeof members !== 'object' || members === null) {
      return res.status(500).json({ error: 'Ответ не является объектом каналов' });
    }

    const result = {};
    for (const [key, value] of Object.entries(members)) {
      const canonical = findCanonicalKey(key);
      const v = typeof value === 'number' ? value : parseInt(String(value).replace(/\s/g, ''), 10);
      if (!Number.isNaN(v)) result[canonical] = v;
    }

    console.log('[parse-snapshot] OK, channels:', Object.keys(result).length);
    return res.json({ members: result });
  } catch (e) {
    console.error('[parse-snapshot] Error:', e.message);
    return res.status(500).json({ error: e.message || 'Ошибка при разборе скриншота' });
  }
});

app.post('/api/generate-channel-insight', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Требуется поле prompt (строка)' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY не задан. Добавьте в .env' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `OpenAI: ${err}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(500).json({ error: 'Пустой ответ от OpenAI' });
    }

    return res.json({ content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Ошибка при вызове OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Insight API: http://localhost:${PORT}`);
});

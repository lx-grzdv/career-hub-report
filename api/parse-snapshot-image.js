/**
 * Vercel Serverless Function: разбор скриншота «Добавить папку» через OpenAI Vision.
 * На продакшене (career-hub-report.vercel.app) кнопка «Обновить по скрину» вызывает этот эндпоинт.
 * В Vercel → Project → Settings → Environment Variables должен быть OPENAI_API_KEY.
 */
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Требуется поле image (base64 или data URL)' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY не задан. Добавьте в Vercel: Project → Settings → Environment Variables.',
    });
  }

  const imageUrl = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;

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
      return res.status(500).json({
        error: `Некорректный JSON от нейросети: ${parseErr.message}. Ответ: ${content.slice(0, 200)}…`,
      });
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

    return res.status(200).json({ members: result });
  } catch (e) {
    console.error('[parse-snapshot] Error:', e.message);
    return res.status(500).json({ error: e.message || 'Ошибка при разборе скриншота' });
  }
}

/**
 * Проверка эндпоинта /api/parse-snapshot-image.
 * Запуск: сначала npm run dev, затем в другом терминале node scripts/test-parse-snapshot.js
 * Отправляет минимальную картинку (1x1 PNG) и выводит ответ.
 */
const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const url = 'http://localhost:5173/api/parse-snapshot-image';
  console.log('POST', url, '...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: `data:image/png;base64,${base64}` }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  try {
    const data = JSON.parse(text);
    if (data.members) {
      console.log('OK. Каналов:', Object.keys(data.members).length);
      console.log(data.members);
    } else {
      console.log('Ответ:', data);
    }
  } catch {
    console.log('Тело:', text.slice(0, 500));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

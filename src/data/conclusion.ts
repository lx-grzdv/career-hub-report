/**
 * Финальный вывод отчёта. Сгенерировано скриптом generate-conclusion по актуальным данным.
 * Чтобы обновить: npm run generate-conclusion (OPENAI_API_KEY в .env)
 */
export interface ConclusionData {
  intro: string;
  bullets: string[];
  closing: string;
}

export const CONCLUSION_GENERATED_AT: string | null = '2026-02-09T22:28:44.639Z';

export const CONCLUSION: ConclusionData = {
  intro: 'Папка Career Hub продемонстрировала эффективный механизм выравнивания между донорскими и бенефициарными каналами, обеспечивая значительный прирост подписчиков.',
  bullets: [
  'Доноры с высоким overlap, такие как @DesignDictatorship и @kuntsevich_design, способствовали стабильному росту каналов.',
  'Бенефициары с низким overlap, включая @visuaaaals и @tooltipp, получили значительные выгоды от взаимодействия с донорскими каналами.',
  'Средний прирост подписчиков составил +98, с максимальными значениями у @tooltipp (+110) и @visuaaaals (+107).',
  ],
  closing: 'Таким образом, папки в Telegram служат эффективными балансировщиками аудиторий, способствуя взаимовыгодному росту каналов.',
};

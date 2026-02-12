/**
 * Модальное окно глоссария терминов. Открывается по кнопке «Термины» в шапке.
 */
import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const TERMS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Волна 1',
    body: 'Первые 30 минут после запуска папки (11:00–11:30). Время максимального интереса и органического охвата у аудитории доноров.',
  },
  {
    title: 'Волна 2',
    body: 'Период с 11:30 до 15:30. Вторичный охват через отложенные посты, пересылки и рекомендации алгоритма.',
  },
  {
    title: 'Волна N', // replaced by snapshotWaveNumber
    body: 'Срез данных: период с 15:30 до момента снапшота (LABEL). Новый скрин можно загрузить прямо в интерфейсе отчёта — данные и вычисляемые блоки пересчитаются автоматически.',
  },
  {
    title: 'Максимальный импульс',
    body: 'Прирост +50 подписчиков в первой волне. Показатель очень высокой конверсии аудитории в первые минуты.',
  },
  {
    title: 'Сильный старт',
    body: 'Прирост +45–48 подписчиков в первой волне. Хорошая начальная динамика с быстрой активацией аудитории.',
  },
  {
    title: 'Поздний старт',
    body: 'Прирост +11–16 подписчиков в первой волне. Основной рост смещён во вторую волну из-за тайминга постов или специфики аудитории.',
  },
  {
    title: 'Overlap (пересечение)',
    body: 'Доля аудитории, уже подписанной на несколько каналов из папки. Высокий overlap = меньше потенциала роста, низкий = больше новых подписчиков.',
  },
  {
    title: 'Доноры экосистемы',
    body: 'Каналы с большой устоявшейся аудиторией, которые делятся трафиком с другими каналами папки больше, чем получают сами.',
  },
  {
    title: 'Бенефициары',
    body: 'Каналы с низким пересечением аудитории, которые получают максимальный прирост от включения в папку за счёт привлечения новых читателей.',
  },
  {
    title: 'Абсолютный лидер',
    body: 'Канал с максимальным приростом в конкретной волне. Показатель наивысшей эффективности в данном временном отрезке.',
  },
  {
    title: 'Стабильная группа',
    body: 'Каналы с равномерным приростом в обеих волнах (+30–40). Показывают предсказуемую динамику без резких скачков.',
  },
];

export const GlossaryModal = memo(({
  onClose,
  snapshotWaveNumber,
  snapshotLabel,
}: {
  onClose: () => void;
  snapshotWaveNumber: number;
  snapshotLabel: string;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Глоссарий терминов"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="bg-black border border-white/20 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight">ГЛОССАРИЙ</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black">
              {TERMS.map((term, i) => {
                const title = term.title === 'Волна N' ? `Волна ${snapshotWaveNumber}` : term.title;
                const body =
                  term.body.indexOf('LABEL') >= 0
                    ? term.body.replace('(LABEL)', `(${snapshotLabel})`)
                    : term.body;
                return (
                  <div
                    key={term.title}
                    className="bg-black p-6 md:p-8"
                  >
                    <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">{title}</div>
                    <p className="text-sm text-white/80 leading-relaxed">{body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

GlossaryModal.displayName = 'GlossaryModal';

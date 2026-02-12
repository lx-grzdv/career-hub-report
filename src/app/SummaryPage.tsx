/**
 * Внутренняя подстраница: итог через 4 дня после запуска папки Career Hub.
 * Собирает ключевые метрики, ожидания vs факт, лидеров роста и вывод из данных отчёта.
 */
import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import {
  REPORT_START_DATETIME,
  REPORT_START_LABEL,
  SNAPSHOTS,
  SNAPSHOT_LABEL,
} from '../data/snapshot';
import { BASE_CHANNEL_DATA } from '../data/channelBase';
import { CONCLUSION } from '../data/conclusion';
import { CHANNEL_PROFILES } from '../data/channelProfiles';
import { ChartModal, type ChartModalDataPoint } from './components/ChartModal';

function fmtInt(x: number): string {
  return Math.round(x).toLocaleString('ru-RU');
}

function formatDateTimeLabel(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.\s*$/, '');
  const timePart = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
}

/** Строит данные для графика роста канала (как в основном отчёте). */
function buildChartDataForChannel(channel: string): ChartModalDataPoint[] {
  const row = BASE_CHANNEL_DATA.find((r) => r.channel === channel);
  if (!row) return [];
  const username = channel.replace('@', '');
  const reportDate = REPORT_START_DATETIME.slice(0, 10);
  const base = [
    { time: formatDateTimeLabel(`${reportDate}T11:00:00`), value: row.base, datetime: `${reportDate}T11:00:00`, role: 'base' as const },
    { time: formatDateTimeLabel(`${reportDate}T11:30:00`), value: row.wave1, datetime: `${reportDate}T11:30:00`, role: 'wave1' as const },
    { time: formatDateTimeLabel(`${reportDate}T15:30:00`), value: row.wave2, datetime: `${reportDate}T15:30:00`, role: 'wave2' as const },
    { time: formatDateTimeLabel(`${reportDate}T18:06:00`), value: row.current, datetime: `${reportDate}T18:06:00`, role: 'current' as const },
  ];
  const slicePoints = SNAPSHOTS.map((s) => ({
    time: formatDateTimeLabel(s.datetime),
    value: s.members[username] ?? row.current,
    datetime: s.datetime,
    role: 'slice' as const,
  }));
  const combined = [...base, ...slicePoints].sort((a, b) => a.datetime.localeCompare(b.datetime));
  const byDatetime = new Map<string, { time: string; value: number; role: string }>();
  combined.forEach((p) => byDatetime.set(p.datetime, { time: p.time, value: p.value, role: p.role }));
  return [...byDatetime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, p]) => ({ time: p.time, value: p.value, role: p.role }));
}

/** Итоговые данные по каналу: база, финал, прирост за период. */
function useSummaryData() {
  return useMemo(() => {
    const last = SNAPSHOTS[SNAPSHOTS.length - 1];
    if (!last) return { channels: [], averageGrowth: 0, totalGrowth: 0, minTotal: 0, maxTotal: 0 };

    const channels = BASE_CHANNEL_DATA.map((row) => {
      const username = row.channel.replace('@', '');
      const final = last.members[username] ?? row.current;
      const total = final - row.base;
      return {
        channel: row.channel,
        base: row.base,
        final,
        total,
        type: row.type,
      };
    });

    const totals = channels.map((c) => c.total);
    const sum = totals.reduce((a, b) => a + b, 0);
    const averageGrowth = channels.length ? Math.round(sum / channels.length) : 0;
    const minTotal = Math.min(...totals);
    const maxTotal = Math.max(...totals);

    return {
      channels,
      averageGrowth,
      totalGrowth: sum,
      minTotal,
      maxTotal,
    };
  }, []);
}

/** Данные опроса ожиданий (статично по скрину). */
const POLL_EXPECTATIONS = [
  { label: '≤50 подписчиков', pct: 46 },
  { label: '51–100', pct: 36 },
  { label: '101–150', pct: 9 },
  { label: '≥151', pct: 9 },
];

export function SummaryPage() {
  const { channels, averageGrowth, totalGrowth, minTotal, maxTotal } = useSummaryData();
  const [chartModalChannel, setChartModalChannel] = useState<string | null>(null);
  const leaders = useMemo(
    () => [...channels].sort((a, b) => b.total - a.total).slice(0, 4),
    [channels]
  );
  const chartDataForModal = useMemo(
    () => (chartModalChannel ? buildChartDataForChannel(chartModalChannel) : []),
    [chartModalChannel]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-black/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <h1 className="text-base md:text-xl tracking-[0.2em] font-light">
            CAREER HUB
          </h1>
          <a
            href="/"
            className="border border-white/40 px-3 md:px-4 py-1 text-xs md:text-sm rounded-full hover:bg-white hover:text-black transition-colors"
          >
            Полный отчёт
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-12 md:space-y-16">
        {/* Title */}
        <section>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-2">
            Внутренний итог
          </p>
          <h2 className="text-3xl md:text-5xl font-light tracking-tight mb-4">
            Итог через 4 дня после запуска
          </h2>
          <p className="text-white/60 text-sm md:text-base leading-relaxed">
            Период: {REPORT_START_LABEL} → {SNAPSHOT_LABEL}
          </p>
        </section>

        {/* Key metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/20">
          <div className="bg-black p-6 md:p-8">
            <div className="text-4xl md:text-5xl font-light mb-2">12</div>
            <div className="text-xs md:text-sm text-white/60 uppercase tracking-widest">
              Каналов
            </div>
          </div>
          <div className="bg-black p-6 md:p-8">
            <div className="text-4xl md:text-5xl font-light mb-2">+{fmtInt(averageGrowth)}</div>
            <div className="text-xs md:text-sm text-white/60 uppercase tracking-widest">
              Средний прирост на канал
            </div>
          </div>
          <div className="bg-black p-6 md:p-8">
            <div className="text-4xl md:text-5xl font-light mb-2">
              +{minTotal}…+{maxTotal}
            </div>
            <div className="text-xs md:text-sm text-white/60 uppercase tracking-widest">
              Диапазон прироста
            </div>
          </div>
        </section>

        {/* Сколько принесло */}
        <section>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
            Сколько принесло подписчиков
          </h3>
          <p className="text-white/80 mb-6 max-w-2xl leading-relaxed">
            За период наблюдения папка дала каждому каналу от <strong className="text-white">+{minTotal}</strong> до{' '}
            <strong className="text-white">+{maxTotal}</strong> подписчиков. Суммарный прирост по папке —{' '}
            <strong className="text-white">+{fmtInt(totalGrowth)}</strong>. Все 12 каналов попали в коридор{' '}
            <strong className="text-white">+{minTotal}…+{maxTotal}</strong> — папка сработала как механизм выравнивания.
          </p>
          <div className="border border-white/20 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 bg-white/5 text-xs text-white/50 uppercase tracking-widest">
              <span>Канал</span>
              <span className="text-right">Было</span>
              <span className="text-right">Прирост</span>
            </div>
            <p className="px-4 py-2 text-xs text-white/40 border-b border-white/10">
              Клик по названию — открыть канал; по строке — график роста
            </p>
            {channels
              .slice()
              .sort((a, b) => b.total - a.total)
              .map((c) => (
                <div
                  key={c.channel}
                  role="button"
                  tabIndex={0}
                  onClick={() => setChartModalChannel(c.channel)}
                  onKeyDown={(e) => e.key === 'Enter' && setChartModalChannel(c.channel)}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-t border-white/10 hover:bg-white/5 w-full text-left cursor-pointer transition-colors items-center"
                >
                  <div className="min-w-0">
                    <a
                      href={`https://t.me/${c.channel.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-white/90 hover:text-white underline decoration-white/20 underline-offset-2 group"
                      title="Открыть канал в Telegram"
                    >
                      <span className="truncate">{c.channel}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-white/50 group-hover:text-white" aria-hidden />
                    </a>
                  </div>
                  <span className="text-white/60 text-right">{fmtInt(c.base)}</span>
                  <span className="text-right font-medium">+{fmtInt(c.total)}</span>
                </div>
              ))}
          </div>
        </section>

        {/* Ожидания vs факт */}
        <section>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
            Ожидания vs факт
          </h3>
          <p className="text-white/60 text-sm mb-6 max-w-2xl leading-relaxed">
            До запуска участники опроса в основном ориентировались на прирост до 50–100 подписчиков. Результат превзошёл ожидания: все 12 каналов получили прирост в зоне 100+.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-white/20 rounded-xl p-5 bg-white/[0.02]">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-4">
                Ожидания (опрос)
              </div>
              <ul className="space-y-3">
                {POLL_EXPECTATIONS.map(({ label, pct }) => (
                  <li key={label} className="flex items-center gap-3">
                    <div
                      className="h-2 rounded-full bg-white/20 overflow-hidden flex-1 max-w-[120px]"
                      style={{ minWidth: 60 }}
                    >
                      <div
                        className="h-full bg-white/50 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-white/80">{label}</span>
                    <span className="text-white/50 text-sm">{pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-white/20 rounded-xl p-5 bg-white/[0.02]">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-4">
                Факт (по каналам)
              </div>
              <ul className="space-y-2 text-sm text-white/80">
                <li>≤50: 0 каналов</li>
                <li>51–100: 1 канал (+100)</li>
                <li>101–150: 11 каналов</li>
                <li>≥151: 0 каналов</li>
              </ul>
              <p className="text-white/50 text-xs mt-3">
                Итог: результат превзошёл ожидания — папка сработала сильнее, чем предполагало большинство.
              </p>
            </div>
          </div>
        </section>

        {/* Лидеры роста */}
        <section>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
            Лидеры роста
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaders.map((c, idx) => (
              <div
                key={c.channel}
                className="border border-white/20 rounded-xl p-5 bg-black hover:bg-white/5 transition-colors"
              >
                <div className="text-3xl font-light text-white/40 mb-2">#{idx + 1}</div>
                <a
                  href={`https://t.me/${c.channel.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-white hover:text-white/80 underline decoration-white/20 block mb-3"
                >
                  {c.channel}
                </a>
                <div className="text-2xl font-light">+{fmtInt(c.total)}</div>
                <div className="text-xs text-white/50 mt-1">
                  {c.base} → {fmtInt(c.final)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Финальный вывод (из conclusion.ts) */}
        <section className="border-t border-white/20 pt-10">
          <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-4">
            Финальный вывод
          </h3>
          <div className="border-l-4 border-white pl-6 md:pl-8 space-y-4">
            <p className="text-base md:text-lg text-white/90 leading-relaxed">
              {CONCLUSION.intro}
            </p>
            <ul className="space-y-2 text-white/80">
              {CONCLUSION.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/40 flex-shrink-0">→</span>
                  <span dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.+?)\*\*/g, '<span class="font-medium text-white">$1</span>') }} />
                </li>
              ))}
            </ul>
            <p className="text-white/60 text-sm md:text-base pt-2">
              {CONCLUSION.closing}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 border border-white/40 px-5 py-2.5 rounded-full hover:bg-white hover:text-black transition-colors text-sm"
          >
            Открыть полный аналитический отчёт
          </a>
        </section>
      </main>

      <AnimatePresence>
        {chartModalChannel && chartDataForModal.length > 0 && (
          <ChartModal
            data={chartDataForModal}
            channel={chartModalChannel}
            onClose={() => setChartModalChannel(null)}
            profile={chartModalChannel ? CHANNEL_PROFILES[chartModalChannel] : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

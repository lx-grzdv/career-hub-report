/**
 * Модальное окно с графиком роста канала и таблицей точек.
 * Используется в основном отчёте (таблица) и на странице итога /Result.
 */
import React, { memo, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmtInt(x: number): string {
  const v = Number.isFinite(x) ? x : 0;
  return Math.round(v).toLocaleString('ru-RU');
}

function fmtSignedInt(x: number): string {
  const v = Number.isFinite(x) ? Math.round(x) : 0;
  return v > 0 ? `+${fmtInt(v)}` : fmtInt(v);
}

const isMobile =
  typeof window !== 'undefined'
    ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    : false;

const prefersReducedMotion =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

export interface ChartModalDataPoint {
  time: string;
  value: number;
  role?: string;
}

export const ChartModal = memo(({
  data,
  channel,
  onClose,
  profile,
}: {
  data: ChartModalDataPoint[];
  channel: string;
  onClose: () => void;
  profile?: string;
}) => {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);
  const minValue = useMemo(() => Math.min(...data.map((d) => d.value)), [data]);
  const range = useMemo(() => maxValue - minValue, [maxValue, minValue]);
  const totalGrowth = useMemo(
    () => (data.length > 0 ? data[data.length - 1].value - data[0].value : 0),
    [data]
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />
      <motion.div
        initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={isMobile ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isMobile ? 0.2 : 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-black border border-white/20 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — компактный */}
        <div className="border-b border-white/20 p-4 md:p-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">График роста</div>
              <h3 className="text-xl md:text-3xl font-light tracking-tight mb-3 truncate">{channel}</h3>
              <div className="flex items-center gap-4 md:gap-6">
                <div>
                  <div className="text-xs text-white/40 mb-0.5">База</div>
                  <div className="text-lg md:text-xl tabular-nums">{fmtInt(data[0]?.value ?? 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-0.5">Прирост</div>
                  <div className="text-lg md:text-xl text-green-500 tabular-nums">{fmtSignedInt(totalGrowth)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-0.5">Сейчас</div>
                  <div className="text-lg md:text-xl tabular-nums">{fmtInt(data[data.length - 1]?.value ?? 0)}</div>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={!isMobile ? { scale: 1.1, rotate: 90 } : undefined}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Характеристика канала */}
        {profile && (
          <div className="border-b border-white/20 px-4 md:p-5 py-3 flex-shrink-0 bg-white/[0.02]">
            <p className="text-sm text-white/70 leading-relaxed">{profile}</p>
          </div>
        )}

        {/* График — фиксированная высота */}
        <div className="p-4 md:p-5 flex-shrink-0">
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 220}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="chartModalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" stroke="#666" style={{ fontSize: 12 }} tickLine={false} />
              <YAxis
                stroke="#666"
                style={{ fontSize: 12 }}
                domain={[minValue - range * 0.1, maxValue + range * 0.1]}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                cursor={{ stroke: '#666', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
                fill="url(#chartModalGradient)"
                dot={{ fill: '#fff', r: 4, strokeWidth: 1.5, stroke: '#000' }}
                activeDot={{ r: 6, fill: '#fff' }}
                animationDuration={isMobile ? 300 : 600}
                isAnimationActive={!prefersReducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Таблица — компактная, со скроллом */}
        <div className="border-t border-white/20 flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-2 flex-shrink-0">
            <span className="text-xs text-white/40 uppercase tracking-widest">Точки по времени</span>
          </div>
          <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0 max-h-[180px] px-4 pb-4 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white/5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-black z-10">
                <tr className="border-b border-white/20">
                  <th className="py-1.5 px-2 text-xs font-medium text-white/50 uppercase tracking-widest">Дата и время</th>
                  <th className="py-1.5 px-2 text-xs font-medium text-white/50 uppercase tracking-widest text-right">Значение</th>
                  <th className="py-1.5 px-2 text-xs font-medium text-white/50 uppercase tracking-widest text-right">Прирост</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-1.5 px-2 text-sm text-white/90">{d.time}</td>
                    <td className="py-1.5 px-2 text-sm tabular-nums text-right font-medium">{fmtInt(d.value)}</td>
                    <td className="py-1.5 px-2 text-sm tabular-nums text-right text-green-500">
                      {i > 0 ? fmtSignedInt(d.value - data[i - 1].value) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-white/20 px-4 py-2 flex-shrink-0 text-center">
          <p className="text-xs text-white/40">ESC или клик вне окна — закрыть</p>
        </div>
      </motion.div>
    </motion.div>
  );
});

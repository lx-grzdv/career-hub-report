import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell } from 'recharts';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import {
  HelpCircle,
  TrendingUp,
  Users,
  Lightbulb,
  Clock,
  PackageOpen,
  Scale,
  GitBranch,
  Gift,
  Sparkles,
  Copy,
} from 'lucide-react';
import { useRef, useState, useEffect, memo, useMemo } from 'react';
import { PerformanceOptimizer } from './components/PerformanceOptimizer';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { LazySection } from './components/LazySection';
import { LoadingScreen } from './components/LoadingScreen';
import {
  snapshotMembers,
  SNAPSHOT_LABEL,
  SNAPSHOT_TIME,
  REPORT_START_DATETIME,
  REPORT_START_LABEL,
  SNAPSHOT_DATETIME,
  SNAPSHOT_WAVE_NUMBER,
} from '../data/snapshot';
import { BASE_CHANNEL_DATA } from '../data/channelBase';
import { CHANNEL_PROFILES } from '../data/channelProfiles';
import { CONCLUSION, CONCLUSION_GENERATED_AT } from '../data/conclusion';

// Performance optimizations for mobile
const isMobile = typeof window !== 'undefined' 
  ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
  : false;

const isSmallMobile = typeof window !== 'undefined' 
  ? window.innerWidth < 400
  : false;

const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function fmtPct(x: number, digits = 1): string {
  const v = Number.isFinite(x) ? x : 0;
  return `${(v * 100).toFixed(digits)}%`;
}

const CountUp = memo(({ end, duration = 2 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      // Simplified animation on mobile
      if (isMobile || prefersReducedMotion) {
        setCount(end);
        return;
      }
      
      let start = 0;
      const increment = end / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}</span>;
});

const ChannelLink = memo(({ channel }: { channel: string }) => {
  const channelName = useMemo(() => channel.replace('@', ''), [channel]);
  
  // Disable hover animations on mobile for performance
  const hoverProps = !isMobile && !prefersReducedMotion 
    ? { whileHover: { scale: 1.05, x: 4 }, transition: { type: "spring", stiffness: 400, damping: 10 } }
    : {};
  
  return (
    <motion.a 
      href={`https://t.me/${channelName}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="hover:text-white/60 transition-colors underline decoration-white/20 hover:decoration-white/60 inline-block"
      whileTap={{ scale: 0.98 }}
      {...hoverProps}
    >
      {channel}
    </motion.a>
  );
});

const TermWithTooltip = ({ term, definition }: { term: string; definition: string }) => {
  return (
    <div className="text-sm text-white/40 mb-2 uppercase tracking-wider flex items-center gap-2">
      <span>{term}</span>
      <TooltipUI>
        <TooltipTrigger asChild>
          <button className="hover:text-white/60 transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-white text-black px-4 py-3 rounded-lg max-w-xs text-sm border border-white/20 shadow-xl z-50"
        >
          {definition}
        </TooltipContent>
      </TooltipUI>
    </div>
  );
};

const InsightCard = ({
  idx,
  icon: Icon,
  meta,
  title,
  children,
}: {
  idx: number;
  icon: React.ComponentType<{ className?: string }>;
  meta: string;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: Math.min(idx * 0.1, 0.6) }}
    className="bg-black p-8 md:p-12 flex flex-col h-full min-h-0"
  >
    <div className="flex flex-col items-center text-center mb-4 min-h-[5.5rem] flex-shrink-0 md:flex-row md:items-start md:text-left md:justify-between md:gap-3">
      <div className="flex flex-col items-center md:items-start flex-1 min-w-0">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-1">{meta}</div>
        <h4 className="text-xl md:text-2xl font-light leading-tight">{title}</h4>
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70 mt-2 md:mt-0">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="flex-1 min-h-0">{children}</div>
  </motion.div>
);

const ChartModal = memo(({ data, channel, onClose }: { data: { time: string; value: number }[]; channel: string; onClose: () => void }) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value)), [data]);
  const range = useMemo(() => maxValue - minValue, [maxValue, minValue]);
  const totalGrowth = useMemo(() => data[data.length - 1].value - data[0].value, [data]);

  useEffect(() => {
    // Block scroll
    document.body.style.overflow = 'hidden';
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
      />

      {/* Modal Content */}
      <motion.div
        initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 40 }}
        animate={isMobile ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isMobile ? 0.2 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative bg-black border border-white/20 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-white/20 p-6 md:p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2">График роста</div>
              <h3 className="text-2xl md:text-4xl font-light tracking-tight mb-4">{channel}</h3>
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-white/40 mb-1">База</div>
                  <div className="text-xl md:text-2xl">{data[0].value}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Прирост</div>
                  <div className="text-xl md:text-2xl text-green-500">+{totalGrowth}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Сейчас</div>
                  <div className="text-xl md:text-2xl">{data[data.length - 1].value}</div>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={!isMobile ? { scale: 1.1, rotate: 90 } : undefined}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Chart */}
        <div className="p-6 md:p-8">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#666" 
                style={{ fontSize: '14px' }}
                tickLine={false}
              />
              <YAxis 
                stroke="#666" 
                style={{ fontSize: '14px' }}
                domain={[minValue - range * 0.1, maxValue + range * 0.1]}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
                cursor={{ stroke: '#666', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#fff"
                strokeWidth={3}
                fill="url(#colorGradient)"
                dot={{ fill: '#fff', r: 5, strokeWidth: 2, stroke: '#000' }}
                activeDot={{ r: 7, fill: '#fff' }}
                animationDuration={isMobile ? 300 : 800}
                isAnimationActive={!prefersReducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Details */}
        <div className="border-t border-white/20 p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {data.map((d, i) => (
              <div
                key={i}
                className="text-center"
              >
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">
                  {i === 0 && 'База'}
                  {i === 1 && 'Волна 1'}
                  {i === 2 && 'Волна 2'}
                  {i === 3 && `Волна ${SNAPSHOT_WAVE_NUMBER}`}
                  {i === 4 && `Волна ${SNAPSHOT_WAVE_NUMBER} (финал)`}
                </div>
                <div className="text-sm text-white/60 mb-2">{d.time}</div>
                <div className="text-2xl md:text-3xl font-light">{d.value}</div>
                {i > 0 && (
                  <div className="text-sm text-green-500 mt-1">
                    +{d.value - data[i - 1].value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Close hint */}
        <div className="border-t border-white/20 p-4 text-center">
          <p className="text-xs text-white/40">
            Нажмите ESC или кликните вне окна, чтобы закрыть
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
});

const ChartSection = ({ channelData, windowWidth }: { channelData: any[]; windowWidth: number }) => {
  const [activeChart, setActiveChart] = useState<'growth' | 'correlation'>('growth');
  
  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 400;

  /** Данные для графиков: всегда от большего к меньшему по приросту. */
  const sortedByTotal = useMemo(
    () => [...channelData].sort((a, b) => b.total - a.total),
    [channelData]
  );

  return (
    <>
      {/* Toggle Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex justify-center"
      >
        <div className="inline-flex border border-white/20 rounded-lg overflow-hidden">
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveChart('growth')}
            className={`px-6 md:px-8 py-3 md:py-4 text-sm md:text-base transition-all relative ${
              activeChart === 'growth' ? 'text-white' : 'text-white/40'
            }`}
          >
            {activeChart === 'growth' && (
              <motion.div
                layoutId="activeChart"
                className="absolute inset-0 bg-white/10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">Общий прирост</span>
          </motion.button>
          <div className="w-px bg-white/20" />
          <motion.button
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveChart('correlation')}
            className={`px-6 md:px-8 py-3 md:py-4 text-sm md:text-base transition-all relative ${
              activeChart === 'correlation' ? 'text-white' : 'text-white/40'
            }`}
          >
            {activeChart === 'correlation' && (
              <motion.div
                layoutId="activeChart"
                className="absolute inset-0 bg-white/10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">База vs Прирост</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Chart Container */}
      <AnimatePresence mode="wait">
        {activeChart === 'growth' ? (
          <motion.div
            key="growth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border border-white/10 p-4 md:p-8 bg-gradient-to-br from-white/[0.02] to-transparent rounded-lg"
          >
            <div className="mb-4 md:mb-6">
              <h4 className="text-xl md:text-2xl font-light mb-2">Общий прирост по каналам</h4>
              <p className="text-sm text-white/60 mb-2">
                Цвет показывает пересечение аудитории: зелёный — новая аудитория (бенефициары), красный — общая аудитория (доноры)
              </p>
              {isMobile && (
                <p className="text-xs text-white/40 flex items-center gap-1">
                  <span>←</span> Прокрутите график вправо <span>→</span>
                </p>
              )}
            </div>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <div className="min-w-[320px]">
                <ResponsiveContainer width="100%" height={isSmallMobile ? 350 : isMobile ? 400 : 500}>
              <BarChart 
                data={sortedByTotal.map(d => ({
                  name: d.channel.replace('@', ''),
                  total: d.total,
                  type: d.type,
                  channel: d.channel
                }))} 
                margin={{ 
                  top: 20, 
                  right: isMobile ? 10 : 30, 
                  left: isMobile ? 40 : 60, 
                  bottom: isMobile ? 80 : 100 
                }}
                barGap={8}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradientWhite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#d1d5db" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="rgba(255,255,255,0.05)" 
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  angle={isMobile ? -55 : -45} 
                  textAnchor="end" 
                  height={isMobile ? 80 : 100}
                  style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: '300' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: '300' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const color = data.type === 'beneficiary' ? '#10b981' : data.type === 'stable' ? '#ffffff' : '#ef4444';
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-black/95 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-2xl"
                        >
                          <div className="text-white/90 text-xs mb-3 font-light tracking-wide">{data.channel}</div>
                          <div className="flex items-baseline gap-2 mb-3">
                            <span style={{ color }} className="text-2xl font-light">+{data.total.toLocaleString()}</span>
                            <span className="text-white/40 text-xs">подписчиков</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                            <span className="text-xs text-white/50">
                              {data.type === 'beneficiary' && 'Бенефициар'}
                              {data.type === 'stable' && 'Стабильный'}
                              {data.type === 'donor' && 'Донор'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  animationDuration={isMobile ? 300 : 800}
                  isAnimationActive={!prefersReducedMotion}
                >
                  {sortedByTotal.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.type === 'beneficiary' ? 'url(#gradientGreen)' : 
                        entry.type === 'stable' ? 'url(#gradientWhite)' : 
                        'url(#gradientRed)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="correlation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border border-white/20 p-4 md:p-8"
          >
            <div className="mb-4 md:mb-6">
              <h4 className="text-xl md:text-2xl font-light mb-2">Корреляция: Размер базы vs Прирост</h4>
              <p className="text-sm text-white/60 mb-2">
                Большие каналы с высоким overlap растут меньше (доноры), маленькие каналы с низким overlap растут больше (бенефициары)
              </p>
              {isMobile && (
                <p className="text-xs text-white/40 flex items-center gap-1">
                  <span>←</span> Прокрутите график вправо <span>→</span>
                </p>
              )}
            </div>
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
              <div className="min-w-[320px]">
                <ResponsiveContainer width="100%" height={isSmallMobile ? 350 : isMobile ? 400 : 500}>
              <BarChart 
                data={sortedByTotal.map(d => ({
                  name: d.channel.replace('@', ''),
                  base: d.base,
                  growth: d.total,
                  type: d.type,
                  channel: d.channel
                }))} 
                margin={{ 
                  top: 20, 
                  right: isMobile ? 10 : 30, 
                  left: isMobile ? 10 : 20, 
                  bottom: isMobile ? 80 : 100 
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#666" 
                  angle={isMobile ? -55 : -45} 
                  textAnchor="end" 
                  height={isMobile ? 80 : 100}
                  style={{ fontSize: isMobile ? '9px' : '12px' }}
                />
                <YAxis 
                  stroke="#666" 
                  style={{ fontSize: isMobile ? '9px' : '11px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000',
                    border: '1px solid #333',
                    color: '#fff',
                    borderRadius: '8px'
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar 
                  dataKey="base" 
                  fill="#404040" 
                  name="База подписчиков" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={isMobile ? 300 : 800}
                  isAnimationActive={!prefersReducedMotion}
                />
                <Bar 
                  dataKey="growth" 
                  name="Прирост" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={isMobile ? 300 : 800}
                  isAnimationActive={!prefersReducedMotion}
                >
                  {sortedByTotal.map((entry, index) => (
                    <Cell
                      key={`growth-${index}`}
                      fill={
                        entry.type === 'beneficiary' ? '#10b981' : 
                        entry.type === 'stable' ? '#ffffff' : 
                        '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const CHANNEL_INSIGHT_PROMPT = `Ты — аналитик роста Telegram‑каналов внутри ОДНОЙ папки. Дай короткий, «человеческий» разбор ОДНОГО канала по числам. Без канцелярита и без воды.

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
<<<TARGET_CHANNEL>>>

OPTIONAL_PROFILE:
<<<OPTIONAL_PROFILE>>>

FOLDER_CHANNELS:
<<<FOLDER_CHANNELS>>>

BASELINE_DATA:
<<<BASELINE_DATA>>>

SNAPSHOT_DATA:
<<<SNAPSHOT_DATA>>>

OPTIONAL_SNAPSHOTS (11:30, 15:30, 18:06 по каналам):
<<<OPTIONAL_SNAPSHOTS>>>
`;

function buildChannelInsightPrompt(
  targetRow: { channel: string; base: number; wave1: number; wave2: number; current: number; final: number; growth1: number; growth2: number; growth3: number; total: number },
  allChannelData: typeof BASE_CHANNEL_DATA extends (infer R)[] ? (R & { final?: number; growth3?: number; total?: number })[] : never,
  snapshotLabel: string
): string {
  const optionalProfile = CHANNEL_PROFILES[targetRow.channel] ?? '';
  const folderChannels = allChannelData.map((r) => r.channel).join(', ');
  const baselineData = allChannelData
    .map((r) => `${r.channel}: base=${r.base}, 11:30=${r.wave1}, 15:30=${r.wave2}, 18:06=${r.current}`)
    .join('\n');
  const snapshotData = `${snapshotLabel}\n` + allChannelData.map((r) => `${r.channel}: ${(r as { final?: number }).final ?? r.current}`).join('\n');
  const optionalSnapshots = allChannelData.map((r) => `${r.channel}: 11:30=${r.wave1}, 15:30=${r.wave2}, 18:06=${r.current}`).join('\n');
  return CHANNEL_INSIGHT_PROMPT.replace('<<<TARGET_CHANNEL>>>', targetRow.channel)
    .replace('<<<OPTIONAL_PROFILE>>>', optionalProfile || 'н/д')
    .replace('<<<FOLDER_CHANNELS>>>', folderChannels)
    .replace('<<<BASELINE_DATA>>>', baselineData)
    .replace('<<<SNAPSHOT_DATA>>>', snapshotData)
    .replace('<<<OPTIONAL_SNAPSHOTS>>>', optionalSnapshots);
}

function parseChannelInsightResponse(text: string): { section: string; content: string }[] {
  const out: { section: string; content: string }[] = [];
  const re = /(?:^|\n)\s*(A\)|B\)|C\)|D\)|E\)|F\)|TL;DR|Метрики|Инсайты|Гипотезы|Что делать|Контекст сравнения)\s*[:\s]*/gi;
  let prevEnd = 0;
  let prevTitle = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (prevTitle) out.push({ section: prevTitle, content: text.slice(prevEnd, m.index).trim() });
    prevTitle = m[1];
    prevEnd = m.index + m[0].length;
  }
  if (prevTitle) out.push({ section: prevTitle, content: text.slice(prevEnd).trim() });
  return out.length > 0 ? out : [{ section: 'Ответ', content: text.trim() }];
}

const InsightModal = ({
  channel,
  promptText,
  onClose,
}: {
  channel: string;
  promptText: string;
  onClose: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    fetch('/api/generate-channel-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText }),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          try {
            const d = JSON.parse(text);
            throw new Error(d.error || res.statusText);
          } catch (_) {
            throw new Error(text || res.statusText || 'Ошибка сервера');
          }
        }
        try {
          return text ? JSON.parse(text) : {};
        } catch {
          return { content: text };
        }
      })
      .then((data) => {
        if (!cancelled && data?.content) setContent(data.content);
        else if (!cancelled && !data?.content) setError('Пустой ответ от сервера');
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e.message || 'Ошибка запроса';
          const is404 = /NOT_FOUND|page could not be found|404/i.test(msg);
          setError(
            is404
              ? 'API на Vercel не найден. Убедитесь, что папка api/ в репозитории, в Vercel задан OPENAI_API_KEY, и сделайте Redeploy.'
              : msg
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [channel, promptText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsed = useMemo(() => (content ? parseChannelInsightResponse(content) : []), [content]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-black border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0">
          <h3 className="text-xl font-light">Инсайты по каналу {channel}</h3>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12 text-white/60">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
              />
              <span>Генерация инсайтов…</span>
            </div>
          )}
          {error && !loading && (
            <div className="space-y-3">
              <p className="text-sm text-amber-400/90">{error}</p>
              <p className="text-xs text-white/50">
                Запустите <code className="text-white/70">npm run dev</code> — приложение и API стартуют вместе. В .env должен быть <code className="text-white/70">OPENAI_API_KEY</code>. Затем нажмите ✨ снова.
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Скопировано' : 'Скопировать промпт (вставить в ChatGPT)'}
              </button>
            </div>
          )}
          {content && !loading && (
            <div className="space-y-3">
              {parsed.length > 0 ? (
                parsed.map(({ section, content: sectionContent }) => (
                  <div key={section}>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{section}</div>
                    <div className="text-sm text-white/80 whitespace-pre-wrap">{sectionContent}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/80 whitespace-pre-wrap">{content}</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const TableRow = memo(({ row, idx, onGenerateInsight }: { row: any; idx: number; onGenerateInsight?: (row: any) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const chartData = useMemo(() => [
    { time: '11:00', value: row.base },
    { time: '11:30', value: row.wave1 },
    { time: '15:30', value: row.wave2 },
    { time: '18:06', value: row.current },
    { time: SNAPSHOT_TIME, value: row.final },
  ], [row.base, row.wave1, row.wave2, row.current, row.final]);

  // Simplified animations on mobile
  const animationProps = isMobile || prefersReducedMotion
    ? { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { delay: idx * 0.03 } };

  return (
    <>
      <motion.tr
        {...animationProps}
        viewport={{ once: true }}
        className="border-b border-white/10 hover:bg-white/5 transition-colors relative cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <ChannelLink channel={row.channel} />
            <motion.button
              whileHover={!isMobile ? { scale: 1.2, rotate: 5 } : undefined}
              whileTap={{ scale: 0.9 }}
              className="text-white/40 hover:text-white/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              title="График роста"
            >
              <TrendingUp className="w-4 h-4" />
            </motion.button>
            {onGenerateInsight && (
              <motion.button
                whileHover={!isMobile ? { scale: 1.1 } : undefined}
                whileTap={{ scale: 0.95 }}
                className="text-white/40 hover:text-amber-400/90 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateInsight(row);
                }}
                title="Сгенерировать инсайты по каналу"
              >
                <Sparkles className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </td>
        <td className="py-4 px-4 text-right text-white/60">{row.base}</td>
        <td className="py-4 px-4 text-right text-white/60">{row.wave1}</td>
        <td className="py-4 px-4 text-right text-white/60">{row.wave2}</td>
        <td className="py-4 px-4 text-right text-white/60">{row.current}</td>
        <td className="py-4 px-4 text-right text-white/60">{row.final}</td>
        <td className="py-4 px-4 text-right">+{row.growth1}</td>
        <td className="py-4 px-4 text-right">+{row.growth2}</td>
        <td className="py-4 px-4 text-right">+{row.growth3}</td>
        <td className="py-4 px-4 text-right font-medium text-green-500">+{row.total}</td>
      </motion.tr>
      
      <AnimatePresence>
        {isOpen && (
          <ChartModal 
            data={chartData} 
            channel={row.channel} 
            onClose={() => setIsOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default function App() {
  const heroRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [insightModalRow, setInsightModalRow] = useState<{ channel: string; base: number; wave1: number; wave2: number; current: number; final: number; growth1: number; growth2: number; growth3: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  
  // Track window resize for responsive charts
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide loading screen after content is ready
  useEffect(() => {
    // Check if page is already loaded
    if (document.readyState === 'complete') {
      setIsLoading(false);
      setShowContent(true);
    } else {
      // Wait for full page load
      const handleLoad = () => {
        // Minimum 800ms loading screen for smooth UX
        const minLoadTime = 800;
        const elapsed = performance.now();
        const delay = Math.max(0, minLoadTime - elapsed);
        
        setTimeout(() => {
          setIsLoading(false);
          setTimeout(() => setShowContent(true), 100);
        }, delay);
      };

      window.addEventListener('load', handleLoad);
      
      // Fallback timeout in case load event doesn't fire
      const fallbackTimer = setTimeout(() => {
        setIsLoading(false);
        setShowContent(true);
      }, 5000);

      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  // Detect if user is from restricted region (heuristic based on slow load or Telegram WebView)
  useEffect(() => {
    const isTelegram = navigator.userAgent.includes('Telegram');
    const hostname = window.location.hostname;
    const isFigmaSite = hostname.includes('figma.site') || hostname.includes('figma.com');
    
    // Show diagnostics if Telegram + Figma domain
    if (isTelegram && isFigmaSite) {
      setTimeout(() => setShowDiagnostics(true), 2000);
    }
  }, []);

  const copyDiagnostics = () => {
    const info = `🔍 Диагностика доступа к сайту

Домен: ${window.location.hostname}
URL: ${window.location.href}
User-Agent: ${navigator.userAgent}
Язык: ${navigator.language}
Время загрузки: ${Math.round(performance.now())}ms

⚠️ Возможная причина блокировки:
Домен figma.site может быть недоступен в вашем регионе.

✅ Решения:
1. Откройте ссылку во внешнем браузере (Safari/Chrome)
2. Попросите владельца разместить сайт на другом домене
3. Используйте VPN (временное решение)

📞 Для технической поддержки отправьте эту информацию владельцу сайта.`;
    
    navigator.clipboard.writeText(info).then(() => {
      setDiagnosticsCopied(true);
      setTimeout(() => setDiagnosticsCopied(false), 2000);
    }).catch(() => {
      alert(info);
    });
  };

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);

  /** Финал и прирост: из загруженного скриншота или из src/data/snapshot.ts. */
  const activeSnapshot = snapshotMembers;
  const channelData = useMemo(() => {
    return BASE_CHANNEL_DATA.map((row) => {
      const username = row.channel.replace('@', '');
      const snapshotFinal = activeSnapshot[username];
      if (snapshotFinal == null) return row;
      const growth3 = snapshotFinal - row.current;
      const total = snapshotFinal - row.base;
      return {
        ...row,
        final: snapshotFinal,
        growth3,
        total,
      };
    });
  }, [activeSnapshot]);

  const chartData = useMemo(() => channelData.map(d => ({
    name: d.channel.replace('@', ''),
    'Волна 1': d.growth1,
    'Волна 2': d.growth2,
    [`Волна ${SNAPSHOT_WAVE_NUMBER}`]: d.growth3,
    'Итого': d.total,
  })), [channelData]);

  /** Средний прирост по каналам (округлённо). */
  const averageGrowth = useMemo(() => {
    if (!channelData.length) return 0;
    const sum = channelData.reduce((s, r) => s + r.total, 0);
    return Math.round(sum / channelData.length);
  }, [channelData]);

  /** Длительность наблюдения: от начала отчёта до снапшота (например "7ч" или "1д 13ч"). */
  const observationLabel = useMemo(() => {
    const start = new Date(REPORT_START_DATETIME).getTime();
    const end = new Date(SNAPSHOT_DATETIME).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const h = Math.round(hours % 24);
      return h > 0 ? `${days}д ${h}ч` : `${days}д`;
    }
    return `${Math.round(hours)}ч`;
  }, []);

  /** Топ-4 канала по приросту (актуальные данные из снапшота). */
  const growthLeaders = useMemo(() => {
    return [...channelData]
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [channelData]);

  /** Данные для нарративных инсайтов: доноры, бенефициары, лидеры волн, диапазоны. */
  const insightData = useMemo(() => {
    const donors = channelData.filter((r) => r.type === 'donor');
    const beneficiaries = channelData.filter((r) => r.type === 'beneficiary');
    const byTotal = [...channelData].sort((a, b) => b.total - a.total);
    const byWave2 = [...channelData].sort((a, b) => b.growth2 - a.growth2);
    const byWave3 = [...channelData].sort((a, b) => (b.growth3 ?? 0) - (a.growth3 ?? 0));
    const totalMin = Math.min(...channelData.map((r) => r.total));
    const totalMax = Math.max(...channelData.map((r) => r.total));
    const wave2Min = Math.min(...channelData.map((r) => r.growth2));
    const wave2Max = Math.max(...channelData.map((r) => r.growth2));
    const wave3Min = Math.min(...channelData.map((r) => r.growth3 ?? 0));
    const wave3Max = Math.max(...channelData.map((r) => r.growth3 ?? 0));
    return {
      donors: donors.map((r) => ({ channel: r.channel, growth1: r.growth1, growth2: r.growth2, growth3: r.growth3 ?? 0, total: r.total })),
      beneficiaries: beneficiaries.map((r) => ({ channel: r.channel, base: r.base, final: r.final, total: r.total })),
      topByTotal: byTotal.slice(0, 4).map((r) => ({ channel: r.channel, total: r.total })),
      bottomByTotal: byTotal.slice(-3).map((r) => ({ channel: r.channel, total: r.total })),
      wave2Leader: byWave2[0] ? { channel: byWave2[0].channel, growth2: byWave2[0].growth2 } : null,
      wave3Leaders: byWave3.slice(0, 5).filter((r) => (r.growth3 ?? 0) > 0).map((r) => ({ channel: r.channel, growth3: r.growth3 ?? 0 })),
      totalRange: `${totalMin}…+${totalMax}`,
      wave2Range: `+${wave2Min}…+${wave2Max}`,
      wave3Range: `+${wave3Min}…+${wave3Max}`,
      donorWave3Sample: donors.slice(0, 3).map((r) => `${r.channel} +${r.growth3 ?? 0}`).join(', '),
      othersWave3Sample: byWave3.slice(0, 5).map((r) => `${r.channel.replace('@', '')} +${r.growth3 ?? 0}`).join(', '),
    };
  }, [channelData]);

  /** Сигналы, что эффект папки выдыхается (эвристики по хвосту последней волны). */
  const folderFadeSignals = useMemo(() => {
    const rows = channelData;
    const tail = rows.map((r) => r.growth3 ?? 0);
    const totals = rows.map((r) => r.total ?? 0);
    const tailSum = tail.reduce((a, b) => a + b, 0);

    const tailShares = rows.map((r) => {
      const t = r.total ?? 0;
      const g = r.growth3 ?? 0;
      if (!t || t <= 0) return 0;
      return clamp01(g / t);
    });

    const pTailLe2 = rows.length ? tail.filter((x) => x <= 2).length / rows.length : 0;
    const pTailLe5 = rows.length ? tail.filter((x) => x <= 5).length / rows.length : 0;

    const top3Tail = [...tail].sort((a, b) => b - a).slice(0, 3);
    const tailTop3Share = tailSum > 0 ? clamp01(top3Tail.reduce((a, b) => a + b, 0) / tailSum) : 0;

    const byType = (type: 'beneficiary' | 'donor' | 'stable') => rows.filter((r) => r.type === type);
    const tailStats = (arr: typeof channelData) => {
      const g = arr.map((r) => r.growth3 ?? 0);
      const s = arr.map((r) => {
        const t = r.total ?? 0;
        const gg = r.growth3 ?? 0;
        if (!t || t <= 0) return 0;
        return clamp01(gg / t);
      });
      return {
        n: arr.length,
        tailMedian: median(g),
        tailMean: mean(g),
        tailShareMedian: median(s),
      };
    };

    const bene = tailStats(byType('beneficiary'));
    const donor = tailStats(byType('donor'));

    // Вердикт: более уверенный тон, но всё равно на эвристиках.
    const tailShareMed = median(tailShares);
    const isFading =
      tailShareMed < 0.1 && // хвост < 10% от total у "типичного" канала
      pTailLe5 >= 0.5; // у большинства хвост уже маленький

    return {
      isFading,
      tailSum,
      tailMedian: median(tail),
      tailMean: mean(tail),
      tailShareMedian: tailShareMed,
      pTailLe2,
      pTailLe5,
      tailTop3Share,
      bene,
      donor,
    };
  }, [channelData]);

  /** Таблица: всегда сортировка по приросту (Итого) от большего к меньшему. */
  const tableDataSorted = useMemo(
    () => [...channelData].sort((a, b) => b.total - a.total),
    [channelData]
  );

  /** Категории для волны среза (growth3): как у волн 1 и 2 — термин, определение, строка каналов. */
  const wave3Categories = useMemo(() => {
    const sorted = [...channelData]
      .filter((r) => r.growth3 > 0)
      .sort((a, b) => b.growth3 - a.growth3);
    if (sorted.length === 0) return [];
    const maxG = sorted[0].growth3;
    const top = sorted.filter((r) => r.growth3 === maxG);
    const mid = sorted.filter((r) => r.growth3 < maxG && r.growth3 >= maxG - 4);
    const rest = sorted.filter((r) => r.growth3 < maxG - 4);
    const fmt = (arr: typeof sorted) => arr.map((r) => `${r.channel} (+${r.growth3})`).join(', ');
    const categories: { term: string; definition: string; line: string }[] = [];
    if (top.length) {
      categories.push({
        term: 'Лидеры волны',
        definition: 'Максимальный прирост в данном срезе. Показатель наивысшей динамики в период до снапшота.',
        line: fmt(top),
      });
    }
    if (mid.length) {
      categories.push({
        term: 'Сильный прирост',
        definition: 'Прирост выше среднего в срезе. Стабильная динамика в период наблюдения.',
        line: fmt(mid),
      });
    }
    if (rest.length) {
      categories.push({
        term: 'Умеренный прирост',
        definition: 'Положительный прирост в срезе. Рост продолжается после второй волны.',
        line: fmt(rest),
      });
    }
    return categories;
  }, [channelData]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 200}>
      <PerformanceOptimizer />
      <PerformanceMonitor />
      
      {/* Loading Screen */}
      {isLoading && <LoadingScreen />}
      
      <div className={`min-h-screen bg-black text-white transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* Diagnostics Banner */}
        <AnimatePresence>
          {showDiagnostics && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-yellow-600/95 to-orange-600/95 backdrop-blur-xl border-b border-yellow-400/30 shadow-2xl"
            >
              <div className="px-4 md:px-6 py-3 md:py-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-yellow-300 flex items-center justify-center">
                      <span className="text-yellow-900 text-xs md:text-sm font-bold">⚠</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-medium text-white mb-1">
                      Проблемы с доступом?
                    </h3>
                    <p className="text-xs md:text-sm text-yellow-50/90 mb-2">
                      Домен <code className="px-1.5 py-0.5 bg-black/20 rounded text-yellow-100">figma.site</code> может быть недоступен в вашем регионе. 
                      {navigator.userAgent.includes('Telegram') && (
                        <span className="ml-1">Попробуйте открыть во внешнем браузере.</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={copyDiagnostics}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs md:text-sm rounded-lg transition-colors border border-white/20"
                      >
                        {diagnosticsCopied ? '✓ Скопировано' : '📋 Копировать диагностику'}
                      </button>
                      <button
                        onClick={() => setShowDiagnostics(false)}
                        className="px-3 py-1.5 bg-black/20 hover:bg-black/30 text-white text-xs md:text-sm rounded-lg transition-colors"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.header 
          initial={isMobile ? { opacity: 0 } : { y: -100 }}
          animate={isMobile ? { opacity: 1 } : { y: 0 }}
          transition={isMobile ? { duration: 0.3 } : { type: "spring", stiffness: 100, damping: 20 }}
          className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/20"
        >
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
            <h1 className="text-base md:text-xl tracking-[0.2em] font-light">
              CAREER HUB
            </h1>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {/* Open in Browser button for Telegram */}
              {typeof navigator !== 'undefined' && navigator.userAgent.includes('Telegram') && (
                <button
                  onClick={() => {
                    const url = window.location.href;
                    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
                      window.location.href = `x-safari-https://${window.location.host}${window.location.pathname}`;
                    } else {
                      alert('Нажмите на ⋯ (три точки) в правом верхнем углу → "Открыть в браузере"');
                    }
                  }}
                  className="border border-yellow-500/60 px-2 md:px-3 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20 transition-all duration-300 flex items-center gap-1"
                >
                  <span className="text-xs">🌐</span>
                  <span className="hidden sm:inline">Открыть в браузере</span>
                  <span className="sm:hidden">Браузер</span>
                </button>
              )}
              
              <motion.a 
                href="https://t.me/addlist/2VJJoel8MA5mNDgy" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={!isMobile ? { scale: 1.05 } : undefined}
                whileTap={{ scale: 0.95 }}
                className="border border-white/40 px-3 md:px-4 py-1 text-xs md:text-sm rounded-full hover:bg-white hover:text-black transition-all duration-300"
              >
                Добавить папку
              </motion.a>
            </div>
          </div>
        </motion.header>

        {/* Hero Section */}
        <section ref={heroRef} className="min-h-screen flex flex-col border-b border-white/20 pt-16 md:pt-20 relative overflow-hidden">
          <div className="flex-1 flex items-center px-4 md:px-12 lg:px-20">
            <motion.div
              style={!isMobile ? { y, opacity } : {}}
              className="max-w-7xl w-full"
            >
              <h2 className="text-4xl md:text-8xl lg:text-9xl font-light leading-none tracking-tight mb-8 md:mb-16">
                {isMobile || prefersReducedMotion ? (
                  <>
                    АНАЛИТИЧЕСКИЙ<br />
                    ОТЧЁТ ПО ПАПКЕ<br />
                    CAREER HUB
                  </>
                ) : (
                  <>
                    {"АНАЛИТИЧЕСКИЙ".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.5 }}
                      >
                        {char}
                      </motion.span>
                    ))}<br />
                    {"ОТЧЁТ ПО ПАПКЕ".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (14 + i) * 0.03, duration: 0.5 }}
                      >
                        {char}
                      </motion.span>
                    ))}<br />
                    {"CAREER HUB".split("").map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (28 + i) * 0.03, duration: 0.5 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </>
                )}
              </h2>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-white/20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="p-4 md:p-12 md:border-r border-white/20"
            >
              <p className="text-sm md:text-lg leading-relaxed">
                Исследование динамики роста дизайн-каналов в Telegram. 
                Анализ аудиторий, пересечений и механик распределения подписчиков 
                между каналами папки Career Hub.
              </p>
              <p className="text-xs md:text-sm text-white/60 mt-4">
                8 февраля 2026 • 11:00–18:06
              </p>
              <p className="text-xs md:text-sm text-white/50 mt-2">
                Актуальные подписчики: {SNAPSHOT_LABEL}
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7, duration: 0.8 }}
              className="p-4 md:p-12 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all group" 
              onClick={() => scrollToSection('data')}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center">
                <div className="text-xl md:text-3xl mb-2">Scroll Down</div>
                <motion.div 
                  className="text-2xl md:text-4xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  ↓
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="border-b border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/20"
            >
              <div className="text-6xl md:text-8xl font-light mb-4">12</div>
              <div className="text-base md:text-xl tracking-wider">КАНАЛОВ</div>
              <div className="text-xs md:text-sm text-white/60 mt-2">В исследовании</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 md:p-12 border-b md:border-b-0 md:border-r border-white/20"
            >
              <div className="text-6xl md:text-8xl font-light mb-4">+{averageGrowth}</div>
              <div className="text-base md:text-xl tracking-wider">СРЕДНИЙ ПРИРОСТ</div>
              <div className="text-xs md:text-sm text-white/60 mt-2">Подписчиков за период</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="p-8 md:p-12"
            >
              <div className="text-6xl md:text-8xl font-light mb-4">{observationLabel}</div>
              <div className="text-base md:text-xl tracking-wider">НАБЛЮДЕНИЕ</div>
              <div className="text-xs md:text-sm text-white/60 mt-2">Временной период</div>
              <div className="text-xs text-white/50 mt-1">с {REPORT_START_LABEL}</div>
            </motion.div>
          </div>
        </section>

        {/* Top Channels */}
        <section className="border-b border-white/20" id="data">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-3xl md:text-7xl font-light mb-8 md:mb-16 tracking-tight"
            >
              ЛИДЕРЫ РОСТА
            </motion.h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black">
              {growthLeaders.map((channel, idx) => (
                <motion.div
                  key={channel.channel}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ 
                    delay: idx * 0.15,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    y: -8,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className="bg-black p-8 hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <motion.div 
                    className="text-6xl font-light mb-4 text-white/40 group-hover:text-white/60 transition-colors"
                    whileHover={{ scale: 1.1, x: 5 }}
                  >
                    #{idx + 1}
                  </motion.div>
                  <div className="text-2xl mb-6 tracking-wide"><ChannelLink channel={channel.channel} /></div>
                  <motion.div 
                    className="text-5xl font-light mb-6"
                    whileHover={{ scale: 1.05 }}
                  >
                    +{channel.total}
                  </motion.div>
                  <div className="space-y-2 text-sm text-white/60">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>База</span>
                      <span className="text-white">{channel.base}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>Сейчас</span>
                      <span className="text-white">{channel.final}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Wave Analysis */}
        <section className="border-b border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black">
            <div className="p-6 md:p-12 lg:p-20 bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ВОЛНА 1</h3>
                <p className="text-white/60 mb-6">11:00 → 11:30</p>
                <div className="space-y-6">
                  <div>
                    <TermWithTooltip 
                      term="Максимальный импульс" 
                      definition="Прирост +50 подписчиков в первой волне. Показатель очень высокой конверсии аудитории в первые минуты."
                    />
                    <div className="text-xl">@tooltipp, @nix_ux_view (+50)</div>
                  </div>
                  <div>
                    <TermWithTooltip 
                      term="Сильный старт" 
                      definition="Прирост +45–48 подписчиков в первой волне. Хорошая начальная динамика с быстрой активацией аудитории."
                    />
                    <div className="text-xl">@DesignDictatorship, @prodtomorrow (+48)</div>
                  </div>
                  <div>
                    <TermWithTooltip 
                      term="Поздний старт" 
                      definition="Прирост +11–16 подписчиков в первой волне. Основной рост смещён во вторую волну из-за тайминга постов или специфики аудитории."
                    />
                    <div className="text-xl">@visuaaaals (+16), @yuliapohilko (+11)</div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="p-6 md:p-12 lg:p-20 bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ВОЛНА 2</h3>
                <p className="text-white/60 mb-6">11:30 → ~15:30</p>
                <div className="space-y-6">
                  <div>
                    <TermWithTooltip 
                      term="Абсолютный лидер" 
                      definition="Канал с максимальным приростом в конкретной волне. Показатель наивысшей эффективности в данном временном отрезке."
                    />
                    <div className="text-xl">@visuaaaals (+76)</div>
                  </div>
                  <div>
                    <TermWithTooltip 
                      term="Сильный рост" 
                      definition="Прирост +45–48 подписчиков в первой волне. Хорошая начальная динамика с быстрой активацией аудитории."
                    />
                    <div className="text-xl">@yuliapohilko (+48)</div>
                  </div>
                  <div>
                    <TermWithTooltip 
                      term="Стабильная группа" 
                      definition="Каналы с равномерным приростом в обеих волнах (+30–40). Показывают предсказуемую динамику без резких скачков."
                    />
                    <div className="text-xl">@tooltipp, @lx_grzdv_links, @sshultse (+34…+37)</div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="p-6 md:p-12 lg:p-20 bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ВОЛНА {SNAPSHOT_WAVE_NUMBER}</h3>
                <p className="text-white/60 mb-6">15:30 → {SNAPSHOT_TIME}</p>
                <div className="space-y-6">
                  {wave3Categories.map((cat) => (
                    <div key={cat.term}>
                      <TermWithTooltip term={cat.term} definition={cat.definition} />
                      <div className="text-xl">{cat.line}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-light mb-12 tracking-tight"
            >
              ВИЗУАЛИЗАЦИЯ ДАННЫХ
            </motion.h3>

            <div className="space-y-12">
              {/* Legend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-wrap gap-6 items-center justify-center text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-white/80">Бенефициары</span>
                  <span className="text-white/40">(низкий overlap)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-white/40"></div>
                  <span className="text-white/80">Стабильные</span>
                  <span className="text-white/40">(средний overlap)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500/60"></div>
                  <span className="text-white/80">Доноры</span>
                  <span className="text-white/40">(высокий overlap)</span>
                </div>
              </motion.div>

              {/* Chart Switcher */}
              <LazySection>
                <ChartSection channelData={channelData} windowWidth={windowWidth} />
              </LazySection>
            </div>
          </div>
        </section>

        {/* Insights */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-light tracking-tight mb-16"
            >
              КЛЮЧЕВЫЕ ИНСАЙТЫ
            </motion.h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black items-stretch">
              {/* 1. Доноры экосистемы */}
              <InsightCard
                idx={0}
                icon={Users}
                meta="Высокий Overlap"
                title="ДОНОРЫ ЭКОСИСТЕМЫ"
              >
                <p className="text-sm text-white/70 mb-3">
                  У каналов-доноров ({insightData.donors.map((d) => d.channel).join(', ')}) в волне {SNAPSHOT_WAVE_NUMBER} прирост небольшой: {insightData.donorWave3Sample}.
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  <li>В той же волне сильнее выросли другие: {insightData.othersWave3Sample}</li>
                  <li>Гипотеза: аудитория доноров насыщена «ядром», папка добирает менее пересекаемые каналы</li>
                </ul>
              </InsightCard>

              {/* 2. Главные бенефициары */}
              <InsightCard
                idx={1}
                icon={TrendingUp}
                meta="Низкий Overlap"
                title="ГЛАВНЫЕ БЕНЕФИЦИАРЫ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Итоговый рост с {REPORT_START_LABEL} до {SNAPSHOT_LABEL} — кто сильнее всего добирал новую аудиторию:
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  {insightData.topByTotal.map((r) => (
                    <li key={r.channel}><strong className="text-white/80">{r.channel} +{r.total}</strong></li>
                  ))}
                </ul>
                <p className="text-sm text-white/60">
                  Гипотеза: у этих каналов ниже пересечение с ядром и/или выше конверсия «витрины».
                </p>
              </InsightCard>

              {/* 3. Низкий прирост ≠ слабый канал */}
              <InsightCard
                idx={2}
                icon={Lightbulb}
                meta="Ключевой инсайт"
                title="НИЗКИЙ ПРИРОСТ ≠ СЛАБЫЙ КАНАЛ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Рост сам по себе не измеряет «силу». Канал может быть сильным и расти меньше из-за насыщения аудитории.
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  <li>Ядро упирается в потолок быстрее: у доноров в волне {SNAPSHOT_WAVE_NUMBER} прирост всего {insightData.donorWave3Sample}</li>
                  <li>При этом папка продолжает «докармливать» другие каналы поздними волнами</li>
                </ul>
                <p className="text-sm text-white/60">Гипотеза: низкий прирост чаще означает высокий overlap, а не слабый контент.</p>
              </InsightCard>

              {/* 4. Донорство ≠ тайминг */}
              <InsightCard
                idx={3}
                icon={Clock}
                meta="Структурная роль"
                title="ДОНОРСТВО ≠ ТАЙМИНГ"
              >
                <p className="text-sm text-white/70 mb-3">
                  «Донорский» эффект проявляется как перераспределение роста: у доноров малый прирост по волне {SNAPSHOT_WAVE_NUMBER}, у других — до +{Math.max(...channelData.map((r) => r.growth3 ?? 0))} в том же срезе.
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1">
                  <li>Гипотеза: донорство определяется насыщенностью аудитории (overlap), тайминг лишь запускает переток</li>
                </ul>
              </InsightCard>

              {/* 5. Постепенная распаковка */}
              <InsightCard
                idx={4}
                icon={PackageOpen}
                meta="Вторая и третья волны"
                title="ПОСТЕПЕННАЯ РАСПАКОВКА"
              >
                <p className="text-sm text-white/70 mb-3">
                  У части каналов основная динамика пришлась не на первую волну, а на «хвост».
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  {insightData.wave2Leader && (
                    <li><strong className="text-white/80">{insightData.wave2Leader.channel}</strong> — лидер волны 2 (+{insightData.wave2Leader.growth2})</li>
                  )}
                  <li>Диапазоны: волна 2 {insightData.wave2Range}, волна {SNAPSHOT_WAVE_NUMBER} {insightData.wave3Range}</li>
                </ul>
                <p className="text-sm text-white/60">Гипотезы: задержка постинга, эффект «второго захода» аудитории, лучшая конверсия после просмотра витрины.</p>
              </InsightCard>

              {/* 6. Выравнивание экосистемы */}
              <InsightCard
                idx={5}
                icon={Scale}
                meta="Финальный эффект"
                title="ВЫРАВНИВАНИЕ ЭКОСИСТЕМЫ"
              >
                <p className="text-sm text-white/70 mb-3">
                  К финалу периода экосистема «сошлась» в узкий коридор: примерно <strong className="text-white/80">+{insightData.totalRange}</strong> у большинства каналов.
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  <li>Верх: {insightData.topByTotal.map((r) => `${r.channel.replace('@', '')} +${r.total}`).join(', ')}</li>
                  <li>Низ: {insightData.bottomByTotal.map((r) => `${r.channel.replace('@', '')} +${r.total}`).join(', ')}</li>
                </ul>
                <p className="text-sm text-white/60">Вывод: папка работает как механизм перераспределения и выравнивания.</p>
              </InsightCard>

              {/* 7. Два типа роста */}
              <InsightCard
                idx={6}
                icon={GitBranch}
                meta="Доп. инсайт"
                title="ДВА ТИПА РОСТА: ИМПУЛЬС vs ХВОСТ"
              >
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1 mb-3">
                  <li><strong className="text-white/80">Импульсные:</strong> крупная доля прироста в волне 1 (пример: каналы с growth1 &gt; 40)</li>
                  <li><strong className="text-white/80">Хвостовые:</strong> основной прирост во 2–3 волне {insightData.wave2Leader ? `(${insightData.wave2Leader.channel} +${insightData.wave2Leader.growth2} во 2-й волне)` : ''}</li>
                </ul>
                <p className="text-sm text-white/60">Гипотеза: импульс зависит от «витрины», хвост — от постинга и возвращаемости аудитории.</p>
              </InsightCard>

              {/* 8. Кто получил в последнем срезе */}
              <InsightCard
                idx={7}
                icon={Gift}
                meta="Доп. инсайт"
                title="КТО «ПОЛУЧИЛ» В ПОСЛЕДНЕМ СРЕЗЕ"
              >
                <p className="text-sm text-white/70 mb-3">
                  В волне {SNAPSHOT_WAVE_NUMBER} (15:30 → {SNAPSHOT_TIME}) максимальный прирост получили:
                </p>
                <ul className="text-sm text-white/60 list-disc pl-5 space-y-1">
                  <li><strong className="text-white/80">{insightData.wave3Leaders.map((r) => `${r.channel} +${r.growth3}`).join(', ')}</strong></li>
                  <li>Гипотеза: это «карта пересечений» — кто ближе к ядру, тот меньше добирает в срезе; кто дальше — растёт сильнее</li>
                </ul>
              </InsightCard>
            </div>
          </div>
        </section>

        {/* Folder effect is fading */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-light tracking-tight mb-6"
            >
              ЭФФЕКТ ПАПКИ СХОДИТ НА НЕТ
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/60 mb-10 text-sm max-w-3xl"
            >
              Это не «истина», а чтение формы кривой роста. Мы видим только подписчиков по волнам (без источников и просмотров),
              поэтому ниже — сигналы, что папка уже дала основной импульс, а дальше рост чаще объясняется собственным постингом и инерцией.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black items-stretch">
              <InsightCard
                idx={0}
                icon={PackageOpen}
                meta="Доля хвоста"
                title="ХВОСТ СТАЛ МАЛЕНЬКИМ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Медианная доля хвоста (волна {SNAPSHOT_WAVE_NUMBER}: 15:30 → {SNAPSHOT_TIME}) в общем росте —{' '}
                  <strong className="text-white/85">{fmtPct(folderFadeSignals.tailShareMedian, 1)}</strong>. Это означает, что у «типичного»
                  канала почти весь прирост уже случился раньше.
                </p>
                <p className="text-sm text-white/60">
                  Хвост на канал: медиана <strong className="text-white/80">+{Math.round(folderFadeSignals.tailMedian)}</strong>, среднее{' '}
                  <strong className="text-white/80">+{folderFadeSignals.tailMean.toFixed(1)}</strong>.
                </p>
              </InsightCard>

              <InsightCard
                idx={1}
                icon={Clock}
                meta="Плато"
                title="БОЛЬШИНСТВО УЖЕ НА ПЛАТО"
              >
                <p className="text-sm text-white/70 mb-3">
                  Доля каналов с хвостом ≤ <strong className="text-white/85">+2</strong>:{' '}
                  <strong className="text-white/85">{fmtPct(folderFadeSignals.pTailLe2, 0)}</strong>.
                </p>
                <p className="text-sm text-white/70 mb-3">
                  Доля каналов с хвостом ≤ <strong className="text-white/85">+5</strong>:{' '}
                  <strong className="text-white/85">{fmtPct(folderFadeSignals.pTailLe5, 0)}</strong>.
                </p>
                <p className="text-sm text-white/60">
                  Чем выше эти доли, тем меньше «папочного топлива» остаётся: новые подписки распределяются тонким слоем.
                </p>
              </InsightCard>

              <InsightCard
                idx={2}
                icon={GitBranch}
                meta="Концентрация"
                title="ХВОСТ НЕ “ТАЩИТ” ВСЮ ПАПКУ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Top‑3 каналов дают <strong className="text-white/85">{fmtPct(folderFadeSignals.tailTop3Share, 0)}</strong> всего хвоста.
                </p>
                <p className="text-sm text-white/60">
                  Это похоже на фазу, где нет одного «двигателя папки»: поздний рост распадается на небольшие локальные причины (посты, репосты,
                  возвращаемость).
                </p>
              </InsightCard>

              <InsightCard
                idx={3}
                icon={Scale}
                meta="Перераспределение"
                title="ПРОФИЛЬ ПАПКИ ЕЩЁ ВИДЕН, НО СЛАБЕЕТ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Бенефициары в хвосте выше доноров: медианная доля хвоста{' '}
                  <strong className="text-white/85">{fmtPct(folderFadeSignals.bene.tailShareMedian, 1)}</strong> vs{' '}
                  <strong className="text-white/85">{fmtPct(folderFadeSignals.donor.tailShareMedian, 1)}</strong>.
                </p>
                <p className="text-sm text-white/60">
                  Но сама величина хвоста уже маленькая — поэтому «папочный» паттерн виден скорее как остаточная инерция, а не как основной драйвер.
                </p>
              </InsightCard>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-10 border border-white/10 rounded-xl p-5 md:p-6 bg-gradient-to-br from-white/[0.03] to-transparent"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Вердикт по форме кривой</div>
                  <div className="text-lg md:text-2xl font-light">
                    {folderFadeSignals.isFading ? (
                      <span className="text-white/90">Эффект папки уже в основном исчерпан; дальше работает «свой» рост.</span>
                    ) : (
                      <span className="text-white/90">Хвост ещё заметен; эффект папки продолжается, но уже не доминирует.</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-white/60">
                  Сумма хвоста: <strong className="text-white/80">+{Math.round(folderFadeSignals.tailSum)}</strong>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Data Table */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-light mb-6 tracking-tight"
            >
              ДЕТАЛЬНЫЕ ДАННЫЕ
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/60 mb-12 text-sm flex items-center gap-2"
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="inline-block w-2 h-2 bg-white/60 rounded-full"
              />
              Кликните на строку или иконку <TrendingUp className="w-4 h-4 inline" />, чтобы увидеть график роста канала
            </motion.p>

            <div className="overflow-x-auto relative">
              <table className="w-full text-sm border-collapse relative">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-4 px-4 font-light text-base">Канал</th>
                    <th className="text-right py-4 px-4 font-light">11:00</th>
                    <th className="text-right py-4 px-4 font-light">11:30</th>
                    <th className="text-right py-4 px-4 font-light">15:30</th>
                    <th className="text-right py-4 px-4 font-light">18:06</th>
                    <th className="text-right py-4 px-4 font-light" title={SNAPSHOT_LABEL}>Срез ({SNAPSHOT_TIME})</th>
                    <th className="text-right py-4 px-4 font-light">Волна 1</th>
                    <th className="text-right py-4 px-4 font-light">Волна 2</th>
                    <th className="text-right py-4 px-4 font-light">Волна {SNAPSHOT_WAVE_NUMBER}</th>
                    <th className="text-right py-4 px-4 font-light">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {tableDataSorted.map((row, idx) => (
                    <TableRow
                      key={row.channel}
                      row={row}
                      idx={idx}
                      onGenerateInsight={(r) => setInsightModalRow(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {insightModalRow && (
            <InsightModal
              key={insightModalRow.channel}
              channel={insightModalRow.channel}
              promptText={buildChannelInsightPrompt(insightModalRow, channelData, SNAPSHOT_LABEL)}
              onClose={() => setInsightModalRow(null)}
            />
          )}
        </AnimatePresence>

        {/* Glossary */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-light mb-12 tracking-tight"
            >
              ГЛОССАРИЙ
            </motion.h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Волна 1</div>
                <p className="text-white/80">
                  Первые 30 минут после запуска папки (11:00–11:30). Время максимального интереса и органического охвата у аудитории доноров.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Волна 2</div>
                <p className="text-white/80">
                  Период с 11:30 до 15:30. Вторичный охват через отложенные посты, пересылки и рекомендации алгоритма.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.07 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Волна {SNAPSHOT_WAVE_NUMBER}</div>
                <p className="text-white/80">
                  Срез данных: период с 15:30 до момента снапшота ({SNAPSHOT_LABEL}). Каждый новый скрин «Добавить папку» задаёт следующий срез — в snapshot.ts укажите новый SNAPSHOT_DATETIME и при необходимости увеличьте SNAPSHOT_WAVE_NUMBER.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Максимальный импульс</div>
                <p className="text-white/80">
                  Прирост +50 подписчиков в первой волне. Показатель очень высокой конверсии аудитории в первые минуты.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Сильный старт</div>
                <p className="text-white/80">
                  Прирост +45–48 подписчков в первой волне. Хорошая начальная динамика с быстрой активацией аудитории.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Поздний старт</div>
                <p className="text-white/80">
                  Прирост +11–16 подписчиков в первой волне. Основной рост смещён во вторую волну из-за тайминга постов или специфики аудитории.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Overlap (пересечение)</div>
                <p className="text-white/80">
                  Доля аудитории, уже подписанной на несколько каналов из папки. Высокий overlap = меньше потенциала роста, низкий = больше новых подписчиков.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Доноыы экосистемы</div>
                <p className="text-white/80">
                  Каналы с большой устоявшейся аудиторией, которые делятся трафиком с дрыгими канаыами папки больше, чем получают сами.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Бенефициары</div>
                <p className="text-white/80">
                  Каналы с низким пересечением аудитории, которые получают максимальный прирост от включения в папку за счёт привлечения новых читателей.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Абсолютный лидер</div>
                <p className="text-white/80">
                  Канал с максимальным приростом в конкретной волне. Показатель наивысшей эффективности в данном временном отрезке.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 }}
                className="bg-black p-6 md:p-8"
              >
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Стабильная группа</div>
                <p className="text-white/80">
                  Каналы с равномерным приростом в обеих волнах (+30–40). Показывают предсказуемую динамику без резких скачков.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="border-b border-white/20">
          <div className="p-6 md:p-12 lg:p-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-5xl md:text-7xl font-light mb-12 tracking-tight leading-tight"
              >
                ФИНАЛЬНЫЙ ВЫВОД
              </motion.h3>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-4xl"
              >
                <div className="border-l-4 border-white pl-8 md:pl-12 space-y-6">
                  <p className="text-xl md:text-3xl font-light text-white leading-relaxed">
                    {CONCLUSION.intro}
                  </p>
                  <div className="space-y-4 text-lg md:text-xl text-white/80">
                    {CONCLUSION.bullets.map((bullet, i) => (
                      <p key={i} className="flex items-start gap-4">
                        <span className="text-white/40 flex-shrink-0">→</span>
                        <span dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.+?)\*\*/g, '<span class="font-medium text-white">$1</span>') }} />
                      </p>
                    ))}
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="pt-8 border-t border-white/20 mt-8"
                  >
                    <p className="text-white/60 text-sm md:text-base">
                      {CONCLUSION.closing}
                    </p>
                    {CONCLUSION_GENERATED_AT && (
                      <p className="text-white/40 text-xs mt-3">
                        Вывод сгенерирован по данным от {new Date(CONCLUSION_GENERATED_AT).toLocaleString('ru-RU')}. Обновить: <code className="text-white/60">npm run generate-conclusion</code>
                      </p>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="p-6 md:p-12 lg:p-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <div className="text-3xl md:text-4xl font-light mb-4 tracking-wide">CAREER HUB</div>
              <div className="text-white/60">Аналитический отчёт</div>
            </div>
            <div className="text-right">
              <div className="text-white/60 mb-2">
                Период отчёта: {REPORT_START_LABEL} – {SNAPSHOT_LABEL}
              </div>
              <div className="text-white/60">
                Текущая дата: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-white/50 text-sm mt-2">
                Данные актуализированы: {SNAPSHOT_LABEL}
              </div>
            </div>
          </div>
          
          {/* Diagnostics Button */}
          <div className="border-t border-white/10 pt-6">
            <button
              onClick={() => setShowDiagnostics(true)}
              className="text-white/40 hover:text-white/60 text-xs transition-colors flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Проблемы с доступом? Диагностика</span>
            </button>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
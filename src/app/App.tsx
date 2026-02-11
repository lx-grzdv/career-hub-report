import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, ReferenceLine } from 'recharts';
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

function fmtInt(x: number): string {
  const v = Number.isFinite(x) ? x : 0;
  return Math.round(v).toLocaleString('ru-RU');
}

function fmtSignedInt(x: number): string {
  const v = Number.isFinite(x) ? Math.round(x) : 0;
  return v > 0 ? `+${fmtInt(v)}` : fmtInt(v);
}

type TableSortKey =
  | 'channel'
  | 'base'
  | 'wave1'
  | 'wave2'
  | 'current'
  | 'final'
  | 'growth1'
  | 'growth2'
  | 'growth3'
  | 'total';

type TableSortDir = 'asc' | 'desc';

type SnapshotOverride = {
  members: Record<string, number>;
  datetime: string; // ISO
  label: string;
  time: string; // HH:MM
  waveNumber: number;
};

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
          <button type="button" aria-label={`Пояснение: ${term}`} className="hover:text-white/60 transition-colors">
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

const ChartModal = memo(({
  data,
  channel,
  onClose,
  snapshotWaveNumber,
}: {
  data: { time: string; value: number }[];
  channel: string;
  onClose: () => void;
  snapshotWaveNumber: number;
}) => {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value)), [data]);
  const range = useMemo(() => maxValue - minValue, [maxValue, minValue]);
  const totalGrowth = useMemo(() => data[data.length - 1].value - data[0].value, [data]);

  useEffect(() => {
    // Block scroll
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
                  <div className="text-xl md:text-2xl tabular-nums">{fmtInt(data[0].value)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Прирост</div>
                  <div className="text-xl md:text-2xl text-green-500 tabular-nums">{fmtSignedInt(totalGrowth)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Сейчас</div>
                  <div className="text-xl md:text-2xl tabular-nums">{fmtInt(data[data.length - 1].value)}</div>
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
                  {i === 3 && `Волна ${snapshotWaveNumber}`}
                  {i === 4 && `Волна ${snapshotWaveNumber} (финал)`}
                </div>
                <div className="text-sm text-white/60 mb-2">{d.time}</div>
                <div className="text-2xl md:text-3xl font-light tabular-nums">{fmtInt(d.value)}</div>
                {i > 0 && (
                  <div className="text-sm text-green-500 mt-1">
                    {fmtSignedInt(d.value - data[i - 1].value)}
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

const ANALYST_PROFILE = `Наблюдения и размышления о своём пути: с чем работаешь и сталкиваешься, короткие заметки, иногда грусть. Фокус на «через человека», а не только советы: как личность проявляется в профдеятельности и как с этим живёт автор. Параллельно — событийная оптика и лайфстайл-формат.`;

const CHANNEL_INSIGHT_PROMPT = `Ты — аналитик роста Telegram‑каналов внутри ОДНОЙ папки. Дай короткий, «человеческий» разбор ОДНОГО канала по числам. Без канцелярита и без воды.

ВХОДНЫЕ ДАННЫЕ:
- TARGET_CHANNEL — один handle из папки
- BASELINE_DATA — строки вида "@chan: base=..., 11:30=..., 15:30=..., 18:06=..."
- SNAPSHOT_DATA — строки вида "@chan: latest=..." (последний срез)
- OPTIONAL_PROFILE (может отсутствовать) — 1–3 предложения описания канала (субъективная характеристика автора)
- FOLDER_CHANNELS — список всех каналов папки (включая TARGET_CHANNEL)
- ANALYST_PROFILE — мой оценочный портрет (как я обычно смотрю на каналы папки)

КЛЮЧЕВАЯ ИДЕЯ:
Твоя задача — аккуратно описать, ЧТО видно в данных и ЧЕМ канал отличается от фона папки. Не придумывай мотивацию людей и «универсальные советы».
Опирайся на ANALYST_PROFILE: смотри на каналы через эту оптику и язык, но не пересказывай и не цитируй его напрямую — это внутренний профиль автора отчёта.

СТРОГИЕ ПРАВИЛА:
1) В блоках A–D не давать прямых советов «что делать» (никаких action items про контент‑план, форматы, регулярность).
2) В блоке E) «Поддержка и мотивация» можно дать мягкие советы и поддержку автору: как не выгорать, не бояться постить, ценить личные посты и живой голос. Не уходи в чек‑листы и жёсткие рецепты.
3) Никаких определений терминов.
4) Не придумывать факты. Если данных не хватает — напиши «н/д».
5) Каждый вывод в секциях C и D должен содержать минимум 2 числа (например: "+44 и +23", "6/12 и +16.2%").
6) Обязательно джойни BASELINE_DATA и SNAPSHOT_DATA по каналу и построй ряд:
   T0=base(11:00), T1=11:30, T2=15:30, T3=18:06, T4=latest.
7) Санити‑чек: Total = T4 − T0. Если не сходится — напиши «конфликт данных» и больше ничего не анализируй.
8) Про «рабочее время/фон дня» можно писать ТОЛЬКО если ты сравнил окно с фоном папки (например, среднее по Δ23). Без такого сравнения не делай выводов про поведение людей.

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
B) Метрики — 8–12 коротких строк с понятными подписями. Форматируй по‑человечески, например:
   - «Старт → финал: 734 → 844»
   - «Итого рост: +110 (+15.0%)»
   - «Утро (11:00→11:30): +48»
   - «День (11:30→15:30): +33»
   - «Рабочее окно (15:30→18:06): +8»
   - «Вечер/хвост (18:06→latest): +21»
   Добавь ранги и доли, но всегда расшифровывай окна словами, не только через Δ‑обозначения.
C) Инсайты — 3–5 буллетов: что видно по каналу и чем он отличается от фона/соседей (везде цифры). Если упоминаешь окна (утро/день/рабочее/вечер), всегда поясняй их словами, а не только через Δ01/Δ12/Δ23/Δ34.
D) Гипотезы — 2–3 буллета: аккуратные предположения про то, почему кривая выглядит так (тайминг поста, формат, пересечение аудиторий, инерция, личный голос и т.п.). В каждом пункте явно пиши, к какому фрагменту кривой (какому окну) относится гипотеза.
E) Поддержка и мотивация — 2–4 строки с ободрением и мягкими советами продолжать вести канал, опираясь на форму кривой и ANALYST_PROFILE. Нормализуй страх постить, блок после папок, ощущение, что личные посты «важнее пользы» и т.п.; никакой вины и давления.

ДАННЫЕ:
TARGET_CHANNEL:
<<<TARGET_CHANNEL>>>

OPTIONAL_PROFILE:
<<<OPTIONAL_PROFILE>>>

ANALYST_PROFILE:
<<<ANALYST_PROFILE>>>

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
    .replace('<<<ANALYST_PROFILE>>>', ANALYST_PROFILE)
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
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 border-b border-white/20 flex-shrink-0 bg-black/80 backdrop-blur">
          <h3 className="text-lg md:text-xl font-light tracking-tight">
            Инсайты по каналу <span className="text-white/70">{channel}</span>
          </h3>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1">
            ✕
          </button>
        </div>
        <div className="p-4 md:p-5 overflow-y-auto flex-1 min-h-0 space-y-5">
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
            <div className="space-y-4 md:space-y-5">
              {parsed.length > 0
                ? parsed.map(({ section, content: sectionContent }) => {
                    const raw = (section || '').trim();
                    const upper = raw.toUpperCase();

                    let variant: 'tldr' | 'metrics' | 'insights' | 'hypotheses' | 'support' | 'other' = 'other';
                    if (upper.startsWith('A') || upper.includes('TL;DR')) {
                      variant = 'tldr';
                    } else if (upper.startsWith('B') || upper.includes('МЕТРИК')) {
                      variant = 'metrics';
                    } else if (upper.startsWith('C') || upper.includes('ИНСАЙТ')) {
                      variant = 'insights';
                    } else if (upper.startsWith('D') || upper.includes('ГИПОТЕ')) {
                      variant = 'hypotheses';
                    } else if (upper.startsWith('E') || upper.includes('МОТИВА') || upper.includes('ПОДДЕРЖ')) {
                      variant = 'support';
                    }

                    let titleLabel = raw;
                    if (variant === 'tldr') titleLabel = 'A) TL;DR';
                    if (variant === 'metrics') titleLabel = 'Метрики';
                    if (variant === 'insights') titleLabel = 'Инсайты';
                    if (variant === 'hypotheses') titleLabel = 'Гипотезы';
                    if (variant === 'support') titleLabel = 'Поддержка и мотивация';

                    // Чистим дублирующие заголовки внутри текста (TL;DR, Метрики — и т.п.)
                    let cleanedContent = sectionContent.trim();
                    if (variant === 'tldr') {
                      cleanedContent = cleanedContent
                        .replace(/^A\)\s*TL;?\s*;?\s*DR\s*[-—]\s*/i, '')
                        .replace(/^TL;?\s*;?\s*DR\s*[-—]\s*/i, '');
                    } else if (variant === 'metrics') {
                      cleanedContent = cleanedContent.replace(/^МЕТРИКИ\s*[:\-—]\s*/i, '');
                    } else if (variant === 'insights') {
                      cleanedContent = cleanedContent.replace(/^ИНСАЙТЫ\s*[:\-—]\s*/i, '');
                    } else if (variant === 'hypotheses') {
                      cleanedContent = cleanedContent.replace(/^ГИПОТЕЗЫ\s*[:\-—]\s*/i, '');
                    } else if (variant === 'support') {
                      cleanedContent = cleanedContent.replace(/^ПОДДЕРЖКА.*?\s*(?:—|-|:)\s*/i, '');
                    }

                    const lines = cleanedContent
                      .split(/\r?\n/)
                      .map((l) => l.trimEnd())
                      .filter((l) => l.trim().length > 0);

                    const bodyBaseClass =
                      'whitespace-pre-wrap leading-relaxed';

                    const bodyClass =
                      variant === 'tldr'
                        ? `${bodyBaseClass} text-sm md:text-[15px] text-white`
                        : `${bodyBaseClass} text-sm md:text-[15px] text-white/85`;

                    const wrapperClass =
                      variant === 'tldr'
                        ? 'border border-white/15 rounded-xl px-3.5 py-3.5 md:px-4 md:py-4 bg-white/[0.02]'
                        : 'border border-white/10 rounded-xl px-3.5 py-3 md:px-4 md:py-3.5 bg-black/60';

                    let bodyNode: React.ReactNode;
                    if (variant === 'metrics' || variant === 'insights' || variant === 'hypotheses') {
                      const isMetrics = variant === 'metrics';
                      bodyNode = (
                        <ul
                          className={
                            (isMetrics
                              ? 'font-mono text-xs md:text-[13px] text-white/85 bg-white/[0.03] rounded-xl px-3.5 py-3 md:px-4 md:py-3.5 '
                              : 'text-sm md:text-[15px] text-white/85 ') + 'space-y-1.5 md:space-y-2 list-none m-0'
                          }
                        >
                          {lines.map((line, idx) => {
                            const trimmed = line.trim();
                            const isBullet = /^[-•]/.test(trimmed);
                            const text = isBullet ? trimmed.replace(/^[-•]\s*/, '') : trimmed;
                            return (
                              <li key={idx} className="relative pl-4">
                                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-white/50" />
                                <span className="align-middle">{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    } else {
                      bodyNode = <div className={bodyClass}>{cleanedContent}</div>;
                    }

                    return (
                      <div key={section} className={wrapperClass}>
                        <div className="text-[10px] md:text-xs text-white/40 uppercase tracking-[0.25em] mb-2">
                          {titleLabel}
                        </div>
                        {bodyNode}
                      </div>
                    );
                  })
                : (
                  <div className="text-sm md:text-[15px] text-white/80 whitespace-pre-wrap leading-relaxed">
                    {content}
                  </div>
                )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const TableRow = memo(({
  row,
  idx,
  onGenerateInsight,
  snapshotTime,
  snapshotWaveNumber,
}: {
  row: any;
  idx: number;
  onGenerateInsight?: (row: any) => void;
  snapshotTime: string;
  snapshotWaveNumber: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const chartData = useMemo(() => [
    { time: '11:00', value: row.base },
    { time: '11:30', value: row.wave1 },
    { time: '15:30', value: row.wave2 },
    { time: '18:06', value: row.current },
    { time: snapshotTime, value: row.final },
  ], [row.base, row.wave1, row.wave2, row.current, row.final, snapshotTime]);

  // Simplified animations on mobile
  const animationProps = isMobile || prefersReducedMotion
    ? { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { delay: idx * 0.03 } };

  return (
    <>
      <motion.tr
        {...animationProps}
        viewport={{ once: true }}
        className="border-b border-white/10 hover:bg-white/5 transition-colors relative cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        <td className="py-4 px-4 sticky left-0 z-10 bg-black group-hover:bg-white/5">
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
              aria-label="Открыть график роста"
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
                aria-label="Сгенерировать инсайты по каналу"
              >
                <Sparkles className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </td>
        <td className="py-4 px-4 text-right text-white/60 tabular-nums">{fmtInt(row.base)}</td>
        <td className="py-4 px-4 text-right text-white/60 tabular-nums">{fmtInt(row.wave1)}</td>
        <td className="py-4 px-4 text-right text-white/60 tabular-nums">{fmtInt(row.wave2)}</td>
        <td className="py-4 px-4 text-right text-white/60 tabular-nums">{fmtInt(row.current)}</td>
        <td className="py-4 px-4 text-right text-white/60 tabular-nums">{fmtInt(row.final)}</td>
        <td className="py-4 px-4 text-right tabular-nums">{fmtSignedInt(row.growth1)}</td>
        <td className="py-4 px-4 text-right tabular-nums">{fmtSignedInt(row.growth2)}</td>
        <td className="py-4 px-4 text-right tabular-nums">{fmtSignedInt(row.growth3)}</td>
        <td className="py-4 px-4 text-right font-medium text-green-500 tabular-nums">{fmtSignedInt(row.total)}</td>
      </motion.tr>
      
      <AnimatePresence>
        {isOpen && (
          <ChartModal 
            data={chartData} 
            channel={row.channel} 
            onClose={() => setIsOpen(false)} 
            snapshotWaveNumber={snapshotWaveNumber}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default function App() {
  const heroRef = useRef(null);
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [insightModalRow, setInsightModalRow] = useState<{ channel: string; base: number; wave1: number; wave2: number; current: number; final: number; growth1: number; growth2: number; growth3: number; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tableQuery, setTableQuery] = useState('');
  const [tableType, setTableType] = useState<'all' | 'beneficiary' | 'stable' | 'donor'>('all');
  const [tableSort, setTableSort] = useState<{ key: TableSortKey; dir: TableSortDir }>({ key: 'total', dir: 'desc' });
  const [snapshotOverride, setSnapshotOverride] = useState<SnapshotOverride | null>(null);
  const [snapshotUploading, setSnapshotUploading] = useState(false);
  const [snapshotUploadError, setSnapshotUploadError] = useState<string | null>(null);
  
  // Track window resize for responsive charts
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load snapshot override from localStorage (persists across reloads)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('careerHubSnapshotOverrideV1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as SnapshotOverride;
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.members &&
        typeof parsed.members === 'object' &&
        typeof parsed.datetime === 'string' &&
        typeof parsed.label === 'string' &&
        typeof parsed.time === 'string' &&
        typeof parsed.waveNumber === 'number'
      ) {
        setSnapshotOverride(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist snapshot override
  useEffect(() => {
    try {
      if (!snapshotOverride) {
        localStorage.removeItem('careerHubSnapshotOverrideV1');
      } else {
        localStorage.setItem('careerHubSnapshotOverrideV1', JSON.stringify(snapshotOverride));
      }
    } catch {
      // ignore
    }
  }, [snapshotOverride]);

  // Back-to-top button visibility
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 900);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => window.removeEventListener('scroll', onScroll as any);
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

  const { scrollYProgress: pageScrollYProgress } = useScroll();

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);
  const progressWidth = useTransform(pageScrollYProgress, [0, 1], ['0%', '100%']);

  const snapshotLabel = snapshotOverride?.label ?? SNAPSHOT_LABEL;
  const snapshotTime = snapshotOverride?.time ?? SNAPSHOT_TIME;
  const snapshotDatetime = snapshotOverride?.datetime ?? SNAPSHOT_DATETIME;
  const snapshotWaveNumber = snapshotOverride?.waveNumber ?? SNAPSHOT_WAVE_NUMBER;

  /** Финал и прирост: из загруженного скриншота или из src/data/snapshot.ts. */
  const activeSnapshot = snapshotOverride?.members ?? snapshotMembers;
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
    [`Волна ${snapshotWaveNumber}`]: d.growth3,
    'Итого': d.total,
  })), [channelData, snapshotWaveNumber]);

  /** Средний прирост по каналам (округлённо). */
  const averageGrowth = useMemo(() => {
    if (!channelData.length) return 0;
    const sum = channelData.reduce((s, r) => s + r.total, 0);
    return Math.round(sum / channelData.length);
  }, [channelData]);

  /** Длительность наблюдения: от начала отчёта до снапшота (например "7ч" или "1д 13ч"). */
  const observationLabel = useMemo(() => {
    const start = new Date(REPORT_START_DATETIME).getTime();
    const end = new Date(snapshotDatetime).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const h = Math.round(hours % 24);
      return h > 0 ? `${days}д ${h}ч` : `${days}д`;
    }
    return `${Math.round(hours)}ч`;
  }, [snapshotDatetime]);

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

  /** Суммарная кривая роста папки по волнам с учётом пересечений аудитории (stacked по типам). */
  const folderWaveTimeline = useMemo(() => {
    if (!channelData.length) {
      return {
        points: [] as {
          id: string;
          label: string;
          title: string;
          beneficiary: number;
          stable: number;
          donor: number;
          total: number;
          beneficiaryDelta: number;
          stableDelta: number;
          donorDelta: number;
          totalDelta: number;
        }[],
        totalGrowth: 0,
        wave1Growth: 0,
        wave2Growth: 0,
        wave3Growth: 0,
        tailGrowth: 0,
        beneficiaryTotalGrowth: 0,
        stableTotalGrowth: 0,
        donorTotalGrowth: 0,
      };
    }

    const sumByType = (
      type: 'beneficiary' | 'donor' | 'stable',
      selector: (row: (typeof channelData)[number]) => number
    ) => {
      return channelData
        .filter((r) => r.type === type)
        .reduce((acc, row) => acc + selector(row), 0);
    };

    const getValue = (row: (typeof channelData)[number], stage: 'base' | 'wave1' | 'wave2' | 'current' | 'final') => {
      switch (stage) {
        case 'base':
          return row.base ?? 0;
        case 'wave1':
          return row.wave1 ?? row.base ?? 0;
        case 'wave2':
          return row.wave2 ?? row.wave1 ?? row.base ?? 0;
        case 'current':
          return row.current ?? row.wave2 ?? row.wave1 ?? row.base ?? 0;
        case 'final':
          return row.final ?? row.current ?? row.wave2 ?? row.wave1 ?? row.base ?? 0;
        default:
          return 0;
      }
    };

    const baseBene = sumByType('beneficiary', (r) => getValue(r, 'base'));
    const baseStable = sumByType('stable', (r) => getValue(r, 'base'));
    const baseDonor = sumByType('donor', (r) => getValue(r, 'base'));

    const t1Bene = sumByType('beneficiary', (r) => getValue(r, 'wave1'));
    const t1Stable = sumByType('stable', (r) => getValue(r, 'wave1'));
    const t1Donor = sumByType('donor', (r) => getValue(r, 'wave1'));

    const t2Bene = sumByType('beneficiary', (r) => getValue(r, 'wave2'));
    const t2Stable = sumByType('stable', (r) => getValue(r, 'wave2'));
    const t2Donor = sumByType('donor', (r) => getValue(r, 'wave2'));

    const t3Bene = sumByType('beneficiary', (r) => getValue(r, 'current'));
    const t3Stable = sumByType('stable', (r) => getValue(r, 'current'));
    const t3Donor = sumByType('donor', (r) => getValue(r, 'current'));

    const t4Bene = sumByType('beneficiary', (r) => getValue(r, 'final'));
    const t4Stable = sumByType('stable', (r) => getValue(r, 'final'));
    const t4Donor = sumByType('donor', (r) => getValue(r, 'final'));

    const points = [
      {
        id: 'T0',
        label: '11:00',
        title: 'Старт (11:00)',
        beneficiary: baseBene,
        stable: baseStable,
        donor: baseDonor,
        total: baseBene + baseStable + baseDonor,
        beneficiaryDelta: 0,
        stableDelta: 0,
        donorDelta: 0,
        totalDelta: 0,
      },
      {
        id: 'T1',
        label: '11:30',
        title: 'Волна 1 (11:00→11:30)',
        beneficiary: t1Bene,
        stable: t1Stable,
        donor: t1Donor,
        total: t1Bene + t1Stable + t1Donor,
        beneficiaryDelta: t1Bene - baseBene,
        stableDelta: t1Stable - baseStable,
        donorDelta: t1Donor - baseDonor,
        totalDelta: t1Bene + t1Stable + t1Donor - (baseBene + baseStable + baseDonor),
      },
      {
        id: 'T2',
        label: '15:30',
        title: 'Волна 2 (11:30→15:30)',
        beneficiary: t2Bene,
        stable: t2Stable,
        donor: t2Donor,
        total: t2Bene + t2Stable + t2Donor,
        beneficiaryDelta: t2Bene - t1Bene,
        stableDelta: t2Stable - t1Stable,
        donorDelta: t2Donor - t1Donor,
        totalDelta: t2Bene + t2Stable + t2Donor - (t1Bene + t1Stable + t1Donor),
      },
      {
        id: 'T3',
        label: '18:06',
        title: 'Срез перед хвостом (15:30→18:06)',
        beneficiary: t3Bene,
        stable: t3Stable,
        donor: t3Donor,
        total: t3Bene + t3Stable + t3Donor,
        beneficiaryDelta: t3Bene - t2Bene,
        stableDelta: t3Stable - t2Stable,
        donorDelta: t3Donor - t2Donor,
        totalDelta: t3Bene + t3Stable + t3Donor - (t2Bene + t2Stable + t2Donor),
      },
      {
        id: 'T4',
        label: snapshotTime,
        title: `Снапшот (${snapshotTime})`,
        beneficiary: t4Bene,
        stable: t4Stable,
        donor: t4Donor,
        total: t4Bene + t4Stable + t4Donor,
        beneficiaryDelta: t4Bene - t3Bene,
        stableDelta: t4Stable - t3Stable,
        donorDelta: t4Donor - t3Donor,
        totalDelta: t4Bene + t4Stable + t4Donor - (t3Bene + t3Stable + t3Donor),
      },
    ];

    const beneficiaryTotalGrowth = t4Bene - baseBene;
    const stableTotalGrowth = t4Stable - baseStable;
    const donorTotalGrowth = t4Donor - baseDonor;
    const totalGrowth = beneficiaryTotalGrowth + stableTotalGrowth + donorTotalGrowth;

    const wave1Growth = points[1].totalDelta;
    const wave2Growth = points[2].totalDelta;
    const wave3Growth = points[3].totalDelta;
    const tailGrowth = points[4].totalDelta;

    return {
      points,
      totalGrowth,
      wave1Growth,
      wave2Growth,
      wave3Growth,
      tailGrowth,
      beneficiaryTotalGrowth,
      stableTotalGrowth,
      donorTotalGrowth,
    };
  }, [channelData, snapshotTime]);

  const tableDataView = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const filtered = channelData.filter((r) => {
      const matchType = tableType === 'all' ? true : r.type === tableType;
      const matchQuery = !q ? true : String(r.channel || '').toLowerCase().includes(q);
      return matchType && matchQuery;
    });

    const key = tableSort.key;
    const dirMul = tableSort.dir === 'asc' ? 1 : -1;

    const getVal = (r: any): string | number => {
      if (key === 'channel') return String(r.channel || '');
      return Number(r[key] ?? 0);
    };

    const sorted = [...filtered].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv), 'ru') * dirMul;
      }
      return (Number(av) - Number(bv)) * dirMul;
    });

    return sorted;
  }, [channelData, tableQuery, tableType, tableSort]);

  const toggleTableSort = (key: TableSortKey) => {
    setTableSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
      return { key, dir: key === 'channel' ? 'asc' : 'desc' };
    });
  };

  const sortMark = (key: TableSortKey) => (tableSort.key === key ? (tableSort.dir === 'desc' ? '↓' : '↑') : '');

  /** Категории для волны 1 (growth1): термин, определение, строка каналов. */
  const wave1Categories = useMemo(() => {
    const sorted = [...channelData].sort((a, b) => b.growth1 - a.growth1);
    if (sorted.length === 0) return [];
    const maxG = sorted[0].growth1;
    const top = sorted.filter((r) => r.growth1 === maxG);
    const strong = sorted.filter((r) => r.growth1 < maxG && r.growth1 >= Math.max(maxG - 6, 0));
    const bottom3 = sorted.slice(-3);
    const fmt = (arr: typeof sorted) => arr.map((r) => `${r.channel} (${fmtSignedInt(r.growth1)})`).join(', ');
    const categories: { term: string; definition: string; line: string }[] = [];
    if (top.length) {
      categories.push({
        term: 'Максимальный импульс',
        definition: 'Максимальный прирост в первые 30 минут (11:00→11:30). Показатель лучшей конверсии “витрины” папки в раннем окне.',
        line: fmt(top),
      });
    }
    if (strong.length) {
      categories.push({
        term: 'Сильный старт',
        definition: 'Прирост близок к максимуму в раннем окне. Обычно означает быстрый захват внимания или удачное попадание в интерес аудитории.',
        line: fmt(strong),
      });
    }
    if (bottom3.length) {
      categories.push({
        term: 'Поздний/слабый старт',
        definition: 'Низкий прирост в первые 30 минут. Сам рост может быть перенесён во 2-ю волну или в хвост (позже в течение дня).',
        line: fmt(bottom3),
      });
    }
    return categories;
  }, [channelData]);

  /** Категории для волны 2 (growth2): термин, определение, строка каналов. */
  const wave2Categories = useMemo(() => {
    const sorted = [...channelData].sort((a, b) => b.growth2 - a.growth2);
    if (sorted.length === 0) return [];
    const maxG = sorted[0].growth2;
    const top = sorted.filter((r) => r.growth2 === maxG);
    const strong = sorted.filter((r) => r.growth2 < maxG && r.growth2 >= Math.max(maxG - 8, 0));
    const mid = sorted.slice(Math.max(0, Math.floor(sorted.length / 2) - 2), Math.min(sorted.length, Math.floor(sorted.length / 2) + 2));
    const fmt = (arr: typeof sorted) => arr.map((r) => `${r.channel} (${fmtSignedInt(r.growth2)})`).join(', ');
    const categories: { term: string; definition: string; line: string }[] = [];
    if (top.length) {
      categories.push({
        term: 'Абсолютный лидер',
        definition: 'Максимальный прирост во 2-й волне (11:30→15:30).',
        line: fmt(top),
      });
    }
    if (strong.length) {
      categories.push({
        term: 'Сильный рост',
        definition: 'Прирост заметно выше среднего во 2-й волне. Часто выглядит как “догоняющая” динамика после старта или сильный дневной импульс.',
        line: fmt(strong),
      });
    }
    if (mid.length) {
      categories.push({
        term: 'Стабильная группа',
        definition: 'Средняя зона по росту во 2-й волне — без экстремумов, но с понятной динамикой.',
        line: fmt(mid),
      });
    }
    return categories;
  }, [channelData]);

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

  const autoConclusion = useMemo(() => {
    const top = [...channelData].sort((a, b) => b.total - a.total).slice(0, 3);
    const donors = channelData.filter((r) => r.type === 'donor').map((r) => r.channel);
    const bene = channelData.filter((r) => r.type === 'beneficiary').map((r) => r.channel);
    const topLine = top.map((r) => `${r.channel} (${fmtSignedInt(r.total)})`).join(', ');
    const donorsLine = donors.slice(0, 4).join(', ') + (donors.length > 4 ? ` (+${donors.length - 4})` : '');
    const beneLine = bene.slice(0, 4).join(', ') + (bene.length > 4 ? ` (+${bene.length - 4})` : '');

    const intro = folderFadeSignals.isFading
      ? `По данным снапшота (${snapshotLabel}) эффект папки уже в основном исчерпан: поздний рост (“хвост”) стал маленьким, а дальнейшая динамика чаще объясняется инерцией и собственным постингом.`
      : `По данным снапшота (${snapshotLabel}) эффект папки ещё заметен: часть прироста продолжает распределяться между каналами, но уже не доминирует во всех случаях.`;

    const bullets = [
      `Топ по итогу: ${topLine}. Средний прирост по каналам: ${fmtSignedInt(averageGrowth)}.`,
      `Поздний прирост (“хвост”, волна ${snapshotWaveNumber}: 15:30 → ${snapshotTime}) у “типичного” канала — медианная доля ${fmtPct(folderFadeSignals.tailShareMedian, 1)}; сумма хвоста: ${fmtSignedInt(folderFadeSignals.tailSum)}.`,
      `Роли в экосистеме сохраняются: доноры (${donorsLine}) быстрее “насыщаются”, а бенефициары (${beneLine}) чаще добирают новую аудиторию.`,
    ];

    const closing = `Вывод: папка работает как механизм перераспределения внимания между каналами (особенно между ядром и периферией), но устойчивый рост после первичного импульса зависит от собственной активности каналов.`;

    return { intro, bullets, closing };
  }, [
    channelData,
    snapshotLabel,
    snapshotTime,
    snapshotWaveNumber,
    folderFadeSignals.isFading,
    folderFadeSignals.tailShareMedian,
    folderFadeSignals.tailSum,
    averageGrowth,
  ]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openSnapshotPicker = () => {
    snapshotFileInputRef.current?.click();
  };

  const resetSnapshotToDefault = () => {
    setSnapshotUploadError(null);
    setSnapshotOverride(null);
    if (snapshotFileInputRef.current) snapshotFileInputRef.current.value = '';
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });

  const formatSnapshotLabel = (d: Date) => {
    const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const handleSnapshotFile = async (file: File) => {
    setSnapshotUploadError(null);
    setSnapshotUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch('/api/parse-snapshot-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          throw new Error(j.error || res.statusText);
        } catch {
          throw new Error(text || res.statusText || 'Ошибка при разборе скриншота');
        }
      }
      const data = text ? JSON.parse(text) : {};
      const members = data?.members;
      if (!members || typeof members !== 'object') {
        throw new Error('Пустой или некорректный ответ: members не найден');
      }

      const now = new Date();
      const nextWave = (snapshotOverride?.waveNumber ?? SNAPSHOT_WAVE_NUMBER) + 1;
      const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      setSnapshotOverride({
        members,
        datetime: now.toISOString(),
        time,
        label: formatSnapshotLabel(now),
        waveNumber: nextWave,
      });
    } catch (e: any) {
      setSnapshotUploadError(e?.message || 'Ошибка при загрузке скриншота');
    } finally {
      setSnapshotUploading(false);
    }
  };

  const onSnapshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void handleSnapshotFile(file);
  };

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 200}>
      <PerformanceOptimizer />
      <PerformanceMonitor />
      
      {/* Loading Screen */}
      {isLoading && <LoadingScreen />}
      
      <div id="top" className={`min-h-screen bg-black text-white transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* Skip link for keyboard users */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[999] focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Перейти к отчёту
        </a>

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
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 gap-3">
            <h1 className="text-base md:text-xl tracking-[0.2em] font-light">
              CAREER HUB
            </h1>
            <nav className="hidden lg:flex items-center gap-3 text-xs text-white/60 overflow-x-auto max-w-[55vw]">
              <a href="#data" className="hover:text-white transition-colors whitespace-nowrap">Лидеры</a>
              <a href="#waves" className="hover:text-white transition-colors whitespace-nowrap">Волны</a>
              <a href="#charts" className="hover:text-white transition-colors whitespace-nowrap">Графики</a>
              <a href="#insights" className="hover:text-white transition-colors whitespace-nowrap">Инсайты</a>
              <a href="#fading" className="hover:text-white transition-colors whitespace-nowrap">Эффект папки</a>
              <a href="#table" className="hover:text-white transition-colors whitespace-nowrap">Таблица</a>
              <a href="#glossary" className="hover:text-white transition-colors whitespace-nowrap">Глоссарий</a>
              <a href="#conclusion" className="hover:text-white transition-colors whitespace-nowrap">Вывод</a>
            </nav>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
              <input
                ref={snapshotFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onSnapshotFileChange}
              />

              <div className="hidden md:flex items-center gap-2 text-xs text-white/40">
                <span className="whitespace-nowrap">Снапшот:</span>
                <span className="text-white/60 whitespace-nowrap">{snapshotLabel}</span>
                {snapshotOverride && (
                  <span className="text-amber-300/80 whitespace-nowrap">(из скрина)</span>
                )}
              </div>

              <motion.button
                type="button"
                onClick={openSnapshotPicker}
                whileHover={!isMobile ? { scale: 1.04 } : undefined}
                whileTap={{ scale: 0.98 }}
                disabled={snapshotUploading}
                className="border border-white/25 px-3 md:px-4 py-1 text-xs md:text-sm rounded-full hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Загрузить новый скрин «Добавить папку» и пересчитать отчёт"
              >
                {snapshotUploading ? 'Разбор…' : 'Обновить по скрину'}
              </motion.button>

              {snapshotOverride && (
                <button
                  type="button"
                  onClick={resetSnapshotToDefault}
                  className="text-xs md:text-sm text-white/50 hover:text-white/70 transition-colors px-2"
                  title="Вернуться к данным из snapshot.ts"
                >
                  Сбросить
                </button>
              )}

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
          <div className="h-px bg-white/10">
            <motion.div className="h-px bg-white/40" style={{ width: progressWidth }} />
          </div>
        </motion.header>

        <main id="content">
        {/* Hero Section */}
        <section ref={heroRef} className="min-h-screen flex flex-col border-b border-white/20 pt-16 md:pt-20 relative overflow-hidden scroll-mt-28">
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
                Период наблюдения: {REPORT_START_LABEL} → {snapshotLabel}
              </p>
              <p className="text-xs md:text-sm text-white/50 mt-2">
                Контрольные точки: 11:00 → 11:30 → 15:30 → 18:06 → {snapshotTime}
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
                <div className="text-xl md:text-3xl mb-2">Листайте вниз</div>
                <motion.div 
                  className="text-2xl md:text-4xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: (isMobile || prefersReducedMotion) ? 0 : 3, duration: 1.2, ease: "easeInOut" }}
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
              <div className="text-6xl md:text-8xl font-light mb-4">+{fmtInt(averageGrowth)}</div>
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
        <section className="border-b border-white/20 scroll-mt-28" id="data">
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
                    +{fmtInt(channel.total)}
                  </motion.div>
                  <div className="space-y-2 text-sm text-white/60">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>База</span>
                      <span className="text-white">{fmtInt(channel.base)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-2">
                      <span>Сейчас</span>
                      <span className="text-white">{fmtInt(channel.final)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Wave Analysis */}
        <section className="border-b border-white/20 scroll-mt-28" id="waves">
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
                  {wave1Categories.map((cat) => (
                    <div key={cat.term}>
                      <TermWithTooltip term={cat.term} definition={cat.definition} />
                      <div className="text-xl">{cat.line}</div>
                    </div>
                  ))}
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
                  {wave2Categories.map((cat) => (
                    <div key={cat.term}>
                      <TermWithTooltip term={cat.term} definition={cat.definition} />
                      <div className="text-xl">{cat.line}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="p-6 md:p-12 lg:p-20 bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ВОЛНА {snapshotWaveNumber}</h3>
                <p className="text-white/60 mb-6">15:30 → {snapshotTime}</p>
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
        <section className="border-b border-white/20 scroll-mt-28" id="charts">
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
        <section className="border-b border-white/20 scroll-mt-28" id="insights">
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
                  У каналов-доноров ({insightData.donors.map((d) => d.channel).join(', ')}) в волне {snapshotWaveNumber} прирост небольшой: {insightData.donorWave3Sample}.
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
                  Итоговый рост с {REPORT_START_LABEL} до {snapshotLabel} — кто сильнее всего добирал новую аудиторию:
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
                  <li>Ядро упирается в потолок быстрее: у доноров в волне {snapshotWaveNumber} прирост всего {insightData.donorWave3Sample}</li>
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
                  «Донорский» эффект проявляется как перераспределение роста: у доноров малый прирост по волне {snapshotWaveNumber}, у других — до +{Math.max(...channelData.map((r) => r.growth3 ?? 0))} в том же срезе.
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
                  <li>Диапазоны: волна 2 {insightData.wave2Range}, волна {snapshotWaveNumber} {insightData.wave3Range}</li>
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
                  В волне {snapshotWaveNumber} (15:30 → {snapshotTime}) максимальный прирост получили:
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
        <section className="border-b border-white/20 scroll-mt-28" id="fading">
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

            {/* Aggregated growth curve for the whole folder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mb-10 border border-white/20 p-4 md:p-8 bg-gradient-to-br from-white/[0.02] to-transparent rounded-lg"
            >
              <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h4 className="text-xl md:text-2xl font-light mb-2">Общая кривая роста папки с учётом пересечений</h4>
                  <p className="text-sm text-white/60 max-w-2xl">
                    Суммарные подписчики по типам каналов в ключевые моменты дня. Цвета показывают, кто получает рост:
                    зелёный — бенефициары (низкий overlap), белый — стабильные, красный — доноры (высокий overlap).
                  </p>
                </div>
                <div className="text-xs text-white/50 space-y-1">
                  <div>
                    <span className="text-white/70">Итого рост:</span>{' '}
                    <span className="text-white/90 font-medium">+{folderWaveTimeline.totalGrowth.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-green-500/60"></div>
                    <span className="text-white/50">Бенефициары:</span>{' '}
                    <span className="text-white/80">+{folderWaveTimeline.beneficiaryTotalGrowth.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-white/40"></div>
                    <span className="text-white/50">Стабильные:</span>{' '}
                    <span className="text-white/80">+{folderWaveTimeline.stableTotalGrowth.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-red-500/60"></div>
                    <span className="text-white/50">Доноры:</span>{' '}
                    <span className="text-white/80">+{folderWaveTimeline.donorTotalGrowth.toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <div className="min-w-[320px]">
                  <ResponsiveContainer width="100%" height={isSmallMobile ? 260 : isMobile ? 320 : 360}>
                    <AreaChart
                      data={folderWaveTimeline.points}
                      margin={{
                        top: 20,
                        right: isMobile ? 10 : 40,
                        left: isMobile ? 40 : 60,
                        bottom: isMobile ? 40 : 50,
                      }}
                    >
                      <defs>
                        <linearGradient id="folderCurveBene" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                        </linearGradient>
                        <linearGradient id="folderCurveStable" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0.15} />
                        </linearGradient>
                        <linearGradient id="folderCurveDonor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.08)"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="rgba(255,255,255,0.4)"
                        style={{ fontSize: isMobile ? '10px' : '12px' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.4)"
                        style={{ fontSize: isMobile ? '10px' : '12px' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.toLocaleString('ru-RU')}
                      />
                      <Tooltip
                        cursor={{ stroke: '#666', strokeWidth: 1 }}
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #444',
                          borderRadius: 8,
                          color: '#fff',
                          fontSize: 13,
                        }}
                        formatter={(value: number, name: string) => {
                          const label =
                            name === 'beneficiary'
                              ? 'Бенефициары'
                              : name === 'stable'
                                ? 'Стабильные'
                                : name === 'donor'
                                  ? 'Доноры'
                                  : 'Всего';
                          return [`${value.toLocaleString('ru-RU')} подписчиков`, label];
                        }}
                        labelFormatter={(label, payload) => {
                          if (!payload || !payload.length) return label;
                          const p = payload[0]?.payload as {
                            title: string;
                            beneficiaryDelta: number;
                            stableDelta: number;
                            donorDelta: number;
                            totalDelta: number;
                          } | undefined;
                          if (!p) return label;
                          if (p.totalDelta === 0) return 'Стартовое значение (до прироста)';
                          return (
                            <div>
                              <div className="font-medium mb-1">{p.title}</div>
                              <div className="text-xs space-y-0.5">
                                {p.beneficiaryDelta > 0 && (
                                  <div className="text-green-400">
                                    Бенефициары: +{p.beneficiaryDelta.toLocaleString('ru-RU')}
                                  </div>
                                )}
                                {p.stableDelta > 0 && (
                                  <div className="text-white/70">
                                    Стабильные: +{p.stableDelta.toLocaleString('ru-RU')}
                                  </div>
                                )}
                                {p.donorDelta > 0 && (
                                  <div className="text-red-400">Доноры: +{p.donorDelta.toLocaleString('ru-RU')}</div>
                                )}
                                <div className="text-white/90 pt-1 border-t border-white/10 mt-1">
                                  Всего: +{p.totalDelta.toLocaleString('ru-RU')}
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {/* Stacked areas: donor (bottom), stable (middle), beneficiary (top) */}
                      <Area
                        type="monotone"
                        dataKey="donor"
                        stackId="1"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#folderCurveDonor)"
                        isAnimationActive={!prefersReducedMotion}
                        animationDuration={isMobile ? 300 : 800}
                      />
                      <Area
                        type="monotone"
                        dataKey="stable"
                        stackId="1"
                        stroke="#ffffff"
                        strokeWidth={2}
                        fill="url(#folderCurveStable)"
                        isAnimationActive={!prefersReducedMotion}
                        animationDuration={isMobile ? 300 : 800}
                      />
                      <Area
                        type="monotone"
                        dataKey="beneficiary"
                        stackId="1"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#folderCurveBene)"
                        dot={{ fill: '#10b981', r: 4, strokeWidth: 1.5, stroke: '#000' }}
                        activeDot={{ r: 6, fill: '#10b981' }}
                        isAnimationActive={!prefersReducedMotion}
                        animationDuration={isMobile ? 300 : 800}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black items-stretch">
              <InsightCard
                idx={0}
                icon={PackageOpen}
                meta="Доля хвоста"
                title="ХВОСТ СТАЛ МАЛЕНЬКИМ"
              >
                <p className="text-sm text-white/70 mb-3">
                  Медианная доля хвоста (волна {snapshotWaveNumber}: 15:30 → {snapshotTime}) в общем росте —{' '}
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
        <section className="border-b border-white/20 scroll-mt-28" id="table">
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
              className="text-white/60 mb-8 text-sm flex items-center gap-2"
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: prefersReducedMotion ? 0 : 6, duration: 2, ease: "easeInOut" }}
                className="inline-block w-2 h-2 bg-white/60 rounded-full"
              />
              Кликните на строку или иконку <TrendingUp className="w-4 h-4 inline" />, чтобы увидеть график роста канала
            </motion.p>

            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Поиск по каналу</span>
                  <input
                    value={tableQuery}
                    onChange={(e) => setTableQuery(e.target.value)}
                    placeholder="например: @visuaaaals"
                    className="w-full sm:w-72 bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Тип</span>
                  <select
                    value={tableType}
                    onChange={(e) => setTableType(e.target.value as any)}
                    className="w-full sm:w-48 bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-white/30"
                  >
                    <option value="all">Все</option>
                    <option value="beneficiary">Бенефициары</option>
                    <option value="stable">Стабильные</option>
                    <option value="donor">Доноры</option>
                  </select>
                </label>
              </div>

              <div className="text-xs text-white/50">
                Показано: <span className="text-white/70">{tableDataView.length}</span> / {channelData.length}. Сортировка: клик по заголовку колонки.
              </div>
            </div>

            {snapshotUploadError && (
              <div className="mb-6 text-sm text-amber-300/90 border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3">
                {snapshotUploadError}
                <div className="text-xs text-white/50 mt-2">
                  Нужен запущенный <code className="text-white/70">npm run dev</code> и переменная <code className="text-white/70">OPENAI_API_KEY</code> в <code className="text-white/70">.env</code>.
                </div>
              </div>
            )}

            <div className="overflow-x-auto relative">
              <table className="w-full text-sm border-collapse relative min-w-[980px]">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 font-light text-base bg-black/95 backdrop-blur border-b border-white/20">
                      <button
                        type="button"
                        onClick={() => toggleTableSort('channel')}
                        className="hover:text-white transition-colors flex items-center gap-2"
                      >
                        <span>Канал</span>
                        <span className="text-white/40 text-xs">{sortMark('channel')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('base')} className="hover:text-white transition-colors w-full text-right">
                        11:00 <span className="text-white/40 text-xs ml-1">{sortMark('base')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('wave1')} className="hover:text-white transition-colors w-full text-right">
                        11:30 <span className="text-white/40 text-xs ml-1">{sortMark('wave1')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('wave2')} className="hover:text-white transition-colors w-full text-right">
                        15:30 <span className="text-white/40 text-xs ml-1">{sortMark('wave2')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light sticky z-20 bg-black/95 backdrop-blur border-b border-white/20" style={{ top: 0 }}>
                      <button type="button" onClick={() => toggleTableSort('current')} className="hover:text-white transition-colors w-full text-right">
                        18:06 <span className="text-white/40 text-xs ml-1">{sortMark('current')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20" title={snapshotLabel}>
                      <button type="button" onClick={() => toggleTableSort('final')} className="hover:text-white transition-colors w-full text-right">
                        Срез ({snapshotTime}) <span className="text-white/40 text-xs ml-1">{sortMark('final')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('growth1')} className="hover:text-white transition-colors w-full text-right">
                        Волна 1 <span className="text-white/40 text-xs ml-1">{sortMark('growth1')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('growth2')} className="hover:text-white transition-colors w-full text-right">
                        Волна 2 <span className="text-white/40 text-xs ml-1">{sortMark('growth2')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('growth3')} className="hover:text-white transition-colors w-full text-right">
                        Волна {snapshotWaveNumber} <span className="text-white/40 text-xs ml-1">{sortMark('growth3')}</span>
                      </button>
                    </th>
                    <th className="text-right py-3 px-4 font-light bg-black/95 backdrop-blur border-b border-white/20">
                      <button type="button" onClick={() => toggleTableSort('total')} className="hover:text-white transition-colors w-full text-right">
                        Итого <span className="text-white/40 text-xs ml-1">{sortMark('total')}</span>
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableDataView.map((row, idx) => (
                    <TableRow
                      key={row.channel}
                      row={row}
                      idx={idx}
                      onGenerateInsight={(r) => setInsightModalRow(r)}
                      snapshotTime={snapshotTime}
                      snapshotWaveNumber={snapshotWaveNumber}
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
              promptText={buildChannelInsightPrompt(insightModalRow, channelData, snapshotLabel)}
              onClose={() => setInsightModalRow(null)}
            />
          )}
        </AnimatePresence>

        {/* Glossary */}
        <section className="border-b border-white/20 scroll-mt-28" id="glossary">
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
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Волна {snapshotWaveNumber}</div>
                <p className="text-white/80">
                  Срез данных: период с 15:30 до момента снапшота ({snapshotLabel}). Новый скрин можно загрузить прямо в интерфейсе отчёта — данные и вычисляемые блоки пересчитаются автоматически.
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
                  Прирост +45–48 подписчиков в первой волне. Хорошая начальная динамика с быстрой активацией аудитории.
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
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Доноры экосистемы</div>
                <p className="text-white/80">
                  Каналы с большой устоявшейся аудиторией, которые делятся трафиком с другими каналами папки больше, чем получают сами.
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
        <section className="border-b border-white/20 scroll-mt-28" id="conclusion">
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
                    {(snapshotOverride ? autoConclusion : CONCLUSION).intro}
                  </p>
                  <div className="space-y-4 text-lg md:text-xl text-white/80">
                    {(snapshotOverride ? autoConclusion : CONCLUSION).bullets.map((bullet, i) => (
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
                      {(snapshotOverride ? autoConclusion : CONCLUSION).closing}
                    </p>
                    {snapshotOverride ? (
                      <p className="text-white/40 text-xs mt-3">
                        Вывод сформирован автоматически по загруженному скриншоту (без OpenAI). Чтобы обновить AI-версию в коде: <code className="text-white/60">npm run generate-conclusion</code>
                      </p>
                    ) : CONCLUSION_GENERATED_AT && (
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
                Период отчёта: {REPORT_START_LABEL} – {snapshotLabel}
              </div>
              <div className="text-white/60">
                Текущая дата: {new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-white/50 text-sm mt-2">
                Данные актуализированы: {snapshotLabel}
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
        </main>

        {/* Back to top */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              whileHover={!isMobile ? { scale: 1.05 } : undefined}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-6 left-6 z-[60] border border-white/20 bg-black/70 backdrop-blur px-3 py-2 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              ↑ Наверх
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
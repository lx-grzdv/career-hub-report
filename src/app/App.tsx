import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell } from 'recharts';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { HelpCircle, TrendingUp } from 'lucide-react';
import { useRef, useState, useEffect, memo, useMemo } from 'react';
import { PerformanceOptimizer } from './components/PerformanceOptimizer';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { LazySection } from './components/LazySection';
import { LoadingScreen } from './components/LoadingScreen';

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
                  {i === 3 && 'Волна 3'}
                  {i === 4 && 'Финал'}
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
                data={channelData.map(d => ({
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
                  {channelData.map((entry, index) => (
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
                data={channelData.map(d => ({
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
                  {channelData.map((entry, index) => (
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

const TableRow = memo(({ row, idx }: { row: any; idx: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const chartData = useMemo(() => [
    { time: '11:00', value: row.base },
    { time: '11:30', value: row.wave1 },
    { time: '15:30', value: row.wave2 },
    { time: '18:06', value: row.current },
    { time: '18:50', value: row.final },
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
            >
              <TrendingUp className="w-4 h-4" />
            </motion.button>
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

  const channelData = [
    { channel: '@visuaaaals', base: 580, wave1: 596, wave2: 672, current: 673, final: 681, growth1: 16, growth2: 76, growth3: 8, total: 101, type: 'beneficiary' },
    { channel: '@tooltipp', base: 342, wave1: 392, wave2: 429, current: 433, final: 440, growth1: 50, growth2: 37, growth3: 7, total: 98, type: 'beneficiary' },
    { channel: '@nix_ux_view', base: 473, wave1: 523, wave2: 557, current: 562, final: 569, growth1: 50, growth2: 34, growth3: 7, total: 96, type: 'beneficiary' },
    { channel: '@DesignDictatorship', base: 734, wave1: 782, wave2: 815, current: 823, final: 825, growth1: 48, growth2: 33, growth3: 2, total: 91, type: 'donor' },
    { channel: '@prodtomorrow', base: 520, wave1: 568, wave2: 598, current: 605, final: 609, growth1: 48, growth2: 30, growth3: 4, total: 89, type: 'stable' },
    { channel: '@sshultse', base: 566, wave1: 604, wave2: 638, current: 648, final: 653, growth1: 38, growth2: 34, growth3: 5, total: 87, type: 'stable' },
    { channel: '@lx_grzdv_links', base: 650, wave1: 694, wave2: 730, current: 732, final: 737, growth1: 44, growth2: 36, growth3: 5, total: 87, type: 'stable' },
    { channel: '@kuntsevich_design', base: 828, wave1: 870, wave2: 891, current: 903, final: 911, growth1: 42, growth2: 21, growth3: 8, total: 83, type: 'donor' },
    { channel: '@pxPerson_produced', base: 366, wave1: 401, wave2: 435, current: 435, final: 445, growth1: 35, growth2: 34, growth3: 10, total: 79, type: 'stable' },
    { channel: '@yuliapohilko', base: 510, wave1: 521, wave2: 569, current: 585, final: 589, growth1: 11, growth2: 48, growth3: 4, total: 79, type: 'beneficiary' },
    { channel: '@dsgn_thinking', base: 678, wave1: 721, wave2: 743, current: 754, final: 756, growth1: 43, growth2: 22, growth3: 2, total: 78, type: 'donor' },
    { channel: '@trueredorescue', base: 550, wave1: 587, wave2: 620, current: 626, final: 626, growth1: 37, growth2: 33, growth3: 0, total: 76, type: 'stable' },
  ];

  const chartData = useMemo(() => channelData.map(d => ({
    name: d.channel.replace('@', ''),
    'Волна 1': d.growth1,
    'Волна 2': d.growth2,
    'Волна 3': d.growth3,
    'Итого': d.total,
  })), []);

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
            <div className="flex items-center gap-2 md:gap-3">
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
              <div className="text-6xl md:text-8xl font-light mb-4">+81</div>
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
              <div className="text-6xl md:text-8xl font-light mb-4">7ч</div>
              <div className="text-base md:text-xl tracking-wider">НАБЛЮДЕНИЕ</div>
              <div className="text-xs md:text-sm text-white/60 mt-2">Временной период</div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/20">
              {channelData.slice(0, 4).map((channel, idx) => (
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
                      <span className="text-white">{channel.current}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Wave Analysis */}
        <section className="border-b border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 md:p-12 lg:p-20 border-b lg:border-b-0 lg:border-r border-white/20">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ПЕРВАЯ ВОЛНА</h3>
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

            <div className="p-6 md:p-12 lg:p-20">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-4xl md:text-5xl font-light mb-8 tracking-tight">ВТОРАЯ ВОЛНА</h3>
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
              className="text-4xl md:text-6xl font-light mb-16 tracking-tight"
            >
              КЛЮЧЕВЫЕ ИНСАЙТЫ
            </motion.h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Высокий Overlap</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">ДОНОРЫ ЭКОСИСТЕМЫ</h4>
                <p className="text-white/80 mb-4">@DesignDictatorship, @kuntsevich_design, @dsgn_thinking</p>
                <p className="text-sm text-white/60 mb-4">
                  Сильные каналы с устоявшейся аудиторией, работают как доноры трафика для других каналов папки.
                </p>
                <div className="border-t border-white/10 pt-4 mt-4">
                  <p className="text-sm text-white/70">
                    Даже после собственного поста @DesignDictatorship показал минимальный direct-рост, но обеспечил заметный перекрёстн��й рост другим каналам.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Низкий Overlap</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">ГЛАВНЫЕ БЕНЕФИЦИАРЫ</h4>
                <p className="text-white/80 mb-4">@visuaaaals, @tooltipp, @nix_ux_view, @yuliapohilko</p>
                <p className="text-sm text-white/60">
                  Максимальный рост за счёт привлечения новой аудитории. @visuaaaals — абсолютный лидер второй волны (+76).
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Ключевой инсайт</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">НИЗКИЙ ПРИРОСТ ≠ СЛАБЫЙ КАНАЛ</h4>
                <p className="text-white/80 mb-4">Механизм перераспределения</p>
                <p className="text-sm text-white/60">
                  Низкий прирост часто признак высокой интеграции в ядро аудитории. Папка усиливает менее пересекаемые каналы.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Структурная роль</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">ДОНОРСТВО ≠ ТАЙМИНГ</h4>
                <p className="text-white/80 mb-4">Насыщенность аудитории</p>
                <p className="text-sm text-white/60">
                  Донорство определяется не таймингом публикации, а насыщенностью аудитории. Каналы-доноры делятся подписчиками независимо от момента поста.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Вторая и третья волны</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">ПОСТЕПЕННАЯ РАСПАКОВКА</h4>
                <p className="text-white/80 mb-4">Решающий период</p>
                <p className="text-sm text-white/60">
                  Для «неядерных» каналов вторая и третья волны оказались решающими. Каналы с меньшим overlap добираются постепенно, по мере "распаковки" папки аудиторией.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-black p-8 md:p-12"
              >
                <div className="text-xs text-white/40 mb-4 uppercase tracking-widest">Финальный эффект</div>
                <h4 className="text-2xl md:text-3xl font-light mb-6">ВЫРАВНИВАНИЕ ЭКОСИСТЕМЫ</h4>
                <p className="text-white/80 mb-4">+70…+95 за день</p>
                <p className="text-sm text-white/60">
                  К концу дня почти все каналы вышли в диапазон +70…+95. Рост стал плавным и равномерным, без резких скачков — эффект папки отработал.
                </p>
              </motion.div>
            </div>
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
                    <th className="text-right py-4 px-4 font-light">18:50</th>
                    <th className="text-right py-4 px-4 font-light">Волна 1</th>
                    <th className="text-right py-4 px-4 font-light">Волна 2</th>
                    <th className="text-right py-4 px-4 font-light">Волна 3</th>
                    <th className="text-right py-4 px-4 font-light">Итого</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map((row, idx) => (
                    <TableRow key={row.channel} row={row} idx={idx} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>



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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/20">
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
                <div className="text-xs text-white/40 mb-2 uppercase tracking-widest">Доно��ы экосистемы</div>
                <p className="text-white/80">
                  Каналы с большой устоявшейся аудиторией, которые делятся трафиком с др��гими кана��ами папки больше, чем получают сами.
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
                    Папка Career Hub за день отработала как <span className="italic">механизм выравнивания экосистемы</span>
                  </p>
                  <div className="space-y-4 text-lg md:text-xl text-white/80">
                    <p className="flex items-start gap-4">
                      <span className="text-white/40 flex-shrink-0">→</span>
                      <span><span className="text-white font-medium">ядро</span> (DesignDictatorship и др.) выступило донорами</span>
                    </p>
                    <p className="flex items-start gap-4">
                      <span className="text-white/40 flex-shrink-0">→</span>
                      <span><span className="text-white font-medium">хвост и средние каналы</span> добрали аудиторию</span>
                    </p>
                    <p className="flex items-start gap-4">
                      <span className="text-white/40 flex-shrink-0">→</span>
                      <span>рост распределился <span className="text-white font-medium">асинхронно и справедливо</span></span>
                    </p>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="pt-8 border-t border-white/20 mt-8"
                  >
                    <p className="text-white/60 text-sm md:text-base">
                      Эксперимент показал, что папки в Telegram работают не просто как агрегаторы контента, 
                      а как <span className="text-white">органические балансиры аудиторий</span>, 
                      выравнивающие распределение внимания внутри микросообщества.
                    </p>
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
              <div className="text-white/60 mb-2">8 февраля 2026</div>
              <div className="text-white/60">11:00 – 18:06</div>
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
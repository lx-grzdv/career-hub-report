import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [loadTime, setLoadTime] = useState(0);
  const startTime = Date.now();

  useEffect(() => {
    // Faster progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Faster progress but never reach 100 until actual load
        return Math.min(prev + Math.random() * 15, 95);
      });
      
      const elapsed = (Date.now() - startTime) / 1000;
      setLoadTime(elapsed);
      
      // Show warning after 2 seconds (faster for better UX)
      if (elapsed > 2) {
        setShowSlowWarning(true);
      }
    }, 150);

    // Complete progress when DOM is ready
    if (document.readyState === 'complete') {
      setProgress(100);
    } else {
      window.addEventListener('load', () => setProgress(100));
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('load', () => setProgress(100));
    };
  }, []);

  const isTelegram = typeof window !== 'undefined' && 
    (navigator.userAgent.includes('Telegram') || 
     navigator.userAgent.includes('TelegramBot'));

  const openInExternalBrowser = () => {
    // Try to open in external browser
    const url = window.location.href;
    
    // iOS Safari
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      window.location.href = `x-safari-https://${window.location.host}${window.location.pathname}`;
    } else {
      // Android - just show instruction
      alert('Нажмите на три точки (⋯) в правом верхнем углу и выберите "Открыть в браузере"');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-[200] flex items-center justify-center"
      >
        <div className="max-w-md w-full px-6">
          {/* Logo/Title */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-light tracking-wider text-white mb-2">
              CAREER HUB
            </h1>
            <p className="text-white/60 text-sm">Загрузка отчёта...</p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-white rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/40">
              <span>{Math.round(progress)}%</span>
              <span>{loadTime.toFixed(1)}s</span>
            </div>
          </div>

          {/* Slow Loading Warning */}
          <AnimatePresence>
            {showSlowWarning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-yellow-600/20 border border-yellow-600/40 rounded-lg p-4 mb-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 rounded-full bg-yellow-500/30 flex items-center justify-center">
                      <span className="text-yellow-300 text-xs">⚠</span>
                    </div>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="text-yellow-100 mb-2">
                      Сайт загружается медленно из-за домена <code className="px-1 py-0.5 bg-black/30 rounded text-yellow-200">figma.site</code>
                    </p>
                    
                    {isTelegram ? (
                      <>
                        <p className="text-yellow-100/80 text-xs mb-3">
                          Telegram WebView имеет ограничения. Откройте во внешнем браузере:
                        </p>
                        <button
                          onClick={openInExternalBrowser}
                          className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors text-sm font-medium"
                        >
                          🌐 Открыть в Safari/Chrome
                        </button>
                      </>
                    ) : (
                      <p className="text-yellow-100/80 text-xs">
                        Попробуйте обновить страницу или используйте VPN
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-white/40 text-xs"
          >
            {loadTime < 3 ? (
              <p>Загрузка данных аналитики...</p>
            ) : loadTime < 6 ? (
              <p>Оптимизация графиков...</p>
            ) : (
              <p>Почти готово...</p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

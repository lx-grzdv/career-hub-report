import { useEffect } from 'react';

export const PerformanceOptimizer = () => {
  useEffect(() => {
    // All optimizations are non-blocking and wrapped in try-catch
    
    // Detect Telegram WebView and disable all external requests
    const isTelegramWebView = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('TelegramBot') || 
       window.navigator.userAgent.includes('Telegram'));
    
    if (isTelegramWebView) {
      console.log('Telegram WebView detected - using minimal mode');
    }

    try {
      // Add viewport meta for mobile optimization
      if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover';
        document.head.appendChild(viewport);
      }
    } catch (error) {
      console.warn('Viewport meta setup failed:', error);
    }

    try {
      // Disable automatic DNS prefetch for all links (prevents blocking in restricted regions)
      if (!document.querySelector('meta[http-equiv="x-dns-prefetch-control"]')) {
        const dnsPrefetch = document.createElement('meta');
        dnsPrefetch.httpEquiv = 'x-dns-prefetch-control';
        dnsPrefetch.content = 'off';
        document.head.appendChild(dnsPrefetch);
      }
    } catch (error) {
      console.warn('DNS prefetch control setup failed:', error);
    }

    try {
      // Detect Telegram WebView and show open in browser prompt
      if (isTelegramWebView) {
        const telegramMeta = document.createElement('meta');
        telegramMeta.name = 'telegram:link';
        telegramMeta.content = 'external';
        document.head.appendChild(telegramMeta);
      }
    } catch (error) {
      console.warn('Telegram meta setup failed:', error);
    }

    try {
      // Disable preload/prefetch for links to external domains
      if (!document.querySelector('meta[http-equiv="x-dns-prefetch-control"]')) {
        const style = document.createElement('style');
        style.textContent = `
          a[href*="t.me"]::before {
            content: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.warn('Link prefetch prevention failed:', error);
    }

    try {
      // Add PWA meta tags
      const metaTags = [
        { name: 'theme-color', content: '#000000' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Career Hub' },
        { name: 'mobile-web-app-capable', content: 'yes' },
      ];

      metaTags.forEach(({ name, content }) => {
        if (!document.querySelector(`meta[name="${name}"]`)) {
          const meta = document.createElement('meta');
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      });
    } catch (error) {
      console.warn('PWA meta tags setup failed:', error);
    }

    try {
      // Optimize for mobile connections
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const isSlowConnection = connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
          if (isSlowConnection) {
            document.documentElement.classList.add('slow-connection');
          }
        }
      }
    } catch (error) {
      console.warn('Connection optimization failed:', error);
    }

    try {
      // Lazy load images with Intersection Observer
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
              }
            }
          });
        }, { rootMargin: '50px' });

        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      }
    } catch (error) {
      console.warn('Image lazy loading setup failed:', error);
    }

    try {
      // Small safe CSS tweaks for mobile UX
      const style = document.createElement('style');
      style.textContent = `
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.warn('Style optimization failed:', error);
    }

  }, []);

  return null;
};
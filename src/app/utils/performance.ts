/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if device is low-end based on hardware concurrency
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const navigator = window.navigator as any;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = navigator.deviceMemory || 4;
  
  // Consider device low-end if it has <= 2 cores or <= 2GB RAM
  return hardwareConcurrency <= 2 || deviceMemory <= 2;
}

/**
 * Get optimal animation config based on device capabilities
 */
export function getAnimationConfig() {
  const isLowEnd = isLowEndDevice();
  const isMobile = typeof window !== 'undefined' 
    ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    : false;
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  if (prefersReducedMotion || isLowEnd) {
    return {
      duration: 0.01,
      enabled: false,
    };
  }

  if (isMobile) {
    return {
      duration: 0.3,
      enabled: true,
    };
  }

  return {
    duration: 0.6,
    enabled: true,
  };
}

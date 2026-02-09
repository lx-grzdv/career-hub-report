import { useEffect, useState } from 'react';

/**
 * Performance monitor component (dev only)
 * Shows FPS and memory usage in bottom-right corner
 */
export const PerformanceMonitor = () => {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState<number | null>(null);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round(frameCount * 1000 / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;

        // Measure memory if available
        if ((performance as any).memory) {
          const memoryInfo = (performance as any).memory;
          const usedMemoryMB = Math.round(memoryInfo.usedJSHeapSize / 1048576);
          setMemory(usedMemoryMB);
        }
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDev]);

  if (!isDev) return null;

  const fpsColor = fps >= 55 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 99999,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#999' }}>FPS:</span>{' '}
          <span style={{ color: fpsColor, fontWeight: 'bold' }}>{fps}</span>
        </div>
        {memory !== null && (
          <div>
            <span style={{ color: '#999' }}>MEM:</span>{' '}
            <span style={{ color: '#fff', fontWeight: 'bold' }}>{memory}MB</span>
          </div>
        )}
      </div>
    </div>
  );
};

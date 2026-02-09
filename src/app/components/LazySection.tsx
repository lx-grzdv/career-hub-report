import { ReactNode, useRef } from 'react';
import { useInView } from 'motion/react';

interface LazySectionProps {
  children: ReactNode;
  threshold?: number;
  margin?: string;
}

/**
 * Lazy loading wrapper for heavy sections
 * Only renders children when section is in viewport
 */
export const LazySection = ({ 
  children, 
  threshold = 0.1, 
  margin = '100px' 
}: LazySectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once: true, 
    amount: threshold,
    margin 
  });

  return (
    <div ref={ref}>
      {isInView ? children : <div style={{ minHeight: '200px' }} />}
    </div>
  );
};

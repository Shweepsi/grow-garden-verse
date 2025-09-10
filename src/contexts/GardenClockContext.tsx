import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';

// PERFORMANCE: Smart adaptive intervals based on garden state
const DEFAULT_CLOCK_INTERVAL = 2000; // Reduced from 1s to 2s
const FAST_INTERVAL = 1000; // For plants close to completion
const SLOW_INTERVAL = 5000; // When no active plants

/**
 * Context storing the last timestamp emitted by the shared garden clock.
 * All components that need a periodic tick (progress bars, timers…) can subscribe
 * to this context instead of starting their own setInterval, which drastically
 * reduces the number of timers running in parallel.
 */
const GardenClockContext = createContext<number>(Date.now());

interface GardenClockProviderProps {
  children: ReactNode;
  /** Base interval in milliseconds between ticks. Smart intervals override this. */
  interval?: number;
  /** Optional garden state for smart interval adaptation */
  hasActivePlants?: boolean;
  /** Time until next plant completion (for optimization) */
  nextCompletionTime?: number;
}

export const GardenClockProvider = ({ 
  children, 
  interval = DEFAULT_CLOCK_INTERVAL,
  hasActivePlants = false,
  nextCompletionTime = Infinity
}: GardenClockProviderProps) => {
  const [time, setTime] = useState<number>(() => Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();
  const isDocumentHidden = useRef(false);

  // Smart interval calculation
  const getOptimalInterval = useCallback(() => {
    if (isDocumentHidden.current) return SLOW_INTERVAL;
    if (!hasActivePlants) return SLOW_INTERVAL;
    if (nextCompletionTime < 10) return FAST_INTERVAL;
    if (nextCompletionTime < 30) return DEFAULT_CLOCK_INTERVAL;
    return interval;
  }, [hasActivePlants, nextCompletionTime, interval]);

  const startTicker = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    const currentInterval = getOptimalInterval();
    intervalRef.current = setInterval(() => {
      setTime(Date.now());
    }, currentInterval);
  }, [getOptimalInterval]);

  // Handle visibility changes for battery optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentHidden.current = document.hidden;
      startTicker(); // Restart with appropriate interval
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startTicker]);

  useEffect(() => {
    startTicker();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTicker]);

  return (
    <GardenClockContext.Provider value={time}>{children}</GardenClockContext.Provider>
  );
};

/**
 * Hook to access the current tick value. The returned number changes every
 * `interval` milliseconds and causes subscribed components to re-render.
 */
export const useGardenClock = () => useContext(GardenClockContext);
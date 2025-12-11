import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Uses 768px as the breakpoint (matches Tailwind's md: breakpoint).
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial value based on window width (or true if SSR)
    if (typeof window === 'undefined') return true;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Check on mount in case initial state was wrong
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

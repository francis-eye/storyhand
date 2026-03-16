import { useState, useEffect } from 'react';

// Detect mobile viewport for dynamic component props (e.g., PlayingCard size)
// that can't be handled with Tailwind responsive classes alone
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

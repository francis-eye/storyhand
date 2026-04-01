import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ColorMode = 'system' | 'light' | 'dark';

interface ColorModeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  isDark: boolean;
}

const ColorModeContext = createContext<ColorModeContextType | null>(null);

function resolveIsDark(mode: ColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem('storyhand-color-mode');
    return (stored === 'light' || stored === 'dark') ? stored : 'system';
  });
  const [isDark, setIsDark] = useState(() => resolveIsDark(colorMode));

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem('storyhand-color-mode', mode);
  }, []);

  // Sync dark class on <html> and isDark state
  useEffect(() => {
    const dark = resolveIsDark(colorMode);
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  // Listen for OS color scheme changes when in "system" mode
  useEffect(() => {
    if (colorMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [colorMode]);

  return (
    <ColorModeContext.Provider value={{ colorMode, setColorMode, isDark }}>
      {children}
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within a ColorModeProvider');
  }
  return context;
}

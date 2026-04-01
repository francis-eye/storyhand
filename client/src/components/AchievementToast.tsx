import { useState, useEffect } from 'react';
import type { Achievement } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';

interface AchievementToastProps {
  achievement: Achievement;
  theme: ThemeConfig;
}

export default function AchievementToast({ achievement, theme }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Enter
    const enterTimer = setTimeout(() => setVisible(true), 50);
    // Start exit
    const exitTimer = setTimeout(() => setExiting(true), 2700);
    // Remove
    const removeTimer = setTimeout(() => setVisible(false), 3000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible && !exiting) return null;

  const is16bit = theme.id === '16bit';

  return (
    <div
      className={`absolute top-3 right-3 z-20 transition-all duration-300 ${
        visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 shadow-lg ${
          is16bit
            ? 'bg-[#1a1a2e] border-2 border-[#33ff33]/30 rounded-none font-pixel'
            : 'bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl'
        }`}
        style={{ minWidth: '200px', maxWidth: '300px' }}
      >
        <span className="text-2xl">{achievement.icon}</span>
        <div>
          <div className={`font-bold text-sm ${
            is16bit ? 'text-[#ffa500]' : 'text-[var(--text-primary)]'
          }`}>
            {achievement.title}
          </div>
          <div className={`text-xs ${
            is16bit ? 'text-[#33ff33]/70' : 'text-[var(--text-secondary)]'
          }`}>
            {achievement.description}
          </div>
        </div>
      </div>
    </div>
  );
}

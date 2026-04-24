import type { TableTheme } from '../types/game';

// Theme configuration — CSS class strings for each component area
export interface ThemeConfig {
  id: TableTheme;
  label: string;
  icon: string;
  // Outer session wrapper
  wrapper: string;
  // Session header bar
  header: {
    background: string;
    text: string;
    gameName: string;
    roundText: string;
    phaseChip: Record<string, string>; // keyed by phase
    reVotingChip: string;
    inviteButton: string;
    inviteButtonHover: string;
    sessionIdButton: string;
    sessionIdText: string;
  };
  // Gaming area floor (space around the felt, between status bar and card deck)
  gamingArea: {
    background: string;
  };
  // Game table
  table: {
    background: string;
    border: string;
    emptyText: string;
    voteCountText: string;
    scanlines: boolean;
  };
  // Playing cards
  card: {
    faceUpBg: string;
    faceUpBorder: string;
    faceUpSelectedBorder: string;
    faceUpHoverBorder: string;
    faceUpText: string;
    faceUpCornerText: string;
    faceDownBg: string; // inline style (gradient or solid)
    faceDownBorder: string;
    faceDownInner: string;
    rounded: string;
  };
  // Card deck tray
  deck: {
    background: string;
    border: string;
    fadeGradient: string;
  };
  // Player roster
  roster: {
    background: string;
    border: string;
    headingText: string;
    dividerColor: string;
    nameText: string;
    nameDisconnectedText: string;
    disconnectedLabel: string;
    votedText: string;
    thinkingText: string;
    transferButton: string;
  };
  // Results panel
  results: {
    background: string;
    consensusBg: string;
    consensusBorder: string;
    consensusText: string;
    varianceBg: string;
    varianceBorder: string;
    varianceText: string;
    averageLabel: string;
    averageValue: string;
    voteCountText: string;
    barBg: string;
    barFill: string;
    barLabel: string;
    barCount: string;
  };
  // Game controls (shared — visible to all players)
  gameControls: {
    background: string;
    voteCountText: string;
    buttonPrimary: string;
    buttonSecondary: string;
    countdownText: string;
  };
  // Countdown overlay
  countdown: {
    overlayBg: string;
    text: string;
  };
}

const classicTheme: ThemeConfig = {
  id: 'classic',
  label: 'Classic',
  icon: '🎨',
  wrapper: '',
  header: {
    background: 'bg-gray-50 dark:bg-[var(--session-header-bg)] border-b border-gray-200 dark:border-[var(--border-default)]',
    text: '',
    gameName: 'text-gray-800 dark:text-gray-200',
    roundText: 'text-gray-500 dark:text-gray-400',
    phaseChip: {
      waiting: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      voting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      countdown: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      revealed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    },
    reVotingChip: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    inviteButton: 'bg-blue-600 text-white hover:bg-blue-700',
    inviteButtonHover: '',
    sessionIdButton: 'bg-white dark:bg-[var(--surface-elevated)] border border-gray-200 dark:border-[var(--border-default)] hover:bg-gray-50 dark:hover:bg-[var(--bg-tertiary)]',
    sessionIdText: 'text-gray-700 dark:text-gray-300',
  },
  gamingArea: {
    background: 'bg-emerald-50 dark:bg-emerald-800',
  },
  table: {
    background: 'bg-gradient-to-br from-emerald-200 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
    border: 'border border-emerald-200 dark:border-emerald-800 rounded-2xl',
    emptyText: 'text-emerald-400',
    voteCountText: 'text-gray-500 dark:text-gray-400',
    scanlines: false,
  },
  card: {
    faceUpBg: 'bg-white dark:bg-[var(--card-face-bg)]',
    faceUpBorder: 'border-gray-300 dark:border-[var(--card-face-border)]',
    faceUpSelectedBorder: 'border-blue-600 ring-2 ring-blue-300',
    faceUpHoverBorder: 'hover:border-blue-400',
    faceUpText: 'text-gray-800',
    faceUpCornerText: 'text-gray-600',
    faceDownBg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    faceDownBorder: 'border-gray-400 rounded-lg',
    faceDownInner: 'border-white/30 rounded-sm',
    rounded: 'rounded-lg',
  },
  deck: {
    background: 'bg-white dark:bg-[var(--deck-tray-bg)]',
    border: 'border-gray-200 dark:border-[var(--deck-tray-border)]',
    fadeGradient: 'from-white dark:from-[#151528]',
  },
  roster: {
    background: '',
    border: 'border-gray-200',
    headingText: 'text-gray-500',
    dividerColor: 'border-gray-200',
    nameText: 'text-gray-800 dark:text-gray-200',
    nameDisconnectedText: 'text-gray-400 dark:text-gray-500',
    disconnectedLabel: 'text-red-500',
    votedText: 'text-green-600',
    thinkingText: 'text-gray-400 dark:text-gray-500',
    transferButton: 'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
  },
  results: {
    background: 'bg-white shadow-lg dark:bg-[var(--results-bg)] dark:shadow-none dark:border dark:border-[var(--results-border)]',
    consensusBg: 'bg-green-50 dark:bg-green-900/30',
    consensusBorder: 'border-green-200 dark:border-green-700',
    consensusText: 'text-green-700 dark:text-green-400',
    varianceBg: 'bg-amber-50 dark:bg-amber-900/30',
    varianceBorder: 'border-amber-200 dark:border-amber-700',
    varianceText: 'text-amber-700 dark:text-amber-400',
    averageLabel: 'text-gray-500 dark:text-[var(--text-secondary)]',
    averageValue: 'text-gray-800 dark:text-[var(--text-primary)]',
    voteCountText: 'text-gray-500 dark:text-[var(--text-secondary)]',
    barBg: 'bg-gray-100 dark:bg-[#252540]',
    barFill: 'bg-blue-500',
    barLabel: 'text-gray-600 dark:text-[var(--text-secondary)]',
    barCount: 'text-gray-500 dark:text-[var(--text-secondary)]',
  },
  gameControls: {
    background: 'bg-gray-900 text-white dark:bg-[var(--controls-bg)] dark:border-t dark:border-[var(--controls-border)]',
    voteCountText: 'text-gray-400',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white rounded-full',
    buttonSecondary: 'border border-gray-500 hover:border-gray-300 text-gray-300 hover:text-white rounded-full',
    countdownText: 'text-white',
  },
  countdown: {
    overlayBg: 'bg-black/20',
    text: 'text-white',
  },
};

const sixteenBitTheme: ThemeConfig = {
  id: '16bit',
  label: '16-Bit Mode (Default)',
  icon: '🕹️',
  wrapper: 'font-pixel theme-16bit',
  header: {
    background: 'bg-[#1a1a2e] border-b-2 border-[#33ff33]/30',
    text: '',
    gameName: 'text-white',
    roundText: 'text-[#33ff33]',
    phaseChip: {
      waiting: 'bg-gray-800 text-gray-400 border border-gray-600',
      voting: 'bg-blue-900 text-blue-300 border border-blue-500',
      countdown: 'bg-amber-900 text-amber-300 border border-amber-500',
      revealed: 'bg-green-900 text-[#33ff33] border border-green-500',
    },
    reVotingChip: 'bg-orange-900 text-orange-300 border border-orange-500',
    inviteButton: 'bg-red-800 text-white hover:bg-red-700 border-2 border-red-600',
    inviteButtonHover: '',
    sessionIdButton: 'bg-[#1a1a2e] border-2 border-[#33ff33]/40 hover:border-[#33ff33]/70',
    sessionIdText: 'text-[#33ff33]',
  },
  gamingArea: {
    background: 'bg-[#3a7a3a] dark:bg-[#2a5a2a]',
  },
  table: {
    background: 'bg-[#2a6a2a] dark:bg-[#1a3a1a]',
    border: 'border-4 border-[#0d2a0d] rounded-none',
    emptyText: 'text-[#33ff33]/50',
    voteCountText: 'text-[#33ff33]/70',
    scanlines: true,
  },
  card: {
    faceUpBg: 'bg-[#f5e6c8]',
    faceUpBorder: 'border-black',
    faceUpSelectedBorder: 'border-[#ffa500] ring-2 ring-[#ffa500]/50',
    faceUpHoverBorder: 'hover:border-[#ffa500]',
    faceUpText: 'text-gray-900',
    faceUpCornerText: 'text-gray-700',
    faceDownBg: '#8b1a1a',
    faceDownBorder: 'border-black rounded-none',
    faceDownInner: 'border-[#ffa500]/30 rounded-none',
    rounded: 'rounded-none',
  },
  deck: {
    background: 'bg-[#2a1a0a]',
    border: 'border-[#4a2a0a]',
    fadeGradient: 'from-[#2a1a0a]',
  },
  roster: {
    background: 'bg-[#1a1a2e]',
    border: 'border-[#33ff33]/20',
    headingText: 'text-[#ffa500]',
    dividerColor: 'border-[#33ff33]/20',
    nameText: 'text-[#33ff33]',
    nameDisconnectedText: 'text-gray-600',
    disconnectedLabel: 'text-red-400',
    votedText: 'text-[#33ff33]',
    thinkingText: 'text-gray-600',
    transferButton: 'text-[#ffa500]/50 hover:text-[#ffa500] hover:bg-[#ffa500]/10',
  },
  results: {
    background: 'bg-[#1a1a2e] border-2 border-[#33ff33]/20 shadow-lg shadow-black/50',
    consensusBg: 'bg-green-900/50',
    consensusBorder: 'border-[#33ff33]/50',
    consensusText: 'text-[#33ff33]',
    varianceBg: 'bg-amber-900/50',
    varianceBorder: 'border-[#ffa500]/50',
    varianceText: 'text-[#ffa500]',
    averageLabel: 'text-[#33ff33]/70',
    averageValue: 'text-[#ffa500]',
    voteCountText: 'text-[#33ff33]/70',
    barBg: 'bg-[#0d0d1a]',
    barFill: 'bg-[#33ff33]',
    barLabel: 'text-[#33ff33]',
    barCount: 'text-[#33ff33]/70',
  },
  gameControls: {
    background: 'bg-[#0d0d0d] text-white border-2 border-[#33ff33]/30',
    voteCountText: 'text-[#33ff33]/70',
    buttonPrimary: 'bg-red-800 hover:bg-red-700 text-white border-2 border-red-600 rounded-none',
    buttonSecondary: 'border-2 border-[#ffa500]/50 hover:border-[#ffa500] text-[#ffa500]/70 hover:text-[#ffa500] rounded-none',
    countdownText: 'text-[#ffa500]',
  },
  countdown: {
    overlayBg: 'bg-black/50',
    text: 'text-[#ffa500] theme-16bit-glow',
  },
};

const THEMES: Record<TableTheme, ThemeConfig> = {
  classic: classicTheme,
  '16bit': sixteenBitTheme,
};

export function getTheme(id: TableTheme): ThemeConfig {
  return THEMES[id] || THEMES.classic;
}

export function getAllThemes(): ThemeConfig[] {
  return Object.values(THEMES);
}

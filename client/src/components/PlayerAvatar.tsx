import type { Player } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import { stringToColor, canVote } from '../utils/session';

interface PlayerAvatarProps {
  player: Player;
  showVoteStatus?: boolean;
  facilitatorId?: string;
  theme?: ThemeConfig;
}

// Colored initial avatar with role badges and vote status
export default function PlayerAvatar({ player, showVoteStatus = false, facilitatorId, theme }: PlayerAvatarProps) {
  const bgColor = player.isConnected ? stringToColor(player.name) : '#9ca3af';
  const initial = player.name.charAt(0).toUpperCase();

  // Role badge emoji — star uses facilitatorId (authoritative), not player.role
  const isFacilitator = facilitatorId ? player.id === facilitatorId : player.role === 'facilitator';
  const roleBadge = isFacilitator ? '⭐' : player.role === 'observer' ? '👁' : null;

  const nameText = !player.isConnected
    ? (theme?.roster.nameDisconnectedText ?? 'text-gray-400')
    : (theme?.roster.nameText ?? 'text-gray-800');
  const disconnectedLabel = theme?.roster.disconnectedLabel ?? 'text-red-500';
  const votedText = theme?.roster.votedText ?? 'text-green-600';
  const thinkingText = theme?.roster.thinkingText ?? 'text-gray-400';

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm
            ${!player.isConnected ? 'opacity-50' : ''}`}
          style={{ backgroundColor: bgColor }}
        >
          {initial}
        </div>
        {roleBadge && (
          <span className="absolute -top-1 -right-1 text-xs">{roleBadge}</span>
        )}
      </div>
      <div className="flex flex-col min-w-0 whitespace-nowrap">
        <span className={`text-sm font-medium truncate ${nameText}`}>
          {player.name}
        </span>
        {!player.isConnected && (
          <span className={`text-[10px] ${disconnectedLabel}`}>Disconnected</span>
        )}
        {showVoteStatus && canVote(player) && player.isConnected && (
          <span className={`text-[10px] ${player.hasVoted ? votedText : thinkingText}`}>
            {player.hasVoted ? '✓ Voted' : 'Thinking...'}
          </span>
        )}
      </div>
    </div>
  );
}

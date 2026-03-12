import type { Player } from '../types/game';
import { stringToColor, canVote } from '../utils/session';

interface PlayerAvatarProps {
  player: Player;
  showVoteStatus?: boolean;
  hostId?: string;
}

// Colored initial avatar with role badges and vote status
export default function PlayerAvatar({ player, showVoteStatus = false, hostId }: PlayerAvatarProps) {
  const bgColor = player.isConnected ? stringToColor(player.name) : '#9ca3af';
  const initial = player.name.charAt(0).toUpperCase();

  // Role badge emoji — crown uses hostId (authoritative), not player.role
  const isHost = hostId ? player.id === hostId : player.role === 'host';
  const roleBadge = isHost ? '👑' : player.role === 'observer' ? '👁' : null;

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
      <div className="flex flex-col min-w-0">
        <span className={`text-sm font-medium truncate ${!player.isConnected ? 'text-gray-400' : 'text-gray-800'}`}>
          {player.name}
        </span>
        {!player.isConnected && (
          <span className="text-[10px] text-red-500">Disconnected</span>
        )}
        {showVoteStatus && canVote(player) && player.isConnected && (
          <span className={`text-[10px] ${player.hasVoted ? 'text-green-600' : 'text-gray-400'}`}>
            {player.hasVoted ? '✓ Voted' : 'Thinking...'}
          </span>
        )}
      </div>
    </div>
  );
}

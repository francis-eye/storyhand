import { useState, useRef, useEffect } from 'react';
import Popover from '@mui/material/Popover';
import type { Player } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import { stringToColor, canVote } from '../utils/session';

interface PlayerBarProps {
  players: Player[];
  facilitatorId: string;
  showVoteStatus: boolean;
  isCurrentUserFacilitator: boolean;
  onKickPlayer?: (playerId: string) => void;
  theme: ThemeConfig;
}

// Horizontal player bar that replaces the sidebar roster.
// Shows all players in a scrollable row with avatars, names, and vote status.
export default function PlayerBar({
  players,
  facilitatorId,
  showVoteStatus,
  isCurrentUserFacilitator,
  onKickPlayer,
  theme,
}: PlayerBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  // Popover state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Check if scrollable content extends beyond the visible area
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasMore = el.scrollWidth - el.scrollLeft - el.clientWidth > 2;
      setShowFade(hasMore);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [players.length]);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>, player: Player) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlayer(player);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedPlayer(null);
  };

  const handleKick = () => {
    if (selectedPlayer && onKickPlayer) {
      onKickPlayer(selectedPlayer.id);
    }
    handlePopoverClose();
  };

  const isFacilitator = (player: Player) => player.id === facilitatorId;

  const getRoleLabel = (player: Player): string => {
    if (isFacilitator(player)) return 'Facilitator';
    if (player.role === 'observer') return 'Observer';
    return 'Player';
  };

  const getVoteStatus = (player: Player): React.ReactNode => {
    if (!player.isConnected) {
      return <span className="text-red-500 text-xs">Disconnected</span>;
    }
    if (!showVoteStatus || !canVote(player)) return null;
    if (player.hasVoted) {
      return <span className="text-emerald-500 text-xs">&#10003; Voted</span>;
    }
    return <span className="text-gray-400 text-xs">Thinking...</span>;
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={`flex items-center gap-3 px-4 py-2.5 overflow-x-auto border-b ${theme.roster.background} ${theme.roster.border}`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {players.map((player, index) => (
          <div key={player.id} className="flex items-center gap-1.5 shrink-0">
            {/* Dot separator between players */}
            {index > 0 && (
              <span className={`${theme.roster.nameText} opacity-30 mr-1.5 select-none`}>&middot;</span>
            )}

            {/* Player unit */}
            <div
              className={`flex items-center gap-1.5 ${
                !player.isConnected ? 'opacity-40 grayscale' : ''
              }`}
            >
              {/* Avatar */}
              <button
                onClick={(e) => handleAvatarClick(e, player)}
                className="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow"
                style={{ backgroundColor: stringToColor(player.name || 'Observer') }}
                title={player.name || 'Observer'}
              >
                {(player.name || 'O').charAt(0).toUpperCase()}

                {/* Facilitator star badge */}
                {isFacilitator(player) && (
                  <span className="absolute -top-1 -right-1 text-[10px] leading-none drop-shadow-sm">
                    &#9733;
                  </span>
                )}
              </button>

              {/* Name */}
              <span
                className={`text-sm whitespace-nowrap ${
                  player.isConnected ? theme.roster.nameText : theme.roster.nameDisconnectedText
                }`}
              >
                {player.name || 'Observer'}
              </span>

              {/* Vote status */}
              {getVoteStatus(player)}
            </div>
          </div>
        ))}
      </div>

      {/* Right-edge fade gradient when content overflows */}
      {showFade && (
        <div
          className={`absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l ${theme.deck.fadeGradient} to-transparent`}
        />
      )}

      {/* Player detail popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: { borderRadius: '12px', mt: 1, minWidth: 180 },
          },
        }}
      >
        {selectedPlayer && (
          <div className="p-3 flex flex-col gap-2">
            {/* Player name and role */}
            <div>
              <p className="font-semibold text-sm text-gray-800">
                {selectedPlayer.name || 'Observer'}
              </p>
              <p className="text-xs text-gray-500">{getRoleLabel(selectedPlayer)}</p>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedPlayer.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-gray-500">
                {selectedPlayer.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Kick button — only for facilitator, and not on self */}
            {isCurrentUserFacilitator && !isFacilitator(selectedPlayer) && onKickPlayer && (
              <button
                onClick={handleKick}
                className="mt-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md px-2 py-1.5 transition-colors text-left cursor-pointer"
              >
                Kick Player
              </button>
            )}
          </div>
        )}
      </Popover>
    </div>
  );
}

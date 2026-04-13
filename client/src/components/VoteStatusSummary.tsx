import { useState, useEffect, useRef } from 'react';
import Popover from '@mui/material/Popover';
import type { Player } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import { stringToColor, canVote } from '../utils/session';
import { useIsMobile } from '../hooks/useIsMobile';

interface VoteStatusSummaryProps {
  players: Player[];
  facilitatorId: string;
  showVoteStatus: boolean;
  isCurrentUserFacilitator: boolean;
  onKickPlayer?: (playerId: string) => void;
  theme: ThemeConfig;
}

export default function VoteStatusSummary({
  players,
  facilitatorId,
  showVoteStatus,
  isCurrentUserFacilitator,
  onKickPlayer,
  theme,
}: VoteStatusSummaryProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const facilitator = players.find((p) => p.id === facilitatorId) || null;
  const voters = players.filter(canVote);
  const observers = players.filter((p) => p.role === 'observer');
  const voted = voters.filter((p) => p.hasVoted);
  const waiting = voters.filter((p) => !p.hasVoted);

  // Collapse with Escape
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded]);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>, player: Player) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlayer(player);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setSelectedPlayer(null);
  };

  const handleKick = () => {
    if (selectedPlayer && onKickPlayer) onKickPlayer(selectedPlayer.id);
    handlePopoverClose();
  };

  const isFacilitator = (p: Player) => p.id === facilitatorId;

  const getRoleLabel = (p: Player): string => {
    if (isFacilitator(p)) return 'Facilitator';
    if (p.role === 'observer') return 'Observer';
    return 'Player';
  };

  const containerBg = theme.roster.background || 'bg-[var(--player-bar-bg)]';
  const containerBorder = theme.roster.border || 'border-[var(--player-bar-border)]';
  const nameText = theme.roster.nameText || 'text-[var(--text-primary)]';
  const headingText = theme.roster.headingText || 'text-[var(--text-secondary)]';
  const dividerColor = theme.roster.dividerColor || 'border-[var(--border-default)]';

  const totalVoters = voters.length;
  const votedCount = voted.length;
  const allVoted = totalVoters > 0 && votedCount === totalVoters;

  let statusText: string;
  if (totalVoters === 0) {
    statusText = 'Waiting for participants';
  } else if (allVoted) {
    statusText = `All voted (${votedCount}/${totalVoters})`;
  } else if (showVoteStatus) {
    statusText = `${votedCount} of ${totalVoters} voted`;
  } else {
    statusText = `${totalVoters} ${totalVoters === 1 ? 'participant' : 'participants'}`;
  }

  const canExpand = players.length > 0;

  const renderAvatar = (player: Player, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
    return (
      <button
        onClick={(e) => handleAvatarClick(e, player)}
        className={`relative ${sizeClasses} rounded-full flex items-center justify-center text-white font-bold shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow ${
          !player.isConnected ? 'opacity-40 grayscale' : ''
        }`}
        style={{ backgroundColor: stringToColor(player.name || 'Observer') }}
        title={player.name || 'Observer'}
        aria-label={`${player.name || 'Observer'}, ${getRoleLabel(player)}${
          canVote(player) ? (player.hasVoted ? ', voted' : ', waiting to vote') : ''
        }`}
      >
        {(player.name || 'O').charAt(0).toUpperCase()}
        {isFacilitator(player) && (
          <span className="absolute -top-1 -right-1 text-[10px] leading-none drop-shadow-sm">
            &#9733;
          </span>
        )}
        {showVoteStatus && canVote(player) && player.hasVoted && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-gray-900 flex items-center justify-center text-[8px] text-white"
            aria-hidden="true"
          >
            &#10003;
          </span>
        )}
      </button>
    );
  };

  const renderParticipantRow = (player: Player) => (
    <li
      key={player.id}
      className={`flex items-center gap-2 py-1 px-2 rounded-md ${
        !player.isConnected ? 'opacity-50' : ''
      }`}
    >
      {renderAvatar(player)}
      <span className={`text-sm truncate max-w-[120px] ${nameText}`}>
        {player.name || 'Observer'}
      </span>
      {!player.isConnected ? (
        <span className="text-[11px] text-red-500 shrink-0">Disconnected</span>
      ) : canVote(player) && showVoteStatus ? (
        <span
          className={`text-[11px] shrink-0 ${
            player.hasVoted ? theme.roster.votedText : theme.roster.thinkingText
          }`}
        >
          {player.hasVoted ? '✓ Voted' : 'Thinking…'}
        </span>
      ) : null}
    </li>
  );

  const renderSection = (title: string, list: Player[], emptyHint?: string) => {
    if (list.length === 0 && !emptyHint) return null;
    return (
      <section className="py-1">
        <h4
          className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-1 ${headingText}`}
        >
          {title} ({list.length})
        </h4>
        {list.length === 0 ? (
          <p className={`text-xs italic px-2 pb-1 ${theme.roster.thinkingText}`}>{emptyHint}</p>
        ) : (
          <ul className="flex flex-col">{list.map(renderParticipantRow)}</ul>
        )}
      </section>
    );
  };

  return (
    <div className="relative z-20" role="region" aria-label="Voting status">
      {/* Top strip: facilitator + count + toggle — left aligned */}
      <div className={`border-b ${containerBg} ${containerBorder}`}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          {facilitator && (
            <div className="flex items-center gap-2 shrink-0">
              {renderAvatar(facilitator, 'md')}
              <div className="flex flex-col leading-tight">
                <span className={`text-sm font-medium ${nameText} max-w-[140px] truncate`}>
                  {facilitator.name || 'Host'}
                </span>
                <span className={`text-[11px] ${headingText}`}>Facilitator</span>
              </div>
            </div>
          )}

          <div
            className={`text-sm font-medium ${nameText}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {statusText}
          </div>

          {canExpand && (
            <button
              ref={buttonRef}
              onClick={() => setIsExpanded((v) => !v)}
              aria-expanded={isExpanded}
              aria-controls="roster-details"
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${dividerColor} ${nameText} hover:bg-black/5 dark:hover:bg-white/10 min-h-[36px] flex items-center gap-1`}
            >
              <span>
                {isExpanded ? 'Hide participants' : 'Show participants'}
              </span>
              <span
                className={`inline-block transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Floating overlay panel — left-aligned, 280px, over the table */}
      {isExpanded && canExpand && (
        <div
          id="roster-details"
          className={`absolute left-4 top-full mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-lg border shadow-xl ${containerBg} ${dividerColor}`}
          role="dialog"
          aria-label="Participants"
        >
          <div
            className="overflow-y-auto px-2 py-2"
            style={{ maxHeight: 'min(60vh, 400px)' }}
          >
            {renderSection(
              'Voted',
              voted,
              showVoteStatus ? 'No one has voted yet' : undefined
            )}
            {renderSection(
              'Waiting',
              waiting,
              showVoteStatus && totalVoters > 0 ? 'Everyone voted!' : undefined
            )}
            {observers.length > 0 && renderSection('Observers', observers)}
          </div>
        </div>
      )}

      {/* Kick / detail popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              mt: 1,
              minWidth: 180,
              bgcolor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            },
          },
        }}
      >
        {selectedPlayer && (
          <div className="p-3 flex flex-col gap-2">
            <div>
              <p className="font-semibold text-sm text-[var(--text-primary)]">
                {selectedPlayer.name || 'Observer'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {getRoleLabel(selectedPlayer)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedPlayer.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {selectedPlayer.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {isCurrentUserFacilitator && !isFacilitator(selectedPlayer) && onKickPlayer && (
              <button
                onClick={handleKick}
                className="mt-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md px-2 py-1.5 transition-colors text-left cursor-pointer"
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

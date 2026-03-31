import type { Player } from '../types/game';
import type { ThemeConfig } from '../themes/themeRegistry';
import PlayerAvatar from './PlayerAvatar';

interface PlayerRosterProps {
  players: Player[];
  facilitatorId: string;
  showVoteStatus?: boolean;
  isCurrentUserFacilitator?: boolean;
  onKickPlayer?: (playerId: string) => void;
  theme: ThemeConfig;
}

// Sidebar roster grouped by role: Facilitator → Players → Observers
// On mobile (<md): horizontal scrollable bar
// On desktop (md+): vertical sidebar
export default function PlayerRoster({ players, facilitatorId, showVoteStatus = false, isCurrentUserFacilitator = false, onKickPlayer, theme }: PlayerRosterProps) {
  const facilitator = players.filter(p => p.role === 'facilitator');
  const activePlayers = players.filter(p => p.role === 'player');
  const observers = players.filter(p => p.role === 'observer');

  return (
    <aside className={`w-full md:w-60 border-b md:border-b-0 md:border-r p-2 md:p-4 flex flex-row md:flex-col gap-2 md:gap-4 overflow-x-auto md:overflow-x-visible md:overflow-y-auto ${theme.roster.background} ${theme.roster.border}`}>
      {/* Facilitator */}
      {facilitator.length > 0 && (
        <div className="flex flex-row md:flex-col gap-2 shrink-0">
          <h3 className={`hidden md:block text-xs font-semibold uppercase tracking-wide mb-2 ${theme.roster.headingText}`}>Facilitator</h3>
          {facilitator.map(p => (
            <PlayerAvatar key={p.id} player={p} facilitatorId={facilitatorId} showVoteStatus={showVoteStatus} theme={theme} />
          ))}
        </div>
      )}

      {/* Divider: dot on mobile, line on desktop */}
      {facilitator.length > 0 && activePlayers.length > 0 && (
        <>
          <span className="md:hidden text-gray-300 self-center shrink-0">·</span>
          <hr className={`hidden md:block ${theme.roster.dividerColor}`} />
        </>
      )}

      {/* Players */}
      {activePlayers.length > 0 && (
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 shrink-0">
          <h3 className={`hidden md:block text-xs font-semibold uppercase tracking-wide mb-2 ${theme.roster.headingText}`}>
            Players ({activePlayers.length})
          </h3>
          {activePlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between shrink-0">
              <PlayerAvatar player={p} facilitatorId={facilitatorId} showVoteStatus={showVoteStatus} theme={theme} />
              {/* Kick button — desktop only */}
              {isCurrentUserFacilitator && onKickPlayer && (
                <button
                  onClick={() => onKickPlayer(p.id)}
                  className={`hidden md:inline-block text-[10px] transition-colors px-1.5 py-0.5 rounded ${theme.roster.transferButton}`}
                  title={`Remove ${p.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      {observers.length > 0 && activePlayers.length > 0 && (
        <>
          <span className="md:hidden text-gray-300 self-center shrink-0">·</span>
          <hr className={`hidden md:block ${theme.roster.dividerColor}`} />
        </>
      )}

      {/* Observers */}
      {observers.length > 0 && (
        <div className="flex flex-row md:flex-col gap-2 md:gap-3 shrink-0">
          <h3 className={`hidden md:block text-xs font-semibold uppercase tracking-wide mb-2 ${theme.roster.headingText}`}>
            Observers ({observers.length})
          </h3>
          {observers.map(p => (
            <PlayerAvatar key={p.id} player={p} facilitatorId={facilitatorId} theme={theme} />
          ))}
        </div>
      )}
    </aside>
  );
}

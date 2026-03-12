import type { Player } from '../types/game';
import PlayerAvatar from './PlayerAvatar';

interface PlayerRosterProps {
  players: Player[];
  hostId: string;
  showVoteStatus?: boolean;
  isCurrentUserHost?: boolean;
  onTransferHost?: (playerId: string) => void;
}

// Sidebar roster grouped by role: Host → Players → Observers
export default function PlayerRoster({ players, hostId, showVoteStatus = false, isCurrentUserHost = false, onTransferHost }: PlayerRosterProps) {
  // Temporary debug — remove after verifying crown badge fix
  console.log('[PlayerRoster] hostId:', hostId, 'players:', players.map(p => ({ name: p.name, id: p.id, role: p.role })));

  const host = players.filter(p => p.role === 'host');
  const activePlayers = players.filter(p => p.role === 'player');
  const observers = players.filter(p => p.role === 'observer');

  return (
    <aside className="w-60 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
      {/* Host */}
      {host.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Host</h3>
          {host.map(p => (
            <PlayerAvatar key={p.id} player={p} hostId={hostId} showVoteStatus={showVoteStatus} />
          ))}
        </div>
      )}

      {/* Divider */}
      {host.length > 0 && activePlayers.length > 0 && <hr className="border-gray-200" />}

      {/* Players */}
      {activePlayers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Players ({activePlayers.length})
          </h3>
          <div className="flex flex-col gap-3">
            {activePlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <PlayerAvatar player={p} hostId={hostId} showVoteStatus={showVoteStatus} />
                {isCurrentUserHost && onTransferHost && p.isConnected && (
                  <button
                    onClick={() => onTransferHost(p.id)}
                    className="text-[10px] text-gray-400 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50"
                    title={`Make ${p.name} the host`}
                  >
                    👑
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {observers.length > 0 && activePlayers.length > 0 && <hr className="border-gray-200" />}

      {/* Observers */}
      {observers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Observers ({observers.length})
          </h3>
          <div className="flex flex-col gap-3">
            {observers.map(p => (
              <PlayerAvatar key={p.id} player={p} hostId={hostId} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

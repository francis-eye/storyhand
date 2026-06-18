import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { Role } from '../types/game';
import Footer from '../components/Footer';
import ArcadeShell from '../components/marketing/ArcadeShell';

// Join session form: session ID input, role selector cards, name field
export default function JoinSessionPage() {
  const navigate = useNavigate();
  const { actions } = useGameState();
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();

  const isInviteLink = !!urlSessionId;
  const [sessionId, setSessionId] = useState(urlSessionId?.toUpperCase() || '');
  const [role, setRole] = useState<'player' | 'observer'>('player');
  const [name, setName] = useState('');

  const canJoin = sessionId.trim().length === 6 && (role === 'observer' || name.trim());

  const [joinError, setJoinError] = useState('');

  const handleJoin = async () => {
    if (!canJoin) return;
    const id = sessionId.trim().toUpperCase();

    try {
      setJoinError('');
      await actions.joinGame(id, role as Role, role === 'player' ? name.trim() : undefined);
      navigate(`/session/${id}`);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join session');
    }
  };

  const labelClass = 'block font-pixel text-[10px] uppercase tracking-wider text-[#33ff33] mb-2';
  // Role card base + selected styling (explicit Tailwind borders so the selected
  // state cleanly overrides — the dark navy fill is the legibility substrate).
  const roleCard = (active: boolean) =>
    `p-4 text-center border-2 bg-[#1a1a2e] transition-all ${
      active
        ? 'border-[#ffa500] ring-2 ring-[#ffa500]/40'
        : 'border-[#33ff33]/30 hover:border-[#33ff33]/60'
    }`;

  return (
    <ArcadeShell>
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Form card */}
        <div className="pixel-panel p-6">
          <h2 className="font-pixel text-lg text-[#33ff33] theme-16bit-glow-green mb-6 text-center">JOIN A SESSION</h2>

          {isInviteLink && (
            <p className="font-pixel-body text-lg text-[#f5e6c8]/85 mb-5 text-center">
              You've been invited to session{' '}
              <span className="font-pixel text-xs text-[#ffa500]">{sessionId}</span>
            </p>
          )}

          <div className="flex flex-col gap-6">
            {/* Session ID — arcade "cheat code" entry */}
            <div>
              <label className={labelClass}>Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={e => setSessionId(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                readOnly={isInviteLink}
                className={`pixel-input pixel-input-code ${isInviteLink ? 'cursor-default opacity-70' : ''}`}
              />
            </div>

            {/* Role selector cards */}
            <div>
              <label className={labelClass}>Your Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setRole('player')} className={roleCard(role === 'player')}>
                  <p className="text-2xl mb-2">🃏</p>
                  <p className="font-pixel text-[10px] uppercase text-[#f5e6c8]">Player</p>
                  <p className="font-pixel-body text-base text-[#f5e6c8]/60 mt-1">Vote on estimates</p>
                </button>
                <button onClick={() => setRole('observer')} className={roleCard(role === 'observer')}>
                  <p className="text-2xl mb-2">👁</p>
                  <p className="font-pixel text-[10px] uppercase text-[#f5e6c8]">Observer</p>
                  <p className="font-pixel-body text-base text-[#f5e6c8]/60 mt-1">Watch silently</p>
                </button>
              </div>
            </div>

            {/* Name field (only for players) */}
            {role === 'player' && (
              <div>
                <label className={labelClass}>Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="pixel-input"
                />
                <p className="font-pixel-body text-base text-[#f5e6c8]/50 mt-1 text-right">{name.length}/20</p>
              </div>
            )}

            {/* Error message */}
            {joinError && (
              <p className="font-pixel-body text-lg text-[#ff8a8a] bg-[#8b1a1a]/30 border-2 border-red-600 px-3 py-2">
                {joinError}
              </p>
            )}

            {/* Join button */}
            <button
              onClick={handleJoin}
              disabled={!canJoin}
              className="btn-pixel-primary w-full"
            >
              Join Session
            </button>
          </div>
        </div>

        <Footer arcade />
      </div>
    </ArcadeShell>
  );
}

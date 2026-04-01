import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { Role } from '../types/game';
import Footer from '../components/Footer';

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

  return (
    <div className="max-w-md mx-auto mt-12 px-4 relative">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #e0deff 0%, transparent 70%)' }} />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #fef3c7 0%, transparent 70%)' }} />

      {/* Form card */}
      <div className="relative bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm border border-[var(--border-subtle)]">
        <h2 className="text-2xl font-black mb-6 text-gray-800 dark:text-white">Join a Session</h2>

        {isInviteLink && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You've been invited to session <span className="font-mono font-semibold">{sessionId}</span>
          </p>
        )}

        <div className="flex flex-col gap-5">
          {/* Session ID */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={e => setSessionId(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              readOnly={isInviteLink}
              className={`w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-space-mono text-lg tracking-widest text-center uppercase dark:bg-[var(--input-bg)] dark:border-[var(--input-border)] dark:text-[var(--text-primary)]
                ${isInviteLink ? 'bg-gray-100 text-gray-500 cursor-default' : ''}`}
            />
          </div>

          {/* Role selector cards */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Your Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRole('player')}
                className={`p-4 rounded-2xl border-2 text-center transition-all
                  ${role === 'player'
                    ? 'border-[#4f46e5] bg-[#f0edff] dark:bg-[#4f46e5]/10'
                    : 'border-gray-200 dark:border-gray-700 bg-[var(--surface-elevated)] hover:border-gray-300'
                  }`}
              >
                <p className="text-2xl mb-1">🃏</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">Player</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vote on estimates</p>
              </button>
              <button
                onClick={() => setRole('observer')}
                className={`p-4 rounded-2xl border-2 text-center transition-all
                  ${role === 'observer'
                    ? 'border-[#4f46e5] bg-[#f0edff] dark:bg-[#4f46e5]/10'
                    : 'border-gray-200 dark:border-gray-700 bg-[var(--surface-elevated)] hover:border-gray-300'
                  }`}
              >
                <p className="text-2xl mb-1">👁</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">Observer</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Watch silently</p>
              </button>
            </div>
          </div>

          {/* Name field (only for players) */}
          {role === 'player' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-[var(--input-bg)] dark:border-[var(--input-border)] dark:text-[var(--text-primary)]"
              />
            </div>
          )}

          {/* Error message */}
          {joinError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{joinError}</p>
          )}

          {/* Join button */}
          <button
            onClick={handleJoin}
            disabled={!canJoin}
            className="mt-2 w-full py-3 text-white rounded-xl font-bold text-lg transition-all hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: '#4f46e5' }}
          >
            Join Session
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

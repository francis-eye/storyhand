import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { Role } from '../types/game';
import Footer from '../components/Footer';

// Join session form: session ID input, role selector cards, name field
export default function JoinSessionPage() {
  const navigate = useNavigate();
  const { actions } = useGameState();

  const [sessionId, setSessionId] = useState('');
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
    <div className="max-w-md mx-auto mt-12 px-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Join a Session</h2>

      <div className="flex flex-col gap-5">
        {/* Session ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session ID</label>
          <input
            type="text"
            value={sessionId}
            onChange={e => setSessionId(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-lg tracking-widest text-center uppercase"
          />
        </div>

        {/* Role selector cards */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Role</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole('player')}
              className={`p-4 rounded-xl border-2 text-center transition-all
                ${role === 'player'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <p className="text-2xl mb-1">🃏</p>
              <p className="font-medium text-gray-800">Player</p>
              <p className="text-xs text-gray-500 mt-1">Vote on estimates</p>
            </button>
            <button
              onClick={() => setRole('observer')}
              className={`p-4 rounded-xl border-2 text-center transition-all
                ${role === 'observer'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <p className="text-2xl mb-1">👁</p>
              <p className="font-medium text-gray-800">Observer</p>
              <p className="text-xs text-gray-500 mt-1">Watch silently</p>
            </button>
          </div>
        </div>

        {/* Name field (only for players) */}
        {role === 'player' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
          className="mt-2 w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join Session
        </button>
      </div>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface DailyStats {
  sessionsCreated: number;
  playersJoined: number;
  roundsPlayed: number;
  activeSessions: number;
}

// Landing page with hero section and Create/Join CTAs
export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DailyStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {}); // silently fail — stats are non-essential
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-blue-600">Story</span>
          <span className="text-gray-800">hand</span>
        </h1>
        <p className="text-lg text-gray-600">
          Real-time story point estimation for distributed agile teams.
          No accounts, no setup, no downloads.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate('/create')}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Create Game
        </button>
        <button
          onClick={() => navigate('/join')}
          className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium text-lg hover:bg-blue-50 transition-colors"
        >
          Join Game
        </button>
      </div>

      {/* Feature highlights */}
      <div className="flex gap-8 mt-8 text-center">
        <div className="max-w-[160px]">
          <p className="text-2xl mb-1">🃏</p>
          <p className="text-sm text-gray-600">Fibonacci card deck with masked voting</p>
        </div>
        <div className="max-w-[160px]">
          <p className="text-2xl mb-1">⚡</p>
          <p className="text-sm text-gray-600">Real-time multiplayer estimation</p>
        </div>
        <div className="max-w-[160px]">
          <p className="text-2xl mb-1">📊</p>
          <p className="text-sm text-gray-600">Instant results with consensus detection</p>
        </div>
      </div>

      {/* Today's stats */}
      {stats && (
        <div className="flex gap-6 mt-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats.sessionsCreated}</p>
            <p className="text-xs text-gray-500">games today</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats.playersJoined}</p>
            <p className="text-xs text-gray-500">players today</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-2xl font-bold text-gray-800">{stats.roundsPlayed}</p>
            <p className="text-xs text-gray-500">rounds today</p>
          </div>
          {stats.activeSessions > 0 && (
            <>
              <div className="w-px bg-gray-200" />
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeSessions}</p>
                <p className="text-xs text-gray-500">live now</p>
              </div>
            </>
          )}
        </div>
      )}
      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-3 text-xs text-gray-400">
        <span>By <a href="https://github.com/francis-eye" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">francis-eye</a></span>
        <span>&middot;</span>
        <a onClick={() => navigate('/privacy')} className="hover:text-gray-600 cursor-pointer">Privacy Policy</a>
      </div>
    </div>
  );
}

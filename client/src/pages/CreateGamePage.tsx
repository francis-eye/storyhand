import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { GameSettings } from '../types/game';

// Create game form: game name, host name, voting system, advanced settings
export default function CreateGamePage() {
  const navigate = useNavigate();
  const { actions } = useGameState();

  const [gameName, setGameName] = useState('');
  const [hostName, setHostName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAverage, setShowAverage] = useState(true);
  const [showCountdown, setShowCountdown] = useState(true);
  const [inactivityTimeout, setInactivityTimeout] = useState(30);

  const canCreate = gameName.trim() && hostName.trim();

  const handleCreate = async () => {
    if (!canCreate) return;

    const settings: GameSettings = {
      gameName: gameName.trim(),
      votingSystem: 'fibonacci',
      showAverage,
      showCountdown,
      inactivityTimeout,
    };

    try {
      const sessionId = await actions.createGame(settings, hostName.trim());
      navigate(`/session/${sessionId}`);
    } catch (err) {
      // Error is set in context by useGameState
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create a Game</h2>

      <div className="flex flex-col gap-4">
        {/* Game name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
          <input
            type="text"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
            placeholder="Sprint 42 Planning"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Host name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (Host)</label>
          <input
            type="text"
            value={hostName}
            onChange={e => setHostName(e.target.value)}
            placeholder="Scrum Master Steve"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Voting system (locked to Fibonacci for now) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Voting System</label>
          <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm">
            Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕)
          </div>
        </div>

        {/* Advanced settings toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 text-left font-medium"
        >
          {showAdvanced ? '▾ Hide' : '▸ Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-3 pl-2 border-l-2 border-gray-200">
            {/* Show average */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAverage}
                onChange={e => setShowAverage(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">Show average after reveal</span>
            </label>

            {/* Show countdown */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCountdown}
                onChange={e => setShowCountdown(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">3-second countdown before reveal</span>
            </label>

            {/* Inactivity timeout */}
            <div>
              <label className="text-sm text-gray-700">
                Inactivity timeout: {inactivityTimeout} min
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={inactivityTimeout}
                onChange={e => setInactivityTimeout(Number(e.target.value))}
                className="w-full mt-1 accent-blue-600"
              />
            </div>
          </div>
        )}

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Game
        </button>
      </div>
    </div>
  );
}

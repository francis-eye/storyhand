import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { GameSettings, TableTheme } from '../types/game';
import { getAllThemes } from '../themes/themeRegistry';
import Footer from '../components/Footer';

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
  const [tableTheme, setTableTheme] = useState<TableTheme>('16bit');

  const canCreate = gameName.trim() && hostName.trim();

  const handleCreate = async () => {
    if (!canCreate) return;

    const settings: GameSettings = {
      gameName: gameName.trim(),
      votingSystem: 'fibonacci',
      showAverage,
      showCountdown,
      inactivityTimeout,
      tableTheme,
    };

    try {
      const sessionId = await actions.createGame(settings, hostName.trim());
      navigate(`/session/${sessionId}`);
    } catch (err) {
      // Error is set in context by useGameState
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4 relative">
      {/* Decorative gradient blobs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #e0deff 0%, transparent 70%)' }} />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #fef3c7 0%, transparent 70%)' }} />

      {/* Form card */}
      <div className="relative bg-[var(--surface-elevated)] rounded-2xl p-6 shadow-sm border border-[var(--border-subtle)]">
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: '#f0edff', color: '#4f46e5' }}>
            🎮 Now with 16-Bit Mode
          </span>
        </div>

        <h2 className="text-2xl font-black mb-6 text-gray-800 dark:text-white">Create a Game</h2>

        <div className="flex flex-col gap-4">
          {/* Game name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Game Name</label>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              placeholder="Sprint 42 Planning"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-[var(--input-bg)] dark:border-[var(--input-border)] dark:text-[var(--text-primary)]"
            />
          </div>

          {/* Host name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Your Name</label>
            <input
              type="text"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              placeholder="Scrum Master Steve"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-[var(--input-bg)] dark:border-[var(--input-border)] dark:text-[var(--text-primary)]"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{hostName.length}/20</p>
          </div>

          {/* Voting system (locked to Fibonacci for now) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Voting System</label>
            <div className="px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-sm dark:bg-[var(--bg-tertiary)] dark:border-[var(--border-default)] dark:text-[var(--text-secondary)]">
              Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕)
            </div>
          </div>

          {/* Table theme */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Table Theme</label>
            <select
              value={tableTheme}
              onChange={e => setTableTheme(e.target.value as TableTheme)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm dark:bg-[var(--input-bg)] dark:border-[var(--input-border)] dark:text-[var(--text-primary)]"
            >
              {getAllThemes().map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced settings toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 text-left font-medium"
          >
            {showAdvanced ? '▾ Hide' : '▸ Show'} Advanced Settings
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
              {/* Show average */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAverage}
                  onChange={e => setShowAverage(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show average after reveal</span>
              </label>

              {/* Show countdown */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCountdown}
                  onChange={e => setShowCountdown(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">3-second countdown before reveal</span>
              </label>

              {/* Inactivity timeout */}
              <div>
                <label className="text-sm text-gray-700 dark:text-gray-300">
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
            className="mt-4 w-full py-3 text-white rounded-xl font-bold text-lg transition-all hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: '#4f46e5' }}
          >
            Create Game
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

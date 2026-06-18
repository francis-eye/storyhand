import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import type { GameSettings, TableTheme } from '../types/game';
import { getAllThemes } from '../themes/themeRegistry';
import Footer from '../components/Footer';
import ArcadeShell from '../components/marketing/ArcadeShell';

// Down-pointing caret for the native <select>. Set as background-IMAGE (longhand) so it
// coexists with .pixel-input's background-COLOR — never use the `background` shorthand here
// or the caret gets wiped.
const SELECT_CARET =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2333ff33' d='M0 0h12L6 8z'/%3E%3C/svg%3E\")";

// Create game form: game name, host name, voting system, advanced settings
export default function CreateGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { actions } = useGameState();

  // "Play Again" passes the ended session's settings here to pre-fill the form.
  const prefill = (location.state as { prefill?: GameSettings } | null)?.prefill;

  const [gameName, setGameName] = useState(prefill?.gameName ?? '');
  const [hostName, setHostName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAverage, setShowAverage] = useState(prefill?.showAverage ?? true);
  const [showCountdown, setShowCountdown] = useState(prefill?.showCountdown ?? true);
  const [inactivityTimeout, setInactivityTimeout] = useState(prefill?.inactivityTimeout ?? 30);
  const [tableTheme, setTableTheme] = useState<TableTheme>(prefill?.tableTheme ?? '16bit');

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

  const labelClass = 'block font-pixel text-[10px] uppercase tracking-wider text-[#33ff33] mb-2';

  return (
    <ArcadeShell>
      <div className="max-w-md mx-auto px-4 py-12">
        {/* Form card */}
        <div className="pixel-panel p-6">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-2 bg-[#0d0d1a] border-2 border-[#33ff33]/40">
              <span>🎮</span>
              <span className="font-pixel text-[9px] uppercase tracking-wider text-[#33ff33]">16-Bit Mode</span>
            </span>
          </div>

          <h2 className="font-pixel text-lg text-[#33ff33] theme-16bit-glow-green mb-6 text-center">CREATE A GAME</h2>

          <div className="flex flex-col gap-5">
            {/* Game name */}
            <div>
              <label className={labelClass}>Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                placeholder="Sprint 42 Planning"
                className="pixel-input"
              />
            </div>

            {/* Host name */}
            <div>
              <label className={labelClass}>Your Name</label>
              <input
                type="text"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                placeholder="Scrum Master Steve"
                maxLength={20}
                className="pixel-input"
              />
              <p className="font-pixel-body text-base text-[#f5e6c8]/50 mt-1 text-right">{hostName.length}/20</p>
            </div>

            {/* Voting system (locked to Fibonacci for now) — real readonly input for AT/focus order */}
            <div>
              <label className={labelClass}>Voting System 🔒</label>
              <input
                type="text"
                readOnly
                disabled
                value="Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕)"
                aria-label="Voting system: Fibonacci (locked)"
                className="pixel-input cursor-not-allowed opacity-60"
                style={{ fontSize: '15px' }}
              />
            </div>

            {/* Table theme */}
            <div>
              <label className={labelClass}>Table Theme</label>
              <select
                value={tableTheme}
                onChange={e => setTableTheme(e.target.value as TableTheme)}
                className="pixel-input appearance-none cursor-pointer"
                style={{
                  backgroundImage: SELECT_CARET,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '36px',
                }}
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
              className="font-pixel text-[9px] uppercase tracking-wider text-[#ffa500]/80 hover:text-[#ffa500] text-left transition-colors"
            >
              {showAdvanced ? '▾ Hide' : '▸ Show'} Advanced Settings
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-4 pl-3 border-l-2 border-[#33ff33]/30">
                {/* Show average */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAverage}
                    onChange={e => setShowAverage(e.target.checked)}
                    className="w-4 h-4 accent-[#33ff33]"
                  />
                  <span className="font-pixel-body text-lg text-[#f5e6c8]/90">Show average after reveal</span>
                </label>

                {/* Show countdown */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCountdown}
                    onChange={e => setShowCountdown(e.target.checked)}
                    className="w-4 h-4 accent-[#33ff33]"
                  />
                  <span className="font-pixel-body text-lg text-[#f5e6c8]/90">3-second countdown before reveal</span>
                </label>

                {/* Inactivity timeout */}
                <div>
                  <label className="font-pixel-body text-lg text-[#f5e6c8]/90">
                    Inactivity timeout: <span className="text-[#ffa500]">{inactivityTimeout} min</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={inactivityTimeout}
                    onChange={e => setInactivityTimeout(Number(e.target.value))}
                    className="w-full mt-2 accent-[#ffa500]"
                  />
                </div>
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="btn-pixel-primary w-full mt-2"
            >
              Create Game
            </button>
          </div>
        </div>

        <Footer arcade />
      </div>
    </ArcadeShell>
  );
}

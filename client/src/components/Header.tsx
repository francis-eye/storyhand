import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useFeedback } from '../hooks/useFeedback';
import DarkModeToggle from './DarkModeToggle';
import Logo from './Logo';

// App header with Storyhand logo and navigation
export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, currentPlayerId, actions } = useGameState();
  const { openFeedback } = useFeedback();
  const isLanding = location.pathname === '/';
  const inSession = !!state;
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  const currentPlayer = state?.players.find(p => p.id === currentPlayerId);
  const isFacilitator = currentPlayer?.role === 'facilitator';
  const arcade = state?.settings.tableTheme === '16bit';

  const handleExit = () => {
    if (inSession && isFacilitator) {
      // Facilitator ends the session for everyone — confirm first (no accidental nuke).
      setConfirmingEnd(true);
    } else if (inSession) {
      // Non-facilitator just leaves and goes home.
      actions.leaveGame();
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const confirmEnd = () => {
    setConfirmingEnd(false);
    actions.endSession(); // summary card handles navigation
  };

  return (
    <>{/* header + optional end-session confirmation */}
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[#1a1a2e] border-b-2 border-[#33ff33]/30">
      <button
        onClick={inSession ? handleExit : () => navigate('/')}
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        {/* Storyhand pixel logo: card "S" mark + neon wordmark */}
        <Logo variant="horizontal" />
      </button>

      <div className="flex items-center gap-2">
        <DarkModeToggle />
        {!isLanding && (
          <button
            onClick={openFeedback}
            className="font-pixel text-[10px] uppercase tracking-wider text-[#ffa500]/70 hover:text-[#ffa500] border-2 border-[#ffa500]/40 hover:border-[#ffa500] px-3 py-2 rounded-none transition-colors"
          >
            Feedback
          </button>
        )}
        {!isLanding && (
          <button
            onClick={handleExit}
            className="font-pixel text-[10px] uppercase tracking-wider text-[#ffa500]/70 hover:text-[#ffa500] border-2 border-[#ffa500]/40 hover:border-[#ffa500] px-3 py-2 rounded-none transition-colors"
          >
            Exit
          </button>
        )}
      </div>
    </header>

    {confirmingEnd && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className={arcade ? 'pixel-panel p-6 max-w-sm w-full text-center' : 'bg-[var(--surface-elevated)] rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-[var(--border-default)]'}>
          <h3 className={arcade ? 'font-pixel text-sm text-[#ffa500] theme-16bit-glow mb-4' : 'text-lg font-black text-[var(--text-primary)] mb-3'}>
            End session?
          </h3>
          <p className={arcade ? 'font-pixel-body text-lg text-[#f5e6c8]/85 mb-6 leading-snug' : 'text-sm text-[var(--text-secondary)] mb-6'}>
            This ends the game for everyone in the room. It can't be undone.
          </p>
          <div className="flex flex-col gap-2">
            {arcade ? (
              <>
                <button onClick={confirmEnd} className="btn-pixel-primary w-full">End Session</button>
                <button onClick={() => setConfirmingEnd(false)} className="btn-pixel-secondary w-full">Keep Playing</button>
              </>
            ) : (
              <>
                <button onClick={confirmEnd} className="w-full py-2.5 text-sm font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 transition-colors">End Session</button>
                <button onClick={() => setConfirmingEnd(false)} className="w-full py-2.5 text-sm font-medium rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">Keep Playing</button>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

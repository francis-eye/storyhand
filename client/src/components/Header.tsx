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

  const currentPlayer = state?.players.find(p => p.id === currentPlayerId);
  const isFacilitator = currentPlayer?.role === 'facilitator';

  const handleExit = () => {
    if (inSession && isFacilitator) {
      // Facilitator ends the session — summary card handles navigation
      actions.endSession();
    } else if (inSession) {
      // Non-facilitator leaves and goes home
      actions.leaveGame();
      navigate('/');
    } else {
      navigate('/');
    }
  };

  return (
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
  );
}

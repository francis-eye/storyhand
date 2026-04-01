import { useLocation, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import { useFeedback } from '../hooks/useFeedback';
import DarkModeToggle from './DarkModeToggle';

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
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white dark:bg-[#12121f] dark:border-gray-700">
      <button
        onClick={inSession ? handleExit : () => navigate('/')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {/* Storyhand text logo */}
        <span className="text-xl font-bold tracking-tight font-space-mono">
          <span className="text-blue-600">Story</span>
          <span className="text-gray-800 dark:text-gray-200">hand</span>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <DarkModeToggle />
        {!isLanding && (
          <button
            onClick={openFeedback}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Feedback
          </button>
        )}
        {!isLanding && (
          <button
            onClick={handleExit}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Exit
          </button>
        )}
      </div>
    </header>
  );
}

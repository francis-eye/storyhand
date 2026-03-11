import { useLocation, useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';

// App header with Storyhand logo and navigation
export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, actions } = useGameState();
  const isLanding = location.pathname === '/';
  const inSession = !!state;

  const handleExit = () => {
    if (inSession) actions.leaveGame();
    navigate('/');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <button
        onClick={inSession ? handleExit : () => navigate('/')}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {/* Storyhand text logo */}
        <span className="text-xl font-bold tracking-tight">
          <span className="text-blue-600">Story</span>
          <span className="text-gray-800">hand</span>
        </span>
      </button>

      {!isLanding && (
        <button
          onClick={handleExit}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Exit
        </button>
      )}
    </header>
  );
}

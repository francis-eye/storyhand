import { useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onExit?: () => void;
}

// App header with Storyhand logo and navigation
export default function Header({ onExit }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  const handleExit = () => {
    if (onExit) onExit();
    navigate('/');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <button
        onClick={() => navigate('/')}
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

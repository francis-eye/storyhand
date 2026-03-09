import { useNavigate } from 'react-router-dom';

// Landing page with hero section and Create/Join CTAs
export default function LandingPage() {
  const navigate = useNavigate();

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
    </div>
  );
}

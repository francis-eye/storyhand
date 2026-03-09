import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import SessionHeader from '../components/SessionHeader';
import PlayerRoster from '../components/PlayerRoster';
import GameTable from '../components/GameTable';
import CardDeck from '../components/CardDeck';
import HostControls from '../components/HostControls';

// Full session view: sidebar roster, game table, card deck, host controls
export default function SessionPage() {
  const navigate = useNavigate();
  const { state, currentPlayerId, actions } = useGameState();

  // If no active game state, redirect to landing
  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">No active session found.</p>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:underline"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.role === 'host';
  const isPlayer = currentPlayer?.role === 'player';
  const isVotingPhase = state.phase === 'voting';
  const playerCount = state.players.filter(p => p.role === 'player').length;
  const votedCount = state.players.filter(p => p.role === 'player' && p.hasVoted).length;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Session header */}
      <SessionHeader
        gameName={state.settings.gameName}
        sessionId={state.sessionId}
        currentRound={state.currentRound}
        phase={state.phase}
        isReVoting={state.isReVoting}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar roster */}
        <PlayerRoster
          players={state.players}
          showVoteStatus={state.phase === 'voting' || state.phase === 'countdown'}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Game table */}
          <GameTable
            players={state.players}
            phase={state.phase}
            showAverage={state.settings.showAverage}
            countdownValue={state.countdownValue}
          />

          {/* Card deck for players */}
          {isPlayer && (
            <div className="border-t border-gray-200 bg-white">
              <CardDeck
                selectedValue={currentPlayer?.vote ?? null}
                onSelect={actions.playCard}
                disabled={!isVotingPhase}
              />
            </div>
          )}
        </div>
      </div>

      {/* Host controls */}
      {isHost && (
        <HostControls
          phase={state.phase}
          onReveal={actions.revealCards}
          onReVote={actions.reVote}
          onNewRound={actions.startNewRound}
          votedCount={votedCount}
          totalPlayers={playerCount}
          countdownValue={state.countdownValue}
        />
      )}
    </div>
  );
}

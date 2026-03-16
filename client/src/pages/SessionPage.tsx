import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import SessionHeader from '../components/SessionHeader';
import PlayerRoster from '../components/PlayerRoster';
import GameTable from '../components/GameTable';
import CardDeck from '../components/CardDeck';
import HostControls from '../components/HostControls';
import { canVote } from '../utils/session';
import Footer from '../components/Footer';

// Full session view: sidebar roster, game table, card deck, host controls
export default function SessionPage() {
  const navigate = useNavigate();
  const { state, currentPlayerId, selectedCard, actions, isReconnecting } = useGameState();

  // While reconnecting after page refresh, show a loading state instead of flashing "No active session"
  if (isReconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500">Reconnecting to session...</p>
      </div>
    );
  }

  // If no active game state, show fallback
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
        <Footer />
      </div>
    );
  }

  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isHost = currentPlayer?.role === 'host';
  const isPlayer = currentPlayer?.role === 'player';
  const isVotingPhase = state.phase === 'voting';
  const playerCount = state.players.filter(p => canVote(p)).length;
  const votedCount = state.players.filter(p => canVote(p) && p.hasVoted).length;

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

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Roster: horizontal bar on mobile, sidebar on desktop */}
        <PlayerRoster
          players={state.players}
          hostId={state.hostId}
          showVoteStatus={state.phase === 'voting' || state.phase === 'countdown'}
          isCurrentUserHost={isHost}
          onTransferHost={actions.transferHost}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Game table */}
          <GameTable
            players={state.players}
            phase={state.phase}
            showAverage={state.settings.showAverage}
            countdownValue={state.countdownValue}
          />

          {/* Host controls — in-flow on mobile, floating on desktop */}
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

          {/* Card deck for voters (host + players) */}
          {(isPlayer || isHost) && (
            <div className="border-t border-gray-200 bg-white">
              <CardDeck
                selectedValue={selectedCard}
                onSelect={actions.playCard}
                disabled={!isVotingPhase}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

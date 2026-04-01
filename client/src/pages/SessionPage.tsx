import { useNavigate } from 'react-router-dom';
import { useGameState } from '../hooks/useGameState';
import SessionHeader from '../components/SessionHeader';
import PlayerBar from '../components/PlayerBar';
import GameTable from '../components/GameTable';
import CardDeck from '../components/CardDeck';
import GameControls from '../components/GameControls';
import { canVote } from '../utils/session';
import { getTheme } from '../themes/themeRegistry';
import Footer from '../components/Footer';
import AchievementToast from '../components/AchievementToast';
import SessionSummaryCard from '../components/SessionSummaryCard';

// Full session view: sidebar roster, game table, card deck, host controls
export default function SessionPage() {
  const navigate = useNavigate();
  const { state, currentPlayerId, selectedCard, actions, isReconnecting, missedRounds, clearMissedRounds, currentAchievement, sessionSummary, clearSessionSummary } = useGameState();

  // While reconnecting after page refresh, show a loading state instead of flashing "No active session"
  if (isReconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400">Reconnecting to session...</p>
      </div>
    );
  }

  // Show session summary overlay even when state is null (session just ended)
  if (!state && sessionSummary) {
    return (
      <SessionSummaryCard
        summary={sessionSummary}
        onDone={() => {
          clearSessionSummary();
          navigate('/');
        }}
      />
    );
  }

  // If no active game state, show fallback
  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 dark:text-gray-400">No active session found.</p>
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

  const theme = getTheme(state.settings.tableTheme);
  const currentPlayer = state.players.find(p => p.id === currentPlayerId);
  const isFacilitator = currentPlayer?.role === 'facilitator';
  const isPlayer = currentPlayer?.role === 'player';
  const canVoteInSession = isFacilitator || isPlayer;
  const isVotingPhase = state.phase === 'voting';
  const playerCount = state.players.filter(p => canVote(p)).length;
  const votedCount = state.players.filter(p => canVote(p) && p.hasVoted).length;
  const unvotedPlayerNames = state.players
    .filter(p => canVote(p) && !p.hasVoted && p.isConnected)
    .map(p => p.name);

  return (
    <div className={`flex flex-col h-[calc(100vh-65px)] ${theme.wrapper}`}>
      {missedRounds > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {missedRounds} round{missedRounds > 1 ? 's' : ''} completed while you were away
          </span>
          <button
            onClick={clearMissedRounds}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Session header */}
      <SessionHeader
        gameName={state.settings.gameName}
        sessionId={state.sessionId}
        currentRound={state.currentRound}
        phase={state.phase}
        isReVoting={state.isReVoting}
        theme={theme}
        consensusStreak={state.consensusStreak}
      />

      {/* Player bar — replaces sidebar roster */}
      <PlayerBar
        players={state.players}
        facilitatorId={state.facilitatorId}
        showVoteStatus={state.phase === 'voting' || state.phase === 'countdown'}
        isCurrentUserFacilitator={isFacilitator}
        onKickPlayer={actions.kickPlayer}
        theme={theme}
      />

      {/* Game table — takes all remaining vertical space */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <GameTable
          players={state.players}
          phase={state.phase}
          showAverage={state.settings.showAverage}
          countdownValue={state.countdownValue}
          theme={theme}
        />
        {currentAchievement && (
          <AchievementToast achievement={currentAchievement} theme={theme} />
        )}
      </div>

      {/* Game controls — visible to all voters */}
      {canVoteInSession && (
        <GameControls
          phase={state.phase}
          onReveal={actions.revealCards}
          onReVote={actions.reVote}
          onNewRound={actions.startNewRound}
          votedCount={votedCount}
          totalPlayers={playerCount}
          countdownValue={state.countdownValue}
          unvotedPlayerNames={unvotedPlayerNames}
          theme={theme}
        />
      )}

      {/* Card deck for voters (host + players) */}
      {canVoteInSession && (
        <CardDeck
          selectedValue={selectedCard}
          onSelect={actions.playCard}
          disabled={!isVotingPhase}
          theme={theme}
        />
      )}

      {sessionSummary && (
        <SessionSummaryCard
          summary={sessionSummary}
          onDone={() => {
            clearSessionSummary();
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

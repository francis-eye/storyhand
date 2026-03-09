import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Container, Grid } from '@mui/material'
import { useGame } from '../hooks/useGameState'
import { SessionHeader } from '../components/SessionHeader'
import { PlayerRoster } from '../components/PlayerRoster'
import { GameTable } from '../components/GameTable'
import { CardDeck } from '../components/CardDeck'
import { HostControls } from '../components/HostControls'
export const SessionPage: React.FC = () => {
  const { id } = useParams<{
    id: string
  }>()
  const navigate = useNavigate()
  const {
    gameState,
    currentUser,
    playCard,
    revealCards,
    startNewRound,
    reVote,
  } = useGame()
  // Redirect if no game state or not joined
  useEffect(() => {
    if (!gameState || !currentUser) {
      // In a real app we might try to join automatically or show a loading state
      // For MVP, if they refresh and lose state, send back to join with ID
      navigate('/join', {
        state: {
          sessionId: id,
        },
      })
    }
  }, [gameState, currentUser, navigate, id])
  if (!gameState || !currentUser) {
    return null // or a loading spinner
  }
  const isHost = currentUser.role === 'host'
  const isPlayer = currentUser.role === 'player'
  const isVotingPhase = gameState.phase === 'voting'
  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
      <Container maxWidth="xl" className="flex-grow flex flex-col py-4 h-full">
        <SessionHeader gameState={gameState} />

        <Grid container spacing={3} className="flex-grow min-h-0">
          {/* Sidebar - Roster */}
          <Grid item xs={12} md={3} lg={2.5} className="h-full hidden md:block">
            <PlayerRoster
              players={gameState.players}
              hostId={gameState.hostId}
              showVotes={gameState.phase === 'revealed'}
            />
          </Grid>

          {/* Main Table Area */}
          <Grid
            item
            xs={12}
            md={9}
            lg={9.5}
            className="h-full flex flex-col relative"
          >
            <div className="flex-grow min-h-0 pb-4">
              <GameTable gameState={gameState} />
            </div>
          </Grid>
        </Grid>
      </Container>

      {/* Bottom Areas */}
      {isPlayer && (
        <CardDeck
          selectedCard={currentUser.vote}
          onSelectCard={(val) => playCard(currentUser.id, val)}
          disabled={!isVotingPhase}
        />
      )}

      {isHost && (
        <HostControls
          gameState={gameState}
          onReveal={revealCards}
          onNewRound={startNewRound}
          onReVote={reVote}
        />
      )}
    </div>
  )
}

import React from 'react'
import { Paper, Button, Tooltip } from '@mui/material'
import { PlayIcon, PlusIcon, RefreshCwIcon } from 'lucide-react'
import { GameState } from '../types/game'
interface HostControlsProps {
  gameState: GameState
  onReveal: () => void
  onNewRound: () => void
  onReVote: () => void
}
export const HostControls: React.FC<HostControlsProps> = ({
  gameState,
  onReveal,
  onNewRound,
  onReVote,
}) => {
  const isVoting = gameState.phase === 'voting'
  const isRevealed = gameState.phase === 'revealed'
  const players = gameState.players.filter((p) => p.role === 'player')
  const votedCount = players.filter((p) => p.hasVoted).length
  const canReveal = isVoting && votedCount > 0
  return (
    <Paper
      elevation={6}
      className="fixed bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 rounded-full px-6 py-3 flex items-center gap-4 bg-gray-900 z-50 border border-gray-700"
    >
      {isVoting && (
        <Tooltip title={canReveal ? 'Reveal all cards' : 'Waiting for votes'}>
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayIcon size={18} />}
              onClick={onReveal}
              disabled={!canReveal}
              className="rounded-full px-6 py-2 font-bold shadow-lg"
            >
              Reveal Cards
            </Button>
          </span>
        </Tooltip>
      )}

      {isRevealed && (
        <>
          <Tooltip title="Clear table and re-vote on the SAME item">
            <Button
              variant="outlined"
              startIcon={<RefreshCwIcon size={18} />}
              onClick={onReVote}
              className="rounded-full px-6 py-2 font-bold border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              Re-Vote
            </Button>
          </Tooltip>

          <Tooltip title="Clear table and start a NEW round">
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlusIcon size={18} />}
              onClick={onNewRound}
              className="rounded-full px-6 py-2 font-bold shadow-lg"
            >
              New Round
            </Button>
          </Tooltip>
        </>
      )}
    </Paper>
  )
}

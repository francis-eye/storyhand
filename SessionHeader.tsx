import React, { useState } from 'react'
import {
  Paper,
  Typography,
  Chip,
  IconButton,
  Snackbar,
  Tooltip,
} from '@mui/material'
import { CopyIcon, CheckIcon, TimerIcon } from 'lucide-react'
import { GameState } from '../types/game'
interface SessionHeaderProps {
  gameState: GameState
}
export const SessionHeader: React.FC<SessionHeaderProps> = ({ gameState }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(gameState.sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const getPhaseColor = () => {
    switch (gameState.phase) {
      case 'voting':
        return 'primary'
      case 'countdown':
        return 'warning'
      case 'revealed':
        return 'success'
      default:
        return 'default'
    }
  }
  const getPhaseLabel = () => {
    switch (gameState.phase) {
      case 'voting':
        return 'Voting...'
      case 'countdown':
        return 'Revealing...'
      case 'revealed':
        return 'Results'
      default:
        return 'Waiting'
    }
  }
  return (
    <Paper
      elevation={1}
      className="px-4 py-3 mb-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 bg-white"
    >
      <div className="flex items-center gap-4">
        <Typography variant="h5" className="font-bold text-gray-800">
          {gameState.settings.gameName}
        </Typography>
        <Chip
          label={`Round ${gameState.currentRound}`}
          size="small"
          variant="outlined"
          className="font-medium"
        />
      </div>

      <div className="flex items-center gap-4">
        <Chip
          label={getPhaseLabel()}
          color={getPhaseColor()}
          icon={
            gameState.phase === 'countdown' ? (
              <TimerIcon size={16} />
            ) : undefined
          }
          className="font-bold"
        />

        <div className="flex items-center bg-gray-100 rounded-full pl-3 pr-1 py-1">
          <Typography
            variant="body2"
            className="font-mono font-bold text-gray-700 mr-2 tracking-widest"
          >
            ID: {gameState.sessionId}
          </Typography>
          <Tooltip title="Copy Session ID">
            <IconButton
              size="small"
              onClick={handleCopy}
              className="bg-white shadow-sm hover:bg-gray-50"
            >
              {copied ? (
                <CheckIcon size={14} className="text-green-600" />
              ) : (
                <CopyIcon size={14} className="text-gray-600" />
              )}
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <Snackbar
        open={copied}
        message="Session ID copied to clipboard"
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        autoHideDuration={2000}
      />
    </Paper>
  )
}

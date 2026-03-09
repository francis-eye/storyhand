import React from 'react'
import { Avatar, Typography, Badge, Tooltip } from '@mui/material'
import { CheckCircleIcon, CrownIcon, EyeIcon } from 'lucide-react'
import { Player, CardValue } from '../types/game'
import { stringToColor } from '../utils/session'
import { PlayingCard } from './PlayingCard'
interface PlayerAvatarProps {
  player: Player
  showVote: boolean
  isHost?: boolean
}
export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  showVote,
  isHost,
}) => {
  const bgColor = stringToColor(player.name)
  const initial = player.name.charAt(0).toUpperCase()
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <Badge
          overlap="circular"
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          badgeContent={
            isHost ? (
              <Tooltip title="Host">
                <div className="bg-amber-500 rounded-full p-0.5 border-2 border-white">
                  <CrownIcon size={10} className="text-white" />
                </div>
              </Tooltip>
            ) : player.role === 'observer' ? (
              <Tooltip title="Observer">
                <div className="bg-gray-500 rounded-full p-0.5 border-2 border-white">
                  <EyeIcon size={10} className="text-white" />
                </div>
              </Tooltip>
            ) : player.hasVoted && !showVote ? (
              <div className="bg-green-500 rounded-full p-0.5 border-2 border-white">
                <CheckCircleIcon size={10} className="text-white" />
              </div>
            ) : null
          }
        >
          <Avatar
            sx={{
              bgcolor: bgColor,
              width: 40,
              height: 40,
            }}
            className={`${!player.isConnected ? 'opacity-50 grayscale' : ''}`}
          >
            {initial}
          </Avatar>
        </Badge>

        <div className="flex flex-col">
          <Typography
            variant="body2"
            className={`font-medium ${!player.isConnected ? 'text-gray-400' : 'text-gray-800'}`}
          >
            {player.name}{' '}
            {isHost && (
              <span className="text-gray-400 font-normal text-xs ml-1">
                (Host)
              </span>
            )}
          </Typography>
          {!player.isConnected && (
            <Typography variant="caption" color="error">
              Disconnected
            </Typography>
          )}
        </div>
      </div>

      {player.role === 'player' && (
        <div className="w-12 flex justify-end">
          {showVote && player.vote !== undefined ? (
            <PlayingCard value={player.vote} faceUp={true} size="small" />
          ) : player.hasVoted ? (
            <PlayingCard faceUp={false} size="small" />
          ) : (
            <div className="w-12 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
              <Typography variant="caption" className="text-gray-400">
                ...
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

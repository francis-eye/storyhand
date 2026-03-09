import React from 'react'
import { Paper, Typography, Divider, List, ListItem } from '@mui/material'
import { UsersIcon } from 'lucide-react'
import { Player } from '../types/game'
import { PlayerAvatar } from './PlayerAvatar'
interface PlayerRosterProps {
  players: Player[]
  hostId: string
  showVotes: boolean
}
export const PlayerRoster: React.FC<PlayerRosterProps> = ({
  players,
  hostId,
  showVotes,
}) => {
  const host = players.find((p) => p.id === hostId)
  const activePlayers = players.filter((p) => p.role === 'player')
  const observers = players.filter(
    (p) => p.role === 'observer' && p.id !== hostId,
  )
  return (
    <Paper
      elevation={1}
      className="h-full flex flex-col bg-white border-r border-gray-200 rounded-none sm:rounded-lg overflow-hidden"
    >
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <UsersIcon size={20} className="text-indigo-600" />
        <Typography variant="h6" className="font-bold text-gray-800">
          Participants ({players.length})
        </Typography>
      </div>

      <div className="flex-grow overflow-y-auto p-2 hide-scrollbar">
        {host && (
          <div className="mb-4">
            <Typography
              variant="overline"
              className="px-2 text-gray-500 font-bold tracking-wider"
            >
              Host
            </Typography>
            <PlayerAvatar player={host} showVote={showVotes} isHost={true} />
          </div>
        )}

        {activePlayers.length > 0 && (
          <div className="mb-4">
            <Typography
              variant="overline"
              className="px-2 text-gray-500 font-bold tracking-wider"
            >
              Players ({activePlayers.length})
            </Typography>
            <List disablePadding>
              {activePlayers.map((player) => (
                <ListItem key={player.id} disablePadding className="mb-1">
                  <div className="w-full">
                    <PlayerAvatar player={player} showVote={showVotes} />
                  </div>
                </ListItem>
              ))}
            </List>
          </div>
        )}

        {observers.length > 0 && (
          <div>
            <Divider className="my-2" />
            <Typography
              variant="overline"
              className="px-2 text-gray-500 font-bold tracking-wider"
            >
              Observers ({observers.length})
            </Typography>
            <List disablePadding>
              {observers.map((player) => (
                <ListItem key={player.id} disablePadding className="mb-1">
                  <div className="w-full">
                    <PlayerAvatar player={player} showVote={showVotes} />
                  </div>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </div>
    </Paper>
  )
}

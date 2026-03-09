import React from 'react'
import { Paper, Typography, Box, Divider } from '@mui/material'
import { CheckCircleIcon, AlertTriangleIcon } from 'lucide-react'
import { CardValue, Player } from '../types/game'
import { calculateAverage, checkConsensus } from '../utils/session'
interface ResultsPanelProps {
  players: Player[]
  showAverage: boolean
}
export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  players,
  showAverage,
}) => {
  const votes = players
    .filter((p) => p.role === 'player' && p.hasVoted && p.vote !== undefined)
    .map((p) => p.vote as CardValue)
  if (votes.length === 0) return null
  const average = calculateAverage(votes)
  const hasConsensus = checkConsensus(votes)
  // Calculate distribution
  const distribution = votes.reduce(
    (acc, vote) => {
      const key = String(vote)
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const maxVotes = Math.max(...Object.values(distribution))
  // Sort keys: numbers first, then specials
  const sortedKeys = Object.keys(distribution).sort((a, b) => {
    const numA = Number(a)
    const numB = Number(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    if (!isNaN(numA)) return -1
    if (!isNaN(numB)) return 1
    return a.localeCompare(b)
  })
  return (
    <Paper
      elevation={4}
      className="p-6 rounded-xl w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm"
    >
      <Typography
        variant="h5"
        className="font-bold text-center mb-6 text-gray-800"
      >
        Round Results
      </Typography>

      {hasConsensus && average !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center justify-center gap-2 text-green-700">
          <CheckCircleIcon size={20} />
          <Typography className="font-bold">Full Consensus! 🎉</Typography>
        </div>
      )}

      {!hasConsensus && sortedKeys.length > 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-center justify-center gap-2 text-amber-700">
          <AlertTriangleIcon size={20} />
          <Typography className="font-medium">
            High variance. Discussion recommended.
          </Typography>
        </div>
      )}

      <div className="flex justify-around items-center mb-6">
        {showAverage && average !== null && (
          <div className="text-center">
            <Typography
              variant="body2"
              color="textSecondary"
              className="uppercase tracking-wider font-bold mb-1"
            >
              Average
            </Typography>
            <Typography variant="h3" color="primary" className="font-black">
              {average}
            </Typography>
          </div>
        )}

        <div className="text-center">
          <Typography
            variant="body2"
            color="textSecondary"
            className="uppercase tracking-wider font-bold mb-1"
          >
            Votes
          </Typography>
          <Typography variant="h3" className="font-black text-gray-700">
            {votes.length}
          </Typography>
        </div>
      </div>

      <Divider className="my-4" />

      <div>
        <Typography
          variant="subtitle2"
          color="textSecondary"
          className="mb-3 font-bold uppercase"
        >
          Vote Distribution
        </Typography>
        <div className="space-y-3">
          {sortedKeys.map((key) => {
            const count = distribution[key]
            const percentage = (count / maxVotes) * 100
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-8 text-right font-bold text-gray-700">
                  {key}
                </div>
                <div className="flex-grow bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <div className="w-8 text-sm text-gray-500 font-medium">
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Paper>
  )
}

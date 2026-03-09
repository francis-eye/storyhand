import { CardValue, Player } from '../types/game'

export const generateSessionId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const generatePlayerId = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

export const calculateAverage = (votes: CardValue[]): number | null => {
  const numericVotes = votes.filter((v): v is number => typeof v === 'number')
  if (numericVotes.length === 0) return null

  const sum = numericVotes.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / numericVotes.length) * 10) / 10
}

export const checkConsensus = (votes: CardValue[]): boolean => {
  const numericVotes = votes.filter((v): v is number => typeof v === 'number')
  if (numericVotes.length <= 1) return false

  const firstVote = numericVotes[0]
  return numericVotes.every((v) => v === firstVote)
}

export const formatCardValue = (value: CardValue): string => {
  return value.toString()
}

export const stringToColor = (string: string) => {
  let hash = 0
  let i
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff
    color += `00${value.toString(16)}`.slice(-2)
  }
  return color
}

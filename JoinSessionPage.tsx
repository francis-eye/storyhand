import React, { useState } from 'react'
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
} from '@mui/material'
import { UsersIcon, EyeIcon, ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../hooks/useGameState'
import { Role } from '../types/game'
export const JoinSessionPage: React.FC = () => {
  const navigate = useNavigate()
  const { joinGame } = useGame()
  const [sessionId, setSessionId] = useState('')
  const [role, setRole] = useState<Role>('player')
  const [playerName, setPlayerName] = useState('')
  const [errors, setErrors] = useState({
    sessionId: false,
    playerName: false,
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = {
      sessionId: sessionId.trim().length !== 6,
      playerName: role === 'player' && !playerName.trim(),
    }
    setErrors(newErrors)
    if (!newErrors.sessionId && !newErrors.playerName) {
      joinGame(
        sessionId.toUpperCase(),
        role,
        role === 'player' ? playerName : undefined,
      )
      navigate(`/session/${sessionId.toUpperCase()}`)
    }
  }
  return (
    <Container maxWidth="sm" className="py-12">
      <Button
        startIcon={<ArrowLeftIcon size={18} />}
        onClick={() => navigate('/')}
        className="mb-6 text-gray-500 hover:text-gray-900"
      >
        Back to Home
      </Button>

      <Paper elevation={3} className="p-8 rounded-xl">
        <Typography
          variant="h4"
          className="mb-8 font-bold text-center text-gray-900"
        >
          Join a Session
        </Typography>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <TextField
            label="Session ID"
            placeholder="e.g. A1B2C3"
            variant="outlined"
            fullWidth
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value.toUpperCase())}
            error={errors.sessionId}
            helperText={
              errors.sessionId
                ? 'Please enter a valid 6-character Session ID'
                : ''
            }
            inputProps={{
              maxLength: 6,
              style: {
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 'bold',
              },
            }}
            autoFocus
          />

          <div>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              className="mb-3"
            >
              Select your role
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Card
                  variant="outlined"
                  className={`h-full transition-all ${role === 'player' ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                >
                  <CardActionArea
                    onClick={() => setRole('player')}
                    className="h-full p-4 text-center"
                  >
                    <UsersIcon
                      className={`mx-auto mb-2 ${role === 'player' ? 'text-indigo-600' : 'text-gray-400'}`}
                    />
                    <Typography variant="subtitle1" className="font-bold">
                      Player
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Vote on story points
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card
                  variant="outlined"
                  className={`h-full transition-all ${role === 'observer' ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                >
                  <CardActionArea
                    onClick={() => setRole('observer')}
                    className="h-full p-4 text-center"
                  >
                    <EyeIcon
                      className={`mx-auto mb-2 ${role === 'observer' ? 'text-indigo-600' : 'text-gray-400'}`}
                    />
                    <Typography variant="subtitle1" className="font-bold">
                      Observer
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Watch without voting
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            </Grid>
          </div>

          {role === 'player' && (
            <TextField
              label="Display Name"
              placeholder="Enter your name"
              variant="outlined"
              fullWidth
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              error={errors.playerName}
              helperText={
                errors.playerName ? 'Name is required for players' : ''
              }
            />
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            className="mt-4 py-3 text-lg font-bold"
          >
            Join Session
          </Button>
        </form>
      </Paper>
    </Container>
  )
}

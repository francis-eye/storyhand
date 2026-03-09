import React, { useState } from 'react'
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Slider,
  MenuItem,
  Box,
} from '@mui/material'
import { SettingsIcon, ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../hooks/useGameState'
import { GameSettings } from '../types/game'
export const CreateGamePage: React.FC = () => {
  const navigate = useNavigate()
  const { createGame } = useGame()
  const [gameName, setGameName] = useState('')
  const [hostName, setHostName] = useState('')
  const [settings, setSettings] = useState<Omit<GameSettings, 'gameName'>>({
    votingSystem: 'fibonacci',
    showAverage: true,
    showCountdown: true,
    inactivityTimeout: 30,
  })
  const [errors, setErrors] = useState({
    gameName: false,
    hostName: false,
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = {
      gameName: !gameName.trim(),
      hostName: !hostName.trim(),
    }
    setErrors(newErrors)
    if (!newErrors.gameName && !newErrors.hostName) {
      const sessionId = createGame(
        {
          ...settings,
          gameName,
        },
        hostName,
      )
      navigate(`/session/${sessionId}`)
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
          Create a New Game
        </Typography>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <TextField
            label="Game Name"
            placeholder="Sprint 24 Estimation"
            variant="outlined"
            fullWidth
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            error={errors.gameName}
            helperText={errors.gameName ? 'Game name is required' : ''}
            autoFocus
          />

          <TextField
            label="Your Name (Host)"
            placeholder="Enter your name"
            variant="outlined"
            fullWidth
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            error={errors.hostName}
            helperText={
              errors.hostName
                ? 'Host name is required'
                : 'The host facilitates but does not vote.'
            }
          />

          <TextField
            select
            label="Voting System"
            value={settings.votingSystem}
            fullWidth
            disabled
            helperText="Only Fibonacci is supported in this version."
          >
            <MenuItem value="fibonacci">
              Fibonacci (0, 1, 2, 3, 5, 8, 13...)
            </MenuItem>
          </TextField>

          <Accordion className="mt-2 shadow-none border border-gray-200 rounded-lg before:hidden">
            <AccordionSummary
              expandIcon={<SettingsIcon size={20} className="text-gray-500" />}
            >
              <Typography className="font-medium text-gray-700">
                Advanced Settings
              </Typography>
            </AccordionSummary>
            <AccordionDetails className="flex flex-col gap-4 pt-0">
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showAverage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showAverage: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Show Average in Results
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Display the mean score across all votes
                    </Typography>
                  </Box>
                }
                className="items-start m-0"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showCountdown}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        showCountdown: e.target.checked,
                      })
                    }
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Show Countdown Animation
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Brief countdown before cards flip
                    </Typography>
                  </Box>
                }
                className="items-start m-0"
              />

              <Box className="mt-4">
                <Typography gutterBottom variant="body2" color="textSecondary">
                  Session Inactivity Timeout (Minutes)
                </Typography>
                <Slider
                  value={settings.inactivityTimeout}
                  onChange={(_, value) =>
                    setSettings({
                      ...settings,
                      inactivityTimeout: value as number,
                    })
                  }
                  valueLabelDisplay="auto"
                  step={5}
                  marks
                  min={5}
                  max={60}
                  className="mt-2"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            className="mt-4 py-3 text-lg font-bold"
          >
            Create Game
          </Button>
        </form>
      </Paper>
    </Container>
  )
}

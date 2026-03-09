import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GameProvider } from './hooks/useGameState';
import { LandingPage } from './pages/LandingPage';
import { CreateGamePage } from './pages/CreateGamePage';
import { JoinSessionPage } from './pages/JoinSessionPage';
import { SessionPage } from './pages/SessionPage';
import { Header } from './components/Header';
const theme = createTheme({
  palette: {
    primary: {
      main: '#3F51B5' // Deep indigo
    },
    secondary: {
      main: '#FF9800' // Warm amber
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700
    },
    h2: {
      fontWeight: 700
    },
    h3: {
      fontWeight: 600
    },
    h4: {
      fontWeight: 600
    },
    h5: {
      fontWeight: 600
    },
    h6: {
      fontWeight: 600
    },
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }
      }
    }
  }
});
export function App() {
  return <ThemeProvider theme={theme}>
      <CssBaseline />
      <GameProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow flex flex-col">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/create" element={<CreateGamePage />} />
                <Route path="/join" element={<JoinSessionPage />} />
                <Route path="/session/:id" element={<SessionPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </GameProvider>
    </ThemeProvider>;
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './hooks/useGameState';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import CreateGamePage from './pages/CreateGamePage';
import JoinSessionPage from './pages/JoinSessionPage';
import SessionPage from './pages/SessionPage';

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateGamePage />} />
          <Route path="/join" element={<JoinSessionPage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}

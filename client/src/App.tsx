import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './hooks/useGameState';
import { FeedbackProvider } from './hooks/useFeedback';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import CreateGamePage from './pages/CreateGamePage';
import JoinSessionPage from './pages/JoinSessionPage';
import SessionPage from './pages/SessionPage';
import PrivacyPage from './pages/PrivacyPage';

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <FeedbackProvider>
          <Header />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/create" element={<CreateGamePage />} />
            <Route path="/join/:sessionId" element={<JoinSessionPage />} />
            <Route path="/join" element={<JoinSessionPage />} />
            <Route path="/session/:sessionId" element={<SessionPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </FeedbackProvider>
      </GameProvider>
    </BrowserRouter>
  );
}

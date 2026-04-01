import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider } from './hooks/useGameState';
import { FeedbackProvider } from './hooks/useFeedback';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import CreateGamePage from './pages/CreateGamePage';
import JoinSessionPage from './pages/JoinSessionPage';
import SessionPage from './pages/SessionPage';
import PrivacyPage from './pages/PrivacyPage';

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <>
      {!isLanding && <Header />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateGamePage />} />
        <Route path="/join/:sessionId" element={<JoinSessionPage />} />
        <Route path="/join" element={<JoinSessionPage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <FeedbackProvider>
          <AppContent />
        </FeedbackProvider>
      </GameProvider>
    </BrowserRouter>
  );
}

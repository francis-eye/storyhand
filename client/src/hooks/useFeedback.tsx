import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useGameState } from './useGameState';
import FeedbackModal from '../components/FeedbackModal';
import FeedbackToast from '../components/FeedbackToast';

const COOLDOWN_MS = 60_000;
const STORAGE_KEY = 'storyhand-feedback-cooldown';

interface FeedbackContextValue {
  openFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

function getCooldownRemaining(): number {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;
  const elapsed = Date.now() - Number(stored);
  return elapsed < COOLDOWN_MS ? COOLDOWN_MS - elapsed : 0;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { actions } = useGameState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(() => getCooldownRemaining() > 0);

  const openFeedback = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmit = useCallback((sentiment: number, comment: string) => {
    actions.submitFeedback(sentiment, comment);
    setIsModalOpen(false);
    setShowToast(true);

    // Start cooldown
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    setCooldownActive(true);
    setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
  }, [actions]);

  const dismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return (
    <FeedbackContext.Provider value={{ openFeedback }}>
      {children}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={closeFeedback}
        onSubmit={handleSubmit}
        cooldownActive={cooldownActive}
      />
      <FeedbackToast visible={showToast} onDismiss={dismissToast} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

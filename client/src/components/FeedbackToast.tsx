import { useEffect } from 'react';

interface FeedbackToastProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function FeedbackToast({ visible, onDismiss }: FeedbackToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-fade-in">
      Thanks for the feedback!
    </div>
  );
}

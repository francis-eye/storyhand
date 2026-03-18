import { useState, useEffect, useRef } from 'react';

const SENTIMENTS = [
  { emoji: '\u{1F624}', label: 'Terrible', value: 1 },
  { emoji: '\u{1F615}', label: 'Poor', value: 2 },
  { emoji: '\u{1F610}', label: 'Okay', value: 3 },
  { emoji: '\u{1F60A}', label: 'Good', value: 4 },
  { emoji: '\u{1F60D}', label: 'Great', value: 5 },
];

const MAX_COMMENT_LENGTH = 500;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sentiment: number, comment: string) => void;
  cooldownActive: boolean;
}

export default function FeedbackModal({ isOpen, onClose, onSubmit, cooldownActive }: FeedbackModalProps) {
  const [selectedSentiment, setSelectedSentiment] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSentiment(null);
      setComment('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = () => {
    if (selectedSentiment === null) return;
    onSubmit(selectedSentiment, comment.trim());
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          How's Storyhand working for you?
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Your feedback is anonymous and helps us improve.
        </p>

        {/* Sentiment selector */}
        <div className="flex justify-center gap-3 mb-5">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedSentiment(s.value)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                selectedSentiment === s.value
                  ? 'bg-blue-50 ring-2 ring-blue-400 scale-110'
                  : 'hover:bg-gray-50 hover:scale-105'
              }`}
              aria-label={s.label}
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className="text-xs text-gray-500">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Comment field */}
        <div className="mb-5">
          <label className="block text-sm text-gray-600 mb-1.5">
            Anything else? <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder="Tell us what you think..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          <div className="text-right text-xs text-gray-400 mt-0.5">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedSentiment === null || cooldownActive}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldownActive ? 'Please wait...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

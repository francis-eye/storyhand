import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../hooks/useFeedback';

// Shared footer with author credit, privacy policy, and feedback link.
// `arcade` renders an in-flow, on-theme (cream/neon) variant for the full-arcade
// funnel pages; the default stays the fixed neutral footer used by Session/Privacy.
export default function Footer({ arcade = false }: { arcade?: boolean }) {
  const navigate = useNavigate();
  const { openFeedback } = useFeedback();

  if (arcade) {
    return (
      <div className="mt-12 pt-8 flex justify-center gap-3 font-pixel-body text-base text-[#f5e6c8]/70">
        <span>By <a href="https://github.com/francis-eye" target="_blank" rel="noopener noreferrer" className="text-[#33ff33] hover:text-[#33ff33]/80">francis-eye</a></span>
        <span>&middot;</span>
        <a onClick={() => navigate('/privacy')} className="hover:text-[#33ff33] cursor-pointer transition-colors">Privacy Policy</a>
        <span>&middot;</span>
        <a onClick={openFeedback} className="hover:text-[#33ff33] cursor-pointer transition-colors">Send Feedback</a>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-3 text-xs text-gray-400 dark:text-gray-500">
      <span>By <a href="https://github.com/francis-eye" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300">francis-eye</a></span>
      <span>&middot;</span>
      <a onClick={() => navigate('/privacy')} className="hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">Privacy Policy</a>
      <span>&middot;</span>
      <a onClick={openFeedback} className="hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">Send Feedback</a>
    </div>
  );
}

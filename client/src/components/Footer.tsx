import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../hooks/useFeedback';

// Shared footer with author credit, privacy policy, and feedback link
export default function Footer() {
  const navigate = useNavigate();
  const { openFeedback } = useFeedback();

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-3 text-xs text-gray-400">
      <span>By <a href="https://github.com/francis-eye" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">francis-eye</a></span>
      <span>&middot;</span>
      <a onClick={() => navigate('/privacy')} className="hover:text-gray-600 cursor-pointer">Privacy Policy</a>
      <span>&middot;</span>
      <a onClick={openFeedback} className="hover:text-gray-600 cursor-pointer">Send Feedback</a>
    </div>
  );
}

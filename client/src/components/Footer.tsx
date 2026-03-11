import { useNavigate } from 'react-router-dom';

// Shared footer with author credit and privacy policy link
export default function Footer() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-3 text-xs text-gray-400">
      <span>By <a href="https://github.com/francis-eye" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">francis-eye</a></span>
      <span>&middot;</span>
      <a onClick={() => navigate('/privacy')} className="hover:text-gray-600 cursor-pointer">Privacy Policy</a>
    </div>
  );
}

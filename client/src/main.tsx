import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed — it double-mounts components in dev, which caused
// two Socket.IO connections where listeners and session diverged.
// The module-scope socket singleton in useGameState.tsx is the primary fix;
// removing StrictMode avoids the double-mount trigger entirely.
createRoot(document.getElementById('root')!).render(<App />)

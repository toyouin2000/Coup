import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from '@/context/SocketContext';
import { GameProvider } from '@/context/GameContext';
import { ToastProvider } from '@/context/ToastContext';
import ConnectionBanner from '@/components/ConnectionBanner';
import LobbyPage from '@/pages/LobbyPage';
import WaitingRoomPage from '@/pages/WaitingRoomPage';
import GamePage from '@/pages/GamePage';

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <ToastProvider>
          <ConnectionBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LobbyPage />} />
              <Route path="/waiting" element={<WaitingRoomPage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </GameProvider>
    </SocketProvider>
  );
}

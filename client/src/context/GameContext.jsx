import { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { socket } = useSocket();

  const [roomCode, setRoomCode] = useState(null);
  const [lobbyState, setLobbyState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [myId, setMyId] = useState(null);
  // Callbacks registered by pages that want disconnect/player-left notifications
  const [onPlayerLeft, setOnPlayerLeft] = useState(null);
  const [onDisconnectCallback, setOnDisconnectCallback] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setMyId(socket.id);
    };

    const onLobbyState = (state) => setLobbyState(state);
    const onGameStarted = () => {};
    const onGameState = (state) => setGameState(state);

    const onPlayerLeftEvent = ({ id }) => {
      onPlayerLeft?.(id);
    };

    const onDisconnect = (reason) => {
      // If server forced disconnect (e.g. kicked), clear room
      if (reason === 'io server disconnect') {
        resetGame();
      }
    };

    socket.on('connect', onConnect);
    socket.on('lobby:state', onLobbyState);
    socket.on('game:started', onGameStarted);
    socket.on('game:state', onGameState);
    socket.on('lobby:playerLeft', onPlayerLeftEvent);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setMyId(socket.id);

    return () => {
      socket.off('connect', onConnect);
      socket.off('lobby:state', onLobbyState);
      socket.off('game:started', onGameStarted);
      socket.off('game:state', onGameState);
      socket.off('lobby:playerLeft', onPlayerLeftEvent);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, onPlayerLeft]);

  function resetGame() {
    setRoomCode(null);
    setLobbyState(null);
    setGameState(null);
  }

  return (
    <GameContext.Provider value={{
      roomCode, setRoomCode,
      lobbyState, gameState,
      myId,
      resetGame,
      setOnPlayerLeft,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}

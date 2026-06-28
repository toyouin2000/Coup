import {
  createGameState,
  buildPlayerView,
  getPlayer,
  performAction,
  challengeAction,
  blockAction,
  passAction,
  challengeBlock,
  loseInfluence,
  performExchange,
} from '../game/GameEngine.js';

// Emit the current game state to every player in the room,
// each receiving only what they're allowed to see.
function broadcastGameState(io, room) {
  if (!room.gameState) return;
  for (const player of room.players) {
    const view = buildPlayerView(room.gameState, player.id);
    io.to(player.id).emit('game:state', view);
  }
}

// Emit the lobby state (no card info) to everyone in the room
function broadcastLobbyState(io, room) {
  const lobbyState = {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      isHost: p.isHost,
    })),
    gameStarted: room.gameStarted,
  };
  io.to(room.code).emit('lobby:state', lobbyState);
}

export function registerSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    console.log(`[+] Socket connected: ${socket.id}`);

    // ── Create room ──────────────────────────────────────────────────────────
    socket.on('room:create', ({ playerName }, callback) => {
      if (!playerName?.trim()) return callback({ error: 'Name required.' });

      const room = roomManager.createRoom(socket, playerName.trim());
      socket.join(room.code);

      console.log(`[Room] ${playerName} created room ${room.code}`);
      callback({ ok: true, code: room.code });
      broadcastLobbyState(io, room);
    });

    // ── Join room ────────────────────────────────────────────────────────────
    socket.on('room:join', ({ code, playerName }, callback) => {
      if (!playerName?.trim()) return callback({ error: 'Name required.' });
      if (!code?.trim()) return callback({ error: 'Room code required.' });

      const result = roomManager.joinRoom(code.trim().toUpperCase(), socket, playerName.trim());
      if (result.error) return callback({ error: result.error });

      socket.join(code.toUpperCase());
      console.log(`[Room] ${playerName} joined room ${code}`);
      callback({ ok: true, code: code.toUpperCase() });
      broadcastLobbyState(io, result.room);
    });

    // ── Ready toggle ─────────────────────────────────────────────────────────
    socket.on('room:ready', ({ ready }) => {
      const room = roomManager.setReady(socket.id, ready);
      if (room) broadcastLobbyState(io, room);
    });

    // ── Reorder players (host only) ──────────────────────────────────────────
    socket.on('room:reorder', ({ newOrder }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room) return callback?.({ error: 'Not in a room.' });
      if (room.hostId !== socket.id) return callback?.({ error: 'Only the host can reorder.' });

      const updated = roomManager.reorderPlayers(room.code, newOrder);
      if (!updated) return callback?.({ error: 'Invalid order.' });

      broadcastLobbyState(io, updated);
      callback?.({ ok: true });
    });

    // ── Start game (host only) ───────────────────────────────────────────────
    socket.on('room:start', (callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room) return callback?.({ error: 'Not in a room.' });
      if (room.hostId !== socket.id) return callback?.({ error: 'Only the host can start.' });
      if (room.players.length < 2) return callback?.({ error: 'Need at least 2 players.' });

      const notReady = room.players.filter((p) => !p.ready && !p.isHost);
      if (notReady.length > 0)
        return callback?.({ error: 'All players must be ready.' });

      const orderedPlayers = room.turnOrder.map((id) =>
        room.players.find((p) => p.id === id)
      );

      const gameState = createGameState(orderedPlayers);
      roomManager.startGame(room.code, gameState);

      io.to(room.code).emit('game:started');
      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: perform action ─────────────────────────────────────────────────
    socket.on('game:action', ({ action, targetId }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = performAction(room.gameState, socket.id, action, targetId);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: challenge action ───────────────────────────────────────────────
    socket.on('game:challenge', (callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = challengeAction(room.gameState, socket.id);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: block action ───────────────────────────────────────────────────
    socket.on('game:block', ({ blockCharacter }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = blockAction(room.gameState, socket.id, blockCharacter);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: pass (allow action or block to proceed) ────────────────────────
    socket.on('game:pass', (callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = passAction(room.gameState, socket.id);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: challenge a block ──────────────────────────────────────────────
    socket.on('game:challengeBlock', (callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = challengeBlock(room.gameState, socket.id);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: lose influence ─────────────────────────────────────────────────
    socket.on('game:loseInfluence', ({ cardIndex }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = loseInfluence(room.gameState, socket.id, cardIndex);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Game: exchange cards (Ambassador) ────────────────────────────────────
    socket.on('game:exchange', ({ keptCardIndices }, callback) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (!room?.gameState) return callback?.({ error: 'Game not started.' });

      const result = performExchange(room.gameState, socket.id, keptCardIndices);
      if (result.error) return callback?.({ error: result.error });

      broadcastGameState(io, room);
      callback?.({ ok: true });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[-] Socket disconnected: ${socket.id}`);
      const result = roomManager.leaveRoom(socket.id);
      if (!result) return;

      const { code, room, deleted } = result;
      if (deleted) {
        console.log(`[Room] Room ${code} deleted (empty).`);
        return;
      }

      // Notify remaining players
      io.to(code).emit('lobby:playerLeft', { id: socket.id });
      broadcastLobbyState(io, room);

      if (room.gameStarted && room.gameState) {
        broadcastGameState(io, room);
      }
    });
  });
}

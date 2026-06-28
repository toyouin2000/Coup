// Generates a random 6-digit alphanumeric room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class RoomManager {
  constructor() {
    // Map of roomCode -> Room object
    this.rooms = new Map();
  }

  createRoom(hostSocket, hostName) {
    let code;
    // Ensure uniqueness
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const room = {
      code,
      hostId: hostSocket.id,
      players: [
        {
          id: hostSocket.id,
          name: hostName,
          ready: false,
          isHost: true,
        },
      ],
      // order mirrors players array initially; stores socket IDs for turn order
      turnOrder: [hostSocket.id],
      gameStarted: false,
      gameState: null,
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code, socket, playerName) {
    const room = this.rooms.get(code);

    if (!room) return { error: 'Room not found.' };
    if (room.gameStarted) return { error: 'Game already in progress.' };
    if (room.players.length >= 6) return { error: 'Room is full (max 6 players).' };
    if (room.players.find((p) => p.id === socket.id)) return { error: 'Already in room.' };

    const player = {
      id: socket.id,
      name: playerName,
      ready: false,
      isHost: false,
    };

    room.players.push(player);
    room.turnOrder.push(socket.id);

    return { room };
  }

  leaveRoom(socketId) {
    for (const [code, room] of this.rooms.entries()) {
      const idx = room.players.findIndex((p) => p.id === socketId);
      if (idx === -1) continue;

      room.players.splice(idx, 1);
      room.turnOrder = room.turnOrder.filter((id) => id !== socketId);

      // If room is empty, delete it
      if (room.players.length === 0) {
        this.rooms.delete(code);
        return { code, room: null, deleted: true };
      }

      // If host left, assign host to first remaining player
      if (room.hostId === socketId) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }

      return { code, room, deleted: false };
    }

    return null; // Socket wasn't in any room
  }

  setReady(socketId, isReady) {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.id === socketId);
      if (player) {
        player.ready = isReady;
        return room;
      }
    }
    return null;
  }

  reorderPlayers(roomCode, newOrder) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // newOrder is an array of socket IDs in desired turn order
    const validIds = new Set(room.players.map((p) => p.id));
    if (newOrder.length !== room.players.length || !newOrder.every((id) => validIds.has(id))) {
      return null;
    }

    room.turnOrder = newOrder;
    room.players = newOrder.map((id) => room.players.find((p) => p.id === id));

    return room;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  getRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.find((p) => p.id === socketId)) return room;
    }
    return null;
  }

  // Garbage-collect rooms with 0 connections (called periodically)
  cleanup() {
    let removed = 0;
    for (const [code, room] of this.rooms.entries()) {
      if (room.players.length === 0) {
        this.rooms.delete(code);
        removed++;
      }
    }
    return removed;
  }

  // Mark room as started and attach game state
  startGame(code, gameState) {
    const room = this.rooms.get(code);
    if (!room) return null;
    room.gameStarted = true;
    room.gameState = gameState;
    return room;
  }
}

export default RoomManager;

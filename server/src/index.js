import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import RoomManager from './rooms/RoomManager.js';
import { registerSocketHandlers } from './socket/handlers.js';
 
import path from "path";
import { fileURLToPath } from "url";

 



const PORT = process.env.PORT || 3001;

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the React build
const clientPath = path.join(__dirname, "../../client/dist");

app.use(express.static(clientPath));

// SPA routing
app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── HTTP + Socket.io setup ────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ── Room manager ──────────────────────────────────────────────────────────────
const roomManager = new RoomManager();

// ── Socket handlers ───────────────────────────────────────────────────────────
registerSocketHandlers(io, roomManager);

// ── Garbage collection: clean empty rooms every 5 minutes ─────────────────────
setInterval(() => {
  const removed = roomManager.cleanup();
  if (removed > 0) console.log(`[GC] Removed ${removed} empty room(s).`);
}, 5 * 60 * 1000);


// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🎴 Coup server running on http://localhost:${PORT}\n`);
});

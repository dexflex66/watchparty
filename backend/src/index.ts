import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './rooms';

const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL;
const io = new Server(httpServer, {
  cors: {
    origin: frontendUrl || '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: frontendUrl || '*' }));
app.use(express.json());

const roomManager = new RoomManager();

// Track socketId -> userId mapping
const socketToUser: Map<string, string> = new Map();
// Track userId -> socketId mapping
const userToSocket: Map<string, string> = new Map();

// REST endpoints

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/rooms', (req, res) => {
  const { hostName } = req.body as { hostName?: string };
  if (!hostName) {
    res.status(400).json({ error: 'hostName is required' });
    return;
  }
  const hostId = uuidv4();
  const room = roomManager.createRoom(hostId, hostName);
  res.json({ roomId: room.id, hostId });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    id: room.id,
    hostId: room.hostId,
    participants: Array.from(room.participants.values()),
    videoState: room.videoState,
    createdAt: room.createdAt,
  });
});

// Socket.io

io.on('connection', (socket: Socket) => {
  socket.on('join-room', ({ roomId, userId, userName }: { roomId: string; userId: string; userName: string }) => {
    const ok = roomManager.addParticipant(roomId, userId, userName);
    if (!ok) {
      socket.emit('room-not-found');
      return;
    }

    socketToUser.set(socket.id, userId);
    userToSocket.set(userId, socket.id);

    socket.join(roomId);

    const room = roomManager.getRoom(roomId)!;
    socket.emit('room-state', {
      videoState: room.videoState,
      participants: Array.from(room.participants.values()),
    });

    socket.to(roomId).emit('participant-joined', {
      participant: room.participants.get(userId),
    });
  });

  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  socket.on('video-play', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    roomManager.updateVideoState(roomId, { isPlaying: true, currentTime });
    socket.to(roomId).emit('video-play', { currentTime });
  });

  socket.on('video-pause', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    roomManager.updateVideoState(roomId, { isPlaying: false, currentTime });
    socket.to(roomId).emit('video-pause', { currentTime });
  });

  socket.on('video-seek', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    roomManager.updateVideoState(roomId, { currentTime });
    socket.to(roomId).emit('video-seek', { currentTime });
  });

  socket.on('video-source', ({
    roomId,
    platform,
    videoId,
    currentTime,
  }: {
    roomId: string;
    platform: 'youtube' | 'netflix' | 'prime';
    videoId: string;
    currentTime: number;
  }) => {
    roomManager.updateVideoState(roomId, { platform, videoId, currentTime, isPlaying: false });
    socket.to(roomId).emit('video-source', { platform, videoId, currentTime });
  });

  socket.on('sync-countdown', ({ roomId }: { roomId: string }) => {
    const userId = socketToUser.get(socket.id);
    const room = roomManager.getRoom(roomId);
    const senderName = room?.participants.get(userId || '')?.name || 'Someone';
    io.to(roomId).emit('sync-countdown', {
      startAt: Date.now() + 3500,
      senderName,
    });
  });

  socket.on('chat-message', ({ roomId, text }: { roomId: string; text: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const participant = room.participants.get(userId);
    if (!participant) return;

    const message = {
      id: uuidv4(),
      senderId: userId,
      senderName: participant.name,
      text,
      timestamp: Date.now(),
    };

    io.to(roomId).emit('chat-message', message);
  });

  // WebRTC signaling

  const forwardWebRTC = (event: string) =>
    ({ targetUserId, signal }: { roomId: string; targetUserId: string; signal: unknown }) => {
      const fromUserId = socketToUser.get(socket.id);
      const targetSocketId = userToSocket.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit(event, { fromUserId, signal });
      }
    };

  socket.on('webrtc-offer', forwardWebRTC('webrtc-offer'));
  socket.on('webrtc-answer', forwardWebRTC('webrtc-answer'));
  socket.on('webrtc-ice-candidate', forwardWebRTC('webrtc-ice-candidate'));

  socket.on('disconnect', () => {
    handleLeave(socket);
  });
});

function handleLeave(socket: Socket): void {
  const userId = socketToUser.get(socket.id);
  if (!userId) return;

  const room = roomManager.getRoomByParticipant(userId);
  if (room) {
    roomManager.removeParticipant(room.id, userId);
    socket.leave(room.id);
    socket.to(room.id).emit('participant-left', { userId });
  }

  socketToUser.delete(socket.id);
  userToSocket.delete(userId);
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`watchparty backend listening on port ${PORT}`);
});

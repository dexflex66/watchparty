"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const rooms_1 = require("./rooms");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const frontendUrl = process.env.FRONTEND_URL;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: frontendUrl || '*',
        methods: ['GET', 'POST'],
    },
});
app.use((0, cors_1.default)({ origin: frontendUrl || '*' }));
app.use(express_1.default.json());
const roomManager = new rooms_1.RoomManager();
// Track socketId -> userId mapping
const socketToUser = new Map();
// Track userId -> socketId mapping
const userToSocket = new Map();
// REST endpoints
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
app.post('/api/rooms', (req, res) => {
    const { hostName } = req.body;
    if (!hostName) {
        res.status(400).json({ error: 'hostName is required' });
        return;
    }
    const hostId = (0, uuid_1.v4)();
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
io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userId, userName }) => {
        const ok = roomManager.addParticipant(roomId, userId, userName);
        if (!ok) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
        socketToUser.set(socket.id, userId);
        userToSocket.set(userId, socket.id);
        socket.join(roomId);
        const room = roomManager.getRoom(roomId);
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
    socket.on('video-play', ({ roomId, currentTime }) => {
        roomManager.updateVideoState(roomId, { isPlaying: true, currentTime });
        socket.to(roomId).emit('video-play', { currentTime });
    });
    socket.on('video-pause', ({ roomId, currentTime }) => {
        roomManager.updateVideoState(roomId, { isPlaying: false, currentTime });
        socket.to(roomId).emit('video-pause', { currentTime });
    });
    socket.on('video-seek', ({ roomId, currentTime }) => {
        roomManager.updateVideoState(roomId, { currentTime });
        socket.to(roomId).emit('video-seek', { currentTime });
    });
    socket.on('video-source', ({ roomId, platform, videoId, currentTime, }) => {
        roomManager.updateVideoState(roomId, { platform, videoId, currentTime, isPlaying: false });
        socket.to(roomId).emit('video-source', { platform, videoId, currentTime });
    });
    socket.on('chat-message', ({ roomId, text }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId)
            return;
        const room = roomManager.getRoom(roomId);
        if (!room)
            return;
        const participant = room.participants.get(userId);
        if (!participant)
            return;
        const message = {
            id: (0, uuid_1.v4)(),
            senderId: userId,
            senderName: participant.name,
            text,
            timestamp: Date.now(),
        };
        io.to(roomId).emit('chat-message', message);
    });
    // WebRTC signaling
    socket.on('webrtc-offer', ({ targetId, offer }) => {
        const fromId = socketToUser.get(socket.id);
        const targetSocketId = userToSocket.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-offer', { fromId, offer });
        }
    });
    socket.on('webrtc-answer', ({ targetId, answer }) => {
        const fromId = socketToUser.get(socket.id);
        const targetSocketId = userToSocket.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-answer', { fromId, answer });
        }
    });
    socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
        const fromId = socketToUser.get(socket.id);
        const targetSocketId = userToSocket.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-ice-candidate', { fromId, candidate });
        }
    });
    socket.on('disconnect', () => {
        handleLeave(socket);
    });
});
function handleLeave(socket) {
    const userId = socketToUser.get(socket.id);
    if (!userId)
        return;
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

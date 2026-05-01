"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const uuid_1 = require("uuid");
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.emptyRoomTimers = new Map();
    }
    createRoom(hostId, hostName) {
        const roomId = (0, uuid_1.v4)();
        const host = { id: hostId, name: hostName, isHost: true };
        const room = {
            id: roomId,
            hostId,
            participants: new Map([[hostId, host]]),
            videoState: {
                platform: null,
                videoId: null,
                isPlaying: false,
                currentTime: 0,
                updatedAt: Date.now(),
            },
            createdAt: Date.now(),
        };
        this.rooms.set(roomId, room);
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    addParticipant(roomId, userId, name) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        this.clearEmptyTimer(roomId);
        const participant = {
            id: userId,
            name,
            isHost: userId === room.hostId,
        };
        room.participants.set(userId, participant);
        return true;
    }
    removeParticipant(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.participants.delete(userId);
        if (room.participants.size === 0) {
            const timer = setTimeout(() => {
                this.rooms.delete(roomId);
                this.emptyRoomTimers.delete(roomId);
            }, EMPTY_ROOM_TTL_MS);
            this.emptyRoomTimers.set(roomId, timer);
        }
    }
    updateVideoState(roomId, state) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.videoState = { ...room.videoState, ...state, updatedAt: Date.now() };
    }
    getRoomByParticipant(userId) {
        for (const room of this.rooms.values()) {
            if (room.participants.has(userId))
                return room;
        }
        return undefined;
    }
    clearEmptyTimer(roomId) {
        const timer = this.emptyRoomTimers.get(roomId);
        if (timer) {
            clearTimeout(timer);
            this.emptyRoomTimers.delete(roomId);
        }
    }
}
exports.RoomManager = RoomManager;

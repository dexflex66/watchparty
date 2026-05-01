import { v4 as uuidv4 } from 'uuid';
import { Room, Participant, VideoState } from './types';

const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private emptyRoomTimers: Map<string, NodeJS.Timeout> = new Map();

  createRoom(hostId: string, hostName: string): Room {
    const roomId = uuidv4();
    const host: Participant = { id: hostId, name: hostName, isHost: true };
    const room: Room = {
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

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addParticipant(roomId: string, userId: string, name: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    this.clearEmptyTimer(roomId);

    const participant: Participant = {
      id: userId,
      name,
      isHost: userId === room.hostId,
    };
    room.participants.set(userId, participant);
    return true;
  }

  removeParticipant(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.delete(userId);

    if (room.participants.size === 0) {
      const timer = setTimeout(() => {
        this.rooms.delete(roomId);
        this.emptyRoomTimers.delete(roomId);
      }, EMPTY_ROOM_TTL_MS);
      this.emptyRoomTimers.set(roomId, timer);
    }
  }

  updateVideoState(roomId: string, state: Partial<VideoState>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.videoState = { ...room.videoState, ...state, updatedAt: Date.now() };
  }

  getRoomByParticipant(userId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.participants.has(userId)) return room;
    }
    return undefined;
  }

  private clearEmptyTimer(roomId: string): void {
    const timer = this.emptyRoomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.emptyRoomTimers.delete(roomId);
    }
  }
}

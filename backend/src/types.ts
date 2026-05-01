export interface Room {
  id: string;
  hostId: string;
  participants: Map<string, Participant>;
  videoState: VideoState;
  createdAt: number;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
}

export interface VideoState {
  platform: 'youtube' | 'netflix' | 'prime' | null;
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

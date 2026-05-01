export type Platform = 'youtube' | 'netflix' | 'prime' | null;

export interface VideoState {
  platform: Platform;
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

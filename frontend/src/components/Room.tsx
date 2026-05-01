import { useEffect, useState, useCallback } from 'react'
import { useSocket } from '../hooks/useSocket'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { VideoState, Participant, ChatMessage } from '../types'
import VideoPlayer from './VideoPlayer'
import PlatformSelector from './PlatformSelector'
import Chat from './Chat'
import ParticipantList from './ParticipantList'
import VoiceControls from './VoiceControls'

interface RoomProps {
  roomId: string
  userId: string
  userName: string
}

const DEFAULT_VIDEO_STATE: VideoState = {
  platform: null,
  videoId: null,
  isPlaying: false,
  currentTime: 0,
}

export default function Room({ roomId, userId, userName }: RoomProps) {
  const socket = useSocket()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [videoState, setVideoState] = useState<VideoState>(DEFAULT_VIDEO_STATE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [roomNotFound, setRoomNotFound] = useState(false)

  const { isMuted, toggleMute } = useVoiceChat({
    socket,
    roomId,
    localUserId: userId,
    participants,
    enabled: voiceEnabled,
  })

  useEffect(() => {
    socket.emit('join-room', { roomId, userId, userName })

    socket.on('room-state', ({ participants: p, videoState: vs }: { participants: Participant[]; videoState: VideoState }) => {
      setParticipants(p)
      setVideoState(vs)
    })

    socket.on('participant-joined', (participant: Participant) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === participant.id)) return prev
        return [...prev, participant]
      })
    })

    socket.on('participant-left', ({ userId: leftId }: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== leftId))
    })

    socket.on('video-source', ({ platform, videoId }: { platform: VideoState['platform']; videoId: string | null }) => {
      setVideoState((prev) => ({ ...prev, platform, videoId }))
    })

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.on('room-not-found', () => setRoomNotFound(true))

    return () => {
      socket.off('room-state')
      socket.off('participant-joined')
      socket.off('participant-left')
      socket.off('video-source')
      socket.off('chat-message')
      socket.off('room-not-found')
    }
  }, [socket, roomId, userId, userName])

  const handleSendMessage = useCallback(
    (text: string) => {
      socket.emit('chat-message', { roomId, text })
    },
    [socket, roomId]
  )

  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Room not found</h2>
          <p className="text-gray-400">Check the room code and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Video area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-3 border-b border-gray-800">
          <span className="text-purple-400 font-bold text-lg">WatchParty</span>
          <span className="text-gray-500 text-sm">Room:</span>
          <span className="text-gray-300 font-mono text-sm bg-gray-800 px-2 py-0.5 rounded select-all">
            {roomId}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <VideoPlayer
            videoState={videoState}
            socket={socket}
            roomId={roomId}
            userId={userId}
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-80 flex flex-col gap-3 p-3 bg-gray-900 border-l border-gray-800 overflow-y-auto">
        <PlatformSelector
          current={videoState.platform}
          roomId={roomId}
          socket={socket}
          onPlatformChange={(platform) => setVideoState((prev) => ({ ...prev, platform, videoId: null }))}
        />
        <ParticipantList participants={participants} currentUserId={userId} />
        <VoiceControls
          isMuted={isMuted}
          onToggle={toggleMute}
          isActive={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled((v) => !v)}
        />
        <Chat messages={messages} onSend={handleSendMessage} currentUserId={userId} />
      </div>
    </div>
  )
}

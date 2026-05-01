import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { VideoState } from '../types'

interface VideoPlayerProps {
  videoState: VideoState
  socket: Socket
  roomId: string
  userId: string
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void
  }
}

let ytApiLoaded = false
let ytApiReadyCallbacks: (() => void)[] = []

function loadYouTubeAPI(onReady: () => void) {
  if (window.YT && window.YT.Player) {
    onReady()
    return
  }
  ytApiReadyCallbacks.push(onReady)
  if (ytApiLoaded) return
  ytApiLoaded = true
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(tag)
  window.onYouTubeIframeAPIReady = () => {
    ytApiReadyCallbacks.forEach((cb) => cb())
    ytApiReadyCallbacks = []
  }
}

function extractYouTubeId(input: string): string {
  const patterns = [
    /(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return input
}

export default function VideoPlayer({ videoState, socket, roomId, userId }: VideoPlayerProps) {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isSyncing = useRef(false)
  const [ytInput, setYtInput] = useState('')
  const [extensionConnected, setExtensionConnected] = useState(false)
  const [ytReady, setYtReady] = useState(false)

  // Extension connection listener
  useEffect(() => {
    const handler = () => setExtensionConnected(true)
    window.addEventListener('extension-connected', handler)
    return () => window.removeEventListener('extension-connected', handler)
  }, [])

  // Load YouTube IFrame API once
  useEffect(() => {
    if (videoState.platform !== 'youtube') return
    loadYouTubeAPI(() => setYtReady(true))
  }, [videoState.platform])

  // Create / recreate YT.Player when videoId changes
  useEffect(() => {
    if (videoState.platform !== 'youtube' || !ytReady || !videoState.videoId) return

    const divId = 'yt-player-div'
    let div = document.getElementById(divId)
    if (!div) {
      div = document.createElement('div')
      div.id = divId
      containerRef.current?.appendChild(div)
    }

    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    playerRef.current = new window.YT.Player(divId, {
      videoId: videoState.videoId,
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 0, controls: 1 },
      events: {
        onStateChange: (event: YT.OnStateChangeEvent) => {
          if (isSyncing.current) return
          if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit('video-play', {
              roomId,
              userId,
              currentTime: playerRef.current?.getCurrentTime() ?? 0,
            })
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit('video-pause', {
              roomId,
              userId,
              currentTime: playerRef.current?.getCurrentTime() ?? 0,
            })
          }
        },
      },
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoState.platform, videoState.videoId, ytReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Socket sync handlers
  useEffect(() => {
    const handlePlay = ({ currentTime }: { currentTime: number }) => {
      isSyncing.current = true
      playerRef.current?.seekTo(currentTime, true)
      playerRef.current?.playVideo()
      setTimeout(() => { isSyncing.current = false }, 300)
    }
    const handlePause = ({ currentTime }: { currentTime: number }) => {
      isSyncing.current = true
      playerRef.current?.seekTo(currentTime, true)
      playerRef.current?.pauseVideo()
      setTimeout(() => { isSyncing.current = false }, 300)
    }
    const handleSeek = ({ currentTime }: { currentTime: number }) => {
      isSyncing.current = true
      playerRef.current?.seekTo(currentTime, true)
      setTimeout(() => { isSyncing.current = false }, 300)
    }

    socket.on('video-play', handlePlay)
    socket.on('video-pause', handlePause)
    socket.on('video-seek', handleSeek)
    return () => {
      socket.off('video-play', handlePlay)
      socket.off('video-pause', handlePause)
      socket.off('video-seek', handleSeek)
    }
  }, [socket])

  const handleYtLoad = useCallback(() => {
    const id = extractYouTubeId(ytInput.trim())
    if (!id) return
    socket.emit('video-source', { roomId, platform: 'youtube', videoId: id })
    setYtInput('')
  }, [ytInput, socket, roomId])

  if (videoState.platform === 'youtube') {
    return (
      <div className="flex flex-col h-full bg-black">
        <div className="flex gap-2 p-2 bg-gray-900">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
            placeholder="YouTube URL or video ID"
            value={ytInput}
            onChange={(e) => setYtInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleYtLoad()}
          />
          <button
            onClick={handleYtLoad}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
          >
            Load
          </button>
        </div>
        <div className="flex-1 relative" ref={containerRef}>
          {!videoState.videoId && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              Enter a YouTube URL above to start
            </div>
          )}
        </div>
      </div>
    )
  }

  if (videoState.platform === 'netflix' || videoState.platform === 'prime') {
    const name = videoState.platform === 'netflix' ? 'Netflix' : 'Prime Video'
    const color = videoState.platform === 'netflix' ? 'text-red-500' : 'text-blue-400'
    return (
      <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-8 text-center">
        <h2 className={`text-3xl font-bold mb-4 ${color}`}>{name}</h2>
        <div
          className={`w-3 h-3 rounded-full mb-4 ${extensionConnected ? 'bg-green-400' : 'bg-gray-600'}`}
          title={extensionConnected ? 'Extension connected' : 'Extension not detected'}
        />
        <p className="text-gray-400 mb-2">
          {extensionConnected ? 'Extension connected' : 'Extension not detected'}
        </p>
        <p className="text-gray-300 max-w-md mb-6">
          Open {name} in your browser and install the{' '}
          <span className="text-purple-400 font-semibold">WatchParty Browser Extension</span> to
          sync playback with your friends.
        </p>
        {videoState.videoId && (
          <div className="bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 break-all max-w-md">
            <span className="text-gray-500 block mb-1">Currently syncing:</span>
            {videoState.videoId}
          </div>
        )}
        <ol className="text-left text-gray-400 text-sm space-y-1 mt-6 max-w-sm">
          <li>1. Install the WatchParty extension from the Chrome Web Store</li>
          <li>2. Open {name} and start a video</li>
          <li>3. Click the extension icon and enter room code: <span className="text-purple-400 font-mono">{roomId}</span></li>
          <li>4. Playback will sync automatically</li>
        </ol>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-900 items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-lg">Select a platform to get started</p>
      </div>
    </div>
  )
}

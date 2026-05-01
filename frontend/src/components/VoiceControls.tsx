
interface VoiceControlsProps {
  isMuted: boolean
  onToggle: () => void
  isActive: boolean
  onToggleVoice: () => void
}

export default function VoiceControls({
  isMuted,
  onToggle,
  isActive,
  onToggleVoice,
}: VoiceControlsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Voice Chat
      </h3>
      <div className="flex gap-2">
        <button
          onClick={onToggleVoice}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {isActive ? 'Leave Voice' : 'Join Voice'}
        </button>

        {isActive && (
          <button
            onClick={onToggle}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isMuted
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
          </button>
        )}
      </div>
      {isActive && (
        <p className="text-xs text-gray-500 mt-2">
          {isMuted ? 'You are muted' : 'Mic is active'}
        </p>
      )}
    </div>
  )
}

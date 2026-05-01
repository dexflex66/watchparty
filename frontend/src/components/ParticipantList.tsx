import { Participant } from '../types'

interface ParticipantListProps {
  participants: Participant[]
  currentUserId: string
}

export default function ParticipantList({ participants, currentUserId }: ParticipantListProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Participants ({participants.length})
      </h3>
      <ul className="space-y-1">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-white truncate">
              {p.isHost && <span className="mr-1">👑</span>}
              {p.name}
              {p.id === currentUserId && (
                <span className="text-gray-400 ml-1">(You)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

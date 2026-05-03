import { useEffect, useState } from 'react'

interface Props {
  startAt: number | null
  senderName: string
  onDone: () => void
}

export default function SyncCountdown({ startAt, senderName, onDone }: Props) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!startAt) return
    let raf = 0
    const tick = () => {
      const remaining = startAt - Date.now()
      if (remaining > 2500) setLabel('3')
      else if (remaining > 1500) setLabel('2')
      else if (remaining > 500) setLabel('1')
      else if (remaining > -800) setLabel('GO!')
      else { onDone(); return }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [startAt, onDone])

  if (!startAt) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center pointer-events-none">
      <div className="text-purple-400 text-sm font-medium mb-2 uppercase tracking-widest">
        {senderName} started a sync — press play now!
      </div>
      <div
        className={`text-white font-black select-none transition-transform ${
          label === 'GO!' ? 'text-9xl text-green-400 scale-125' : 'text-[200px]'
        }`}
      >
        {label}
      </div>
    </div>
  )
}

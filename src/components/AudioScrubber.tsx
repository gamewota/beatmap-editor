import { useRef, useState, useEffect, useCallback } from 'react'

interface AudioScrubberProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  className?: string
}

export default function AudioScrubber({
  currentTime,
  duration,
  onSeek,
  className = ''
}: AudioScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const seekFromX = useCallback((x: number, width: number) => {
    if (duration <= 0) return
    const ratio = Math.max(0, Math.min(1, x / width))
    onSeek(ratio * duration)
  }, [duration, onSeek])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return
    setIsDragging(true)
    const rect = scrubberRef.current.getBoundingClientRect()
    seekFromX(e.clientX - rect.left, rect.width)
  }, [seekFromX])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return
    const rect = scrubberRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverX(x)
    
    if (isDragging) {
      seekFromX(x, rect.width)
    }
  }, [isDragging, seekFromX])

  const handleMouseLeave = useCallback(() => {
    setHoverX(null)
  }, [])

  // Handle global mouse up to stop dragging
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false)
    
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp)
      return () => window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const hoverPercent = hoverX !== null && scrubberRef.current 
    ? (hoverX / scrubberRef.current.getBoundingClientRect().width) * 100 
    : null

  return (
    <div
      ref={scrubberRef}
      className={`relative select-none cursor-pointer group ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Timeline track background */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gray-700 rounded-full overflow-hidden">
        {/* Progress fill */}
        <div 
          className="h-full bg-blue-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Hover preview */}
      {hoverPercent !== null && !isDragging && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white/70 pointer-events-none"
          style={{ left: `${hoverPercent}%` }}
        />
      )}
      
      {/* Playhead handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-75"
        style={{ left: `${progress}%` }}
      >
        {/* Handle circle */}
        <div className={`
          w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg 
          transition-transform group-hover:scale-110
          ${isDragging ? 'scale-125 cursor-grabbing' : 'cursor-grab'}
        `} />
      </div>

      {/* Time tooltip on hover */}
      {hoverPercent !== null && duration > 0 && (
        <div 
          className="absolute -top-2 -translate-x-1/2 -translate-y-full px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${hoverPercent}%` }}
        >
          {formatTime((hoverPercent / 100) * duration)}
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

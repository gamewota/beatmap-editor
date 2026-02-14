import { useRef, useState, useEffect, useCallback } from 'react'
import type { TimelineViewport } from '../utils/TimelineViewport'

interface TimelineScrubberProps {
  viewport: TimelineViewport
  currentTime: number
  onSeek: (time: number) => void
  className?: string
  containerRef?: React.RefObject<HTMLDivElement>
}

export default function TimelineScrubber({
  viewport,
  currentTime,
  onSeek,
  className = '',
  containerRef
}: TimelineScrubberProps) {
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return
    setIsDragging(true)
    
    const rect = scrubberRef.current.getBoundingClientRect()
    const scrollLeft = containerRef?.current?.scrollLeft || 0
    const x = e.clientX - rect.left + scrollLeft
    const timeMs = viewport.pixelToTime(x)
    const clampedTime = Math.max(0, Math.min(viewport.getState().durationMs, timeMs))
    onSeek(clampedTime / 1000)
  }, [containerRef, onSeek, viewport])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return
    
    const rect = scrubberRef.current.getBoundingClientRect()
    const scrollLeft = containerRef?.current?.scrollLeft || 0
    const x = e.clientX - rect.left + scrollLeft
    setHoverX(x)
    
    if (isDragging) {
      const timeMs = viewport.pixelToTime(x)
      const clampedTime = Math.max(0, Math.min(viewport.getState().durationMs, timeMs))
      onSeek(clampedTime / 1000)
    }
  }, [containerRef, isDragging, onSeek, viewport])

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

  const totalWidth = viewport.getTotalWidth()
  const playheadX = viewport.timeToPixel(currentTime * 1000)

  return (
    <div
      ref={scrubberRef}
      className={`relative select-none cursor-pointer ${className}`}
      style={{ width: `${totalWidth}px`, minWidth: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Timeline track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-gray-600 rounded-full" />
      
      {/* Progress fill */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-500 rounded-l-full"
        style={{ 
          left: 0, 
          width: `${Math.min(playheadX, totalWidth)}px` 
        }}
      />
      
      {/* Hover indicator */}
      {hoverX !== null && !isDragging && (
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none"
          style={{ left: `${hoverX}px` }}
        />
      )}
      
      {/* Playhead handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
        style={{ left: `${playheadX}px` }}
      >
        {/* Handle circle */}
        <div className={`w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg ${isDragging ? 'scale-125' : ''} transition-transform`} />
        
        {/* Time tooltip */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap pointer-events-none">
          {formatTime(currentTime)}
        </div>
        
        {/* Vertical line */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-25 bg-red-500/50 pointer-events-none" />
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

import { useState, useRef, useEffect } from 'react'

export type NoteType = 'tap' | 'hold'

export interface Note {
  id: string
  lane: number
  time: number
  type: NoteType
  duration?: number // for hold notes
}

interface BeatmapEditorProps {
  duration: number
  currentTime: number
  notes: Note[]
  onNotesChange: (notes: Note[]) => void
  bpm?: number
  snapEnabled?: boolean
  snapDivision?: number
  className?: string
}

export default function BeatmapEditor({ 
  duration, 
  currentTime, 
  notes, 
  onNotesChange,
  bpm = 120,
  snapEnabled = true,
  snapDivision = 4,
  className = '' 
}: BeatmapEditorProps) {
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType>('tap')
  const [isPlacingHold, setIsPlacingHold] = useState(false)
  const [holdStartTime, setHoldStartTime] = useState<number>(0)
  const [holdStartLane, setHoldStartLane] = useState<number>(0)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [hoveredLane, setHoveredLane] = useState<number | null>(null)
  const [ghostNotePosition, setGhostNotePosition] = useState<{ lane: number; time: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const LANES = 5
  const LANE_HEIGHT = 60

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const timeToPixel = (time: number): number => {
    if (containerWidth === 0 || duration === 0) return 0
    return (time / duration) * containerWidth
  }

  const pixelToTime = (pixel: number): number => {
    if (containerWidth === 0 || duration === 0) return 0
    return (pixel / containerWidth) * duration
  }

  const snapToGrid = (time: number): number => {
    if (!snapEnabled) return time
    const beatDuration = 60 / bpm
    const snapInterval = beatDuration / snapDivision
    return Math.round(time / snapInterval) * snapInterval
  }

  const handleLaneClick = (laneIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let clickTime = pixelToTime(x)
    clickTime = snapToGrid(clickTime)

    if (selectedNoteType === 'tap') {
      const newNote: Note = {
        id: crypto.randomUUID(),
        lane: laneIndex,
        time: clickTime,
        type: 'tap'
      }
      onNotesChange([...notes, newNote])
    } else if (selectedNoteType === 'hold') {
      if (!isPlacingHold) {
        // Start placing hold note
        setIsPlacingHold(true)
        setHoldStartTime(clickTime)
        setHoldStartLane(laneIndex)
      } else if (isPlacingHold && holdStartLane === laneIndex) {
        // Complete hold note
        const newNote: Note = {
          id: crypto.randomUUID(),
          lane: laneIndex,
          time: Math.min(holdStartTime, clickTime),
          type: 'hold',
          duration: Math.abs(clickTime - holdStartTime)
        }
        onNotesChange([...notes, newNote])
        setIsPlacingHold(false)
      } else {
        // Cancel if clicking different lane
        setIsPlacingHold(false)
      }
    }
  }

  const handleDeleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onNotesChange(notes.filter(note => note.id !== noteId))
  }

  const renderNote = (note: Note) => {
    const left = timeToPixel(note.time)
    const top = note.lane * LANE_HEIGHT

    if (note.type === 'tap') {
      return (
        <div
          key={note.id}
          className="absolute bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600"
          style={{
            left: `${left}px`,
            top: `${top + 15}px`,
            width: '30px',
            height: '30px',
            transform: 'translateX(-15px)'
          }}
          onClick={(e) => handleDeleteNote(note.id, e)}
          title="Click to delete"
        />
      )
    } else if (note.type === 'hold' && note.duration) {
      const width = timeToPixel(note.duration)
      return (
        <div
          key={note.id}
          className="absolute bg-yellow-500 rounded cursor-pointer hover:bg-yellow-600"
          style={{
            left: `${left}px`,
            top: `${top + 20}px`,
            width: `${width}px`,
            height: '20px'
          }}
          onClick={(e) => handleDeleteNote(note.id, e)}
          title="Click to delete"
        />
      )
    }
  }

  const playheadPosition = timeToPixel(currentTime)

  const handleLaneMouseMove = (laneIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    let hoverTime = pixelToTime(x)
    hoverTime = snapToGrid(hoverTime)
    setGhostNotePosition({ lane: laneIndex, time: hoverTime })
  }

  const handleLaneMouseLeave = () => {
    setGhostNotePosition(null)
    setHoveredLane(null)
  }

  const handleClearAll = () => {
    if (notes.length === 0) return
    if (window.confirm(`Are you sure you want to delete all ${notes.length} notes? This cannot be undone.`)) {
      onNotesChange([])
    }
  }

  // Calculate beat grid lines
  const getBeatGridLines = () => {
    if (duration === 0 || bpm === 0) return []
    const beatDuration = 60 / bpm
    const lines: { time: number; isMeasure: boolean }[] = []
    
    let currentTime = 0
    let beatCount = 0
    while (currentTime <= duration) {
      const isMeasure = beatCount % 4 === 0
      lines.push({ time: currentTime, isMeasure })
      currentTime += beatDuration
      beatCount++
    }
    return lines
  }

  const beatGridLines = getBeatGridLines()

  return (
    <div className={className}>
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2 items-center">
          <span className="font-semibold">Note Type:</span>
          <button
            className={`px-4 py-2 rounded ${selectedNoteType === 'tap' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}
            onClick={() => {
              setSelectedNoteType('tap')
              setIsPlacingHold(false)
            }}
          >
            Tap
          </button>
          <button
            className={`px-4 py-2 rounded ${selectedNoteType === 'hold' ? 'bg-yellow-500 text-white' : 'bg-gray-300'}`}
            onClick={() => setSelectedNoteType('hold')}
          >
            Hold
          </button>
        </div>

        {isPlacingHold && (
          <span className="text-sm text-orange-600 font-medium">
            Click again on the same lane to complete hold note
          </span>
        )}

        <button
          className="ml-auto px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          onClick={handleClearAll}
          disabled={notes.length === 0}
        >
          Clear All ({notes.length})
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative border-2 rounded-md overflow-hidden bg-gray-900"
        style={{ height: `${LANES * LANE_HEIGHT}px` }}
      >
        {/* Beat Grid Lines */}
        {beatGridLines.map((line, index) => {
          const x = timeToPixel(line.time)
          return (
            <div
              key={index}
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${x}px`,
                width: line.isMeasure ? '2px' : '1px',
                backgroundColor: line.isMeasure ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'
              }}
            />
          )
        })}

        {/* Lanes */}
        {Array.from({ length: LANES }).map((_, index) => (
          <div
            key={index}
            className={`absolute w-full border-b border-gray-700 cursor-crosshair transition-colors ${
              hoveredLane === index ? 'bg-gray-800' : ''
            }`}
            style={{
              top: `${index * LANE_HEIGHT}px`,
              height: `${LANE_HEIGHT}px`
            }}
            onClick={(e) => handleLaneClick(index, e)}
            onMouseMove={(e) => {
              setHoveredLane(index)
              handleLaneMouseMove(index, e)
            }}
            onMouseLeave={handleLaneMouseLeave}
          >
            <span className="absolute left-2 top-2 text-white text-sm pointer-events-none">
              Lane {index + 1}
            </span>
          </div>
        ))}

        {/* Ghost Note Preview */}
        {ghostNotePosition && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${timeToPixel(ghostNotePosition.time)}px`,
              top: `${ghostNotePosition.lane * LANE_HEIGHT + 15}px`,
              width: '30px',
              height: '30px',
              transform: 'translateX(-15px)',
              borderRadius: '50%',
              backgroundColor: selectedNoteType === 'tap' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(234, 179, 8, 0.4)',
              border: '2px dashed rgba(255, 255, 255, 0.6)'
            }}
          />
        )}

        {/* Notes */}
        {notes.map(note => renderNote(note))}

        {/* Playhead */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{ left: `${playheadPosition}px` }}
          />
        )}
      </div>

      <div className="mt-2 text-sm text-gray-600">
        Total notes: {notes.length} (Tap: {notes.filter(n => n.type === 'tap').length}, Hold: {notes.filter(n => n.type === 'hold').length})
      </div>
    </div>
  )
}

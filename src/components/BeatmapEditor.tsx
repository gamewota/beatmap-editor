import { useState, useRef, useEffect, useCallback } from 'react'
import { SfxManager } from '../utils/SfxManager'
import { TimelineRenderer } from '../utils/TimelineRenderer'
import type { TimelineViewport } from '../utils/TimelineViewport'

export type NoteType = 'tap' | 'hold'

export interface Note {
  id: string
  lane: number
  time: number
  type: NoteType
  duration?: number 
}

interface BeatmapEditorProps {
  duration: number  // Kept for API compatibility, viewport manages actual duration
  currentTime: number
  notes: Note[]
  onNotesChange: (notes: Note[]) => void
  bpm?: number
  snapEnabled?: boolean
  snapDivision?: number
  viewport: TimelineViewport
  className?: string
  sfxEnabled?: boolean
  onSfxEnabledChange?: (enabled: boolean) => void
  onScroll?: (scrollLeft: number) => void
}

export default function BeatmapEditor({ 
  // duration kept for API compatibility but not used - viewport manages it
  currentTime, 
  notes, 
  onNotesChange,
  bpm = 120,
  snapEnabled = true,
  snapDivision = 4,
  viewport,
  className = '',
  sfxEnabled = true,
  onSfxEnabledChange,
  onScroll
}: BeatmapEditorProps) {
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType>('tap')
  const [isPlacingHold, setIsPlacingHold] = useState(false)
  const [holdStartTime, setHoldStartTime] = useState<number>(0)
  const [holdStartLane, setHoldStartLane] = useState<number>(0)
  const [internalSfxEnabled, setInternalSfxEnabled] = useState(sfxEnabled)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const staticCanvasRef = useRef<HTMLCanvasElement>(null)
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null)
  const interactionLayerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<TimelineRenderer | null>(null)
  const sfxManagerRef = useRef<SfxManager | null>(null)
  const lastTimeRef = useRef<number>(0)
  const playedNotesRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef<number>(0)
  const currentTimeInternalRef = useRef<number>(0)
  // Store raw cursor position - conversion happens in frame loop
  const cursorXRef = useRef<number | null>(null)
  const cursorYRef = useRef<number | null>(null)
  // Cache selected note type in ref to avoid restarting animation loop
  const selectedNoteTypeRef = useRef<NoteType>('tap')
  // Reusable ghost note object to avoid allocations in frame loop
  const ghostNoteObjectRef = useRef<{ lane: number; time: number; type: NoteType }>({ lane: 0, time: 0, type: 'tap' })

  // Track which SFX state to use
  const effectiveSfxEnabled = onSfxEnabledChange ? sfxEnabled : internalSfxEnabled
  const setSfxEnabled = onSfxEnabledChange || setInternalSfxEnabled

  const LANES = 5
  const LANE_HEIGHT = 60

  // Sync selected note type to ref
  useEffect(() => {
    selectedNoteTypeRef.current = selectedNoteType
  }, [selectedNoteType])

  // Initialize canvas renderer
  useEffect(() => {
    if (!staticCanvasRef.current || !dynamicCanvasRef.current) return

    rendererRef.current = new TimelineRenderer(
      staticCanvasRef.current,
      dynamicCanvasRef.current,
      viewport,
      {
        lanes: LANES,
        laneHeight: LANE_HEIGHT,
        bpm,
        snapEnabled,
        snapDivision
      }
    )

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update renderer config when props change
  useEffect(() => {
    if (!rendererRef.current) return

    rendererRef.current.updateConfig({
      bpm,
      snapEnabled,
      snapDivision
    })
  }, [bpm, snapEnabled, snapDivision])

  // Handle canvas resize
  useEffect(() => {
    const updateSize = () => {
      if (!scrollContainerRef.current || !rendererRef.current) return

      const container = scrollContainerRef.current
      const width = viewport.getTotalWidth()
      const height = LANES * LANE_HEIGHT

      // Update viewport with container width
      viewport.setViewportWidth(container.offsetWidth)

      rendererRef.current.updateCanvasSize(Math.max(width, container.offsetWidth), height)
    }

    updateSize()
    
    // Subscribe to viewport changes
    const unsubscribe = viewport.subscribe(() => {
      updateSize()
      // CRITICAL: Force re-render after viewport changes (zoom, duration, etc.)
      if (rendererRef.current) {
        rendererRef.current.forceStaticRedraw()
        rendererRef.current.renderStatic(notes)
      }
    })

    window.addEventListener('resize', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      unsubscribe()
    }
  }, [viewport, notes])

  // Render static content when data changes
  useEffect(() => {
    if (!rendererRef.current) return
    rendererRef.current.forceStaticRedraw()
    rendererRef.current.renderStatic(notes)
  }, [notes, bpm])

  // Animation loop for dynamic content (playhead, ghost notes)
  // Runs at 60fps, reads from refs to avoid triggering React re-renders
  // ALL cursor conversion and snapping happens here, not in event handlers
  useEffect(() => {
    if (!rendererRef.current) return

    const animate = () => {
      if (!rendererRef.current) return

      let ghostNote: { lane: number; time: number; type: NoteType } | null = null

      // Convert raw cursor position to timeline time INSIDE frame loop
      if (cursorXRef.current !== null && cursorYRef.current !== null) {
        const laneIndex = Math.floor(cursorYRef.current / LANE_HEIGHT)
        
        if (laneIndex >= 0 && laneIndex < LANES) {
          // Convert pixel to time
          let hoverTime = rendererRef.current.pixelToTime(cursorXRef.current) / 1000
          
          // Development-only: Verify round-trip conversion is accurate
          if (import.meta.env.DEV) {
            const roundTripPixel = rendererRef.current.timeToPixel(hoverTime)
            const error = Math.abs(roundTripPixel - cursorXRef.current)
            if (error > 1.0) {
              console.warn(
                `Round-trip conversion error: ${error.toFixed(2)}px`,
                `Input: ${cursorXRef.current}px, Time: ${hoverTime}s, Output: ${roundTripPixel}px`
              )
            }
          }
          
          // Snap to grid
          if (snapEnabled) {
            const beatDuration = 60 / bpm
            const snapInterval = beatDuration / snapDivision
            hoverTime = Math.round(hoverTime / snapInterval) * snapInterval
          }
          
          // Reuse existing object to avoid allocations
          const reusableGhost = ghostNoteObjectRef.current
          reusableGhost.lane = laneIndex
          reusableGhost.time = hoverTime
          reusableGhost.type = selectedNoteTypeRef.current
          ghostNote = reusableGhost
        }
      }

      rendererRef.current.renderDynamic(currentTimeInternalRef.current * 1000, ghostNote)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [snapEnabled, bpm, snapDivision])

  // Sync external currentTime to internal ref (no setState in render loop)
  useEffect(() => {
    currentTimeInternalRef.current = currentTime
  }, [currentTime])

  // Initialize SFX Manager (lazy creation, no eager initialization)
  useEffect(() => {
    sfxManagerRef.current = new SfxManager()

    return () => {
      sfxManagerRef.current?.cleanup()
    }
  }, [])

  // Time-driven SFX trigger logic
  useEffect(() => {
    if (!effectiveSfxEnabled || !sfxManagerRef.current) return

    const currentTimeMs = currentTime * 1000
    const lastTimeMs = lastTimeRef.current * 1000

    // Reset played notes when seeking backwards or stopped
    if (currentTimeMs < lastTimeMs) {
      playedNotesRef.current.clear()
    }

    // Check each note for time-crossing events
    notes.forEach(note => {
      const noteTimeMs = note.time * 1000
      const hasBeenPlayed = playedNotesRef.current.has(note.id)

      // Trigger SFX when playhead crosses note start time
      if (!hasBeenPlayed && lastTimeMs < noteTimeMs && currentTimeMs >= noteTimeMs) {
        sfxManagerRef.current?.play()
        playedNotesRef.current.add(note.id)
      }
    })

    lastTimeRef.current = currentTime
  }, [currentTime, notes, effectiveSfxEnabled])

  // Convert pixel to time using renderer's scale
  const pixelToTime = useCallback((pixel: number): number => {
    if (!rendererRef.current) return 0
    return rendererRef.current.pixelToTime(pixel) / 1000
  }, [])

  // Convert time to pixel using renderer's scale
  const timeToPixel = useCallback((time: number): number => {
    if (!rendererRef.current) return 0
    return rendererRef.current.timeToPixel(time * 1000)
  }, [])

  const snapToGrid = useCallback((time: number): number => {
    if (!snapEnabled) return time
    const beatDuration = 60 / bpm
    const snapInterval = beatDuration / snapDivision
    return Math.round(time / snapInterval) * snapInterval
  }, [snapEnabled, bpm, snapDivision])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return

    // Use container rect for consistent coordinate conversion
    const containerRect = scrollContainerRef.current.getBoundingClientRect()
    const scrollLeft = scrollContainerRef.current.scrollLeft
    
    // Convert to absolute timeline coordinates
    const x = (e.clientX - containerRect.left) + scrollLeft
    const y = e.clientY - containerRect.top

    const laneIndex = Math.floor(y / LANE_HEIGHT)
    if (laneIndex < 0 || laneIndex >= LANES) return

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
        setIsPlacingHold(false)
      }
    }
  }, [selectedNoteType, isPlacingHold, holdStartLane, holdStartTime, notes, onNotesChange, pixelToTime, snapToGrid])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return

    // CRITICAL: Use scroll container's rect, not interaction layer's rect
    // The interaction layer is inside the scrolled content, so its rect.left changes with scroll
    // We need the container's position + scroll offset for absolute timeline coordinates
    const containerRect = scrollContainerRef.current.getBoundingClientRect()
    const scrollLeft = scrollContainerRef.current.scrollLeft

    // Convert to absolute timeline pixel position
    // clientX - containerRect.left = position within visible viewport
    // + scrollLeft = absolute position in timeline
    cursorXRef.current = (e.clientX - containerRect.left) + scrollLeft
    cursorYRef.current = e.clientY - containerRect.top
  }, [])

  const handleCanvasMouseLeave = useCallback(() => {
    // Clear cursor position - ghost note will disappear next frame
    cursorXRef.current = null
    cursorYRef.current = null
  }, [])

  // Handle note deletion (click on note) - returns true if a note was clicked
  const handleNoteClick = useCallback((e: React.MouseEvent<HTMLDivElement>): boolean => {
    if (!scrollContainerRef.current) return false

    // Use container rect for consistent coordinate conversion
    const containerRect = scrollContainerRef.current.getBoundingClientRect()
    const scrollLeft = scrollContainerRef.current.scrollLeft
    
    // Convert to absolute timeline coordinates
    const x = (e.clientX - containerRect.left) + scrollLeft
    const y = e.clientY - containerRect.top

    const clickLane = Math.floor(y / LANE_HEIGHT)

    // Find note at click position
    const clickedNote = notes.find(note => {
      if (note.lane !== clickLane) return false

      if (note.type === 'tap') {
        // Check if click is within tap note radius (15px)
        const noteX = timeToPixel(note.time)
        const noteY = note.lane * LANE_HEIGHT + 30
        const distance = Math.sqrt(Math.pow(x - noteX, 2) + Math.pow(y - noteY, 2))
        return distance <= 15
      } else if (note.type === 'hold') {
        // Check if click is within hold note bounds
        const startX = timeToPixel(note.time)
        const endX = timeToPixel(note.time + (note.duration || 0))
        const noteY = note.lane * LANE_HEIGHT + 20
        return x >= startX && x <= endX && y >= noteY && y <= noteY + 20
      }

      return false
    })

    if (clickedNote) {
      onNotesChange(notes.filter(n => n.id !== clickedNote.id))
      return true
    }

    return false
  }, [notes, onNotesChange, timeToPixel])

  const handleClearAll = () => {
    if (notes.length === 0) return
    if (window.confirm(`Are you sure you want to delete all ${notes.length} notes? This cannot be undone.`)) {
      onNotesChange([])
    }
  }

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (!scrollContainerRef.current || !rendererRef.current) return
    
    const scrollContainer = scrollContainerRef.current
    
    // Use viewport auto-scroll
    viewport.autoScrollToTime(currentTime * 1000, 0.3)
    
    // Sync container scroll with viewport
    scrollContainer.scrollLeft = viewport.getScrollLeft()
  }, [currentTime, viewport])

  // Update viewport on manual scroll (critical for note visibility)
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer || !rendererRef.current) return

    const handleScroll = () => {
      if (!rendererRef.current || !scrollContainerRef.current) return
      
      // Update viewport scroll position
      viewport.setScrollLeft(scrollContainerRef.current.scrollLeft)
      
      // Notify parent of scroll
      if (onScroll) {
        onScroll(scrollContainerRef.current.scrollLeft)
      }
      
      rendererRef.current.forceStaticRedraw()
      rendererRef.current.renderStatic(notes)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [notes, viewport, onScroll])

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

        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={effectiveSfxEnabled}
              onChange={(e) => setSfxEnabled(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-sm">Preview Note SFX</span>
          </label>
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

      <div ref={scrollContainerRef} className="relative border-2 rounded-md overflow-x-auto bg-gray-900">
        <div className="relative" style={{ width: `${viewport.getTotalWidth()}px`, minWidth: '100%' }}>
          {/* Static Canvas Layer - Beat grid, lanes, notes */}
          <canvas
            ref={staticCanvasRef}
            className="absolute top-0 left-0"
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Dynamic Canvas Layer - Playhead, ghost notes */}
          <canvas
            ref={dynamicCanvasRef}
            className="absolute top-0 left-0"
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Interaction Layer - Transparent overlay for mouse events */}
          <div
            ref={interactionLayerRef}
            className="relative cursor-crosshair"
            style={{ 
              height: `${LANES * LANE_HEIGHT}px`,
              width: '100%'
            }}
            onClick={(e) => {
              // Try to delete note first; only place new note if no note was clicked
              const noteWasClicked = handleNoteClick(e)
              if (!noteWasClicked) {
                handleCanvasClick(e)
              }
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        Total notes: {notes.length} (Tap: {notes.filter(n => n.type === 'tap').length}, Hold: {notes.filter(n => n.type === 'hold').length})
      </div>
    </div>
  )
}

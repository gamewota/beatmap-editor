/**
 * High-performance timeline renderer using dual-canvas approach
 * Static canvas: Beat grid, lane backgrounds (redraws only on zoom/data change)
 * Dynamic canvas: Playhead, ghost notes (redraws every frame)
 * 
 * Now uses TimelineViewport as single source of truth for zoom and scroll
 */

import type { Note } from '../components/BeatmapEditor'
import type { TimelineViewport } from './TimelineViewport'

export interface TimelineScale {
  pixelsPerMs: number
  viewportStartMs: number
  viewportEndMs: number
  containerWidth: number
  containerHeight: number
}

export interface RenderConfig {
  lanes: number
  laneHeight: number
  bpm: number
  snapEnabled?: boolean
  snapDivision?: number
}

export class TimelineRenderer {
  private staticCanvas: HTMLCanvasElement
  private dynamicCanvas: HTMLCanvasElement
  private staticCtx: CanvasRenderingContext2D
  private dynamicCtx: CanvasRenderingContext2D
  private config: RenderConfig
  private cachedWidth = 0
  private cachedHeight = 0
  private needsStaticRedraw = true
  private viewport: TimelineViewport

  constructor(
    staticCanvas: HTMLCanvasElement,
    dynamicCanvas: HTMLCanvasElement,
    viewport: TimelineViewport,
    config: RenderConfig
  ) {
    this.staticCanvas = staticCanvas
    this.dynamicCanvas = dynamicCanvas
    this.viewport = viewport
    this.config = config

    const staticCtx = staticCanvas.getContext('2d', { alpha: false })
    const dynamicCtx = dynamicCanvas.getContext('2d', { alpha: true })

    if (!staticCtx || !dynamicCtx) {
      throw new Error('Failed to get canvas contexts')
    }

    this.staticCtx = staticCtx
    this.dynamicCtx = dynamicCtx

    // Subscribe to viewport changes and trigger re-render callback
    this.viewport.subscribe(() => {
      this.needsStaticRedraw = true
      // Viewport changes require re-render (zoom, scroll, etc.)
      // The subscriber (BeatmapEditor) will call renderStatic()
    })
  }

  updateConfig(config: Partial<RenderConfig>) {
    const changed = Object.keys(config).some(
      key => this.config[key as keyof RenderConfig] !== config[key as keyof RenderConfig]
    )

    if (changed) {
      this.config = { ...this.config, ...config }
      this.needsStaticRedraw = true
    }
  }

  updateCanvasSize(width: number, height: number) {
    if (this.cachedWidth === width && this.cachedHeight === height) return

    this.cachedWidth = width
    this.cachedHeight = height

    // Set display size
    this.staticCanvas.style.width = `${width}px`
    this.staticCanvas.style.height = `${height}px`
    this.dynamicCanvas.style.width = `${width}px`
    this.dynamicCanvas.style.height = `${height}px`

    // Set actual size in memory (use device pixel ratio for crisp rendering)
    // WARNING: Setting canvas.width/height clears the canvas and resets transforms
    const dpr = window.devicePixelRatio || 1
    this.staticCanvas.width = width * dpr
    this.staticCanvas.height = height * dpr
    this.dynamicCanvas.width = width * dpr
    this.dynamicCanvas.height = height * dpr

    // CRITICAL: Reapply DPR scaling after canvas resize (transforms were reset)
    // Get fresh context to ensure we have the latest state
    const staticCtx = this.staticCanvas.getContext('2d', { alpha: false })
    const dynamicCtx = this.dynamicCanvas.getContext('2d', { alpha: true })
    
    if (staticCtx && dynamicCtx) {
      staticCtx.scale(dpr, dpr)
      dynamicCtx.scale(dpr, dpr)
    }

    this.needsStaticRedraw = true
  }

  /**
   * Convert time to pixel position using viewport
   */
  timeToPixel(timeMs: number): number {
    return this.viewport.timeToPixel(timeMs)
  }

  /**
   * Convert pixel to time using viewport
   */
  pixelToTime(pixel: number): number {
    return this.viewport.pixelToTime(pixel)
  }

  // Calculate grid-aligned X position for snapped notes
  private getGridAlignedX(timeMs: number): number {
    const { bpm, snapEnabled, snapDivision } = this.config
    
    if (!snapEnabled || !bpm || !snapDivision) {
      // No snapping - use exact time position
      return this.timeToPixel(timeMs)
    }

    // Calculate which grid column this note belongs to
    const beatDurationMs = (60 / bpm) * 1000
    const gridIntervalMs = beatDurationMs / snapDivision
    const gridIndex = Math.round(timeMs / gridIntervalMs)
    const gridColumnCenterMs = gridIndex * gridIntervalMs
    
    // Return pixel position of grid column center
    return this.timeToPixel(gridColumnCenterMs)
  }

  renderStatic(notes: Note[]) {
    if (!this.needsStaticRedraw) return

    const ctx = this.staticCtx
    const { lanes, laneHeight, bpm } = this.config
    const state = this.viewport.getState()
    const totalWidth = this.viewport.getTotalWidth()

    // Safeguard: Don't render with invalid scale
    if (!state.pixelsPerMs || state.pixelsPerMs <= 0 || !isFinite(state.pixelsPerMs)) {
      console.warn('Invalid pixelsPerMs, skipping render')
      return
    }

    // Clear
    ctx.fillStyle = '#111827' // bg-gray-900
    ctx.fillRect(0, 0, totalWidth, this.cachedHeight)

    // Draw beat grid lines
    this.drawBeatGrid(ctx, bpm, state.durationMs / 1000)

    // Draw lane dividers
    ctx.strokeStyle = '#374151' // border-gray-700
    ctx.lineWidth = 1
    for (let i = 1; i < lanes; i++) {
      const y = i * laneHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(totalWidth, y)
      ctx.stroke()
    }

    // Draw lane labels
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px sans-serif'
    for (let i = 0; i < lanes; i++) {
      ctx.fillText(`Lane ${i + 1}`, 8, i * laneHeight + 16)
    }

    // Draw notes (static)
    this.drawNotes(ctx, notes)

    this.needsStaticRedraw = false
  }

  private drawBeatGrid(ctx: CanvasRenderingContext2D, bpm: number, duration: number) {
    if (bpm === 0 || duration === 0) return

    const { snapEnabled, snapDivision } = this.config
    const beatDurationMs = (60 / bpm) * 1000
    const durationMs = duration * 1000
    
    // CRITICAL: Multi-level grid for musical clarity
    // Level 1: Always draw beat grid (1/1) - PRIMARY MUSICAL STRUCTURE
    // Level 2: Draw common subdivision (1/4) for context
    // Level 3: Draw snap grid if different from above
    
    // Helper to draw a grid level
    const drawGridLevel = (intervalMs: number, style: { color: string; width: number; opacity: number }) => {
      let currentTimeMs = 0
      while (currentTimeMs <= durationMs) {
        const x = Math.round(this.timeToPixel(currentTimeMs))
        
        // Check if this is a measure line (every 4 beats)
        const beatIndex = Math.round(currentTimeMs / beatDurationMs)
        const isMeasure = beatIndex % 4 === 0 && Math.abs(currentTimeMs - beatIndex * beatDurationMs) < 1
        
        if (isMeasure) {
          // Measure lines are always strongest
          ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`
          ctx.lineWidth = 2.5
        } else {
          ctx.strokeStyle = style.color
          ctx.lineWidth = style.width
        }

        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, this.cachedHeight)
        ctx.stroke()

        currentTimeMs += intervalMs
      }
    }
    
    // Level 1: ALWAYS render beat grid (1/1) - NON-NEGOTIABLE
    drawGridLevel(beatDurationMs, {
      color: 'rgba(255, 255, 255, 0.25)', // Bright - primary structure
      width: 2,
      opacity: 0.25
    })
    
    // Level 2: Render 1/4 subdivision for musical context (if not already beat grid)
    if (snapDivision && snapDivision > 1) {
      const quarterNoteMs = beatDurationMs / 4
      if (quarterNoteMs !== beatDurationMs) {
        drawGridLevel(quarterNoteMs, {
          color: 'rgba(255, 255, 255, 0.12)', // Medium - subdivision context
          width: 1,
          opacity: 0.12
        })
      }
    }
    
    // Level 3: Render actual snap grid (if different from beat and 1/4)
    if (snapEnabled && snapDivision && snapDivision > 4) {
      const snapIntervalMs = beatDurationMs / snapDivision
      // Only draw if not already covered by beat or 1/4 grid
      if (snapIntervalMs !== beatDurationMs && snapIntervalMs !== beatDurationMs / 4) {
        drawGridLevel(snapIntervalMs, {
          color: 'rgba(255, 255, 255, 0.06)', // Subtle - precision guides
          width: 0.5,
          opacity: 0.06
        })
      }
    }
  }

  private drawNotes(ctx: CanvasRenderingContext2D, notes: Note[]) {
    const { laneHeight, snapEnabled } = this.config
    const state = this.viewport.getState()
    const viewportEndMs = this.viewport.getViewportEndMs()

    // Note visual sizes (reduced for better precision)
    const TAP_RADIUS = 10 // Reduced from 15
    const HOLD_HEIGHT = 16 // Reduced from 20

    notes.forEach(note => {
      const noteTimeMs = note.time * 1000
      const noteEndMs = note.duration ? (note.time + note.duration) * 1000 : noteTimeMs

      // Viewport culling
      if (noteEndMs < state.viewportStartMs || noteTimeMs > viewportEndMs) return

      // Use grid-aligned position when snap is enabled
      let x = snapEnabled ? this.getGridAlignedX(noteTimeMs) : this.timeToPixel(noteTimeMs)
      
      // Round to eliminate sub-pixel drift at high zoom
      x = Math.round(x)
      
      const y = note.lane * laneHeight

      if (note.type === 'tap') {
        ctx.fillStyle = '#3b82f6' // bg-blue-500
        ctx.beginPath()
        ctx.arc(x, y + 30, TAP_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      } else if (note.type === 'hold' && note.duration) {
        const width = this.timeToPixel(note.duration * 1000)
        ctx.fillStyle = '#eab308' // bg-yellow-500
        const holdY = y + (60 - HOLD_HEIGHT) / 2 // Center vertically in lane
        ctx.fillRect(x, holdY, width, HOLD_HEIGHT)
      }
    })
  }

  renderDynamic(
    currentTimeMs: number, 
    ghostNote: { lane: number; time: number; type: 'tap' | 'hold' } | null,
    snapHighlightTimeMs: number | null = null
  ) {
    const ctx = this.dynamicCtx
    const totalWidth = this.viewport.getTotalWidth()
    const { laneHeight, snapEnabled } = this.config
    const state = this.viewport.getState()

    // Safeguard: Don't render with invalid scale
    if (!state.pixelsPerMs || state.pixelsPerMs <= 0 || !isFinite(state.pixelsPerMs)) {
      // Clear canvas and skip rendering
      ctx.clearRect(0, 0, totalWidth, this.cachedHeight)
      return
    }

    // Ghost note sizes (smaller than real notes for visual distinction)
    const GHOST_TAP_RADIUS = 8 // Smaller than real note (10)
    const GHOST_HOLD_HEIGHT = 14 // Smaller than real note (16)
    const GHOST_HOLD_WIDTH = 24 // Fixed width for visual preview

    // Clear
    ctx.clearRect(0, 0, totalWidth, this.cachedHeight)

    // Draw snap target highlight (when snap is enabled and cursor is hovering)
    if (snapEnabled && snapHighlightTimeMs !== null) {
      const highlightX = Math.round(this.getGridAlignedX(snapHighlightTimeMs))
      
      // Draw highlighted column background
      ctx.fillStyle = 'rgba(96, 165, 250, 0.1)' // Very subtle blue highlight
      const columnWidth = 8 // Subtle width for highlight
      ctx.fillRect(highlightX - columnWidth / 2, 0, columnWidth, this.cachedHeight)
      
      // Draw highlighted snap line (stronger than normal grid)
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)' // Brighter blue
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(highlightX, 0)
      ctx.lineTo(highlightX, this.cachedHeight)
      ctx.stroke()
    }

    // Draw playhead
    let playheadX = this.timeToPixel(currentTimeMs)
    
    // Round to eliminate sub-pixel drift
    playheadX = Math.round(playheadX)
    
    ctx.strokeStyle = '#ef4444' // bg-red-500
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, this.cachedHeight)
    ctx.stroke()

    // Draw ghost note
    if (ghostNote) {
      // Use grid-aligned position when snap is enabled
      let x = snapEnabled ? this.getGridAlignedX(ghostNote.time * 1000) : this.timeToPixel(ghostNote.time * 1000)
      
      // Round to eliminate sub-pixel drift at high zoom
      x = Math.round(x)
      
      const y = ghostNote.lane * laneHeight

      if (ghostNote.type === 'tap') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'
        ctx.beginPath()
        ctx.arc(x, y + 30, GHOST_TAP_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.fillStyle = 'rgba(234, 179, 8, 0.4)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        const holdY = y + (60 - GHOST_HOLD_HEIGHT) / 2 // Center vertically in lane
        ctx.fillRect(x - GHOST_HOLD_WIDTH / 2, holdY, GHOST_HOLD_WIDTH, GHOST_HOLD_HEIGHT)
        ctx.strokeRect(x - GHOST_HOLD_WIDTH / 2, holdY, GHOST_HOLD_WIDTH, GHOST_HOLD_HEIGHT)
        ctx.setLineDash([])
      }
    }
  }

  forceStaticRedraw() {
    this.needsStaticRedraw = true
  }

  getViewport(): TimelineViewport {
    return this.viewport
  }
}

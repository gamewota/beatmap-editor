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
  offsetMs?: number
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
  private unsubscribeViewport: (() => void) | null = null

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
    this.unsubscribeViewport = this.viewport.subscribe(() => {
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

  // Calculate grid-aligned X position. Notes always snap to the visible grid.
  // Snap denominator divides the whole note (4 beats), matching music conventions.
  private getGridAlignedX(timeMs: number): number {
    const { bpm, snapDivision, offsetMs = 0 } = this.config

    if (!bpm || !snapDivision) {
      return this.timeToPixel(timeMs)
    }

    const beatDurationMs = (60 / bpm) * 1000
    const gridIntervalMs = (4 * beatDurationMs) / snapDivision
    const gridIndex = Math.round((timeMs - offsetMs) / gridIntervalMs)
    const gridColumnCenterMs = gridIndex * gridIntervalMs + offsetMs

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

    // Draw lane dividers (batched in a single path)
    ctx.strokeStyle = '#374151' // border-gray-700
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 1; i < lanes; i++) {
      const y = i * laneHeight
      ctx.moveTo(0, y)
      ctx.lineTo(totalWidth, y)
    }
    ctx.stroke()

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

    const { offsetMs = 0, snapDivision = 8 } = this.config
    const beatDurationMs = (60 / bpm) * 1000
    const durationMs = duration * 1000
    const height = this.cachedHeight

    // Snap denominator follows the music convention: 1/1 = whole note (1 snap
    // per measure), 1/4 = quarter note (1 snap per beat), 1/8 = eighth, etc.
    // So the snap interval divides the WHOLE NOTE (4 beats in 4/4), not a beat.
    const subdivisionDiv = Math.max(1, Math.floor(snapDivision))
    const wholeDurationMs = 4 * beatDurationMs
    const subdivisionIntervalMs = wholeDurationMs / subdivisionDiv

    if (!isFinite(subdivisionIntervalMs) || subdivisionIntervalMs <= 0) return

    // Iterate the full timeline duration so the static canvas covers all of it
    // (canvas scrolls natively with the container; we paint once, scroll is free).
    const firstIdx = Math.max(0, Math.ceil(-offsetMs / subdivisionIntervalMs))
    const lastIdx = Math.ceil((durationMs - offsetMs) / subdivisionIntervalMs)

    // Collect line X positions grouped by tier so we can batch strokes
    const subBeatXs: number[] = []
    const beatXs: number[] = []
    const measureXs: number[] = []

    // Tier logic:
    //   - measure boundary: every `subdivisionDiv` steps (every whole note).
    //   - beat-aligned   : every `subdivisionDiv / 4` steps when that's an
    //                      integer (i.e., snapDiv >= 4 and divisible by 4).
    //                      For coarser snaps (1, 2), every snap point IS at a
    //                      beat boundary, so the !isMeasure ones become beats.
    for (let i = firstIdx; i <= lastIdx; i++) {
      const timeMs = i * subdivisionIntervalMs + offsetMs
      if (timeMs < 0 || timeMs > durationMs) continue

      const x = Math.round(this.timeToPixel(timeMs))
      const isMeasure = i % subdivisionDiv === 0
      // A subdivision sits on a beat boundary iff (i * 4) is a multiple of
      // subdivisionDiv — derived from time = i * 4 * beat / snapDiv.
      const isBeatAligned = (i * 4) % subdivisionDiv === 0

      if (isMeasure) {
        measureXs.push(x)
      } else if (isBeatAligned) {
        beatXs.push(x)
      } else {
        subBeatXs.push(x)
      }
    }

    // Draw sub-beat lines first (faintest, thinnest) — single batched stroke
    if (subBeatXs.length > 0) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < subBeatXs.length; i++) {
        const x = subBeatXs[i]
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      ctx.stroke()
    }

    // Beat lines (cyan, medium)
    if (beatXs.length > 0) {
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < beatXs.length; i++) {
        const x = beatXs[i]
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      ctx.stroke()
    }

    // Measure lines (bright white, thick) — drawn last so they sit on top
    if (measureXs.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i < measureXs.length; i++) {
        const x = measureXs[i]
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      ctx.stroke()
    }
  }

  private drawNotes(ctx: CanvasRenderingContext2D, notes: Note[]) {
    const { laneHeight } = this.config
    const state = this.viewport.getState()
    const viewportEndMs = this.viewport.getViewportEndMs()

    // Note visual sizes (reduced for better precision)
    const TAP_RADIUS = 10
    const HOLD_HEIGHT = 16

    // Batch tap notes (filled arcs) — collect first, then draw in one path-ish pass.
    // Holds are drawn individually since each has a different width.
    ctx.fillStyle = '#3b82f6' // bg-blue-500
    ctx.beginPath()
    let tapCount = 0
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      if (note.type !== 'tap') continue

      const noteTimeMs = note.time * 1000
      // Viewport culling
      if (noteTimeMs < state.viewportStartMs || noteTimeMs > viewportEndMs) continue

      const x = Math.round(this.getGridAlignedX(noteTimeMs))
      const y = note.lane * laneHeight + 30
      ctx.moveTo(x + TAP_RADIUS, y)
      ctx.arc(x, y, TAP_RADIUS, 0, Math.PI * 2)
      tapCount++
    }
    if (tapCount > 0) ctx.fill()

    // Hold notes
    ctx.fillStyle = '#eab308' // bg-yellow-500
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      if (note.type !== 'hold' || !note.duration) continue

      const noteTimeMs = note.time * 1000
      const noteEndMs = (note.time + note.duration) * 1000
      if (noteEndMs < state.viewportStartMs || noteTimeMs > viewportEndMs) continue

      const x = Math.round(this.getGridAlignedX(noteTimeMs))
      const width = this.timeToPixel(note.duration * 1000)
      const holdY = note.lane * laneHeight + (60 - HOLD_HEIGHT) / 2
      ctx.fillRect(x, holdY, width, HOLD_HEIGHT)
    }
  }

  renderDynamic(
    currentTimeMs: number,
    ghostNote: { lane: number; time: number; type: 'tap' | 'hold' } | null,
    snapHighlightTimeMs: number | null = null
  ) {
    const ctx = this.dynamicCtx
    const totalWidth = this.viewport.getTotalWidth()
    const { laneHeight } = this.config
    const state = this.viewport.getState()

    // Safeguard: Don't render with invalid scale
    if (!state.pixelsPerMs || state.pixelsPerMs <= 0 || !isFinite(state.pixelsPerMs)) {
      // Clear canvas and skip rendering
      ctx.clearRect(0, 0, totalWidth, this.cachedHeight)
      return
    }

    // Ghost note sizes (smaller than real notes for visual distinction)
    const GHOST_TAP_RADIUS = 8
    const GHOST_HOLD_HEIGHT = 14
    const GHOST_HOLD_WIDTH = 24

    // Clear only the area we will repaint (visible viewport region). Big perf
    // win vs. clearing the entire timeline-wide canvas every frame.
    const clearX = Math.max(0, Math.floor(state.viewportStartMs * state.pixelsPerMs) - 4)
    const clearWidth = Math.min(totalWidth - clearX, Math.ceil(state.viewportWidthPx) + 8)
    ctx.clearRect(clearX, 0, clearWidth, this.cachedHeight)

    // Draw snap target highlight whenever the cursor is over the grid
    if (snapHighlightTimeMs !== null) {
      const highlightX = Math.round(this.getGridAlignedX(snapHighlightTimeMs))

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(highlightX, 0)
      ctx.lineTo(highlightX, this.cachedHeight)
      ctx.stroke()

      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
      ctx.fillRect(highlightX - 12, 0, 24, this.cachedHeight)

      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.moveTo(highlightX, 0)
      ctx.lineTo(highlightX - 6, 10)
      ctx.lineTo(highlightX + 6, 10)
      ctx.fill()
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

    // Draw ghost note (always grid-aligned)
    if (ghostNote) {
      let x = this.getGridAlignedX(ghostNote.time * 1000)
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

  dispose() {
    // Unsubscribe from viewport to prevent memory leaks
    if (this.unsubscribeViewport) {
      this.unsubscribeViewport()
      this.unsubscribeViewport = null
    }
    // Clear references to help garbage collection
    this.needsStaticRedraw = false
  }
}

/**
 * High-performance timeline renderer using dual-canvas approach
 * Static canvas: Beat grid, lane backgrounds (redraws only on zoom/data change)
 * Dynamic canvas: Playhead, ghost notes (redraws every frame)
 */

import type { Note } from '../components/BeatmapEditor'

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
  duration: number
  zoom: number
  snapEnabled?: boolean
  snapDivision?: number
}

export class TimelineRenderer {
  private staticCanvas: HTMLCanvasElement
  private dynamicCanvas: HTMLCanvasElement
  private staticCtx: CanvasRenderingContext2D
  private dynamicCtx: CanvasRenderingContext2D
  private scale: TimelineScale
  private config: RenderConfig
  private cachedWidth = 0
  private cachedHeight = 0
  private needsStaticRedraw = true

  constructor(
    staticCanvas: HTMLCanvasElement,
    dynamicCanvas: HTMLCanvasElement,
    config: RenderConfig
  ) {
    this.staticCanvas = staticCanvas
    this.dynamicCanvas = dynamicCanvas
    this.config = config

    const staticCtx = staticCanvas.getContext('2d', { alpha: false })
    const dynamicCtx = dynamicCanvas.getContext('2d', { alpha: true })

    if (!staticCtx || !dynamicCtx) {
      throw new Error('Failed to get canvas contexts')
    }

    this.staticCtx = staticCtx
    this.dynamicCtx = dynamicCtx

    this.scale = {
      pixelsPerMs: 0,
      viewportStartMs: 0,
      viewportEndMs: 0,
      containerWidth: 0,
      containerHeight: 0
    }

    this.updateScale()
  }

  updateConfig(config: Partial<RenderConfig>) {
    const changed = Object.keys(config).some(
      key => this.config[key as keyof RenderConfig] !== config[key as keyof RenderConfig]
    )

    if (changed) {
      this.config = { ...this.config, ...config }
      this.needsStaticRedraw = true
      this.updateScale()
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
    const dpr = window.devicePixelRatio || 1
    this.staticCanvas.width = width * dpr
    this.staticCanvas.height = height * dpr
    this.dynamicCanvas.width = width * dpr
    this.dynamicCanvas.height = height * dpr

    // Scale contexts
    this.staticCtx.scale(dpr, dpr)
    this.dynamicCtx.scale(dpr, dpr)

    this.needsStaticRedraw = true
    this.updateScale()
  }

  updateScale() {
    // Canvas width already includes zoom (applied in BeatmapEditor)
    // Do not apply zoom again here
    const totalWidth = this.cachedWidth
    const durationMs = this.config.duration * 1000

    this.scale = {
      pixelsPerMs: durationMs > 0 ? totalWidth / durationMs : 0,
      viewportStartMs: 0,
      viewportEndMs: durationMs,
      containerWidth: totalWidth,
      containerHeight: this.cachedHeight
    }
  }

  updateViewport(scrollLeft: number, viewportWidth: number) {
    const startMs = scrollLeft / this.scale.pixelsPerMs
    const endMs = (scrollLeft + viewportWidth) / this.scale.pixelsPerMs

    this.scale.viewportStartMs = startMs
    this.scale.viewportEndMs = endMs
  }

  timeToPixel(timeMs: number): number {
    return timeMs * this.scale.pixelsPerMs
  }

  pixelToTime(pixel: number): number {
    return pixel / this.scale.pixelsPerMs
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
    const { containerWidth, containerHeight } = this.scale
    const { lanes, laneHeight, bpm, duration } = this.config

    // Clear
    ctx.fillStyle = '#111827' // bg-gray-900
    ctx.fillRect(0, 0, containerWidth, containerHeight)

    // Draw beat grid lines
    this.drawBeatGrid(ctx, bpm, duration)

    // Draw lane dividers
    ctx.strokeStyle = '#374151' // border-gray-700
    ctx.lineWidth = 1
    for (let i = 1; i < lanes; i++) {
      const y = i * laneHeight
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(containerWidth, y)
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

    const beatDuration = 60 / bpm
    const { containerHeight } = this.scale

    let currentTime = 0
    let beatCount = 0

    while (currentTime <= duration) {
      const x = this.timeToPixel(currentTime * 1000)
      const isMeasure = beatCount % 4 === 0

      ctx.strokeStyle = isMeasure ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = isMeasure ? 2 : 1

      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, containerHeight)
      ctx.stroke()

      currentTime += beatDuration
      beatCount++
    }
  }

  private drawNotes(ctx: CanvasRenderingContext2D, notes: Note[]) {
    const { laneHeight, snapEnabled } = this.config
    const { viewportStartMs, viewportEndMs } = this.scale

    // Note visual sizes (reduced for better precision)
    const TAP_RADIUS = 10 // Reduced from 15
    const HOLD_HEIGHT = 16 // Reduced from 20

    notes.forEach(note => {
      const noteTimeMs = note.time * 1000
      const noteEndMs = note.duration ? (note.time + note.duration) * 1000 : noteTimeMs

      // Viewport culling
      if (noteEndMs < viewportStartMs || noteTimeMs > viewportEndMs) return

      // Use grid-aligned position when snap is enabled
      const x = snapEnabled ? this.getGridAlignedX(noteTimeMs) : this.timeToPixel(noteTimeMs)
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

  renderDynamic(currentTimeMs: number, ghostNote: { lane: number; time: number; type: 'tap' | 'hold' } | null) {
    const ctx = this.dynamicCtx
    const { containerWidth, containerHeight } = this.scale
    const { laneHeight, snapEnabled } = this.config

    // Ghost note sizes (smaller than real notes for visual distinction)
    const GHOST_TAP_RADIUS = 8 // Smaller than real note (10)
    const GHOST_HOLD_HEIGHT = 14 // Smaller than real note (16)
    const GHOST_HOLD_WIDTH = 24 // Fixed width for visual preview

    // Clear
    ctx.clearRect(0, 0, containerWidth, containerHeight)

    // Draw playhead
    const playheadX = this.timeToPixel(currentTimeMs)
    ctx.strokeStyle = '#ef4444' // bg-red-500
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, containerHeight)
    ctx.stroke()

    // Draw ghost note
    if (ghostNote) {
      // Use grid-aligned position when snap is enabled
      const x = snapEnabled ? this.getGridAlignedX(ghostNote.time * 1000) : this.timeToPixel(ghostNote.time * 1000)
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

  getScale(): TimelineScale {
    return { ...this.scale }
  }
}

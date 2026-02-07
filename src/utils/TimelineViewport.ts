/**
 * Single Source of Truth for Timeline Viewport
 * 
 * This class manages ALL zoom and scroll state for the timeline.
 * Both waveform and beatmap MUST use this same instance.
 * 
 * Core Principle: There is ONE timeline. Everything else is just a different way of looking at it.
 */

export interface TimelineViewportState {
  zoom: number              // Zoom level (1.0 = 100%, 2.0 = 200%, etc)
  pixelsPerMs: number       // Derived from zoom and duration
  viewportStartMs: number   // Left edge of viewport in timeline time
  viewportWidthPx: number   // Width of visible viewport in pixels
  durationMs: number        // Total timeline duration
}

export class TimelineViewport {
  private state: TimelineViewportState
  private listeners: Set<(state: TimelineViewportState) => void> = new Set()

  constructor(durationMs: number = 0, viewportWidthPx: number = 0) {
    this.state = {
      zoom: 1.0,
      pixelsPerMs: 0,
      viewportStartMs: 0,
      viewportWidthPx,
      durationMs
    }
    this.updatePixelsPerMs()
  }

  /**
   * Subscribe to viewport changes
   */
  subscribe(listener: (state: TimelineViewportState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of state change
   */
  private notify() {
    this.listeners.forEach(listener => listener(this.getState()))
  }

  /**
   * Update pixels per millisecond based on zoom and duration
   */
  private updatePixelsPerMs() {
    if (this.state.durationMs === 0) {
      this.state.pixelsPerMs = 0
      return
    }

    // Base width is the viewport width
    // Total timeline width = viewportWidth * zoom
    // pixelsPerMs = totalWidth / durationMs
    const totalTimelineWidth = this.state.viewportWidthPx * this.state.zoom
    this.state.pixelsPerMs = totalTimelineWidth / this.state.durationMs
  }

  /**
   * Set zoom level (affects both waveform and beatmap)
   */
  setZoom(zoom: number) {
    // Clamp zoom to reasonable range
    zoom = Math.max(1.0, Math.min(20.0, zoom))
    
    if (this.state.zoom === zoom) return

    this.state.zoom = zoom
    this.updatePixelsPerMs()
    this.notify()
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.state.zoom
  }

  /**
   * Set viewport scroll position (affects both waveform and beatmap)
   */
  setViewportStart(startMs: number) {
    // Clamp to valid range
    const maxScroll = Math.max(0, this.state.durationMs - (this.state.viewportWidthPx / this.state.pixelsPerMs))
    startMs = Math.max(0, Math.min(maxScroll, startMs))

    if (this.state.viewportStartMs === startMs) return

    this.state.viewportStartMs = startMs
    this.notify()
  }

  /**
   * Set viewport scroll position from pixel offset
   */
  setScrollLeft(scrollLeftPx: number) {
    const startMs = scrollLeftPx / this.state.pixelsPerMs
    this.setViewportStart(startMs)
  }

  /**
   * Get current scroll position in pixels
   */
  getScrollLeft(): number {
    return this.state.viewportStartMs * this.state.pixelsPerMs
  }

  /**
   * Update viewport width (when container resizes)
   */
  setViewportWidth(widthPx: number) {
    if (this.state.viewportWidthPx === widthPx) return

    this.state.viewportWidthPx = widthPx
    this.updatePixelsPerMs()
    this.notify()
  }

  /**
   * Update duration (when audio changes)
   */
  setDuration(durationMs: number) {
    if (this.state.durationMs === durationMs) return

    this.state.durationMs = durationMs
    this.updatePixelsPerMs()
    
    // Reset scroll if current position is now out of bounds
    if (this.state.viewportStartMs > durationMs) {
      this.state.viewportStartMs = 0
    }
    
    this.notify()
  }

  /**
   * Convert time to pixel position (absolute timeline position)
   */
  timeToPixel(timeMs: number): number {
    return timeMs * this.state.pixelsPerMs
  }

  /**
   * Convert pixel position to time (absolute timeline position)
   */
  pixelToTime(pixel: number): number {
    return pixel / this.state.pixelsPerMs
  }

  /**
   * Convert time to viewport-relative pixel position
   */
  timeToViewportPixel(timeMs: number): number {
    return (timeMs - this.state.viewportStartMs) * this.state.pixelsPerMs
  }

  /**
   * Get total timeline width in pixels
   */
  getTotalWidth(): number {
    return this.state.durationMs * this.state.pixelsPerMs
  }

  /**
   * Get current viewport end time
   */
  getViewportEndMs(): number {
    return this.state.viewportStartMs + (this.state.viewportWidthPx / this.state.pixelsPerMs)
  }

  /**
   * Get full viewport state (read-only)
   */
  getState(): Readonly<TimelineViewportState> {
    return { ...this.state }
  }

  /**
   * Auto-scroll to keep a time position visible
   * @param timeMs - Time to keep visible
   * @param marginRatio - How much margin to maintain (0.3 = 30% from edges)
   */
  autoScrollToTime(timeMs: number, marginRatio: number = 0.3) {
    const viewportDurationMs = this.state.viewportWidthPx / this.state.pixelsPerMs
    const leftMarginMs = viewportDurationMs * marginRatio
    const rightMarginMs = viewportDurationMs * (1 - marginRatio)

    const relativeTimeMs = timeMs - this.state.viewportStartMs

    if (relativeTimeMs < leftMarginMs) {
      // Scroll left to center the time
      this.setViewportStart(Math.max(0, timeMs - viewportDurationMs * 0.5))
    } else if (relativeTimeMs > rightMarginMs) {
      // Scroll right to center the time
      this.setViewportStart(timeMs - viewportDurationMs * 0.5)
    }
  }
}

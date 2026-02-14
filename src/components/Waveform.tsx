import { useEffect, useRef, useState } from 'react'
import type { TimelineViewport } from '../utils/TimelineViewport'

interface WaveformProps {
  audioBuffer?: AudioBuffer | null
  currentTime?: number
  viewport: TimelineViewport
  onSeek?: (time: number) => void
  className?: string
  containerRef?: React.RefObject<HTMLDivElement>
  onScroll?: (scrollLeft: number) => void
  /** If true, waveform canvas is not clickable - use external scrubber instead */
  disableCanvasInteraction?: boolean
}

export default function Waveform({ 
  audioBuffer, 
  currentTime = 0, 
  viewport, 
  onSeek, 
  className = '', 
  containerRef,
  onScroll,
  disableCanvasInteraction = false
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [, setViewportVersion] = useState(0) // Force re-render on viewport changes
  const isProgrammaticScrollRef = useRef(false) // Flag to prevent scroll feedback loop

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = viewport.getState()
    const totalWidth = viewport.getTotalWidth()

    // Safeguard: Don't render with invalid scale
    if (!state.pixelsPerMs || state.pixelsPerMs <= 0 || !isFinite(state.pixelsPerMs)) {
      console.warn('Waveform: Invalid pixelsPerMs, skipping render')
      return
    }

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const height = canvas.offsetHeight
    canvas.width = totalWidth * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, totalWidth, height)

    if (!audioBuffer || state.durationMs === 0) return

    // === TIME-BASED WAVEFORM RENDERING (Critical for sync) ===
    // Use viewport's pixelsPerMs for consistent timeline rendering
    const pixelsPerMs = state.pixelsPerMs
    
    // Get audio data
    const rawData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const totalSamples = rawData.length
    
    // Calculate how many samples to skip for reasonable detail at current zoom
    const pixelsPerSample = (pixelsPerMs * 1000) / sampleRate
    const samplesPerPixel = Math.max(1, Math.floor(1 / pixelsPerSample))
    
    // Draw waveform using TIME-BASED positioning (not viewport stretching)
    const middle = height / 2
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1
    ctx.beginPath()
    
    let isFirst = true
    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += samplesPerPixel) {
      // Calculate time position of this sample in milliseconds
      const timeMs = (sampleIndex / sampleRate) * 1000
      // Convert time to pixel position using SAME formula as BeatmapEditor
      const x = viewport.timeToPixel(timeMs)
      
      // Get amplitude value
      const amplitude = Math.abs(rawData[sampleIndex])
      const y = middle + (amplitude * middle * 0.8) * (sampleIndex % 2 === 0 ? 1 : -1)
      
      if (isFirst) {
        ctx.moveTo(x, y)
        isFirst = false
      } else {
        ctx.lineTo(x, y)
      }
      
      // Stop drawing beyond total width
      if (x > totalWidth) break
    }
    ctx.stroke()

    // Draw playhead marker
    if (state.durationMs > 0) {
      // SAME time-to-pixel conversion as waveform and BeatmapEditor
      const playheadX = viewport.timeToPixel(currentTime * 1000)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }

  }, [audioBuffer, currentTime, viewport])

  // Subscribe to viewport changes and force React re-render
  useEffect(() => {
    const unsubscribe = viewport.subscribe(() => {
      // Force re-render by updating state
      // This ensures the main rendering effect runs again
      setViewportVersion(v => v + 1)
    })

    return unsubscribe
  }, [viewport])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disableCanvasInteraction || !canvasRef.current || !onSeek) return
    setIsDragging(true)
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + (containerRef?.current?.scrollLeft || 0)
    // Convert pixel to time using viewport
    const clickedTimeMs = viewport.pixelToTime(x)
    onSeek(clickedTimeMs / 1000)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || disableCanvasInteraction || !canvasRef.current || !onSeek) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + (containerRef?.current?.scrollLeft || 0)
    // Convert pixel to time using viewport
    const clickedTimeMs = viewport.pixelToTime(x)
    const state = viewport.getState()
    const clampedTime = Math.max(0, Math.min(state.durationMs / 1000, clickedTimeMs / 1000))
    onSeek(clampedTime)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp)
      return () => window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (!containerRef?.current || !canvasRef.current) return
    
    const scrollContainer = containerRef.current
    
    // Mark as programmatic scroll to prevent feedback loop
    isProgrammaticScrollRef.current = true
    
    // Use viewport auto-scroll
    viewport.autoScrollToTime(currentTime * 1000, 0.3)
    
    // Sync container scroll with viewport
    scrollContainer.scrollLeft = viewport.getScrollLeft()
    
    // Clear the flag after scroll completes (in a microtask)
    Promise.resolve().then(() => {
      isProgrammaticScrollRef.current = false
    })
  }, [currentTime, viewport, containerRef])

  // Handle scroll synchronization
  useEffect(() => {
    const scrollContainer = containerRef?.current
    if (!scrollContainer) return

    const handleScroll = () => {
      // Ignore programmatic scrolls to prevent feedback loop
      if (isProgrammaticScrollRef.current) {
        return
      }
      
      // Update viewport scroll position
      viewport.setScrollLeft(scrollContainer.scrollLeft)
      
      // Notify parent of scroll
      if (onScroll) {
        onScroll(scrollContainer.scrollLeft)
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [containerRef, viewport, onScroll])

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${viewport.getState().durationMs > 0 ? 'cursor-pointer' : ''}`}
      style={{ 
        width: `${viewport.getTotalWidth()}px`,
        height: '100%', 
        minWidth: '100%',
        pointerEvents: disableCanvasInteraction ? 'none' : 'auto'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  )
}

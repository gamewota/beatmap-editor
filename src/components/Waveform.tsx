import { useEffect, useRef, useState } from 'react'

interface WaveformProps {
  audioBuffer?: AudioBuffer | null
  currentTime?: number
  duration?: number
  onSeek?: (time: number) => void
  zoom?: number
  className?: string
  containerRef?: React.RefObject<HTMLDivElement>
}

export default function Waveform({ audioBuffer, currentTime = 0, duration = 0, onSeek, zoom = 100, className = '', containerRef }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    if (!audioBuffer || duration === 0) return

    // === TIME-BASED WAVEFORM RENDERING (Critical for sync) ===
    // Must use the SAME time-to-pixel conversion as BeatmapEditor
    // width already includes zoom from CSS, so pixelsPerSecond accounts for zoom
    const pixelsPerSecond = width / duration
    
    // Get audio data
    const rawData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const totalSamples = rawData.length
    
    // Calculate how many samples to skip for reasonable detail at current zoom
    // More zoom = more detail visible
    const pixelsPerSample = pixelsPerSecond / sampleRate
    const samplesPerPixel = Math.max(1, Math.floor(1 / pixelsPerSample))
    
    // Draw waveform using TIME-BASED positioning (not viewport stretching)
    const middle = height / 2
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1
    ctx.beginPath()
    
    let isFirst = true
    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += samplesPerPixel) {
      // Calculate time position of this sample
      const timeInSeconds = sampleIndex / sampleRate
      // Convert time to pixel position using SAME formula as BeatmapEditor
      const x = timeInSeconds * pixelsPerSecond
      
      // Get amplitude value
      const amplitude = Math.abs(rawData[sampleIndex])
      const y = middle + (amplitude * middle * 0.8) * (sampleIndex % 2 === 0 ? 1 : -1)
      
      if (isFirst) {
        ctx.moveTo(x, y)
        isFirst = false
      } else {
        ctx.lineTo(x, y)
      }
      
      // Stop drawing beyond visible canvas
      if (x > width) break
    }
    ctx.stroke()

    // Draw playhead marker
    if (duration > 0) {
      // SAME time-to-pixel conversion as waveform and BeatmapEditor
      const playheadX = currentTime * pixelsPerSecond
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }

  }, [audioBuffer, currentTime, duration, zoom])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || duration === 0) return
    setIsDragging(true)
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    // rect.width already includes zoom scaling from CSS
    const pixelsPerSecond = rect.width / duration
    const clickedTime = x / pixelsPerSecond
    onSeek(clickedTime)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !onSeek || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    // rect.width already includes zoom scaling from CSS
    const pixelsPerSecond = rect.width / duration
    const clickedTime = Math.max(0, Math.min(duration, x / pixelsPerSecond))
    onSeek(clickedTime)
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
    if (!containerRef?.current || !canvasRef.current || duration === 0) return
    
    const scrollContainer = containerRef.current
    const canvas = canvasRef.current
    const canvasWidth = canvas.offsetWidth
    
    // canvasWidth already includes zoom from CSS width: ${zoom}%
    const pixelsPerSecond = canvasWidth / duration
    const playheadX = currentTime * pixelsPerSecond
    
    const containerWidth = scrollContainer.offsetWidth
    const scrollLeft = scrollContainer.scrollLeft
    
    // Keep playhead between 30% and 70% of visible area
    const leftMargin = containerWidth * 0.3
    const rightMargin = containerWidth * 0.7
    
    if (playheadX < scrollLeft + leftMargin) {
      scrollContainer.scrollLeft = Math.max(0, playheadX - containerWidth * 0.5)
    } else if (playheadX > scrollLeft + rightMargin) {
      scrollContainer.scrollLeft = playheadX - containerWidth * 0.5
    }
  }, [currentTime, zoom, duration, containerRef])

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${duration > 0 ? 'cursor-pointer' : ''}`}
      style={{ 
        width: `${zoom}%`,
        height: '100%', 
        minWidth: '100%' 
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  )
}

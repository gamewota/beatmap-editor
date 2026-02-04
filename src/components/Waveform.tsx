import { useEffect, useRef, useState } from 'react'

interface WaveformProps {
  audioBuffer?: AudioBuffer | null
  currentTime?: number
  duration?: number
  onSeek?: (time: number) => void
  className?: string
}

export default function Waveform({ audioBuffer, currentTime = 0, duration = 0, onSeek, className = '' }: WaveformProps) {
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

    if (!audioBuffer) return

    // Get audio data
    const rawData = audioBuffer.getChannelData(0)
    const samples = width
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []

    // Downsample the audio data
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j])
      }
      filteredData.push(sum / blockSize)
    }

    // Normalize data
    const multiplier = Math.pow(Math.max(...filteredData), -1)
    const normalizedData = filteredData.map(n => n * multiplier)

    // Draw waveform
    const middle = height / 2
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1

    ctx.beginPath()
    normalizedData.forEach((value, index) => {
      const x = index
      const y = middle + (value * middle * 0.8) * (index % 2 === 0 ? 1 : -1)
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw playhead marker
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }

  }, [audioBuffer, currentTime, duration])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || duration === 0) return
    setIsDragging(true)
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickedTime = (x / rect.width) * duration
    onSeek(clickedTime)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !onSeek || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickedTime = Math.max(0, Math.min(duration, (x / rect.width) * duration))
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

  return (
    <canvas
      ref={canvasRef}
      className={`${className} ${duration > 0 ? 'cursor-pointer' : ''}`}
      style={{ width: '100%', height: '100%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  )
}

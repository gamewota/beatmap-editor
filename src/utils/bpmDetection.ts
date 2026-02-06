/**
 * BPM Detection Utility
 * Analyzes audio buffer to estimate global tempo
 * Returns a suggested BPM value (not authoritative)
 */

/**
 * Detects BPM from an AudioBuffer using peak interval analysis
 * @param audioBuffer - Decoded audio buffer from Web Audio API
 * @returns Estimated BPM value (60-200 range)
 */
export function detectBPM(audioBuffer: AudioBuffer): number {
  try {
    // Extract mono channel for analysis
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    
    // Downsample for performance (analyze every Nth sample)
    const downsampleFactor = 4
    const samples: number[] = []
    for (let i = 0; i < channelData.length; i += downsampleFactor) {
      samples.push(Math.abs(channelData[i]))
    }
    
    // Find peaks (transients) in the waveform
    const peaks = findPeaks(samples, sampleRate / downsampleFactor)
    
    // Calculate intervals between peaks
    const intervals = calculateIntervals(peaks)
    
    // Convert intervals to BPM candidates
    const bpmCandidates = intervals.map(interval => 60 / interval)
    
    // Find most common BPM (cluster around similar values)
    const detectedBPM = findMostLikelyBPM(bpmCandidates)
    
    // Normalize to reasonable range (60-200 BPM)
    const normalizedBPM = normalizeBPM(detectedBPM)
    
    return Math.round(normalizedBPM)
  } catch (error) {
    console.error('BPM detection failed:', error)
    // Return default fallback BPM
    return 120
  }
}

/**
 * Find amplitude peaks in the waveform
 */
function findPeaks(samples: number[], sampleRate: number): number[] {
  const peaks: number[] = []
  const windowSize = Math.floor(sampleRate * 0.05) // 50ms window
  
  // Calculate energy threshold (adaptive)
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i]
  }
  const avgEnergy = sum / samples.length
  const threshold = avgEnergy * 1.5 // Peaks must be 1.5x average
  
  // Find local maxima above threshold
  for (let i = windowSize; i < samples.length - windowSize; i++) {
    const current = samples[i]
    
    if (current < threshold) continue
    
    // Check if it's a local maximum
    let isLocalMax = true
    for (let j = i - windowSize; j < i + windowSize; j++) {
      if (samples[j] > current) {
        isLocalMax = false
        break
      }
    }
    
    if (isLocalMax) {
      peaks.push(i / sampleRate) // Store time in seconds
      i += windowSize // Skip ahead to avoid duplicate peaks
    }
  }
  
  return peaks
}

/**
 * Calculate time intervals between consecutive peaks
 */
function calculateIntervals(peaks: number[]): number[] {
  const intervals: number[] = []
  
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - peaks[i - 1]
    // Only consider intervals that correspond to reasonable BPM (60-200)
    const bpm = 60 / interval
    if (bpm >= 60 && bpm <= 200) {
      intervals.push(interval)
    }
  }
  
  return intervals
}

/**
 * Find the most likely BPM by clustering similar values
 */
function findMostLikelyBPM(bpmCandidates: number[]): number {
  if (bpmCandidates.length === 0) return 120
  
  // Create histogram buckets (1 BPM granularity)
  const histogram = new Map<number, number>()
  
  for (const bpm of bpmCandidates) {
    const bucket = Math.round(bpm)
    histogram.set(bucket, (histogram.get(bucket) || 0) + 1)
  }
  
  // Find bucket with highest count
  let maxCount = 0
  let mostLikelyBPM = 120
  
  histogram.forEach((count, bpm) => {
    if (count > maxCount) {
      maxCount = count
      mostLikelyBPM = bpm
    }
  })
  
  return mostLikelyBPM
}

/**
 * Normalize BPM to reasonable range, handling double/half tempo
 */
function normalizeBPM(bpm: number): number {
  let normalized = bpm
  
  // Handle double/half tempo detection errors
  while (normalized < 80) {
    normalized *= 2
  }
  while (normalized > 180) {
    normalized /= 2
  }
  
  // Clamp to acceptable range
  return Math.max(60, Math.min(200, normalized))
}

/**
 * BPM Detection Utility
 * Uses web-audio-beat-detector library for accurate tempo detection
 */

import { guess } from 'web-audio-beat-detector';

export interface BPMDetectionResult {
  bpm: number;
  offsetMs: number;
}

/**
 * Detects BPM and offset from an AudioBuffer using web-audio-beat-detector
 * @param audioBuffer - Decoded audio buffer from Web Audio API
 * @returns Object with BPM and offset in milliseconds
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMDetectionResult> {
  try {
    // Use the library's guess function for BPM detection
    // It returns an object with bpm and offset (in seconds)
    const result = await guess(audioBuffer);
    
    // Normalize BPM to reasonable range
    const normalizedBpm = normalizeBPM(result.bpm);
    
    // Convert offset from seconds to milliseconds
    const offsetMs = Math.round(result.offset * 1000);
    
    return {
      bpm: normalizedBpm,
      offsetMs
    };
  } catch (error) {
    console.error('BPM detection failed:', error);
    // Fallback to defaults
    return {
      bpm: 120,
      offsetMs: 0
    };
  }
}

/**
 * Normalize BPM to reasonable range, handling double/half tempo
 */
function normalizeBPM(bpm: number): number {
  let normalized = bpm;
  
  // Handle double/half tempo detection errors
  while (normalized < 70) {
    normalized *= 2;
  }
  while (normalized > 140) {
    normalized /= 2;
  }
  
  // Clamp to acceptable range
  return Math.max(60, Math.min(180, normalized));
}

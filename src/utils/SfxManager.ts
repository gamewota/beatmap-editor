/**
 * SFX Manager using Web Audio API for low-latency playback
 * This class handles loading and playing note hit sound effects
 * Reusable in both the editor and game runtime
 */
export class SfxManager {
  private audioContext: AudioContext | null = null
  private sfxBuffer: AudioBuffer | null = null
  private isLoaded = false
  private isLoading = false
  private loadPromise: Promise<void> | null = null

  async initialize() {
    // If already loaded, return immediately
    if (this.isLoaded) return

    // If currently loading, wait for the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    // Start loading
    this.isLoading = true
    this.loadPromise = this.loadAudioResources()
    
    try {
      await this.loadPromise
    } finally {
      this.isLoading = false
    }
  }

  private async loadAudioResources() {
    try {
      // Check if AudioContext is available
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this browser')
      }

      // Lazy-create AudioContext only when needed
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass()
      }
      
      if (!this.audioContext) {
        throw new Error('Failed to create AudioContext')
      }

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const response = await fetch('/sfx.mp3')
      if (!response.ok) {
        throw new Error(`Failed to fetch SFX file: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      
      // Guard: Ensure audioContext still exists before decoding
      if (!this.audioContext) {
        throw new Error('AudioContext was destroyed during loading')
      }

      this.sfxBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      this.isLoaded = true
    } catch (error) {
      console.error('Failed to load SFX:', error)
      this.audioContext = null
      this.sfxBuffer = null
      this.isLoaded = false
      throw error // Re-throw to allow caller to handle
    }
  }

  async play() {
    // Lazy initialization on first play
    if (!this.isLoaded && !this.isLoading) {
      try {
        await this.initialize()
      } catch {
        // Initialization failed, silently skip playback
        return
      }
    }

    // Guard: Check all required resources are available
    if (!this.audioContext || !this.sfxBuffer || !this.isLoaded) return

    // Resume AudioContext if suspended (required by browser autoplay policies)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // Create a new buffer source for each play (Web Audio sources are one-shot)
    const source = this.audioContext.createBufferSource()
    source.buffer = this.sfxBuffer
    source.connect(this.audioContext.destination)
    source.start(0)
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.sfxBuffer = null
    this.isLoaded = false
  }
}

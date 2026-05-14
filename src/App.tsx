import './App.css'
import { useState, useRef, useEffect, useMemo } from 'react'
import Button from './components/Button'
import Title from './components/Title'
import Icon from './components/Icon'
import Slider from './components/Slider'
import Waveform from './components/Waveform'
import AudioScrubber from './components/AudioScrubber'
import BeatmapEditor from './components/BeatmapEditor'
import type { Note } from './components/BeatmapEditor'
import { detectBPM } from './utils/bpmDetection'
import { TimelineViewport } from './utils/TimelineViewport'
import volumeIcon from './assets/volume.png'
import magnifier from './assets/zoom-in.png'
import next from './assets/forward-button.png'
import previous from './assets/rewind-button.png'
import play from './assets/play-button-arrowhead.png'
import pause from './assets/pause.png'
import stop from './assets/stop.png'

function App() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [musicTitle, setMusicTitle] = useState<string>('Music Title will go here')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [bpm, setBpm] = useState(120)
  const [bpmSuggested, setBpmSuggested] = useState(false)
  const [snapDivision, setSnapDivision] = useState<number>(8)
  const [offsetMs, setOffsetMs] = useState(0)
  const [offsetSuggested, setOffsetSuggested] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState<Note[]>([])
  const [difficulty, setDifficulty] = useState<string>('easy')
  // Persisted chart UUID so import/export round-trips remain stable
  const chartUuidRef = useRef<string>(crypto.randomUUID())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null!)
  const audioInitializedRef = useRef(false)
  const bpmDetectionGenRef = useRef(0) // Generation counter for BPM detection cancellation

  // Create unified timeline viewport - SINGLE SOURCE OF TRUTH
  // Initialize with default values, will be updated in effects
  const viewport = useMemo(() => new TimelineViewport(0, 800), [])

  // Update viewport when duration changes
  useEffect(() => {
    viewport.setDuration(duration * 1000)
  }, [duration, viewport])

  // Update viewport when zoom changes
  useEffect(() => {
    viewport.setZoom(zoom / 100)
  }, [zoom, viewport])

  const handleLoadMusic = () => {
    fileInputRef.current?.click()
  }

  // Idempotent audio initialization function
  const initializeAudio = async (file: File) => {
    handleStop()

    // Clean up old URL if it exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setMusicTitle(file.name.replace(/\.[^/.]+$/, ''))

    // Create and persist audio URL
    const url = URL.createObjectURL(file)
    setAudioUrl(url)

    // Decode audio for waveform and analysis
    const audioContext = new AudioContext()
    let decoded: AudioBuffer | null = null
    try {
      const arrayBuffer = await file.arrayBuffer()
      decoded = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(decoded)
      // Use decoded buffer duration for timeline (more accurate than audio element)
      setDuration(decoded.duration)
    } catch (error) {
      console.error('Failed to decode audio:', error)
      alert('Failed to decode audio file. Please try a different file.')
      return
    } finally {
      // Always close the AudioContext to release resources
      await audioContext.close()
    }
    
    // Auto-detect BPM and offset (non-blocking suggestion)
    if (!decoded) return
    
    // Increment generation counter to invalidate previous detections
    const currentGen = ++bpmDetectionGenRef.current
    
    detectBPM(decoded).then(result => {
      // Only apply if this is still the latest detection (not stale)
      if (currentGen !== bpmDetectionGenRef.current) return
      
      setBpm(result.bpm)
      setBpmSuggested(true)
      setOffsetMs(result.offsetMs)
      setOffsetSuggested(true)
    }).catch(() => {
      // Only apply if this is still the latest detection (not stale)
      if (currentGen !== bpmDetectionGenRef.current) return
      
      // Keep defaults if detection fails
      setBpmSuggested(false)
      setOffsetSuggested(false)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    await initializeAudio(file)
    
    // Clear file input to allow re-selection of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Initialize or reinitialize audio element when audioUrl changes
  useEffect(() => {
    if (!audioUrl) {
      audioInitializedRef.current = false
      return
    }

    // Clean up previous audio element
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    // Create new audio element
    const audio = new Audio(audioUrl)
    audio.volume = volume / 100
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      // Only set duration from audio element if not already set from decoded buffer
      // This ensures the waveform and editor use the same duration source
      setDuration(prev => prev > 0 ? prev : audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      audio.currentTime = 0
      setCurrentTime(0)
    })

    // Handle errors (e.g., revoked blob URL)
    audio.addEventListener('error', () => {
      console.error('Audio element error - URL may be invalid')
      audioInitializedRef.current = false
    })

    audioInitializedRef.current = true

    // Cleanup on unmount or when audioUrl changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl])  // CRITICAL: volume NOT in deps - recreating audio on volume change causes playback to stop

  // Update volume without recreating audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Cleanup audio URL only on final unmount
  useEffect(() => {
    const currentAudioUrl = audioUrl
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl)
      }
    }
  }, [audioUrl])

  const handlePlay = () => {
    if (!audioRef.current) return
    audioRef.current.play()
    setIsPlaying(true)
  }

  const handlePause = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }

  const handleStop = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handlePrevious = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
  }

  const handleNext = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5)
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    if (audioRef.current) {
      audioRef.current.volume = value / 100
    }
  }

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleExport = () => {
    if (!audioBuffer) return
    if (musicTitle === 'Music Title will go here') return

    const beatDurationMs = (60 / bpm) * 1000

    // Convert an editor note (already snapped to the grid) to the export shape.
    // songPos is in ms relative to offset; beat is the same position expressed
    // in 60/bpm units. Sub-beat snaps produce fractional beats.
    const toExportNote = (time: number, lane: number, id: string) => {
      const songPos = time * 1000 - offsetMs
      const beat = songPos / beatDurationMs
      return {
        uuid: id,
        songPos,
        beat,
        label: '',
        lane
      }
    }

    const exportNotes: ReturnType<typeof toExportNote>[] = []
    const links: { uuid: string; startNote: ReturnType<typeof toExportNote>; endNote: ReturnType<typeof toExportNote> }[] = []

    notes.forEach(note => {
      if (note.type === 'tap' || !note.duration) {
        exportNotes.push(toExportNote(note.time, note.lane, note.id))
        return
      }
      // Hold note: expand into start + end notes connected via a link
      const startId = crypto.randomUUID()
      const endId = crypto.randomUUID()
      const startNote = toExportNote(note.time, note.lane, startId)
      const endNote = toExportNote(note.time + note.duration, note.lane, endId)
      exportNotes.push(startNote, endNote)
      links.push({ uuid: note.id, startNote, endNote })
    })

    const beatmapData = {
      bpm,
      offset: offsetMs,
      charts: [
        {
          uuid: chartUuidRef.current,
          notes: exportNotes,
          laneCount: 5,
          links
        }
      ]
    }

    const blob = new Blob([JSON.stringify(beatmapData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${musicTitle}_beatmap_${difficulty}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    if (!audioBuffer) {
      // Prevent importing a beatmap before audio is loaded
      // (Import should always be associated with a loaded song)
      return
    }

    importFileInputRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)

        if (!json || !Array.isArray(json.charts) || json.charts.length === 0) {
          alert('Invalid beatmap file: missing charts array')
          return
        }

        const chart = json.charts[0]
        if (!chart || !Array.isArray(chart.notes)) {
          alert('Invalid beatmap file: chart is missing notes array')
          return
        }

        const importedBpm = Number(json.bpm)
        const importedOffset = Number(json.offset)
        if (isFinite(importedBpm) && importedBpm > 0) {
          setBpm(importedBpm)
          setBpmSuggested(false)
        }
        if (isFinite(importedOffset)) {
          setOffsetMs(importedOffset)
          setOffsetSuggested(false)
        }

        const usedBpm = isFinite(importedBpm) && importedBpm > 0 ? importedBpm : bpm
        const beatDurationMs = (60 / usedBpm) * 1000

        if (typeof chart.uuid === 'string' && chart.uuid) {
          chartUuidRef.current = chart.uuid
        }

        type ExportedNote = {
          uuid?: string
          songPos?: number
          beat?: number
          label?: string
          lane?: number
        }
        type ExportedLink = {
          uuid?: string
          startNote?: ExportedNote
          endNote?: ExportedNote
        }

        // Resolve a note's audio time (in seconds) from its songPos/beat fields.
        // songPos is in milliseconds (relative to offset); we re-add the offset
        // to land on the audio timeline.
        const resolveTime = (n: ExportedNote): number => {
          if (typeof n.songPos === 'number' && isFinite(n.songPos)) {
            return (n.songPos + importedOffset) / 1000
          }
          if (typeof n.beat === 'number' && isFinite(n.beat)) {
            return (n.beat * beatDurationMs + importedOffset) / 1000
          }
          return NaN
        }

        const clampLane = (lane: unknown): number =>
          Math.max(0, Math.min(4, Math.floor(Number(lane) || 0)))

        // Build a lookup of link memberships so we can fold start/end pairs
        // back into single editor "hold" notes.
        const linkedNoteUuids = new Set<string>()
        const holds: Note[] = []
        const rawLinks: ExportedLink[] = Array.isArray(chart.links) ? chart.links : []

        rawLinks.forEach(link => {
          const start = link?.startNote
          const end = link?.endNote
          if (!start || !end) return
          const startTime = resolveTime(start)
          const endTime = resolveTime(end)
          if (!isFinite(startTime) || !isFinite(endTime)) return

          const lane = clampLane(start.lane)
          if (clampLane(end.lane) !== lane) {
            // Cross-lane links aren't supported in the editor model — drop them
            // as a hold and the start/end notes will appear as taps below.
            return
          }

          if (start.uuid) linkedNoteUuids.add(start.uuid)
          if (end.uuid) linkedNoteUuids.add(end.uuid)

          holds.push({
            id: link.uuid && typeof link.uuid === 'string' ? link.uuid : crypto.randomUUID(),
            lane,
            time: Math.min(startTime, endTime),
            type: 'hold',
            duration: Math.abs(endTime - startTime)
          })
        })

        const taps: Note[] = []
        chart.notes.forEach((rawNote: ExportedNote) => {
          if (rawNote?.uuid && linkedNoteUuids.has(rawNote.uuid)) return
          const time = resolveTime(rawNote)
          if (!isFinite(time)) return
          taps.push({
            id: typeof rawNote.uuid === 'string' && rawNote.uuid ? rawNote.uuid : crypto.randomUUID(),
            lane: clampLane(rawNote.lane),
            time,
            type: 'tap'
          })
        })

        setNotes([...taps, ...holds])
      } catch (error) {
        console.error('Failed to import beatmap:', error)
        alert('Failed to import beatmap: Invalid JSON file')
      }
    }
    reader.readAsText(file)

    if (importFileInputRef.current) {
      importFileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.keyCode === 32) {
        // Ignore space key in editable/interactive elements
        const target = e.target as HTMLElement
        const tagName = target.tagName.toLowerCase()
        const isEditable = target.isContentEditable
        const role = target.getAttribute('role')
        
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          isEditable ||
          role === 'button' ||
          role === 'link'
        ) {
          return
        }
        
        e.preventDefault()
        if (!audioRef.current) return
        
        if (audioRef.current.paused) {
          audioRef.current.play()
          setIsPlaying(true)
        } else {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className="mt-4 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={importFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
      <section className='flex justify-around items-center'>
        <Button variant="primary" onClick={handleLoadMusic}>Load Music</Button>
        <Title text={musicTitle}/>
        <div className='flex gap-3 items-center'>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-2 border-2 rounded-md text-sm font-medium bg-white"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
            <option value="aki-p">Aki-P</option>
          </select>
          <Button variant="secondary" onClick={handleImportClick} disabled={!audioBuffer}>Import</Button>
          <Button variant="secondary" onClick={handleExport} disabled={!audioBuffer || musicTitle === 'Music Title will go here'}>Export</Button>
        </div>
      </section>
      <section className='flex items-center justify-around'>
        <div className='border-2 w-[30%] h-18 mt-4 flex rounded-md'>
          <div className='border-r w-[30%] h-full p-2 flex flex-col justify-center items-center'>
            <label className='text-xs text-gray-600 mb-1 text-center'>
              BPM {bpmSuggested && <span className='text-green-600'>(Suggested)</span>}
            </label>
            <input
              type="number"
              min="60"
              max="240"
              value={bpm}
              onChange={(e) => {
                setBpm(Number(e.target.value))
                setBpmSuggested(false)
              }}
              className="w-16 px-1 text-center border rounded"
            />
          </div>
          <div className='border-r w-[30%] h-full p-2 flex flex-col justify-center items-center'>
            <label className='text-xs text-gray-600 mb-1 text-center'>
              Offset (ms) {offsetSuggested && <span className='text-green-600'>(Suggested)</span>}
            </label>
            <input
              type="number"
              step="10"
              value={offsetMs}
              onChange={(e) => {
                setOffsetMs(Number(e.target.value))
                setOffsetSuggested(false)
              }}
              className="w-16 px-1 text-center border rounded"
              title="Grid offset in milliseconds - shifts the BPM grid, not the audio"
            />
          </div>
          <div className='border-l w-[40%] h-full p-2 flex flex-col justify-center items-center gap-1'>
            <label className='text-xs text-gray-600'>Snap</label>
            <div className='flex gap-1 items-center'>
              <select
                value={snapDivision}
                onChange={(e) => setSnapDivision(Number(e.target.value))}
                className="px-1 py-1 text-xs border rounded"
                title="Notes always snap to the grid. Sub-beat lines reflect the selected division."
              >
                <option value={1}>1/1 (Whole)</option>
                <option value={2}>1/2 (Half)</option>
                <option value={4}>1/4 (Quarter)</option>
                <option value={8}>1/8 (Eighth)</option>
                <option value={16}>1/16 (Sixteenth)</option>
              </select>
            </div>
          </div>
        </div>
        <div className='border-2 w-[35%] h-18 mt-4 flex rounded-md'>
          <div className='flex items-center justify-center w-[40%] border-r-2'>
            <p>{formatTime(currentTime)}</p>
          </div>
          <div className='flex items-center justify-around w-[55%]'>
            <Icon url={previous} className='cursor-pointer' onClick={handlePrevious}/>
            {isPlaying ? (
              <Icon url={pause} className='cursor-pointer' onClick={handlePause}/>
            ) : (
              <Icon url={play} className='cursor-pointer' onClick={handlePlay}/>
            )}
            <Icon url={stop} className='cursor-pointer' onClick={handleStop}/>
            <Icon url={next} className='cursor-pointer' onClick={handleNext}/>
          </div>
        </div>
        <div className='w-[30%] h-14 mt-4 flex rounded-md items-center'>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={volumeIcon}/>
            <Slider value={volume} min={0} max={100} onChange={handleVolumeChange} className="range" />
          </div>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={magnifier}/>
            <Slider value={zoom} min={25} max={100} onChange={setZoom} className="range" />
            <span className='text-xs text-gray-600 min-w-12'>{zoom}%</span>
          </div>
        </div>
      </section>
      {/* Audio Scrubber - Fixed width, not scrollable */}
      <section className='flex justify-center mt-4 px-4'>
        <AudioScrubber
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          className='h-10 w-full max-w-4xl'
        />
      </section>

      {/* Waveform - Scrollable with viewport */}
      <section className='flex justify-center mt-2'>
        <div ref={waveformContainerRef} className='w-full h-32 border-2 rounded-md overflow-x-auto'>
          <Waveform 
            audioBuffer={audioBuffer} 
            currentTime={currentTime} 
            viewport={viewport}
            className='w-full h-full'
            containerRef={waveformContainerRef}
            disableCanvasInteraction={true}
          />
        </div>
      </section>
      <section className='mt-4'>
        <BeatmapEditor
          duration={duration}
          currentTime={currentTime}
          notes={notes}
          onNotesChange={setNotes}
          bpm={bpm}
          snapEnabled={true}
          snapDivision={snapDivision}
          offsetMs={offsetMs}
          viewport={viewport}
          className="w-full"
        />
      </section>
    </div>
  )
}

export default App

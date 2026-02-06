import './App.css'
import { useState, useRef, useEffect } from 'react'
import Button from './components/Button'
import Title from './components/Title'
import Icon from './components/Icon'
import Slider from './components/Slider'
import Waveform from './components/Waveform'
import BeatmapEditor from './components/BeatmapEditor'
import type { Note } from './components/BeatmapEditor'
import { detectBPM } from './utils/bpmDetection'
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
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [snapDivision, setSnapDivision] = useState<number>(4)
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState<Note[]>([])
  const [difficulty, setDifficulty] = useState<string>('easy')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null!)
  const audioInitializedRef = useRef(false)

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
    const arrayBuffer = await file.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(arrayBuffer)
    setAudioBuffer(decoded)
    
    // Auto-detect BPM (non-blocking suggestion)
    setTimeout(() => {
      const detectedBpm = detectBPM(decoded)
      setBpm(detectedBpm)
      setBpmSuggested(true)
    }, 0)
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
      setDuration(audio.duration)
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
  }, [audioUrl])

  // Update volume without recreating audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Cleanup audio URL only on final unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [])

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
    // Convert editor notes to beatmap JSON format
    const beatmapItems = notes.map(note => ({
      button_type: note.type === 'tap' ? 0 : 1,
      button_direction: note.lane,
      button_duration: note.duration || 0,
      button_time: note.time
    }))

    const beatmapData = {
      beatmap: {
        id: 1,
        song_id: 123,
        difficulty: difficulty,
        items: beatmapItems
      }
    }

    // Create and download JSON file
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
        
        // Validate minimal structure
        if (!json.beatmap || !Array.isArray(json.beatmap.items)) {
          alert('Invalid beatmap file: missing beatmap or items array')
          return
        }

        // Import difficulty (with fallback)
        const importedDifficulty = json.beatmap.difficulty
        const validDifficulties = ['easy', 'normal', 'hard', 'aki-p']
        if (importedDifficulty && validDifficulties.includes(importedDifficulty.toLowerCase())) {
          setDifficulty(importedDifficulty.toLowerCase())
        } else {
          setDifficulty('easy')
        }

        // Convert beatmap items to editor notes
        const importedNotes: Note[] = json.beatmap.items.map((item: {
          button_type: number
          button_direction: number
          button_time: number
          button_duration: number
        }) => ({
          id: crypto.randomUUID(),
          lane: item.button_direction,
          time: item.button_time,
          type: item.button_type === 0 ? 'tap' : 'hold',
          duration: item.button_type === 1 ? item.button_duration : undefined
        }))

        // Clear existing notes and load imported ones
        setNotes(importedNotes)
        
      } catch (error) {
        console.error('Failed to import beatmap:', error)
        alert('Failed to import beatmap: Invalid JSON file')
      }
    }
    reader.readAsText(file)
    
    // Clear file input to allow re-importing the same file
    if (importFileInputRef.current) {
      importFileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.keyCode === 32) {
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
          <Button variant="secondary" onClick={handleExport}>Export</Button>
        </div>
      </section>
      <section className='flex items-center justify-around'>
        <div className='border-2 w-[20%] h-12.5 mt-4 flex rounded-md'>
          <div className='border-r w-[50%] h-full p-2 flex flex-col justify-center items-center'>
            <label className='text-xs text-gray-600 mb-1'>
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
          <div className='border-l w-[50%] h-full p-2 flex flex-col justify-center items-center gap-1'>
            <label className='text-xs text-gray-600'>Snap</label>
            <div className='flex gap-1 items-center'>
              <button
                className={`px-2 py-1 text-xs rounded ${snapEnabled ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                onClick={() => setSnapEnabled(!snapEnabled)}
              >
                {snapEnabled ? 'ON' : 'OFF'}
              </button>
              <select
                value={snapDivision}
                onChange={(e) => setSnapDivision(Number(e.target.value))}
                disabled={!snapEnabled}
                className="px-1 py-1 text-xs border rounded disabled:opacity-50"
              >
                <option value={2}>1/2</option>
                <option value={4}>1/4</option>
              </select>
            </div>
          </div>
        </div>
        <div className='border-2 w-[45%] h-12.5 mt-4 flex rounded-md'>
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
        <div className='w-[30%] h-12.5 mt-4 flex rounded-md items-center'>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={volumeIcon}/>
            <Slider value={volume} min={0} max={100} onChange={handleVolumeChange} className="range" />
          </div>
          <div className='flex items-center gap-4 ml-2'>
            <Icon url={magnifier}/>
            <Slider value={zoom} min={25} max={500} onChange={setZoom} className="range" />
            <span className='text-xs text-gray-600 min-w-12'>{zoom}%</span>
          </div>
        </div>
      </section>
      <section className='flex justify-center mt-4'>
        <div ref={waveformContainerRef} className='w-full h-40 border-2 rounded-md overflow-x-auto'>
          <Waveform 
            audioBuffer={audioBuffer} 
            currentTime={currentTime} 
            duration={duration}
            onSeek={handleSeek}
            zoom={zoom}
            className='w-full h-20'
            containerRef={waveformContainerRef}
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
          snapEnabled={snapEnabled}
          snapDivision={snapDivision}
          zoom={zoom}
          className="w-full"
        />
      </section>
    </div>
  )
}

export default App

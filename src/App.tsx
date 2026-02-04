import './App.css'
import { useState, useRef, useEffect } from 'react'
import Button from './components/Button'
import Title from './components/Title'
import Icon from './components/Icon'
import Slider from './components/Slider'
import Waveform from './components/Waveform'
import BeatmapEditor from './components/BeatmapEditor'
import type { Note } from './components/BeatmapEditor'
import volumeIcon from './assets/volume.png'
import magnifier from './assets/zoom-in.png'
import next from './assets/forward-button.png'
import previous from './assets/rewind-button.png'
import play from './assets/play-button-arrowhead.png'
import pause from './assets/pause.png'
import stop from './assets/stop.png'

function App() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [musicTitle, setMusicTitle] = useState<string>('Music Title will go here')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [bpm, setBpm] = useState(120)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [snapDivision, setSnapDivision] = useState<number>(4)
  const [zoom, setZoom] = useState(100)
  const [notes, setNotes] = useState<Note[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleLoadMusic = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Stop any currently playing audio
    handleStop()

    setMusicTitle(file.name.replace(/\.[^/.]+$/, ''))

    // Create audio element for playback
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
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
      setCurrentTime(0)
    })

    // Decode audio for waveform
    const audioContext = new AudioContext()
    const arrayBuffer = await file.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(arrayBuffer)
    setAudioBuffer(decoded)
    setDuration(decoded.duration)
  }

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
    setCurrentTime(0)
    setIsPlaying(false)
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
      <section className='flex justify-around items-center'>
        <Button variant="primary" onClick={handleLoadMusic}>Load Music</Button>
        <Title text={musicTitle}/>
        <div className='flex gap-5'>
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
        </div>
      </section>
      <section className='flex items-center justify-around'>
        <div className='border-2 w-[20%] h-12.5 mt-4 flex rounded-md'>
          <div className='border-r w-[50%] h-full p-2 flex flex-col justify-center items-center'>
            <label className='text-xs text-gray-600 mb-1'>BPM</label>
            <input
              type="number"
              min="60"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
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
            <Slider value={zoom} min={50} max={1000} onChange={setZoom} className="range" />
            <span className='text-xs text-gray-600 min-w-12'>{zoom}%</span>
          </div>
        </div>
      </section>
      <section className='flex justify-center mt-4'>
        <div className='w-full h-40 border-2 rounded-md overflow-x-auto'>
          <Waveform 
            audioBuffer={audioBuffer} 
            currentTime={currentTime} 
            duration={duration}
            onSeek={handleSeek}
            zoom={zoom}
            className='w-full h-20' 
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

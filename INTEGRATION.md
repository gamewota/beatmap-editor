# 🎵 Beatmap Editor - Integration Guide

This guide explains how to integrate the Beatmap Editor into your React project, including the Waveform visualization and AudioScrubber components.

## 📦 Installation

### From GitHub

```bash
npm install github:gamewota/beatmap-editor
```

## 🚀 Quick Start

### 1. Import the Components

```tsx
import { 
  BeatmapEditor, 
  Waveform, 
  AudioScrubber,
  TimelineViewport,
  Note 
} from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'
```

### 2. Basic Usage (Beatmap Editor Only)

```tsx
import { useState } from 'react'
import { BeatmapEditor, Note, Song } from '@gamewota/beatmap-editor'

function MyEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  
  const song: Song = {
    id: '123',
    title: 'My Song',
    bpm: 128,
    duration: 180,
    audioUrl: '/audio/song.mp3'
  }
  
  return (
    <div>
      <h1>Edit Beatmap</h1>
      <BeatmapEditor
        song={song}
        notes={notes}
        onNotesChange={setNotes}
      />
    </div>
  )
}
```

### 3. Full Setup (with Waveform & Audio Controls)

For a complete beatmap editing experience with audio waveform and timeline scrubber:

```tsx
import { useState, useRef, useEffect, useMemo } from 'react'
import { 
  BeatmapEditor, 
  Waveform, 
  AudioScrubber,
  TimelineViewport,
  Note, 
  Song 
} from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function FullEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [zoom, setZoom] = useState(100)
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  
  // Create shared viewport for syncing Waveform and BeatmapEditor
  const viewport = useMemo(() => new TimelineViewport(0, 800), [])
  
  // Update viewport when duration or zoom changes
  useEffect(() => {
    viewport.setDuration(duration * 1000)
  }, [duration, viewport])
  
  useEffect(() => {
    viewport.setZoom(zoom / 100)
  }, [zoom, viewport])
  
  const song: Song = {
    id: '123',
    title: 'My Song',
    bpm: 128,
    duration: duration,
    audioUrl: '/audio/song.mp3'
  }
  
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
    setCurrentTime(time)
  }
  
  // Load audio and decode for waveform
  const loadAudio = async (file: File) => {
    const url = URL.createObjectURL(file)
    
    // Decode audio for waveform
    const audioContext = new AudioContext()
    const arrayBuffer = await file.arrayBuffer()
    const decoded = await audioContext.decodeAudioData(arrayBuffer)
    setAudioBuffer(decoded)
    setDuration(decoded.duration)
    
    // Set audio source
    if (audioRef.current) {
      audioRef.current.src = url
    }
  }
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{song.title}</h1>
      
      {/* Audio Player */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        controls
        className="w-full"
      />
      
      {/* Audio Scrubber - Fixed width timeline */}
      <AudioScrubber
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        className="h-10 w-full"
      />
      
      {/* Waveform - Scrollable with zoom sync */}
      <div 
        ref={waveformContainerRef}
        className="h-32 border rounded overflow-x-auto"
      >
        <Waveform
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          viewport={viewport}
          onSeek={handleSeek}
          containerRef={waveformContainerRef}
          disableCanvasInteraction={false}
        />
      </div>
      
      {/* Zoom Control */}
      <div className="flex items-center gap-2">
        <span>Zoom:</span>
        <input
          type="range"
          min="25"
          max="100"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-32"
        />
        <span>{zoom}%</span>
      </div>
      
      {/* Beatmap Editor - Shares viewport with Waveform */}
      <div className="bg-white rounded-lg shadow">
        <BeatmapEditor
          song={song}
          notes={notes}
          onNotesChange={setNotes}
          currentTime={currentTime}
          viewport={viewport}
          snapEnabled={true}
          snapDivision={4}
          className="p-4"
        />
      </div>
    </div>
  )
}
```

## 📦 Component API Reference

### BeatmapEditor

The main beatmap editing component with canvas-based timeline.

```tsx
<BeatmapEditor
  song={song}                    // Required: Song data
  notes={notes}                  // Optional: Array of notes
  onNotesChange={setNotes}       // Optional: Notes change callback
  currentTime={currentTime}      // Optional: Current playback time
  viewport={viewport}            // Optional: Shared TimelineViewport
  snapEnabled={true}             // Optional: Enable grid snapping
  snapDivision={4}               // Optional: Snap divisions (1,2,4,8,16)
  offsetMs={0}                   // Optional: Grid offset in ms
  sfxEnabled={true}              // Optional: Enable preview sounds
  className="custom-class"       // Optional: Additional CSS
/>
```

### Waveform

Audio waveform visualization that syncs with the timeline.

```tsx
<Waveform
  audioBuffer={audioBuffer}      // Required: Decoded AudioBuffer
  viewport={viewport}            // Required: TimelineViewport instance
  currentTime={currentTime}      // Optional: Current playback time
  onSeek={handleSeek}            // Optional: Click/seek callback
  containerRef={containerRef}    // Optional: Scroll container ref
  disableCanvasInteraction={false} // Optional: Disable click-to-seek
  className="custom-class"       // Optional: Additional CSS
/>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `audioBuffer` | `AudioBuffer \| null` | ✅ Yes | - | Decoded audio data |
| `viewport` | `TimelineViewport` | ✅ Yes | - | Shared viewport instance |
| `currentTime` | `number` | ❌ No | `0` | Current playback time (seconds) |
| `onSeek` | `(time: number) => void` | ❌ No | - | Called when user clicks waveform |
| `containerRef` | `RefObject<HTMLDivElement>` | ❌ No | - | Scroll container for sync |
| `disableCanvasInteraction` | `boolean` | ❌ No | `false` | Disable click-to-seek |
| `className` | `string` | ❌ No | - | Additional CSS class |

### AudioScrubber

Timeline scrubber for audio navigation with playhead and hover preview.

```tsx
<AudioScrubber
  currentTime={currentTime}      // Required: Current time in seconds
  duration={duration}            // Required: Total duration in seconds
  onSeek={handleSeek}            // Required: Seek callback
  className="custom-class"       // Optional: Additional CSS
/>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `currentTime` | `number` | ✅ Yes | - | Current playback time (seconds) |
| `duration` | `number` | ✅ Yes | - | Total duration (seconds) |
| `onSeek` | `(time: number) => void` | ✅ Yes | - | Called on seek |
| `className` | `string` | ❌ No | - | Additional CSS class |

### TimelineScrubber

Alternative scrubber that works with TimelineViewport.

```tsx
<TimelineScrubber
  viewport={viewport}            // Required: TimelineViewport instance
  currentTime={currentTime}      // Required: Current time in seconds
  onSeek={handleSeek}            // Required: Seek callback
  containerRef={containerRef}    // Optional: Scroll container ref
  className="custom-class"       // Optional: Additional CSS
/>
```

### TimelineViewport

Utility class for syncing multiple timeline components (Waveform, BeatmapEditor, etc.).

```tsx
const viewport = useMemo(() => new TimelineViewport(0, 800), [])

// Update duration
viewport.setDuration(durationMs)

// Update zoom level (1.0 = 100%)
viewport.setZoom(zoomLevel)

// Get current state
const state = viewport.getState()

// Subscribe to changes
const unsubscribe = viewport.subscribe(() => {
  console.log('Viewport changed')
})

// Convert between time and pixels
const pixel = viewport.timeToPixel(timeMs)
const timeMs = viewport.pixelToTime(pixel)
```

## 💾 TypeScript Types

```typescript
import { 
  Note, 
  NoteType, 
  Song, 
  BeatmapEditorProps 
} from '@gamewota/beatmap-editor'

// Note data format
interface Note {
  id: string       // Unique identifier
  lane: number     // 0-4 (5 lanes)
  time: number     // Time in seconds
  type: 'tap' | 'hold'
  duration?: number // For hold notes, in seconds
}

// Song data
interface Song {
  id: string
  title: string
  bpm: number
  duration: number  // in seconds
  audioUrl: string  // URL to audio file
}

// Note type
type NoteType = 'tap' | 'hold'
```

## 🔗 Component Synchronization

To keep Waveform and BeatmapEditor in sync (same zoom, scroll position):

```tsx
function SyncedEditor() {
  // Create single viewport instance
  const viewport = useMemo(() => new TimelineViewport(0, 800), [])
  
  // Shared state
  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState(100)
  
  // Update viewport zoom
  useEffect(() => {
    viewport.setZoom(zoom / 100)
  }, [zoom, viewport])
  
  return (
    <>
      {/* Both components share the same viewport */}
      <Waveform
        viewport={viewport}
        currentTime={currentTime}
        // ...
      />
      <BeatmapEditor
        viewport={viewport}
        currentTime={currentTime}
        // ...
      />
    </>
  )
}
```

## 📖 Complete Example

```tsx
import { useState, useRef, useEffect, useMemo } from 'react'
import { 
  BeatmapEditor, 
  Waveform, 
  AudioScrubber,
  TimelineViewport,
  Note, 
  Song 
} from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function SongEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  
  // Create shared viewport
  const viewport = useMemo(() => new TimelineViewport(0, 800), [])
  
  const song: Song = {
    id: '123',
    title: 'Summer Vibes',
    bpm: 128,
    duration: 225,
    audioUrl: '/audio/song.mp3'
  }
  
  // Update viewport duration
  useEffect(() => {
    viewport.setDuration(song.duration * 1000)
  }, [song.duration, viewport])
  
  // Load existing beatmap
  useEffect(() => {
    fetch(`/api/songs/${song.id}/beatmap`)
      .then(res => res.json())
      .then(data => setNotes(data.notes || []))
      .catch(() => setNotes([]))
  }, [song.id])
  
  // Save draft on changes
  const handleNotesChange = (newNotes: Note[]) => {
    setNotes(newNotes)
    fetch(`/api/songs/${song.id}/beatmap/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: newNotes })
    })
  }
  
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
    setCurrentTime(time)
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{song.title}</h1>
      
      {/* Audio Player */}
      <audio
        ref={audioRef}
        src={song.audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controls
        className="w-full mb-4"
      />
      
      {/* Audio Scrubber */}
      <AudioScrubber
        currentTime={currentTime}
        duration={song.duration}
        onSeek={handleSeek}
        className="h-10 w-full mb-4"
      />
      
      {/* Waveform */}
      <div 
        ref={waveformContainerRef}
        className="h-32 border rounded overflow-x-auto mb-4"
      >
        <Waveform
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          viewport={viewport}
          onSeek={handleSeek}
          containerRef={waveformContainerRef}
        />
      </div>
      
      {/* Beatmap Editor */}
      <div className="bg-white rounded-lg shadow">
        <BeatmapEditor
          song={song}
          notes={notes}
          onNotesChange={handleNotesChange}
          currentTime={currentTime}
          viewport={viewport}
          snapEnabled={true}
          snapDivision={4}
          className="p-4"
        />
      </div>
      
      {/* Export Button */}
      <button
        onClick={() => {
          const data = { songId: song.id, notes }
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${song.title}_beatmap.json`
          a.click()
        }}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Export Beatmap
      </button>
    </div>
  )
}
```

## 🎨 Styling

The components use Tailwind CSS classes. You can customize the appearance by:

1. **Using the className prop:**
   ```tsx
   <BeatmapEditor className="my-custom-class" />
   <Waveform className="h-48" />
   <AudioScrubber className="h-12" />
   ```

2. **Overriding CSS variables:**
   ```css
   .beatmap-editor {
     --lane-height: 60px;
   }
   ```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Styles not applying | Import the CSS: `import '@gamewota/beatmap-editor/style.css'` |
| TypeScript errors | Ensure `moduleResolution` is `bundler` in `tsconfig.json` |
| Notes not showing | Check that `notes` prop is an array |
| Grid not visible | Check that `song.bpm` is set correctly |
| Waveform not showing | Ensure `audioBuffer` is a decoded AudioBuffer |
| Components not syncing | Pass the same `TimelineViewport` instance to both |

## 📄 License

MIT License

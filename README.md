# 🎵 Beatmap Editor

A React component library for editing rhythm game beatmaps with audio waveform visualization.

## 📦 Installation

```bash
npm install github:gamewota/beatmap-editor
```

## 🚀 Quick Start

### Basic Usage (Beatmap Editor Only)

```tsx
import { useState } from 'react'
import { BeatmapEditor, Note } from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  
  const song = {
    id: '123',
    title: 'Summer Vibes',
    bpm: 128,
    duration: 225,
    audioUrl: 'https://cdn.example.com/songs/123/audio.mp3'
  }
  
  return (
    <BeatmapEditor
      song={song}
      notes={notes}
      onNotesChange={(newNotes) => setNotes(newNotes)}
    />
  )
}
```

### Full Setup (with Waveform & Audio Controls)

```tsx
import { useState, useMemo, useRef, useEffect } from 'react'
import { 
  BeatmapEditor, 
  Waveform, 
  AudioScrubber, 
  TimelineViewport,
  Note 
} from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function FullEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(180)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // Create shared viewport for sync between components
  const viewport = useMemo(() => new TimelineViewport(0, 800), [])
  
  // Update viewport when duration changes
  useEffect(() => {
    viewport.setDuration(duration * 1000)
  }, [duration, viewport])
  
  const song = {
    id: '123',
    title: 'Summer Vibes',
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
  
  return (
    <div className="space-y-4">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={song.audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        controls
        className="w-full"
      />
      
      {/* Audio Scrubber - Timeline navigation */}
      <AudioScrubber
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        className="h-10"
      />
      
      {/* Waveform - Audio visualization */}
      <div className="h-32 border rounded overflow-x-auto">
        <Waveform
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          viewport={viewport}
          onSeek={handleSeek}
        />
      </div>
      
      {/* Beatmap Editor - Note editing */}
      <BeatmapEditor
        song={song}
        notes={notes}
        onNotesChange={setNotes}
        currentTime={currentTime}
        viewport={viewport}
      />
    </div>
  )
}
```

## 📖 Documentation

- **[Integration Guide](./INTEGRATION.md)** - Detailed integration with Waveform, AudioScrubber, and audio sync
- **[Library Development](./LIBRARY.md)** - How to build, publish, and customize

## 📦 Exported Components

| Component | Description |
|-----------|-------------|
| `BeatmapEditor` | Main beatmap editing component with canvas-based timeline |
| `Waveform` | Audio waveform visualization with time sync |
| `AudioScrubber` | Timeline scrubber for audio navigation |
| `TimelineScrubber` | Alternative scrubber that syncs with viewport |
| `TimelineViewport` | Utility class for syncing multiple components |
| `Button`, `Icon`, `Slider`, `Title` | UI helper components |

## ✨ Features

- 🎮 **Canvas-based timeline** - Smooth, performant note editing
- 🎵 **Audio sync** - Works with your audio player
- 🌊 **Waveform visualization** - Visual audio representation
- 🎯 **Snap to grid** - Configurable beat snapping
- ⌨️ **Keyboard shortcuts** - Efficient editing workflow
- 🎨 **Customizable** - Tailwind CSS styling
- 🔷 **TypeScript** - Full type safety
- 💾 **Controlled component** - You control all the data

## 🛠️ Tech Stack

- React 18/19
- TypeScript
- Vite
- Tailwind CSS
- Canvas API

## 📄 License

MIT License

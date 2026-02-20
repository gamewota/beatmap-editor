# 🎵 Beatmap Editor - Integration Guide

This guide explains how to integrate the Beatmap Editor into your React project.

## 📦 Installation

### From GitHub

```bash
npm install github:gamewota/beatmap-editor
```

## 🚀 Quick Start

### 1. Import the Component

```tsx
import { BeatmapEditor, Note } from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'
```

### 2. Basic Usage

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

## ⚙️ Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `song` | `Song` | ✅ Yes | - | Song data (title, BPM, duration, audioUrl) |
| `notes` | `Note[]` | ❌ No | `[]` | Array of notes to display/edit |
| `onNotesChange` | `(notes: Note[]) => void` | ❌ No | - | Called when notes change |
| `currentTime` | `number` | ❌ No | `0` | Current playback time in seconds |
| `bpm` | `number` | ❌ No | `120` | BPM for grid (use song.bpm instead) |
| `snapEnabled` | `boolean` | ❌ No | `true` | Enable grid snapping |
| `snapDivision` | `number` | ❌ No | `4` | Snap divisions (1, 2, 4, 8, 16) |
| `offsetMs` | `number` | ❌ No | `0` | Grid offset in milliseconds |
| `viewport` | `TimelineViewport` | ❌ No | - | External viewport instance |
| `className` | `string` | ❌ No | - | Additional CSS class |
| `sfxEnabled` | `boolean` | ❌ No | `true` | Enable preview SFX |
| `onSfxEnabledChange` | `(enabled: boolean) => void` | ❌ No | - | SFX toggle callback |
| `onScroll` | `(scrollLeft: number) => void` | ❌ No | - | Scroll position callback |

## 💾 TypeScript Types

```typescript
import { Note, NoteType, Song, BeatmapEditorProps } from '@gamewota/beatmap-editor'

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

## 📖 Complete Example

```tsx
import { useState, useRef, useEffect } from 'react'
import { BeatmapEditor, Note, Song } from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function SongEditor() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const song: Song = {
    id: '123',
    title: 'Summer Vibes',
    bpm: 128,
    duration: 225,
    audioUrl: '/audio/song.mp3'
  }
  
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
    // Auto-save to backend
    fetch(`/api/songs/${song.id}/beatmap/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: newNotes })
    })
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
      
      {/* Beatmap Editor */}
      <div className="bg-white rounded-lg shadow">
        <BeatmapEditor
          song={song}
          notes={notes}
          onNotesChange={handleNotesChange}
          currentTime={currentTime}
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

The component uses Tailwind CSS classes. You can customize the appearance by:

1. **Using the className prop:**
   ```tsx
   <BeatmapEditor className="my-custom-class" />
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

## 📄 License

MIT License

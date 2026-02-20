# 🎵 Beatmap Editor

A React component library for editing rhythm game beatmaps.

## 📦 Installation

```bash
npm install github:gamewota/beatmap-editor
```

## 🚀 Quick Start

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

## 📖 Documentation

- **[Integration Guide](./INTEGRATION.md)** - How to integrate into your project
- **[Library Development](./LIBRARY.md)** - How to build, publish, and customize

## ✨ Features

- 🎮 **Canvas-based timeline** - Smooth, performant note editing
- 🎵 **Audio sync** - Works with your audio player
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

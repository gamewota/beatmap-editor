# Beatmap Editor

A React component library for editing 5-lane rhythm-game beatmaps. Ships as an npm package, a UMD bundle, and a framework-agnostic Web Component.

- **Demo:** https://gamewota.github.io/beatmap-editor/
- **npm:** [`@gamewota/beatmap-editor`](https://www.npmjs.com/package/@gamewota/beatmap-editor)
- **Source:** https://github.com/gamewota/beatmap-editor

## Install

```bash
npm install @gamewota/beatmap-editor
```

Peer dependencies: React 18 or 19.

## Quick start

```tsx
import { useState } from 'react'
import { BeatmapEditor, Note } from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

function App() {
  const [notes, setNotes] = useState<Note[]>([])

  return (
    <BeatmapEditor
      duration={180}            // seconds
      bpm={175}
      offsetMs={670}            // ms before first beat
      snapDivision={8}          // 1/8 grid (default)
      notes={notes}
      onNotesChange={setNotes}
    />
  )
}
```

Click a lane to place a tap note. Right-click a note to delete it. Pick **Hold**, click once to set the start, click again on the same lane to set the end.

## Features

- Canvas-based timeline with batched rendering (handles long songs without UI lag)
- Sub-beat grid: visible subdivisions follow the snap setting (1/1 → 1/16)
- All note placement always snaps to the grid — no off-grid notes
- 5 lanes, tap + hold notes with cross-note links
- Audio waveform display with shared zoom/scroll
- Preview SFX on playback
- Exports to a JSON schema designed for game runtimes (see below)
- Available as React component, UMD bundle, and Web Component

## Beatmap JSON schema

The editor reads and writes this exact shape:

```json
{
  "bpm": 175,
  "offset": 670,
  "charts": [
    {
      "uuid": "807c1493-05a8-46e8-ae11-e2bca474d5f1",
      "laneCount": 5,
      "notes": [
        { "uuid": "...", "songPos": 0,    "beat": 0, "label": "", "lane": 1 },
        { "uuid": "...", "songPos": 1371.4285714285713, "beat": 4, "label": "", "lane": 3 }
      ],
      "links": [
        {
          "uuid": "...",
          "startNote": { "uuid": "...", "songPos": 27428.57, "beat": 80, "label": "", "lane": 0 },
          "endNote":   { "uuid": "...", "songPos": 28800.00, "beat": 84, "label": "", "lane": 0 }
        }
      ]
    }
  ]
}
```

- `songPos` is in **ms relative to `offset`** (audio time = `songPos + offset`).
- `beat = songPos / (60000 / bpm)` (fractional values are allowed for sub-beat snaps).
- `lane` is 0-indexed (0 = leftmost, 4 = rightmost).
- Tap notes appear only in `notes[]`. Hold notes appear as **two** entries in `notes[]` plus one entry in `links[]` referencing them (full object copies, not pointers).

Full schema reference: [INTEGRATION.md → Beatmap JSON schema](./INTEGRATION.md#beatmap-json-schema).

## Snap convention

The snap denominator follows music notation — it divides the **whole note** (1 measure in 4/4), not a beat:

| Setting | Snap interval | Lines per measure |
|---|---|---|
| 1/1 (Whole)     | 1 measure (4 beats) | 1 — measures only |
| 1/2 (Half)      | 2 beats             | 2 |
| 1/4 (Quarter)   | 1 beat              | 4 |
| 1/8 (Eighth)    | 1/2 beat            | 8 *(default)* |
| 1/16 (Sixteenth)| 1/4 beat            | 16 |

Sub-beat subdivisions are rendered as thin lines between measure and beat lines.

## Docs

- [`INTEGRATION.md`](./INTEGRATION.md) — props, types, complete examples, schema reference
- [`MICROFRONTEND.md`](./MICROFRONTEND.md) — using the Web Component from non-React apps
- [`LIBRARY.md`](./LIBRARY.md) — building, contributing, and releasing the library

## License

MIT

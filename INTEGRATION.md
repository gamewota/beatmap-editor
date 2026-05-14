# Integration Guide

How to embed `@gamewota/beatmap-editor` in a React app.

## Install

```bash
npm install @gamewota/beatmap-editor
```

Peer dependencies: `react@^18 || ^19`, `react-dom@^18 || ^19`.

If you can't use npm, you can also install directly from a tag on GitHub:

```bash
npm install github:gamewota/beatmap-editor#v1.1.0
```

## Quick start

```tsx
import { useState } from 'react'
import { BeatmapEditor, Note } from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

export function MyEditor() {
  const [notes, setNotes] = useState<Note[]>([])

  return (
    <BeatmapEditor
      duration={180}      // seconds
      bpm={175}
      offsetMs={670}
      snapDivision={8}
      notes={notes}
      onNotesChange={setNotes}
    />
  )
}
```

Imports you'll likely use:

```ts
import {
  BeatmapEditor,
  Waveform,
  AudioScrubber,
  TimelineViewport,
  detectBPM,
  type Note,
  type NoteType,
  type Song,
  type BeatmapEditorProps,
} from '@gamewota/beatmap-editor'
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `duration` | `number` | `300` | Audio length in **seconds**. Required for the grid to scale correctly. |
| `currentTime` | `number` | `0` | Current playback position in seconds. Drive this from your audio element. |
| `bpm` | `number` | `120` | Beats per minute. |
| `offsetMs` | `number` | `0` | Milliseconds before the first beat (grid anchor). |
| `snapDivision` | `number` | `8` | Snap denominator — `1`, `2`, `4`, `8`, or `16` (see [snap convention](#snap-convention)). |
| `notes` | `Note[]` | `[]` | Notes to render. |
| `onNotesChange` | `(notes: Note[]) => void` | — | Called when the user adds/deletes a note. |
| `viewport` | `TimelineViewport` | internal | Pass an external instance to keep the waveform and the editor zoomed/scrolled together. |
| `sfxEnabled` | `boolean` | `true` | Plays a tick when the playhead crosses a note. |
| `onSfxEnabledChange` | `(enabled: boolean) => void` | — | If provided, the editor becomes controlled w.r.t. the SFX toggle. |
| `sfxUrl` | `string` | `/sfx.mp3` | Override the SFX audio file URL. |
| `onScroll` | `(scrollLeft: number) => void` | — | Fires when the editor is scrolled horizontally. |
| `className` | `string` | `""` | Extra CSS class on the editor's outer `<div>`. |
| `song` | `Song` | — | Optional convenience prop. If provided, `song.bpm` / `song.duration` are used unless `bpm` / `duration` are explicitly set. |

> `snapEnabled` is intentionally not in this table — placement now **always** snaps to the visible grid. Pick `snapDivision={1}` (1/1) if you want whole-note placement.

## Types

```ts
type NoteType = 'tap' | 'hold'

interface Note {
  id: string          // any unique string (the editor uses crypto.randomUUID())
  lane: number        // 0–4
  time: number        // seconds, audio time (includes offset)
  type: NoteType
  duration?: number   // seconds, for type === 'hold'
}

interface Song {
  id: string
  title: string
  bpm: number
  duration: number    // seconds
  audioUrl: string
}
```

Note: the `Note.time` value is **seconds in audio time**, including the offset. The export step converts to the schema's `songPos` (ms relative to offset).

## Snap convention

The snap denominator divides the **whole note** (one measure in 4/4 time), matching standard music notation.

| Setting | Snap interval | Visible lines per measure |
|---|---|---|
| 1/1 (Whole)     | 4 beats   | 1 thick measure bar |
| 1/2 (Half)      | 2 beats   | 1 measure + 1 beat line |
| 1/4 (Quarter)   | 1 beat    | 1 measure + 3 beat lines |
| 1/8 (Eighth)    | 1/2 beat  | 1 measure + 3 beats + 4 sub-beats |
| 1/16 (Sixteenth)| 1/4 beat  | 1 measure + 3 beats + 12 sub-beats |

The first beat sits exactly at `offsetMs`. Sub-beat lines render as thin tinted lines; measure bars are bright white.

## Complete example with audio

```tsx
import { useEffect, useRef, useState } from 'react'
import {
  BeatmapEditor,
  Waveform,
  AudioScrubber,
  TimelineViewport,
  type Note,
} from '@gamewota/beatmap-editor'
import '@gamewota/beatmap-editor/style.css'

export function SongEditor({ audioUrl }: { audioUrl: string }) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [notes, setNotes] = useState<Note[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null!)

  // One viewport instance shared by the waveform and the editor keeps
  // their zoom and scroll perfectly aligned.
  const [viewport] = useState(() => new TimelineViewport(0, 800))

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))

    // Decode for the waveform
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => new AudioContext().decodeAudioData(buf))
      .then(setAudioBuffer)

    return () => { audio.pause(); audioRef.current = null }
  }, [audioUrl])

  useEffect(() => { viewport.setDuration(duration * 1000) }, [viewport, duration])

  return (
    <div>
      <button onClick={() => audioRef.current?.play()}>Play</button>
      <button onClick={() => audioRef.current?.pause()}>Pause</button>

      <AudioScrubber
        currentTime={currentTime}
        duration={duration}
        onSeek={t => { if (audioRef.current) audioRef.current.currentTime = t }}
        className="h-10 w-full"
      />

      <div ref={waveformContainerRef} className="h-32 overflow-x-auto">
        <Waveform
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          viewport={viewport}
          containerRef={waveformContainerRef}
          className="w-full h-full"
          disableCanvasInteraction
        />
      </div>

      <BeatmapEditor
        duration={duration}
        currentTime={currentTime}
        bpm={175}
        offsetMs={670}
        snapDivision={8}
        notes={notes}
        onNotesChange={setNotes}
        viewport={viewport}
      />
    </div>
  )
}
```

### Auto-detecting BPM and offset

```ts
import { detectBPM } from '@gamewota/beatmap-editor'

const { bpm, offsetMs } = await detectBPM(audioBuffer)
```

`detectBPM` returns `{ bpm: number, offsetMs: number }`. Wrap it in a generation counter (see `src/App.tsx`) if the user can load several files in a row.

## Beatmap JSON schema

When you export or persist a chart, this is the shape to use. The shape was designed for game runtimes — `songPos` is the millisecond playhead position relative to the song's offset.

```json
{
  "bpm": 175,
  "offset": 670,
  "charts": [
    {
      "uuid": "807c1493-05a8-46e8-ae11-e2bca474d5f1",
      "laneCount": 5,
      "notes": [
        {
          "uuid": "7dba52df-ef2d-4230-9f0d-39c08a85b061",
          "songPos": 0,
          "beat": 0,
          "label": "",
          "lane": 1
        }
      ],
      "links": [
        {
          "uuid": "17c03d91-4c5d-43cf-a1f4-5d27b8008a04",
          "startNote": {
            "uuid": "36726d54-6cb3-40ac-9a8a-9dd7a1984860",
            "songPos": 27428.571428571428,
            "beat": 80,
            "label": "",
            "lane": 0
          },
          "endNote": {
            "uuid": "7407f2ee-14df-473e-92ff-f10d52916631",
            "songPos": 28800,
            "beat": 84,
            "label": "",
            "lane": 0
          }
        }
      ]
    }
  ]
}
```

Field rules:

- `bpm`, `offset` — song-level timing. `offset` is milliseconds before the first beat.
- `charts[]` — usually one entry per difficulty. `charts[0].uuid` is stable across exports of the same chart.
- `notes[]` — every placeable note, including the endpoints of hold notes.
  - `songPos` — ms, relative to `offset`. Audio time = `songPos + offset`.
  - `beat` — `songPos / (60000 / bpm)`. May be fractional for sub-beat snaps.
  - `lane` — `0..(laneCount - 1)`, 0-indexed.
  - `label` — currently always `""`; reserved for future per-note metadata.
- `links[]` — connections between notes (hold / slide).
  - `startNote` and `endNote` are **full object copies** of the linked notes (not just UUIDs).
  - Both linked notes must also appear in `notes[]`.
  - The editor's current note model uses one lane per hold; cross-lane links are accepted on import but dropped (the start/end notes are kept as taps).

### Sample export → game data flow

```ts
// Inside your save handler
const json = JSON.parse(await file.text())
const { bpm, offset } = json
const chart = json.charts[0]

// At runtime: when should I trigger note at index i?
const audioTimeMs = chart.notes[i].songPos + offset
```

## Sharing a viewport between components

If you render `Waveform` alongside `BeatmapEditor`, pass the same `TimelineViewport` to both. Zooming or scrolling either one updates the other.

```tsx
const [viewport] = useState(() => new TimelineViewport(durationMs, containerWidthPx))
// ...
<Waveform viewport={viewport} ... />
<BeatmapEditor viewport={viewport} ... />
```

The viewport is the single source of truth for `pixelsPerMs`, scroll position, and duration. Don't recreate it on each render.

## Styling

The editor uses Tailwind utility classes for its built-in UI. Import the bundled stylesheet once at the app entry:

```ts
import '@gamewota/beatmap-editor/style.css'
```

You can layer your own classes via `className`; the editor doesn't lock down its outer wrapper.

If your host app already uses Tailwind, add the package's `dist` to your `content` glob so unused classes aren't purged:

```js
// tailwind.config.js
content: [
  './src/**/*.{ts,tsx}',
  './node_modules/@gamewota/beatmap-editor/dist/**/*.{js,cjs}',
]
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Grid is invisible | `bpm` is 0 or `duration` is 0. Set both before mounting. |
| Notes appear off the grid | You're storing pre-1.1.0 data with `snapEnabled={false}`. Re-snap on import. |
| Waveform and editor scroll out of sync | Each is using its own `TimelineViewport`. Share one instance. |
| Styles look unstyled | `style.css` wasn't imported, or Tailwind purged the package's classes (see styling note above). |
| `Note.time` looks like ms not seconds | `time` is **seconds** in the React model; `songPos` is **ms** in the JSON schema. Don't mix them. |

## Migration from pre-1.1.0

If you stored beatmaps in the old `{ beatmap: { items: [...] } }` format:

```ts
// Old → new
const oldItems = oldJson.beatmap.items  // { button_type, button_direction, button_time, button_duration }
const beatDurationMs = (60 / bpm) * 1000

const taps = oldItems
  .filter(i => i.button_type === 0)
  .map(i => ({
    uuid: crypto.randomUUID(),
    songPos: i.button_time * 1000 - offsetMs,
    beat: (i.button_time * 1000 - offsetMs) / beatDurationMs,
    label: '',
    lane: i.button_direction,
  }))

// holds: emit two notes + a link per old hold (button_type === 1, duration > 0)
```

The 1.1.0 editor does not import the old format directly — convert externally and feed the new shape.

## License

MIT

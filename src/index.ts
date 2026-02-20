/**
 * Beatmap Editor - React Component Library
 * 
 * A beatmap editor component for rhythm games.
 * 
 * @example
 * ```tsx
 * import { BeatmapEditor } from '@gamewota/beatmap-editor'
 * import '@gamewota/beatmap-editor/style.css'
 * 
 * function App() {
 *   const song = {
 *     id: '123',
 *     title: 'My Song',
 *     bpm: 128,
 *     duration: 180,
 *     audioUrl: '/audio/song.mp3'
 *   }
 *   
 *   const [notes, setNotes] = useState([])
 *   
 *   return (
 *     <BeatmapEditor
 *       song={song}
 *       notes={notes}
 *       onNotesChange={(newNotes) => setNotes(newNotes)}
 *     />
 *   )
 * }
 * ```
 */

// Import styles to be bundled with the library
import './style.css'

// ===============================
// Main Components
// ===============================

// Core beatmap editor component
export { default as BeatmapEditor } from './components/BeatmapEditor'

// Waveform visualization component
export { default as Waveform } from './components/Waveform'

// Audio scrubber/timeline component
export { default as AudioScrubber } from './components/AudioScrubber'

// Timeline scrubber component
export { default as TimelineScrubber } from './components/TimelineScrubber'

// UI Components
export { default as Button } from './components/Button'
export { default as Icon } from './components/Icon'
export { default as Slider } from './components/Slider'
export { default as Title } from './components/Title'

// ===============================
// Types
// ===============================
export type { 
  Note, 
  NoteType, 
  Song, 
  BeatmapEditorProps 
} from './components/BeatmapEditor'

// ===============================
// Utilities
// ===============================
export { TimelineViewport } from './utils/TimelineViewport'
export type { TimelineViewportState } from './utils/TimelineViewport'
export { detectBPM } from './utils/bpmDetection'
export type { BPMDetectionResult } from './utils/bpmDetection'

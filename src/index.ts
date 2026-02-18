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

// Main component
export { default as BeatmapEditor } from './components/BeatmapEditor'

// Types
export type { 
  Note, 
  NoteType, 
  Song, 
  BeatmapEditorProps 
} from './components/BeatmapEditor'

// Utilities
export { TimelineViewport } from './utils/TimelineViewport'
export type { TimelineViewportState } from './utils/TimelineViewport'

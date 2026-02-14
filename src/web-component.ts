/**
 * Beatmap Editor Web Component
 * Embeddable microfrontend for beatmap editing
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import BeatmapEditor from './components/BeatmapEditor';
import { TimelineViewport } from './utils/TimelineViewport';
// Import CSS for bundling - will be injected into shadow root
import styles from './index.css?inline';

// Define the web component
class BeatmapEditorElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private viewport: TimelineViewport;
  private _notes: Array<{ id: string; lane: number; time: number; type: 'tap' | 'hold'; duration?: number }> = [];
  private static _sharedStyles: CSSStyleSheet | null = null;
  
  // Observed attributes
  static get observedAttributes() {
    return ['bpm', 'snap-enabled', 'snap-division', 'offset-ms', 'zoom', 'notes', 'duration'];
  }
  
  constructor() {
    super();
    this.viewport = new TimelineViewport(0, 800);
    
    // Create shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    
    // Add compiled styles - shared across instances via constructed stylesheet
    if (!BeatmapEditorElement._sharedStyles) {
      BeatmapEditorElement._sharedStyles = new CSSStyleSheet();
      BeatmapEditorElement._sharedStyles.replaceSync(styles);
    }
    shadow.adoptedStyleSheets = [BeatmapEditorElement._sharedStyles];
    
    // Add host styles
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      :host {
        display: block;
        width: 100%;
        min-height: 400px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      #root {
        width: 100%;
        height: 100%;
      }
    `;
    shadow.appendChild(hostStyle);
    
    // Create mount point
    const mountPoint = document.createElement('div');
    mountPoint.id = 'root';
    shadow.appendChild(mountPoint);
  }
  
  connectedCallback() {
    this.render();
  }
  
  disconnectedCallback() {
    this.root?.unmount();
  }
  
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      // Parse notes attribute and update internal state
      if (name === 'notes' && newValue) {
        try {
          this._notes = JSON.parse(newValue);
        } catch {
          this._notes = [];
        }
      }
      this.render();
    }
  }
  
  private render(notesParam?: Array<{ id: string; lane: number; time: number; type: 'tap' | 'hold'; duration?: number }>) {
    const mountPoint = this.shadowRoot?.getElementById('root');
    if (!mountPoint) return;
    
    // Get attributes
    const bpm = parseInt(this.getAttribute('bpm') || '120', 10);
    const snapEnabled = this.getAttribute('snap-enabled') !== 'false';
    const snapDivision = parseInt(this.getAttribute('snap-division') || '4', 10);
    const offsetMs = parseInt(this.getAttribute('offset-ms') || '0', 10);
    const zoom = parseInt(this.getAttribute('zoom') || '100', 10);
    const duration = parseInt(this.getAttribute('duration') || '300', 10);
    
    // Update viewport zoom and duration
    this.viewport.setZoom(zoom / 100);
    this.viewport.setDuration(duration * 1000);
    
    // Use passed notes, internal notes, or empty array
    const notes = notesParam ?? this._notes;
    
    // Create React element
    const element = React.createElement(BeatmapEditor, {
      duration,
      currentTime: 0,
      notes,
      onNotesChange: (notesOrUpdater) => {
        // Handle functional updater form
        const newNotes = typeof notesOrUpdater === 'function' 
          ? notesOrUpdater(this._notes) 
          : notesOrUpdater;
        // Update internal state
        this._notes = newNotes;
        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('noteschange', {
          detail: { notes: newNotes },
          bubbles: true,
          composed: true
        }));
      },
      bpm,
      snapEnabled,
      snapDivision,
      offsetMs,
      viewport: this.viewport,
      className: 'w-full'
    });
    
    if (!this.root) {
      this.root = ReactDOM.createRoot(mountPoint);
    }
    
    this.root.render(element);
  }
  
  // Public API methods
  public exportBeatmap() {
    // Return serialized internal notes
    return JSON.stringify(this._notes);
  }
  
  public importBeatmap(json: string) {
    try {
      // Parse and validate JSON first
      this._notes = JSON.parse(json);
      // Set attribute with normalized JSON (triggers attributeChangedCallback → render)
      this.setAttribute('notes', JSON.stringify(this._notes));
    } catch {
      // Invalid JSON - reject early, don't set attribute
      this._notes = [];
      console.error('importBeatmap: Invalid JSON provided');
    }
  }
}

// Register the custom element
customElements.define('beatmap-editor', BeatmapEditorElement);

export { BeatmapEditorElement };

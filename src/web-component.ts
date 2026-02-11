/**
 * Beatmap Editor Web Component
 * Embeddable microfrontend for beatmap editing
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import BeatmapEditor from './components/BeatmapEditor';
import { TimelineViewport } from './utils/TimelineViewport';

// Define the web component
class BeatmapEditorElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private viewport: TimelineViewport;
  
  // Observed attributes
  static get observedAttributes() {
    return ['bpm', 'snap-enabled', 'snap-division', 'offset-ms', 'zoom'];
  }
  
  constructor() {
    super();
    this.viewport = new TimelineViewport(0, 800);
    
    // Create shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
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
      /* Tailwind CDN fallback */
      @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
    `;
    shadow.appendChild(style);
    
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
  
  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.render();
    }
  }
  
  private render() {
    const mountPoint = this.shadowRoot?.getElementById('root');
    if (!mountPoint) return;
    
    // Get attributes
    const bpm = parseInt(this.getAttribute('bpm') || '120', 10);
    const snapEnabled = this.getAttribute('snap-enabled') !== 'false';
    const snapDivision = parseInt(this.getAttribute('snap-division') || '4', 10);
    const offsetMs = parseInt(this.getAttribute('offset-ms') || '0', 10);
    const zoom = parseInt(this.getAttribute('zoom') || '100', 10);
    
    // Update viewport zoom
    this.viewport.setZoom(zoom / 100);
    
    // Create React element
    const element = React.createElement(BeatmapEditor, {
      duration: 300,
      currentTime: 0,
      notes: [],
      onNotesChange: (notes) => {
        // Dispatch custom event
        this.dispatchEvent(new CustomEvent('noteschange', {
          detail: { notes },
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
    // Return current notes
    return this.getAttribute('notes') || '[]';
  }
  
  public importBeatmap(json: string) {
    this.setAttribute('notes', json);
    this.render();
  }
}

// Register the custom element
customElements.define('beatmap-editor', BeatmapEditorElement);

export { BeatmapEditorElement };

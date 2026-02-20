# 🎵 Beatmap Editor - Microfrontend Setup

This guide explains how to deploy the beatmap editor as a microfrontend on GitHub Pages.

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Host Application                        │
│  (Any website, React, Vue, vanilla HTML, etc.)          │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │     <beatmap-editor> Web Component              │   │
│  │     Loaded from GitHub Pages                    │   │
│  │     (Independent deployment)                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Deployment Steps

### 1. Create GitHub Repository

Create a new repository (e.g., `beatmap-editor`) on GitHub.

### 2. Push Code

```bash
# Initialize repo (if not already)
git init
git remote add origin https://github.com/YOUR_USERNAME/beatmap-editor.git

# Commit and push
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Source: **GitHub Actions**
3. The workflow file (`.github/workflows/deploy.yml`) is already configured

### 4. Deploy

Push to main branch triggers automatic deployment:

```bash
git push origin main
```

Or manually trigger from **Actions** tab → **Deploy to GitHub Pages**.

## 📖 Usage in Host Applications

### Option A: HTML/Vanilla JS

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Load React (peer dependencies) -->
  <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
</head>
<body>
  <!-- Use the web component -->
  <beatmap-editor 
    id="my-editor"
    bpm="120"
    snap-enabled="true"
    snap-division="4"
    offset-ms="0"
    zoom="100">
  </beatmap-editor>

  <!-- Load the microfrontend -->
  <script type="module">
    import('https://YOUR_USERNAME.github.io/beatmap-editor/beatmap-editor.es.js');
  </script>

  <script>
    // Listen for note changes
    document.addEventListener('noteschange', (e) => {
      console.log('Notes:', e.detail.notes);
    });

    // Get reference to editor
    const editor = document.getElementById('my-editor');
    
    // Change properties programmatically
    editor.setAttribute('bpm', '140');
    editor.setAttribute('offset-ms', '250');
    
    // Export notes
    const notes = editor.exportBeatmap();
  </script>
</body>
</html>
```

### Option B: React Application

```jsx
import { useEffect, useRef } from 'react';

function App() {
  const editorRef = useRef(null);

  useEffect(() => {
    // Load the web component script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://YOUR_USERNAME.github.io/beatmap-editor/beatmap-editor.es.js';
    document.head.appendChild(script);

    // Listen for changes
    const handleNotesChange = (e) => {
      console.log('Notes changed:', e.detail.notes);
    };
    document.addEventListener('noteschange', handleNotesChange);

    return () => {
      document.removeEventListener('noteschange', handleNotesChange);
    };
  }, []);

  const handleExport = () => {
    if (editorRef.current) {
      const notes = editorRef.current.exportBeatmap();
      console.log(JSON.parse(notes));
    }
  };

  return (
    <div>
      <h1>My Rhythm Game Editor</h1>
      
      {/* Embed the beatmap editor */}
      <beatmap-editor 
        ref={editorRef}
        bpm="120"
        snap-enabled="true"
        snap-division="4"
        offset-ms="0"
        style={{ height: '500px', display: 'block' }}
      />
      
      <button onClick={handleExport}>Export Beatmap</button>
    </div>
  );
}
```

### Option C: iframe (Simplest)

```html
<iframe 
  src="https://YOUR_USERNAME.github.io/beatmap-editor/demo.html"
  width="100%"
  height="600px"
  style="border: none;">
</iframe>
```

## ⚙️ Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `bpm` | number | 120 | Beats per minute |
| `snap-enabled` | boolean | true | Enable grid snapping |
| `snap-division` | number | 4 | Snap divisions (1, 2, 4, 8, 16, 32) |
| `offset-ms` | number | 0 | Grid offset in milliseconds |
| `zoom` | number | 100 | Zoom percentage |

## 📝 Notes

- The web component only includes the `BeatmapEditor` component
- For `Waveform`, `AudioScrubber`, and full feature set, use the React library instead:
  ```bash
  npm install github:gamewota/beatmap-editor
  ```
- See [Integration Guide](./INTEGRATION.md) for React component usage

## 📡 Events

| Event | Detail | Description |
|-------|--------|-------------|
| `noteschange` | `{ notes: Note[] }` | Fired when notes are added/deleted |

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Build for production
npm run build

# Build as library (for microfrontend)
npm run build:lib
```

## 📁 Build Outputs

After building as library (`npm run build:lib`):

```
dist/
├── beatmap-editor.es.js      # ES Module (modern browsers)
├── beatmap-editor.umd.js     # UMD Module (legacy support)
└── demo.html                 # Standalone demo page
```

## 🔗 Demo

Live demo: `https://YOUR_USERNAME.github.io/beatmap-editor/demo.html`

## 📝 Notes

- The editor requires React and ReactDOM as peer dependencies
- Tailwind CSS is included in the build
- Audio file loading is handled by the host application
- The web component is framework-agnostic (works with any frontend)

## 🐛 Troubleshooting

**CORS issues**: Ensure the host and microfrontend are on HTTPS.

**Component not loading**: Check that React/ReactDOM are loaded before the web component script.

**Styles not applying**: The web component uses Shadow DOM - styles are isolated.

## 📄 License

MIT License - Feel free to use in your rhythm games!

# 📚 Beatmap Editor - Library Development Guide

This guide is for developers who want to build, modify, or publish the Beatmap Editor library.

## 🏗️ Architecture

```
src/
├── components/
│   ├── BeatmapEditor.tsx    # Main React component
│   ├── AudioScrubber.tsx    # Audio timeline scrubber
│   ├── Waveform.tsx         # Audio waveform display
│   └── ...                  # UI components
├── utils/
│   ├── TimelineRenderer.ts  # Canvas rendering logic
│   ├── TimelineViewport.ts  # Viewport/zoom management
│   └── SfxManager.ts        # Sound effects
├── index.ts                 # Library entry point
├── web-component.ts         # Web component wrapper (optional)
└── index.css                # Styles (Tailwind)
```

## 📦 Building the Library

### Development Mode

```bash
# Start dev server with demo app
npm run dev

# Open http://localhost:5173 to see the demo
```

### Build React Component Library

```bash
# Build the library
npm run build:lib

# Output in dist/
# - beatmap-editor.js       (ES module)
# - beatmap-editor.umd.cjs  (UMD for legacy)
# - index.d.ts              (TypeScript types)
# - style.css               (Compiled CSS)
```

### Build Web Component (Microfrontend)

```bash
# Build as web component
npm run build:wc

# Output: beatmap-editor-wc.js
```

### Build Demo App

```bash
# Build the demo app
npm run build

# Output in dist/ as a static website
```

## 🚀 Publishing

### Automated Deployment (GitHub Actions)

The repository includes GitHub Actions workflows for automated deployment:

#### On Every Push to Main/Master:
- **Demo App**: Automatically deployed to GitHub Pages
- **Library Files**: Saved as build artifacts

#### On Version Tags (v*):
- Creates a GitHub Release with library files attached
- Demo app is updated on GitHub Pages

### Manual Publishing

#### Option 1: GitHub Registry (Recommended for internal use)

```bash
# 1. Build
npm run build:lib

# 2. Commit and tag
 git add .
 git commit -m "Build v1.0.0"
 git tag v1.0.0
 git push origin v1.0.0

# 3. Install in your project
npm install github:gamewota/beatmap-editor#v1.0.0
```

#### Option 2: NPM Registry (for public use)

```bash
# 1. Login to NPM
npm login

# 2. Build
npm run build:lib

# 3. Publish
npm publish --access public
```

### Setting Up NPM Automation (Optional)

To enable automatic NPM publishing on releases:

1. Get your NPM access token from https://www.npmjs.com/settings/tokens
2. Add it to your GitHub repository secrets as `NPM_TOKEN`
3. The `publish.yml` workflow will automatically publish on new releases

## 🧪 Testing Locally

### Link for Local Development

```bash
# In the beatmap-editor repo
npm link

# In your dashboard repo
npm link @gamewota/beatmap-editor

# Now changes in beatmap-editor are reflected immediately
```

### Pack for Testing

```bash
# In beatmap-editor
npm run build:lib
npm pack

# Copy the .tgz file to your dashboard
npm install ./gamewota-beatmap-editor-1.0.0.tgz
```

## 🔧 Customization

### Styling

The component uses Tailwind CSS. You can customize by:

1. **Override with CSS classes:**
   ```tsx
   <BeatmapEditor className="my-custom-class" />
   ```

2. **Modify Tailwind config:**
   ```js
   // tailwind.config.js
   module.exports = {
     content: [
       './src/**/*.{js,ts,jsx,tsx}',
       './node_modules/@gamewota/beatmap-editor/dist/**/*.{js,ts,jsx,tsx}'
     ]
   }
   ```

### Extending the API

To add new features, modify `BeatmapEditorProps` in `src/components/BeatmapEditor.tsx`:

```typescript
export interface BeatmapEditorProps {
  // ... existing props
  
  // New prop
  customGridColor?: string
  onNoteSelect?: (note: Note) => void
}
```

## 📋 Component API Design

### Design Principles

1. **Controlled Component**: Parent controls all data
2. **Pure Editor**: No API calls, all data via props and callbacks
3. **Flexible**: Parent decides how to handle persistence
4. **TypeScript First**: Full type safety

### Props Decision Matrix

| Prop | Required? | Rationale |
|------|-----------|-----------|
| `song` | ✅ Yes | Must have song data (title, BPM, audio, duration) |
| `notes` | ❌ No | Can start empty for new beatmaps |
| `onNotesChange` | ❌ No | Optional - parent handles saving |
| `snapEnabled` | ❌ No | Sensible default (true) |
| `snapDivision` | ❌ No | Sensible default (4) |
| `offsetMs` | ❌ No | Sensible default (0) |

## 🔌 Data Flow

The editor is a controlled component:

```typescript
// Parent app provides song data
const song = {
  id: '123',
  title: 'My Song',
  bpm: 128,
  duration: 180,
  audioUrl: '/audio.mp3'
}

// Parent app handles persistence
<BeatmapEditor
  song={song}
  notes={notes}
  onNotesChange={(newNotes) => saveDraft(newNotes)}
/>
```

## 🎨 Code Style

### Naming Conventions

- **Components**: PascalCase (`BeatmapEditor`)
- **Props**: camelCase (`initialNotes`, `onNotesChange`)
- **Types/Interfaces**: PascalCase (`BeatmapEditorProps`)
- **Functions**: camelCase (`handlePublish`)
- **Constants**: UPPER_SNAKE_CASE (`LANE_HEIGHT`)

## 🚀 Future Enhancements

Potential features for future versions:

- [ ] Undo/Redo functionality
- [ ] Copy/Paste notes
- [ ] Multiple selection
- [ ] Zoom controls UI
- [ ] Import/export JSON files
- [ ] Difficulty calculator
- [ ] Preview mode

## 📄 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to check for issues
5. Submit a pull request

## 📞 Support

- GitHub Issues: https://github.com/gamewota/beatmap-editor/issues
- Documentation: https://github.com/gamewota/beatmap-editor/blob/main/INTEGRATION.md

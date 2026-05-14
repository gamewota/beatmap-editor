# Web Component / Microfrontend

`@gamewota/beatmap-editor` also ships as a framework-agnostic Web Component (`<beatmap-editor>`). Use it when your host app isn't React, when you want to embed the editor cross-team without bundling React into every app, or when you want a single hosted version pinned to a URL.

The component still needs React and ReactDOM available — they're declared as peer dependencies on the underlying bundle.

## Loading the component

### Option 1: npm bundle

```bash
npm install @gamewota/beatmap-editor
```

```ts
import '@gamewota/beatmap-editor/dist/beatmap-editor-wc.js'
// <beatmap-editor> is now registered on window.customElements
```

You'll need to ship React + ReactDOM in the host page (they're external in this bundle).

### Option 2: From GitHub Pages (hosted)

The demo deploy at https://gamewota.github.io/beatmap-editor/ also serves the web-component bundle. Load it via `<script type="module">`:

```html
<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
<script type="module"
  src="https://gamewota.github.io/beatmap-editor/assets/beatmap-editor-wc.js">
</script>
```

(File names on the Pages deploy include a hash — link from the live site's network panel for the current asset URL, or build locally and host the bundle yourself.)

## Usage

```html
<beatmap-editor
  bpm="175"
  offset-ms="670"
  snap-division="8"
  zoom="100"
  duration="180"
  notes='[]'
></beatmap-editor>
```

Then in JS:

```js
const editor = document.querySelector('beatmap-editor')

// React to user edits
editor.addEventListener('noteschange', (e) => {
  console.log('notes:', e.detail.notes)
})

// Read current notes
const json = editor.exportBeatmap()         // returns a JSON string
const notes = JSON.parse(json)

// Replace the notes
editor.importBeatmap(JSON.stringify([
  { id: 'n1', lane: 0, time: 0.67, type: 'tap' },
  { id: 'n2', lane: 3, time: 2.04, type: 'tap' },
]))

// Or update attributes
editor.setAttribute('bpm', '128')
editor.setAttribute('snap-division', '4')
```

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `bpm` | int | `120` | Beats per minute |
| `offset-ms` | int | `0` | Milliseconds before the first beat |
| `snap-division` | int | `4` | `1`, `2`, `4`, `8`, or `16` — divides the whole note |
| `zoom` | int | `100` | Zoom percentage (25–100 in the demo UI) |
| `duration` | int | `300` | Audio length in seconds |
| `notes` | JSON | `[]` | Internal `Note[]` array (the React shape — `{ id, lane, time, type, duration? }`); not the export schema |

> The web component's internal `notes` attribute uses the React `Note` shape (time in seconds). If you want the export schema, call `editor.exportBeatmap()` and convert externally, or use the React component directly.

## Events

| Event | `detail` | When it fires |
|---|---|---|
| `noteschange` | `{ notes: Note[] }` | User added or deleted a note. The event bubbles and crosses the shadow boundary. |

## Methods

| Method | Returns | Notes |
|---|---|---|
| `exportBeatmap()` | `string` (JSON of `Note[]`) | Same shape as the `notes` attribute. |
| `importBeatmap(json: string)` | `void` | Replaces internal notes; invalid JSON is logged and ignored. |

## Framework examples

### React host

```jsx
import { useEffect, useRef } from 'react'

// Tell React this is a custom element with these props
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'beatmap-editor': any
    }
  }
}

export function Editor() {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => console.log(e.detail.notes)
    const el = ref.current
    el?.addEventListener('noteschange', handler)
    return () => el?.removeEventListener('noteschange', handler)
  }, [])

  return (
    <beatmap-editor
      ref={ref}
      bpm="128"
      offset-ms="0"
      snap-division="8"
      duration="180"
    />
  )
}
```

### Vue host

```vue
<template>
  <beatmap-editor
    bpm="128"
    snap-division="8"
    offset-ms="0"
    duration="180"
    @noteschange="onChange"
  />
</template>

<script setup>
const onChange = (e) => console.log(e.detail.notes)
</script>
```

You'll need to mark `beatmap-editor` as a custom element in your Vue config (`compilerOptions.isCustomElement`).

### Vanilla HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@19/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@19/umd/react-dom.production.min.js"></script>
</head>
<body>
  <beatmap-editor id="editor" bpm="128" duration="180" snap-division="8"></beatmap-editor>

  <button id="export">Export</button>

  <script type="module">
    import 'https://gamewota.github.io/beatmap-editor/assets/beatmap-editor-wc.js'

    const editor = document.getElementById('editor')
    editor.addEventListener('noteschange', e => console.log(e.detail.notes))

    document.getElementById('export').onclick = () => {
      const json = editor.exportBeatmap()
      console.log(JSON.parse(json))
    }
  </script>
</body>
</html>
```

## Styling

The component renders inside an open Shadow DOM. The library's compiled Tailwind stylesheet is injected at construction time, so the editor's own styles work without configuration.

Styling the **outside** of the element is unaffected — you can size or position it like any HTML element:

```css
beatmap-editor {
  display: block;
  height: 500px;
  border: 1px solid #ddd;
}
```

To restyle the editor's internals you'd need to fork the source — Shadow DOM intentionally isolates it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Browser warns about unknown element | Forgot to load the web-component script, or it loaded before React. |
| Editor renders but is blank | `duration` is `0` or `bpm` is `0`. Set both via attributes. |
| `noteschange` not firing in React | React 19 dispatches custom events fine, but earlier React versions need `addEventListener` (used above) rather than `onNoteschange={...}`. |
| Build error: `Cannot find name 'beatmap-editor'` in JSX | Add the global `JSX.IntrinsicElements` declaration shown in the React example. |
| `exportBeatmap()` returns React-shape JSON, not the schema | That method returns the internal `Note[]`. Convert to the schema externally — see [INTEGRATION.md → Beatmap JSON schema](./INTEGRATION.md#beatmap-json-schema). |

## License

MIT

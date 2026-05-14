# Library Development

How to build, test, release, and contribute to the editor.

## Layout

```
src/
├── components/
│   ├── BeatmapEditor.tsx     # Main editor — grid, notes, ghost note, click handling
│   ├── Waveform.tsx          # Canvas waveform renderer
│   ├── AudioScrubber.tsx     # Fixed-width seek bar
│   ├── TimelineScrubber.tsx  # Timeline-aligned seek bar
│   ├── Button.tsx, Icon.tsx, Slider.tsx, Title.tsx
├── utils/
│   ├── TimelineViewport.ts   # Single source of truth for zoom + scroll
│   ├── TimelineRenderer.ts   # Dual-canvas (static + dynamic) drawing
│   ├── SfxManager.ts         # Web Audio SFX playback
│   └── bpmDetection.ts       # detectBPM(audioBuffer)
├── index.ts                  # Library entry — public exports
├── web-component.ts          # <beatmap-editor> custom element wrapper
├── App.tsx, main.tsx         # Demo app (not part of the published lib)
└── index.css, style.css      # Tailwind sources
```

## Scripts

```bash
npm run dev          # Vite dev server for the demo (http://localhost:5173)
npm run build        # Demo app → dist/ (used by the Pages deploy)
npm run build:lib    # Library bundle → dist/beatmap-editor.{js,umd.cjs} + index.d.ts + style.css
npm run build:wc     # Web Component bundle → dist/beatmap-editor-wc.{js,umd.cjs}
npm run lint         # ESLint
```

`tsc -b` runs first as part of `build` and `build:lib` so type errors fail the build.

## Local consumer testing

You have three options depending on how realistic you want the test to be.

### Linking

```bash
# in this repo
npm run build:lib
npm link

# in the consumer repo
npm link @gamewota/beatmap-editor
```

Rebuild the library each time you change source.

### Packing (closest to real npm install)

```bash
npm run build:lib
npm pack                                  # → gamewota-beatmap-editor-1.1.0.tgz
cd ../consumer-repo
npm install ../beatmap-editor/gamewota-beatmap-editor-1.1.0.tgz
```

### Installing the GitHub-tagged version

```bash
# in the consumer repo
npm install github:gamewota/beatmap-editor#v1.1.0
```

This installs the source repo and runs `prepare` → `npm run build:lib`, so it works without a published npm release.

## Release flow

The repo is wired so each `v*` tag pushes a release to GitHub *and* publishes to npm in one go.

### One-time setup

- **GitHub Pages**: Settings → Pages → Source = **GitHub Actions** (already configured)
- **npm scope**: the `@gamewota` org must exist at https://www.npmjs.com/org/gamewota and your npm account must have publish rights to it
- **`NPM_TOKEN` secret**: Settings → Secrets and variables → Actions → `NPM_TOKEN`
  - Must be a **Classic Automation** token, or a **Granular Access Token with "Allow this token to bypass 2FA" enabled**
  - Classic "Publish" tokens won't work in CI — they prompt for an OTP

### Cutting a release

```bash
# 1. update version
# edit package.json: "version": "1.2.0"

# 2. commit + push main → triggers Pages deploy
git commit -am "release v1.2.0"
git push origin main

# 3. tag + push tag → triggers GitHub release + npm publish
git tag v1.2.0
git push origin v1.2.0
```

What happens behind the scenes:

| Trigger | Workflow | Effect |
|---|---|---|
| push to `main` | `deploy.yml` → `build` + `deploy-pages` | Demo site at https://gamewota.github.io/beatmap-editor/ |
| push tag `v*`  | `deploy.yml` → `build` + `release` + `publish-npm` | GitHub release + `npm publish` |

`deploy-pages` is gated on `if: github.ref_type != 'tag'` so the tag push doesn't fight with the matching branch push for the Pages environment.

### Manual fallback

If a publish needs to be re-run without bumping the version (e.g., transient registry error):

```bash
gh workflow run publish.yml --repo gamewota/beatmap-editor --ref main
```

### After a successful release

Verify:

- `npm view @gamewota/beatmap-editor version` → matches the new tag
- https://gamewota.github.io/beatmap-editor/ → loads with the new code
- https://github.com/gamewota/beatmap-editor/releases → release attached with `beatmap-editor.js` and `beatmap-editor.umd.cjs`

## Architecture notes

### Single TimelineViewport

`TimelineViewport` owns `pixelsPerMs`, `viewportStartMs`, and `durationMs`. Everything else (waveform, grid, playhead, ghost note, scroll position) derives from it via subscribers. The same instance is shared between `Waveform` and `BeatmapEditor` so they can never drift out of sync.

### Dual-canvas rendering

`TimelineRenderer` writes to two stacked canvases:

- **Static canvas** — beat grid, lane dividers, placed notes. Repaints only when zoom, duration, container size, BPM, snap, offset, or notes change.
- **Dynamic canvas** — playhead, ghost note, snap-target highlight. Cleared and redrawn every animation frame, but only over the visible viewport rectangle.

Pure scroll events don't trigger a static repaint — the full-width static canvas scrolls natively inside its container. Grid line strokes are batched by tier (measure / beat / sub-beat) so a 5-minute song at 175 BPM with 1/16 snap is three `stroke()` calls per repaint instead of thousands.

### Snap math

The snap denominator divides the **whole note** (4 beats in 4/4), matching standard music notation:

```
beatDurationMs   = 60_000 / bpm
wholeDurationMs  = 4 * beatDurationMs
snapIntervalMs   = wholeDurationMs / snapDivision
```

A drawn line at index `i` is:

- a **measure** boundary if `i % snapDivision === 0`
- a **beat** boundary if `(i * 4) % snapDivision === 0` (and not a measure)
- a **sub-beat** otherwise

The same formula is used in the click handler (so placement always lands on a visible grid line) and in `TimelineRenderer.getGridAlignedX` (so rendered notes always sit on the grid even if they were imported from an unsnapped source).

## Style

- Components: PascalCase
- Props / functions: camelCase
- Types / interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE

No tests yet. Lint must pass (`npm run lint`).

## Contributing

1. Branch off `main`
2. Make the change; run `npm run lint` and `npm run build`
3. Open a PR — CI will run the build on push

For non-trivial changes, please describe the user-facing behavior in the PR description and (if relevant) update the schema docs in `INTEGRATION.md`.

## License

MIT

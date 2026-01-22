# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

chartForge - Web app to create, display, and export Nashville Number System chord charts (MultiTracks.com style).

## Commands

- `npm run build` - Compile TypeScript to dist/
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode

## Architecture

### Source Structure

```
src/
  index.ts              - Main exports
  types.ts              - Core type definitions (Song, Section, Chord, etc.)
  parser.ts             - Format detection, parsing dispatch
  chordProParser.ts     - ChordPro format parser
  simpleTextParser.ts   - Simple text format parser
  chordUtils.ts         - Chord manipulation utilities

  renderer/
    index.ts            - Renderer exports
    types.ts            - Render config, layout types
    ChartRenderer.ts    - Main renderer class
    layout.ts           - Page/column layout calculations

    components/
      index.ts          - Component exports
      HeaderRenderer.ts - Title, artist, metadata, page number
      RoadmapRenderer.ts- Section sequence badges
      SectionRenderer.ts- Section blocks with badges and rules
      ChordRenderer.ts  - Chord formatting (root + quality)
```

### Data Flow

1. **Parse**: Input text -> `parse()` -> `Song` object
2. **Layout**: `Song` -> `calculateLayout()` -> `LayoutResult` (page breaks, columns)
3. **Render**: `ChartRenderer.renderPage(canvas, pageIndex)` -> Canvas output

### Key Types

- `Song` - Complete song with metadata and sections
- `Section` - Verse, chorus, etc. with lines and dynamics
- `Line` - Lyrics with positioned chords
- `Chord` - Root, quality, bass note
- `RenderConfig` - Fonts, colors, spacing, page dimensions
- `LayoutResult` - Calculated section positions across pages

## Documentation

- `docs/ARCHITECTURE.md` - Data model, tech stack, rendering pipeline
- `docs/CHART_FORMAT.md` - Page layout, chord notation, visual structure
- `docs/CHORD_THEORY.md` - Semitone-based chord building/identification
- `docs/SECTION_TYPES.md` - Section ID reference (Intro, Verse, Chorus, etc.)
- `docs/DEVELOPMENT.md` - Setup, commands, workflow
- `docs/ROADMAP.md` - Feature phases and planning

## Reference

- `REF/Charts/` - Sample PDF exports from MultiTracks ChartBuilder
- `REF/MT ChartBuilder/` - Extracted iOS app (fonts, assets, reverse-engineering reference)
- `demo/index.html` - Interactive renderer demo (open in browser)

## Key Fonts

Lato (Bold/Regular/Light) for text, `chartbuilder.ttf` for section icons.

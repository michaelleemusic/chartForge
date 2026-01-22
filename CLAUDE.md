# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

chartForge - Web app to create, display, and export Nashville Number System chord charts (MultiTracks.com style).

**Primary Repository**: https://github.com/michaelleemusic/chartForge
**Auth Method**: SSH keys (all local dev computers have SSH key access)

## Commands

- `npm run build` - Compile TypeScript to dist/
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `php -S localhost:3000 demo/index.php` - Run local dev server (PHP)
- `node demo/server.js` - Run local dev server (Node.js)

## Deployment - Production Server

**Live URL**: https://proflee.me/chartforge/
**Server**: DreamHost (pdx1-shared-a1-17.dreamhost.com)
**SSH User**: proflee_me
**Web Root**: ~/proflee.me/chartforge/

### SSH Setup (one-time per machine)

1. Generate a dedicated key:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/dreamhost_proflee -N "" -C "proflee.me-deploy"
   ```

2. Add to ~/.ssh/config:
   ```
   Host dreamhost-proflee
       HostName pdx1-shared-a1-17.dreamhost.com
       User proflee_me
       IdentityFile ~/.ssh/dreamhost_proflee
       IdentitiesOnly yes
   ```

3. Add public key to DreamHost:
   - Panel → Websites → SFTP Users & Files → proflee_me → SSH Keys
   - Or use `ssh-copy-id -i ~/.ssh/dreamhost_proflee.pub proflee_me@pdx1-shared-a1-17.dreamhost.com`

4. Test: `ssh dreamhost-proflee "echo connected"`

### Deploy to Production

```bash
# Sync project to production (excludes dev files)
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.wav' \
  --exclude='REF' \
  --exclude='library/trash' \
  ./ dreamhost-proflee:~/proflee.me/chartforge/
```

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

## Library

```
library/
  *.txt                 - 677 chord charts in Nashville Number format
  index.json            - Song index (title, artist, key, path)
```

## Scripts

```
scripts/
  build_index.py        - Rebuild library/index.json after adding songs
  convert_onsong.py     - Convert OnSong files to ChordPro format
  convert_to_numbers.py - Convert letter chords to Nashville Numbers
```

## Web Interface

```
demo/
  index.html    - Main web interface (side-by-side editor + preview)
  index.php     - PHP backend for library management (DreamHost compatible)
  server.js     - Node.js backend alternative
```

Features:
- Side-by-side editor with live preview
- Library search (677 charts)
- Library management (new, update, delete)
- Key transposition (Numbers ↔ any key)
- PDF export (single or Full Set ZIP with all keys)
- Unicode accidentals (♭ and ♯)

## Reference

- `REF/Charts/` - Sample PDF exports from MultiTracks ChartBuilder
- `REF/MT ChartBuilder/` - Extracted iOS app (fonts, assets, reverse-engineering reference)

## Key Fonts

Lato (Bold/Regular/Light) for text, `chartbuilder.ttf` for section icons.

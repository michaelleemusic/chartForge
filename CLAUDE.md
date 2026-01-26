# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

chartForge - Chart builder web-app for worship-style music.

**Primary Repository**: git@github.com:michaelleemusic/chartForge.git
**Auth Method**: SSH keys (all dev machines have SSH key access to GitHub and production server)

### SSH Keys
Before git push or rsync to production, ensure keys are loaded:
```bash
ssh-add ~/.ssh/dreamhost_proflee  # For production deployment
```

## Commands

- `npm run build` - Compile TypeScript to dist/
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `node web/server.js` - Run local dev server at http://localhost:3000

## Deployment - Production Server

**Live URL**: https://proflee.me/chartforge/
**Server**: DreamHost (pdx1-shared-a1-17.dreamhost.com)
**SSH User**: proflee_me
**Web Root**: ~/proflee.me/chartforge/

### Library Access Tiers

- **Public**: `library/pd/` (public domain hymns) - visible to all visitors
- **Full**: All 680+ songs - requires email authentication via `/ml` gateway

### Deploy to Production

```bash
# Step 1: Sync app (includes pd/ public domain songs, excludes main library)
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.wav' \
  --exclude='REF' \
  --exclude='library/trash' \
  --exclude='library/*.txt' \
  --exclude='library/index.json' \
  --include='library/pd/' \
  --include='library/pd/*.txt' \
  ./ proflee_me@pdx1-shared-a1-17.dreamhost.com:~/proflee.me/chartforge/

# Step 1b: Remove any accidental .htaccess in web/ (causes 500 error)
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "rm -f ~/proflee.me/chartforge/web/.htaccess"

# Step 2: Upload full library for authenticated users
rsync -avz library/*.txt proflee_me@pdx1-shared-a1-17.dreamhost.com:~/proflee.me/chartforge/library/

# Step 3: Fix permissions
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "chmod -R 755 ~/proflee.me/chartforge/ && find ~/proflee.me/chartforge/ -type f -exec chmod 644 {} \;"

# Step 4: Rebuild library index on server
curl -X POST https://proflee.me/chartforge/api/rebuild-index
```

### URL Structure

- **App URL**: https://proflee.me/chartforge/ (served via .htaccess rewrite to web/index.html)
- **Auth Gateway**: https://proflee.me/chartforge/ml (email verification for full library)
- **API Endpoints**: /api/library, /api/auth, /api/auth/status routed to web/index.php

## Project Structure

```
chartForge/
├── web/                    # Web application (main deliverable)
│   ├── index.html          # HTML structure (~100 lines)
│   ├── styles.css          # All CSS styles
│   ├── app.js              # All JavaScript (~1900 lines)
│   ├── index.php           # PHP backend (DreamHost)
│   └── server.js           # Node.js backend (local dev)
├── src/                    # TypeScript utilities
│   ├── types.ts            # Core type definitions
│   ├── parser.ts           # Format detection, parsing
│   ├── chordUtils.ts       # Chord manipulation
│   └── *.test.ts           # Unit tests (94 tests)
├── library/                # Song library (680 local, public per .deployinclude)
│   ├── *.txt               # Chart files in ChordPro format
│   └── index.json          # Searchable index
├── scripts/                # Build utilities
│   ├── build_index.py      # Rebuild library/index.json
│   ├── convert_onsong.py   # Convert OnSong files
│   └── convert_to_numbers.py
├── docs/                   # Documentation
├── .htaccess               # Apache routing for production
└── .deployinclude          # Songs to upload to production
```

## Key Features

- **Side-by-side editor**: Live preview as you type
- **Library search**: Searchable chart library (680 local dev, limited public)
- **Display modes**: Full, Chords-only, Lyrics-only
- **Key transposition**: Render in any key or Nashville Numbers
- **PDF export**: Single PDF or Full Set (27 PDFs: 13 keys × 2 modes + lyrics)
- **Unicode accidentals**: ♭ and ♯ display

## Documentation

- `docs/ARCHITECTURE.md` - Data model, tech stack
- `docs/CHART_FORMAT.md` - Page layout, chord notation
- `docs/CHORD_THEORY.md` - Semitone-based chord building
- `docs/SECTION_TYPES.md` - Section ID reference
- `docs/DEVELOPMENT.md` - Setup, commands, workflow
- `docs/ROADMAP.md` - Feature phases and planning

## Key Fonts

- **PDF Preview**: Roboto
- **Editor Pane**: Roboto
- Loaded from Google Fonts.

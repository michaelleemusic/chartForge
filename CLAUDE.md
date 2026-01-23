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

### Deploy to Production

**Library Policy**: Only songs listed in `.deployinclude` are uploaded. The full library (680+ copyrighted charts) stays local.

```bash
# Step 1: Sync app (excludes all library songs)
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.wav' \
  --exclude='REF' \
  --exclude='library/trash' \
  --exclude='library/*.txt' \
  ./ proflee_me@pdx1-shared-a1-17.dreamhost.com:~/proflee.me/chartforge/

# Step 1b: Remove any accidental .htaccess in web/ (causes 500 error)
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "rm -f ~/proflee.me/chartforge/web/.htaccess"

# Step 2: Clear server library and upload only public songs
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "rm -f ~/proflee.me/chartforge/library/*.txt"
while read -r song; do
  [[ "$song" =~ ^#.*$ || -z "$song" ]] && continue
  scp "library/$song" proflee_me@pdx1-shared-a1-17.dreamhost.com:~/proflee.me/chartforge/library/
done < .deployinclude

# Step 3: Rebuild library index on server (recursive, includes hymns/ etc)
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "cd ~/proflee.me/chartforge && php -r '\$dir=\"library\";\$idx=[];\$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator(\$dir));foreach(\$it as \$f){if(\$f->isFile()&&\$f->getExtension()===\"txt\"&&strpos(\$f->getPath(),\"trash\")===false){\$c=file_get_contents(\$f);preg_match(\"/\\{title:\\s*(.+?)\\}/i\",\$c,\$t);preg_match(\"/\\{artist:\\s*(.+?)\\}/i\",\$c,\$a);preg_match(\"/\\{key:\\s*(.+?)\\}/i\",\$c,\$k);\$rel=str_replace(\$dir.\"/\",\"\",\$f->getPathname());\$idx[]=[\"title\"=>trim(\$t[1]??basename(\$f,\".txt\")),\"artist\"=>trim(\$a[1]??\"\"),\"key\"=>trim(\$k[1]??\"\"),\"path\"=>\$rel];}}usort(\$idx,fn(\$a,\$b)=>strcasecmp(\$a[\"title\"],\$b[\"title\"]));file_put_contents(\"\$dir/index.json\",json_encode(\$idx,JSON_PRETTY_PRINT));echo count(\$idx).\" songs indexed\\n\";'"

# Step 4: Fix permissions
ssh proflee_me@pdx1-shared-a1-17.dreamhost.com "chmod -R 755 ~/proflee.me/chartforge/ && find ~/proflee.me/chartforge/ -type f -exec chmod 644 {} \;"
```

### URL Structure

- **App URL**: https://proflee.me/chartforge/ (served via .htaccess rewrite to web/index.html)
- **API Endpoints**: /api/library/* routed to web/index.php

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
- **PDF export**: Single PDF or Full Set (26 PDFs: 13 keys × 2 modes)
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

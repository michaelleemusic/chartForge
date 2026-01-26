# Development Guide

## Setup

```bash
# Clone repo
git clone git@github.com:michaelleemusic/chartForge.git
cd chartForge

# Install dependencies
npm install

# Install PHP (for local server with library management)
brew install php

# Install Python dependencies (for PDF import)
pip3 install -r requirements.txt
```

## Running Locally

### Option 1: PHP Server (recommended - full features)
```bash
php -S localhost:3000 web/index.php
```
Supports: viewing, editing, library management (save/update/delete), PDF export

### Option 2: Node.js Server
```bash
node web/server.js
```
Same features as PHP server

### Option 3: Static Server (read-only)
```bash
npx http-server . -p 3000 -c-1
```
View and export only, no library management

Open http://localhost:3000 in browser.

## Project Structure

```
chartForge/
├── web/                    # Web application
│   ├── index.html          # Main web interface
│   ├── index.php           # PHP backend (DreamHost)
│   └── server.js           # Node.js backend
├── src/                    # TypeScript utilities
│   ├── types.ts            # Core type definitions
│   ├── parser.ts           # Format detection, parsing
│   └── chordUtils.ts       # Chord manipulation
├── library/                # Song library (680 charts, local only)
│   ├── *.txt               # Chart files
│   └── index.json          # Searchable index
├── scripts/                # Build utilities
└── docs/                   # Documentation
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to dist/ |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `python3 scripts/build_index.py` | Rebuild library index |
| `python3 scripts/convert_pdf.py <pdf>` | Convert PDF to ChordPro |
| `python3 scripts/convert_pdf.py <dir>` | Batch convert PDFs |

## Workflow

1. Create feature branch from `main`
2. Make changes, write tests
3. Run lint and tests locally
4. Commit with descriptive message
5. Push and create PR

## Commit Messages

Format: `<type>: <description>`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

Example: `feat: add chord parser for ChordPro format`

## Deployment

### Library Access Tiers

The library has two access levels controlled by server-side authentication:

- **Public**: `library/pd/` contains public domain hymns visible to all visitors
- **Full**: All 680+ songs visible after email authentication via `/ml` gateway

### Deploy Commands

See `CLAUDE.md` for full deployment instructions. Key points:

1. rsync syncs app code and `library/pd/` public domain songs
2. Full library uploaded separately for authenticated users
3. Server-side PHP filters library index based on auth state
4. API endpoints protected: save/update/delete require authentication

### Adding Public Domain Songs

To add a song to the public library:
1. Place the .txt file in `library/pd/`
2. Deploy to production
3. Run `curl -X POST https://proflee.me/chartforge/api/rebuild-index`

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

### Library Policy

The full song library (680+ charts) is kept in the repository for local development but **not deployed to production**. Only songs listed in `.deployinclude` are uploaded to the public site.

**Why?** Most library songs are copyrighted worship songs used for personal/church reference. The public demo site only includes original test songs.

### Deploy Commands

See `CLAUDE.md` for full deployment instructions. Key points:

1. rsync excludes `library/*.txt` except those in `.deployinclude`
2. Server-side PHP rebuilds `index.json` with only uploaded songs
3. The search placeholder dynamically updates to show available song count

### Adding Public Songs

To add a song to the public deployment:
1. Add the filename to `.deployinclude` (one per line)
2. Run the deploy commands from `CLAUDE.md`

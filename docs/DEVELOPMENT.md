# Development Guide

## Setup

```bash
# Clone repo
git clone git@github.com:michaelleemusic/chartForge.git
cd chartForge

# Install dependencies (once project is initialized)
npm install

# Start dev server
npm run dev
```

## Project Structure (Planned)

```
chartForge/
├── src/
│   ├── components/     # UI components
│   ├── lib/
│   │   ├── parser/     # ChordPro/text parsing
│   │   ├── model/      # Song, Section, Chord types
│   │   └── renderer/   # Canvas/PDF rendering
│   ├── styles/         # CSS
│   └── pages/          # Routes (if Next.js)
├── public/
│   └── fonts/          # Lato, icon fonts
├── docs/               # Documentation
└── tests/              # Unit tests
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint code |

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

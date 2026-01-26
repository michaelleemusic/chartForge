# Architecture

## Goals
- Web interface to build charts
- Live preview display
- PDF export matching MultiTracks style
- Library management (save, update, delete)
- Key transposition (Numbers ↔ Letter chords)

## Tech Stack
- **Frontend**: Vanilla JS with Canvas API
- **Backend**: PHP (DreamHost) or Node.js (local dev)
- **PDF Generation**: jsPDF
- **ZIP Creation**: JSZip (for Full Set export)
- **Fonts**: Lato (Google Fonts)

## Features
- **Side-by-side editor**: Live preview as you type
- **Library search**: 682 searchable charts (8 public domain, 674 authenticated)
- **Key transposition**: Render in any key or Nashville Numbers
- **PDF export**: Single PDF or Full Set (all 13 keys as ZIP)
- **Unicode accidentals**: ♭ and ♯ display
- **Section boxes**: Rounded corners, proper spacing

## Data Model

```typescript
interface Song {
  title: string;
  artist: string;
  key: Key;
  tempo: number;
  timeSignature: string;
  sections: Section[];
}

interface Section {
  type: SectionType;
  label?: string;           // Custom label override
  dynamics?: string;        // "Add Bass & soft Drum groove"
  lines: Line[];
}

interface Line {
  lyrics?: string;
  chords: ChordPosition[];
}

interface ChordPosition {
  chord: Chord;
  position: number;         // Character index in lyrics
}

interface Chord {
  root: string;             // "Eb" or "1"
  quality?: string;         // "sus4", "m7", "add4"
  bass?: string;            // For slash chords
}

type Key = 'C' | 'C#' | 'Db' | 'D' | ... | 'B' | 'Bm' | ...;
```

## Input Formats

### ChordPro (supported by MultiTracks)
```
{title: Living Hope}
{artist: Phil Wickham}
{key: Eb}
{tempo: 72}

{section: Intro}
{dynamics: Acoustic Guitar, Piano & Pad}
[Eb] [Absus2] [Eb] [Absus2]

{section: Verse 1}
How great the [Eb]chasm
That lay between [Bbsus4]us
```

### Simple Text
```
Title: Living Hope
Artist: Phil Wickham
Key: Eb
Tempo: 72

[INTRO]
Eb  Absus2  Eb  Absus2

[VERSE 1]
      Eb
How great the chasm
         Bbsus4
That lay between us
```

## Rendering Pipeline

1. **Parse** → Input text to Song model
2. **Layout** → Calculate page breaks, column flow
3. **Render** → Draw to canvas (preview) or PDF

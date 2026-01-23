# Chart Format Specification

Reference: MultiTracks.com ChartBuilder PDF output

## Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ Song Title                          Page: 1/3          │
│ Artist Name                 Key: Eb  Tempo: 72  Time: 4/4│
├─────────────────────────────────────────────────────────┤
│ [I] [V1] [Pr] [C²] [V2] [Pr] [C] [B] [Tg] [E]          │ ← Roadmap
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│  Section content       │  Section content               │ ← Two columns
│                        │                                │
└────────────────────────┴────────────────────────────────┘
```

## Header
- Song title (large, bold)
- Artist name (smaller)
- Page number (right aligned)
- Key, Tempo, Time signature (right aligned, below artist)

## Roadmap
- Horizontal row of section badges
- Each badge shows abbreviation in circle
- Superscript number for repeat count (e.g., C² = Chorus x2)

## Section Block

```
┌──────────────────────────────────────┐
│ (I) INTRO ────────────────────────── │  ← Badge + Name + Rule
│                    Acoustic Guitar   │  ← Dynamics note (right)
│                                      │
│      Eb      Absus2   Eb    Absus2   │  ← Chord row (no lyrics)
│                                      │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────┐
│ (V1) VERSE 1 ────────────────────────│
│           Eb                         │  ← Chord above lyric
│ How great the chasm                  │  ← Lyric line
│              Bbsus4                  │
│ That lay between us                  │
└──────────────────────────────────────┘
```

## Chord Notation

### Letter Mode
- Root: `Eb`, `Bb`, `C#`, `Db`
- Quality: superscript `sus4`, `sus2`, `m7`, `add4`, `2`, `7`
- Slash: `Eb/G`, `Cm7/Bb`

### Number Mode
- Root: `1`, `2`, `3`, `4`, `5`, `6`, `7`
- Minor: `m` suffix → `6m`
- Quality: same as letter mode
- Slash: `1/3`, `6m7/5`

### Band Notes
- Performance instructions in parentheses: `[(Out)]`, `[(hold)]`, `[(last time)]`
- Rendered in *italic* with muted color to distinguish from chords
- Placed inline with chords in chord rows

## Fonts
- **Lato Bold**: Song title, section names, chord roots
- **Lato Regular**: Lyrics, metadata
- **Lato Light**: Dynamics notes
- **chartbuilder.ttf**: Section badge icons
- **GoNotoKurrent**: Extended character support

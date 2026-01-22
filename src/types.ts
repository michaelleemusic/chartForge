/**
 * chartForge Type Definitions
 *
 * Core data model for representing chord charts.
 */

// All possible musical keys (major and minor)
export type Key =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B'
  | 'Cm' | 'C#m' | 'Dbm' | 'Dm' | 'D#m' | 'Ebm' | 'Em' | 'Fm' | 'F#m' | 'Gbm' | 'Gm' | 'G#m' | 'Abm' | 'Am' | 'A#m' | 'Bbm' | 'Bm';

// Section types with their common abbreviations
export type SectionType =
  | 'intro'
  | 'verse'
  | 'prechorus'
  | 'chorus'
  | 'bridge'
  | 'outro'
  | 'tag'
  | 'instrumental'
  | 'interlude'
  | 'vamp'
  | 'turnaround'
  | 'ending'
  | 'custom';

// Map section types to their abbreviations for roadmap display
export const SECTION_ABBREVIATIONS: Record<SectionType, string> = {
  intro: 'I',
  verse: 'V',
  prechorus: 'Pr',
  chorus: 'C',
  bridge: 'B',
  outro: 'O',
  tag: 'Tg',
  instrumental: 'Inst',
  interlude: 'Int',
  vamp: 'Vp',
  turnaround: 'T',
  ending: 'E',
  custom: ''
};

// Map section types to their full display names
export const SECTION_NAMES: Record<SectionType, string> = {
  intro: 'INTRO',
  verse: 'VERSE',
  prechorus: 'PRE-CHORUS',
  chorus: 'CHORUS',
  bridge: 'BRIDGE',
  outro: 'OUTRO',
  tag: 'TAG',
  instrumental: 'INSTRUMENTAL',
  interlude: 'INTERLUDE',
  vamp: 'VAMP',
  turnaround: 'TURNAROUND',
  ending: 'ENDING',
  custom: ''
};

/**
 * Represents a single chord with optional quality and bass note.
 *
 * @example
 * { root: 'Eb', quality: 'sus4' }           // Ebsus4
 * { root: 'C', quality: 'm7', bass: 'Bb' }  // Cm7/Bb
 * { root: '1' }                              // Number notation
 * { root: '6', quality: 'm7', bass: '5' }   // 6m7/5 in number notation
 */
export interface Chord {
  /** The root note - either a letter (Eb, C#) or number (1-7) */
  root: string;
  /** Quality modifier: sus4, sus2, m, m7, 7, maj7, add4, 2, etc. */
  quality?: string;
  /** Bass note for slash chords */
  bass?: string;
}

/**
 * Represents a chord positioned at a specific location in a lyric line.
 */
export interface ChordPosition {
  /** The chord at this position */
  chord: Chord;
  /** Character index in the lyrics where this chord appears (0-based) */
  position: number;
}

/**
 * A single line in a section, containing optional lyrics and chords.
 *
 * @example
 * // Chord-only line (no lyrics)
 * { chords: [{ chord: { root: 'Eb' }, position: 0 }, { chord: { root: 'Ab' }, position: 8 }] }
 *
 * // Lyrics with chords above
 * { lyrics: 'How great the chasm', chords: [{ chord: { root: 'Eb' }, position: 14 }] }
 */
export interface Line {
  /** The lyric text for this line (optional for instrumental lines) */
  lyrics?: string;
  /** Chords positioned above the lyrics */
  chords: ChordPosition[];
}

/**
 * A section of a song (verse, chorus, bridge, etc.)
 */
export interface Section {
  /** The type of section */
  type: SectionType;
  /** Optional number for repeated sections (e.g., "Verse 1", "Verse 2") */
  number?: number;
  /** Custom label override (e.g., "VERSE 1 (SOFT)") */
  label?: string;
  /** Dynamic/instrumentation notes (e.g., "Acoustic Guitar, Piano & Pad") */
  dynamics?: string;
  /** Lines within this section */
  lines: Line[];
}

/**
 * A complete song with all metadata and sections.
 */
export interface Song {
  /** Song title */
  title: string;
  /** Artist or band name */
  artist: string;
  /** Musical key */
  key: Key;
  /** Tempo in BPM */
  tempo?: number;
  /** Time signature (e.g., "4/4", "6/8") */
  timeSignature?: string;
  /** All sections of the song in order */
  sections: Section[];
}

/**
 * Result of parsing a chord string into its components.
 */
export interface ParsedChord {
  /** The root note (letter or number) */
  root: string;
  /** Whether the root uses a sharp */
  sharp: boolean;
  /** Whether the root uses a flat */
  flat: boolean;
  /** The quality (m, 7, sus4, etc.) */
  quality: string;
  /** Bass note for slash chords */
  bass?: string;
  /** Whether bass note uses a sharp */
  bassSharp?: boolean;
  /** Whether bass note uses a flat */
  bassFlat?: boolean;
}

/**
 * Options for the parser.
 */
export interface ParserOptions {
  /** Default key if not specified in the input */
  defaultKey?: Key;
  /** Default tempo if not specified in the input */
  defaultTempo?: number;
  /** Default time signature if not specified in the input */
  defaultTimeSignature?: string;
}

/**
 * Result of parsing input text.
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** The parsed song (if successful) */
  song?: Song;
  /** Error messages (if any) */
  errors: string[];
  /** Warning messages (non-fatal issues) */
  warnings: string[];
}

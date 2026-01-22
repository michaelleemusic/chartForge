/**
 * Chord Utilities
 *
 * Functions for parsing chord strings and converting between letter and number notation.
 */

import { Chord, Key, ParsedChord } from './types';

// Chromatic scale using sharps
const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Chromatic scale using flats
const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Major scale intervals (in semitones from root)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Keys that prefer flats in their notation (keys with flats in key signature)
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm']);

// Properly spelled major scales (music theory requires unique letter names per scale degree)
const MAJOR_SCALES: Record<string, string[]> = {
  'C':  ['C',  'D',  'E',  'F',  'G',  'A',  'B'],
  'G':  ['G',  'A',  'B',  'C',  'D',  'E',  'F#'],
  'D':  ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'],
  'A':  ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'],
  'E':  ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'],
  'B':  ['B',  'C#', 'D#', 'E',  'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B',  'C#', 'D#', 'E#'],
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
  'F':  ['F',  'G',  'A',  'Bb', 'C',  'D',  'E'],
  'Bb': ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A'],
  'Eb': ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D'],
  'Ab': ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G'],
  'Db': ['Db', 'Eb', 'F',  'Gb', 'Ab', 'Bb', 'C'],
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  'Cb': ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'],
};

// Map enharmonic equivalents
const ENHARMONIC_MAP: Record<string, string> = {
  'C#': 'Db', 'Db': 'C#',
  'D#': 'Eb', 'Eb': 'D#',
  'F#': 'Gb', 'Gb': 'F#',
  'G#': 'Ab', 'Ab': 'G#',
  'A#': 'Bb', 'Bb': 'A#'
};

/**
 * Normalize a note name to its canonical form.
 * Handles both sharp and flat notation.
 */
export function normalizeNote(note: string): string {
  if (!note) return '';
  const upper = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();
  // Handle double sharps/flats by converting to single
  if (upper.includes('##')) {
    const base = upper.charAt(0);
    const idx = CHROMATIC_SHARPS.indexOf(base);
    return CHROMATIC_SHARPS[(idx + 2) % 12];
  }
  if (upper.includes('bb')) {
    const base = upper.charAt(0);
    const idx = CHROMATIC_FLATS.indexOf(base);
    return CHROMATIC_FLATS[(idx + 10) % 12];
  }
  return upper;
}

/**
 * Get the semitone index (0-11) for a note.
 */
export function getNoteIndex(note: string): number {
  const normalized = normalizeNote(note);
  let idx = CHROMATIC_SHARPS.indexOf(normalized);
  if (idx === -1) {
    idx = CHROMATIC_FLATS.indexOf(normalized);
  }
  // Handle enharmonic edge cases (Cb, Fb, E#, B#)
  if (idx === -1) {
    if (normalized === 'CB') idx = 11;
    else if (normalized === 'FB') idx = 4;
    else if (normalized === 'E#') idx = 5;
    else if (normalized === 'B#') idx = 0;
  }
  return idx;
}

/**
 * Get the note name at a given semitone index, preferring sharps or flats based on key.
 */
export function getNoteAtIndex(index: number, preferFlats: boolean = false): string {
  const normalizedIndex = ((index % 12) + 12) % 12;
  return preferFlats ? CHROMATIC_FLATS[normalizedIndex] : CHROMATIC_SHARPS[normalizedIndex];
}

/**
 * Determine if a key prefers flat notation.
 */
export function keyPrefersFlats(key: Key): boolean {
  return FLAT_KEYS.has(key);
}

/**
 * Get the root note of a key (without minor suffix).
 */
export function getKeyRoot(key: Key): string {
  return key.replace(/m$/, '');
}

/**
 * Check if a key is minor.
 */
export function isMinorKey(key: Key): boolean {
  return key.endsWith('m') && key !== 'Am'; // Handle edge case
}

/**
 * Build the major scale for a given key root.
 * Returns array of 7 notes with proper enharmonic spelling.
 */
export function getMajorScale(keyRoot: string): string[] {
  // Use properly spelled scales from lookup table
  if (MAJOR_SCALES[keyRoot]) {
    return MAJOR_SCALES[keyRoot];
  }

  // Fallback for any unlisted keys (shouldn't happen in practice)
  const rootIndex = getNoteIndex(keyRoot);
  if (rootIndex === -1) {
    throw new Error(`Invalid key root: ${keyRoot}`);
  }
  const preferFlats = FLAT_KEYS.has(keyRoot);

  return MAJOR_SCALE_INTERVALS.map(interval => {
    return getNoteAtIndex(rootIndex + interval, preferFlats);
  });
}

/**
 * Parse a chord string into its components.
 *
 * @example
 * parseChordString('Ebsus4')    // { root: 'Eb', flat: true, quality: 'sus4' }
 * parseChordString('C#m7/B')    // { root: 'C#', sharp: true, quality: 'm7', bass: 'B' }
 * parseChordString('6m7/5')     // { root: '6', quality: 'm7', bass: '5' }
 */
export function parseChordString(chordStr: string): ParsedChord | null {
  if (!chordStr || typeof chordStr !== 'string') {
    return null;
  }

  const trimmed = chordStr.trim();
  if (!trimmed) {
    return null;
  }

  // Check for slash chord
  const slashIndex = trimmed.lastIndexOf('/');
  let mainPart = trimmed;
  let bassPart: string | undefined;

  if (slashIndex > 0) {
    mainPart = trimmed.substring(0, slashIndex);
    bassPart = trimmed.substring(slashIndex + 1);
  }

  // Parse the main chord
  // Pattern: Root (letter + optional accidental OR number) + quality
  // Letter root: A-G optionally followed by # or b
  // Number root: 1-7

  let root: string;
  let quality: string;
  let sharp = false;
  let flat = false;

  // Check if it's a number chord
  const numberMatch = mainPart.match(/^([1-7])(.*)$/);
  if (numberMatch) {
    root = numberMatch[1];
    quality = numberMatch[2] || '';
  } else {
    // Letter chord
    const letterMatch = mainPart.match(/^([A-Ga-g])([#b]?)(.*)$/);
    if (!letterMatch) {
      return null;
    }
    root = letterMatch[1].toUpperCase();
    const accidental = letterMatch[2];
    quality = letterMatch[3] || '';

    if (accidental === '#') {
      root += '#';
      sharp = true;
    } else if (accidental === 'b') {
      root += 'b';
      flat = true;
    }
  }

  // Parse bass note if present
  let bass: string | undefined;
  let bassSharp = false;
  let bassFlat = false;

  if (bassPart) {
    const bassNumberMatch = bassPart.match(/^([1-7])$/);
    if (bassNumberMatch) {
      bass = bassNumberMatch[1];
    } else {
      const bassLetterMatch = bassPart.match(/^([A-Ga-g])([#b]?)$/);
      if (bassLetterMatch) {
        bass = bassLetterMatch[1].toUpperCase();
        const accidental = bassLetterMatch[2];
        if (accidental === '#') {
          bass += '#';
          bassSharp = true;
        } else if (accidental === 'b') {
          bass += 'b';
          bassFlat = true;
        }
      }
    }
  }

  return {
    root,
    sharp,
    flat,
    quality,
    bass,
    bassSharp,
    bassFlat
  };
}

/**
 * Convert a ParsedChord to a Chord object.
 */
export function parsedChordToChord(parsed: ParsedChord): Chord {
  return {
    root: parsed.root,
    quality: parsed.quality || undefined,
    bass: parsed.bass
  };
}

/**
 * Parse a chord string directly into a Chord object.
 */
export function parseChord(chordStr: string): Chord | null {
  const parsed = parseChordString(chordStr);
  if (!parsed) return null;
  return parsedChordToChord(parsed);
}

/**
 * Convert a chord to its string representation.
 */
export function chordToString(chord: Chord): string {
  let result = chord.root;
  if (chord.quality) {
    result += chord.quality;
  }
  if (chord.bass) {
    result += '/' + chord.bass;
  }
  return result;
}

/**
 * Convert a letter chord to number notation given a key.
 *
 * @example
 * letterToNumber('Eb', 'Eb')      // '1'
 * letterToNumber('Ab', 'Eb')      // '4'
 * letterToNumber('Cm7', 'Eb')     // '6m7'
 * letterToNumber('Bb/D', 'Eb')    // '5/7'
 */
export function letterToNumber(chordStr: string, key: Key): string | null {
  const parsed = parseChordString(chordStr);
  if (!parsed) return null;

  // Get the scale for this key
  const keyRoot = getKeyRoot(key);
  const scale = getMajorScale(keyRoot);

  // Find the scale degree for the root
  const rootIndex = getNoteIndex(parsed.root);
  if (rootIndex === -1) return null;

  // Find which scale degree this is (1-7)
  let scaleDegree: number | null = null;
  for (let i = 0; i < 7; i++) {
    const scaleNoteIndex = getNoteIndex(scale[i]);
    if (scaleNoteIndex === rootIndex) {
      scaleDegree = i + 1;
      break;
    }
    // Check enharmonic equivalent
    const enharmonic = ENHARMONIC_MAP[parsed.root];
    if (enharmonic && getNoteIndex(enharmonic) === scaleNoteIndex) {
      scaleDegree = i + 1;
      break;
    }
  }

  // If not found in scale, check for chromatic alterations
  if (scaleDegree === null) {
    // Find the closest scale degree
    const keyRootIndex = getNoteIndex(keyRoot);
    const semitoneFromRoot = ((rootIndex - keyRootIndex) + 12) % 12;

    // Map semitones to scale degrees with alterations
    const semitoneToScaleDegree: Record<number, string> = {
      0: '1',
      1: '#1',
      2: '2',
      3: '#2',
      4: '3',
      5: '4',
      6: '#4',
      7: '5',
      8: '#5',
      9: '6',
      10: '#6',
      11: '7'
    };

    // Use flat notation for certain semitones in flat keys
    if (keyPrefersFlats(key)) {
      const flatSemitoneToScaleDegree: Record<number, string> = {
        0: '1',
        1: 'b2',
        2: '2',
        3: 'b3',
        4: '3',
        5: '4',
        6: 'b5',
        7: '5',
        8: 'b6',
        9: '6',
        10: 'b7',
        11: '7'
      };
      const degreeStr = flatSemitoneToScaleDegree[semitoneFromRoot] || '1';
      return degreeStr + parsed.quality + (parsed.bass ? '/' + letterToNumberSingle(parsed.bass, key) : '');
    }

    const degreeStr = semitoneToScaleDegree[semitoneFromRoot] || '1';
    return degreeStr + parsed.quality + (parsed.bass ? '/' + letterToNumberSingle(parsed.bass, key) : '');
  }

  // Build the number chord
  let result = String(scaleDegree);
  result += parsed.quality;

  // Convert bass note if present
  if (parsed.bass) {
    const bassNumber = letterToNumberSingle(parsed.bass, key);
    if (bassNumber) {
      result += '/' + bassNumber;
    }
  }

  return result;
}

/**
 * Convert a single letter note to its number notation.
 */
function letterToNumberSingle(note: string, key: Key): string {
  const keyRoot = getKeyRoot(key);
  const scale = getMajorScale(keyRoot);
  const noteIndex = getNoteIndex(note);

  for (let i = 0; i < 7; i++) {
    const scaleNoteIndex = getNoteIndex(scale[i]);
    if (scaleNoteIndex === noteIndex) {
      return String(i + 1);
    }
  }

  // Not in scale - return with chromatic alteration
  const keyRootIndex = getNoteIndex(keyRoot);
  const semitoneFromRoot = ((noteIndex - keyRootIndex) + 12) % 12;

  if (keyPrefersFlats(key)) {
    const flatMap: Record<number, string> = {
      0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
      6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7'
    };
    return flatMap[semitoneFromRoot] || '1';
  }

  const sharpMap: Record<number, string> = {
    0: '1', 1: '#1', 2: '2', 3: '#2', 4: '3', 5: '4',
    6: '#4', 7: '5', 8: '#5', 9: '6', 10: '#6', 11: '7'
  };
  return sharpMap[semitoneFromRoot] || '1';
}

/**
 * Convert a number chord to letter notation given a key.
 *
 * @example
 * numberToLetter('1', 'Eb')       // 'Eb'
 * numberToLetter('4', 'Eb')       // 'Ab'
 * numberToLetter('6m7', 'Eb')     // 'Cm7'
 * numberToLetter('5/7', 'Eb')     // 'Bb/D'
 */
export function numberToLetter(chordStr: string, key: Key): string | null {
  // First check if it starts with a chromatic alteration (b7, #4, etc.)
  const chromaticPrefixMatch = chordStr.match(/^([#b])([1-7])(.*)$/);
  if (chromaticPrefixMatch) {
    const [, alteration, degreeStr, quality] = chromaticPrefixMatch;
    const baseDegree = parseInt(degreeStr, 10);

    const keyRoot = getKeyRoot(key);
    const scale = getMajorScale(keyRoot);
    const preferFlats = keyPrefersFlats(key);

    const baseNote = scale[baseDegree - 1];
    const baseIndex = getNoteIndex(baseNote);

    let targetIndex = baseIndex;
    if (alteration === '#') {
      targetIndex = (baseIndex + 1) % 12;
    } else if (alteration === 'b') {
      targetIndex = (baseIndex + 11) % 12;
    }

    const root = getNoteAtIndex(targetIndex, preferFlats);
    let result = root + quality;

    // Handle slash chord in remaining quality (e.g., "b7/5")
    const slashMatch = quality.match(/^([^/]*)\/(.+)$/);
    if (slashMatch) {
      const [, beforeSlash, bassNum] = slashMatch;
      const bassLetter = numberToLetterSingle(bassNum, key);
      if (bassLetter) {
        result = root + beforeSlash + '/' + bassLetter;
      }
    }

    return result;
  }

  const parsed = parseChordString(chordStr);
  if (!parsed) return null;

  // Check if root is a valid number
  const degree = parseInt(parsed.root, 10);
  if (isNaN(degree) || degree < 1 || degree > 7) {
    // Handle chromatic alterations like b7, #4
    const chromaticMatch = parsed.root.match(/^([#b]?)([1-7])$/);
    if (!chromaticMatch) return null;

    const [, alteration, degreeStr] = chromaticMatch;
    const baseDegree = parseInt(degreeStr, 10);
    if (isNaN(baseDegree)) return null;

    const keyRoot = getKeyRoot(key);
    const scale = getMajorScale(keyRoot);
    const preferFlats = keyPrefersFlats(key);

    const baseNote = scale[baseDegree - 1];
    const baseIndex = getNoteIndex(baseNote);

    let targetIndex = baseIndex;
    if (alteration === '#') {
      targetIndex = (baseIndex + 1) % 12;
    } else if (alteration === 'b') {
      targetIndex = (baseIndex + 11) % 12;
    }

    const root = getNoteAtIndex(targetIndex, preferFlats);
    let result = root + parsed.quality;

    if (parsed.bass) {
      const bassLetter = numberToLetterSingle(parsed.bass, key);
      if (bassLetter) {
        result += '/' + bassLetter;
      }
    }

    return result;
  }

  // Get the scale for this key
  const keyRoot = getKeyRoot(key);
  const scale = getMajorScale(keyRoot);

  // Get the note for this scale degree
  const root = scale[degree - 1];
  let result = root + parsed.quality;

  // Convert bass note if present
  if (parsed.bass) {
    const bassLetter = numberToLetterSingle(parsed.bass, key);
    if (bassLetter) {
      result += '/' + bassLetter;
    }
  }

  return result;
}

/**
 * Convert a single number note to its letter notation.
 */
function numberToLetterSingle(noteStr: string, key: Key): string | null {
  // Handle chromatic alterations
  const match = noteStr.match(/^([#b]?)([1-7])$/);
  if (!match) return null;

  const [, alteration, degreeStr] = match;
  const degree = parseInt(degreeStr, 10);
  if (isNaN(degree) || degree < 1 || degree > 7) return null;

  const keyRoot = getKeyRoot(key);
  const scale = getMajorScale(keyRoot);
  const preferFlats = keyPrefersFlats(key);

  const baseNote = scale[degree - 1];
  const baseIndex = getNoteIndex(baseNote);

  let targetIndex = baseIndex;
  if (alteration === '#') {
    targetIndex = (baseIndex + 1) % 12;
  } else if (alteration === 'b') {
    targetIndex = (baseIndex + 11) % 12;
  }

  return getNoteAtIndex(targetIndex, preferFlats);
}

/**
 * Transpose a chord by a number of semitones.
 */
export function transposeChord(chord: Chord, semitones: number, preferFlats: boolean = false): Chord {
  const parsed = parseChordString(chord.root + (chord.quality || ''));
  if (!parsed) return chord;

  // Only transpose letter chords
  if (/^[1-7]$/.test(parsed.root)) {
    return chord; // Number chords don't transpose
  }

  const rootIndex = getNoteIndex(parsed.root);
  if (rootIndex === -1) return chord;

  const newRootIndex = ((rootIndex + semitones) % 12 + 12) % 12;
  const newRoot = getNoteAtIndex(newRootIndex, preferFlats);

  let newBass: string | undefined;
  if (chord.bass) {
    const bassIndex = getNoteIndex(chord.bass);
    if (bassIndex !== -1) {
      const newBassIndex = ((bassIndex + semitones) % 12 + 12) % 12;
      newBass = getNoteAtIndex(newBassIndex, preferFlats);
    }
  }

  return {
    root: newRoot,
    quality: chord.quality,
    bass: newBass
  };
}

// Valid chord quality patterns
const VALID_QUALITIES = new Set([
  '', // Major
  'm', 'min', 'minor', '-', // Minor
  '7', 'maj7', 'M7', 'maj9', 'maj11', 'maj13', // Major 7th variants
  'm7', 'min7', '-7', 'm9', 'm11', 'm13', // Minor 7th variants
  'dim', 'dim7', 'o', 'o7', // Diminished
  'aug', '+', '+7', // Augmented
  'sus', 'sus2', 'sus4', // Suspended
  '6', 'm6', '6/9', // 6th chords
  '9', 'add9', 'add2', // 9th/2nd additions
  '11', 'add11', 'add4', // 11th/4th additions
  '13', // 13th
  '5', // Power chord
  '7sus4', '7sus2', '9sus4', // Suspended 7ths
  '7#9', '7b9', '7#5', '7b5', // Altered dominants
  'm7b5', // Half-diminished
  'mmaj7', 'mM7', // Minor major 7
  '2', '4', // Simple additions
]);

/**
 * Check if a quality string is a valid chord quality.
 */
function isValidQuality(quality: string): boolean {
  if (!quality) return true; // Empty is valid (major chord)

  // Check exact match first
  if (VALID_QUALITIES.has(quality)) return true;

  // Check case-insensitive
  if (VALID_QUALITIES.has(quality.toLowerCase())) return true;

  // Check for common patterns that are valid
  // e.g., "add9", "sus4", compound qualities like "m7add9"
  const qualityPatterns = [
    /^m?a?d?d?\d+$/, // add9, add11, madd9, etc.
    /^m?7?(sus[24])?(add\d+)?$/, // sus variations
    /^m?(maj|min)?[679]?(add\d+)?$/, // basic chord + optional add
  ];

  return qualityPatterns.some(pattern => pattern.test(quality.toLowerCase()));
}

/**
 * Check if a chord string represents a valid chord.
 */
export function isValidChord(chordStr: string): boolean {
  const parsed = parseChordString(chordStr);
  if (!parsed) return false;

  // Check if quality is valid
  if (!isValidQuality(parsed.quality)) return false;

  // Check if root is valid number chord
  if (/^[1-7]$/.test(parsed.root)) {
    return true;
  }

  // Check if it's a valid letter chord
  const noteIndex = getNoteIndex(parsed.root);
  return noteIndex !== -1;
}

/**
 * Get the enharmonic equivalent of a note.
 */
export function getEnharmonic(note: string): string | null {
  const normalized = normalizeNote(note);
  return ENHARMONIC_MAP[normalized] || null;
}

/**
 * Convert a Chord from number notation to letter notation.
 */
export function convertChordToLetter(chord: Chord, key: Key): Chord {
  // Check if root is a number
  if (!/^[#b]?[1-7]$/.test(chord.root)) {
    return chord; // Already letter notation
  }

  const fullChord = chord.root + (chord.quality || '') + (chord.bass ? '/' + chord.bass : '');
  const converted = numberToLetter(fullChord, key);

  if (!converted) return chord;

  const parsed = parseChord(converted);
  return parsed || chord;
}

/**
 * Check if a chord is in number notation.
 */
export function isNumberChord(chord: Chord): boolean {
  return /^[#b]?[1-7]$/.test(chord.root);
}

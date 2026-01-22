/**
 * chartForge - Chord Chart Parser and Utilities
 *
 * TypeScript utilities for parsing chord charts in multiple formats
 * and converting between letter and number notation.
 */

// Export all types
export * from './types';

// Export parser functions
export {
  parse,
  parseAs,
  parseSimpleText,
  parseChordPro,
  detectFormat,
  InputFormat
} from './parser';

// Export chord utilities
export {
  parseChordString,
  parseChord,
  parsedChordToChord,
  chordToString,
  letterToNumber,
  numberToLetter,
  transposeChord,
  isValidChord,
  normalizeNote,
  getNoteIndex,
  getNoteAtIndex,
  keyPrefersFlats,
  getKeyRoot,
  isMinorKey,
  getMajorScale,
  getEnharmonic
} from './chordUtils';

/**
 * Unit tests for chord utilities
 */

import {
  parseChordString,
  parseChord,
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
  getMajorScale,
  getEnharmonic
} from './chordUtils';
import { Chord, Key } from './types';

describe('normalizeNote', () => {
  it('should capitalize note names', () => {
    expect(normalizeNote('c')).toBe('C');
    expect(normalizeNote('eb')).toBe('Eb');
    expect(normalizeNote('f#')).toBe('F#');
  });

  it('should handle already capitalized notes', () => {
    expect(normalizeNote('C')).toBe('C');
    expect(normalizeNote('Eb')).toBe('Eb');
    expect(normalizeNote('F#')).toBe('F#');
  });

  it('should return empty string for empty input', () => {
    expect(normalizeNote('')).toBe('');
  });
});

describe('getNoteIndex', () => {
  it('should return correct indices for natural notes', () => {
    expect(getNoteIndex('C')).toBe(0);
    expect(getNoteIndex('D')).toBe(2);
    expect(getNoteIndex('E')).toBe(4);
    expect(getNoteIndex('F')).toBe(5);
    expect(getNoteIndex('G')).toBe(7);
    expect(getNoteIndex('A')).toBe(9);
    expect(getNoteIndex('B')).toBe(11);
  });

  it('should return correct indices for sharps', () => {
    expect(getNoteIndex('C#')).toBe(1);
    expect(getNoteIndex('D#')).toBe(3);
    expect(getNoteIndex('F#')).toBe(6);
    expect(getNoteIndex('G#')).toBe(8);
    expect(getNoteIndex('A#')).toBe(10);
  });

  it('should return correct indices for flats', () => {
    expect(getNoteIndex('Db')).toBe(1);
    expect(getNoteIndex('Eb')).toBe(3);
    expect(getNoteIndex('Gb')).toBe(6);
    expect(getNoteIndex('Ab')).toBe(8);
    expect(getNoteIndex('Bb')).toBe(10);
  });
});

describe('getNoteAtIndex', () => {
  it('should return sharps by default', () => {
    expect(getNoteAtIndex(1)).toBe('C#');
    expect(getNoteAtIndex(3)).toBe('D#');
    expect(getNoteAtIndex(6)).toBe('F#');
  });

  it('should return flats when specified', () => {
    expect(getNoteAtIndex(1, true)).toBe('Db');
    expect(getNoteAtIndex(3, true)).toBe('Eb');
    expect(getNoteAtIndex(6, true)).toBe('Gb');
  });

  it('should handle wraparound', () => {
    expect(getNoteAtIndex(12)).toBe('C');
    expect(getNoteAtIndex(13)).toBe('C#');
    expect(getNoteAtIndex(-1)).toBe('B');
  });
});

describe('keyPrefersFlats', () => {
  it('should return true for flat keys', () => {
    expect(keyPrefersFlats('F')).toBe(true);
    expect(keyPrefersFlats('Bb')).toBe(true);
    expect(keyPrefersFlats('Eb')).toBe(true);
    expect(keyPrefersFlats('Ab')).toBe(true);
    expect(keyPrefersFlats('Dm')).toBe(true);
    expect(keyPrefersFlats('Gm')).toBe(true);
  });

  it('should return false for sharp keys', () => {
    expect(keyPrefersFlats('C')).toBe(false);
    expect(keyPrefersFlats('G')).toBe(false);
    expect(keyPrefersFlats('D')).toBe(false);
    expect(keyPrefersFlats('A')).toBe(false);
    expect(keyPrefersFlats('E')).toBe(false);
  });
});

describe('getKeyRoot', () => {
  it('should return root for major keys', () => {
    expect(getKeyRoot('C')).toBe('C');
    expect(getKeyRoot('Eb')).toBe('Eb');
  });

  it('should strip m suffix for minor keys', () => {
    expect(getKeyRoot('Am')).toBe('A');
    expect(getKeyRoot('Ebm')).toBe('Eb');
  });
});

describe('getMajorScale', () => {
  it('should return correct C major scale', () => {
    expect(getMajorScale('C')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('should return correct G major scale', () => {
    expect(getMajorScale('G')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
  });

  it('should return correct Eb major scale with flats', () => {
    const scale = getMajorScale('Eb');
    expect(scale[0]).toBe('Eb');
    expect(scale[1]).toBe('F');
    expect(scale[2]).toBe('G');
    expect(scale[3]).toBe('Ab');
    expect(scale[4]).toBe('Bb');
    expect(scale[5]).toBe('C');
    expect(scale[6]).toBe('D');
  });

  it('should return correct Gb major scale with Cb', () => {
    const scale = getMajorScale('Gb');
    expect(scale).toEqual(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F']);
  });

  it('should throw for invalid key root', () => {
    expect(() => getMajorScale('X')).toThrow('Invalid key root: X');
  });
});

describe('parseChordString', () => {
  it('should parse simple major chords', () => {
    const result = parseChordString('C');
    expect(result?.root).toBe('C');
    expect(result?.sharp).toBe(false);
    expect(result?.flat).toBe(false);
    expect(result?.quality).toBe('');
    expect(result?.bass).toBeUndefined();
  });

  it('should parse chords with sharps', () => {
    const result = parseChordString('C#');
    expect(result?.root).toBe('C#');
    expect(result?.sharp).toBe(true);
    expect(result?.flat).toBe(false);
  });

  it('should parse chords with flats', () => {
    const result = parseChordString('Eb');
    expect(result?.root).toBe('Eb');
    expect(result?.sharp).toBe(false);
    expect(result?.flat).toBe(true);
  });

  it('should parse chords with quality', () => {
    expect(parseChordString('Am')?.quality).toBe('m');
    expect(parseChordString('Cmaj7')?.quality).toBe('maj7');
    expect(parseChordString('Dm7')?.quality).toBe('m7');
    expect(parseChordString('Gsus4')?.quality).toBe('sus4');
    expect(parseChordString('Asus2')?.quality).toBe('sus2');
    expect(parseChordString('Fadd9')?.quality).toBe('add9');
  });

  it('should parse slash chords', () => {
    const result = parseChordString('C/E');
    expect(result?.root).toBe('C');
    expect(result?.bass).toBe('E');
  });

  it('should parse complex slash chords', () => {
    const result = parseChordString('Am7/G');
    expect(result?.root).toBe('A');
    expect(result?.quality).toBe('m7');
    expect(result?.bass).toBe('G');
  });

  it('should parse slash chords with accidentals', () => {
    const result = parseChordString('Eb/Bb');
    expect(result?.root).toBe('Eb');
    expect(result?.flat).toBe(true);
    expect(result?.bass).toBe('Bb');
    expect(result?.bassFlat).toBe(true);
  });

  it('should parse number notation', () => {
    const result = parseChordString('1');
    expect(result?.root).toBe('1');
    expect(result?.quality).toBe('');
  });

  it('should parse number notation with quality', () => {
    const result = parseChordString('6m7');
    expect(result?.root).toBe('6');
    expect(result?.quality).toBe('m7');
  });

  it('should parse number notation slash chords', () => {
    const result = parseChordString('5/7');
    expect(result?.root).toBe('5');
    expect(result?.bass).toBe('7');
  });

  it('should return null for invalid input', () => {
    expect(parseChordString('')).toBeNull();
    expect(parseChordString('   ')).toBeNull();
    expect(parseChordString('xyz')).toBeNull();
  });
});

describe('parseChord', () => {
  it('should return a Chord object', () => {
    const chord = parseChord('Am7/G');
    expect(chord).toEqual({
      root: 'A',
      quality: 'm7',
      bass: 'G'
    });
  });

  it('should omit quality if empty', () => {
    const chord = parseChord('C');
    expect(chord).toEqual({
      root: 'C',
      quality: undefined,
      bass: undefined
    });
  });
});

describe('chordToString', () => {
  it('should convert simple chords', () => {
    expect(chordToString({ root: 'C' })).toBe('C');
  });

  it('should include quality', () => {
    expect(chordToString({ root: 'A', quality: 'm7' })).toBe('Am7');
  });

  it('should include bass', () => {
    expect(chordToString({ root: 'C', bass: 'E' })).toBe('C/E');
  });

  it('should include both quality and bass', () => {
    expect(chordToString({ root: 'A', quality: 'm7', bass: 'G' })).toBe('Am7/G');
  });
});

describe('letterToNumber', () => {
  it('should convert root note to 1', () => {
    expect(letterToNumber('Eb', 'Eb')).toBe('1');
    expect(letterToNumber('C', 'C')).toBe('1');
    expect(letterToNumber('G', 'G')).toBe('1');
  });

  it('should convert scale degrees correctly in Eb', () => {
    expect(letterToNumber('F', 'Eb')).toBe('2');
    expect(letterToNumber('G', 'Eb')).toBe('3');
    expect(letterToNumber('Ab', 'Eb')).toBe('4');
    expect(letterToNumber('Bb', 'Eb')).toBe('5');
    expect(letterToNumber('C', 'Eb')).toBe('6');
    expect(letterToNumber('D', 'Eb')).toBe('7');
  });

  it('should convert scale degrees correctly in C', () => {
    expect(letterToNumber('D', 'C')).toBe('2');
    expect(letterToNumber('E', 'C')).toBe('3');
    expect(letterToNumber('F', 'C')).toBe('4');
    expect(letterToNumber('G', 'C')).toBe('5');
    expect(letterToNumber('A', 'C')).toBe('6');
    expect(letterToNumber('B', 'C')).toBe('7');
  });

  it('should preserve quality', () => {
    expect(letterToNumber('Cm', 'Eb')).toBe('6m');
    expect(letterToNumber('Cm7', 'Eb')).toBe('6m7');
    expect(letterToNumber('Bbsus4', 'Eb')).toBe('5sus4');
  });

  it('should handle slash chords', () => {
    expect(letterToNumber('Bb/D', 'Eb')).toBe('5/7');
    expect(letterToNumber('Ab/C', 'Eb')).toBe('4/6');
  });

  it('should handle chromatic notes', () => {
    // Db in key of Eb is b7
    expect(letterToNumber('Db', 'Eb')).toBe('b7');
  });

  it('should return null for invalid input', () => {
    expect(letterToNumber('', 'C')).toBeNull();
    expect(letterToNumber('xyz', 'C')).toBeNull();
  });
});

describe('numberToLetter', () => {
  it('should convert 1 to root note', () => {
    expect(numberToLetter('1', 'Eb')).toBe('Eb');
    expect(numberToLetter('1', 'C')).toBe('C');
    expect(numberToLetter('1', 'G')).toBe('G');
  });

  it('should convert scale degrees correctly in Eb', () => {
    expect(numberToLetter('2', 'Eb')).toBe('F');
    expect(numberToLetter('3', 'Eb')).toBe('G');
    expect(numberToLetter('4', 'Eb')).toBe('Ab');
    expect(numberToLetter('5', 'Eb')).toBe('Bb');
    expect(numberToLetter('6', 'Eb')).toBe('C');
    expect(numberToLetter('7', 'Eb')).toBe('D');
  });

  it('should convert scale degrees correctly in C', () => {
    expect(numberToLetter('2', 'C')).toBe('D');
    expect(numberToLetter('3', 'C')).toBe('E');
    expect(numberToLetter('4', 'C')).toBe('F');
    expect(numberToLetter('5', 'C')).toBe('G');
    expect(numberToLetter('6', 'C')).toBe('A');
    expect(numberToLetter('7', 'C')).toBe('B');
  });

  it('should preserve quality', () => {
    expect(numberToLetter('6m', 'Eb')).toBe('Cm');
    expect(numberToLetter('6m7', 'Eb')).toBe('Cm7');
    expect(numberToLetter('5sus4', 'Eb')).toBe('Bbsus4');
  });

  it('should handle slash chords', () => {
    expect(numberToLetter('5/7', 'Eb')).toBe('Bb/D');
    expect(numberToLetter('4/6', 'Eb')).toBe('Ab/C');
  });

  it('should handle chromatic alterations', () => {
    expect(numberToLetter('b7', 'Eb')).toBe('Db');
    expect(numberToLetter('#4', 'C')).toBe('F#');
  });

  it('should return null for invalid input', () => {
    expect(numberToLetter('', 'C')).toBeNull();
    expect(numberToLetter('8', 'C')).toBeNull();
    expect(numberToLetter('0', 'C')).toBeNull();
  });
});

describe('transposeChord', () => {
  it('should transpose up by semitones', () => {
    const chord: Chord = { root: 'C' };
    const result = transposeChord(chord, 2);
    expect(result.root).toBe('D');
  });

  it('should transpose down by semitones', () => {
    const chord: Chord = { root: 'D' };
    const result = transposeChord(chord, -2);
    expect(result.root).toBe('C');
  });

  it('should preserve quality', () => {
    const chord: Chord = { root: 'A', quality: 'm7' };
    const result = transposeChord(chord, 2);
    expect(result.root).toBe('B');
    expect(result.quality).toBe('m7');
  });

  it('should transpose bass note', () => {
    const chord: Chord = { root: 'C', bass: 'E' };
    const result = transposeChord(chord, 2);
    expect(result.root).toBe('D');
    expect(result.bass).toBe('F#');
  });

  it('should use flats when specified', () => {
    const chord: Chord = { root: 'C' };
    const result = transposeChord(chord, 1, true);
    expect(result.root).toBe('Db');
  });

  it('should not transpose number chords', () => {
    const chord: Chord = { root: '1', quality: 'm' };
    const result = transposeChord(chord, 2);
    expect(result.root).toBe('1');
  });

  it('should handle wraparound', () => {
    const chord: Chord = { root: 'B' };
    const result = transposeChord(chord, 1);
    expect(result.root).toBe('C');
  });
});

describe('isValidChord', () => {
  it('should return true for valid letter chords', () => {
    expect(isValidChord('C')).toBe(true);
    expect(isValidChord('Am')).toBe(true);
    expect(isValidChord('F#m7')).toBe(true);
    expect(isValidChord('Bbsus4')).toBe(true);
    expect(isValidChord('Eb/G')).toBe(true);
  });

  it('should return true for valid number chords', () => {
    expect(isValidChord('1')).toBe(true);
    expect(isValidChord('4')).toBe(true);
    expect(isValidChord('6m')).toBe(true);
    expect(isValidChord('5/7')).toBe(true);
  });

  it('should return false for invalid chords', () => {
    expect(isValidChord('')).toBe(false);
    expect(isValidChord('xyz')).toBe(false);
    expect(isValidChord('8')).toBe(false);
    expect(isValidChord('H')).toBe(false);
  });
});

describe('getEnharmonic', () => {
  it('should return enharmonic equivalents', () => {
    expect(getEnharmonic('C#')).toBe('Db');
    expect(getEnharmonic('Db')).toBe('C#');
    expect(getEnharmonic('Eb')).toBe('D#');
    expect(getEnharmonic('D#')).toBe('Eb');
    expect(getEnharmonic('F#')).toBe('Gb');
    expect(getEnharmonic('Gb')).toBe('F#');
  });

  it('should return null for notes without enharmonics', () => {
    expect(getEnharmonic('C')).toBeNull();
    expect(getEnharmonic('D')).toBeNull();
    expect(getEnharmonic('E')).toBeNull();
  });
});

describe('Round-trip conversion', () => {
  it('should convert letter to number and back', () => {
    const testCases: Array<{ chord: string; key: Key }> = [
      { chord: 'Eb', key: 'Eb' },
      { chord: 'Ab', key: 'Eb' },
      { chord: 'Cm7', key: 'Eb' },
      { chord: 'Bb/D', key: 'Eb' },
      { chord: 'G', key: 'C' },
      { chord: 'Am7', key: 'C' },
    ];

    for (const { chord, key } of testCases) {
      const number = letterToNumber(chord, key);
      expect(number).not.toBeNull();
      const backToLetter = numberToLetter(number!, key);
      expect(backToLetter).toBe(chord);
    }
  });
});

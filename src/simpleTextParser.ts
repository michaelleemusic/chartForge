/**
 * Simple Text Format Parser
 *
 * Parses chord charts in the "chords above lyrics" format:
 *
 * Title: Living Hope
 * Artist: Phil Wickham
 * Key: Eb
 * Tempo: 72
 *
 * [INTRO]
 * Eb  Absus2  Eb  Absus2
 *
 * [VERSE 1]
 *       Eb
 * How great the chasm
 *          Bbsus4
 * That lay between us
 */

import {
  Song,
  Section,
  Line,
  ChordPosition,
  Key,
  SectionType,
  ParseResult,
  ParserOptions
} from './types';
import { parseChord, isValidChord } from './chordUtils';

// Map common section names to SectionType
const SECTION_TYPE_MAP: Record<string, SectionType> = {
  'intro': 'intro',
  'verse': 'verse',
  'v': 'verse',
  'pre-chorus': 'prechorus',
  'prechorus': 'prechorus',
  'pre chorus': 'prechorus',
  'pc': 'prechorus',
  'chorus': 'chorus',
  'c': 'chorus',
  'bridge': 'bridge',
  'b': 'bridge',
  'br': 'bridge',
  'outro': 'outro',
  'tag': 'tag',
  'instrumental': 'instrumental',
  'inst': 'instrumental',
  'interlude': 'interlude',
  'int': 'interlude',
  'vamp': 'vamp',
  'turnaround': 'turnaround',
  'turn': 'turnaround',
  'ending': 'ending',
  'end': 'ending'
};

/**
 * Parse a section header like "[VERSE 1]" or "[INTRO]"
 */
function parseSectionHeader(line: string): { type: SectionType; number?: number; label?: string } | null {
  // Match [SECTION NAME] or [SECTION NAME 1]
  const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
  if (!match) return null;

  const content = match[1].trim();

  // Try to extract section type and number
  const numberMatch = content.match(/^(.+?)\s*(\d+)$/);
  let sectionName: string;
  let number: number | undefined;

  if (numberMatch) {
    sectionName = numberMatch[1].trim();
    number = parseInt(numberMatch[2], 10);
  } else {
    sectionName = content;
  }

  // Normalize section name
  const normalizedName = sectionName.toLowerCase().replace(/[^a-z\s-]/g, '').trim();

  // Look up the section type
  const sectionType = SECTION_TYPE_MAP[normalizedName];

  if (sectionType) {
    return { type: sectionType, number, label: content };
  }

  // Unknown section type - use custom
  return { type: 'custom', label: content };
}

/**
 * Determine if a line appears to be a chord-only line.
 * Chord lines typically have multiple chords separated by whitespace.
 */
function isChordOnlyLine(line: string): boolean {
  if (!line.trim()) return false;

  // Split by whitespace and check if most/all tokens are valid chords
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0) return false;

  let chordCount = 0;
  for (const token of tokens) {
    if (isValidChord(token)) {
      chordCount++;
    }
  }

  // Consider it a chord line if at least half are valid chords
  // and there's at least one chord
  return chordCount > 0 && chordCount >= tokens.length * 0.5;
}

/**
 * Parse chords from a chord-only line, calculating positions.
 */
function parseChordsFromChordLine(line: string): ChordPosition[] {
  const chords: ChordPosition[] = [];
  const regex = /(\S+)/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const chordStr = match[1];
    const chord = parseChord(chordStr);
    if (chord) {
      chords.push({
        chord,
        position: match.index
      });
    }
  }

  return chords;
}

/**
 * Parse a chord line that appears above a lyric line.
 * Positions are based on character index.
 */
function parseChordsAboveLyrics(chordLine: string): ChordPosition[] {
  return parseChordsFromChordLine(chordLine);
}

/**
 * Parse metadata from header lines.
 */
function parseMetadata(lines: string[]): {
  title: string;
  artist: string;
  key: Key;
  tempo?: number;
  timeSignature?: string;
  contentStartIndex: number;
} {
  let title = 'Untitled';
  let artist = 'Unknown';
  let key: Key = 'C';
  let tempo: number | undefined;
  let timeSignature: string | undefined;
  let contentStartIndex = 0;

  for (let i = 0; i < lines.length && i < 20; i++) {
    const line = lines[i].trim();

    // Check for metadata patterns
    const titleMatch = line.match(/^(?:Title|Song)\s*[:=]\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      contentStartIndex = Math.max(contentStartIndex, i + 1);
      continue;
    }

    const artistMatch = line.match(/^Artist\s*[:=]\s*(.+)$/i);
    if (artistMatch) {
      artist = artistMatch[1].trim();
      contentStartIndex = Math.max(contentStartIndex, i + 1);
      continue;
    }

    const keyMatch = line.match(/^Key\s*[:=]\s*([A-Ga-g][#b]?m?)$/i);
    if (keyMatch) {
      key = normalizeKey(keyMatch[1]) as Key;
      contentStartIndex = Math.max(contentStartIndex, i + 1);
      continue;
    }

    const tempoMatch = line.match(/^(?:Tempo|BPM)\s*[:=]\s*(\d+)$/i);
    if (tempoMatch) {
      tempo = parseInt(tempoMatch[1], 10);
      contentStartIndex = Math.max(contentStartIndex, i + 1);
      continue;
    }

    const timeMatch = line.match(/^(?:Time|Time\s*Signature)\s*[:=]\s*(\d+\/\d+)$/i);
    if (timeMatch) {
      timeSignature = timeMatch[1];
      contentStartIndex = Math.max(contentStartIndex, i + 1);
      continue;
    }

    // If we hit a section header or non-metadata, stop looking
    if (line.startsWith('[') || (line && !line.includes(':'))) {
      break;
    }
  }

  return { title, artist, key, tempo, timeSignature, contentStartIndex };
}

/**
 * Normalize a key string to the Key type format.
 */
function normalizeKey(keyStr: string): string {
  const upper = keyStr.charAt(0).toUpperCase();
  const rest = keyStr.slice(1).toLowerCase();
  return upper + rest;
}

/**
 * Parse Simple Text format into a Song object.
 */
export function parseSimpleText(input: string, options: ParserOptions = {}): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || typeof input !== 'string') {
    return {
      success: false,
      errors: ['Input must be a non-empty string'],
      warnings: []
    };
  }

  const lines = input.split(/\r?\n/);

  // Parse metadata
  const { title, artist, key, tempo, timeSignature, contentStartIndex } = parseMetadata(lines);

  // Parse sections
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let pendingChordLine: string | null = null;
  let pendingChordLineNum = 0;

  for (let i = contentStartIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines unless we have a pending chord line
    if (!trimmed) {
      // If we have a pending chord line with no following lyrics, add it as chord-only
      if (pendingChordLine !== null && currentSection) {
        const chords = parseChordsFromChordLine(pendingChordLine);
        if (chords.length > 0) {
          currentSection.lines.push({ chords });
        }
        pendingChordLine = null;
      }
      continue;
    }

    // Check for section header
    const sectionInfo = parseSectionHeader(trimmed);
    if (sectionInfo) {
      // Flush pending chord line
      if (pendingChordLine !== null && currentSection) {
        const chords = parseChordsFromChordLine(pendingChordLine);
        if (chords.length > 0) {
          currentSection.lines.push({ chords });
        }
        pendingChordLine = null;
      }

      // Save current section
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        type: sectionInfo.type,
        number: sectionInfo.number,
        label: sectionInfo.label,
        lines: []
      };
      continue;
    }

    // Check for dynamics line (starts with specific keywords or is in parentheses)
    if (currentSection && currentSection.lines.length === 0) {
      const dynamicsMatch = trimmed.match(/^(?:\(([^)]+)\)|Dynamics:\s*(.+))$/i);
      if (dynamicsMatch) {
        currentSection.dynamics = dynamicsMatch[1] || dynamicsMatch[2];
        continue;
      }
    }

    // If no current section, create a default one
    if (!currentSection) {
      currentSection = {
        type: 'verse',
        lines: []
      };
    }

    // Check if this is a chord line
    if (isChordOnlyLine(trimmed)) {
      // Flush any existing pending chord line
      if (pendingChordLine !== null) {
        const chords = parseChordsFromChordLine(pendingChordLine);
        if (chords.length > 0) {
          currentSection.lines.push({ chords });
        }
      }
      pendingChordLine = line; // Keep original line with spacing
      pendingChordLineNum = i;
    } else {
      // This is a lyric line
      if (pendingChordLine !== null) {
        // Pair chords with lyrics
        const chords = parseChordsAboveLyrics(pendingChordLine);
        currentSection.lines.push({
          lyrics: trimmed,
          chords
        });
        pendingChordLine = null;
      } else {
        // Lyric line without chords above
        currentSection.lines.push({
          lyrics: trimmed,
          chords: []
        });
      }
    }
  }

  // Flush any remaining pending chord line
  if (pendingChordLine !== null && currentSection) {
    const chords = parseChordsFromChordLine(pendingChordLine);
    if (chords.length > 0) {
      currentSection.lines.push({ chords });
    }
  }

  // Add the last section
  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  // Warn if no sections were found
  if (sections.length === 0) {
    warnings.push('No sections found in input');
  }

  const song: Song = {
    title,
    artist,
    key,
    tempo: tempo ?? options.defaultTempo,
    timeSignature: timeSignature ?? options.defaultTimeSignature,
    sections
  };

  return {
    success: true,
    song,
    errors,
    warnings
  };
}

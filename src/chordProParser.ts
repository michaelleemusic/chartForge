/**
 * ChordPro Format Parser
 *
 * Parses chord charts in ChordPro format:
 *
 * {title: Living Hope}
 * {artist: Phil Wickham}
 * {key: Eb}
 * {tempo: 72}
 *
 * {section: Intro}
 * {dynamics: Acoustic Guitar, Piano & Pad}
 * [Eb] [Absus2] [Eb] [Absus2]
 *
 * {section: Verse 1}
 * How great the [Eb]chasm
 * That lay between [Bbsus4]us
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
import { parseChord } from './chordUtils';

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
 * Parse a ChordPro directive like {title: Living Hope} or {key: Eb}
 */
function parseDirective(line: string): { name: string; value: string } | null {
  const match = line.match(/^\s*\{([^:}]+)(?::\s*([^}]*))?\}\s*$/);
  if (!match) return null;

  return {
    name: match[1].trim().toLowerCase(),
    value: match[2]?.trim() || ''
  };
}

/**
 * Parse a section directive value like "Verse 1" or "Intro"
 */
function parseSectionValue(value: string): { type: SectionType; number?: number; label?: string } {
  // Try to extract section type and number
  const numberMatch = value.match(/^(.+?)\s*(\d+)$/);
  let sectionName: string;
  let number: number | undefined;

  if (numberMatch) {
    sectionName = numberMatch[1].trim();
    number = parseInt(numberMatch[2], 10);
  } else {
    sectionName = value;
  }

  // Normalize section name
  const normalizedName = sectionName.toLowerCase().replace(/[^a-z\s-]/g, '').trim();

  // Look up the section type
  const sectionType = SECTION_TYPE_MAP[normalizedName];

  if (sectionType) {
    return { type: sectionType, number, label: value };
  }

  // Unknown section type - use custom
  return { type: 'custom', label: value };
}

/**
 * Parse a line with inline chords like "How great the [Eb]chasm"
 */
function parseInlineChords(line: string): Line {
  const chords: ChordPosition[] = [];
  let lyrics = '';
  let currentPosition = 0;

  // Regex to match chord brackets
  const chordRegex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = chordRegex.exec(line)) !== null) {
    // Add text before this chord to lyrics
    const textBefore = line.substring(lastIndex, match.index);
    lyrics += textBefore;

    // Parse the chord
    const chordStr = match[1];
    const chord = parseChord(chordStr);
    if (chord) {
      chords.push({
        chord,
        position: lyrics.length
      });
    }

    lastIndex = match.index + match[0].length;
    currentPosition = lyrics.length;
  }

  // Add any remaining text after the last chord
  lyrics += line.substring(lastIndex);

  // If line is chord-only (no lyrics), clear the lyrics string
  const trimmedLyrics = lyrics.trim();

  return {
    lyrics: trimmedLyrics || undefined,
    chords
  };
}

/**
 * Check if a line contains only chord brackets (no lyrics)
 */
function isChordOnlyLine(line: string): boolean {
  // Remove all chord brackets and whitespace, see if anything remains
  const withoutChords = line.replace(/\[[^\]]+\]/g, '').trim();
  return withoutChords === '' && line.includes('[');
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
 * Parse ChordPro format into a Song object.
 */
export function parseChordPro(input: string, options: ParserOptions = {}): ParseResult {
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

  // Song metadata
  let title = 'Untitled';
  let artist = 'Unknown';
  let key: Key = options.defaultKey || 'C';
  let tempo: number | undefined = options.defaultTempo;
  let timeSignature: string | undefined = options.defaultTimeSignature;

  // Sections
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let pendingDynamics: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Check for directive
    const directive = parseDirective(trimmed);
    if (directive) {
      switch (directive.name) {
        case 'title':
        case 't':
          title = directive.value;
          break;

        case 'artist':
        case 'a':
          artist = directive.value;
          break;

        case 'key':
        case 'k':
          if (directive.value) {
            key = normalizeKey(directive.value) as Key;
          }
          break;

        case 'tempo':
        case 'bpm':
          if (directive.value) {
            const parsed = parseInt(directive.value, 10);
            if (!isNaN(parsed)) {
              tempo = parsed;
            }
          }
          break;

        case 'time':
        case 'time_signature':
          timeSignature = directive.value;
          break;

        case 'section':
        case 'start_of_verse':
        case 'sov':
        case 'start_of_chorus':
        case 'soc':
        case 'start_of_bridge':
        case 'sob': {
          // Save current section
          if (currentSection && currentSection.lines.length > 0) {
            sections.push(currentSection);
          }

          // Handle special start_of_* directives
          let sectionInfo: { type: SectionType; number?: number; label?: string };
          if (directive.name === 'start_of_verse' || directive.name === 'sov') {
            sectionInfo = parseSectionValue(directive.value || 'Verse');
            sectionInfo.type = 'verse';
          } else if (directive.name === 'start_of_chorus' || directive.name === 'soc') {
            sectionInfo = parseSectionValue(directive.value || 'Chorus');
            sectionInfo.type = 'chorus';
          } else if (directive.name === 'start_of_bridge' || directive.name === 'sob') {
            sectionInfo = parseSectionValue(directive.value || 'Bridge');
            sectionInfo.type = 'bridge';
          } else {
            sectionInfo = parseSectionValue(directive.value);
          }

          // Start new section
          currentSection = {
            type: sectionInfo.type,
            number: sectionInfo.number,
            label: sectionInfo.label,
            dynamics: pendingDynamics || undefined,
            lines: []
          };
          pendingDynamics = null;
          break;
        }

        case 'end_of_verse':
        case 'eov':
        case 'end_of_chorus':
        case 'eoc':
        case 'end_of_bridge':
        case 'eob':
          // Save current section
          if (currentSection && currentSection.lines.length > 0) {
            sections.push(currentSection);
          }
          currentSection = null;
          break;

        case 'dynamics':
        case 'comment':
        case 'c':
        case 'ci':
          if (currentSection) {
            // If section already has lines, this is a mid-section comment
            // For now, ignore it or add to dynamics
            if (currentSection.lines.length === 0 && !currentSection.dynamics) {
              currentSection.dynamics = directive.value;
            }
          } else {
            // Store for next section
            pendingDynamics = directive.value;
          }
          break;

        default:
          // Unknown directive - ignore for now
          break;
      }
      continue;
    }

    // This is a content line (lyrics with optional inline chords)
    // Create a default section if none exists
    if (!currentSection) {
      currentSection = {
        type: 'verse',
        dynamics: pendingDynamics || undefined,
        lines: []
      };
      pendingDynamics = null;
    }

    // Parse the line for inline chords
    const parsedLine = parseInlineChords(trimmed);

    // Only add if there's actual content
    if (parsedLine.lyrics || parsedLine.chords.length > 0) {
      currentSection.lines.push(parsedLine);
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
    tempo,
    timeSignature,
    sections
  };

  return {
    success: true,
    song,
    errors,
    warnings
  };
}

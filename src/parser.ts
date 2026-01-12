/**
 * Main Parser Module
 *
 * Automatically detects input format and delegates to the appropriate parser.
 */

import { ParseResult, ParserOptions } from './types';
import { parseSimpleText } from './simpleTextParser';
import { parseChordPro } from './chordProParser';

/**
 * Input format types.
 */
export type InputFormat = 'chordpro' | 'simple' | 'unknown';

/**
 * Detect the format of the input text.
 *
 * ChordPro format is identified by:
 * - Curly brace directives like {title: ...}
 * - Inline chords in square brackets like [Am]
 *
 * Simple text format is identified by:
 * - Square bracket section headers like [VERSE 1]
 * - Colon-separated metadata like "Title: ..."
 * - Chord lines above lyric lines
 */
export function detectFormat(input: string): InputFormat {
  if (!input || typeof input !== 'string') {
    return 'unknown';
  }

  const lines = input.split(/\r?\n/);

  let hasChordProDirectives = false;
  let hasInlineChords = false;
  let hasSimpleSectionHeaders = false;
  let hasSimpleMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for ChordPro directives: {name: value}
    if (/^\{[^}]+\}$/.test(trimmed)) {
      hasChordProDirectives = true;
    }

    // Check for inline chords within text: "word [Chord] word"
    // This is different from section headers which are standalone [SECTION]
    if (/\w+\s*\[[A-Ga-g#b0-9msudiagjM/]+\]/.test(trimmed) ||
        /\[[A-Ga-g#b0-9msudiagjM/]+\]\s*\w+/.test(trimmed)) {
      hasInlineChords = true;
    }

    // Check for simple text section headers: standalone [SECTION]
    if (/^\[[A-Z\s\d]+\]$/.test(trimmed)) {
      hasSimpleSectionHeaders = true;
    }

    // Check for simple text metadata: "Key: value"
    if (/^(?:Title|Artist|Key|Tempo|Time)\s*:/i.test(trimmed)) {
      hasSimpleMetadata = true;
    }
  }

  // ChordPro format takes precedence if we see directives or inline chords
  if (hasChordProDirectives || hasInlineChords) {
    return 'chordpro';
  }

  // Simple text format
  if (hasSimpleSectionHeaders || hasSimpleMetadata) {
    return 'simple';
  }

  // Default to simple if we can't determine
  return 'simple';
}

/**
 * Parse input text, automatically detecting the format.
 */
export function parse(input: string, options: ParserOptions = {}): ParseResult {
  const format = detectFormat(input);

  switch (format) {
    case 'chordpro':
      return parseChordPro(input, options);
    case 'simple':
    default:
      return parseSimpleText(input, options);
  }
}

/**
 * Parse input text as a specific format.
 */
export function parseAs(input: string, format: InputFormat, options: ParserOptions = {}): ParseResult {
  switch (format) {
    case 'chordpro':
      return parseChordPro(input, options);
    case 'simple':
      return parseSimpleText(input, options);
    default:
      return {
        success: false,
        errors: [`Unknown format: ${format}`],
        warnings: []
      };
  }
}

// Re-export individual parsers
export { parseSimpleText } from './simpleTextParser';
export { parseChordPro } from './chordProParser';

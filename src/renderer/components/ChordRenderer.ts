/**
 * Chord Renderer Component
 *
 * Renders chords with proper formatting:
 * - Root note in bold
 * - Quality (sus4, m7, etc.) as smaller superscript-style text
 * - Slash chords with bass note
 */

import { Chord } from '../../types';
import { RenderConfig, DEFAULT_CONFIG } from '../types';

/**
 * Render a single chord at the specified position.
 * Returns the total width of the rendered chord.
 */
export function renderChord(
  ctx: CanvasRenderingContext2D,
  chord: Chord,
  x: number,
  y: number,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  let currentX = x;

  // Render root note (bold, larger)
  ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
  ctx.fillStyle = config.colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillText(chord.root, currentX, y);
  currentX += ctx.measureText(chord.root).width;

  // Render quality (smaller, positioned slightly higher like superscript)
  if (chord.quality) {
    ctx.font = `${config.fonts.chordQuality.weight} ${config.fonts.chordQuality.size}px ${config.fonts.chordQuality.family}`;

    // Offset Y to create superscript effect
    const qualityY = y - (config.fonts.chordRoot.size * 0.25);

    ctx.fillText(chord.quality, currentX, qualityY);
    currentX += ctx.measureText(chord.quality).width;
  }

  // Render slash and bass note
  if (chord.bass) {
    // Slash in root font
    ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
    ctx.fillText('/', currentX, y);
    currentX += ctx.measureText('/').width;

    // Bass note
    ctx.fillText(chord.bass, currentX, y);
    currentX += ctx.measureText(chord.bass).width;
  }

  return currentX - x;
}

/**
 * Calculate the width of a chord without rendering.
 */
export function measureChordWidth(
  ctx: CanvasRenderingContext2D,
  chord: Chord,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  let width = 0;

  // Root width
  ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
  width += ctx.measureText(chord.root).width;

  // Quality width
  if (chord.quality) {
    ctx.font = `${config.fonts.chordQuality.weight} ${config.fonts.chordQuality.size}px ${config.fonts.chordQuality.family}`;
    width += ctx.measureText(chord.quality).width;
  }

  // Bass width
  if (chord.bass) {
    ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
    width += ctx.measureText('/' + chord.bass).width;
  }

  return width;
}

/**
 * Render a row of chords (for chord-only lines).
 * In full mode: distributes chords evenly across the available width.
 * In chords mode: uses compact fixed spacing between chords.
 */
export function renderChordRow(
  ctx: CanvasRenderingContext2D,
  chords: Chord[],
  x: number,
  y: number,
  availableWidth: number,
  config: RenderConfig = DEFAULT_CONFIG
): void {
  if (chords.length === 0) return;

  if (chords.length === 1) {
    // Single chord, render at start
    renderChord(ctx, chords[0], x, y, config);
    return;
  }

  // Calculate total chord widths
  const chordWidths = chords.map(c => measureChordWidth(ctx, c, config));
  const totalChordWidth = chordWidths.reduce((a, b) => a + b, 0);

  // Calculate spacing between chords
  // In chords-only mode, use compact fixed spacing
  // In full mode, distribute evenly across width
  const displayMode = config.displayMode || 'full';
  const compactSpacing = 24; // Fixed spacing between chords in chords-only mode
  const remainingSpace = availableWidth - totalChordWidth;
  const spacing = displayMode === 'chords'
    ? compactSpacing
    : remainingSpace / chords.length;

  // Render each chord
  let currentX = x;
  for (let i = 0; i < chords.length; i++) {
    renderChord(ctx, chords[i], currentX, y, config);
    currentX += chordWidths[i] + spacing;
  }
}

/**
 * Result of laying out chords above lyrics.
 * Contains adjusted chord positions and stretched lyrics.
 */
export interface ChordLyricLayout {
  chordPositions: { chord: Chord; xPos: number }[];
  lyricSegments: { text: string; xPos: number }[];
}

/**
 * Calculate chord positions and stretch lyrics to prevent overlap.
 * Returns layout info for both chords and lyrics.
 */
export function layoutChordsAndLyrics(
  ctx: CanvasRenderingContext2D,
  chords: { chord: Chord; position: number }[],
  lyrics: string,
  x: number,
  config: RenderConfig = DEFAULT_CONFIG
): ChordLyricLayout {
  if (chords.length === 0) {
    return {
      chordPositions: [],
      lyricSegments: [{ text: lyrics, xPos: x }]
    };
  }

  // Sort chords by position
  const sortedChords = [...chords].sort((a, b) => a.position - b.position);

  ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;

  const minGap = 8;
  const chordPositions: { chord: Chord; xPos: number; width: number; charPos: number }[] = [];
  const lyricSegments: { text: string; xPos: number }[] = [];

  let currentX = x;

  // Process each chord and the lyrics before it
  for (let i = 0; i < sortedChords.length; i++) {
    const cp = sortedChords[i];
    const prevCharPos = i === 0 ? 0 : sortedChords[i - 1].position;
    const segmentText = lyrics.substring(prevCharPos, cp.position);

    // Add lyric segment
    if (segmentText) {
      lyricSegments.push({ text: segmentText, xPos: currentX });
      currentX += ctx.measureText(segmentText).width;
    }

    // Calculate chord width
    const chordWidth = measureChordWidth(ctx, cp.chord, config);

    // Check if chord overlaps with previous
    if (chordPositions.length > 0) {
      const prev = chordPositions[chordPositions.length - 1];
      const minX = prev.xPos + prev.width + minGap;
      if (currentX < minX) {
        // Add extra space to lyrics
        const extraSpace = minX - currentX;
        currentX = minX;
      }
    }

    chordPositions.push({
      chord: cp.chord,
      xPos: currentX,
      width: chordWidth,
      charPos: cp.position
    });
  }

  // Add remaining lyrics after last chord
  const lastChordPos = sortedChords[sortedChords.length - 1].position;
  const remainingText = lyrics.substring(lastChordPos);
  if (remainingText) {
    lyricSegments.push({ text: remainingText, xPos: currentX });
  }

  return {
    chordPositions: chordPositions.map(cp => ({ chord: cp.chord, xPos: cp.xPos })),
    lyricSegments
  };
}

/**
 * Render chords above a lyric line, stretching lyrics to prevent chord overlap.
 * Returns the stretched lyrics X positions for the SectionRenderer to use.
 */
export function renderChordsAboveLyrics(
  ctx: CanvasRenderingContext2D,
  chords: { chord: Chord; position: number }[],
  lyrics: string,
  x: number,
  chordY: number,
  lyricY: number,
  config: RenderConfig = DEFAULT_CONFIG
): void {
  if (chords.length === 0) return;

  const layout = layoutChordsAndLyrics(ctx, chords, lyrics, x, config);

  // Render chords
  for (const cp of layout.chordPositions) {
    renderChord(ctx, cp.chord, cp.xPos, chordY, config);
  }

  // Render stretched lyrics
  ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
  ctx.fillStyle = config.colors.textSecondary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (const seg of layout.lyricSegments) {
    ctx.fillText(seg.text, seg.xPos, lyricY);
  }
}

/**
 * Calculate positions for chords that don't have explicit lyric positions.
 * Used for instrumental sections where chords are evenly distributed.
 */
export function calculateEvenChordPositions(
  chordCount: number,
  availableWidth: number
): number[] {
  if (chordCount <= 0) return [];
  if (chordCount === 1) return [0];

  const positions: number[] = [];
  const segmentWidth = availableWidth / chordCount;

  for (let i = 0; i < chordCount; i++) {
    positions.push(i * segmentWidth);
  }

  return positions;
}

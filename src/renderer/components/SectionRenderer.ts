/**
 * Section Renderer Component
 *
 * Renders a complete section including:
 * - Badge with abbreviation
 * - Section name with horizontal rule
 * - Dynamics note (right-aligned, muted)
 * - Chord and lyric lines
 */

import { Section, Line } from '../../types';
import { RenderConfig, DEFAULT_CONFIG } from '../types';
import { getSectionDisplayName, getSectionAbbreviation } from '../layout';
import { renderChord, measureChordWidth, renderChordRow, renderChordsAboveLyrics } from './ChordRenderer';

export interface SectionRenderOptions {
  /** X position of the section */
  x: number;
  /** Y position of the section */
  y: number;
  /** Available width for the section */
  width: number;
}

/**
 * Render the section badge (filled circle with abbreviation).
 */
function renderBadge(
  ctx: CanvasRenderingContext2D,
  abbreviation: string,
  x: number,
  y: number,
  config: RenderConfig
): number {
  const radius = config.badgeRadius;
  const centerX = x + radius;
  const centerY = y + radius;

  // Draw filled circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = config.colors.badgeFill;
  ctx.fill();

  // Draw abbreviation
  ctx.font = `${config.fonts.roadmapBadge.weight} ${config.fonts.roadmapBadge.size}px ${config.fonts.roadmapBadge.family}`;
  ctx.fillStyle = config.colors.badgeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(abbreviation, centerX, centerY);

  return radius * 2;
}

/**
 * Render the section header (badge + name + horizontal rule).
 */
function renderSectionHeader(
  ctx: CanvasRenderingContext2D,
  section: Section,
  options: SectionRenderOptions,
  config: RenderConfig
): number {
  const { x, y, width } = options;
  const abbreviation = getSectionAbbreviation(section);
  const displayName = getSectionDisplayName(section);

  // Render badge
  const badgeWidth = renderBadge(ctx, abbreviation, x, y, config);

  // Render section name
  const nameX = x + badgeWidth + 8;
  const nameY = y + config.badgeRadius + 4; // Vertically center with badge

  ctx.font = `${config.fonts.sectionName.weight} ${config.fonts.sectionName.size}px ${config.fonts.sectionName.family}`;
  ctx.fillStyle = config.colors.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayName, nameX, nameY);

  const nameWidth = ctx.measureText(displayName).width;

  // Render horizontal rule
  const ruleStartX = nameX + nameWidth + 10;
  const ruleEndX = x + width;
  const ruleY = nameY;

  if (ruleEndX > ruleStartX + 20) {
    ctx.beginPath();
    ctx.moveTo(ruleStartX, ruleY);
    ctx.lineTo(ruleEndX, ruleY);
    ctx.strokeStyle = config.colors.rule;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return config.badgeRadius * 2 + 6; // Height of the header row
}

/**
 * Render dynamics note (right-aligned, muted color).
 */
function renderDynamics(
  ctx: CanvasRenderingContext2D,
  dynamics: string,
  x: number,
  y: number,
  width: number,
  config: RenderConfig
): number {
  ctx.font = `${config.fonts.dynamics.weight} ${config.fonts.dynamics.size}px ${config.fonts.dynamics.family}`;
  ctx.fillStyle = config.colors.textMuted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(dynamics, x + width, y);

  return config.fonts.dynamics.size * config.fonts.dynamics.lineHeight;
}

/**
 * Determine if a line is chord-only (no lyrics or lyrics is whitespace-only).
 */
function isChordOnlyLine(line: Line): boolean {
  return line.chords.length > 0 && (!line.lyrics || line.lyrics.trim() === '');
}

/**
 * Render a single line (chord + lyrics pair).
 * Respects displayMode: 'full', 'chords', or 'lyrics'.
 */
function renderLine(
  ctx: CanvasRenderingContext2D,
  line: Line,
  x: number,
  y: number,
  width: number,
  config: RenderConfig
): number {
  const displayMode = config.displayMode || 'full';
  let currentY = y;
  const hasChords = line.chords.length > 0;
  const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

  // In chords mode, skip lines without chords
  if (displayMode === 'chords' && !hasChords) {
    return 0;
  }

  // In lyrics mode, skip lines without lyrics
  if (displayMode === 'lyrics' && !hasLyrics) {
    return 0;
  }

  // Chords-only mode: render only chords
  if (displayMode === 'chords') {
    const chords = line.chords.map(cp => cp.chord);
    const chordY = currentY + config.fonts.chordRoot.size;
    renderChordRow(ctx, chords, x, chordY, width, config);
    currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
    return currentY - y;
  }

  // Lyrics-only mode: render only lyrics
  if (displayMode === 'lyrics') {
    ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(line.lyrics!, x, currentY);
    currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
    return currentY - y;
  }

  // Full mode: render both chords and lyrics
  if (isChordOnlyLine(line)) {
    // Chord-only line: distribute chords evenly
    const chords = line.chords.map(cp => cp.chord);
    const chordY = currentY + config.fonts.chordRoot.size;

    renderChordRow(ctx, chords, x, chordY, width, config);
    currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;

  } else if (hasChords && hasLyrics) {
    // Chords above lyrics - renders both with stretched spacing
    const chordY = currentY + config.fonts.chordRoot.size;
    currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
    currentY += config.spacing.chordToLyric;
    const lyricY = currentY;

    // Render chords and stretched lyrics together
    renderChordsAboveLyrics(ctx, line.chords, line.lyrics!, x, chordY, lyricY, config);
    currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;

  } else if (hasLyrics) {
    // Lyrics only (no chords on this line)
    ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(line.lyrics!, x, currentY);
    currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;

  } else if (hasChords) {
    // Chords only (should be caught by isChordOnlyLine, but just in case)
    const chords = line.chords.map(cp => cp.chord);
    const chordY = currentY + config.fonts.chordRoot.size;
    renderChordRow(ctx, chords, x, chordY, width, config);
    currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
  }

  return currentY - y;
}

/**
 * Render a complete section.
 * In chords-only mode, consolidates all chords into rows of 4.
 */
export function renderSection(
  ctx: CanvasRenderingContext2D,
  section: Section,
  options: SectionRenderOptions,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  const { x, y, width } = options;
  let currentY = y;
  const displayMode = config.displayMode || 'full';

  // Render section header
  const headerHeight = renderSectionHeader(ctx, section, options, config);
  currentY += headerHeight;

  // Render dynamics note if present
  if (section.dynamics) {
    // Position dynamics on same row as header, right-aligned
    renderDynamics(ctx, section.dynamics, x, y + 4, width, config);
    currentY += 4; // Small gap after header for dynamics
  }

  // In chords-only mode, consolidate all chords into rows of 4
  if (displayMode === 'chords') {
    const allChords: import('../../types').Chord[] = [];
    for (const line of section.lines) {
      if (line.chords && line.chords.length > 0) {
        for (const cp of line.chords) {
          allChords.push(cp.chord);
        }
      }
    }

    const chordsPerRow = 4;
    let renderedRowCount = 0;
    for (let i = 0; i < allChords.length; i += chordsPerRow) {
      const rowChords = allChords.slice(i, i + chordsPerRow);

      if (renderedRowCount > 0) {
        currentY += 2; // Compact line spacing for chord rows
      }

      const chordY = currentY + config.fonts.chordRoot.size;
      renderChordRow(ctx, rowChords, x, chordY, width, config);
      currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      renderedRowCount++;
    }

    return currentY - y;
  }

  // Full or lyrics mode: render each line normally
  let renderedLineCount = 0;
  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    const hasChords = line.chords && line.chords.length > 0;
    const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

    // Skip lines that won't render in this mode
    if (displayMode === 'lyrics' && !hasLyrics) continue;

    // Add spacing between lines (before the line, not after)
    if (renderedLineCount > 0) {
      currentY += config.spacing.betweenLines;
    }

    const lineHeight = renderLine(ctx, line, x, currentY, width, config);
    currentY += lineHeight;
    renderedLineCount++;
  }

  return currentY - y;
}

/**
 * Calculate the height of a section without rendering.
 * Respects displayMode: 'full', 'chords', or 'lyrics'.
 * Always includes header height - sections are always shown for structure.
 */
export function calculateSectionHeight(
  section: Section,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  const displayMode = config.displayMode || 'full';

  // Always include header height - sections always show for structure
  let height = config.badgeRadius * 2 + 6; // Header height

  if (section.dynamics) {
    height += 4;
  }

  // In chords mode, consolidate all chords into rows of 4
  if (displayMode === 'chords') {
    let totalChords = 0;
    for (const line of section.lines) {
      if (line.chords && line.chords.length > 0) {
        totalChords += line.chords.length;
      }
    }

    const chordsPerRow = 4;
    const rowCount = Math.ceil(totalChords / chordsPerRow);

    for (let i = 0; i < rowCount; i++) {
      if (i > 0) {
        height += 2; // Compact line spacing
      }
      height += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
    }

    return height;
  }

  // Lyrics mode or full mode
  let lineCount = 0;
  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    const hasChords = line.chords.length > 0;
    const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

    // Skip lines based on display mode
    if (displayMode === 'lyrics' && !hasLyrics) continue;

    // Add spacing between lines
    if (lineCount > 0) {
      height += config.spacing.betweenLines;
    }
    lineCount++;

    // Calculate line height based on display mode
    if (displayMode === 'lyrics') {
      height += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
    } else {
      // Full mode
      if (isChordOnlyLine(line)) {
        height += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      } else if (hasChords && hasLyrics) {
        height += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
        height += config.spacing.chordToLyric;
        height += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
      } else if (hasLyrics) {
        height += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
      } else if (hasChords) {
        height += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      }
    }
  }

  return height;
}

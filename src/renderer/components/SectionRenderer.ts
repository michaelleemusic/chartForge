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
 */
function renderLine(
  ctx: CanvasRenderingContext2D,
  line: Line,
  x: number,
  y: number,
  width: number,
  config: RenderConfig
): number {
  let currentY = y;
  const hasChords = line.chords.length > 0;
  const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

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
 */
export function renderSection(
  ctx: CanvasRenderingContext2D,
  section: Section,
  options: SectionRenderOptions,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  const { x, y, width } = options;
  let currentY = y;

  // Render section header
  const headerHeight = renderSectionHeader(ctx, section, options, config);
  currentY += headerHeight;

  // Render dynamics note if present
  if (section.dynamics) {
    // Position dynamics on same row as header, right-aligned
    renderDynamics(ctx, section.dynamics, x, y + 4, width, config);
    currentY += 4; // Small gap after header for dynamics
  }

  // Render each line
  for (let i = 0; i < section.lines.length; i++) {
    const lineHeight = renderLine(ctx, section.lines[i], x, currentY, width, config);
    currentY += lineHeight;

    if (i < section.lines.length - 1) {
      currentY += config.spacing.betweenLines;
    }
  }

  return currentY - y;
}

/**
 * Calculate the height of a section without rendering.
 */
export function calculateSectionHeight(
  section: Section,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  let height = config.badgeRadius * 2 + 6; // Header height

  if (section.dynamics) {
    height += 4;
  }

  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    const hasChords = line.chords.length > 0;
    const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

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

    if (i < section.lines.length - 1) {
      height += config.spacing.betweenLines;
    }
  }

  return height;
}

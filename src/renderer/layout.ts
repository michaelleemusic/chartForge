/**
 * Layout Calculation Module
 *
 * Handles page layout, column flow, and section positioning.
 */

import { Song, Section, Line, SECTION_ABBREVIATIONS, SECTION_NAMES } from '../types';
import { RenderConfig, LayoutResult, LayoutSection, RoadmapEntry, DEFAULT_CONFIG } from './types';

/**
 * Calculate the height needed for a single line (chord + lyric pair).
 */
export function calculateLineHeight(
  line: Line,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  const hasChords = line.chords.length > 0;
  const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

  let height = 0;

  if (hasChords) {
    height += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
  }

  if (hasLyrics) {
    if (hasChords) {
      height += config.spacing.chordToLyric;
    }
    height += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
  }

  // If neither chords nor lyrics, provide minimal spacing for empty lines
  if (!hasChords && !hasLyrics) {
    height = config.spacing.betweenLines;
  }

  return height;
}

/**
 * Calculate the total height needed for a section.
 */
export function calculateSectionHeight(
  section: Section,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  let height = config.spacing.sectionHeaderHeight;

  // Add dynamics note height if present
  if (section.dynamics) {
    height += config.fonts.dynamics.size * config.fonts.dynamics.lineHeight + 4;
  }

  // Add height for each line
  for (let i = 0; i < section.lines.length; i++) {
    height += calculateLineHeight(section.lines[i], config);
    if (i < section.lines.length - 1) {
      height += config.spacing.betweenLines;
    }
  }

  return height;
}

/**
 * Calculate the content area dimensions.
 */
export function calculateContentArea(config: RenderConfig = DEFAULT_CONFIG): {
  width: number;
  height: number;
  columnWidth: number;
  startY: number;
  column1X: number;
  column2X: number;
} {
  const contentWidth = config.page.width - config.margins.left - config.margins.right;
  const columnWidth = (contentWidth - config.columnGap) / 2;

  // Header area: title + artist + metadata lines
  const headerHeight =
    config.fonts.title.size * config.fonts.title.lineHeight +
    config.fonts.artist.size * config.fonts.artist.lineHeight +
    config.spacing.afterHeader;

  // Roadmap area
  const roadmapHeight = config.spacing.roadmapHeight + config.spacing.afterRoadmap;

  const startY = config.margins.top + headerHeight + roadmapHeight;
  const contentHeight = config.page.height - startY - config.margins.bottom;

  return {
    width: contentWidth,
    height: contentHeight,
    columnWidth,
    startY,
    column1X: config.margins.left,
    column2X: config.margins.left + columnWidth + config.columnGap
  };
}

/**
 * Generate roadmap entries from song sections.
 * Groups consecutive identical section types and tracks repeat counts.
 */
export function generateRoadmap(song: Song): RoadmapEntry[] {
  const entries: RoadmapEntry[] = [];
  let currentAbbr = '';
  let currentCount = 0;

  for (const section of song.sections) {
    // Get the abbreviation for this section type
    let abbr = SECTION_ABBREVIATIONS[section.type] || '';

    // Add number suffix for numbered sections
    if (section.number !== undefined && section.number > 0) {
      abbr += section.number;
    }

    // Handle custom sections with labels
    if (section.type === 'custom' && section.label) {
      // Take first 2-3 characters of custom label
      abbr = section.label.substring(0, 2).toUpperCase();
    }

    if (abbr === currentAbbr) {
      currentCount++;
    } else {
      // Push previous entry if exists
      if (currentAbbr) {
        entries.push({
          abbreviation: currentAbbr,
          repeatCount: currentCount > 1 ? currentCount : undefined
        });
      }
      currentAbbr = abbr;
      currentCount = 1;
    }
  }

  // Push final entry
  if (currentAbbr) {
    entries.push({
      abbreviation: currentAbbr,
      repeatCount: currentCount > 1 ? currentCount : undefined
    });
  }

  return entries;
}

/**
 * Get the display name for a section header.
 */
export function getSectionDisplayName(section: Section): string {
  if (section.label) {
    return section.label.toUpperCase();
  }

  let name = SECTION_NAMES[section.type] || section.type.toUpperCase();

  if (section.number !== undefined && section.number > 0) {
    name += ' ' + section.number;
  }

  return name;
}

/**
 * Get the abbreviation for a section badge.
 */
export function getSectionAbbreviation(section: Section): string {
  let abbr = SECTION_ABBREVIATIONS[section.type] || '';

  if (section.number !== undefined && section.number > 0) {
    abbr += section.number;
  }

  if (section.type === 'custom' && section.label) {
    abbr = section.label.substring(0, 2).toUpperCase();
  }

  return abbr;
}

/**
 * Calculate the complete layout for a song.
 * Positions all sections across pages and columns.
 * Sections are NEVER split - they always stay together.
 */
export function calculateLayout(
  song: Song,
  config: RenderConfig = DEFAULT_CONFIG
): LayoutResult {
  const contentArea = calculateContentArea(config);
  const layoutSections: LayoutSection[] = [];

  // Track current position
  let page = 0;
  let column = 0;
  let columnY = 0;

  // Helper to advance to next column or page
  const advanceColumn = () => {
    if (column === 0) {
      column = 1;
      columnY = 0;
    } else {
      page++;
      column = 0;
      columnY = 0;
    }
  };

  for (let i = 0; i < song.sections.length; i++) {
    const section = song.sections[i];
    const sectionHeight = calculateSectionHeight(section, config);

    // If section doesn't fit in remaining space, move to next column/page
    // Exception: if we're at the top of a column, place it anyway (section is just tall)
    if (columnY > 0 && columnY + sectionHeight > contentArea.height) {
      advanceColumn();
    }

    // Place the section
    layoutSections.push({
      sectionIndex: i,
      column,
      y: columnY,
      height: sectionHeight,
      page
    });

    // Advance Y position
    columnY += sectionHeight + config.spacing.betweenSections;

    // If we've exceeded column height after placing, next section goes to new column
    // (This handles the case where a section exactly fills or slightly exceeds)
    if (columnY >= contentArea.height) {
      advanceColumn();
    }
  }

  return {
    pageCount: page + 1,
    sections: layoutSections,
    columnWidth: contentArea.columnWidth,
    columnHeight: contentArea.height,
    contentStartY: contentArea.startY,
    column1X: contentArea.column1X,
    column2X: contentArea.column2X
  };
}

/**
 * Get sections for a specific page.
 */
export function getSectionsForPage(
  layout: LayoutResult,
  pageIndex: number
): LayoutSection[] {
  return layout.sections.filter(s => s.page === pageIndex);
}

/**
 * Calculate the width of a chord string when rendered.
 * This accounts for the root being larger than the quality.
 */
export function estimateChordWidth(
  chord: { root: string; quality?: string; bass?: string },
  config: RenderConfig = DEFAULT_CONFIG
): number {
  // Rough estimation: 0.6 * fontSize for average character width
  const rootWidth = chord.root.length * config.fonts.chordRoot.size * 0.6;
  const qualityWidth = chord.quality
    ? chord.quality.length * config.fonts.chordQuality.size * 0.55
    : 0;
  const bassWidth = chord.bass
    ? (1 + chord.bass.length) * config.fonts.chordRoot.size * 0.6 // "/" + bass
    : 0;

  return rootWidth + qualityWidth + bassWidth + 2; // 2px padding
}

/**
 * Distribute chords evenly across the column width for chord-only lines.
 */
export function distributeChords(
  chordCount: number,
  columnWidth: number,
  config: RenderConfig = DEFAULT_CONFIG
): number[] {
  if (chordCount <= 0) return [];
  if (chordCount === 1) return [0];

  const positions: number[] = [];
  const spacing = columnWidth / chordCount;

  for (let i = 0; i < chordCount; i++) {
    positions.push(i * spacing);
  }

  return positions;
}

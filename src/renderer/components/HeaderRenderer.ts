/**
 * Header Renderer Component
 *
 * Renders the page header with title, artist, page number, and metadata.
 */

import { Song } from '../../types';
import { RenderConfig, DEFAULT_CONFIG } from '../types';

export interface HeaderRenderOptions {
  /** Current page number (1-indexed) */
  pageNumber: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether this is the first page (shows full header) */
  isFirstPage: boolean;
}

/**
 * Render the page header.
 * First page shows full header with title, artist, metadata.
 * Subsequent pages show compact header with title and page number only.
 */
export function renderHeader(
  ctx: CanvasRenderingContext2D,
  song: Song,
  options: HeaderRenderOptions,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  const { pageNumber, totalPages, isFirstPage } = options;
  let y = config.margins.top;

  if (isFirstPage) {
    // Full header on first page

    // Title (left aligned)
    ctx.font = `${config.fonts.title.weight} ${config.fonts.title.size}px ${config.fonts.title.family}`;
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(song.title, config.margins.left, y);

    // Page number (right aligned)
    ctx.font = `${config.fonts.pageNumber.weight} ${config.fonts.pageNumber.size}px ${config.fonts.pageNumber.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'right';
    const pageText = `Page: ${pageNumber}/${totalPages}`;
    ctx.fillText(pageText, config.page.width - config.margins.right, y);

    y += config.fonts.title.size * config.fonts.title.lineHeight;

    // Artist name (left aligned)
    ctx.font = `${config.fonts.artist.weight} ${config.fonts.artist.size}px ${config.fonts.artist.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'left';
    ctx.fillText(song.artist, config.margins.left, y);

    // Metadata (right aligned): Key, Tempo, Meter
    ctx.font = `${config.fonts.metadata.weight} ${config.fonts.metadata.size}px ${config.fonts.metadata.family}`;
    ctx.textAlign = 'right';

    const metaParts: string[] = [];
    if (song.key) {
      metaParts.push(`Key: ${song.key}`);
    }
    if (song.tempo) {
      metaParts.push(`Tempo: ${song.tempo}`);
    }
    if (song.timeSignature) {
      metaParts.push(`Meter: ${song.timeSignature}`);
    }

    const metaText = metaParts.join('  ');
    ctx.fillText(metaText, config.page.width - config.margins.right, y);

    y += config.fonts.artist.size * config.fonts.artist.lineHeight;

  } else {
    // Compact header on subsequent pages

    // Title (left aligned, smaller)
    ctx.font = `bold ${config.fonts.sectionName.size + 4}px ${config.fonts.title.family}`;
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(song.title, config.margins.left, y);

    // Page number (right aligned)
    ctx.font = `${config.fonts.pageNumber.weight} ${config.fonts.pageNumber.size}px ${config.fonts.pageNumber.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'right';
    const pageText = `Page: ${pageNumber}/${totalPages}`;
    ctx.fillText(pageText, config.page.width - config.margins.right, y);

    y += (config.fonts.sectionName.size + 4) * 1.4;
  }

  return y + config.spacing.afterHeader;
}

/**
 * Calculate the height of the header area.
 */
export function calculateHeaderHeight(
  isFirstPage: boolean,
  config: RenderConfig = DEFAULT_CONFIG
): number {
  if (isFirstPage) {
    return (
      config.fonts.title.size * config.fonts.title.lineHeight +
      config.fonts.artist.size * config.fonts.artist.lineHeight +
      config.spacing.afterHeader
    );
  } else {
    return (config.fonts.sectionName.size + 4) * 1.4 + config.spacing.afterHeader;
  }
}

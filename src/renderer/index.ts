/**
 * chartForge Renderer Module
 *
 * Canvas-based chart rendering with MultiTracks-style visual formatting.
 */

// Main renderer class
export { ChartRenderer, createRenderer } from './ChartRenderer';
export type { ChartRendererOptions } from './ChartRenderer';

// Types and configuration
export {
  DEFAULT_CONFIG
} from './types';
export type {
  Dimensions,
  Margins,
  FontConfig,
  ColorScheme,
  RenderConfig,
  RenderedElement,
  LayoutSection,
  LayoutResult,
  RoadmapEntry
} from './types';

// Layout utilities
export {
  calculateLineHeight,
  calculateSectionHeight,
  calculateContentArea,
  generateRoadmap,
  getSectionDisplayName,
  getSectionAbbreviation,
  calculateLayout,
  getSectionsForPage,
  estimateChordWidth,
  distributeChords
} from './layout';

// Component renderers (for advanced usage)
export {
  renderHeader,
  calculateHeaderHeight,
  renderRoadmap,
  calculateRoadmapWidth,
  renderChord,
  measureChordWidth,
  renderChordRow,
  renderChordsAboveLyrics,
  calculateEvenChordPositions,
  renderSection
} from './components';
export type {
  HeaderRenderOptions,
  RoadmapRenderOptions,
  SectionRenderOptions
} from './components';

/**
 * Renderer Type Definitions
 *
 * Configuration and types for canvas-based chart rendering.
 */

/**
 * Display mode for chart rendering.
 * - 'full': Show both chords and lyrics (default)
 * - 'chords': Show only chords, no lyrics
 * - 'lyrics': Show only lyrics, no chords
 */
export type DisplayMode = 'full' | 'chords' | 'lyrics';

/**
 * Dimensions in pixels for the rendered chart.
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Page margins in pixels.
 */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Font configuration for different text elements.
 */
export interface FontConfig {
  family: string;
  size: number;
  weight: string;
  lineHeight: number;
}

/**
 * Color scheme for the chart.
 */
export interface ColorScheme {
  /** Background color */
  background: string;
  /** Primary text color (title, chords) */
  text: string;
  /** Secondary text color (lyrics, page numbers) */
  textSecondary: string;
  /** Muted text color (dynamics notes) */
  textMuted: string;
  /** Section badge circle fill */
  badgeFill: string;
  /** Section badge text color */
  badgeText: string;
  /** Horizontal rule color */
  rule: string;
  /** Roadmap badge outline for inactive sections */
  roadmapInactive: string;
}

/**
 * Complete rendering configuration.
 */
export interface RenderConfig {
  /** Display mode: 'full', 'chords', or 'lyrics' */
  displayMode: DisplayMode;
  /** Page dimensions */
  page: Dimensions;
  /** Page margins */
  margins: Margins;
  /** Column gap in pixels */
  columnGap: number;
  /** Font configurations */
  fonts: {
    title: FontConfig;
    artist: FontConfig;
    metadata: FontConfig;
    sectionName: FontConfig;
    chordRoot: FontConfig;
    chordQuality: FontConfig;
    lyrics: FontConfig;
    dynamics: FontConfig;
    roadmapBadge: FontConfig;
    pageNumber: FontConfig;
  };
  /** Color scheme */
  colors: ColorScheme;
  /** Section badge radius */
  badgeRadius: number;
  /** Roadmap badge radius */
  roadmapBadgeRadius: number;
  /** Spacing between elements */
  spacing: {
    /** Space after header */
    afterHeader: number;
    /** Space after roadmap */
    afterRoadmap: number;
    /** Space between sections */
    betweenSections: number;
    /** Space between lines in a section */
    betweenLines: number;
    /** Space between chord and lyric */
    chordToLyric: number;
    /** Section header height */
    sectionHeaderHeight: number;
    /** Roadmap height */
    roadmapHeight: number;
  };
}

/**
 * A positioned element ready for rendering.
 */
export interface RenderedElement {
  type: 'text' | 'badge' | 'line' | 'chord';
  x: number;
  y: number;
  content?: string;
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** For badges */
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** For lines */
  x2?: number;
  y2?: number;
}

/**
 * A section positioned on the page with calculated dimensions.
 */
export interface LayoutSection {
  /** Index in original song sections array */
  sectionIndex: number;
  /** Column (0 or 1) */
  column: number;
  /** Y position within the column */
  y: number;
  /** Total height of the section */
  height: number;
  /** Page number (0-indexed) */
  page: number;
}

/**
 * Result of layout calculation.
 */
export interface LayoutResult {
  /** Total number of pages */
  pageCount: number;
  /** Positioned sections */
  sections: LayoutSection[];
  /** Content area dimensions per column */
  columnWidth: number;
  columnHeight: number;
  /** Starting positions */
  contentStartY: number;
  column1X: number;
  column2X: number;
}

/**
 * Information needed for roadmap display.
 */
export interface RoadmapEntry {
  /** Section abbreviation */
  abbreviation: string;
  /** Repeat count (undefined or 1 means no superscript) */
  repeatCount?: number;
  /** Whether this section is currently active (for highlighting) */
  isActive?: boolean;
}

/**
 * Default rendering configuration matching MultiTracks style.
 */
export const DEFAULT_CONFIG: RenderConfig = {
  displayMode: 'full',
  page: {
    width: 816,  // 8.5" at 96 DPI
    height: 1056 // 11" at 96 DPI
  },
  margins: {
    top: 40,
    right: 40,
    bottom: 60,
    left: 40
  },
  columnGap: 30,
  fonts: {
    title: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 28,
      weight: 'bold',
      lineHeight: 1.2
    },
    artist: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 14,
      weight: 'normal',
      lineHeight: 1.4
    },
    metadata: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 12,
      weight: 'normal',
      lineHeight: 1.4
    },
    sectionName: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 13,
      weight: 'bold',
      lineHeight: 1.4
    },
    chordRoot: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 14,
      weight: 'bold',
      lineHeight: 1.3
    },
    chordQuality: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 10,
      weight: 'normal',
      lineHeight: 1.3
    },
    lyrics: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 13,
      weight: 'normal',
      lineHeight: 1.4
    },
    dynamics: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 11,
      weight: '300',
      lineHeight: 1.4
    },
    roadmapBadge: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 10,
      weight: 'normal',
      lineHeight: 1
    },
    pageNumber: {
      family: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
      size: 12,
      weight: 'normal',
      lineHeight: 1.4
    }
  },
  colors: {
    background: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#333333',
    textMuted: '#888888',
    badgeFill: '#4a4a4a',
    badgeText: '#ffffff',
    rule: '#cccccc',
    roadmapInactive: '#666666'
  },
  badgeRadius: 11,
  roadmapBadgeRadius: 12,
  spacing: {
    afterHeader: 15,
    afterRoadmap: 20,
    betweenSections: 18,
    betweenLines: 4,
    chordToLyric: 2,
    sectionHeaderHeight: 28,
    roadmapHeight: 36
  }
};

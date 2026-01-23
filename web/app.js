// chartForge App - Main Application JavaScript

// Section abbreviations for roadmap display
const SECTION_ABBREVIATIONS = {
  intro: 'I',
  verse: 'V',
  prechorus: 'Pr',
  halfchorus: 'HC',
  chorus: 'C',
  bridge: 'B',
  breakdown: 'Bd',
  outro: 'O',
  tag: 'Tg',
  instrumental: 'Inst',
  interlude: 'It',
  vamp: 'Vp',
  turnaround: 'T',
  ending: 'E',
  custom: ''
};

const SECTION_NAMES = {
  intro: 'INTRO',
  verse: 'VERSE',
  prechorus: 'PRE CHORUS',
  halfchorus: 'HALF-CHORUS',
  chorus: 'CHORUS',
  bridge: 'BRIDGE',
  breakdown: 'BREAKDOWN',
  outro: 'OUTRO',
  tag: 'TAG',
  instrumental: 'INSTRUMENTAL',
  interlude: 'INTERLUDE',
  vamp: 'VAMP',
  turnaround: 'TURNAROUND',
  ending: 'ENDING',
  custom: ''
};

// Default render configuration
const DEFAULT_CONFIG = {
  displayMode: 'full', // 'full', 'chords', or 'lyrics'
  page: { width: 816, height: 1056 },
  margins: { top: 40, right: 40, bottom: 60, left: 40 },
  columnGap: 30,
  fonts: {
    title: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 28, weight: 'bold', lineHeight: 1.2 },
    artist: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 14, weight: 'normal', lineHeight: 1.4 },
    metadata: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 12, weight: 'normal', lineHeight: 1.4 },
    sectionName: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 13, weight: 'bold', lineHeight: 1.4 },
    chordRoot: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 14, weight: 'bold', lineHeight: 1.3 },
    chordQuality: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 10, weight: 'normal', lineHeight: 1.3 },
    lyrics: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 13, weight: 'normal', lineHeight: 1.4 },
    dynamics: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 11, weight: '300', lineHeight: 1.4 },
    roadmapBadge: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 10, weight: 'normal', lineHeight: 1 },
    pageNumber: { family: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', size: 12, weight: 'normal', lineHeight: 1.4 }
  },
  colors: {
    background: '#ffffff',
    text: '#000000',
    textSecondary: '#222222',
    textMuted: '#666666',
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

// ============================================================================
// ChordPro Parser
// ============================================================================

function parseChordPro(input) {
  const song = {
    title: 'Untitled',
    artist: 'Unknown',
    version: '',
    key: 'C',
    tempo: null,
    timeSignature: '4/4',
    sections: []
  };

  const lines = input.split(/\r?\n/);
  let currentSection = null;
  let pendingDynamics = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse directives
    const directiveMatch = trimmed.match(/^\{(\w+):\s*(.+?)\}$/);
    if (directiveMatch) {
      const [, directive, value] = directiveMatch;
      switch (directive.toLowerCase()) {
        case 'title':
        case 't':
          song.title = value;
          break;
        case 'artist':
        case 'a':
          song.artist = value;
          break;
        case 'key':
        case 'k':
          song.key = value;
          break;
        case 'tempo':
          song.tempo = parseInt(value, 10);
          break;
        case 'time':
          song.timeSignature = value;
          break;
        case 'version':
        case 'v':
          song.version = value;
          break;
        case 'section':
          // Start new section
          const sectionInfo = parseSectionName(value);
          currentSection = {
            type: sectionInfo.type,
            number: sectionInfo.number,
            repeatCount: sectionInfo.repeatCount,
            hasVamp: sectionInfo.hasVamp,
            label: sectionInfo.label,
            dynamics: pendingDynamics,
            lines: []
          };
          pendingDynamics = null;
          song.sections.push(currentSection);
          break;
        case 'dynamics':
          if (currentSection) {
            if (currentSection.lines.length === 0) {
              // Section header dynamics
              currentSection.dynamics = value;
            } else {
              // Mid-section dynamics - add as inline line
              currentSection.lines.push({ type: 'dynamics', text: value });
            }
          } else {
            pendingDynamics = value;
          }
          break;
        case 'key_change':
        case 'keychange':
          // Mid-song key change directive - create as standalone section
          // Save current section if it has content
          if (currentSection && currentSection.lines.length > 0) {
            // Section already in array, just clear reference
            currentSection = null;
          }
          // Track current key for key changes (separate from song.key which stays as original)
          const currentKeyForChange = song._currentKey || song.key;
          // Create key_change as its own section
          const keyChangeSection = {
            type: 'key_change',
            newKey: value.trim(),
            previousKey: currentKeyForChange,
            lines: []
          };
          song.sections.push(keyChangeSection);
          // Track current key internally but don't change song.key (original key)
          song._currentKey = value.trim();
          currentSection = null;
          break;
      }
      continue;
    }

    // Parse chord/lyric lines (preserve leading spaces for alignment)
    if (currentSection && trimmed.includes('[')) {
      const parsedLine = parseChordLine(line.trimEnd());
      currentSection.lines.push(parsedLine);
    } else if (currentSection && !trimmed.startsWith('{')) {
      // Plain lyrics without chords
      currentSection.lines.push({ lyrics: line.trimEnd(), chords: [] });
    }
  }

  return song;
}

function parseSectionName(value) {
  // Check for vamp indicator [Vamp] or [V]
  const vampMatch = value.match(/\s*\[(vamp|v)\]\s*$/i);
  const hasVamp = !!vampMatch;
  let valueWithoutModifier = value.replace(/\s*\[(vamp|v)\]\s*$/i, '').trim();

  // Check for repeat indicator [2x], [3x], etc.
  const repeatMatch = valueWithoutModifier.match(/\s*\[(\d+)x\]\s*$/i);
  const repeatCount = repeatMatch ? parseInt(repeatMatch[1], 10) : undefined;
  const valueWithoutRepeat = valueWithoutModifier.replace(/\s*\[\d+x\]\s*$/i, '').trim();

  // Check for numbered sections (Verse 1, Bridge 2, etc.)
  const numberMatch = valueWithoutRepeat.match(/(\d+)$/);
  const number = numberMatch ? parseInt(numberMatch[1], 10) : undefined;
  const baseName = valueWithoutRepeat.replace(/\s*\d+$/, '').toLowerCase().replace(/\s+/g, '');

  const typeMap = {
    'intro': 'intro',
    'verse': 'verse',
    'prechorus': 'prechorus',
    'pre-chorus': 'prechorus',
    'halfchorus': 'halfchorus',
    'half-chorus': 'halfchorus',
    'chorus': 'chorus',
    'bridge': 'bridge',
    'breakdown': 'breakdown',
    'outro': 'outro',
    'tag': 'tag',
    'instrumental': 'instrumental',
    'interlude': 'interlude',
    'vamp': 'vamp',
    'turnaround': 'turnaround',
    'ending': 'ending'
  };

  return {
    type: typeMap[baseName] || 'custom',
    number,
    repeatCount,
    hasVamp,
    label: typeMap[baseName] ? null : valueWithoutRepeat
  };
}

function parseChordLine(line) {
  const chords = [];
  let lyrics = '';
  let position = 0;
  let i = 0;

  while (i < line.length) {
    if (line[i] === '[') {
      const end = line.indexOf(']', i);
      if (end > i) {
        const chordStr = line.substring(i + 1, end);
        const chord = parseChordString(chordStr);
        chords.push({ chord, position });
        i = end + 1;
        continue;
      }
    }
    lyrics += line[i];
    position++;
    i++;
  }

  return { lyrics: lyrics.trimEnd() || undefined, chords };
}

function parseChordString(str) {
  // First check for number chords (Nashville notation): 1, 2, 42, 6m7, 1/3, etc.
  const numberMatch = str.match(/^([#b]?[1-7])(.*?)(?:\/([#b]?[1-7]))?$/);
  if (numberMatch) {
    const [, root, quality, bass] = numberMatch;
    return {
      root,
      quality: quality || undefined,
      bass: bass || undefined,
      isNumber: true
    };
  }

  // Match letter chords: root, quality, and optional bass note
  const match = str.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return { root: str };

  const [, root, quality, bass] = match;
  return {
    root,
    quality: quality || undefined,
    bass: bass || undefined,
    isNumber: false
  };
}

// ============================================================================
// Chart Renderer
// ============================================================================

class ChartRenderer {
  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
    this.song = null;
    this.layout = null;
    this.pixelRatio = window.devicePixelRatio || 1;
  }

  loadSong(song) {
    this.song = song;
    this.layout = this.calculateLayout();
  }

  calculateLayout() {
    if (!this.song) return null;

    const contentWidth = this.config.page.width - this.config.margins.left - this.config.margins.right;
    const columnWidth = (contentWidth - this.config.columnGap) / 2;

    // Page 1: full header + roadmap
    const headerHeight =
      this.config.fonts.title.size * this.config.fonts.title.lineHeight +
      this.config.fonts.artist.size * this.config.fonts.artist.lineHeight +
      this.config.spacing.afterHeader;
    const roadmapHeight = this.config.spacing.roadmapHeight + this.config.spacing.afterRoadmap;
    const contentStartY = this.config.margins.top + headerHeight + roadmapHeight;
    const columnHeightPage1 = this.config.page.height - contentStartY - this.config.margins.bottom;

    // Pages 2+: compact header only (no roadmap)
    const compactHeaderHeight = (this.config.fonts.sectionName.size + 4) * 1.4 + this.config.spacing.afterHeader;
    const contentStartYContinuation = this.config.margins.top + compactHeaderHeight;
    const columnHeightContinuation = this.config.page.height - contentStartYContinuation - this.config.margins.bottom;

    const sections = [];
    let page = 0;
    let column = 0;
    let columnY = 0;

    const getColumnHeight = () => page === 0 ? columnHeightPage1 : columnHeightContinuation;

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

    for (let i = 0; i < this.song.sections.length; i++) {
      const section = this.song.sections[i];
      const sectionHeight = this.calculateSectionHeight(section);

      // Skip sections with no content for this display mode
      if (sectionHeight === 0) {
        continue;
      }

      // If section doesn't fit and we're not at top, move to next column/page
      if (columnY > 0 && columnY + sectionHeight > getColumnHeight()) {
        advanceColumn();
      }

      sections.push({
        sectionIndex: i,
        column,
        y: columnY,
        height: sectionHeight,
        page
      });

      columnY += sectionHeight + this.config.spacing.betweenSections;

      // If exceeded column height, next section goes to new column
      if (columnY >= getColumnHeight()) {
        advanceColumn();
      }
    }

    return {
      pageCount: page + 1,
      sections,
      columnWidth,
      columnHeightPage1,
      columnHeightContinuation,
      contentStartY,
      contentStartYContinuation,
      column1X: this.config.margins.left,
      column2X: this.config.margins.left + columnWidth + this.config.columnGap
    };
  }

  calculateSectionHeight(section) {
    const displayMode = this.config.displayMode || 'full';

    // Key change sections have fixed height
    if (section.type === 'key_change') {
      return 32; // Fixed height for key change box
    }

    // Compact padding for chords-only mode
    const boxPadding = displayMode === 'chords'
      ? { top: 4, bottom: 6 }
      : { top: 8, bottom: 10 };

    // Always include sections - performers need to see structure
    // (e.g., vocalist needs to know there's an intro even with no lyrics)

    // Header (badge height)
    let height = this.config.badgeRadius * 2;

    // Box padding top
    height += boxPadding.top;

    // Dynamics
    if (section.dynamics) {
      height += this.config.fonts.dynamics.size * this.config.fonts.dynamics.lineHeight + 4;
    }

    // In chords-only mode, consolidate all chords into rows of 4
    if (displayMode === 'chords') {
      // Count total chords
      let totalChords = 0;
      for (const line of section.lines) {
        if (line.chords) {
          totalChords += line.chords.length;
        }
      }

      // Calculate number of rows (4 chords per row)
      const chordsPerRow = 4;
      const rowCount = Math.ceil(totalChords / chordsPerRow);

      // Add height for each row
      for (let i = 0; i < rowCount; i++) {
        if (i > 0) {
          height += 2; // Compact line spacing
        }
        height += this.config.fonts.chordRoot.size * this.config.fonts.chordRoot.lineHeight;
      }
    } else {
      // Full or lyrics mode - calculate line by line
      // Lyrics mode uses half spacing between lines for tighter layout
      const lineSpacing = displayMode === 'lyrics'
        ? this.config.spacing.betweenLines / 2
        : this.config.spacing.betweenLines;
      let lineCount = 0;
      for (let i = 0; i < section.lines.length; i++) {
        const line = section.lines[i];

        // Handle dynamics lines
        if (line.type === 'dynamics') {
          if (lineCount > 0) {
            height += lineSpacing;
          }
          lineCount++;
          height += this.config.fonts.dynamics.size * this.config.fonts.dynamics.lineHeight;
          continue;
        }

        const hasChords = line.chords && line.chords.length > 0;
        const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

        // Skip lines based on display mode
        if (displayMode === 'lyrics' && !hasLyrics) continue;

        // Add spacing between lines
        if (lineCount > 0) {
          height += lineSpacing;
        }
        lineCount++;

        // Calculate line height based on display mode
        if (displayMode === 'lyrics') {
          // Lyrics only - no chord space overhead
          height += this.config.fonts.lyrics.size * this.config.fonts.lyrics.lineHeight;
        } else {
          // Full mode
          const isChordOnly = hasChords && !hasLyrics;
          if (isChordOnly) {
            height += this.config.fonts.chordRoot.size * this.config.fonts.chordRoot.lineHeight;
          } else if (hasChords && hasLyrics) {
            height += this.config.fonts.chordRoot.size * this.config.fonts.chordRoot.lineHeight;
            height += this.config.spacing.chordToLyric;
            height += this.config.fonts.lyrics.size * this.config.fonts.lyrics.lineHeight;
          } else if (hasLyrics) {
            // Lyrics-only line: include chord space for visual consistency
            height += this.config.fonts.chordRoot.size * this.config.fonts.chordRoot.lineHeight;
            height += this.config.spacing.chordToLyric;
            height += this.config.fonts.lyrics.size * this.config.fonts.lyrics.lineHeight;
          }
        }
      }
    }

    // Box padding bottom
    height += boxPadding.bottom;

    return height;
  }

  renderPage(canvas, pageIndex, containerEl = null) {
    if (!this.song || !this.layout) return;

    const { width, height } = this.config.page;
    const aspectRatio = width / height;

    // Calculate display size to fit container while maintaining aspect ratio
    let displayWidth = width;
    let displayHeight = height;

    if (containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const availableWidth = containerRect.width - 40; // padding
      const availableHeight = containerRect.height - 40;

      // Scale to fit container
      const scaleByWidth = availableWidth / width;
      const scaleByHeight = availableHeight / height;
      const scale = Math.min(scaleByWidth, scaleByHeight, 1); // Don't exceed original size

      displayWidth = width * scale;
      displayHeight = height * scale;
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = width * this.pixelRatio;
    canvas.height = height * this.pixelRatio;

    const ctx = canvas.getContext('2d');
    ctx.scale(this.pixelRatio, this.pixelRatio);

    // Clear background
    ctx.fillStyle = this.config.colors.background;
    ctx.fillRect(0, 0, width, height);

    // Render header
    let y = this.renderHeader(ctx, pageIndex);

    // Render roadmap (first page only)
    if (pageIndex === 0) {
      y = this.renderRoadmap(ctx, y);
      y += this.config.spacing.afterRoadmap;
    }

    // Render sections
    // Use actual y from header/roadmap for this page, not the fixed contentStartY
    const pageContentStartY = y;
    const pageSections = this.layout.sections.filter(s => s.page === pageIndex);

    for (const layoutSection of pageSections) {
      const section = this.song.sections[layoutSection.sectionIndex];
      const x = layoutSection.column === 0 ? this.layout.column1X : this.layout.column2X;
      const sectionY = pageContentStartY + layoutSection.y;

      this.renderSection(ctx, section, x, sectionY, this.layout.columnWidth);
    }

    // Footer on first page only
    if (pageIndex === 0) {
      const config = this.config;
      ctx.font = `300 ${config.fonts.metadata.size - 2}px ${config.fonts.metadata.family}`;
      ctx.fillStyle = config.colors.textMuted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('made with proflee.me/chartforge', config.page.width - config.margins.right, config.page.height - 12);
    }
  }

  renderHeader(ctx, pageIndex) {
    const config = this.config;
    let y = config.margins.top;

    if (pageIndex === 0) {
      // Title
      ctx.font = `${config.fonts.title.weight} ${config.fonts.title.size}px ${config.fonts.title.family}`;
      ctx.fillStyle = config.colors.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const displayTitle = this.song.version
        ? `${this.song.title} (${this.song.version})`
        : this.song.title;
      ctx.fillText(displayTitle, config.margins.left, y);

      // Page number
      ctx.font = `${config.fonts.pageNumber.weight} ${config.fonts.pageNumber.size}px ${config.fonts.pageNumber.family}`;
      ctx.fillStyle = config.colors.textSecondary;
      ctx.textAlign = 'right';
      ctx.fillText(`Page: ${pageIndex + 1}/${this.layout.pageCount}`, config.page.width - config.margins.right, y);

      y += config.fonts.title.size * config.fonts.title.lineHeight;

      // Artist
      ctx.font = `${config.fonts.artist.weight} ${config.fonts.artist.size}px ${config.fonts.artist.family}`;
      ctx.fillStyle = config.colors.textSecondary;
      ctx.textAlign = 'left';
      ctx.fillText(this.song.artist, config.margins.left, y);

      // Metadata - render labels normal, values bold
      const metaFont = `${config.fonts.metadata.weight} ${config.fonts.metadata.size}px ${config.fonts.metadata.family}`;
      const metaFontBold = `bold ${config.fonts.metadata.size}px ${config.fonts.metadata.family}`;
      ctx.textAlign = 'right';

      // Build metadata items as label/value pairs
      const metaItems = [];
      if (this.song.key) {
        const keyLabel = this.config.numbersMode ? 'Original Key' : 'Key';
        metaItems.push({ label: `${keyLabel}: `, value: this.song.key.replace(/b/g, '♭').replace(/#/g, '♯') });
      }
      if (this.song.tempo) metaItems.push({ label: 'Tempo: ', value: String(this.song.tempo) });
      if (this.song.timeSignature) metaItems.push({ label: 'Meter: ', value: this.song.timeSignature });

      // Draw from right to left
      let metaX = config.page.width - config.margins.right;
      for (let i = metaItems.length - 1; i >= 0; i--) {
        const item = metaItems[i];
        // Draw value (bold)
        ctx.font = metaFontBold;
        ctx.fillText(item.value, metaX, y);
        metaX -= ctx.measureText(item.value).width;
        // Draw label (normal)
        ctx.font = metaFont;
        ctx.fillText(item.label, metaX, y);
        metaX -= ctx.measureText(item.label).width;
        // Add spacing between items
        if (i > 0) metaX -= ctx.measureText('  ').width;
      }

      y += config.fonts.artist.size * config.fonts.artist.lineHeight;
    } else {
      // Compact header
      ctx.font = `bold ${config.fonts.sectionName.size + 4}px ${config.fonts.title.family}`;
      ctx.fillStyle = config.colors.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const compactTitle = this.song.version
        ? `${this.song.title} (${this.song.version})`
        : this.song.title;
      ctx.fillText(compactTitle, config.margins.left, y);

      ctx.font = `${config.fonts.pageNumber.weight} ${config.fonts.pageNumber.size}px ${config.fonts.pageNumber.family}`;
      ctx.fillStyle = config.colors.textSecondary;
      ctx.textAlign = 'right';
      ctx.fillText(`Page: ${pageIndex + 1}/${this.layout.pageCount}`, config.page.width - config.margins.right, y);

      y += (config.fonts.sectionName.size + 4) * 1.4;
    }

    return y + config.spacing.afterHeader;
  }

  renderRoadmap(ctx, y) {
    const config = this.config;
    const entries = this.generateRoadmap();
    let x = config.margins.left;

    for (const entry of entries) {
      const radius = config.roadmapBadgeRadius;
      const centerY = y + radius;

      // Chorus gets filled circle, others get outline
      const isChorus = entry.sectionType === 'chorus' || entry.sectionType === 'halfchorus';

      ctx.beginPath();
      ctx.arc(x + radius, centerY, radius, 0, Math.PI * 2);
      if (isChorus) {
        ctx.fillStyle = config.colors.roadmapInactive;
        ctx.fill();
      } else {
        ctx.strokeStyle = config.colors.roadmapInactive;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw abbreviation
      ctx.font = `${config.fonts.roadmapBadge.weight} ${config.fonts.roadmapBadge.size}px ${config.fonts.roadmapBadge.family}`;
      ctx.fillStyle = isChorus ? '#ffffff' : config.colors.roadmapInactive;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.abbreviation, x + radius, centerY);

      // Superscript for repeat count or vamp - at top-right of circle
      if (entry.repeatCount > 1 || entry.hasVamp) {
        const superSize = config.fonts.roadmapBadge.size * 0.7;
        ctx.font = `${superSize}px ${config.fonts.roadmapBadge.family}`;

        // Build superscript text
        let superText = '';
        if (entry.repeatCount > 1) superText += entry.repeatCount.toString();
        if (entry.hasVamp) superText += 'v';

        // Position: top-right, overlapping circle edge
        const superCenterX = x + radius + radius * 0.7;
        const superCenterY = y + radius * 0.3;

        // Measure text for background circle
        const textMetrics = ctx.measureText(superText);
        const circleRadius = Math.max(textMetrics.width, superSize) / 2 + 2;

        // Draw white circle background
        ctx.beginPath();
        ctx.arc(superCenterX, superCenterY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = config.colors.background;
        ctx.fill();

        // Draw superscript text centered in circle
        ctx.fillStyle = config.colors.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(superText, superCenterX, superCenterY);
      }

      x += radius * 2 + 10;
    }

    return y + config.spacing.roadmapHeight;
  }

  generateRoadmap() {
    const entries = [];
    let currentAbbr = '';
    let currentType = '';
    let currentCount = 0;
    let currentExplicitRepeat = null;
    let currentHasVamp = false;

    for (const section of this.song.sections) {
      let abbr;

      // Key change sections get arrow based on direction
      if (section.type === 'key_change') {
        const interval = this.formatKeyChangeInterval(section.previousKey, section.newKey);
        abbr = interval.startsWith('↑') ? '↑' : '↓';
      } else {
        abbr = SECTION_ABBREVIATIONS[section.type] || '';
        if (section.number) abbr += section.number;
        if (section.type === 'custom' && section.label) {
          abbr = section.label.substring(0, 2).toUpperCase();
        }
      }

      // If section has explicit repeat count or vamp, use that
      const explicitRepeat = section.repeatCount || null;
      const hasVamp = section.hasVamp || false;

      // Key change sections never combine with previous entries
      if (section.type === 'key_change') {
        // Flush current entry
        if (currentAbbr) {
          const repeatCount = currentExplicitRepeat || (currentCount > 1 ? currentCount : null);
          entries.push({ abbreviation: currentAbbr, repeatCount, hasVamp: currentHasVamp, sectionType: currentType });
        }
        // Add key change entry (never combines)
        entries.push({ abbreviation: abbr, repeatCount: null, hasVamp: false, isKeyChange: true, sectionType: 'key_change' });
        currentAbbr = '';
        currentType = '';
        currentCount = 0;
        currentExplicitRepeat = null;
        currentHasVamp = false;
      } else if (abbr === currentAbbr && !explicitRepeat && !currentExplicitRepeat && !hasVamp && !currentHasVamp) {
        // Consecutive same section without explicit repeats or vamp
        currentCount++;
      } else {
        if (currentAbbr) {
          const repeatCount = currentExplicitRepeat || (currentCount > 1 ? currentCount : null);
          entries.push({ abbreviation: currentAbbr, repeatCount, hasVamp: currentHasVamp, sectionType: currentType });
        }
        currentAbbr = abbr;
        currentType = section.type;
        currentCount = 1;
        currentExplicitRepeat = explicitRepeat;
        currentHasVamp = hasVamp;
      }
    }

    if (currentAbbr) {
      const repeatCount = currentExplicitRepeat || (currentCount > 1 ? currentCount : null);
      entries.push({ abbreviation: currentAbbr, repeatCount, hasVamp: currentHasVamp, sectionType: currentType });
    }

    return entries;
  }

  renderSection(ctx, section, x, y, width) {
    const config = this.config;

    // Handle key_change sections specially
    if (section.type === 'key_change') {
      return this.renderKeyChangeSection(ctx, section, x, y, width);
    }

    const boxPadding = { top: 8, right: 8, bottom: 10, left: 8 };
    const cornerRadius = 8;

    // Render badge
    const abbr = this.getSectionAbbreviation(section);
    const badgeRadius = config.badgeRadius;
    const badgeOffset = cornerRadius + 8; // Left margin: after top-left corner + padding

    // Chorus gets dark fill with white text, others get white fill with black text
    const isChorus = section.type === 'chorus' || section.type === 'halfchorus';

    ctx.beginPath();
    ctx.arc(x + badgeOffset + badgeRadius, y + badgeRadius, badgeRadius, 0, Math.PI * 2);
    if (isChorus) {
      ctx.fillStyle = config.colors.badgeFill;
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = config.colors.badgeFill;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.font = `${config.fonts.roadmapBadge.weight} ${config.fonts.roadmapBadge.size}px ${config.fonts.roadmapBadge.family}`;
    ctx.fillStyle = isChorus ? config.colors.badgeText : config.colors.badgeFill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(abbr, x + badgeOffset + badgeRadius, y + badgeRadius);

    // Render section name
    const displayName = this.getSectionDisplayName(section);
    const nameX = x + badgeOffset + badgeRadius * 2 + 8;
    const nameY = y + badgeRadius;

    ctx.font = `${config.fonts.sectionName.weight} ${config.fonts.sectionName.size}px ${config.fonts.sectionName.family}`;
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayName, nameX, nameY);

    const nameWidth = ctx.measureText(displayName).width;
    const ruleStartX = nameX + nameWidth + 10;

    // Content area starts below header
    let currentY = y + badgeRadius * 2 + boxPadding.top;

    // Dynamics (right-aligned, below header)
    if (section.dynamics) {
      ctx.font = `${config.fonts.dynamics.weight} ${config.fonts.dynamics.size}px ${config.fonts.dynamics.family}`;
      ctx.fillStyle = config.colors.textMuted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(section.dynamics, x + width - boxPadding.right, currentY);
      currentY += config.fonts.dynamics.size * config.fonts.dynamics.lineHeight + 4;
    }

    // Render lines with left padding
    const contentX = x + boxPadding.left;
    const contentWidth = width - boxPadding.left - boxPadding.right;
    const displayMode = config.displayMode || 'full';

    // In chords-only mode, consolidate chords into rows of 4
    if (displayMode === 'chords') {
      // Collect all chords from all lines
      const allChords = [];
      for (const line of section.lines) {
        if (line.chords && line.chords.length > 0) {
          for (const cp of line.chords) {
            allChords.push(cp.chord);
          }
        }
      }

      // Group into rows of 4 chords
      const chordsPerRow = 4;
      let renderedRowCount = 0;
      for (let i = 0; i < allChords.length; i += chordsPerRow) {
        const rowChords = allChords.slice(i, i + chordsPerRow);

        if (renderedRowCount > 0) {
          currentY += 2; // Compact line spacing
        }

        const chordY = currentY + config.fonts.chordRoot.size;
        this.renderChordRow(ctx, rowChords, contentX, chordY, contentWidth);
        currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
        renderedRowCount++;
      }
    } else {
      // Full or lyrics mode - render line by line
      // Lyrics mode uses half spacing between lines for tighter layout
      const lineSpacing = displayMode === 'lyrics'
        ? config.spacing.betweenLines / 2
        : config.spacing.betweenLines;
      let renderedLineCount = 0;
      for (let i = 0; i < section.lines.length; i++) {
        const line = section.lines[i];
        const hasChords = line.chords && line.chords.length > 0;
        const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

        // Skip lines based on display mode
        if (displayMode === 'lyrics' && !hasLyrics) continue;

        // Add spacing between lines (before the line, not after)
        if (renderedLineCount > 0) {
          currentY += lineSpacing;
        }

        currentY += this.renderLine(ctx, line, contentX, currentY, contentWidth);
        renderedLineCount++;
      }
    }

    // Add bottom padding
    currentY += boxPadding.bottom;

    // Draw section box with rounded corners
    const boxTop = nameY;
    const boxBottom = currentY;
    const topLeftEnd = x + cornerRadius + 4; // Where top-left corner ends

    ctx.strokeStyle = config.colors.rule;
    ctx.lineWidth = 1;

    // Main box path: top-left corner -> left -> bottom-left -> bottom -> bottom-right -> right -> top-right corner
    ctx.beginPath();

    // Top-left rounded corner
    ctx.moveTo(topLeftEnd, boxTop);
    ctx.quadraticCurveTo(x, boxTop, x, boxTop + cornerRadius);

    // Left side down to bottom
    ctx.lineTo(x, boxBottom - cornerRadius);

    // Bottom-left rounded corner
    ctx.quadraticCurveTo(x, boxBottom, x + cornerRadius, boxBottom);

    // Bottom line
    ctx.lineTo(x + width - cornerRadius, boxBottom);

    // Bottom-right rounded corner
    ctx.quadraticCurveTo(x + width, boxBottom, x + width, boxBottom - cornerRadius);

    // Right side up to top
    ctx.lineTo(x + width, boxTop + cornerRadius);

    // Top-right rounded corner
    ctx.quadraticCurveTo(x + width, boxTop, x + width - cornerRadius, boxTop);

    // Top rule from top-right corner to after section name
    ctx.lineTo(ruleStartX, boxTop);

    ctx.stroke();

    return currentY - y;
  }

  renderLine(ctx, line, x, y, width) {
    const config = this.config;
    const displayMode = config.displayMode || 'full';
    let currentY = y;

    // Handle dynamics lines (mid-section dynamics)
    if (line.type === 'dynamics') {
      ctx.font = `${config.fonts.dynamics.weight} ${config.fonts.dynamics.size}px ${config.fonts.dynamics.family}`;
      ctx.fillStyle = config.colors.textMuted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(line.text, x + width, currentY);
      currentY += config.fonts.dynamics.size * config.fonts.dynamics.lineHeight;
      return currentY - y;
    }

    const hasChords = line.chords && line.chords.length > 0;
    const hasLyrics = line.lyrics && line.lyrics.trim().length > 0;

    // Skip lines based on display mode
    if (displayMode === 'chords' && !hasChords) return 0;
    if (displayMode === 'lyrics' && !hasLyrics) return 0;

    // Chords-only mode: render only chords
    if (displayMode === 'chords') {
      const chordY = currentY + config.fonts.chordRoot.size;
      this.renderChordRow(ctx, line.chords.map(c => c.chord), x, chordY, width);
      currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      return currentY - y;
    }

    // Lyrics-only mode: render lyrics without chord space overhead
    if (displayMode === 'lyrics') {
      ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
      ctx.fillStyle = config.colors.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(line.lyrics, x, currentY);
      currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
      return currentY - y;
    }

    // Full mode: render both
    const isChordOnly = hasChords && !hasLyrics;

    if (isChordOnly) {
      // Chord-only line
      const chordY = currentY + config.fonts.chordRoot.size;
      this.renderChordRow(ctx, line.chords.map(c => c.chord), x, chordY, width);
      currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;

    } else if (hasChords && hasLyrics) {
      // Chords above lyrics - renders both with stretched spacing
      const chordY = currentY + config.fonts.chordRoot.size;
      currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      currentY += config.spacing.chordToLyric;
      const lyricY = currentY;

      this.renderChordsAboveLyrics(ctx, line.chords, line.lyrics, x, chordY, lyricY);
      currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;

    } else if (hasLyrics) {
      // Lyrics-only line: include chord space for visual consistency
      currentY += config.fonts.chordRoot.size * config.fonts.chordRoot.lineHeight;
      currentY += config.spacing.chordToLyric;
      ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
      ctx.fillStyle = config.colors.textSecondary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(line.lyrics, x, currentY);
      currentY += config.fonts.lyrics.size * config.fonts.lyrics.lineHeight;
    }

    return currentY - y;
  }

  // Convert accidentals to Unicode symbols for display
  formatAccidentals(str) {
    return str.replace(/b/g, '♭').replace(/#/g, '♯');
  }

  renderChord(ctx, chord, x, y) {
    const config = this.config;
    let currentX = x;

    // Check if this is a band note (e.g., "(Out)", "(last time hold)")
    const isBandNote = chord.root.startsWith('(') && chord.root.endsWith(')');

    if (isBandNote) {
      // Render band notes in lighter italic style
      ctx.font = `italic ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
      ctx.fillStyle = config.colors.textMuted;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(chord.root, currentX, y);
      currentX += ctx.measureText(chord.root).width;
      return currentX - x;
    }

    const displayRoot = this.formatAccidentals(chord.root);
    ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayRoot, currentX, y);
    currentX += ctx.measureText(displayRoot).width;

    if (chord.quality) {
      const displayQuality = this.formatAccidentals(chord.quality);
      ctx.font = `${config.fonts.chordQuality.weight} ${config.fonts.chordQuality.size}px ${config.fonts.chordQuality.family}`;
      const qualityY = y - (config.fonts.chordRoot.size * 0.25);
      ctx.fillText(displayQuality, currentX, qualityY);
      currentX += ctx.measureText(displayQuality).width;
    }

    if (chord.bass) {
      const displayBass = '/' + this.formatAccidentals(chord.bass);
      ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
      ctx.fillText(displayBass, currentX, y);
      currentX += ctx.measureText(displayBass).width;
    }

    return currentX - x;
  }

  measureChordWidth(ctx, chord) {
    const config = this.config;
    let width = 0;

    // Check if this is a band note
    const isBandNote = chord.root.startsWith('(') && chord.root.endsWith(')');

    if (isBandNote) {
      ctx.font = `italic ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
      return ctx.measureText(chord.root).width;
    }

    const displayRoot = this.formatAccidentals(chord.root);
    ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
    width += ctx.measureText(displayRoot).width;

    if (chord.quality) {
      const displayQuality = this.formatAccidentals(chord.quality);
      ctx.font = `${config.fonts.chordQuality.weight} ${config.fonts.chordQuality.size}px ${config.fonts.chordQuality.family}`;
      width += ctx.measureText(displayQuality).width;
    }

    if (chord.bass) {
      const displayBass = '/' + this.formatAccidentals(chord.bass);
      ctx.font = `${config.fonts.chordRoot.weight} ${config.fonts.chordRoot.size}px ${config.fonts.chordRoot.family}`;
      width += ctx.measureText(displayBass).width;
    }

    return width;
  }

  /**
   * Calculate the interval between two keys with full interval names.
   * Returns formatted string like "↑ Whole Step" or "↓ Minor 3rd".
   */
  getKeyChangeIntervalFull(fromKey, toKey) {
    // Get root notes (strip 'm' suffix for minor keys)
    const fromRoot = fromKey.replace(/m$/, '');
    const toRoot = toKey.replace(/m$/, '');

    const fromIndex = getNoteIndex(fromRoot);
    const toIndex = getNoteIndex(toRoot);

    if (fromIndex === -1 || toIndex === -1) return '?';

    // Calculate semitone distance going up
    const semitonesUp = ((toIndex - fromIndex) + 12) % 12;

    if (semitonesUp === 0) return 'Same Key';

    // Determine direction: ≤6 semitones = up, >6 = down
    let semitones, direction;
    if (semitonesUp <= 6) {
      semitones = semitonesUp;
      direction = 'up';
    } else {
      semitones = 12 - semitonesUp;
      direction = 'down';
    }

    // Map semitones to full interval names
    const intervalNames = {
      1: 'Half Step',
      2: 'Whole Step',
      3: 'Minor 3rd',
      4: 'Major 3rd',
      5: 'Perfect 4th',
      6: 'Tritone',
    };

    const arrow = direction === 'up' ? '↑' : '↓';
    const intervalName = intervalNames[semitones] || semitones + ' semitones';
    return arrow + ' ' + intervalName;
  }

  /**
   * Calculate the interval between two keys for key change display.
   * Returns formatted string like "↑W" (up whole step) or "↓m3" (down minor 3rd).
   */
  formatKeyChangeInterval(fromKey, toKey) {
    // Get root notes (strip 'm' suffix for minor keys)
    const fromRoot = fromKey.replace(/m$/, '');
    const toRoot = toKey.replace(/m$/, '');

    const fromIndex = getNoteIndex(fromRoot);
    const toIndex = getNoteIndex(toRoot);

    if (fromIndex === -1 || toIndex === -1) return '?';

    // Calculate semitone distance going up
    const semitonesUp = ((toIndex - fromIndex) + 12) % 12;

    if (semitonesUp === 0) return '=';

    // Determine direction: ≤6 semitones = up, >6 = down
    let semitones, direction;
    if (semitonesUp <= 6) {
      semitones = semitonesUp;
      direction = 'up';
    } else {
      semitones = 12 - semitonesUp;
      direction = 'down';
    }

    // Map semitones to interval names
    const intervalNames = {
      1: '½',   // half step
      2: 'W',   // whole step
      3: 'm3',  // minor 3rd
      4: 'M3',  // major 3rd
      5: 'P4',  // perfect 4th
      6: 'b5',  // tritone
    };

    const arrow = direction === 'up' ? '↑' : '↓';
    const intervalName = intervalNames[semitones] || String(semitones);
    return arrow + intervalName;
  }

  /**
   * Render a key change as a standalone section with full-width shaded box.
   */
  renderKeyChangeSection(ctx, section, x, y, width) {
    const config = this.config;
    const boxHeight = 28;
    const boxPadding = 12;
    const cornerRadius = 6;

    // Determine display text based on mode
    let displayText;
    if (config.numbersMode) {
      // Numbers mode: show interval with full names
      const intervalInfo = this.getKeyChangeIntervalFull(section.previousKey, section.newKey);
      displayText = 'Key Change: ' + intervalInfo;
    } else {
      // Letter mode: show "Key Change: C → D"
      const fromKey = this.formatAccidentals(section.previousKey);
      const toKey = this.formatAccidentals(section.newKey);
      displayText = 'Key Change: ' + fromKey + ' → ' + toKey;
    }

    // Draw full-width rounded rectangle with fill
    const boxX = x;
    const boxY = y;

    ctx.beginPath();
    ctx.moveTo(boxX + cornerRadius, boxY);
    ctx.lineTo(boxX + width - cornerRadius, boxY);
    ctx.quadraticCurveTo(boxX + width, boxY, boxX + width, boxY + cornerRadius);
    ctx.lineTo(boxX + width, boxY + boxHeight - cornerRadius);
    ctx.quadraticCurveTo(boxX + width, boxY + boxHeight, boxX + width - cornerRadius, boxY + boxHeight);
    ctx.lineTo(boxX + cornerRadius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - cornerRadius);
    ctx.lineTo(boxX, boxY + cornerRadius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
    ctx.closePath();

    // Light fill with border
    ctx.fillStyle = '#f5f5f5';
    ctx.fill();
    ctx.strokeStyle = config.colors.rule;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text centered in box
    ctx.font = `bold ${config.fonts.sectionName.size}px ${config.fonts.sectionName.family}`;
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, boxX + width / 2, boxY + boxHeight / 2);

    return boxHeight;
  }

  /**
   * Render a key change box (inline within section - legacy, kept for compatibility).
   * - In letter mode: "New Key: G"
   * - In numbers mode: interval like "↑W" or "↓m3"
   */
  renderKeyChange(ctx, line, x, y, width) {
    const config = this.config;
    const boxHeight = 24;
    const boxPadding = 8;
    const cornerRadius = 4;

    // Determine display text based on mode
    let displayText;
    if (config.numbersMode) {
      // Numbers mode: show interval
      displayText = this.formatKeyChangeInterval(line.previousKey, line.newKey);
    } else {
      // Letter mode: show "New Key: X" with unicode accidentals
      const displayKey = this.formatAccidentals(line.newKey);
      displayText = 'New Key: ' + displayKey;
    }

    // Measure text width
    ctx.font = `bold ${config.fonts.sectionName.size}px ${config.fonts.sectionName.family}`;
    const textWidth = ctx.measureText(displayText).width;
    const boxWidth = textWidth + boxPadding * 2;

    // Draw rounded rectangle border
    const boxX = x;
    const boxY = y;

    ctx.beginPath();
    ctx.moveTo(boxX + cornerRadius, boxY);
    ctx.lineTo(boxX + boxWidth - cornerRadius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + cornerRadius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - cornerRadius, boxY + boxHeight);
    ctx.lineTo(boxX + cornerRadius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - cornerRadius);
    ctx.lineTo(boxX, boxY + cornerRadius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
    ctx.closePath();

    ctx.strokeStyle = config.colors.rule;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text centered in box
    ctx.fillStyle = config.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, boxX + boxWidth / 2, boxY + boxHeight / 2);

    return boxHeight;
  }

  renderChordRow(ctx, chords, x, y, width) {
    if (chords.length === 0) return;
    if (chords.length === 1) {
      this.renderChord(ctx, chords[0], x, y);
      return;
    }

    const chordWidths = chords.map(c => this.measureChordWidth(ctx, c));
    const totalWidth = chordWidths.reduce((a, b) => a + b, 0);

    // In chords-only mode, use compact fixed spacing
    // In full mode, distribute evenly across width
    const displayMode = this.config.displayMode || 'full';
    const compactSpacing = 24; // Fixed spacing between chords in chords-only mode
    const spacing = displayMode === 'chords'
      ? compactSpacing
      : (width - totalWidth) / chords.length;

    let currentX = x;
    for (let i = 0; i < chords.length; i++) {
      this.renderChord(ctx, chords[i], currentX, y);
      currentX += chordWidths[i] + spacing;
    }
  }

  renderChordsAboveLyrics(ctx, chordPositions, lyrics, x, chordY, lyricY) {
    const config = this.config;

    // Sort by position
    const sorted = [...chordPositions].sort((a, b) => a.position - b.position);

    ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;

    const minGap = 8;
    const positions = [];
    const segments = [];
    let currentX = x;

    // Calculate positions with overlap prevention
    for (let i = 0; i < sorted.length; i++) {
      const cp = sorted[i];
      const prevPos = i === 0 ? 0 : sorted[i - 1].position;
      const segmentText = lyrics.substring(prevPos, cp.position);

      if (segmentText) {
        ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
        segments.push({ text: segmentText, xPos: currentX });
        currentX += ctx.measureText(segmentText).width;
      }

      const chordWidth = this.measureChordWidth(ctx, cp.chord);

      // Check overlap with previous chord
      if (positions.length > 0) {
        const prev = positions[positions.length - 1];
        const minX = prev.xPos + prev.width + minGap;
        if (currentX < minX) {
          currentX = minX;
        }
      }

      positions.push({ chord: cp.chord, xPos: currentX, width: chordWidth });
    }

    // Add remaining lyrics
    if (sorted.length > 0) {
      const lastPos = sorted[sorted.length - 1].position;
      const remaining = lyrics.substring(lastPos);
      if (remaining) {
        segments.push({ text: remaining, xPos: currentX });
      }
    }

    // Render chords
    for (const p of positions) {
      this.renderChord(ctx, p.chord, p.xPos, chordY);
    }

    // Render stretched lyrics
    ctx.font = `${config.fonts.lyrics.weight} ${config.fonts.lyrics.size}px ${config.fonts.lyrics.family}`;
    ctx.fillStyle = config.colors.textSecondary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (const seg of segments) {
      ctx.fillText(seg.text, seg.xPos, lyricY);
    }
  }

  getSectionAbbreviation(section) {
    // Key change sections use arrow based on direction
    if (section.type === 'key_change') {
      const interval = this.formatKeyChangeInterval(section.previousKey, section.newKey);
      return interval.startsWith('↑') ? '↑' : '↓';
    }

    let abbr = SECTION_ABBREVIATIONS[section.type] || '';
    if (section.number) abbr += section.number;
    if (section.type === 'custom' && section.label) {
      abbr = section.label.substring(0, 2).toUpperCase();
    }
    return abbr;
  }

  getSectionDisplayName(section) {
    // Key change sections show the key or interval
    if (section.type === 'key_change') {
      if (this.config.numbersMode) {
        return this.formatKeyChangeInterval(section.previousKey, section.newKey);
      } else {
        return this.formatAccidentals(section.newKey);
      }
    }

    let name;
    if (section.label) {
      name = section.label.toUpperCase();
    } else {
      name = SECTION_NAMES[section.type] || section.type.toUpperCase();
      if (section.number) name += ' ' + section.number;
    }
    // Add repeat/vamp indicators
    if (section.repeatCount > 1) name += ` [${section.repeatCount}x]`;
    if (section.hasVamp) name += ' [Vamp]';
    return name;
  }
}

// ============================================================================
// Application UI
// ============================================================================

// DOM Elements
const inputEl = document.getElementById('input');
const backdropEl = document.getElementById('backdrop');
const highlightEl = document.getElementById('highlight');
const canvas = document.getElementById('chart-canvas');
const previewContainer = document.querySelector('.preview-container');
const errorEl = document.getElementById('error');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfoEl = document.getElementById('page-info');

let renderer = new ChartRenderer();
let currentPage = 0;

// Syntax highlighting for the editor
function highlightSyntax(text) {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight directives: {key: value}
  html = html.replace(
    /(\{)(title|artist|key|tempo|time|version|key_change|keychange)(:)([^}]*)(\})/gi,
    '<span class="hl-brace">$1</span><span class="hl-directive-key">$2</span><span class="hl-brace">$3</span><span class="hl-directive-value">$4</span><span class="hl-brace">$5</span>'
  );

  // Highlight sections: {section: Name}
  html = html.replace(
    /(\{)(section)(:)([^}]*)(\})/gi,
    '<span class="hl-brace">$1</span><span class="hl-section">$2</span><span class="hl-brace">$3</span><span class="hl-section-name">$4</span><span class="hl-brace">$5</span>'
  );

  // Highlight dynamics: {dynamics: value}
  html = html.replace(
    /(\{)(dynamics)(:)([^}]*)(\})/gi,
    '<span class="hl-brace">$1</span><span class="hl-directive-key">$2</span><span class="hl-brace">$3</span><span class="hl-directive-value">$4</span><span class="hl-brace">$5</span>'
  );

  // Highlight chords: [chord]
  html = html.replace(
    /(\[)([^\]]+)(\])/g,
    '<span class="hl-bracket">$1</span><span class="hl-chord">$2</span><span class="hl-bracket">$3</span>'
  );

  return html;
}

function syncHighlight() {
  highlightEl.innerHTML = highlightSyntax(inputEl.value) + '\n';
}

// Sync scroll between textarea and backdrop
inputEl.addEventListener('scroll', () => {
  backdropEl.scrollTop = inputEl.scrollTop;
  backdropEl.scrollLeft = inputEl.scrollLeft;
});

function updatePageControls() {
  const pageCount = renderer.layout ? renderer.layout.pageCount : 1;
  pageInfoEl.textContent = `Page ${currentPage + 1} of ${pageCount}`;
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage >= pageCount - 1;
}

function render() {
  try {
    errorEl.style.display = 'none';
    const input = inputEl.value;
    const song = parseChordPro(input);
    renderer.loadSong(song);
    // Preserve current page, but clamp to valid range if page count changed
    const maxPage = renderer.layout ? renderer.layout.pageCount - 1 : 0;
    if (currentPage > maxPage) currentPage = maxPage;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  } catch (e) {
    errorEl.textContent = 'Error: ' + e.message;
    errorEl.style.display = 'block';
    console.error(e);
  }
}

// Re-render on container resize to maintain aspect ratio
const resizeObserver = new ResizeObserver(() => {
  if (renderer.song) {
    renderer.renderPage(canvas, currentPage, previewContainer);
  }
});
resizeObserver.observe(previewContainer);

// Realtime rendering and highlighting on textarea input
inputEl.addEventListener('input', () => {
  syncHighlight();
  render();
});

// Auto-complete: numbers wrap in [], { completes to {}
inputEl.addEventListener('keydown', (e) => {
  const start = inputEl.selectionStart;
  const end = inputEl.selectionEnd;
  const value = inputEl.value;

  // Auto-wrap numbers in brackets
  if (e.key >= '0' && e.key <= '9') {
    // Check if already inside brackets or braces
    const beforeCursor = value.substring(0, start);
    const lastOpen = beforeCursor.lastIndexOf('[');
    const lastClose = beforeCursor.lastIndexOf(']');
    const insideBrackets = lastOpen > lastClose;
    const lastBraceOpen = beforeCursor.lastIndexOf('{');
    const lastBraceClose = beforeCursor.lastIndexOf('}');
    const insideBraces = lastBraceOpen > lastBraceClose;

    if (!insideBrackets && !insideBraces) {
      e.preventDefault();
      const newValue = value.substring(0, start) + '[' + e.key + ']' + value.substring(end);
      inputEl.value = newValue;
      inputEl.selectionStart = inputEl.selectionEnd = start + 2; // After the number, before ]
      syncHighlight();
      render();
    }
  }

  // Auto-complete { to {}
  if (e.key === '{') {
    e.preventDefault();
    const newValue = value.substring(0, start) + '{}' + value.substring(end);
    inputEl.value = newValue;
    inputEl.selectionStart = inputEl.selectionEnd = start + 1; // Between { and }
    syncHighlight();
    render();
  }
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  }
});

nextBtn.addEventListener('click', () => {
  if (renderer.layout && currentPage < renderer.layout.pageCount - 1) {
    currentPage++;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  }
});

// ============================================================================
// Library Search
// ============================================================================

let libraryIndex = [];
const songSearchEl = document.getElementById('song-search');
const searchResultsEl = document.getElementById('search-results');
const randomBtn = document.getElementById('random-btn');
let selectedResultIndex = -1;

// Load library index
async function loadLibraryIndex() {
  try {
    const response = await fetch('library/index.json');
    libraryIndex = await response.json();
    songSearchEl.placeholder = `Search ${libraryIndex.length} songs...`;
  } catch (e) {
    console.error('Failed to load library index:', e);
    songSearchEl.placeholder = 'Library unavailable';
  }
}

// Track currently loaded song
let currentSongPath = null;

// Fetch song content
async function loadSong(path) {
  try {
    const response = await fetch(`library/${path}`);
    const content = await response.text();
    inputEl.value = content;
    currentSongPath = path;
    syncHighlight();
    render();
    songSearchEl.value = '';
    hideSearchResults();
    updateButtonStates();
  } catch (e) {
    console.error('Failed to load song:', e);
    errorEl.textContent = 'Error loading song: ' + e.message;
    errorEl.style.display = 'block';
  }
}

// Update button states based on current song
function updateButtonStates() {
  const updateBtn = document.getElementById('update-btn');
  const deleteBtn = document.getElementById('delete-btn');
  deleteBtn.disabled = !currentSongPath;
  // Update button always enabled, but changes label
  updateBtn.textContent = currentSongPath ? 'Update' : 'Save';
}

// Extract title from chart content
function extractTitle(content) {
  const match = content.match(/\{title:\s*(.+?)\}/i);
  return match ? match[1].trim() : 'Untitled';
}

function extractVersion(content) {
  const match = content.match(/\{version:\s*(.+?)\}/i);
  return match ? match[1].trim() : '';
}

// ============================================================================
// Library Management
// ============================================================================

async function createNewSong() {
  const template = `{title: New Song}
{artist: Artist Name}
{version: }
{key: C}
{tempo: 120}
{time: 4/4}

{section: Verse 1}
[1] [4] [5] [1]

{section: Chorus}
[1] [5] [6m] [4]
`;
  inputEl.value = template;
  currentSongPath = null;
  syncHighlight();
  render();
  updateButtonStates();
}

async function updateSong() {
  if (!currentSongPath) {
    alert('No song loaded from library. Use "New" to create a new song first.');
    return;
  }

  const content = inputEl.value;
  try {
    const response = await fetch(`/api/library/${encodeURIComponent(currentSongPath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: content
    });

    if (response.ok) {
      alert('Song updated successfully!');
      // Refresh library index
      await loadLibraryIndex();
    } else {
      throw new Error(await response.text());
    }
  } catch (e) {
    // Fallback: offer download
    console.error('API not available, using download fallback:', e);
    downloadSong(content, currentSongPath);
  }
}

async function saveSongAsNew() {
  const content = inputEl.value;
  const title = extractTitle(content);
  const filename = title.replace(/[^a-zA-Z0-9\s]/g, '').trim() + '.txt';

  try {
    const response = await fetch(`/api/library/${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content
    });

    if (response.ok) {
      currentSongPath = filename;
      alert('Song saved to library!');
      await loadLibraryIndex();
      updateButtonStates();
    } else {
      throw new Error(await response.text());
    }
  } catch (e) {
    // Fallback: offer download
    console.error('API not available, using download fallback:', e);
    downloadSong(content, filename);
  }
}

async function deleteSong() {
  if (!currentSongPath) {
    alert('No song loaded from library.');
    return;
  }

  const title = extractTitle(inputEl.value);
  if (!confirm(`Move "${title}" to trash?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/library/${encodeURIComponent(currentSongPath)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Song moved to trash.');
      currentSongPath = null;
      createNewSong();
      await loadLibraryIndex();
    } else {
      throw new Error(await response.text());
    }
  } catch (e) {
    console.error('API not available:', e);
    alert('Delete requires the API server. Run: node demo/server.js');
  }
}

function downloadSong(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  alert(`Downloaded "${filename}". Move it to the library folder manually.`);
}

// Library management button handlers
document.getElementById('new-btn').addEventListener('click', () => {
  if (currentSongPath || inputEl.value.trim()) {
    if (!confirm('Create new song? Unsaved changes will be lost.')) return;
  }
  createNewSong();
});

document.getElementById('update-btn').addEventListener('click', () => {
  if (currentSongPath) {
    updateSong();
  } else {
    saveSongAsNew();
  }
});

document.getElementById('delete-btn').addEventListener('click', deleteSong);

// ============================================================================
// PDF Export
// ============================================================================

document.getElementById('download-pdf-btn').addEventListener('click', async () => {
  if (!renderer.layout) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [renderer.config.page.width, renderer.config.page.height]
  });

  const title = extractTitle(inputEl.value);
  const pageCount = renderer.layout.pageCount;

  // Create high-res canvas for PDF export (3x for print quality)
  const exportScale = 3;
  const exportCanvas = document.createElement('canvas');
  const { width, height } = renderer.config.page;
  exportCanvas.width = width * exportScale;
  exportCanvas.height = height * exportScale;

  // Temporarily override pixel ratio for high-res rendering
  const originalRatio = renderer.pixelRatio;
  renderer.pixelRatio = exportScale;

  for (let i = 0; i < pageCount; i++) {
    if (i > 0) pdf.addPage();

    // Render page to high-res canvas
    renderer.renderPage(exportCanvas, i);

    // Add canvas as image to PDF (JPEG for smaller file size)
    const imgData = exportCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
  }

  // Restore original pixel ratio and redraw preview
  renderer.pixelRatio = originalRatio;
  renderer.renderPage(canvas, currentPage, previewContainer);

  // Download with version, key and mode in filename
  const version = extractVersion(inputEl.value);
  const safeTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const safeVersion = version ? version.replace(/[^a-zA-Z0-9\s]/g, '').trim() : '';
  const titlePart = safeVersion ? `${safeTitle} - ${safeVersion}` : safeTitle;
  const mode = displayModeSelect.value;
  const keyLabel = renderKeySelect.value === 'numbers' ? 'Numbers' : renderKeySelect.value;
  // Lyrics don't change with key, so omit key from filename
  const filename = mode === 'lyrics'
    ? `${titlePart} - Lyrics.pdf`
    : `${titlePart} - ${keyLabel}${mode === 'chords' ? ' - Chords' : ''}.pdf`;
  pdf.save(filename);
});

// Full Set download (all keys, full and chords modes as ZIP)
const ALL_KEYS = ['numbers', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ALL_MODES = [
  { value: 'full', label: '' },        // Full chart (no suffix)
  { value: 'chords', label: 'Chords' }  // Chords only
];

document.getElementById('download-fullset-btn').addEventListener('click', async () => {
  const input = inputEl.value;
  const baseSong = parseChordPro(input);
  const title = baseSong.title || 'Untitled';
  const version = baseSong.version || '';
  const safeTitle = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const safeVersion = version ? version.replace(/[^a-zA-Z0-9\s]/g, '').trim() : '';
  const titlePart = safeVersion ? `${safeTitle} - ${safeVersion}` : safeTitle;

  const { jsPDF } = window.jspdf;
  const zip = new JSZip();

  const btn = document.getElementById('download-fullset-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;

  // Create high-res canvas for PDF export (3x for print quality)
  const exportScale = 3;
  const exportCanvas = document.createElement('canvas');
  const { width, height } = renderer.config.page;
  exportCanvas.width = width * exportScale;
  exportCanvas.height = height * exportScale;

  // Save and override pixel ratio for high-res rendering
  const originalRatio = renderer.pixelRatio;
  renderer.pixelRatio = exportScale;

  const totalFiles = ALL_KEYS.length * ALL_MODES.length;
  let fileCount = 0;

  for (let k = 0; k < ALL_KEYS.length; k++) {
    const key = ALL_KEYS[k];

    // Convert song to this key
    let song;
    if (key === 'numbers') {
      song = baseSong;
    } else {
      song = convertSongToLetters(baseSong, key);
      song.key = key;
    }

    // Generate PDF for each display mode
    for (const mode of ALL_MODES) {
      fileCount++;
      btn.textContent = `${fileCount}/${totalFiles}...`;

      // Set display mode and load song
      renderer.config.displayMode = mode.value;
      renderer.loadSong(song);
      const pageCount = renderer.layout.pageCount;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      for (let i = 0; i < pageCount; i++) {
        if (i > 0) pdf.addPage();
        renderer.renderPage(exportCanvas, i);
        const imgData = exportCanvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      }

      const keyLabel = key === 'numbers' ? 'Numbers' : key;
      const modeLabel = mode.label ? ` - ${mode.label}` : '';
      const pdfFilename = `${titlePart} - ${keyLabel}${modeLabel}.pdf`;
      zip.file(pdfFilename, pdf.output('blob'));

      // Allow UI to update
      await new Promise(r => setTimeout(r, 10));
    }
  }

  // Restore original pixel ratio
  renderer.pixelRatio = originalRatio;

  // Restore original view
  render();

  // Generate and download ZIP
  btn.textContent = 'Zipping...';
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${titlePart} - Full Set.zip`;
  a.click();
  URL.revokeObjectURL(url);

  btn.disabled = false;
  btn.innerHTML = originalText;
});

// ============================================================================
// Search Functions
// ============================================================================

function searchSongs(query) {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return libraryIndex.filter(song =>
    song.title.toLowerCase().includes(lower) ||
    song.artist.toLowerCase().includes(lower)
  ).slice(0, 20);
}

function showSearchResults(results) {
  if (results.length === 0) {
    hideSearchResults();
    return;
  }

  searchResultsEl.innerHTML = results.map((song, i) => `
    <div class="search-result${i === selectedResultIndex ? ' selected' : ''}" data-path="${song.path}">
      <span class="key">${song.key || ''}</span>
      <div class="title">${escapeHtml(song.title)}</div>
      <div class="artist">${escapeHtml(song.artist)}</div>
    </div>
  `).join('');
  searchResultsEl.classList.add('visible');
}

function hideSearchResults() {
  searchResultsEl.classList.remove('visible');
  selectedResultIndex = -1;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Random song
function loadRandomSong() {
  if (libraryIndex.length === 0) return;
  const randomIndex = Math.floor(Math.random() * libraryIndex.length);
  const song = libraryIndex[randomIndex];
  loadSong(song.path);
}

// Event listeners
songSearchEl.addEventListener('input', (e) => {
  const results = searchSongs(e.target.value);
  selectedResultIndex = -1;
  showSearchResults(results);
});

songSearchEl.addEventListener('focus', () => {
  if (songSearchEl.value.trim()) {
    const results = searchSongs(songSearchEl.value);
    showSearchResults(results);
  }
});

songSearchEl.addEventListener('keydown', (e) => {
  const results = searchResultsEl.querySelectorAll('.search-result');
  if (results.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedResultIndex = Math.min(selectedResultIndex + 1, results.length - 1);
    showSearchResults(searchSongs(songSearchEl.value));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
    showSearchResults(searchSongs(songSearchEl.value));
  } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
    e.preventDefault();
    const selected = results[selectedResultIndex];
    if (selected) loadSong(selected.dataset.path);
  } else if (e.key === 'Escape') {
    hideSearchResults();
  }
});

searchResultsEl.addEventListener('click', (e) => {
  const result = e.target.closest('.search-result');
  if (result) loadSong(result.dataset.path);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    hideSearchResults();
  }
});

randomBtn.addEventListener('click', loadRandomSong);

// Load library on startup
loadLibraryIndex();

// ============================================================================
// Key Conversion Utilities
// ============================================================================

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);

// Properly spelled major scales (music theory requires unique letter names)
const MAJOR_SCALES = {
  'C':  ['C',  'D',  'E',  'F',  'G',  'A',  'B'],
  'G':  ['G',  'A',  'B',  'C',  'D',  'E',  'F#'],
  'D':  ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'],
  'A':  ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'],
  'E':  ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'],
  'B':  ['B',  'C#', 'D#', 'E',  'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B',  'C#', 'D#', 'E#'],
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
  'F':  ['F',  'G',  'A',  'Bb', 'C',  'D',  'E'],
  'Bb': ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A'],
  'Eb': ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D'],
  'Ab': ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G'],
  'Db': ['Db', 'Eb', 'F',  'Gb', 'Ab', 'Bb', 'C'],
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  'Cb': ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'],
};

function getNoteIndex(note) {
  let idx = CHROMATIC_SHARPS.indexOf(note);
  if (idx === -1) idx = CHROMATIC_FLATS.indexOf(note);
  // Handle Cb, Fb, E#, B#
  if (idx === -1) {
    if (note === 'Cb') idx = 11;
    else if (note === 'Fb') idx = 4;
    else if (note === 'E#') idx = 5;
    else if (note === 'B#') idx = 0;
  }
  return idx;
}

function getNoteAtIndex(index, preferFlats) {
  const normalizedIndex = ((index % 12) + 12) % 12;
  return preferFlats ? CHROMATIC_FLATS[normalizedIndex] : CHROMATIC_SHARPS[normalizedIndex];
}

// Convert sharp keys to their flat equivalents for display
// A# → Bb, C# → Db, D# → Eb, F# → Gb, G# → Ab
function preferFlatKey(key) {
  const sharpToFlat = {
    'A#': 'Bb', 'A#m': 'Bbm',
    'C#': 'Db', 'C#m': 'Dbm',
    'D#': 'Eb', 'D#m': 'Ebm',
    'F#': 'Gb', 'F#m': 'Gbm',
    'G#': 'Ab', 'G#m': 'Abm'
  };
  return sharpToFlat[key] || key;
}

function getMajorScale(keyRoot) {
  // Use properly spelled scales from lookup
  if (MAJOR_SCALES[keyRoot]) {
    return MAJOR_SCALES[keyRoot];
  }
  // Fallback
  const rootIndex = getNoteIndex(keyRoot);
  if (rootIndex === -1) return null;
  const preferFlats = FLAT_KEYS.has(keyRoot);
  return MAJOR_SCALE_INTERVALS.map(interval => getNoteAtIndex(rootIndex + interval, preferFlats));
}

function numberToLetter(chordStr, key) {
  // Handle chromatic prefix (b7, #4, etc.)
  const chromaticMatch = chordStr.match(/^([#b])([1-7])(.*)$/);
  if (chromaticMatch) {
    const [, alteration, degreeStr, rest] = chromaticMatch;
    const degree = parseInt(degreeStr, 10);
    const scale = getMajorScale(key);
    if (!scale) return chordStr;

    const baseNote = scale[degree - 1];
    const baseIndex = getNoteIndex(baseNote);
    let targetIndex = baseIndex;
    if (alteration === '#') targetIndex = (baseIndex + 1) % 12;
    else if (alteration === 'b') targetIndex = (baseIndex + 11) % 12;

    const root = getNoteAtIndex(targetIndex, FLAT_KEYS.has(key));
    return root + rest;
  }

  // Parse regular number chord
  const match = chordStr.match(/^([1-7])(.*)$/);
  if (!match) return chordStr;

  const [, degreeStr, quality] = match;
  const degree = parseInt(degreeStr, 10);
  const scale = getMajorScale(key);
  if (!scale) return chordStr;

  const root = scale[degree - 1];

  // Handle slash chord bass note
  const slashMatch = quality.match(/^([^/]*)\/([#b]?[1-7])$/);
  if (slashMatch) {
    const [, chordQuality, bassNum] = slashMatch;
    const bassDegree = parseInt(bassNum.replace(/[#b]/, ''), 10);
    let bassNote = scale[bassDegree - 1];

    // Handle chromatic bass
    if (bassNum.startsWith('#')) {
      const idx = getNoteIndex(bassNote);
      bassNote = getNoteAtIndex((idx + 1) % 12, FLAT_KEYS.has(key));
    } else if (bassNum.startsWith('b')) {
      const idx = getNoteIndex(bassNote);
      bassNote = getNoteAtIndex((idx + 11) % 12, FLAT_KEYS.has(key));
    }

    return root + chordQuality + '/' + bassNote;
  }

  return root + quality;
}

function convertChordToLetter(chord, key) {
  if (!chord.isNumber) return chord;

  const fullChord = chord.root + (chord.quality || '') + (chord.bass ? '/' + chord.bass : '');
  const converted = numberToLetter(fullChord, key);

  // Re-parse the converted chord
  const letterMatch = converted.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!letterMatch) return chord;

  const [, root, quality, bass] = letterMatch;
  return {
    root,
    quality: quality || undefined,
    bass: bass || undefined,
    isNumber: false
  };
}

// ============================================================================
// Render Controls
// ============================================================================

const renderKeySelect = document.getElementById('render-key');

renderKeySelect.addEventListener('change', () => {
  render();
});

// Display mode control
const displayModeSelect = document.getElementById('display-mode');

displayModeSelect.addEventListener('change', () => {
  renderer.config.displayMode = displayModeSelect.value;
  renderer.layout = renderer.calculateLayout();
  currentPage = 0;
  renderer.renderPage(canvas, currentPage, previewContainer);
  updatePageControls();
});

// Override render to apply key conversion and display mode
const originalRender = render;
render = function() {
  try {
    errorEl.style.display = 'none';
    const input = inputEl.value;
    let song = parseChordPro(input);

    // Apply display mode
    renderer.config.displayMode = displayModeSelect.value;

    const selectedKey = renderKeySelect.value;

    // Convert to letter notation if a key is selected (not "numbers")
    if (selectedKey !== 'numbers') {
      song = convertSongToLetters(song, selectedKey);
      song.key = selectedKey;
      renderer.config.numbersMode = false;
    } else {
      renderer.config.numbersMode = true;
    }

    renderer.loadSong(song);
    // Clamp current page to valid range (preserve page when editing)
    const maxPage = renderer.layout.pageCount - 1;
    if (currentPage > maxPage) currentPage = maxPage;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  } catch (e) {
    errorEl.textContent = 'Error: ' + e.message;
    errorEl.style.display = 'block';
    console.error(e);
  }
};

function convertSongToLetters(song, targetKey) {
  // Calculate transposition amount from original key to target key
  const originalKeyRoot = song.key.replace(/m$/, '');
  const targetKeyRoot = targetKey.replace(/m$/, '');
  const originalIndex = getNoteIndex(originalKeyRoot);
  const targetIndex = getNoteIndex(targetKeyRoot);
  const transposeSemitones = ((targetIndex - originalIndex) + 12) % 12;

  // Track current key through the song (for key changes)
  let currentKey = targetKey;

  return {
    ...song,
    sections: song.sections.map(section => {
      // Handle key_change sections - transpose the keys
      if (section.type === 'key_change') {
        // Calculate the new key by transposing the original new key
        const newKeyRoot = section.newKey.replace(/m$/, '');
        const isMinor = section.newKey.endsWith('m');
        const newKeyIndex = getNoteIndex(newKeyRoot);
        const transposedIndex = (newKeyIndex + transposeSemitones) % 12;
        // Always prefer flats for key display (Bb not A#)
        const transposedKeyRoot = getNoteAtIndex(transposedIndex, true);
        const transposedNewKey = preferFlatKey(transposedKeyRoot + (isMinor ? 'm' : ''));

        // Similarly transpose the previous key
        const prevKeyRoot = section.previousKey.replace(/m$/, '');
        const prevIsMinor = section.previousKey.endsWith('m');
        const prevKeyIndex = getNoteIndex(prevKeyRoot);
        const transposedPrevIndex = (prevKeyIndex + transposeSemitones) % 12;
        const transposedPrevKeyRoot = getNoteAtIndex(transposedPrevIndex, true);
        const transposedPrevKey = preferFlatKey(transposedPrevKeyRoot + (prevIsMinor ? 'm' : ''));

        // Update current key for subsequent sections
        currentKey = transposedNewKey;

        return {
          ...section,
          newKey: transposedNewKey,
          previousKey: transposedPrevKey
        };
      }

      // Regular section - convert chords
      return {
        ...section,
        lines: section.lines.map(line => {
          // Skip dynamics lines (no chords to convert)
          if (line.type === 'dynamics') return line;

          return {
            ...line,
            chords: (line.chords || []).map(cp => ({
              ...cp,
              chord: convertChordToLetter(cp.chord, currentKey)
            }))
          };
        })
      };
    })
  };
}

// ============================================================================
// Initial Load
// ============================================================================

loadSong('You Are My Refuge.txt');
updateButtonStates();

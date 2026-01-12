/**
 * Unit tests for parsers
 */

import {
  parse,
  parseAs,
  parseSimpleText,
  parseChordPro,
  detectFormat
} from './parser';

describe('detectFormat', () => {
  it('should detect ChordPro format by directives', () => {
    const input = `{title: My Song}
{artist: Me}
{key: C}`;
    expect(detectFormat(input)).toBe('chordpro');
  });

  it('should detect ChordPro format by inline chords', () => {
    const input = `How great the [Eb]chasm
That lay between [Bbsus4]us`;
    expect(detectFormat(input)).toBe('chordpro');
  });

  it('should detect simple text format by section headers', () => {
    const input = `Title: My Song
Artist: Me

[VERSE 1]
      C
Some lyrics`;
    expect(detectFormat(input)).toBe('simple');
  });

  it('should detect simple text format by metadata', () => {
    const input = `Title: My Song
Key: G
Tempo: 120`;
    expect(detectFormat(input)).toBe('simple');
  });

  it('should return simple as default for ambiguous input', () => {
    const input = `Some random text
without any clear format`;
    expect(detectFormat(input)).toBe('simple');
  });

  it('should return unknown for invalid input', () => {
    expect(detectFormat('')).toBe('unknown');
    expect(detectFormat(null as any)).toBe('unknown');
  });
});

describe('parseSimpleText', () => {
  it('should parse metadata', () => {
    const input = `Title: Living Hope
Artist: Phil Wickham
Key: Eb
Tempo: 72

[VERSE 1]
      Eb
How great`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Living Hope');
    expect(result.song?.artist).toBe('Phil Wickham');
    expect(result.song?.key).toBe('Eb');
    expect(result.song?.tempo).toBe(72);
  });

  it('should parse section headers', () => {
    const input = `Title: Test
Key: C

[INTRO]
C  G

[VERSE 1]
      C
Some lyrics`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.song?.sections).toHaveLength(2);
    expect(result.song?.sections[0].type).toBe('intro');
    expect(result.song?.sections[1].type).toBe('verse');
    expect(result.song?.sections[1].number).toBe(1);
  });

  it('should parse chord-only lines', () => {
    const input = `[INTRO]
Eb  Absus2  Eb  Absus2`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    const intro = result.song?.sections[0];
    expect(intro?.lines).toHaveLength(1);
    expect(intro?.lines[0].lyrics).toBeUndefined();
    expect(intro?.lines[0].chords).toHaveLength(4);
    expect(intro?.lines[0].chords[0].chord.root).toBe('Eb');
    expect(intro?.lines[0].chords[1].chord.root).toBe('Ab');
    expect(intro?.lines[0].chords[1].chord.quality).toBe('sus2');
  });

  it('should parse chords above lyrics', () => {
    const input = `[VERSE 1]
      Eb
How great the chasm
         Bbsus4
That lay between us`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    const verse = result.song?.sections[0];
    expect(verse?.lines).toHaveLength(2);

    // First line: "How great the chasm" with Eb at position 6
    expect(verse?.lines[0].lyrics).toBe('How great the chasm');
    expect(verse?.lines[0].chords).toHaveLength(1);
    expect(verse?.lines[0].chords[0].chord.root).toBe('Eb');
    expect(verse?.lines[0].chords[0].position).toBe(6);

    // Second line: "That lay between us" with Bbsus4 at position 9
    expect(verse?.lines[1].lyrics).toBe('That lay between us');
    expect(verse?.lines[1].chords).toHaveLength(1);
    expect(verse?.lines[1].chords[0].chord.root).toBe('Bb');
    expect(verse?.lines[1].chords[0].chord.quality).toBe('sus4');
  });

  it('should handle lyrics without chords', () => {
    const input = `[VERSE 1]
A line without any chords above it`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    const verse = result.song?.sections[0];
    expect(verse?.lines).toHaveLength(1);
    expect(verse?.lines[0].lyrics).toBe('A line without any chords above it');
    expect(verse?.lines[0].chords).toHaveLength(0);
  });

  it('should use default values when metadata is missing', () => {
    const input = `[VERSE]
C
Some lyrics`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Untitled');
    expect(result.song?.artist).toBe('Unknown');
    expect(result.song?.key).toBe('C');
  });

  it('should apply parser options for defaults', () => {
    const input = `[VERSE]
C
Some lyrics`;

    const result = parseSimpleText(input, {
      defaultTempo: 100,
      defaultTimeSignature: '4/4'
    });
    expect(result.success).toBe(true);
    expect(result.song?.tempo).toBe(100);
    expect(result.song?.timeSignature).toBe('4/4');
  });

  it('should return error for invalid input', () => {
    const result = parseSimpleText('');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Input must be a non-empty string');
  });

  it('should warn when no sections found', () => {
    const input = `Title: Test
Key: C`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.warnings).toContain('No sections found in input');
  });

  it('should handle various section types', () => {
    const input = `[PRE-CHORUS]
C

[CHORUS]
G

[BRIDGE]
Am

[OUTRO]
F`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.song?.sections).toHaveLength(4);
    expect(result.song?.sections[0].type).toBe('prechorus');
    expect(result.song?.sections[1].type).toBe('chorus');
    expect(result.song?.sections[2].type).toBe('bridge');
    expect(result.song?.sections[3].type).toBe('outro');
  });
});

describe('parseChordPro', () => {
  it('should parse metadata directives', () => {
    const input = `{title: Living Hope}
{artist: Phil Wickham}
{key: Eb}
{tempo: 72}
{time: 4/4}

{section: Verse 1}
How great the [Eb]chasm`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Living Hope');
    expect(result.song?.artist).toBe('Phil Wickham');
    expect(result.song?.key).toBe('Eb');
    expect(result.song?.tempo).toBe(72);
    expect(result.song?.timeSignature).toBe('4/4');
  });

  it('should parse section directives', () => {
    const input = `{section: Intro}
[Eb] [Ab]

{section: Verse 1}
How great the [Eb]chasm`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.sections).toHaveLength(2);
    expect(result.song?.sections[0].type).toBe('intro');
    expect(result.song?.sections[0].label).toBe('Intro');
    expect(result.song?.sections[1].type).toBe('verse');
    expect(result.song?.sections[1].number).toBe(1);
  });

  it('should parse inline chords', () => {
    const input = `{section: Verse}
How great the [Eb]chasm
That lay between [Bbsus4]us`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    const verse = result.song?.sections[0];
    expect(verse?.lines).toHaveLength(2);

    // First line
    expect(verse?.lines[0].lyrics).toBe('How great the chasm');
    expect(verse?.lines[0].chords).toHaveLength(1);
    expect(verse?.lines[0].chords[0].chord.root).toBe('Eb');
    expect(verse?.lines[0].chords[0].position).toBe(14);

    // Second line
    expect(verse?.lines[1].lyrics).toBe('That lay between us');
    expect(verse?.lines[1].chords).toHaveLength(1);
    expect(verse?.lines[1].chords[0].chord.root).toBe('Bb');
    expect(verse?.lines[1].chords[0].chord.quality).toBe('sus4');
  });

  it('should parse chord-only lines', () => {
    const input = `{section: Intro}
[Eb] [Absus2] [Eb] [Absus2]`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    const intro = result.song?.sections[0];
    expect(intro?.lines).toHaveLength(1);
    expect(intro?.lines[0].lyrics).toBeUndefined();
    expect(intro?.lines[0].chords).toHaveLength(4);
  });

  it('should parse dynamics directive', () => {
    const input = `{section: Intro}
{dynamics: Acoustic Guitar, Piano & Pad}
[Eb] [Ab]`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    const intro = result.song?.sections[0];
    expect(intro?.dynamics).toBe('Acoustic Guitar, Piano & Pad');
  });

  it('should handle start_of/end_of directives', () => {
    const input = `{start_of_verse}
How great the [Eb]chasm
{end_of_verse}

{start_of_chorus}
[Ab]Hal[Eb]lelujah
{end_of_chorus}`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.sections).toHaveLength(2);
    expect(result.song?.sections[0].type).toBe('verse');
    expect(result.song?.sections[1].type).toBe('chorus');
  });

  it('should handle abbreviated directives', () => {
    const input = `{t: My Song}
{a: My Artist}
{k: G}

{sov}
Verse [G]lyrics
{eov}`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('My Song');
    expect(result.song?.artist).toBe('My Artist');
    expect(result.song?.key).toBe('G');
    expect(result.song?.sections[0].type).toBe('verse');
  });

  it('should create default section for content without section directive', () => {
    const input = `{title: Test}
How great the [C]chasm`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.sections).toHaveLength(1);
    expect(result.song?.sections[0].type).toBe('verse');
  });

  it('should return error for invalid input', () => {
    const result = parseChordPro('');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Input must be a non-empty string');
  });

  it('should handle complex slash chords', () => {
    const input = `{section: Verse}
Walking [C/E]through the [G/B]valley`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    const verse = result.song?.sections[0];
    expect(verse?.lines[0].chords[0].chord.root).toBe('C');
    expect(verse?.lines[0].chords[0].chord.bass).toBe('E');
    expect(verse?.lines[0].chords[1].chord.root).toBe('G');
    expect(verse?.lines[0].chords[1].chord.bass).toBe('B');
  });
});

describe('parse (auto-detect)', () => {
  it('should auto-detect and parse ChordPro format', () => {
    const input = `{title: Test}
{key: C}

{section: Verse}
How [C]great`;

    const result = parse(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Test');
    expect(result.song?.sections[0].lines[0].chords[0].chord.root).toBe('C');
  });

  it('should auto-detect and parse simple text format', () => {
    const input = `Title: Test
Key: C

[VERSE]
      C
How great`;

    const result = parse(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Test');
    expect(result.song?.sections[0].lines[0].chords[0].chord.root).toBe('C');
  });
});

describe('parseAs', () => {
  it('should force ChordPro parsing', () => {
    const input = `Title: Test
Key: C`;

    const result = parseAs(input, 'chordpro');
    expect(result.success).toBe(true);
    // ChordPro won't recognize "Title: Test" as a directive
    expect(result.song?.title).toBe('Untitled');
  });

  it('should force simple text parsing', () => {
    const input = `{title: Test}
{key: C}`;

    const result = parseAs(input, 'simple');
    expect(result.success).toBe(true);
    // Simple text won't recognize {title: Test} as metadata
    expect(result.song?.title).toBe('Untitled');
  });

  it('should return error for unknown format', () => {
    const result = parseAs('test', 'invalid' as any);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Unknown format');
  });
});

describe('Complete song parsing', () => {
  it('should parse a complete song in simple text format', () => {
    const input = `Title: Amazing Grace
Artist: Traditional
Key: G
Tempo: 72
Time: 3/4

[VERSE 1]
     G              G7         C        G
Amazing grace how sweet the sound
                         D
That saved a wretch like me

[CHORUS]
    G           C       G
I once was lost but now am found
              D        G
Was blind but now I see`;

    const result = parseSimpleText(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Amazing Grace');
    expect(result.song?.artist).toBe('Traditional');
    expect(result.song?.key).toBe('G');
    expect(result.song?.tempo).toBe(72);
    expect(result.song?.timeSignature).toBe('3/4');
    expect(result.song?.sections).toHaveLength(2);

    const verse = result.song?.sections[0];
    expect(verse?.type).toBe('verse');
    expect(verse?.number).toBe(1);
    expect(verse?.lines).toHaveLength(2);

    const chorus = result.song?.sections[1];
    expect(chorus?.type).toBe('chorus');
    expect(chorus?.lines).toHaveLength(2);
  });

  it('should parse a complete song in ChordPro format', () => {
    const input = `{title: Amazing Grace}
{artist: Traditional}
{key: G}
{tempo: 72}
{time: 3/4}

{section: Verse 1}
A[G]mazing grace how [G7]sweet the [C]sound
That [G]saved a wretch like [D]me

{section: Chorus}
I [G]once was [C]lost but [G]now am found
Was [D]blind but now I [G]see`;

    const result = parseChordPro(input);
    expect(result.success).toBe(true);
    expect(result.song?.title).toBe('Amazing Grace');
    expect(result.song?.artist).toBe('Traditional');
    expect(result.song?.key).toBe('G');
    expect(result.song?.tempo).toBe(72);
    expect(result.song?.timeSignature).toBe('3/4');
    expect(result.song?.sections).toHaveLength(2);

    const verse = result.song?.sections[0];
    expect(verse?.type).toBe('verse');
    expect(verse?.number).toBe(1);
    expect(verse?.lines).toHaveLength(2);
    expect(verse?.lines[0].lyrics).toBe('Amazing grace how sweet the sound');
    expect(verse?.lines[0].chords).toHaveLength(3);

    const chorus = result.song?.sections[1];
    expect(chorus?.type).toBe('chorus');
    expect(chorus?.lines).toHaveLength(2);
  });
});

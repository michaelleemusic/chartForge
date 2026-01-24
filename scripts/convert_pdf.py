#!/usr/bin/env python3
"""
Convert MultiTracks PDF charts to ChordPro format.

Usage:
    python convert_pdf.py input.pdf [output.txt]
    python convert_pdf.py ./pdfs/ ./converted/  # batch mode

Requires: pdfplumber>=0.10.0
"""

import re
import sys
import time
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber is required. Install with: pip install pdfplumber")
    sys.exit(1)


# Font-based classification thresholds
# These are based on MultiTracks PDF format
FONT_CHORD = ('Bold', 13.0, 14.0)       # Chords: Bold, ~13.6pt
FONT_LYRIC = ('Regular', 13.0, 14.0)    # Lyrics: Regular, ~13.6pt
FONT_SECTION = ('Bold', 14.0, 16.0)     # Section names: Bold, ~14.8pt
FONT_BADGE = ('Bold', 9.0, 11.0)        # Section badges: Bold, ~10.2pt
FONT_DYNAMICS = ('Regular', 12.0, 13.0) # Dynamics: Regular, ~12.5pt


def normalize_chord(s):
    return s.replace('♯', '#').replace('♭', 'b').replace(' ', '') if s else s


def classify_word(word):
    """Classify word based on font name and size."""
    fontname = word.get('fontname', '')
    size = word.get('size', 0)
    text = word.get('text', '')

    is_bold = 'Bold' in fontname
    is_regular = 'Regular' in fontname or not is_bold

    # Check for chord modifiers (superscript text that modifies a chord)
    chord_modifier_patterns = ['sus', 'add', 'maj', 'min', 'dim', 'aug', 'm']
    is_modifier = any(text.lower().startswith(mod) for mod in chord_modifier_patterns) or text.isdigit()

    # Section badges: Bold, small (~10pt) - but not chord modifiers
    if is_bold and 9.0 <= size <= 11.0:
        if is_modifier:
            return 'chord_modifier'
        return 'badge'

    # Section names: Bold, medium-large (~14.8pt)
    if is_bold and 14.0 <= size <= 16.0:
        return 'section_name'

    # Bass notes (slash chords): Bold, starts with "/"
    if is_bold and text.startswith('/'):
        return 'bass_note'

    # Standalone minor "m" at chord size is a modifier, not a chord
    if is_bold and 13.0 <= size <= 14.0 and text == 'm':
        return 'chord_modifier'

    # Chords: Bold, medium (~13.6pt)
    if is_bold and 13.0 <= size <= 14.0:
        return 'chord'

    # Dynamics: Regular, medium-small (~12.5pt)
    if is_regular and 12.0 <= size < 13.0:
        return 'dynamics'

    # Lyrics: Regular, medium (~13.6pt)
    if is_regular and 13.0 <= size <= 14.0:
        return 'lyric'

    # Title: Bold, large (>20pt)
    if is_bold and size > 20:
        return 'title'

    # Artist/metadata: smaller text
    if size < 12:
        return 'meta'

    return 'unknown'


def extract_metadata(pdf):
    """Extract song metadata from first page."""
    metadata = {'title': '', 'artist': '', 'key': '', 'tempo': '', 'time': '4/4'}
    page = pdf.pages[0]
    text = page.extract_text() or ''
    lines = text.split('\n')

    # Find title - may span multiple lines until we hit Page: or Key: line
    title_parts = []
    artist_line_idx = None
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if 'Page:' in line or 'Key:' in line:
            # This line has metadata, check if artist is before Key:
            if 'Key:' in line:
                artist_match = re.match(r'^(.+?)\s*Key:', line)
                if artist_match:
                    artist_text = artist_match.group(1).strip()
                    # Skip if it looks like continuation of title
                    if artist_text and not artist_text.endswith(')') and not artist_text.endswith(']'):
                        metadata['artist'] = artist_text
            break
        elif i == 0:
            title_parts.append(line_stripped)
        elif i == 1:
            # Check if this is title continuation or artist
            # Title continuation often has parentheses/brackets
            if line_stripped.startswith(')') or line_stripped.startswith(']') or \
               (title_parts and (title_parts[0].count('(') > title_parts[0].count(')') or
                                  title_parts[0].count('[') > title_parts[0].count(']'))):
                title_parts.append(line_stripped)
                artist_line_idx = 2
            else:
                metadata['artist'] = line_stripped
                break

    metadata['title'] = ' '.join(title_parts)

    # Extract key, tempo, time from text
    m = re.search(r'Key:\s*([A-G][#b♯♭]?m?)', text)
    if m: metadata['key'] = m.group(1).replace('♯', '#').replace('♭', 'b')
    m = re.search(r'Tempo:\s*(\d+)', text)
    if m: metadata['tempo'] = m.group(1)
    m = re.search(r'Time:\s*(\d+/\d+)', text)
    if m: metadata['time'] = m.group(1)

    return metadata


def detect_sharp_curves(page, chord_x, chord_y, modifier_x):
    """Check if there's a sharp symbol (drawn as curves) between chord and modifier."""
    curves = page.objects.get('curve', [])
    # Look for curves between the chord letter and modifier
    for curve in curves:
        cx = curve.get('x0', curve.get('x', 0))
        cy = curve.get('top', curve.get('y', 0))
        # Sharp should be between chord and modifier horizontally, and at similar Y
        if chord_x < cx < modifier_x and abs(cy - chord_y) < 10:
            return True
    return False


def parse_column(words, col_start_x, page=None):
    """Parse a single column of words into sections using font-based classification."""
    if not words:
        return []

    sections = []
    current_section = None

    # Group words into lines by y-position
    words = sorted(words, key=lambda w: (w['top'], w['x0']))
    lines = []
    current_line = []
    current_y = None

    for w in words:
        if current_y is None or abs(w['top'] - current_y) <= 6:
            current_line.append(w)
            current_y = current_y or w['top']
        else:
            if current_line:
                lines.append(sorted(current_line, key=lambda x: x['x0']))
            current_line = [w]
            current_y = w['top']
    if current_line:
        lines.append(sorted(current_line, key=lambda x: x['x0']))

    for line_words in lines:
        if not line_words:
            continue

        # Classify each word
        classified = [(w, classify_word(w)) for w in line_words]

        # Check if this is a section header line (starts with badge + section_name)
        if len(classified) >= 2:
            first_class = classified[0][1]
            second_class = classified[1][1]

            if first_class == 'badge' and second_class == 'section_name':
                # Save current section
                if current_section and current_section['lines']:
                    sections.append(current_section)

                # Extract section name (all section_name words)
                section_parts = [w['text'] for w, c in classified if c == 'section_name']
                section_name = format_section_name(' '.join(section_parts))

                # Extract dynamics from same line (if any)
                dynamics_parts = [w['text'] for w, c in classified if c == 'dynamics']
                dynamics = ' '.join(dynamics_parts) if dynamics_parts else None

                current_section = {'name': section_name, 'dynamics': dynamics, 'lines': []}
                continue

        if not current_section:
            continue

        # Separate chords, lyrics, dynamics, modifiers, and bass notes
        raw_chords = [(w, w['x0']) for w, c in classified if c == 'chord']
        modifiers = [(w, w['x0']) for w, c in classified if c == 'chord_modifier']
        bass_notes = [(w, w['x0']) for w, c in classified if c == 'bass_note']
        lyrics = [(w, w['x0']) for w, c in classified if c == 'lyric']
        dynamics_words = [w['text'] for w, c in classified if c == 'dynamics']

        # First, assign each modifier to its nearest preceding chord
        # Modifiers appear slightly to the right of their parent chord
        # Also detect sharp symbols (rendered as curves) between chord and modifier
        chord_modifiers = {}  # chord_x -> list of modifier texts
        chord_has_sharp = {}  # chord_x -> True if sharp detected
        for mod_w, mod_x in modifiers:
            # Find the closest chord that is to the LEFT of this modifier
            best_chord_x = None
            best_chord_w = None
            best_dist = 25  # Max distance (modifiers are close to their chord)
            for chord_w, chord_x in raw_chords:
                dist = mod_x - chord_x
                if 0 < dist < best_dist:
                    best_chord_x = chord_x
                    best_chord_w = chord_w
                    best_dist = dist
            if best_chord_x is not None:
                if best_chord_x not in chord_modifiers:
                    chord_modifiers[best_chord_x] = []
                # Check for sharp symbol (curve) between chord and modifier
                if page and detect_sharp_curves(page, best_chord_x, best_chord_w['top'], mod_x):
                    chord_has_sharp[best_chord_x] = True
                chord_modifiers[best_chord_x].append(mod_w['text'])

        # Assign each bass note to its nearest preceding chord
        chord_bass = {}  # chord_x -> bass note text
        for bass_w, bass_x in bass_notes:
            # Find the closest chord that is to the LEFT of this bass note
            best_chord_x = None
            best_dist = 50  # Bass notes can be further from root
            for chord_w, chord_x in raw_chords:
                dist = bass_x - chord_x
                if 0 < dist < best_dist:
                    best_chord_x = chord_x
                    best_dist = dist
            if best_chord_x is not None:
                chord_bass[best_chord_x] = bass_w['text']

        # Also detect sharps on standalone chords (no modifier) by looking for curves after chord
        for chord_w, chord_x in raw_chords:
            if chord_x not in chord_modifiers and chord_x not in chord_has_sharp:
                # Look for sharp curve right after this chord (within 15px)
                if page:
                    curves = page.objects.get('curve', [])
                    for curve in curves:
                        cx = curve.get('x0', curve.get('x', 0))
                        cy = curve.get('top', curve.get('y', 0))
                        if chord_x < cx < chord_x + 15 and abs(cy - chord_w['top']) < 10:
                            chord_has_sharp[chord_x] = True
                            break

        # Build chord list with sharps, modifiers, and bass notes attached
        chords = []
        for chord_w, chord_x in raw_chords:
            chord_text = chord_w['text']
            # Add sharp if detected (curve between chord and modifier/after chord)
            if chord_x in chord_has_sharp:
                chord_text += '#'
            # Add modifiers (e.g., "m", "add9", "sus4")
            if chord_x in chord_modifiers:
                chord_text += ''.join(chord_modifiers[chord_x])
            # Then add bass note (e.g., "/C#")
            if chord_x in chord_bass:
                chord_text += chord_bass[chord_x]
            chords.append(({'text': chord_text, 'x0': chord_x}, chord_x))

        # Handle dynamics-only lines
        if dynamics_words and not chords and not lyrics:
            dyn_text = ' '.join(dynamics_words)
            if not current_section['lines']:
                # Append to section header dynamics
                current_section['dynamics'] = (current_section['dynamics'] + ' - ' + dyn_text
                                              if current_section['dynamics'] else dyn_text)
            else:
                current_section['lines'].append({'type': 'dynamics', 'text': dyn_text})
            continue

        # Build chord/lyric line
        if chords or lyrics:
            line_data = {
                'chords': [{'text': normalize_chord(w['text']), 'x': x} for w, x in chords],
                'lyrics': [{'text': w['text'], 'x': x} for w, x in lyrics]
            }
            current_section['lines'].append(line_data)

    if current_section and current_section['lines']:
        sections.append(current_section)

    # Post-process: merge chord-only lines with following lyric-only lines
    for section in sections:
        merged_lines = []
        i = 0
        while i < len(section['lines']):
            line = section['lines'][i]
            # Skip dynamics lines
            if line.get('type') == 'dynamics':
                merged_lines.append(line)
                i += 1
                continue

            chords = line.get('chords', [])
            lyrics = line.get('lyrics', [])

            # If chord-only line, check if next line is lyric-only
            if chords and not lyrics and i + 1 < len(section['lines']):
                next_line = section['lines'][i + 1]
                if next_line.get('type') != 'dynamics':
                    next_chords = next_line.get('chords', [])
                    next_lyrics = next_line.get('lyrics', [])
                    # Merge if next line has lyrics (with or without chords)
                    if next_lyrics:
                        merged_lines.append({
                            'chords': chords + next_chords,
                            'lyrics': next_lyrics
                        })
                        i += 2
                        continue

            merged_lines.append(line)
            i += 1
        section['lines'] = merged_lines

    return sections


def parse_page(page, page_num, title=''):
    """Parse page by processing left and right columns separately."""
    # Get words with font information
    words = page.extract_words(x_tolerance=3, y_tolerance=3, extra_attrs=['fontname', 'size'])
    if not words:
        return []

    page_width = page.width
    mid_x = page_width / 2

    # For page 1, dynamically detect roadmap area
    if page_num == 0:
        # Find roadmap badges: small bold text (~9-11pt) in header area
        roadmap_bottom = 70  # Default minimum
        for w in words:
            if w['top'] > 150:  # Don't look too far down
                break
            fontname = w.get('fontname', '')
            size = w.get('size', 0)
            is_bold = 'Bold' in fontname
            # Roadmap badges are bold, ~9-11pt
            if is_bold and 9.0 <= size <= 11.5 and w['top'] > 50:
                roadmap_bottom = max(roadmap_bottom, w['bottom'] + 10)
        min_y = max(roadmap_bottom, 70)
    else:
        min_y = 45

    # Filter words
    filtered = []
    for w in words:
        if w['top'] < min_y:
            continue
        text = w['text'].strip()
        if not text:
            continue
        # Skip page/footer elements
        if any(skip in text for skip in ['Page:', 'MultiTracks', 'mtID', 'Writers:', 'Charts']):
            continue
        if text.startswith('©') or text.startswith('℗'):
            continue
        if 'a product of' in text.lower():
            continue
        # Skip title appearing again in header
        if text == title and w['top'] < 60:
            continue
        filtered.append(w)

    if not filtered:
        return []

    # Split into columns
    left_words = [w for w in filtered if w['x0'] < mid_x - 30]
    right_words = [w for w in filtered if w['x0'] >= mid_x - 30]

    # Find column start positions
    left_start_x = min((w['x0'] for w in left_words), default=40)
    right_start_x = min((w['x0'] for w in right_words), default=mid_x)

    # Parse each column (pass page for sharp detection)
    left_sections = parse_column(left_words, left_start_x, page)
    right_sections = parse_column(right_words, right_start_x, page)

    return left_sections + right_sections


def build_line(line_data):
    """Build ChordPro line from chord/lyric data."""
    chords = line_data.get('chords', [])
    lyrics = line_data.get('lyrics', [])

    if not chords and not lyrics:
        return ''
    if not chords:
        return ' '.join(l['text'] for l in sorted(lyrics, key=lambda x: x['x']))
    if not lyrics:
        return ' '.join(f"[{c['text']}]" for c in sorted(chords, key=lambda x: x['x']))

    # Merge by x position
    chords = sorted(chords, key=lambda c: c['x'])
    lyrics = sorted(lyrics, key=lambda l: l['x'])

    result = []
    ci = 0
    for lyric in lyrics:
        while ci < len(chords) and chords[ci]['x'] <= lyric['x'] + 15:
            result.append(f"[{chords[ci]['text']}]")
            ci += 1
        result.append(lyric['text'])
    while ci < len(chords):
        result.append(f"[{chords[ci]['text']}]")
        ci += 1

    return ' '.join(result)


def format_section_name(name):
    """Format section name properly."""
    name = name.strip()

    # Remove horizontal line characters
    name = re.sub(r'[─━—–-]+$', '', name).strip()

    # Map common variations
    name_map = {
        'INTRO': 'Intro', 'VERSE': 'Verse', 'CHORUS': 'Chorus',
        'PRE CHORUS': 'Pre Chorus', 'PRE-CHORUS': 'Pre Chorus',
        'BRIDGE': 'Bridge', 'BREAKDOWN': 'Breakdown',
        'INTERLUDE': 'Interlude', 'INSTRUMENTAL': 'Instrumental',
        'VAMP': 'Vamp', 'TAG': 'Tag', 'REFRAIN': 'Refrain',
        'ENDING': 'Ending', 'OUTRO': 'Outro', 'TURNAROUND': 'Turnaround',
        'HALF-CHORUS': 'Half-Chorus'
    }

    # Extract number suffix if present
    num_match = re.search(r'(\d+)\s*$', name)
    number = ' ' + num_match.group(1) if num_match else ''
    if num_match:
        name = name[:num_match.start()].strip()

    # Convert to title case
    upper_name = name.upper()
    formatted = name_map.get(upper_name, name.title())

    return formatted + number


def convert_pdf(pdf_path):
    """Convert a PDF file to ChordPro format."""
    with pdfplumber.open(pdf_path) as pdf:
        metadata = extract_metadata(pdf)
        title = metadata.get('title', '')

        all_sections = []
        for page_num, page in enumerate(pdf.pages):
            # Rate limiting: small delay between pages to spread CPU load
            if page_num > 0:
                time.sleep(0.1)
            all_sections.extend(parse_page(page, page_num, title))

    # Build output
    lines = [f"{{title: {metadata.get('title', 'Untitled')}}}"]
    if metadata.get('artist'):
        lines.append(f"{{artist: {metadata['artist']}}}")
    if metadata.get('key'):
        lines.append(f"{{key: {metadata['key']}}}")
    if metadata.get('tempo'):
        lines.append(f"{{tempo: {metadata['tempo']}}}")
    if metadata.get('time'):
        lines.append(f"{{time: {metadata['time']}}}")
    lines.append('')

    for section in all_sections:
        lines.append(f"{{section: {section['name']}}}")
        if section.get('dynamics'):
            lines.append(f"{{dynamics: {section['dynamics']}}}")
        for line_data in section.get('lines', []):
            if line_data.get('type') == 'dynamics':
                lines.append(f"{{dynamics: {line_data['text']}}}")
            else:
                out = build_line(line_data)
                if out:
                    lines.append(out)
        lines.append('')

    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if input_path.is_dir():
        output_dir = Path(output_path) if output_path else input_path / 'converted'
        output_dir.mkdir(parents=True, exist_ok=True)
        for pdf in input_path.glob('*.pdf'):
            result = convert_pdf(pdf)
            if result:
                (output_dir / (pdf.stem + '.txt')).write_text(result, encoding='utf-8')
                print(f"Converted: {pdf.name}", file=sys.stderr)
    else:
        result = convert_pdf(input_path)
        if result:
            if output_path:
                Path(output_path).write_text(result, encoding='utf-8')
                print(f"Converted: {input_path.name}", file=sys.stderr)
            else:
                print(result)


if __name__ == '__main__':
    main()

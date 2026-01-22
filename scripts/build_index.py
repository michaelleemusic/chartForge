#!/usr/bin/env python3
"""
Build a JSON index of all .txt song files in the library.
Run this after adding new songs to update the index.

Usage:
    python build_index.py
"""

import json
import re
from pathlib import Path


def extract_metadata(content: str) -> dict:
    """Extract title, artist, key from file content."""
    metadata = {}

    for line in content.split('\n')[:10]:
        # ChordPro format: {title: ...}
        match = re.match(r'\{(title|artist|key)\s*:\s*(.+?)\}', line, re.IGNORECASE)
        if match:
            metadata[match.group(1).lower()] = match.group(2).strip()

    return metadata


def build_index():
    scripts_dir = Path(__file__).parent
    library_dir = scripts_dir.parent / 'library'
    songs = []

    # Recursive glob for all .txt files
    for txt_file in sorted(library_dir.glob('**/*.txt')):
        # Skip trash, hidden directories, node_modules
        if any(part.startswith('.') or part in ('node_modules', 'trash') for part in txt_file.parts):
            continue

        # Path relative to library dir
        rel_path = str(txt_file.relative_to(library_dir))

        try:
            content = txt_file.read_text(encoding='utf-8')
        except:
            content = txt_file.read_text(encoding='latin-1')

        metadata = extract_metadata(content)

        songs.append({
            'path': rel_path,
            'title': metadata.get('title', txt_file.stem),
            'artist': metadata.get('artist', ''),
            'key': metadata.get('key', ''),
        })

    # Sort by title
    songs.sort(key=lambda s: s['title'].lower())

    # Write index
    index_path = library_dir / 'index.json'
    index_path.write_text(json.dumps(songs, indent=2), encoding='utf-8')

    print(f"Indexed {len(songs)} songs -> {index_path}")


if __name__ == '__main__':
    build_index()

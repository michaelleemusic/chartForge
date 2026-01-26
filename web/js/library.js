// chartForge - Library Management

import { extractTitle } from './parser.js';

let libraryIndex = [];

export function getLibraryIndex() {
  return libraryIndex;
}

export async function loadLibraryIndex() {
  try {
    // Fetch from API endpoint (returns filtered index based on auth state)
    const response = await fetch('/api/library');
    libraryIndex = await response.json();
    return libraryIndex;
  } catch (e) {
    console.error('Failed to load library index:', e);
    return [];
  }
}

export async function loadSong(path) {
  const response = await fetch(`library/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to load song: ${response.statusText}`);
  }
  return await response.text();
}

export async function saveSong(path, content) {
  const response = await fetch(`/api/library/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: content
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return true;
}

export async function createSong(filename, content) {
  const response = await fetch(`/api/library/${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: content
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return true;
}

export async function deleteSong(path) {
  const response = await fetch(`/api/library/${encodeURIComponent(path)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return true;
}

export function downloadSong(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getNewSongTemplate() {
  return `{title: New Song}
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
}

export function generateFilename(content) {
  const title = extractTitle(content);
  return title.replace(/[^a-zA-Z0-9\s]/g, '').trim() + '.txt';
}

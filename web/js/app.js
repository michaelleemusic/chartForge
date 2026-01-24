// chartForge App - Main Entry Point

import { DEFAULT_CONFIG, IPAD_CONFIG } from './config.js';
import { parseChordPro, extractTitle, extractVersion } from './parser.js';
import { letterToNumber, convertSongToLetters } from './music.js';
import { ChartRenderer } from './renderer.js';
import {
  loadLibraryIndex,
  getLibraryIndex,
  loadSong as loadSongFromLibrary,
  saveSong,
  createSong,
  deleteSong as deleteSongFromLibrary,
  downloadSong,
  getNewSongTemplate,
  generateFilename
} from './library.js';
import { searchSongs, escapeHtml, getRandomSong } from './search.js';
import { exportSinglePdf, exportFullSet, downloadBlob } from './pdf.js';
import { highlightSyntax, syncHighlight, syncScroll, setupAutoComplete } from './editor.js';

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
const songSearchEl = document.getElementById('song-search');
const searchResultsEl = document.getElementById('search-results');
const randomBtn = document.getElementById('random-btn');
const contextMenu = document.getElementById('context-menu');
const renderKeySelect = document.getElementById('render-key');
const pageFormatSelect = document.getElementById('page-format');
const displayModeSelect = document.getElementById('display-mode');

// State
let renderer = new ChartRenderer();
let currentPage = 0;
let currentSongPath = null;
let selectedResultIndex = -1;

// Initialize
async function init() {
  // Load library index
  await loadLibraryIndex();
  const libraryIndex = getLibraryIndex();
  songSearchEl.placeholder = libraryIndex.length > 0
    ? `Search ${libraryIndex.length} songs...`
    : 'Library unavailable';

  // Load initial song
  await handleLoadSong('You Are My Refuge.txt');
  updateButtonStates();

  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Editor input and scroll
  inputEl.addEventListener('input', handleEditorInput);
  inputEl.addEventListener('scroll', () => syncScroll(inputEl, backdropEl));

  // Auto-complete
  setupAutoComplete(inputEl, handleEditorInput);

  // Page navigation
  prevBtn.addEventListener('click', handlePrevPage);
  nextBtn.addEventListener('click', handleNextPage);

  // Resize observer for preview
  const resizeObserver = new ResizeObserver(() => {
    if (renderer.song) {
      renderer.renderPage(canvas, currentPage, previewContainer);
    }
  });
  resizeObserver.observe(previewContainer);

  // Render controls
  renderKeySelect.addEventListener('change', render);
  pageFormatSelect.addEventListener('change', handlePageFormatChange);
  displayModeSelect.addEventListener('change', handleDisplayModeChange);

  // Library management
  document.getElementById('new-btn').addEventListener('click', handleNew);
  document.getElementById('update-btn').addEventListener('click', handleUpdate);
  document.getElementById('delete-btn').addEventListener('click', handleDelete);

  // Search
  songSearchEl.addEventListener('input', handleSearchInput);
  songSearchEl.addEventListener('focus', handleSearchFocus);
  songSearchEl.addEventListener('keydown', handleSearchKeydown);
  searchResultsEl.addEventListener('click', handleSearchResultClick);
  document.addEventListener('click', handleDocumentClick);
  randomBtn.addEventListener('click', handleRandomSong);

  // PDF export
  document.getElementById('download-pdf-btn').addEventListener('click', handleDownloadPdf);
  document.getElementById('download-fullset-btn').addEventListener('click', handleDownloadFullSet);

  // PDF import
  const importPdfBtn = document.getElementById('import-pdf-btn');
  const pdfFileInput = document.getElementById('pdf-file-input');
  importPdfBtn.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('change', handlePdfImport);

  // Convert to Numbers
  document.getElementById('convert-numbers-btn').addEventListener('click', handleConvertToNumbers);

  // Context menu
  inputEl.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', () => contextMenu.hidden = true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') contextMenu.hidden = true;
  });
  contextMenu.addEventListener('click', handleContextMenuAction);
}

// Render function
function render() {
  try {
    errorEl.style.display = 'none';
    const input = inputEl.value;
    let song = parseChordPro(input);

    // Apply page format and display mode
    const format = pageFormatSelect.value;
    const baseConfig = format === 'ipad' ? IPAD_CONFIG : DEFAULT_CONFIG;
    renderer.config = { ...baseConfig, displayMode: displayModeSelect.value };

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
}

function handleEditorInput() {
  syncHighlight(inputEl, highlightEl);
  render();
}

function updatePageControls() {
  const pageCount = renderer.layout ? renderer.layout.pageCount : 1;
  pageInfoEl.textContent = `Page ${currentPage + 1} of ${pageCount}`;
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage >= pageCount - 1;
}

function handlePrevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  }
}

function handleNextPage() {
  if (renderer.layout && currentPage < renderer.layout.pageCount - 1) {
    currentPage++;
    renderer.renderPage(canvas, currentPage, previewContainer);
    updatePageControls();
  }
}

function handlePageFormatChange() {
  const format = pageFormatSelect.value;
  const baseConfig = format === 'ipad' ? IPAD_CONFIG : DEFAULT_CONFIG;
  // Preserve current display mode when switching formats
  const currentDisplayMode = renderer.config.displayMode;
  renderer.config = { ...baseConfig, displayMode: currentDisplayMode };
  renderer.layout = renderer.calculateLayout();
  currentPage = 0;
  renderer.renderPage(canvas, currentPage, previewContainer);
  updatePageControls();
}

function handleDisplayModeChange() {
  renderer.config.displayMode = displayModeSelect.value;
  renderer.layout = renderer.calculateLayout();
  currentPage = 0;
  renderer.renderPage(canvas, currentPage, previewContainer);
  updatePageControls();
}

// Library Management
function updateButtonStates() {
  const updateBtn = document.getElementById('update-btn');
  const deleteBtn = document.getElementById('delete-btn');
  deleteBtn.disabled = !currentSongPath;
  // Update button always enabled, but changes label
  updateBtn.textContent = currentSongPath ? 'Update' : 'Save';
}

async function handleLoadSong(path) {
  try {
    const content = await loadSongFromLibrary(path);
    inputEl.value = content;
    currentSongPath = path;
    syncHighlight(inputEl, highlightEl);
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

function handleNew() {
  if (currentSongPath || inputEl.value.trim()) {
    if (!confirm('Create new song? Unsaved changes will be lost.')) return;
  }
  inputEl.value = getNewSongTemplate();
  currentSongPath = null;
  syncHighlight(inputEl, highlightEl);
  render();
  updateButtonStates();
}

async function handleUpdate() {
  if (currentSongPath) {
    // Update existing song
    const content = inputEl.value;
    try {
      await saveSong(currentSongPath, content);
      alert('Song updated successfully!');
      await loadLibraryIndex();
    } catch (e) {
      // Fallback: offer download
      console.error('API not available, using download fallback:', e);
      downloadSong(content, currentSongPath);
    }
  } else {
    // Save as new song
    const content = inputEl.value;
    const filename = generateFilename(content);
    try {
      await createSong(filename, content);
      currentSongPath = filename;
      alert('Song saved to library!');
      await loadLibraryIndex();
      updateButtonStates();
    } catch (e) {
      // Fallback: offer download
      console.error('API not available, using download fallback:', e);
      downloadSong(content, filename);
    }
  }
}

async function handleDelete() {
  if (!currentSongPath) {
    alert('No song loaded from library.');
    return;
  }

  const title = extractTitle(inputEl.value);
  if (!confirm(`Move "${title}" to trash?`)) {
    return;
  }

  try {
    await deleteSongFromLibrary(currentSongPath);
    alert('Song moved to trash.');
    currentSongPath = null;
    handleNew();
    await loadLibraryIndex();
  } catch (e) {
    console.error('API not available:', e);
    alert('Delete requires the API server. Run: node web/server.js');
  }
}

// Search
function handleSearchInput(e) {
  const libraryIndex = getLibraryIndex();
  const results = searchSongs(e.target.value, libraryIndex);
  selectedResultIndex = -1;
  showSearchResults(results);
}

function handleSearchFocus() {
  if (songSearchEl.value.trim()) {
    const libraryIndex = getLibraryIndex();
    const results = searchSongs(songSearchEl.value, libraryIndex);
    showSearchResults(results);
  }
}

function handleSearchKeydown(e) {
  const results = searchResultsEl.querySelectorAll('.search-result');
  if (results.length === 0) return;

  const libraryIndex = getLibraryIndex();

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedResultIndex = Math.min(selectedResultIndex + 1, results.length - 1);
    showSearchResults(searchSongs(songSearchEl.value, libraryIndex));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedResultIndex = Math.max(selectedResultIndex - 1, 0);
    showSearchResults(searchSongs(songSearchEl.value, libraryIndex));
  } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
    e.preventDefault();
    const selected = results[selectedResultIndex];
    if (selected) handleLoadSong(selected.dataset.path);
  } else if (e.key === 'Escape') {
    hideSearchResults();
  }
}

function handleSearchResultClick(e) {
  const result = e.target.closest('.search-result');
  if (result) handleLoadSong(result.dataset.path);
}

function handleDocumentClick(e) {
  if (!e.target.closest('.search-container')) {
    hideSearchResults();
  }
}

function handleRandomSong() {
  const libraryIndex = getLibraryIndex();
  const song = getRandomSong(libraryIndex);
  if (song) handleLoadSong(song.path);
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

// PDF Export
async function handleDownloadPdf() {
  if (!renderer.layout) return;

  const keyLabel = renderKeySelect.value === 'numbers' ? 'Numbers' : renderKeySelect.value;
  await exportSinglePdf(renderer, inputEl.value, {
    displayMode: displayModeSelect.value,
    renderKey: renderKeySelect.value,
    keyLabel
  });

  // Restore preview after export
  renderer.renderPage(canvas, currentPage, previewContainer);
}

async function handleDownloadFullSet() {
  const btn = document.getElementById('download-fullset-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;

  try {
    const result = await exportFullSet(renderer, inputEl.value, (current, total) => {
      btn.textContent = `${current}/${total}...`;
    });

    btn.textContent = 'Zipping...';
    downloadBlob(result.blob, result.filename);
  } finally {
    // Restore original view
    render();
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// PDF Import
async function handlePdfImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('pdf', file);

  const importPdfBtn = document.getElementById('import-pdf-btn');
  importPdfBtn.textContent = 'Importing...';
  importPdfBtn.disabled = true;
  importPdfBtn.classList.add('loading');

  try {
    const response = await fetch('api/import/pdf', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const chordpro = await response.text();
      inputEl.value = chordpro;
      currentSongPath = null;
      syncHighlight(inputEl, highlightEl);
      render();
      updateButtonStates();
    } else {
      const error = await response.text();
      alert('Import failed: ' + error);
    }
  } catch (e) {
    alert('Import failed: ' + e.message);
    console.error('PDF import error:', e);
  } finally {
    importPdfBtn.textContent = 'Import PDF';
    importPdfBtn.disabled = false;
    importPdfBtn.classList.remove('loading');
    document.getElementById('pdf-file-input').value = ''; // Reset file input
  }
}

// Convert to Numbers
function handleConvertToNumbers() {
  const input = inputEl.value;

  // Extract key from content
  const keyMatch = input.match(/\{key:\s*([A-G][#b]?m?)\}/i);
  if (!keyMatch) {
    alert('Please specify a key first: {key: C}');
    return;
  }

  const key = keyMatch[1];

  // Convert all [Chord] occurrences to number notation
  const converted = input.replace(/\[([^\]]+)\]/g, (match, chord) => {
    // Skip if already a number chord
    if (/^[#b]?[1-7]/.test(chord)) {
      return match;
    }

    const numberChord = letterToNumber(chord, key);
    return '[' + numberChord + ']';
  });

  inputEl.value = converted;
  currentSongPath = null;
  syncHighlight(inputEl, highlightEl);
  render();
  updateButtonStates();
}

// Context Menu
function handleContextMenu(e) {
  e.preventDefault();

  const hasSelection = inputEl.selectionStart !== inputEl.selectionEnd;

  // Position menu at cursor
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';

  // Enable/disable items based on selection
  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.classList.toggle('disabled', !hasSelection);
  });

  contextMenu.hidden = false;
}

function handleContextMenuAction(e) {
  const item = e.target.closest('.context-menu-item');
  if (!item || item.classList.contains('disabled')) return;

  const action = item.dataset.action;
  const start = inputEl.selectionStart;
  const end = inputEl.selectionEnd;
  const text = inputEl.value;
  const selectedText = text.substring(start, end);

  if (!selectedText) return;

  let newText;

  switch (action) {
    case 'copy-chords':
      // Copy only chords to clipboard (preserve line structure)
      const chordsText = selectedText.split('\n').map(line => {
        if (line.trim().startsWith('{')) return '';
        const chords = [];
        const regex = /\[([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          chords.push('[' + match[1] + ']');
        }
        return chords.join(' ');
      }).filter(line => line.trim()).join('\n');
      navigator.clipboard.writeText(chordsText);
      contextMenu.hidden = true;
      return;

    case 'copy-lyrics':
      // Copy only lyrics to clipboard (remove chords)
      const lyricsText = selectedText.split('\n').map(line => {
        if (line.trim().startsWith('{')) return '';
        return line.replace(/\[[^\]]*\]/g, '').trim();
      }).filter(line => line.trim()).join('\n');
      navigator.clipboard.writeText(lyricsText);
      contextMenu.hidden = true;
      return;

    case 'strip-chords':
      // Remove chords, keep lyrics
      newText = selectedText.replace(/\[[^\]]*\]/g, '');
      break;

    case 'strip-lyrics':
      // Remove lyrics, keep chords (preserve line structure)
      newText = selectedText.split('\n').map(line => {
        if (line.trim().startsWith('{')) return line;
        const chords = [];
        const regex = /\[([^\]]+)\]/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          chords.push('[' + match[1] + ']');
        }
        return chords.join(' ');
      }).join('\n');
      break;

    default:
      return;
  }

  // Replace selection with new text
  inputEl.value = text.substring(0, start) + newText + text.substring(end);
  inputEl.selectionStart = start;
  inputEl.selectionEnd = start + newText.length;
  inputEl.focus();

  // Trigger re-render
  syncHighlight(inputEl, highlightEl);
  render();

  contextMenu.hidden = true;
}

// Initialize the app
init();

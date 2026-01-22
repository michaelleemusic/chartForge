const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.join(__dirname, '..');
const LIBRARY_DIR = path.join(ROOT, 'library');
const TRASH_DIR = path.join(LIBRARY_DIR, 'trash');

// Ensure trash directory exists
if (!fs.existsSync(TRASH_DIR)) {
  fs.mkdirSync(TRASH_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function rebuildIndex() {
  const files = fs.readdirSync(LIBRARY_DIR).filter(f => f.endsWith('.txt'));
  const index = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(LIBRARY_DIR, file), 'utf-8');
    const titleMatch = content.match(/\{title:\s*(.+?)\}/i);
    const artistMatch = content.match(/\{artist:\s*(.+?)\}/i);
    const keyMatch = content.match(/\{key:\s*(.+?)\}/i);

    index.push({
      title: titleMatch ? titleMatch[1].trim() : file.replace('.txt', ''),
      artist: artistMatch ? artistMatch[1].trim() : '',
      key: keyMatch ? keyMatch[1].trim() : '',
      path: file
    });
  }

  index.sort((a, b) => a.title.localeCompare(b.title));
  fs.writeFileSync(path.join(LIBRARY_DIR, 'index.json'), JSON.stringify(index, null, 2));
  return index.length;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname.startsWith('/api/library/')) {
    const filename = decodeURIComponent(url.pathname.replace('/api/library/', ''));
    const filepath = path.join(LIBRARY_DIR, filename);

    // Security: prevent path traversal
    if (!filepath.startsWith(LIBRARY_DIR) || filename.includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      // Save/Update song
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          fs.writeFileSync(filepath, body, 'utf-8');
          rebuildIndex();
          res.writeHead(200);
          res.end('OK');
          console.log(`Saved: ${filename}`);
        } catch (e) {
          res.writeHead(500);
          res.end(e.message);
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      // Move to trash
      try {
        const trashPath = path.join(TRASH_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.renameSync(filepath, trashPath);
          rebuildIndex();
          res.writeHead(200);
          res.end('OK');
          console.log(`Trashed: ${filename}`);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } catch (e) {
        res.writeHead(500);
        res.end(e.message);
      }
      return;
    }
  }

  // Static file serving
  let filepath = decodeURIComponent(url.pathname);
  if (filepath === '/') filepath = '/web/index.html';
  // Rewrite root-level assets to web/ folder (mirrors .htaccess)
  if (filepath === '/styles.css') filepath = '/web/styles.css';
  if (filepath === '/app.js') filepath = '/web/app.js';

  const fullPath = path.join(ROOT, filepath);

  // Security: prevent path traversal
  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, 'localhost', () => {
  console.log(`chartForge server running at http://localhost:${PORT}`);
  console.log(`Library: ${LIBRARY_DIR}`);
  console.log(`Trash: ${TRASH_DIR}`);
});

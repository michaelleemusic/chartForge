const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

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
  const index = [];

  function scanDir(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'trash') {
        scanDir(path.join(dir, entry.name), prefix + entry.name + '/');
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const filePath = path.join(dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        const titleMatch = content.match(/\{title:\s*(.+?)\}/i);
        const artistMatch = content.match(/\{artist:\s*(.+?)\}/i);
        const keyMatch = content.match(/\{key:\s*(.+?)\}/i);

        index.push({
          title: titleMatch ? titleMatch[1].trim() : entry.name.replace('.txt', ''),
          artist: artistMatch ? artistMatch[1].trim() : '',
          key: keyMatch ? keyMatch[1].trim() : '',
          path: prefix + entry.name
        });
      }
    }
  }

  scanDir(LIBRARY_DIR);
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

  // PDF Import API
  if (url.pathname === '/api/import/pdf' && req.method === 'POST') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      // Parse multipart form data to extract PDF file
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)$/);

      if (!boundaryMatch) {
        res.writeHead(400);
        res.end('Invalid content type');
        return;
      }

      const boundary = boundaryMatch[1];
      const parts = buffer.toString('binary').split('--' + boundary);

      let pdfData = null;
      for (const part of parts) {
        if (part.includes('filename=') && part.includes('.pdf')) {
          // Find the start of file content (after double CRLF)
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            // Extract binary data, removing trailing CRLF
            let fileContent = part.slice(headerEnd + 4);
            if (fileContent.endsWith('\r\n')) {
              fileContent = fileContent.slice(0, -2);
            }
            pdfData = Buffer.from(fileContent, 'binary');
          }
        }
      }

      if (!pdfData) {
        res.writeHead(400);
        res.end('No PDF file found in request');
        return;
      }

      // Save PDF to temp file
      const tempDir = os.tmpdir();
      const tempPdf = path.join(tempDir, `chartforge_import_${Date.now()}.pdf`);

      try {
        fs.writeFileSync(tempPdf, pdfData);

        // Run Python converter script - try multiple Python paths
        const scriptPath = path.join(ROOT, 'scripts', 'convert_pdf.py');
        const pythonPaths = [
          '/Applications/Xcode.app/Contents/Developer/usr/bin/python3',
          '/opt/homebrew/bin/python3',
          '/usr/local/bin/python3',
          'python3'
        ];

        let result = null;
        let lastError = null;

        for (const pythonPath of pythonPaths) {
          try {
            result = execSync(`"${pythonPath}" "${scriptPath}" "${tempPdf}"`, {
              encoding: 'utf-8',
              maxBuffer: 10 * 1024 * 1024 // 10MB
            });
            break; // Success, exit loop
          } catch (e) {
            lastError = e;
            continue; // Try next Python path
          }
        }

        if (!result) {
          throw lastError || new Error('No working Python found');
        }

        // Clean up temp file
        fs.unlinkSync(tempPdf);

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(result);
        console.log('PDF imported successfully');

      } catch (e) {
        // Clean up temp file on error
        if (fs.existsSync(tempPdf)) {
          fs.unlinkSync(tempPdf);
        }

        console.error('PDF import error:', e.message);
        res.writeHead(500);
        res.end('PDF conversion failed: ' + e.message);
      }
    });
    return;
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
  const count = rebuildIndex();
  console.log(`chartForge server running at http://localhost:${PORT}`);
  console.log(`Library: ${LIBRARY_DIR} (${count} songs indexed)`);
  console.log(`Trash: ${TRASH_DIR}`);
});

<?php
/**
 * chartForge PHP Server
 *
 * Run locally: php -S localhost:3000 web/index.php
 * Deploy to DreamHost: upload entire project, point domain to project root
 */

$ROOT = dirname(__DIR__);
$LIBRARY_DIR = $ROOT . '/library';
$TRASH_DIR = $LIBRARY_DIR . '/trash';

// Allowed emails for full library access
$ALLOWED_EMAILS = ['michael@michaelleemusic.com', 'mlee@apu.edu'];

// Ensure trash directory exists
if (!is_dir($TRASH_DIR)) {
    mkdir($TRASH_DIR, 0755, true);
}

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Check auth cookie
function isAuthenticated() {
    global $ALLOWED_EMAILS;
    if (isset($_COOKIE['cf_auth'])) {
        $email = base64_decode($_COOKIE['cf_auth']);
        return in_array($email, $ALLOWED_EMAILS);
    }
    return false;
}

// Normalize URI: extract the API/resource path from the full URI
// Handles both /api/... and /chartforge/api/... patterns
if (preg_match('#(/api/.*)$#', $uri, $matches)) {
    $uri = $matches[1];
} elseif (preg_match('#(/library/.*)$#', $uri, $matches)) {
    $uri = $matches[1];
}

// MIME types for static files
$mimeTypes = [
    'html' => 'text/html',
    'js' => 'application/javascript',
    'css' => 'text/css',
    'json' => 'application/json',
    'txt' => 'text/plain',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'svg' => 'image/svg+xml',
    'ttf' => 'font/ttf',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
];

// Helper: send JSON response
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Helper: send text response
function textResponse($text, $code = 200) {
    http_response_code($code);
    header('Content-Type: text/plain');
    echo $text;
    exit;
}

// Helper: rebuild library index (recursive)
function rebuildIndex($libraryDir) {
    $index = [];

    // Recursively find all .txt files
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($libraryDir, RecursiveDirectoryIterator::SKIP_DOTS)
    );

    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'txt') {
            // Skip trash folder
            if (strpos($file->getPathname(), '/trash/') !== false) continue;

            $content = file_get_contents($file->getPathname());

            // Get path relative to library dir
            $relativePath = str_replace($libraryDir . '/', '', $file->getPathname());

            preg_match('/\{title:\s*(.+?)\}/i', $content, $titleMatch);
            preg_match('/\{artist:\s*(.+?)\}/i', $content, $artistMatch);
            preg_match('/\{key:\s*(.+?)\}/i', $content, $keyMatch);

            $index[] = [
                'title' => isset($titleMatch[1]) ? trim($titleMatch[1]) : str_replace('.txt', '', basename($file)),
                'artist' => isset($artistMatch[1]) ? trim($artistMatch[1]) : '',
                'key' => isset($keyMatch[1]) ? trim($keyMatch[1]) : '',
                'path' => $relativePath,
            ];
        }
    }

    usort($index, function($a, $b) {
        return strcasecmp($a['title'], $b['title']);
    });

    file_put_contents($libraryDir . '/index.json', json_encode($index, JSON_PRETTY_PRINT));
    return count($index);
}

// API Routes

// POST /api/auth - Set auth cookie
if ($uri === '/api/auth' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = strtolower(trim($data['email'] ?? ''));

    if (in_array($email, $ALLOWED_EMAILS)) {
        // Set persistent cookie (30 days)
        setcookie('cf_auth', base64_encode($email), [
            'expires' => time() + (30 * 24 * 60 * 60),
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        jsonResponse(['success' => true]);
    } else {
        jsonResponse(['success' => false, 'error' => 'Email not authorized'], 403);
    }
}

// GET /api/auth/status - Check if authenticated
if ($uri === '/api/auth/status' && $method === 'GET') {
    jsonResponse(['authenticated' => isAuthenticated()]);
}

// GET /api/library - Return filtered library index
if ($uri === '/api/library' && $method === 'GET') {
    $indexPath = $LIBRARY_DIR . '/index.json';
    if (!file_exists($indexPath)) {
        jsonResponse([]);
    }
    $index = json_decode(file_get_contents($indexPath), true);

    if (!isAuthenticated()) {
        // Filter to pd/ songs only for public users
        $index = array_filter($index, function($song) {
            return strpos($song['path'], 'pd/') === 0;
        });
        $index = array_values($index);
    }

    jsonResponse($index);
}

// Rebuild index endpoint
if ($uri === '/api/rebuild-index' && $method === 'POST') {
    $count = rebuildIndex($LIBRARY_DIR);
    jsonResponse(['status' => 'ok', 'indexed' => $count]);
}

if (strpos($uri, '/api/library/') === 0) {
    $filename = urldecode(substr($uri, strlen('/api/library/')));
    $filepath = $LIBRARY_DIR . '/' . $filename;

    // Security: prevent path traversal
    if (strpos(realpath(dirname($filepath)), realpath($LIBRARY_DIR)) !== 0 || strpos($filename, '..') !== false) {
        textResponse('Forbidden', 403);
    }

    // Protect write operations - require authentication
    if (in_array($method, ['PUT', 'POST', 'DELETE']) && !isAuthenticated()) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }

    // PUT/POST - Save song
    if ($method === 'PUT' || $method === 'POST') {
        $content = file_get_contents('php://input');

        if (file_put_contents($filepath, $content) !== false) {
            rebuildIndex($LIBRARY_DIR);
            textResponse('OK');
        } else {
            textResponse('Failed to save file', 500);
        }
    }

    // DELETE - Move to trash
    if ($method === 'DELETE') {
        $trashPath = $TRASH_DIR . '/' . $filename;

        if (file_exists($filepath)) {
            if (rename($filepath, $trashPath)) {
                rebuildIndex($LIBRARY_DIR);
                textResponse('OK');
            } else {
                textResponse('Failed to move file', 500);
            }
        } else {
            textResponse('Not found', 404);
        }
    }

    textResponse('Method not allowed', 405);
}

// PDF Import API
if ($uri === '/api/import/pdf' && $method === 'POST') {
    // Protect PDF import - require authentication
    if (!isAuthenticated()) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }

    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        textResponse('No PDF file uploaded or upload error', 400);
    }

    $tmpFile = $_FILES['pdf']['tmp_name'];
    $scriptPath = $ROOT . '/scripts/convert_pdf.py';

    // Check if Python and script exist
    if (!file_exists($scriptPath)) {
        textResponse('PDF converter script not found', 500);
    }

    // Rate limiting: Only allow one concurrent PDF conversion
    $lockFile = '/tmp/chartforge_pdf_convert.lock';
    $lock = fopen($lockFile, 'w');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
        if ($lock) fclose($lock);
        textResponse('Another PDF conversion is in progress. Please wait a moment and try again.', 429);
    }

    // Run Python converter script with nice (lowest CPU priority)
    $cmd = 'nice -n 19 python3 ' . escapeshellarg($scriptPath) . ' ' . escapeshellarg($tmpFile) . ' 2>&1';
    $output = shell_exec($cmd);

    // Release lock
    flock($lock, LOCK_UN);
    fclose($lock);

    if ($output === null) {
        textResponse('PDF conversion failed - could not execute script', 500);
    }

    // Check for error output
    if (strpos($output, 'Error:') === 0 || strpos($output, 'Traceback') !== false) {
        textResponse('PDF conversion failed: ' . $output, 500);
    }

    header('Content-Type: text/plain; charset=utf-8');
    echo $output;
    exit;
}

// Static file serving
if ($uri === '/' || $uri === '') {
    $uri = '/web/index.html';
}

// Route /ml to gateway page
if ($uri === '/ml') {
    $uri = '/web/ml.html';
}

// Route static assets to web/ folder (for PHP built-in server)
if ($uri === '/styles.css') {
    $uri = '/web/styles.css';
}
if (preg_match('#^/js/(.+)$#', $uri, $matches)) {
    $uri = '/web/js/' . $matches[1];
}

// URL decode for filenames with spaces
$uri = urldecode($uri);
$filePath = $ROOT . $uri;

// Security: prevent path traversal
$realPath = realpath($filePath);
if ($realPath === false || strpos($realPath, realpath($ROOT)) !== 0) {
    http_response_code(404);
    echo 'Not found';
    exit;
}

if (is_file($realPath)) {
    $ext = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
    $contentType = isset($mimeTypes[$ext]) ? $mimeTypes[$ext] : 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Cache-Control: no-cache');
    readfile($realPath);
    exit;
}

http_response_code(404);
echo 'Not found';

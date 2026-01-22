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

// Ensure trash directory exists
if (!is_dir($TRASH_DIR)) {
    mkdir($TRASH_DIR, 0755, true);
}

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

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
if (strpos($uri, '/api/library/') === 0) {
    $filename = urldecode(substr($uri, strlen('/api/library/')));
    $filepath = $LIBRARY_DIR . '/' . $filename;

    // Security: prevent path traversal
    if (strpos(realpath(dirname($filepath)), realpath($LIBRARY_DIR)) !== 0 || strpos($filename, '..') !== false) {
        textResponse('Forbidden', 403);
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

// Static file serving
if ($uri === '/' || $uri === '') {
    $uri = '/web/index.html';
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

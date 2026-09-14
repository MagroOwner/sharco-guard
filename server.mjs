import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDirectory } from './engine/scanner.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function reply(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (request.method === 'POST' && url.pathname === '/api/scan') {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    try {
      const { path } = JSON.parse(raw);
      if (typeof path !== 'string' || !path.trim()) throw new Error('Enter a folder path to scan.');
      const report = await scanDirectory(path.trim());
      reply(response, 200, report);
    } catch (error) {
      reply(response, 400, { error: error.message });
    }
    return;
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filename = normalize(join(root, 'public', requested));
  if (!filename.startsWith(join(root, 'public'))) return reply(response, 403, { error: 'Forbidden.' });
  try {
    reply(response, 200, await readFile(filename), contentTypes[extname(filename)] ?? 'application/octet-stream');
  } catch { reply(response, 404, { error: 'Not found.' }); }
}).listen(4173, () => console.log('Sharco Guard is running at http://localhost:4173'));

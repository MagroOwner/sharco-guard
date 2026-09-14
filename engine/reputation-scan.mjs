import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, opendir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const RISKY_EXTENSIONS = new Set(['.bat', '.cmd', '.com', '.exe', '.js', '.jse', '.msi', '.ps1', '.scr', '.vbs', '.vbe', '.wsf']);
const MAX_FILES = 5_000;

async function collect(directory, files) {
  const handle = await opendir(directory);
  for await (const entry of handle) {
    if (files.length >= MAX_FILES) return;
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await collect(file, files);
    else if (entry.isFile()) files.push(file);
  }
}

export function sha256File(file) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(file);
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

async function lookup(endpoint, sha256) {
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha256 })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Threat lookup failed.');
  return body;
}

/** Read file bytes only; no file is launched, loaded, or executed. */
export async function reputationScan(target, endpoint, onProgress = () => {}) {
  const directory = resolve(target);
  if (!(await lstat(directory)).isDirectory()) throw new Error('The scan target must be a folder.');
  const files = [];
  await collect(directory, files);
  const findings = [];
  let completed = 0;
  for (const file of files) {
    try {
      const sha256 = await sha256File(file);
      const reputation = await lookup(endpoint, sha256);
      if (reputation.verdict === 'malicious') {
        findings.push({ severity: 'threat', file, sha256, detection: reputation.detection });
      } else if (RISKY_EXTENSIONS.has(extname(file).toLowerCase())) {
        findings.push({ severity: 'review', file, sha256, reason: 'Executable or script file; no confirmed cloud match.' });
      }
    } catch (error) {
      findings.push({ severity: 'error', file, reason: `Could not check file: ${error.message}` });
    }
    completed++;
    onProgress({ completed, total: files.length, file });
  }
  return { target: directory, filesScanned: completed, truncated: files.length >= MAX_FILES, findings };
}

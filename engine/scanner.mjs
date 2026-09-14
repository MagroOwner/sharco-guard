import { lstat, opendir, readFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
const RISKY_EXTENSIONS = new Set(['.bat', '.cmd', '.com', '.exe', '.js', '.jse', '.msi', '.ps1', '.scr', '.vbs', '.vbe', '.wsf']);
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function walk(directory, files) {
  const handle = await opendir(directory);
  for await (const entry of handle) {
    if (files.length >= MAX_FILES) return;
    const file = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await walk(file, files);
    else if (entry.isFile()) files.push(file);
  }
}

export async function scanDirectory(target) {
  const directory = resolve(target);
  const info = await lstat(directory);
  if (!info.isDirectory()) throw new Error('The scan target must be a folder.');
  const files = [];
  const started = Date.now();
  await walk(directory, files);
  const findings = [];
  let reviewed = 0;
  for (const file of files) {
    const stat = await lstat(file);
    const extension = extname(file).toLowerCase();
    if (RISKY_EXTENSIONS.has(extension)) findings.push({ severity: 'review', file, reason: `Executable or script file (${extension})` });
    if (stat.size > MAX_FILE_BYTES) continue;
    try {
      const data = await readFile(file, 'latin1');
      if (data.includes(EICAR)) findings.push({ severity: 'threat', file, reason: 'EICAR antivirus test signature' });
    } catch { /* unreadable files are skipped */ }
    reviewed++;
  }
  return { target: directory, filesScanned: reviewed, truncated: files.length >= MAX_FILES, findings, elapsedMs: Date.now() - started, engine: 'Sharco Guard Prototype 0.1' };
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target) throw new Error('Usage: npm run scan -- <folder>');
  console.log(JSON.stringify(await scanDirectory(target), null, 2));
}

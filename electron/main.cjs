const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

const DEFAULT_ENDPOINT = 'https://sharco-guard.vercel.app/api/v1/reputation';
let window;
const settingsPath = () => join(app.getPath('userData'), 'settings.json');
async function getSettings() {
  try { return { endpoint: DEFAULT_ENDPOINT, ...JSON.parse(await readFile(settingsPath(), 'utf8')) }; }
  catch { return { endpoint: DEFAULT_ENDPOINT }; }
}
async function createWindow() {
  window = new BrowserWindow({ width: 1080, height: 780, minWidth: 860, minHeight: 640,
    webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  await window.loadFile(join(__dirname, '..', 'desktop', 'index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('settings:get', getSettings);
ipcMain.handle('settings:save', async (_, settings) => {
  const endpoint = String(settings?.endpoint ?? '').trim();
  if (!/^https:\/\/[^\s]+\/api\/v1\/reputation$/.test(endpoint)) throw new Error('Enter a valid HTTPS reputation API URL.');
  await writeFile(settingsPath(), JSON.stringify({ endpoint }, null, 2), 'utf8'); return { endpoint };
});
ipcMain.handle('folder:choose', async () => {
  const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('scan:start', async (_, target) => {
  const { reputationScan } = await import('../engine/reputation-scan.mjs');
  const { endpoint } = await getSettings();
  return reputationScan(target, endpoint, progress => window?.webContents.send('scan:progress', progress));
});

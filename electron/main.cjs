const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
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
function sendUpdate(event, detail = {}) { window?.webContents.send('update:status', { event, ...detail }); }
function configureUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.on('checking-for-update', () => sendUpdate('checking'));
  autoUpdater.on('update-available', info => sendUpdate('available', { version: info.version }));
  autoUpdater.on('update-not-available', () => sendUpdate('current'));
  autoUpdater.on('download-progress', progress => sendUpdate('downloading', { percent: progress.percent }));
  autoUpdater.on('update-downloaded', info => sendUpdate('downloaded', { version: info.version }));
  autoUpdater.on('error', error => sendUpdate('error', { message: error.message }));
  autoUpdater.checkForUpdates().catch(() => {});
}
app.whenReady().then(() => { createWindow().then(configureUpdates); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
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
ipcMain.handle('updates:check', async () => { if (!app.isPackaged) return { supported: false }; await autoUpdater.checkForUpdates(); return { supported: true }; });
ipcMain.handle('updates:download', () => autoUpdater.downloadUpdate());
ipcMain.handle('updates:install', () => autoUpdater.quitAndInstall());

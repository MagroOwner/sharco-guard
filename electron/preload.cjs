const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('guard', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  startScan: folder => ipcRenderer.invoke('scan:start', folder),
  onProgress: callback => ipcRenderer.on('scan:progress', (_, progress) => callback(progress)),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdate: callback => ipcRenderer.on('update:status', (_, update) => callback(update))
});

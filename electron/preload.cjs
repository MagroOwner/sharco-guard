const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('guard', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  startScan: folder => ipcRenderer.invoke('scan:start', folder),
  onProgress: callback => ipcRenderer.on('scan:progress', (_, progress) => callback(progress))
});

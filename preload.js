// Preload is kept minimal for now as we do not need Node APIs in the renderer.
// Context isolation is enabled; the renderer uses DOM-only APIs.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sigmaAPI', {
	onNewTab: (callback) => ipcRenderer.on('new-tab', (event, url) => callback(url)),
	onCopyLink: (callback) => ipcRenderer.on('copy-link', (event, url) => callback(url)),
	onShortcut: (callback) => ipcRenderer.on('shortcut', (event, action) => callback(action)),
});



const { ipcMain, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

class ExtensionAPIs {
  constructor(extensionManager) {
    this.extensionManager = extensionManager;
    this.browserWindows = new Map();
    this.extensionContexts = new Map();
    this.setupAPIs();
  }

  setupAPIs() {
    this.setupTabsAPI();
    this.setupStorageAPI();
    this.setupRuntimeAPI();
    this.setupBrowserActionAPI();
    this.setupContextMenusAPI();
  }

  // Chrome Tabs API Implementation
  setupTabsAPI() {
    ipcMain.handle('chrome.tabs.query', async (event, queryInfo) => {
      try {
        // Get all browser windows and their tabs
        const tabs = this.getAllTabs();
        return this.filterTabs(tabs, queryInfo);
      } catch (error) {
        console.error('chrome.tabs.query error:', error);
        return [];
      }
    });

    ipcMain.handle('chrome.tabs.get', async (event, tabId) => {
      try {
        const tabs = this.getAllTabs();
        return tabs.find(tab => tab.id === tabId) || null;
      } catch (error) {
        console.error('chrome.tabs.get error:', error);
        return null;
      }
    });

    ipcMain.handle('chrome.tabs.create', async (event, createProperties) => {
      try {
        // Send message to renderer to create new tab
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:createTab', createProperties);
          return { success: true };
        }
        return { success: false, error: 'No main window found' };
      } catch (error) {
        console.error('chrome.tabs.create error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.tabs.update', async (event, tabId, updateProperties) => {
      try {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:updateTab', { tabId, updateProperties });
          return { success: true };
        }
        return { success: false, error: 'No main window found' };
      } catch (error) {
        console.error('chrome.tabs.update error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.tabs.remove', async (event, tabIds) => {
      try {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
          mainWindow.webContents.send('extension:removeTabs', ids);
          return { success: true };
        }
        return { success: false, error: 'No main window found' };
      } catch (error) {
        console.error('chrome.tabs.remove error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Chrome Storage API Implementation
  setupStorageAPI() {
    const storageDir = path.join(__dirname, 'extensions', 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    ipcMain.handle('chrome.storage.local.get', async (event, keys) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const storagePath = path.join(storageDir, `${extensionId}.json`);
        
        let data = {};
        if (fs.existsSync(storagePath)) {
          data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        }

        if (keys === null || keys === undefined) {
          return data;
        }

        if (typeof keys === 'string') {
          return { [keys]: data[keys] };
        }

        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            if (data.hasOwnProperty(key)) {
              result[key] = data[key];
            }
          });
          return result;
        }

        if (typeof keys === 'object') {
          const result = {};
          Object.keys(keys).forEach(key => {
            result[key] = data.hasOwnProperty(key) ? data[key] : keys[key];
          });
          return result;
        }

        return {};
      } catch (error) {
        console.error('chrome.storage.local.get error:', error);
        return {};
      }
    });

    ipcMain.handle('chrome.storage.local.set', async (event, items) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const storagePath = path.join(storageDir, `${extensionId}.json`);
        
        let data = {};
        if (fs.existsSync(storagePath)) {
          data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        }

        Object.assign(data, items);
        fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
        
        return { success: true };
      } catch (error) {
        console.error('chrome.storage.local.set error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.storage.local.remove', async (event, keys) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const storagePath = path.join(storageDir, `${extensionId}.json`);
        
        if (!fs.existsSync(storagePath)) {
          return { success: true };
        }

        let data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        
        keysToRemove.forEach(key => {
          delete data[key];
        });

        fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
        return { success: true };
      } catch (error) {
        console.error('chrome.storage.local.remove error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.storage.local.clear', async (event) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const storagePath = path.join(storageDir, `${extensionId}.json`);
        
        if (fs.existsSync(storagePath)) {
          fs.unlinkSync(storagePath);
        }
        
        return { success: true };
      } catch (error) {
        console.error('chrome.storage.local.clear error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Chrome Runtime API Implementation
  setupRuntimeAPI() {
    ipcMain.handle('chrome.runtime.getManifest', async (event) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const extension = this.extensionManager.extensions.get(extensionId);
        return extension ? extension.manifest : null;
      } catch (error) {
        console.error('chrome.runtime.getManifest error:', error);
        return null;
      }
    });

    ipcMain.handle('chrome.runtime.getURL', async (event, path) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        return `chrome-extension://${extensionId}/${path}`;
      } catch (error) {
        console.error('chrome.runtime.getURL error:', error);
        return '';
      }
    });

    ipcMain.handle('chrome.runtime.sendMessage', async (event, extensionId, message) => {
      try {
        // Handle inter-extension messaging
        const targetExtension = this.extensionManager.extensions.get(extensionId);
        if (targetExtension && targetExtension.enabled) {
          // Send message to target extension
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send('extension:message', {
              from: this.getExtensionIdFromEvent(event),
              to: extensionId,
              message
            });
          }
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.runtime.sendMessage error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Chrome Browser Action API Implementation
  setupBrowserActionAPI() {
    ipcMain.handle('chrome.browserAction.setTitle', async (event, details) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:setBrowserActionTitle', {
            extensionId,
            title: details.title,
            tabId: details.tabId
          });
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.browserAction.setTitle error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.browserAction.setBadgeText', async (event, details) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:setBrowserActionBadge', {
            extensionId,
            text: details.text,
            tabId: details.tabId
          });
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.browserAction.setBadgeText error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.browserAction.setBadgeBackgroundColor', async (event, details) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:setBrowserActionBadgeColor', {
            extensionId,
            color: details.color,
            tabId: details.tabId
          });
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.browserAction.setBadgeBackgroundColor error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Chrome Context Menus API Implementation
  setupContextMenusAPI() {
    ipcMain.handle('chrome.contextMenus.create', async (event, createProperties) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const menuId = createProperties.id || `menu_${Date.now()}`;
        
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:createContextMenu', {
            extensionId,
            menuId,
            properties: createProperties
          });
        }
        
        return menuId;
      } catch (error) {
        console.error('chrome.contextMenus.create error:', error);
        return null;
      }
    });

    ipcMain.handle('chrome.contextMenus.update', async (event, id, updateProperties) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:updateContextMenu', {
            extensionId,
            menuId: id,
            properties: updateProperties
          });
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.contextMenus.update error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('chrome.contextMenus.remove', async (event, menuId) => {
      try {
        const extensionId = this.getExtensionIdFromEvent(event);
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('extension:removeContextMenu', {
            extensionId,
            menuId
          });
        }
        return { success: true };
      } catch (error) {
        console.error('chrome.contextMenus.remove error:', error);
        return { success: false, error: error.message };
      }
    });
  }

  // Helper Methods
  getExtensionIdFromEvent(event) {
    // Extract extension ID from the event sender
    // This would be set when the extension context is created
    return event.sender.extensionId || 'unknown';
  }

  getAllTabs() {
    // This would interface with the main browser's tab system
    // For now, return a mock structure
    return [
      {
        id: 1,
        url: 'https://example.com',
        title: 'Example',
        active: true,
        windowId: 1,
        index: 0
      }
    ];
  }

  filterTabs(tabs, queryInfo) {
    return tabs.filter(tab => {
      if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
      if (queryInfo.url && !tab.url.includes(queryInfo.url)) return false;
      if (queryInfo.title && !tab.title.includes(queryInfo.title)) return false;
      if (queryInfo.windowId !== undefined && tab.windowId !== queryInfo.windowId) return false;
      return true;
    });
  }
}

module.exports = ExtensionAPIs;

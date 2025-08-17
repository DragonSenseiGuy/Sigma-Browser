const { globalShortcut } = require('electron');

const { app, BrowserWindow, nativeImage, Menu, MenuItem, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Helper to build a full context menu with Inspect Element at the end
function buildFullContextMenu(webContents, params) {
  const menu = new Menu();
  if (params.isEditable) {
    menu.append(new MenuItem({ role: 'undo' }));
    menu.append(new MenuItem({ role: 'redo' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ role: 'cut' }));
    menu.append(new MenuItem({ role: 'copy' }));
    menu.append(new MenuItem({ role: 'paste' }));
    menu.append(new MenuItem({ role: 'delete' }));
    menu.append(new MenuItem({ role: 'selectAll' }));
  } else if (params.selectionText) {
    menu.append(new MenuItem({ role: 'copy' }));
    menu.append(new MenuItem({ role: 'selectAll' }));
  }
  if (params.linkURL) {
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Open Link in New Tab',
      click: () => {
        const win = BrowserWindow.fromWebContents(webContents);
        win.webContents.send('new-tab', params.linkURL);
      }
    }));
    menu.append(new MenuItem({
      label: 'Copy Link',
      click: () => {
        const win = BrowserWindow.fromWebContents(webContents);
        win.webContents.send('copy-link', params.linkURL);
      }
    }));
  }
  if (params.hasImageContents) {
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Save Image As...',
      click: () => {
        webContents.downloadURL(params.srcURL);
      }
    }));
    menu.append(new MenuItem({
      label: 'Copy Image',
      click: () => {
        webContents.copyImageAt(params.x, params.y);
      }
    }));
  }
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({
    label: 'Back',
    enabled: webContents.canGoBack(),
    click: () => webContents.goBack()
  }));
  menu.append(new MenuItem({
    label: 'Forward',
    enabled: webContents.canGoForward(),
    click: () => webContents.goForward()
  }));
  menu.append(new MenuItem({
    label: 'Reload',
    click: () => webContents.reload()
  }));
  // Always add Inspect Element at the end
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({
    label: 'Inspect Element',
    click: () => {
      webContents.inspectElement(params.x, params.y);
      if (webContents.isDevToolsOpened()) {
        webContents.devToolsWebContents.focus();
      }
    }
  }));
  return menu;
}

function createWindow() {
  // macOS-specific icon configuration for Retina support
  const appIconsPath = path.join(__dirname, 'assets', 'AppIcons');

  // Create icon for window (macOS will automatically choose appropriate size)
  let windowIcon = undefined;
  const icon512Path = path.join(appIconsPath, '512.png');
  if (fs.existsSync(icon512Path)) {
    windowIcon = icon512Path;
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Sigma',
    icon: windowIcon, // macOS-optimized icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set high-quality dock icon on macOS with Retina support
  if (process.platform === 'darwin') {
    // Use the highest resolution icon available for the dock
    const dockIconPath = path.join(appIconsPath, '1024.png');
    if (fs.existsSync(dockIconPath)) {
      const image = nativeImage.createFromPath(dockIconPath);
      if (!image.isEmpty() && app.dock) {
        app.dock.setIcon(image);
      }
    }
  }

  // Load local UI which implements tabs and settings
  win.loadFile(path.join(__dirname, 'index.html'));

  // Set up context menu for main window
  win.webContents.on('context-menu', (event, params) => {
    const menu = buildFullContextMenu(win.webContents, params);
    menu.popup();
  });

  // Register global shortcuts for the window
  win.on('focus', () => {
    globalShortcut.register('CommandOrControl+N', () => {
      win.webContents.send('shortcut', 'new-tab');
    });
    globalShortcut.register('CommandOrControl+[', () => {
      win.webContents.send('shortcut', 'back');
    });
    globalShortcut.register('CommandOrControl+]', () => {
      win.webContents.send('shortcut', 'forward');
    });
    globalShortcut.register('CommandOrControl+L', () => {
      win.webContents.send('shortcut', 'close-tab');
    });
    globalShortcut.register('CommandOrControl+R', () => {
      win.webContents.send('shortcut', 'reload');
    });
    globalShortcut.register('CommandOrControl+Y', () => {
      win.webContents.send('shortcut', 'history');
    });
  });
  win.on('blur', () => {
    globalShortcut.unregisterAll();
  });

// Helper to build a full context menu with Inspect Element at the end
function buildFullContextMenu(webContents, params) {
  const menu = new Menu();
  if (params.isEditable) {
    menu.append(new MenuItem({ role: 'undo' }));
    menu.append(new MenuItem({ role: 'redo' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ role: 'cut' }));
    menu.append(new MenuItem({ role: 'copy' }));
    menu.append(new MenuItem({ role: 'paste' }));
    menu.append(new MenuItem({ role: 'delete' }));
    menu.append(new MenuItem({ role: 'selectAll' }));
  } else if (params.selectionText) {
    menu.append(new MenuItem({ role: 'copy' }));
    menu.append(new MenuItem({ role: 'selectAll' }));
  }
  if (params.linkURL) {
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Open Link in New Tab',
      click: () => {
        const win = BrowserWindow.fromWebContents(webContents);
        win.webContents.send('new-tab', params.linkURL);
      }
    }));
    menu.append(new MenuItem({
      label: 'Copy Link',
      click: () => {
        const win = BrowserWindow.fromWebContents(webContents);
        win.webContents.send('copy-link', params.linkURL);
      }
    }));
  }
  if (params.hasImageContents) {
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Save Image As...',
      click: () => {
        webContents.downloadURL(params.srcURL);
      }
    }));
    menu.append(new MenuItem({
      label: 'Copy Image',
      click: () => {
        webContents.copyImageAt(params.x, params.y);
      }
    }));
  }
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({
    label: 'Back',
    enabled: webContents.canGoBack(),
    click: () => webContents.goBack()
  }));
  menu.append(new MenuItem({
    label: 'Forward',
    enabled: webContents.canGoForward(),
    click: () => webContents.goForward()
  }));
  menu.append(new MenuItem({
    label: 'Reload',
    click: () => webContents.reload()
  }));
  // Always add Inspect Element at the end
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({
    label: 'Inspect Element',
    click: () => {
      webContents.inspectElement(params.x, params.y);
      if (webContents.isDevToolsOpened()) {
        webContents.devToolsWebContents.focus();
      }
    }
  }));
  return menu;
}
  // Optional: open DevTools
  // win.webContents.openDevTools();
}


app.whenReady().then(() => {
  // Configure session for better caching and performance
  const sigmaSession = session.fromPartition('persist:sigma-session');

  // Configure user agent for better compatibility
  sigmaSession.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sigma/beta-0.3');

  // Enable preconnect and DNS prefetching
  sigmaSession.setPreloads([path.join(__dirname, 'webview-preload.js')]);

  // Set up response headers for better caching
  sigmaSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = details.responseHeaders || {};

    // Add cache headers for static resources
    if (details.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i)) {
      responseHeaders['Cache-Control'] = ['public, max-age=31536000']; // 1 year
    }

    callback({ responseHeaders });
  });

  createWindow();

  // Handle webview context menus
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.on('context-menu', (event, params) => {
        const menu = buildFullContextMenu(contents, params);
        menu.popup();
      });
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

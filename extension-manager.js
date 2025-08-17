const fs = require('fs');
const path = require('path');
const { ipcMain, session } = require('electron');
const crypto = require('crypto');
const ExtensionSecurity = require('./extension-security');
const ChromeWebStore = require('./chrome-webstore');
const CrxParser = require('./crx-parser');

class ExtensionManager {
  constructor() {
    this.extensions = new Map();
    this.extensionsDir = path.join(__dirname, 'extensions', 'installed');
    this.tempDir = path.join(__dirname, 'extensions', 'temp');
    this.enabledExtensions = new Set();
    this.extensionAPIs = new Map();
    this.security = new ExtensionSecurity();
    this.webStore = new ChromeWebStore();
    this.crxParser = new CrxParser();

    this.initializeDirectories();
    this.setupIPCHandlers();
    this.loadInstalledExtensions();
  }

  initializeDirectories() {
    // Ensure extension directories exist
    [this.extensionsDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  setupIPCHandlers() {
    // Only set up IPC handlers if running in Electron main process
    if (typeof ipcMain === 'undefined') {
      console.log('⚠️ Skipping IPC setup - not running in Electron main process');
      return;
    }

    // Extension management IPC handlers
    ipcMain.handle('extension:list', () => this.listExtensions());
    ipcMain.handle('extension:enable', (event, extensionId) => this.enableExtension(extensionId));
    ipcMain.handle('extension:disable', (event, extensionId) => this.disableExtension(extensionId));
    ipcMain.handle('extension:install', (event, extensionPath) => this.installExtension(extensionPath));
    ipcMain.handle('extension:uninstall', (event, extensionId) => this.uninstallExtension(extensionId));
    ipcMain.handle('extension:getDetails', (event, extensionId) => this.getExtensionDetails(extensionId));

    // Chrome Web Store handlers
    ipcMain.handle('extension:installFromWebStore', async (event, webStoreUrl) => {
      try {
        return await this.installFromWebStore(webStoreUrl);
      } catch (error) {
        console.error('IPC handler error:', error);
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('extension:validateWebStoreUrl', (event, url) => {
      try {
        return this.webStore.isValidWebStoreUrl(url);
      } catch (error) {
        console.error('URL validation error:', error);
        return false;
      }
    });
    ipcMain.handle('extension:getPopularExtensions', () => {
      try {
        return this.webStore.getPopularExtensions();
      } catch (error) {
        console.error('Popular extensions error:', error);
        return [];
      }
    });
  }

  async loadInstalledExtensions() {
    try {
      const extensionDirs = fs.readdirSync(this.extensionsDir);
      
      for (const dir of extensionDirs) {
        const extensionPath = path.join(this.extensionsDir, dir);
        const manifestPath = path.join(extensionPath, 'manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const extension = {
              id: dir,
              path: extensionPath,
              manifest,
              enabled: false,
              apis: new Set()
            };
            
            this.extensions.set(dir, extension);
            console.log(`📦 Loaded extension: ${manifest.name} (${dir})`);
          } catch (error) {
            console.error(`❌ Failed to load extension ${dir}:`, error.message);
          }
        }
      }
      
      // Load enabled extensions from storage
      this.loadEnabledExtensions();
      
    } catch (error) {
      console.error('❌ Failed to load installed extensions:', error);
    }
  }

  loadEnabledExtensions() {
    try {
      const enabledPath = path.join(this.extensionsDir, '.enabled.json');
      if (fs.existsSync(enabledPath)) {
        const enabled = JSON.parse(fs.readFileSync(enabledPath, 'utf8'));
        enabled.forEach(id => {
          if (this.extensions.has(id)) {
            this.enabledExtensions.add(id);
            this.extensions.get(id).enabled = true;
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to load enabled extensions:', error);
    }
  }

  saveEnabledExtensions() {
    try {
      const enabledPath = path.join(this.extensionsDir, '.enabled.json');
      const enabled = Array.from(this.enabledExtensions);
      fs.writeFileSync(enabledPath, JSON.stringify(enabled, null, 2));
    } catch (error) {
      console.error('❌ Failed to save enabled extensions:', error);
    }
  }

  validateManifest(manifest, extensionPath) {
    // Use the security system for comprehensive validation
    const validation = this.security.validateManifest(manifest, extensionPath);

    if (!validation.valid) {
      throw new Error(`Manifest validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Extension manifest warnings:', validation.warnings);
    }

    return validation;
  }

  generateExtensionId(manifest, extensionPath) {
    // Generate a unique ID based on extension name and path
    const hash = crypto.createHash('sha256');
    hash.update(manifest.name + extensionPath + Date.now());
    return hash.digest('hex').substring(0, 32);
  }

  async installExtension(sourcePath) {
    try {
      // Read and validate manifest
      const manifestPath = path.join(sourcePath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension manifest.json not found');
      }
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const validation = this.validateManifest(manifest, sourcePath);

      // Generate extension ID
      const extensionId = this.generateExtensionId(manifest, sourcePath);
      const targetPath = path.join(this.extensionsDir, extensionId);
      
      // Check if extension already exists
      if (fs.existsSync(targetPath)) {
        throw new Error('Extension already installed');
      }
      
      // Copy extension files
      this.copyDirectory(sourcePath, targetPath);
      
      // Create extension object
      const extension = {
        id: extensionId,
        path: targetPath,
        manifest,
        enabled: false,
        apis: new Set(),
        installDate: new Date().toISOString()
      };
      
      this.extensions.set(extensionId, extension);
      
      console.log(`✅ Installed extension: ${manifest.name} (${extensionId})`);
      return { success: true, extensionId, manifest };
      
    } catch (error) {
      console.error('❌ Extension installation failed:', error);
      return { success: false, error: error.message };
    }
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  enableExtension(extensionId) {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }
      
      extension.enabled = true;
      this.enabledExtensions.add(extensionId);
      this.saveEnabledExtensions();
      
      // Initialize extension APIs
      this.initializeExtensionAPIs(extension);
      
      console.log(`✅ Enabled extension: ${extension.manifest.name}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to enable extension:', error);
      return { success: false, error: error.message };
    }
  }

  disableExtension(extensionId) {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }
      
      extension.enabled = false;
      this.enabledExtensions.delete(extensionId);
      this.saveEnabledExtensions();
      
      // Cleanup extension APIs
      this.cleanupExtensionAPIs(extension);
      
      console.log(`✅ Disabled extension: ${extension.manifest.name}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to disable extension:', error);
      return { success: false, error: error.message };
    }
  }

  uninstallExtension(extensionId) {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }
      
      // Disable first if enabled
      if (extension.enabled) {
        this.disableExtension(extensionId);
      }
      
      // Remove extension files
      fs.rmSync(extension.path, { recursive: true, force: true });
      
      // Remove from memory
      this.extensions.delete(extensionId);
      
      console.log(`✅ Uninstalled extension: ${extension.manifest.name}`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to uninstall extension:', error);
      return { success: false, error: error.message };
    }
  }

  listExtensions() {
    const extensionList = Array.from(this.extensions.values()).map(ext => ({
      id: ext.id,
      name: ext.manifest.name,
      version: ext.manifest.version,
      description: ext.manifest.description,
      enabled: ext.enabled,
      permissions: ext.manifest.permissions || [],
      installDate: ext.installDate
    }));
    
    return extensionList;
  }

  getExtensionDetails(extensionId) {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      return null;
    }
    
    return {
      id: extension.id,
      manifest: extension.manifest,
      enabled: extension.enabled,
      path: extension.path,
      apis: Array.from(extension.apis),
      installDate: extension.installDate
    };
  }

  initializeExtensionAPIs(extension) {
    // This will be implemented in the next phase
    console.log(`🔧 Initializing APIs for ${extension.manifest.name}`);
  }

  cleanupExtensionAPIs(extension) {
    // This will be implemented in the next phase
    console.log(`🧹 Cleaning up APIs for ${extension.manifest.name}`);
  }

  async installFromWebStore(webStoreUrl) {
    try {
      console.log(`🌐 Installing extension from Chrome Web Store: ${webStoreUrl}`);

      // Validate URL
      if (!this.webStore.isValidWebStoreUrl(webStoreUrl)) {
        console.error('❌ Invalid Chrome Web Store URL:', webStoreUrl);
        throw new Error('Invalid Chrome Web Store URL');
      }

      console.log('✅ URL validation passed');

      // Download from Chrome Web Store
      console.log('📥 Starting download from Chrome Web Store...');
      const downloadResult = await this.webStore.installFromWebStore(
        webStoreUrl,
        this.tempDir,
        (message, progress) => {
          console.log(`📥 ${message} (${Math.round(progress)}%)`);
        }
      );

      console.log('📥 Download result:', downloadResult.success ? 'Success' : 'Failed');
      if (!downloadResult.success) {
        console.error('❌ Download failed:', downloadResult.error);
        throw new Error(downloadResult.error);
      }

      // Parse .crx file
      const extensionId = downloadResult.extensionId;
      const extractPath = path.join(this.tempDir, `extract_${extensionId}`);

      console.log('📦 Parsing CRX file...');
      const parseResult = await this.crxParser.parseCrxFile(downloadResult.crxPath, extractPath);

      console.log('📦 Parse result:', parseResult.success ? 'Success' : 'Failed');
      if (!parseResult.success) {
        console.error('❌ CRX parsing failed:', parseResult.error);
        throw new Error(parseResult.error);
      }

      // Validate extracted extension
      const validation = this.validateManifest(parseResult.manifest, extractPath);

      // Install the extension
      const finalPath = path.join(this.extensionsDir, extensionId);

      // Check if extension already exists
      if (fs.existsSync(finalPath)) {
        // Remove old version
        fs.rmSync(finalPath, { recursive: true, force: true });
      }

      // Move extracted extension to final location
      this.copyDirectory(extractPath, finalPath);

      // Create extension object
      const extension = {
        id: extensionId,
        path: finalPath,
        manifest: parseResult.manifest,
        enabled: false,
        apis: new Set(),
        installDate: new Date().toISOString(),
        source: 'chrome-web-store',
        webStoreUrl: webStoreUrl,
        metadata: downloadResult.metadata
      };

      this.extensions.set(extensionId, extension);

      // Cleanup temporary files
      try {
        fs.rmSync(extractPath, { recursive: true, force: true });
        fs.unlinkSync(downloadResult.crxPath);
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup warning:', cleanupError.message);
      }

      console.log(`✅ Successfully installed ${parseResult.manifest.name} from Chrome Web Store`);

      return {
        success: true,
        extensionId,
        manifest: parseResult.manifest,
        metadata: downloadResult.metadata,
        message: `Successfully installed ${parseResult.manifest.name} v${parseResult.manifest.version}`
      };

    } catch (error) {
      console.error('❌ Chrome Web Store installation failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Installation failed: ${error.message}`
      };
    }
  }

  getEnabledExtensions() {
    return Array.from(this.enabledExtensions)
      .map(id => this.extensions.get(id))
      .filter(ext => ext && ext.enabled);
  }
}

module.exports = ExtensionManager;

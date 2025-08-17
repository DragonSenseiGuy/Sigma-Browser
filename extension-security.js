const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ExtensionSecurity {
  constructor() {
    this.permissionRequests = new Map();
    this.grantedPermissions = new Map();
    this.securityPolicies = this.initializeSecurityPolicies();
  }

  initializeSecurityPolicies() {
    return {
      // Allowed permissions for extensions
      allowedPermissions: [
        'tabs',
        'storage',
        'contextMenus',
        'browserAction',
        'activeTab',
        'background',
        'notifications',
        'bookmarks',
        'history'
      ],
      
      // Dangerous permissions that require explicit user consent
      dangerousPermissions: [
        'webRequest',
        'webRequestBlocking',
        'proxy',
        'privacy',
        'management',
        'nativeMessaging',
        'debugger'
      ],
      
      // Blocked permissions that are never allowed
      blockedPermissions: [
        'experimental',
        'system.cpu',
        'system.memory',
        'system.storage',
        'fileSystem',
        'serial',
        'usb',
        'bluetooth'
      ],
      
      // Content Security Policy for extension pages
      extensionCSP: "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline';",
      
      // Maximum file sizes
      maxManifestSize: 1024 * 1024, // 1MB
      maxExtensionSize: 50 * 1024 * 1024, // 50MB
      maxFileCount: 1000
    };
  }

  validateManifest(manifest, extensionPath) {
    const errors = [];
    const warnings = [];

    try {
      // Basic structure validation
      if (!manifest.name || typeof manifest.name !== 'string') {
        errors.push('Extension name is required and must be a string');
      }

      if (!manifest.version || typeof manifest.version !== 'string') {
        errors.push('Extension version is required and must be a string');
      }

      if (!manifest.manifest_version || ![2, 3].includes(manifest.manifest_version)) {
        errors.push('Manifest version must be 2 or 3');
      }

      // Validate permissions
      if (manifest.permissions) {
        if (!Array.isArray(manifest.permissions)) {
          errors.push('Permissions must be an array');
        } else {
          const invalidPermissions = this.validatePermissions(manifest.permissions);
          if (invalidPermissions.length > 0) {
            errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          }
        }
      }

      // Validate content scripts
      if (manifest.content_scripts) {
        if (!Array.isArray(manifest.content_scripts)) {
          errors.push('Content scripts must be an array');
        } else {
          manifest.content_scripts.forEach((script, index) => {
            if (!script.matches || !Array.isArray(script.matches)) {
              errors.push(`Content script ${index} must have matches array`);
            }
            if (!script.js && !script.css) {
              errors.push(`Content script ${index} must have js or css files`);
            }
          });
        }
      }

      // Validate background scripts
      if (manifest.background) {
        if (manifest.manifest_version === 2) {
          if (!manifest.background.scripts && !manifest.background.page) {
            warnings.push('Background page should specify scripts or page');
          }
        } else if (manifest.manifest_version === 3) {
          if (!manifest.background.service_worker) {
            warnings.push('Manifest v3 should use service_worker for background');
          }
        }
      }

      // Validate web accessible resources
      if (manifest.web_accessible_resources) {
        if (manifest.manifest_version === 2) {
          if (!Array.isArray(manifest.web_accessible_resources)) {
            errors.push('Web accessible resources must be an array in manifest v2');
          }
        } else if (manifest.manifest_version === 3) {
          if (!Array.isArray(manifest.web_accessible_resources)) {
            errors.push('Web accessible resources must be an array in manifest v3');
          } else {
            manifest.web_accessible_resources.forEach((resource, index) => {
              if (!resource.resources || !resource.matches) {
                errors.push(`Web accessible resource ${index} must have resources and matches`);
              }
            });
          }
        }
      }

      // Check file size limits
      const extensionSize = this.calculateDirectorySize(extensionPath);
      if (extensionSize > this.securityPolicies.maxExtensionSize) {
        errors.push(`Extension size (${extensionSize} bytes) exceeds maximum allowed size`);
      }

      // Check file count
      const fileCount = this.countFiles(extensionPath);
      if (fileCount > this.securityPolicies.maxFileCount) {
        errors.push(`Extension has too many files (${fileCount}), maximum allowed is ${this.securityPolicies.maxFileCount}`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        permissions: manifest.permissions || [],
        dangerousPermissions: this.getDangerousPermissions(manifest.permissions || [])
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Manifest validation failed: ${error.message}`],
        warnings: [],
        permissions: [],
        dangerousPermissions: []
      };
    }
  }

  validatePermissions(permissions) {
    const invalid = [];
    
    permissions.forEach(permission => {
      // Check if permission is blocked
      if (this.securityPolicies.blockedPermissions.includes(permission)) {
        invalid.push(permission);
        return;
      }

      // Check if permission is in allowed or dangerous list
      const isAllowed = this.securityPolicies.allowedPermissions.includes(permission);
      const isDangerous = this.securityPolicies.dangerousPermissions.includes(permission);
      
      // Allow URL patterns for host permissions
      const isHostPermission = permission.includes('://') || permission.startsWith('<all_urls>');
      
      if (!isAllowed && !isDangerous && !isHostPermission) {
        invalid.push(permission);
      }
    });

    return invalid;
  }

  getDangerousPermissions(permissions) {
    return permissions.filter(permission => 
      this.securityPolicies.dangerousPermissions.includes(permission)
    );
  }

  async requestPermissions(extensionId, permissions, userCallback) {
    const dangerousPermissions = this.getDangerousPermissions(permissions);
    
    if (dangerousPermissions.length === 0) {
      // Auto-grant safe permissions
      this.grantPermissions(extensionId, permissions);
      return { granted: true, permissions };
    }

    // Request user consent for dangerous permissions
    const requestId = crypto.randomUUID();
    this.permissionRequests.set(requestId, {
      extensionId,
      permissions: dangerousPermissions,
      callback: userCallback,
      timestamp: Date.now()
    });

    return {
      granted: false,
      requestId,
      dangerousPermissions,
      message: 'User consent required for dangerous permissions'
    };
  }

  grantPermissions(extensionId, permissions) {
    if (!this.grantedPermissions.has(extensionId)) {
      this.grantedPermissions.set(extensionId, new Set());
    }
    
    const extensionPermissions = this.grantedPermissions.get(extensionId);
    permissions.forEach(permission => extensionPermissions.add(permission));
    
    console.log(`✅ Granted permissions to ${extensionId}:`, permissions);
  }

  revokePermissions(extensionId, permissions = null) {
    if (permissions === null) {
      // Revoke all permissions
      this.grantedPermissions.delete(extensionId);
    } else {
      const extensionPermissions = this.grantedPermissions.get(extensionId);
      if (extensionPermissions) {
        permissions.forEach(permission => extensionPermissions.delete(permission));
      }
    }
  }

  hasPermission(extensionId, permission) {
    const extensionPermissions = this.grantedPermissions.get(extensionId);
    return extensionPermissions ? extensionPermissions.has(permission) : false;
  }

  sanitizeExtensionContent(content, contentType = 'html') {
    // Basic content sanitization
    if (contentType === 'html') {
      // Remove dangerous script tags and event handlers
      content = content.replace(/<script[^>]*>.*?<\/script>/gis, '');
      content = content.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      content = content.replace(/javascript:/gi, '');
    }
    
    return content;
  }

  generateExtensionCSP(extensionId) {
    // Generate Content Security Policy for extension
    return this.securityPolicies.extensionCSP.replace(
      "'self'", 
      `'self' chrome-extension://${extensionId}`
    );
  }

  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          totalSize += this.calculateDirectorySize(filePath);
        } else {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error('Error calculating directory size:', error);
    }
    
    return totalSize;
  }

  countFiles(dirPath) {
    let fileCount = 0;
    
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          fileCount += this.countFiles(filePath);
        } else {
          fileCount++;
        }
      }
    } catch (error) {
      console.error('Error counting files:', error);
    }
    
    return fileCount;
  }

  cleanupExpiredRequests() {
    const now = Date.now();
    const expiredTime = 5 * 60 * 1000; // 5 minutes
    
    for (const [requestId, request] of this.permissionRequests) {
      if (now - request.timestamp > expiredTime) {
        this.permissionRequests.delete(requestId);
      }
    }
  }
}

module.exports = ExtensionSecurity;

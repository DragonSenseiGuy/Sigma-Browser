# Chrome Extension Support for Sigma Browser

Sigma browser now includes comprehensive Chrome extension support, allowing you to run most Chrome extensions without modification. This document explains how to install, manage, and develop extensions for Sigma.

## Features

### ✅ **Supported Chrome Extension APIs**

- **`chrome.tabs`** - Tab management and interaction
- **`chrome.storage`** - Extension data persistence (local storage)
- **`chrome.runtime`** - Extension lifecycle and messaging
- **`chrome.browserAction`** - Toolbar button functionality
- **`chrome.contextMenus`** - Right-click menu integration
- **Basic manifest v2 and v3 support**

### 🔒 **Security Features**

- **Extension sandboxing** with isolated contexts
- **Permission system** with user consent for dangerous permissions
- **Manifest validation** with security policy enforcement
- **Content Security Policy** for extension pages
- **File size and count limits** to prevent abuse

### 🎨 **User Interface Integration**

- **Extension toolbar** with browser action buttons
- **Extension popup windows** when toolbar buttons are clicked
- **Extension management page** at `sigma:extensions`
- **Badge support** for extension notifications
- **macOS-native design** integration

## Getting Started

### Installing Extensions

1. **From Chrome Web Store** (Recommended):
   - Navigate to `sigma:extensions` in the address bar
   - Paste Chrome Web Store URL in the input field
   - Click "Install" button
   - Extension will be automatically downloaded and installed

2. **Popular Extensions**:
   - Browse the "Popular Extensions" section on the extensions page
   - Click "Install" next to any extension
   - Installation happens automatically

3. **Manual Installation**:
   - Extract extension to `extensions/installed/[extension-name]/`
   - Restart Sigma browser
   - Extension will be automatically detected and loaded

### Managing Extensions

- **Enable/Disable**: Toggle extensions on the `sigma:extensions` page
- **Remove**: Click the "Remove" button next to any extension
- **View Details**: Extension information and permissions are displayed

## Extension Development

### Creating a Basic Extension

1. **Create Extension Directory**:
   ```bash
   mkdir my-extension
   cd my-extension
   ```

2. **Create Manifest** (`manifest.json`):
   ```json
   {
     "manifest_version": 2,
     "name": "My Extension",
     "version": "1.0.0",
     "description": "A simple extension for Sigma",
     
     "permissions": [
       "tabs",
       "storage"
     ],
     
     "browser_action": {
       "default_title": "My Extension",
       "default_popup": "popup.html"
     },
     
     "background": {
       "scripts": ["background.js"],
       "persistent": false
     }
   }
   ```

3. **Create Background Script** (`background.js`):
   ```javascript
   chrome.tabs.onActivated.addListener(function(activeInfo) {
     console.log('Tab activated:', activeInfo.tabId);
   });
   
   chrome.browserAction.onClicked.addListener(function(tab) {
     chrome.browserAction.setBadgeText({text: '!'});
   });
   ```

4. **Create Popup** (`popup.html`):
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body { width: 200px; padding: 16px; }
     </style>
   </head>
   <body>
     <h3>My Extension</h3>
     <button id="test-btn">Test</button>
     <script src="popup.js"></script>
   </body>
   </html>
   ```

### Supported Permissions

#### **Safe Permissions** (Auto-granted):
- `tabs` - Basic tab information
- `storage` - Local data storage
- `contextMenus` - Right-click menus
- `browserAction` - Toolbar buttons
- `activeTab` - Current tab access
- `background` - Background scripts
- `notifications` - System notifications
- `bookmarks` - Bookmark access
- `history` - Browsing history

#### **Dangerous Permissions** (Require user consent):
- `webRequest` - Network request interception
- `webRequestBlocking` - Blocking network requests
- `proxy` - Proxy configuration
- `privacy` - Privacy settings
- `management` - Extension management
- `nativeMessaging` - Native app communication
- `debugger` - Debugging APIs

#### **Blocked Permissions** (Never allowed):
- `experimental` - Experimental APIs
- `system.*` - System information APIs
- `fileSystem` - File system access
- `serial` - Serial port access
- `usb` - USB device access
- `bluetooth` - Bluetooth access

## API Reference

### chrome.tabs

```javascript
// Query tabs
chrome.tabs.query({active: true}, function(tabs) {
  console.log('Active tab:', tabs[0]);
});

// Create new tab
chrome.tabs.create({url: 'https://example.com'});

// Update tab
chrome.tabs.update(tabId, {url: 'https://newurl.com'});

// Remove tab
chrome.tabs.remove(tabId);
```

### chrome.storage

```javascript
// Save data
chrome.storage.local.set({key: 'value'}, function() {
  console.log('Data saved');
});

// Get data
chrome.storage.local.get(['key'], function(result) {
  console.log('Value:', result.key);
});

// Remove data
chrome.storage.local.remove(['key']);

// Clear all data
chrome.storage.local.clear();
```

### chrome.browserAction

```javascript
// Set badge text
chrome.browserAction.setBadgeText({text: '5'});

// Set badge color
chrome.browserAction.setBadgeBackgroundColor({color: '#FF0000'});

// Set title
chrome.browserAction.setTitle({title: 'New Title'});

// Handle clicks
chrome.browserAction.onClicked.addListener(function(tab) {
  console.log('Button clicked on tab:', tab.id);
});
```

## File Structure

```
extensions/
├── installed/           # Installed extensions
│   ├── extension-1/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   ├── popup.html
│   │   └── popup.js
│   └── extension-2/
├── temp/               # Temporary files during installation
└── storage/            # Extension storage data
    ├── extension-1.json
    └── extension-2.json
```

## Security Considerations

### Extension Isolation
- Extensions run in isolated contexts
- No direct access to main browser processes
- Limited file system access
- Network requests are monitored

### Permission System
- Extensions must declare required permissions
- Dangerous permissions require explicit user consent
- Permissions can be revoked at any time
- Minimum necessary permissions principle

### Content Security Policy
- Strict CSP applied to extension pages
- No inline scripts or eval() allowed
- External resources must be declared

## Troubleshooting

### Extension Not Loading
1. Check manifest.json syntax
2. Verify required fields are present
3. Check console for error messages
4. Ensure extension directory is in `extensions/installed/`

### Permission Errors
1. Check if permission is declared in manifest
2. Verify permission is not in blocked list
3. Check if user consent was granted for dangerous permissions

### API Not Working
1. Verify API is supported (see supported APIs list)
2. Check if required permissions are granted
3. Look for console error messages

## Scripts

```bash
# Clean all extensions
npm run extensions:clean

# View test extension
npm run extensions:test

# Start browser in debug mode
npm run dev
```

## Compatibility

- **Manifest Version**: v2 and v3 supported
- **Chrome Extensions**: Most Chrome extensions work without modification
- **Platform**: macOS-optimized with native design integration
- **Performance**: Minimal impact on browser performance

## Chrome Web Store Integration

### Supported URL Formats

```
https://chrome.google.com/webstore/detail/extension-name/abcdefghijklmnopqrstuvwxyz
https://chrome.google.com/webstore/detail/abcdefghijklmnopqrstuvwxyz
abcdefghijklmnopqrstuvwxyz (Extension ID only)
```

### Installation Process

1. **URL Validation**: Checks if the provided URL is a valid Chrome Web Store link
2. **Metadata Fetching**: Retrieves extension information from the store page
3. **Secure Download**: Downloads the .crx file using Chrome's official API
4. **CRX Parsing**: Extracts and validates the extension package
5. **Security Validation**: Performs security checks and manifest validation
6. **Installation**: Installs the extension to the local extensions directory

### Popular Extensions

The extensions page includes a curated list of popular, well-tested extensions:

- **uBlock Origin**: Ad blocker and privacy tool
- **Bitwarden**: Password manager
- **Honey**: Coupon finder and savings tool

### Security Features

- **CRX Signature Verification**: Validates extension authenticity
- **Manifest Validation**: Ensures extension follows security guidelines
- **File Size Limits**: Prevents oversized malicious extensions
- **Suspicious File Detection**: Scans for potentially dangerous files
- **Permission Validation**: Checks and validates requested permissions

## Future Enhancements

- Extension auto-updates from Chrome Web Store
- More Chrome APIs (webRequest, cookies, etc.)
- Extension developer tools
- Custom extension marketplace
- Extension ratings and reviews

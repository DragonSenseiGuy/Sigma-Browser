# Sigma Browser

<div align="center">

![Sigma Browser](assets/AppIcons/256.png)

**A modern, fast, and feature-rich web browser built with Electron**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-10.15%2B-blue.svg)](https://www.apple.com/macos/)

</div>

Sigma is a modern, lightweight web browser designed exclusively for macOS. It combines the power of Chromium with a clean, minimalist interface and advanced features optimized for the Mac experience. Built with Electron, it delivers native macOS performance, security, and seamless integration with your Mac workflow.

## ✨ Key Features

### 🚀 **Core Browsing**
- **Multi-Tab Support**: Efficient tab management with smooth switching
- **Fast Navigation**: Back, forward, reload, and home navigation
- **Smart Address Bar**: Intelligent URL detection and search integration
- **High-Performance Rendering**: Optimized webview loading with caching
- **Context Menus**: Right-click support with "Open in New Tab" functionality

### 📚 **Advanced History Management**
- **Comprehensive History Tracking**: Automatic recording of visited pages with titles and timestamps
- **Smart History Display**: View history with page titles, URLs, and visit times
- **Selective Deletion**: Choose specific entries to delete with checkboxes
- **Bulk Operations**: Select all, deselect all, and delete multiple entries
- **Clear All History**: Complete history clearing with safety confirmations
- **Instant Updates**: Real-time UI updates without page refreshes

### 🎨 **Theming & Customization**
- **Multiple Themes**: Light, Dark, and System (auto-follows OS preference)
- **Dynamic Theme Switching**: Instant theme changes without restart
- **Consistent Styling**: Themes apply to all browser components
- **Custom CSS Variables**: Extensible theming system

### ⚡ **Performance Optimizations**
- **HTTP Caching**: Persistent session-based caching for faster repeat visits
- **Resource Preloading**: Automatic preloading of critical resources
- **DNS Prefetching**: Faster connection establishment
- **Image Optimization**: Lazy loading for improved performance
- **Font Optimization**: Proper font preloading to prevent layout shifts
- **Progress Indicators**: Visual loading feedback with progress bars

### 🔒 **Security Features**
- **Context Isolation**: Secure separation between main and renderer processes
- **Sandboxed WebViews**: Isolated browsing contexts for enhanced security
- **Limited Node Integration**: Minimal exposure of Node.js APIs
- **Secure Session Management**: Persistent sessions with proper partitioning
- **Safe Navigation**: URL filtering and validation
- **macOS Security Integration**: Hardened runtime, Gatekeeper compatibility, and App Sandbox support
- **Code Signing Ready**: Prepared for macOS code signing and notarization

### 🛠️ **Developer Features**
- **Performance Monitoring**: Built-in load time tracking and reporting
- **Debug Console**: Access to developer tools and console
- **Custom User Agent**: Modern Chrome user agent for compatibility
- **WebView Preload Scripts**: Custom optimization scripts for each page

## 🎯 **Special Pages**

### 📄 **New Tab Page (`sigma:newtab`)**
- Clean, minimalist design
- Quick access to frequently visited sites
- Theme-aware styling

### 📖 **History Page (`sigma:history`)**
- Comprehensive browsing history with timestamps
- Advanced management tools:
  - Individual entry selection with checkboxes
  - Bulk selection (Select All/Deselect All)
  - Selective deletion with confirmation
  - Complete history clearing
- Real-time search and filtering
- Visual feedback for selected items

## ⌨️ **Keyboard Shortcuts**

| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘+N` | New Tab | Opens a new browsing tab |
| `⌘+W` | Close Tab | Closes the current tab |
| `⌘+R` | Reload Page | Refreshes the current page |
| `⌘+[` | Go Back | Navigate to previous page |
| `⌘+]` | Go Forward | Navigate to next page |
| `⌘+Y` | View History | Opens history in new tab |
| `⌘+,` | Settings | Opens browser settings |
| `⌘+T` | New Tab | Alternative shortcut for new tab |
| `⌘+Shift+T` | Reopen Closed Tab | Reopens the last closed tab |
| `⌘+L` | Focus Address Bar | Focuses the URL/search bar |

## 🚀 **Getting Started**

### **System Requirements**
- **macOS**: 10.15 (Catalina) or later
- **Architecture**: Intel x64 or Apple Silicon (M1/M2/M3)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 200MB free disk space

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- **Xcode Command Line Tools** (for development): `xcode-select --install`

### **Quick Installation**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DragonSenseiGuy/Sigma.git
   cd Sigma
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

### **Development Mode**
For development with debug output:
```bash
npm run dev
```

### **Building for Production**

**Build for macOS (Universal Binary - Intel + Apple Silicon):**
```bash
npm run build
```

**Build specific architecture:**
```bash
# Intel x64 only
npm run build:mac -- --x64

# Apple Silicon only
npm run build:mac -- --arm64
```

**Distribution Package:**
```bash
npm run dist
```

This creates both `.dmg` installer and `.zip` archive in the `dist/` folder.

## 🏗️ **Project Architecture**

### **File Structure**
```
Sigma/
├── 📄 index.html              # Main application window HTML
├── ⚙️ main.js                 # Electron main process (window management, shortcuts)
├── 🔒 preload.js              # Secure bridge between main and renderer processes
├── 🎨 renderer.js             # Browser UI logic and tab management
├── 💅 styles.css              # Application styling and themes
├── 🚀 webview-preload.js      # Performance optimization script for webviews
├── 📁 assets/                 # Application assets
│   ├── 🖼️ app-icon.png        # Application icon
│   └── 🏠 home-icon.svg       # Home button icon
└── 📦 package.json            # Project configuration and dependencies
```

### **Architecture Overview**

#### **Main Process (`main.js`)**
- 🪟 **Window Management**: Creates and manages browser windows
- ⌨️ **Global Shortcuts**: Handles system-wide keyboard shortcuts
- 🖱️ **Context Menus**: Manages right-click menus and actions
- 🔄 **Session Management**: Configures caching and performance settings
- 🛡️ **Security**: Implements security policies and sandboxing

#### **Renderer Process (`renderer.js`)**
- 📑 **Tab Management**: Creates, switches, and closes tabs
- 🧭 **Navigation Logic**: Handles URL navigation and history
- 📚 **History Management**: Comprehensive history tracking and management
- 🎨 **Theme System**: Dynamic theme switching and application
- 🌐 **WebView Management**: Manages embedded web content
- ⚡ **Performance Optimization**: Loading states and progress tracking

#### **WebView Preload (`webview-preload.js`)**
- 🚀 **Performance Enhancements**: DNS prefetching, resource preloading
- 🖼️ **Image Optimization**: Lazy loading and optimization
- 📊 **Performance Monitoring**: Load time tracking and reporting
- 🔗 **Resource Hints**: Preconnect and prefetch optimizations

### **Security Architecture**
- 🔒 **Context Isolation**: Complete separation between main and renderer processes
- 🏖️ **Sandboxed WebViews**: Isolated browsing contexts for each tab
- 🚫 **Limited Node Integration**: Minimal exposure of Node.js APIs to web content
- 🛡️ **Secure IPC**: Safe communication between processes
- 🔐 **Session Partitioning**: Isolated storage and caching per session

## 🎨 **Customization & Settings**

### **Theme System**
Sigma features a comprehensive theming system with three modes:

- **🌞 Light Theme**: Clean, bright interface perfect for daytime use
- **🌙 Dark Theme**: Easy on the eyes with dark backgrounds and light text
- **🔄 System Theme**: Automatically follows your operating system's theme preference

**Theme Features:**
- ⚡ **Instant Switching**: Themes change immediately without restart
- 🎯 **Consistent Application**: Themes apply to all browser components
- 💾 **Persistent Settings**: Theme preference is saved and restored
- 🔧 **CSS Variables**: Extensible theming system for developers

## 🔧 **Advanced Usage**

### **Custom URL Schemes**
Sigma supports special internal URLs:
- `sigma:newtab` - Opens the new tab page
- `sigma:history` - Opens the history management page
- `about:blank` - Opens a blank page

### **Performance Tips**
- **🗂️ Use History Management**: Regularly clean old history entries for better performance
- **🎨 Choose Appropriate Theme**: Dark theme can save battery on OLED displays
- **📑 Manage Tabs**: Close unused tabs to free up memory
- **🔄 Clear Cache**: Periodically clear cache through settings for optimal performance

### **Troubleshooting**

**Common Issues:**
- **Slow Loading**: Check internet connection and clear cache
- **Theme Not Applying**: Restart the application
- **History Not Saving**: Check localStorage permissions
- **Tabs Not Responding**: Close and reopen problematic tabs
- **App Won't Launch**: Check macOS version compatibility (10.15+)
- **Permission Issues**: Grant necessary permissions in System Preferences > Security & Privacy

**macOS-Specific Issues:**
- **Gatekeeper Warning**: Right-click app and select "Open" to bypass unsigned app warning
- **Dock Icon Issues**: Restart Dock with `killall Dock` in Terminal
- **Menu Bar Problems**: Reset menu bar cache by restarting the app

**Debug Mode:**
```bash
npm run dev
```

## 🤝 **Contributing**

We welcome contributions! Here's how to get started:

### **Development Setup**
1. **Fork the repository** on GitHub
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Sigma.git
   cd Sigma
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```

### **Development Guidelines**
- 📝 **Code Style**: Follow existing code patterns and formatting
- 🧪 **Testing**: Test your changes thoroughly across different platforms
- 📚 **Documentation**: Update README.md for new features
- 🔒 **Security**: Ensure all changes maintain security standards

### **Submitting Changes**
1. **Commit your changes:**
   ```bash
   git commit -m 'Add amazing feature'
   ```
2. **Push to your branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
3. **Open a Pull Request** with a clear description of changes

## 📊 **Performance Metrics**

Sigma is optimized for speed and efficiency:

- **⚡ Fast Startup**: < 2 seconds cold start time
- **🚀 Quick Navigation**: Optimized webview loading with caching
- **💾 Memory Efficient**: Intelligent tab management and resource cleanup
- **🔄 Smooth Animations**: 60fps UI transitions and effects
- **📈 Progressive Loading**: Smart resource prioritization and lazy loading

## 🔄 **Version History**

### **Beta 0.3** (Latest)
- ✨ **Comprehensive History Management**: Advanced history tools with selective deletion
- 🚀 **Performance Optimizations**: HTTP caching, resource preloading, DNS prefetching
- 🎨 **Enhanced UI**: Progress bars, loading indicators, improved visual feedback
- 🔧 **Bug Fixes**: Resolved webview loading issues and tab switching problems

### **v1.1.0**
- 📚 **History System**: Complete browsing history with timestamps
- 🎨 **Theme Improvements**: Better dark mode and system theme support
- 🔒 **Security Enhancements**: Improved sandboxing and context isolation

### **v1.0.0**
- 🎉 **Initial Release**: Core browsing functionality
- 📑 **Tab Management**: Multi-tab support with smooth switching
- 🌓 **Theme Support**: Light, dark, and system themes
- 🧭 **Navigation**: Back, forward, reload, and home functionality

## 📝 **License**

This project is licensed under the **GPLv3 License** - see the [LICENSE](LICENSE) file for details.

### **What this means:**
- ✅ **Commercial Use**: Use Sigma in commercial projects
- ✅ **Modification**: Modify and distribute your changes
- ✅ **Distribution**: Share Sigma with others
- ✅ **Private Use**: Use Sigma for personal projects
- ❗ **Limitation**: No warranty or liability

## 🙏 **Acknowledgments**

- **🔧 Built with [Electron](https://www.electronjs.org/)** - Cross-platform desktop app framework
- **🎨 Icons from [Heroicons](https://heroicons.com/)** - Beautiful hand-crafted SVG icons
- **💡 Inspired by modern browser design principles** from Chrome, Firefox, and Safari
- **🌟 Special thanks to the open-source community** for tools and inspiration

## 📞 **Support & Community**

### **Getting Help**
1. 📖 **Check the Documentation**: Review this README and inline code comments
2. 🔍 **Search Issues**: Look through existing GitHub issues
3. 🆕 **Create New Issue**: Open a detailed issue with reproduction steps
4. 💬 **Join Discord**: Connect with the community at [Sigma Discord](https://discord.gg/Z6b8MbjufG)

### **Reporting Bugs**
When reporting bugs, please include:
- 🍎 **macOS Version**: e.g., macOS 14.0 (Sonoma), macOS 13.0 (Ventura)
- 💻 **Mac Model**: e.g., MacBook Pro 2021 (M1), iMac 2020 (Intel)
- 📱 **Sigma Version**: Found in Sigma > About Sigma menu
- 🔄 **Steps to Reproduce**: Clear reproduction steps
- 📸 **Screenshots**: Visual evidence if applicable
- 📋 **Console Logs**: Any error messages or warnings
- 🔧 **System Info**: Available via Apple Menu > About This Mac

### **Feature Requests**
We love hearing your ideas! For feature requests:
- 💡 **Describe the Feature**: Clear explanation of what you want
- 🎯 **Use Case**: Why this feature would be valuable
- 🎨 **Mockups**: Visual representations if applicable

### **Reccomended Contributions**
- ⚙️ **Make Extensions Work**: The extensions don't work as of now when someone does this this will be updated.

---

<div align="center">

**Made with ❤️ by [DragonSenseiGuy](https://github.com/DragonSenseiGuy)**

⭐ **Star this repo if you find it useful!** ⭐

[🐛 Report Bug](https://github.com/DragonSenseiGuy/Sigma/issues) • [✨ Request Feature](https://github.com/DragonSenseiGuy/Sigma/issues) • [💬 Discord](https://discord.gg/TTxuQDQpVJ)

</div>
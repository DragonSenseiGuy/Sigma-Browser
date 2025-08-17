const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');

class ChromeWebStore {
  constructor() {
    this.baseUrl = 'https://chrome.google.com/webstore/detail';
    this.downloadUrl = 'https://clients2.google.com/service/update2/crx';
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Extract extension ID from Chrome Web Store URL
   * @param {string} url - Chrome Web Store URL
   * @returns {string|null} - Extension ID or null if invalid
   */
  extractExtensionId(url) {
    try {
      // Handle different URL formats:
      // https://chrome.google.com/webstore/detail/extension-name/abcdefghijklmnopqrstuvwxyz
      // https://chrome.google.com/webstore/detail/abcdefghijklmnopqrstuvwxyz
      const patterns = [
        /chrome\.google\.com\/webstore\/detail\/[^\/]+\/([a-z]{32})/i,
        /chrome\.google\.com\/webstore\/detail\/([a-z]{32})/i
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }

      // If it's just the extension ID
      if (/^[a-z]{32}$/i.test(url)) {
        return url.toLowerCase();
      }

      return null;
    } catch (error) {
      console.error('Error extracting extension ID:', error);
      return null;
    }
  }

  /**
   * Fetch extension metadata from Chrome Web Store
   * @param {string} extensionId - Extension ID
   * @returns {Promise<Object>} - Extension metadata
   */
  async fetchExtensionMetadata(extensionId) {
    try {
      const url = `${this.baseUrl}/${extensionId}`;
      console.log(`🔍 Fetching metadata for extension: ${extensionId}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch extension page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract metadata from the page
      const name = $('h1.e-f-w').text().trim() || 
                   $('[data-g-label="Extension name"]').text().trim() ||
                   'Unknown Extension';

      const description = $('.C-b-p-j-Pb').text().trim() || 
                         $('[data-g-label="Extension description"]').text().trim() ||
                         'No description available';

      const version = $('.C-b-p-j-Pb-Oa').text().trim() ||
                     $('[data-g-label="Extension version"]').text().trim() ||
                     '1.0.0';

      const developer = $('.e-f-Me').text().trim() ||
                       $('[data-g-label="Extension developer"]').text().trim() ||
                       'Unknown Developer';

      const rating = $('.rsw-stars').attr('title') || 'No rating';
      
      const userCount = $('.e-f-ih').text().trim() || '0 users';

      // Extract icon URL
      let iconUrl = $('img.e-f-s').attr('src') || 
                   $('.webstore-test-wall-tile img').attr('src') ||
                   null;

      if (iconUrl && iconUrl.startsWith('//')) {
        iconUrl = 'https:' + iconUrl;
      }

      return {
        id: extensionId,
        name,
        description,
        version,
        developer,
        rating,
        userCount,
        iconUrl,
        webStoreUrl: url
      };

    } catch (error) {
      console.error('Error fetching extension metadata:', error);
      throw new Error(`Failed to fetch extension metadata: ${error.message}`);
    }
  }

  /**
   * Download extension .crx file from Chrome Web Store
   * @param {string} extensionId - Extension ID
   * @param {string} downloadPath - Path to save the .crx file
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadExtension(extensionId, downloadPath, progressCallback = null) {
    try {
      // Chrome Web Store download URL format
      const downloadUrl = `${this.downloadUrl}?response=redirect&os=mac&arch=x64&os_arch=x86_64&nacl_arch=x86-64&prod=chromecrx&prodchannel=stable&prodversion=120.0.6099.109&lang=en-US&acceptformat=crx2,crx3&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

      console.log(`📥 Downloading extension ${extensionId} from Chrome Web Store...`);
      console.log(`📥 Download URL: ${downloadUrl}`);

      const response = await fetch(downloadUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/x-chrome-extension,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        redirect: 'follow',
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/x-chrome-extension')) {
        console.warn('⚠️ Unexpected content type:', contentType);
      }

      // Ensure download directory exists
      const downloadDir = path.dirname(downloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Stream download with progress tracking
      const totalSize = parseInt(response.headers.get('content-length') || '0');
      let downloadedSize = 0;

      const fileStream = fs.createWriteStream(downloadPath);
      
      return new Promise((resolve, reject) => {
        response.body.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (progressCallback && totalSize > 0) {
            const progress = (downloadedSize / totalSize) * 100;
            progressCallback(progress, downloadedSize, totalSize);
          }
        });

        response.body.on('error', (error) => {
          fileStream.destroy();
          fs.unlink(downloadPath, () => {}); // Clean up partial file
          reject(new Error(`Download stream error: ${error.message}`));
        });

        response.body.on('end', () => {
          fileStream.end();
        });

        fileStream.on('finish', () => {
          console.log(`✅ Extension downloaded successfully: ${downloadPath}`);
          resolve(downloadPath);
        });

        fileStream.on('error', (error) => {
          fs.unlink(downloadPath, () => {}); // Clean up partial file
          reject(new Error(`File write error: ${error.message}`));
        });

        response.body.pipe(fileStream);
      });

    } catch (error) {
      console.error('Error downloading extension:', error);
      throw new Error(`Failed to download extension: ${error.message}`);
    }
  }

  /**
   * Install extension from Chrome Web Store URL
   * @param {string} webStoreUrl - Chrome Web Store URL
   * @param {string} tempDir - Temporary directory for downloads
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Object>} - Installation result
   */
  async installFromWebStore(webStoreUrl, tempDir, progressCallback = null) {
    try {
      // Extract extension ID
      const extensionId = this.extractExtensionId(webStoreUrl);
      if (!extensionId) {
        throw new Error('Invalid Chrome Web Store URL. Please provide a valid extension URL.');
      }

      console.log(`🔍 Installing extension ${extensionId} from Chrome Web Store...`);

      // Fetch metadata first
      if (progressCallback) progressCallback('Fetching extension information...', 10);
      const metadata = await this.fetchExtensionMetadata(extensionId);

      // Download .crx file
      if (progressCallback) progressCallback('Downloading extension...', 30);
      const crxPath = path.join(tempDir, `${extensionId}.crx`);
      
      await this.downloadExtension(extensionId, crxPath, (progress) => {
        if (progressCallback) {
          progressCallback(`Downloading... ${Math.round(progress)}%`, 30 + (progress * 0.6));
        }
      });

      if (progressCallback) progressCallback('Download complete!', 100);

      return {
        success: true,
        extensionId,
        metadata,
        crxPath,
        message: `Successfully downloaded ${metadata.name} v${metadata.version}`
      };

    } catch (error) {
      console.error('Chrome Web Store installation failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Installation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Chrome Web Store URL
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid Chrome Web Store URL
   */
  isValidWebStoreUrl(url) {
    try {
      return /chrome\.google\.com\/webstore\/detail/i.test(url) || 
             /^[a-z]{32}$/i.test(url);
    } catch {
      return false;
    }
  }

  /**
   * Get popular extensions (mock data for now)
   * @returns {Array} - List of popular extensions
   */
  getPopularExtensions() {
    return [
      {
        id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
        name: 'uBlock Origin',
        description: 'An efficient blocker. Easy on CPU and memory.',
        url: 'https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm'
      },
      {
        id: 'nngceckbapebfimnlniiiahkandclblb',
        name: 'Bitwarden',
        description: 'A secure and free password manager for all of your devices.',
        url: 'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb'
      },
      {
        id: 'bmnlcjabgnpnenekpadlanbbkooimhnj',
        name: 'Honey',
        description: 'Automatically find and apply coupon codes when you shop online!',
        url: 'https://chrome.google.com/webstore/detail/honey/bmnlcjabgnpnenekpadlanbbkooimhnj'
      }
    ];
  }
}

module.exports = ChromeWebStore;

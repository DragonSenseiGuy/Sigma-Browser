const fs = require('fs');
const path = require('path');
const yauzl = require('yauzl');
const crypto = require('crypto');

class CrxParser {
  constructor() {
    this.CRX_MAGIC = 'Cr24';
    this.CRX3_VERSION = 3;
    this.CRX2_VERSION = 2;
  }

  /**
   * Parse .crx file and extract extension
   * @param {string} crxPath - Path to .crx file
   * @param {string} outputDir - Directory to extract extension
   * @returns {Promise<Object>} - Extraction result
   */
  async parseCrxFile(crxPath, outputDir) {
    try {
      console.log(`📦 Parsing CRX file: ${crxPath}`);

      // Read CRX file header
      const crxBuffer = fs.readFileSync(crxPath);
      const header = this.parseCrxHeader(crxBuffer);

      if (!header.isValid) {
        throw new Error('Invalid CRX file format');
      }

      console.log(`📋 CRX Version: ${header.version}`);

      // Extract ZIP data from CRX
      const zipData = crxBuffer.slice(header.zipOffset);
      const tempZipPath = path.join(path.dirname(crxPath), 'temp_extension.zip');
      
      // Write ZIP data to temporary file
      fs.writeFileSync(tempZipPath, zipData);

      try {
        // Extract ZIP file
        await this.extractZipFile(tempZipPath, outputDir);
        
        // Clean up temporary ZIP file
        fs.unlinkSync(tempZipPath);

        // Validate extracted extension
        const manifestPath = path.join(outputDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          throw new Error('Invalid extension: manifest.json not found');
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        console.log(`✅ Successfully extracted extension: ${manifest.name || 'Unknown'}`);

        return {
          success: true,
          manifest,
          extractedPath: outputDir,
          crxVersion: header.version,
          message: `Successfully extracted ${manifest.name || 'extension'}`
        };

      } catch (extractError) {
        // Clean up on extraction failure
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }
        throw extractError;
      }

    } catch (error) {
      console.error('CRX parsing failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to parse CRX file: ${error.message}`
      };
    }
  }

  /**
   * Parse CRX file header
   * @param {Buffer} buffer - CRX file buffer
   * @returns {Object} - Header information
   */
  parseCrxHeader(buffer) {
    try {
      // Check magic number
      const magic = buffer.slice(0, 4).toString('ascii');
      if (magic !== this.CRX_MAGIC) {
        return { isValid: false, error: 'Invalid CRX magic number' };
      }

      // Read version
      const version = buffer.readUInt32LE(4);
      
      if (version === this.CRX3_VERSION) {
        return this.parseCrx3Header(buffer);
      } else if (version === this.CRX2_VERSION) {
        return this.parseCrx2Header(buffer);
      } else {
        return { isValid: false, error: `Unsupported CRX version: ${version}` };
      }

    } catch (error) {
      return { isValid: false, error: `Header parsing failed: ${error.message}` };
    }
  }

  /**
   * Parse CRX3 header format
   * @param {Buffer} buffer - CRX file buffer
   * @returns {Object} - Header information
   */
  parseCrx3Header(buffer) {
    try {
      // CRX3 format:
      // [4 bytes] magic
      // [4 bytes] version (3)
      // [4 bytes] header length
      // [header length bytes] header data
      // [remaining] ZIP data

      const headerLength = buffer.readUInt32LE(8);
      const zipOffset = 12 + headerLength;

      // Basic validation
      if (zipOffset >= buffer.length) {
        return { isValid: false, error: 'Invalid CRX3 header length' };
      }

      return {
        isValid: true,
        version: 3,
        headerLength,
        zipOffset,
        headerData: buffer.slice(12, zipOffset)
      };

    } catch (error) {
      return { isValid: false, error: `CRX3 header parsing failed: ${error.message}` };
    }
  }

  /**
   * Parse CRX2 header format
   * @param {Buffer} buffer - CRX file buffer
   * @returns {Object} - Header information
   */
  parseCrx2Header(buffer) {
    try {
      // CRX2 format:
      // [4 bytes] magic
      // [4 bytes] version (2)
      // [4 bytes] public key length
      // [4 bytes] signature length
      // [public key length bytes] public key
      // [signature length bytes] signature
      // [remaining] ZIP data

      const publicKeyLength = buffer.readUInt32LE(8);
      const signatureLength = buffer.readUInt32LE(12);
      const zipOffset = 16 + publicKeyLength + signatureLength;

      // Basic validation
      if (zipOffset >= buffer.length) {
        return { isValid: false, error: 'Invalid CRX2 header lengths' };
      }

      const publicKey = buffer.slice(16, 16 + publicKeyLength);
      const signature = buffer.slice(16 + publicKeyLength, zipOffset);

      return {
        isValid: true,
        version: 2,
        publicKeyLength,
        signatureLength,
        zipOffset,
        publicKey,
        signature
      };

    } catch (error) {
      return { isValid: false, error: `CRX2 header parsing failed: ${error.message}` };
    }
  }

  /**
   * Extract ZIP file to directory
   * @param {string} zipPath - Path to ZIP file
   * @param {string} outputDir - Output directory
   * @returns {Promise<void>}
   */
  async extractZipFile(zipPath, outputDir) {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(new Error(`Failed to open ZIP file: ${err.message}`));
          return;
        }

        let extractedFiles = 0;
        let totalFiles = 0;

        // Count total files first
        zipfile.on('entry', () => {
          totalFiles++;
        });

        // Reopen to extract
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            reject(new Error(`Failed to reopen ZIP file: ${err.message}`));
            return;
          }

          zipfile.readEntry();

          zipfile.on('entry', (entry) => {
            const entryPath = path.join(outputDir, entry.fileName);
            
            // Security check: prevent directory traversal
            if (!entryPath.startsWith(outputDir)) {
              console.warn(`⚠️ Skipping potentially dangerous path: ${entry.fileName}`);
              zipfile.readEntry();
              return;
            }

            if (/\/$/.test(entry.fileName)) {
              // Directory entry
              fs.mkdirSync(entryPath, { recursive: true });
              extractedFiles++;
              zipfile.readEntry();
            } else {
              // File entry
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  reject(new Error(`Failed to read entry ${entry.fileName}: ${err.message}`));
                  return;
                }

                // Ensure parent directory exists
                const parentDir = path.dirname(entryPath);
                if (!fs.existsSync(parentDir)) {
                  fs.mkdirSync(parentDir, { recursive: true });
                }

                const writeStream = fs.createWriteStream(entryPath);
                
                writeStream.on('error', (err) => {
                  reject(new Error(`Failed to write file ${entry.fileName}: ${err.message}`));
                });

                writeStream.on('close', () => {
                  extractedFiles++;
                  if (extractedFiles === totalFiles) {
                    resolve();
                  } else {
                    zipfile.readEntry();
                  }
                });

                readStream.pipe(writeStream);
              });
            }
          });

          zipfile.on('end', () => {
            if (extractedFiles === totalFiles) {
              resolve();
            }
          });

          zipfile.on('error', (err) => {
            reject(new Error(`ZIP extraction error: ${err.message}`));
          });
        });
      });
    });
  }

  /**
   * Validate extracted extension
   * @param {string} extensionDir - Extension directory
   * @returns {Object} - Validation result
   */
  validateExtension(extensionDir) {
    try {
      const manifestPath = path.join(extensionDir, 'manifest.json');
      
      if (!fs.existsSync(manifestPath)) {
        return { isValid: false, error: 'manifest.json not found' };
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      // Basic manifest validation
      const required = ['name', 'version', 'manifest_version'];
      const missing = required.filter(field => !manifest[field]);

      if (missing.length > 0) {
        return { 
          isValid: false, 
          error: `Missing required manifest fields: ${missing.join(', ')}` 
        };
      }

      // Check for suspicious files
      const suspiciousFiles = this.findSuspiciousFiles(extensionDir);
      if (suspiciousFiles.length > 0) {
        console.warn('⚠️ Found potentially suspicious files:', suspiciousFiles);
      }

      return {
        isValid: true,
        manifest,
        suspiciousFiles
      };

    } catch (error) {
      return { 
        isValid: false, 
        error: `Validation failed: ${error.message}` 
      };
    }
  }

  /**
   * Find potentially suspicious files in extension
   * @param {string} extensionDir - Extension directory
   * @returns {Array} - List of suspicious files
   */
  findSuspiciousFiles(extensionDir) {
    const suspicious = [];
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.dll$/i,
      /\.so$/i,
      /\.dylib$/i,
      /\.bat$/i,
      /\.sh$/i,
      /\.scr$/i
    ];

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else {
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(file)) {
              suspicious.push(path.relative(extensionDir, filePath));
              break;
            }
          }
        }
      }
    };

    try {
      scanDirectory(extensionDir);
    } catch (error) {
      console.warn('Warning: Could not scan for suspicious files:', error.message);
    }

    return suspicious;
  }
}

module.exports = CrxParser;

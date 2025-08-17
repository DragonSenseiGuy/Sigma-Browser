const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// macOS icon corner radius guidelines (as percentage of icon size)
// Based on Apple's Human Interface Guidelines
const CORNER_RADIUS_RATIOS = {
  16: 0.1875,   // 3px radius for 16px icon
  32: 0.1875,   // 6px radius for 32px icon  
  64: 0.1875,   // 12px radius for 64px icon
  128: 0.1875,  // 24px radius for 128px icon
  256: 0.1875,  // 48px radius for 256px icon
  512: 0.1875,  // 96px radius for 512px icon
  1024: 0.1875  // 192px radius for 1024px icon
};

async function createRoundedCornerMask(size, radius) {
  // Create an SVG mask with rounded corners
  const svgMask = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>
  `;
  
  return Buffer.from(svgMask);
}

async function addRoundedCorners(inputPath, outputPath, size) {
  try {
    const radius = Math.round(size * CORNER_RADIUS_RATIOS[size]);
    
    console.log(`Processing ${size}x${size} icon with ${radius}px corner radius...`);
    
    // Create rounded corner mask
    const maskSvg = await createRoundedCornerMask(size, radius);
    
    // Load the original icon
    const originalIcon = sharp(inputPath);
    
    // Get metadata to ensure we're working with the right dimensions
    const metadata = await originalIcon.metadata();
    console.log(`  Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Resize if necessary to ensure exact dimensions
    let processedIcon = originalIcon;
    if (metadata.width !== size || metadata.height !== size) {
      processedIcon = originalIcon.resize(size, size, {
        fit: 'cover',
        position: 'center'
      });
    }
    
    // Create the mask
    const mask = sharp(maskSvg)
      .resize(size, size)
      .png();
    
    // Apply the rounded corner mask
    const roundedIcon = await processedIcon
      .composite([{
        input: await mask.toBuffer(),
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();
    
    // Save the result
    await sharp(roundedIcon).toFile(outputPath);
    
    console.log(`  ✅ Saved rounded icon: ${outputPath}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${inputPath}:`, error.message);
    throw error;
  }
}

async function processAllIcons() {
  const iconsDir = path.join(__dirname, '..', 'assets', 'AppIcons');
  const backupDir = path.join(iconsDir, 'backup-original');
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 Created backup directory for original icons');
  }
  
  const iconSizes = [16, 32, 64, 128, 256, 512, 1024];
  
  console.log('🎨 Starting to add rounded corners to all icons...\n');
  
  for (const size of iconSizes) {
    const filename = `${size}.png`;
    const inputPath = path.join(iconsDir, filename);
    const backupPath = path.join(backupDir, filename);
    const outputPath = inputPath; // Overwrite original
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${filename} - file not found`);
      continue;
    }
    
    // Backup original if not already backed up
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`💾 Backed up original: ${filename}`);
    }
    
    // Add rounded corners
    await addRoundedCorners(inputPath, outputPath, size);
  }
  
  console.log('\n✨ All icons have been updated with rounded corners!');
  console.log('📁 Original icons are backed up in: assets/AppIcons/backup-original/');
  console.log('🔄 Restart the application to see the changes.');
}

// Run the script
if (require.main === module) {
  processAllIcons().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { addRoundedCorners, processAllIcons };

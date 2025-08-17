# Icon Management for Sigma Browser

This document explains how to manage and update the application icons for the Sigma browser.

## Icon Structure

The application uses multiple icon sizes to ensure optimal display across all macOS contexts:

```
assets/AppIcons/
├── 16.png          # Menu bar, small UI elements
├── 32.png          # Retina menu bar, small UI elements
├── 64.png          # Medium UI elements
├── 128.png         # Large UI elements, notifications
├── 256.png         # Retina large UI elements
├── 512.png         # Window icons, medium displays
├── 1024.png        # Dock icon, high-resolution displays
├── Contents.json   # Icon metadata
└── backup-original/ # Backup of original square icons
    ├── 16.png
    ├── 32.png
    ├── 64.png
    ├── 128.png
    ├── 256.png
    ├── 512.png
    └── 1024.png
```

## Rounded Corners

All icons follow macOS Human Interface Guidelines with appropriate rounded corners:

- **Corner Radius**: 18.75% of icon size (e.g., 192px radius for 1024px icon)
- **Consistent Scaling**: Radius scales proportionally for all sizes
- **Native Appearance**: Matches standard macOS application icons

### Corner Radius by Size:
- 16px icon: 3px radius
- 32px icon: 6px radius
- 64px icon: 12px radius
- 128px icon: 24px radius
- 256px icon: 48px radius
- 512px icon: 96px radius
- 1024px icon: 192px radius

## Scripts

### Add Rounded Corners
```bash
npm run icons:round
```
Applies rounded corners to all icons in `assets/AppIcons/`. Original icons are automatically backed up to `backup-original/` folder.

### Restore Original Icons
```bash
npm run icons:restore
```
Restores the original square icons from the backup folder.

## Manual Icon Updates

1. **Replace Source Icons**: Update the PNG files in `assets/AppIcons/`
2. **Apply Rounded Corners**: Run `npm run icons:round`
3. **Test**: Restart the application to see changes
4. **Build**: Create distribution package with `npm run build`

## Technical Details

- **Image Processing**: Uses Sharp library for high-quality image manipulation
- **Format**: PNG with transparency support
- **Color Profile**: sRGB for consistent color reproduction
- **Compression**: Optimized for file size while maintaining quality

## Troubleshooting

### Icons Not Updating
1. Restart the application completely
2. Clear macOS icon cache: `sudo rm -rf /Library/Caches/com.apple.iconservices.store`
3. Restart Dock: `killall Dock`

### Build Issues
- Ensure all icon sizes are present (16, 32, 64, 128, 256, 512, 1024)
- Verify PNG format and transparency
- Check file permissions

### Quality Issues
- Use high-resolution source images (preferably vector-based)
- Ensure source images are square (1:1 aspect ratio)
- Test on both standard and Retina displays

## Best Practices

1. **Source Material**: Start with vector graphics or high-resolution images
2. **Consistency**: Maintain visual consistency across all icon sizes
3. **Testing**: Test icons on different display densities
4. **Backup**: Always backup original icons before modifications
5. **Version Control**: Commit icon changes with descriptive messages

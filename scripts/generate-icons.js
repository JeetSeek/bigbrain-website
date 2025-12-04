#!/usr/bin/env node
/**
 * Generate PWA icons from source image
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const sourceIcon = path.join(publicDir, 'brain-icon-nBG.png');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('🎨 Generating PWA icons from:', sourceIcon);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a background
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ Created ${size}x${size} icon`);
  }

  console.log('\n✨ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);

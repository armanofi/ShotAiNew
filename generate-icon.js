const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgBuffer = Buffer.from(`
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4F7FFF" />
        <stop offset="100%" stop-color="#7C3AED" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="112" ry="112" fill="url(#grad)" />
    <text x="256" y="325" font-family="Arial, sans-serif" font-weight="900" font-size="280" fill="white" text-anchor="middle" dominant-baseline="middle" letter-spacing="-10">SA</text>
  </svg>
`);

async function generate() {
  const destDir = path.join(__dirname, 'build');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  
  await sharp(svgBuffer)
    .png()
    .toFile(path.join(destDir, 'icon.png'));
    
  await sharp(svgBuffer)
    .png()
    .toFile(path.join(__dirname, 'src', 'assets', 'logo.png'));
    
  console.log('Transparent PNG icons generated successfully!');
}

generate().catch(console.error);

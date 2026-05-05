// Sync selected images from docs/ into client/public/images before dev
// This avoids Vite security limits on serving files outside the client root.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const DOCS = path.join(ROOT, 'docs');
const CLIENT_IMAGES = path.join(ROOT, 'client', 'public', 'images');

const files = [
  { src: 'pexels-pixabay-139398.jpg', dest: 'pexels-pixabay-139398.jpg' },
  { src: '360_F_117504933_9F6FUj8oK1YeOCPLSOXYJC6Z49i4fmyf.jpg', dest: 'medicine-supplies.jpg' },
  { src: 'pic 4.avif', dest: 'pic-4.avif' },
  { src: 'pic 1.jpeg', dest: 'pic-1.jpeg' },
  { src: 'pic 2.png', dest: 'pic-2.png' },
  { src: 'pic 3.jpeg', dest: 'pic-3.jpeg' },
  { src: 'pic 5.jpg', dest: 'pic-5.jpg' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfExists(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) {
    console.warn(`[assets] Missing: ${srcPath}`);
    return;
  }
  fs.copyFileSync(srcPath, destPath);
  console.log(`[assets] Copied: ${path.basename(srcPath)} -> ${path.relative(ROOT, destPath)}`);
}

function main() {
  ensureDir(CLIENT_IMAGES);
  files.forEach(({ src, dest }) => {
    const from = path.join(DOCS, src);
    const to = path.join(CLIENT_IMAGES, dest);
    copyIfExists(from, to);
  });
}

main();

// Generate PNG favicons from public/favicon.svg at build time.
// Safe to skip if dependencies are missing (build continues).
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const publicDir = path.resolve(__dirname, '..', 'public');
    const svgPath = path.join(publicDir, 'favicon.svg');
    const svg = await fs.readFile(svgPath);

    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.warn('[icon-gen] sharp not available, skipping PNG generation.');
      return;
    }

    const targets = [
      { file: 'favicon-16.png', size: 16 },
      { file: 'favicon-32.png', size: 32 },
      { file: 'apple-touch-icon.png', size: 180 },
    ];

    await Promise.all(targets.map(async ({ file, size }) => {
      const out = path.join(publicDir, file);
      const img = sharp(svg).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
      await img.png({ compressionLevel: 9 }).toFile(out);
      console.log(`[icon-gen] wrote ${file}`);
    }));
  } catch (e) {
    console.warn('[icon-gen] failed:', e?.message || e);
  }
}

main();


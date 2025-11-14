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
    const svgBuf = await fs.readFile(svgPath);
    const svgStr = svgBuf.toString('utf8');

    const targets = [
      { file: 'favicon-16.png', size: 16 },
      { file: 'favicon-32.png', size: 32 },
      { file: 'apple-touch-icon.png', size: 180 },
    ];

    let rendered = false;

    // Try sharp first
    try {
      const sharp = (await import('sharp')).default;
      await Promise.all(targets.map(async ({ file, size }) => {
        const out = path.join(publicDir, file);
        const img = sharp(svgBuf).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
        await img.png({ compressionLevel: 9 }).toFile(out);
        console.log(`[icon-gen] wrote ${file} via sharp`);
      }));
      rendered = true;
    } catch {}

    // Fallback to resvg (pure WASM)
    if (!rendered) {
      try {
        const { Resvg } = await import('@resvg/resvg-js');
        for (const { file, size } of targets) {
          const r = new Resvg(svgStr, {
            fitTo: { mode: 'width', value: size },
          });
          const png = r.render().asPng();
          const out = path.join(publicDir, file);
          await fs.writeFile(out, png);
          console.log(`[icon-gen] wrote ${file} via resvg`);
        }
        rendered = true;
      } catch {}
    }

    if (!rendered) {
      console.warn('[icon-gen] no renderer available (sharp/resvg). Skipping.');
    }
  } catch (e) {
    console.warn('[icon-gen] failed:', e?.message || e);
  }
}

main();


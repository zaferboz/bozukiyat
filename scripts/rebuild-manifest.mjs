/**
 * Rebuild songs/manifest.json and js/songs-bundle.js from songs/*.json.
 * Run: npm run rebuild-manifest
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const songsDir = path.join(root, 'songs');
const manifestPath = path.join(songsDir, 'manifest.json');
const bundlePath = path.join(root, 'js', 'songs-bundle.js');

const onDisk = fs
  .readdirSync(songsDir)
  .filter((f) => f.endsWith('.json') && f !== 'manifest.json');

let files;
if (fs.existsSync(manifestPath)) {
  const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).files || [];
  const diskSet = new Set(onDisk);
  files = [
    ...prev.filter((f) => diskSet.has(f)),
    ...onDisk.filter((f) => !prev.includes(f)).sort((a, b) => a.localeCompare(b, 'en')),
  ];
} else {
  files = onDisk.sort((a, b) => a.localeCompare(b, 'en'));
}

const manifest = { version: 1, files };
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const songs = files.map((file) =>
  JSON.parse(fs.readFileSync(path.join(songsDir, file), 'utf8'))
);
fs.writeFileSync(
  bundlePath,
  `// Auto-generated fallback (file:// / offline). Regenerate: npm run rebuild-manifest\nvar SONGS_BUNDLE = ${JSON.stringify(songs, null, 2)};\n`,
  'utf8'
);

console.log(`Updated songs/manifest.json and js/songs-bundle.js (${files.length} songs)`);

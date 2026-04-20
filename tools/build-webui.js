const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceIndex = path.join(root, 'SPIFFS', 'index.html');
const spiffsGz = path.join(root, 'SPIFFS', 'index.html.gz');
const distDir = path.join(root, 'dist', 'standard');
const standardGz = path.join(distDir, 'index.html.gz');
const standardManifest = path.join(distDir, 'manifest.json');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function gzipHtml(html) {
  return zlib.gzipSync(Buffer.from(html, 'utf8'), { level: 9 });
}

function writeGzip(dest, html) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const gz = gzipHtml(html);
  fs.writeFileSync(dest, gz);
  return gz;
}

function main() {
  const html = fs.readFileSync(sourceIndex, 'utf8');
  const raw = Buffer.from(html, 'utf8');
  const spiffs = writeGzip(spiffsGz, html);
  const standard = writeGzip(standardGz, html);

  fs.writeFileSync(standardManifest, JSON.stringify({
    mode: 'standard-single-file',
    entrypoint: 'dist/standard/index.html.gz',
    generatedFrom: [
      'SPIFFS/index.html'
    ],
    notes: 'SPIFFS/index.html is the canonical single-file Mainfail WebUI source. The gzip outputs are byte-equivalent builds from that source.',
    rawBytes: raw.length,
    gzipBytes: standard.length,
    rawSha256: sha256(raw),
    gzipSha256: sha256(standard)
  }, null, 2));

  console.log('Built SPIFFS/index.html.gz:', spiffs.length, 'bytes');
  console.log('Built dist/standard/index.html.gz:', standard.length, 'bytes');
  console.log('Source raw bytes:', raw.length);
}

main();

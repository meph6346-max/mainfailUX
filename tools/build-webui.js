const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceIndex = path.join(root, 'SPIFFS', 'index.html');
const spiffsGz = path.join(root, 'SPIFFS', 'index.html.gz');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function gzipHtml(html) {
  return zlib.gzipSync(Buffer.from(html, 'utf8'), { level: 9 });
}

function main() {
  const html = fs.readFileSync(sourceIndex, 'utf8');
  const raw = Buffer.from(html, 'utf8');
  const gz = gzipHtml(html);
  fs.writeFileSync(spiffsGz, gz);

  console.log('Built SPIFFS/index.html.gz:', gz.length, 'bytes');
  console.log('Source raw bytes:', raw.length);
  console.log('SHA256:', sha256(gz));
}

main();

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'SPIFFS', 'index.html');
const cssPath = path.join(root, 'SD_CARD', 'webui', 'mainfail.css');
const jsPath = path.join(root, 'SD_CARD', 'webui', 'mainfail.js');

const start = '<!-- MF_EMBEDDED_ASSETS_START -->';
const end = '<!-- MF_EMBEDDED_ASSETS_END -->';

function b64(file) {
  return fs.readFileSync(file).toString('base64');
}

let html = fs.readFileSync(indexPath, 'utf8');
const block = [
  start,
  '<script id="mf-embedded-assets" type="application/json">',
  JSON.stringify({ css: b64(cssPath), js: b64(jsPath) }),
  '</script>',
  end
].join('');

const re = new RegExp(`${start}[\\s\\S]*?${end}`);
if (re.test(html)) {
  html = html.replace(re, block);
} else {
  html = html.replace('</style></head><body>', `</style>${block}</head><body>`);
}

fs.writeFileSync(indexPath, html);

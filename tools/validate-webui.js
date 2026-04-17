const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const pages = ['dashboard', 'console', 'files', 'settings', 'heightmap', 'history', 'eeprom', 'gcode', 'camera'];

function fail(msg) {
  throw new Error(msg);
}

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readGzip(rel) {
  return zlib.gunzipSync(fs.readFileSync(path.join(root, rel))).toString('utf8');
}

function countOf(text, needle) {
  return text.split(needle).length - 1;
}

function assertSingle(text, needle, label) {
  const n = countOf(text, needle);
  if (n !== 1) fail(`${label} must appear once, found ${n}`);
}

function checkScriptSyntax(html, label) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((m, i) => {
    const tag = m[0].slice(0, 220);
    if (/type=["']application\/json["']/i.test(tag)) return;
    const body = m[1].trim();
    if (!body) return;
    try {
      new vm.Script(body, { filename: `${label}:script:${i}` });
    } catch (e) {
      fail(`${label} script ${i} syntax error: ${e.message}`);
    }
  });
}

function checkMainfailStructure(html, label) {
  assertSingle(html, '<main class="mf-content">', `${label} mf-content main`);
  assertSingle(html, '<div id="mf-hidden-stubs"', `${label} hidden stubs`);
  const mainStart = html.indexOf('<main class="mf-content">');
  const mainEnd = html.indexOf('</main>', mainStart);
  const hiddenStart = html.indexOf('<div id="mf-hidden-stubs"');
  if (mainStart < 0 || mainEnd < 0) fail(`${label} missing main region`);
  if (hiddenStart < 0) fail(`${label} missing hidden stubs`);
  if (mainEnd > hiddenStart) fail(`${label} hidden stubs must stay outside mf-content`);
  pages.forEach((page) => {
    const id = `id="mf-page-${page}"`;
    assertSingle(html, id, `${label} ${page} page`);
    const pos = html.indexOf(id);
    if (pos < mainStart || pos > mainEnd) fail(`${label} ${page} page is outside mf-content`);
  });
  const region = html.slice(html.indexOf('<div id="main_ui"'), hiddenStart);
  const stack = [];
  const tags = [...region.matchAll(/<\/?(div|main|nav|header)\b[^>]*>/gi)];
  tags.forEach((m) => {
    const raw = m[0];
    const tag = m[1].toLowerCase();
    if (raw.startsWith('</')) {
      const open = stack.pop();
      if (open !== tag) fail(`${label} mismatched ${raw}, expected </${open || 'none'}>`);
    } else if (!raw.endsWith('/>')) {
      stack.push(tag);
    }
  });
  if (stack.length) fail(`${label} unclosed shell tags: ${stack.join(',')}`);
}

function checkBundledAssets(html, label) {
  const m = html.match(/<script id="mf-standard-assets" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return;
  let assets;
  try {
    assets = JSON.parse(m[1]);
  } catch (e) {
    fail(`${label} bundled asset JSON invalid: ${e.message}`);
  }
  ['mainfail_css', 'mainfail_js', 'mainfail_cfg', 'gcode_viewer_js', 'lang_en', 'lang_ko', 'theme_default'].forEach((key) => {
    if (!assets[key]) fail(`${label} missing bundled asset ${key}`);
    const text = Buffer.from(assets[key], 'base64').toString('utf8');
    if (!text.trim()) fail(`${label} bundled asset ${key} is empty`);
    if (key.endsWith('_js')) {
      try {
        new vm.Script(text, { filename: `${label}:${key}` });
      } catch (e) {
        fail(`${label} bundled asset ${key} syntax error: ${e.message}`);
      }
    }
    if (key.endsWith('_cfg') || key.startsWith('lang_') || key.startsWith('theme_')) {
      try {
        JSON.parse(text);
      } catch (e) {
        fail(`${label} bundled asset ${key} JSON error: ${e.message}`);
      }
    }
  });
}

function validateHtml(html, label) {
  checkMainfailStructure(html, label);
  checkScriptSyntax(html, label);
  checkBundledAssets(html, label);
}

function main() {
  const rounds = Number(process.argv[2] || 30);
  if (!Number.isInteger(rounds) || rounds < 1) fail('rounds must be a positive integer');
  for (let i = 1; i <= rounds; i += 1) {
    validateHtml(readText('SPIFFS/index.html'), `SPIFFS round ${i}`);
    validateHtml(readGzip('SPIFFS/index.html.gz'), `SPIFFS gzip round ${i}`);
    validateHtml(readGzip('dist/standard/index.html.gz'), `standard gzip round ${i}`);
  }
  console.log(`WebUI validation passed: ${rounds} rounds`);
}

main();

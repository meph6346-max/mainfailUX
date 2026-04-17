const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const spiffsDir = path.join(root, 'SPIFFS');
const littlefsDir = path.join(root, 'LITTLEFS', 'webui');
const distDir = path.join(root, 'dist', 'standard');

const sourceIndex = path.join(spiffsDir, 'index.html');
const spiffsGz = path.join(spiffsDir, 'index.html.gz');
const standardGz = path.join(distDir, 'index.html.gz');
const standardManifest = path.join(distDir, 'manifest.json');

function readText(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function b64(rel) {
  return Buffer.from(readText(rel), 'utf8').toString('base64');
}

function gzipFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const gz = zlib.gzipSync(fs.readFileSync(src), { level: 9 });
  fs.writeFileSync(dest, gz);
  return gz.length;
}

function standardLoader(assets) {
  const payload = JSON.stringify(assets);
  return `<script id="mf-standard-assets" type="application/json">${payload}</script>
<script>
/* === Mainfail UX v3.1 - Standard Bundle Loader === */
var mf_fsOK=true,mf_config=null,mf_lang={},mf_gvLoading=false;
window.mf_storageMode='standard';

function mf_assets(){return JSON.parse(document.getElementById('mf-standard-assets').textContent)}
function mf_decodeAsset(k){
  var b=mf_assets()[k]||'',s=atob(b),bytes=new Uint8Array(s.length),i;
  for(i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);
  if(window.TextDecoder)return new TextDecoder('utf-8').decode(bytes);
  return decodeURIComponent(escape(s));
}
function mf_jsonAsset(k){
  try{return JSON.parse(mf_decodeAsset(k))}catch(e){console.warn('[MF] Bad bundled asset:'+k);return null}
}
function mf_injectCSS(k){
  var st=document.createElement('style');st.textContent=mf_decodeAsset(k);document.head.appendChild(st);
}
function mf_injectScript(k,cb){
  try{var s=document.createElement('script');s.text=mf_decodeAsset(k);document.body.appendChild(s);if(cb)cb(true)}
  catch(e){console.error('[MF] Bundled JS eval fail:',e);if(cb)cb(false)}
}
function mf_loadWebUI(){
  var el=document.getElementById('mf-load-msg');
  if(el) el.textContent='Loading Mainfail assets...';
  mf_injectCSS('mainfail_css');
  mf_injectScript('mainfail_js',function(ok){
    if(!ok){if(el) el.textContent='Mainfail bundle failed';mf_onFSReady();return}
    mf_continueFSLoad(el);
  });
}
function mf_continueFSLoad(el){
  var cfg=null,stored=null;
  if(el) el.textContent='Loading config...';
  try{stored=localStorage.getItem('mf_config');if(stored)cfg=JSON.parse(stored)}catch(e){}
  if(!cfg) cfg=mf_jsonAsset('mainfail_cfg');
  mf_config=cfg; mf_fsOK=!!cfg;
  if(cfg&&cfg.printer&&cfg.printer.displayName){var dn=cfg.printer.displayName;var el1=document.getElementById('mf-brand-name');if(el1)el1.textContent=dn;var el2=document.getElementById('mf-boot-name');if(el2)el2.textContent=dn;var el3=document.getElementById('mf-boot-subtitle');if(el3)el3.textContent=dn+' UX';}
  var lang=(cfg&&cfg.language)||'en';
  mf_lang=mf_jsonAsset('lang_'+lang)||mf_jsonAsset('lang_en')||{};
  var theme=(cfg&&cfg.theme)||'default';
  var td=mf_jsonAsset('theme_'+theme)||mf_jsonAsset('theme_default');
  if(td&&td.colors) mf_applyTheme(td);
  mf_onFSReady();
}
function mf_applyTheme(t){
  if(!t||!t.colors) return;var r=document.documentElement.style,c=t.colors;
  if(c.primary)r.setProperty('--mf-primary',c.primary);
  if(c.bg)r.setProperty('--mf-bg',c.bg);
  if(c.s1)r.setProperty('--mf-s1',c.s1);
  if(c.s2)r.setProperty('--mf-s2',c.s2);
  if(c.s3)r.setProperty('--mf-s3',c.s3);
  if(c.text)r.setProperty('--mf-text',c.text);
  if(c.bright)r.setProperty('--mf-bright',c.bright);
  if(c.dim)r.setProperty('--mf-dim',c.dim);
  if(c.border)r.setProperty('--mf-border',c.border);
}
function mf_onFSReady(){
  console.log('[MF] Standard bundle:'+(mf_fsOK?'OK':'config unavailable'));
  if(mf_config&&mf_config.dashboardCards) window.mf_savedLayout=mf_config.dashboardCards;
  mf_fixFormIssues();
  if(typeof mf_recoverPageStructure==='function') mf_recoverPageStructure();
  var ol=document.getElementById('mf-loading');
  if(ol){ol.classList.add('hidden');setTimeout(function(){ol.remove()},600)}
  var legacy=document.getElementById('loadingmsg');
  if(legacy) legacy.style.display='none';
  var ui=document.getElementById('main_ui');
  if(ui){ui.classList.remove('hide_it');ui.style.display='flex';ui.style.flexDirection='row';ui.style.alignItems='stretch'}
  var ov=document.getElementById('mf-overlay');
  if(ov&&!ov.classList.contains('open')){ov.style.display='none';ov.style.pointerEvents='none'}
  var main=document.querySelector('.mf-main');
  if(main){main.style.display='flex';main.style.flexDirection='column';main.style.minWidth='0'}
  setTimeout(function(){
    if(typeof mf_recoverPageStructure==='function') mf_recoverPageStructure();
    var visible=false,p=document.querySelectorAll('.mf-page'),i;
    for(i=0;i<p.length;i++){if(getComputedStyle(p[i]).display!=='none') visible=true}
    if(!visible&&typeof mf_switchTab==='function') mf_switchTab('dashboard');
    var h=(location.hash||'').replace(/^#/,'');
    if(h&&document.getElementById('mf-page-'+h)&&typeof mf_switchTab==='function') mf_switchTab(h);
  },50);
}
function mf_fixFormIssues(){
  try{
    var fields=document.querySelectorAll('input,select,textarea'),i,el;
    for(i=0;i<fields.length;i++){el=fields[i];if(!el.id){el.id='mf_auto_field_'+i}if(!el.name){el.name=el.id}}
    var labels=document.querySelectorAll('label'),f;
    for(i=0;i<labels.length;i++){if(labels[i].htmlFor) continue;f=labels[i].querySelector('input,select,textarea');if(f){if(!f.id)f.id='mf_auto_labeled_'+i;labels[i].htmlFor=f.id}}
  }catch(e){}
}
function mf_saveConfig(data,cb){
  try{localStorage.setItem('mf_config',JSON.stringify(data,null,2));mf_config=data;if(cb)cb(true)}
  catch(e){console.warn('[MF] Browser config write failed',e);if(cb)cb(false)}
}
function mf_loadGcodeViewer(){
  if(typeof mf_gvParse==='function'||mf_gvLoading)return;
  mf_gvLoading=true;
  mf_injectScript('gcode_viewer_js',function(ok){mf_gvLoading=false;if(ok)console.log('[MF] Live Path loaded');else console.warn('[MF] Live Path unavailable')});
}
if(document.readyState==='complete')mf_loadWebUI();
else window.addEventListener('load',function(){setTimeout(mf_loadWebUI,200)});
</script>`;
}

function buildStandard() {
  const html = fs.readFileSync(sourceIndex, 'utf8');
  const marker = '/* === Mainfail UX v3.1 - LittleFS Resource Loader === */';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf('</body></html>');
  if (start < 0 || end < start) {
    throw new Error('Could not find LittleFS loader block in SPIFFS/index.html');
  }
  const assets = {
    mainfail_css: b64('LITTLEFS/webui/mainfail.css'),
    mainfail_js: b64('LITTLEFS/webui/mainfail.js'),
    mainfail_cfg: b64('LITTLEFS/webui/mainfail.cfg'),
    gcode_viewer_js: b64('LITTLEFS/webui/js/gcode-viewer.js'),
    lang_en: b64('LITTLEFS/webui/lang/en.json'),
    lang_ko: b64('LITTLEFS/webui/lang/ko.json'),
    theme_default: b64('LITTLEFS/webui/theme/default.json')
  };
  const bundled = html.slice(0, start) + '\n</script>\n' + standardLoader(assets) + '\n' + html.slice(end);
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(standardGz, zlib.gzipSync(Buffer.from(bundled, 'utf8'), { level: 9 }));
  fs.writeFileSync(standardManifest, JSON.stringify({
    mode: 'standard-single-file',
    entrypoint: 'dist/standard/index.html.gz',
    generatedFrom: [
      'SPIFFS/index.html',
      'LITTLEFS/webui/mainfail.css',
      'LITTLEFS/webui/mainfail.js',
      'LITTLEFS/webui/mainfail.cfg',
      'LITTLEFS/webui/js/gcode-viewer.js',
      'LITTLEFS/webui/lang/en.json',
      'LITTLEFS/webui/lang/ko.json',
      'LITTLEFS/webui/theme/default.json'
    ],
    rawBytes: Buffer.byteLength(bundled, 'utf8'),
    gzipBytes: fs.statSync(standardGz).size
  }, null, 2));
}

function main() {
  const splitBytes = gzipFile(sourceIndex, spiffsGz);
  buildStandard();
  const totalRaw = fs.readdirSync(littlefsDir, { recursive: true })
    .map((name) => path.join(littlefsDir, name))
    .filter((file) => fs.statSync(file).isFile())
    .reduce((sum, file) => sum + fs.statSync(file).size, 0);
  console.log('Built SPIFFS/index.html.gz:', splitBytes, 'bytes');
  console.log('Built dist/standard/index.html.gz:', fs.statSync(standardGz).size, 'bytes');
  console.log('LittleFS webui raw total:', totalRaw, 'bytes');
}

main();

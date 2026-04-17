/* Mainfail OS - Live Path / Motion Trace Monitor */
/* LittleFS: /webui/js/gcode-viewer.js (loaded on demand) */

var mf_livePath = {
  running: false,
  paused: false,
  m154Enabled: false,
  m114Timer: null,
  m27Timer: null,
  renderDirty: true,
  renderQueued: false,
  maxPoints: 2500,
  minDistance: 0.08,
  staleMs: 6000,
  bed: { x: 220, y: 220 },
  pos: null,
  points: [],
  state: 'idle',
  file: '',
  printed: 0,
  total: 0,
  progress: 0,
  startedAt: 0,
  lastPositionAt: 0,
  lastLineAt: 0
};

function mf_lpEl(id){return document.getElementById(id)}
function mf_lpText(id,v){var el=mf_lpEl(id);if(el)el.textContent=v}
function mf_lpClass(id,c){var el=mf_lpEl(id);if(el)el.className=c}

function mf_livePathInit(){
  var cfg=window.mf_config||{};
  if(cfg.printer&&cfg.printer.buildVolume){
    mf_livePath.bed.x=parseFloat(cfg.printer.buildVolume[0])||220;
    mf_livePath.bed.y=parseFloat(cfg.printer.buildVolume[1])||220;
  }
  mf_livePathBindCanvas();
  mf_livePathUpdateUI();
  mf_livePathRender();
  console.log('[MF] Live Path ready');
}

function mf_livePathStart(){
  mf_livePath.running=true;
  mf_livePath.paused=false;
  if(!mf_livePath.startedAt) mf_livePath.startedAt=Date.now();
  mf_livePathSetState(mf_livePath.state==='idle'?'monitoring':mf_livePath.state);
  mf_livePathSend('M154 S2');
  mf_livePath.m154Enabled=true;
  mf_livePathSend('M114');
  mf_livePathSend('M27');
  mf_livePathSend('M27 C');
  if(mf_livePath.m114Timer) clearInterval(mf_livePath.m114Timer);
  if(mf_livePath.m27Timer) clearInterval(mf_livePath.m27Timer);
  mf_livePath.m114Timer=setInterval(function(){
    if(mf_livePath.running&&!mf_livePath.paused) mf_livePathSend('M114');
  },5000);
  mf_livePath.m27Timer=setInterval(function(){
    if(mf_livePath.running&&!mf_livePath.paused){mf_livePathSend('M27');mf_livePathSend('M27 C');}
  },6000);
  mf_livePathUpdateUI();
}

function mf_livePathPause(){
  mf_livePath.paused=!mf_livePath.paused;
  mf_livePathUpdateUI();
}

function mf_livePathStop(){
  mf_livePath.running=false;
  mf_livePath.paused=false;
  if(mf_livePath.m114Timer){clearInterval(mf_livePath.m114Timer);mf_livePath.m114Timer=null}
  if(mf_livePath.m27Timer){clearInterval(mf_livePath.m27Timer);mf_livePath.m27Timer=null}
  if(mf_livePath.m154Enabled) mf_livePathSend('M154 S0');
  mf_livePath.m154Enabled=false;
  mf_livePathSetState(mf_livePath.progress>=100?'complete':'idle');
  mf_livePathUpdateUI();
}

function mf_livePathReset(){
  mf_livePath.points=[];
  mf_livePath.pos=null;
  mf_livePath.printed=0;
  mf_livePath.total=0;
  mf_livePath.progress=0;
  mf_livePath.file='';
  mf_livePath.startedAt=0;
  mf_livePath.lastPositionAt=0;
  mf_livePathSetState('idle');
  mf_livePathMarkDirty();
  mf_livePathUpdateUI();
}

function mf_livePathClearTrace(){
  mf_livePath.points=[];
  mf_livePathMarkDirty();
  mf_livePathUpdateUI();
}

function mf_livePathSend(cmd){
  try{
    if(typeof SendPrinterCommand==='function') SendPrinterCommand(cmd,true);
    else if(typeof SendCustomCommand==='function'){
      var input=mf_lpEl('cmd_txt');
      if(input){input.value=cmd;SendCustomCommand();}
    }
  }catch(e){console.warn('[MF] Live Path command failed:',cmd,e)}
}

function mf_livePathHandleLine(line){
  if(!line) return;
  var s=String(line).trim();
  if(!s) return;
  mf_livePath.lastLineAt=Date.now();
  if(mf_livePathParsePosition(s)) return;
  if(mf_livePathParseSD(s)) return;
  if(/printer halted|error:|kill/i.test(s)) mf_livePathSetState('error');
}

function mf_livePathParsePosition(s){
  var mx=s.match(/(?:^|\s)X:\s*(-?\d+(?:\.\d+)?)/i);
  var my=s.match(/(?:^|\s)Y:\s*(-?\d+(?:\.\d+)?)/i);
  if(!mx||!my) return false;
  var mz=s.match(/(?:^|\s)Z:\s*(-?\d+(?:\.\d+)?)/i);
  var x=parseFloat(mx[1]),y=parseFloat(my[1]),z=mz?parseFloat(mz[1]):(mf_livePath.pos?mf_livePath.pos.z:0);
  if(!isFinite(x)||!isFinite(y)) return false;
  mf_livePathAddPoint({x:x,y:y,z:isFinite(z)?z:0,t:Date.now()});
  if(mf_livePath.state==='idle') mf_livePathSetState('monitoring');
  mf_livePathUpdateUI();
  return true;
}

function mf_livePathParseSD(s){
  var m=s.match(/SD printing byte\s+(\d+)\/(\d+)/i);
  if(m){
    mf_livePath.printed=parseInt(m[1],10)||0;
    mf_livePath.total=parseInt(m[2],10)||0;
    mf_livePath.progress=mf_livePath.total>0?Math.max(0,Math.min(100,mf_livePath.printed/mf_livePath.total*100)):0;
    if(!mf_livePath.startedAt) mf_livePath.startedAt=Date.now();
    mf_livePathSetState('printing');
    mf_livePathUpdateUI();
    return true;
  }
  if(/Not SD printing/i.test(s)){
    if(mf_livePath.state==='printing'||mf_livePath.state==='paused') mf_livePathSetState(mf_livePath.progress>=99.5?'complete':'idle');
    mf_livePathUpdateUI();
    return true;
  }
  if(/Done printing file/i.test(s)){
    mf_livePath.progress=100;
    mf_livePathSetState('complete');
    mf_livePathUpdateUI();
    return true;
  }
  if(/pause|paused/i.test(s)&&mf_livePath.state==='printing'){
    mf_livePathSetState('paused');
    mf_livePathUpdateUI();
    return true;
  }
  var f=s.match(/(?:Current file|File opened|File selected|Now printing|Printing file):\s*(.+)$/i);
  if(f){
    mf_livePath.file=f[1].replace(/\s+Size:.*$/i,'').trim();
    mf_livePathUpdateUI();
    return true;
  }
  return false;
}

function mf_livePathAddPoint(p){
  var prev=mf_livePath.points.length?mf_livePath.points[mf_livePath.points.length-1]:null;
  mf_livePath.pos=p;
  mf_livePath.lastPositionAt=p.t;
  if(prev){
    var dx=p.x-prev.x,dy=p.y-prev.y,dz=Math.abs((p.z||0)-(prev.z||0));
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<mf_livePath.minDistance&&dz<0.001&&(p.t-prev.t)<2500) return;
  }
  mf_livePath.points.push(p);
  while(mf_livePath.points.length>mf_livePath.maxPoints) mf_livePath.points.shift();
  mf_livePathMarkDirty();
}

function mf_livePathSetState(s){
  if(mf_livePath.state===s) return;
  mf_livePath.state=s;
  if(typeof mf_setState==='function'){
    if(s==='printing'||s==='paused'||s==='error'||s==='idle') mf_setState(s);
  }
}

function mf_livePathUpdateUI(){
  var now=Date.now();
  var stale=mf_livePath.lastPositionAt&&now-mf_livePath.lastPositionAt>mf_livePath.staleMs;
  var state=stale&&mf_livePath.running?'stale':mf_livePath.state;
  var pos=mf_livePath.pos;
  mf_lpText('mf_lp_state',state.toUpperCase());
  mf_lpClass('mf_lp_state','mf-lp-badge mf-lp-state-'+state);
  mf_lpText('mf_lp_x',pos?pos.x.toFixed(2):'-');
  mf_lpText('mf_lp_y',pos?pos.y.toFixed(2):'-');
  mf_lpText('mf_lp_z',pos?pos.z.toFixed(2):'-');
  mf_lpText('mf_lp_file',mf_livePath.file||'No active SD file');
  mf_lpText('mf_lp_bytes',mf_livePath.total?(mf_livePath.printed+' / '+mf_livePath.total):'-');
  mf_lpText('mf_lp_progress',mf_livePath.progress.toFixed(1)+'%');
  var bar=mf_lpEl('mf_lp_progress_bar');if(bar)bar.style.width=mf_livePath.progress+'%';
  mf_lpText('mf_lp_points',String(mf_livePath.points.length));
  mf_lpText('mf_lp_last',mf_livePath.lastPositionAt?mf_livePathFormatAge(now-mf_livePath.lastPositionAt):'No live position data');
  mf_lpText('mf_lp_elapsed',mf_livePath.startedAt?mf_livePathFormatDuration(now-mf_livePath.startedAt):'-');
  var btn=mf_lpEl('mf_lp_pause_btn');if(btn)btn.textContent=mf_livePath.paused?'Resume Trace':'Pause Trace';
  var hint=mf_lpEl('mf_lp_hint');
  if(hint) hint.textContent=pos?'Reported position from Marlin telemetry. This is not a full G-code preview.':'No live position data yet. Start Live Path or wait for M154/M114 position reports.';
  mf_livePathMarkDirty();
}

function mf_livePathFormatAge(ms){
  var s=Math.max(0,Math.round(ms/1000));
  return s<2?'just now':s+'s ago';
}

function mf_livePathFormatDuration(ms){
  var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  s=s%60;
  return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function mf_livePathMarkDirty(){
  mf_livePath.renderDirty=true;
  if(!mf_livePath.renderQueued){
    mf_livePath.renderQueued=true;
    requestAnimationFrame(function(){mf_livePath.renderQueued=false;mf_livePathRender()});
  }
}

function mf_livePathRender(){
  if(!mf_livePath.renderDirty) return;
  mf_livePath.renderDirty=false;
  var canvas=mf_lpEl('mf_gv_canvas');
  if(!canvas) return;
  var ctx=canvas.getContext('2d');
  var W=canvas.clientWidth||800,H=canvas.clientHeight||520,dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(1,Math.floor(W*dpr));
  canvas.height=Math.max(1,Math.floor(H*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0d0d12';
  ctx.fillRect(0,0,W,H);

  var margin=32,bx=mf_livePath.bed.x||220,by=mf_livePath.bed.y||220;
  var scale=Math.min((W-margin*2)/bx,(H-margin*2)/by);
  var ox=(W-bx*scale)/2,oy=(H-by*scale)/2;
  function sx(x){return ox+x*scale}
  function sy(y){return oy+(by-y)*scale}

  ctx.strokeStyle='rgba(255,255,255,.05)';
  ctx.lineWidth=1;
  var grid=10;
  for(var x=0;x<=bx;x+=grid){ctx.beginPath();ctx.moveTo(sx(x),oy);ctx.lineTo(sx(x),oy+by*scale);ctx.stroke()}
  for(var y=0;y<=by;y+=grid){ctx.beginPath();ctx.moveTo(ox,sy(y));ctx.lineTo(ox+bx*scale,sy(y));ctx.stroke()}

  ctx.strokeStyle='rgba(232,113,10,.55)';
  ctx.lineWidth=1.5;
  ctx.strokeRect(ox,oy,bx*scale,by*scale);
  ctx.fillStyle='rgba(232,113,10,.85)';
  ctx.beginPath();ctx.arc(sx(0),sy(0),4,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='rgba(255,255,255,.35)';
  ctx.font='11px sans-serif';
  ctx.fillText('X+',ox+bx*scale-18,oy+by*scale+18);
  ctx.fillText('Y+',ox-24,oy+12);

  var pts=mf_livePath.points;
  if(!pts.length){
    ctx.fillStyle='rgba(224,224,234,.45)';
    ctx.font='14px sans-serif';
    ctx.textAlign='center';
    ctx.fillText('No live position data',W/2,H/2);
    ctx.textAlign='left';
    return;
  }

  ctx.lineCap='round';
  ctx.lineJoin='round';
  for(var i=1;i<pts.length;i++){
    var a=pts[i-1],b=pts[i];
    var age=i/(pts.length-1||1);
    ctx.strokeStyle='rgba(38,198,218,'+(0.16+age*0.54)+')';
    ctx.lineWidth=1+(Math.min(1,(b.z||0)/2))*0.7;
    ctx.beginPath();ctx.moveTo(sx(a.x),sy(a.y));ctx.lineTo(sx(b.x),sy(b.y));ctx.stroke();
  }
  var tailStart=Math.max(1,pts.length-40);
  ctx.strokeStyle='rgba(255,202,40,.9)';
  ctx.lineWidth=2;
  ctx.beginPath();
  for(var j=tailStart;j<pts.length;j++){
    var p=pts[j];
    if(j===tailStart)ctx.moveTo(sx(p.x),sy(p.y));else ctx.lineTo(sx(p.x),sy(p.y));
  }
  ctx.stroke();

  var cur=mf_livePath.pos;
  if(cur){
    var blink=0.65+Math.sin(Date.now()/180)*0.25;
    ctx.fillStyle='rgba(232,113,10,'+blink+')';
    ctx.beginPath();ctx.arc(sx(cur.x),sy(cur.y),7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.85)';
    ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(sx(cur.x),sy(cur.y),3,0,Math.PI*2);ctx.stroke();
  }
}

function mf_livePathBindCanvas(){
  var c=mf_lpEl('mf_gv_canvas');
  if(!c||c._mfLiveBound) return;
  c._mfLiveBound=true;
  window.addEventListener('resize',mf_livePathMarkDirty);
}

setInterval(function(){
  if(!mf_lpEl('mf_gv_canvas')) return;
  if(mf_livePath.running) mf_livePathUpdateUI();
  if(mf_livePath.pos) mf_livePathMarkDirty();
},1000);

/* Backward-compatible names used by older Mainfail buttons/stubs. */
function mf_gvReset(){mf_livePathClearTrace()}
function mf_gvSetLayer(){}
function mf_gvLoadFile(){}
function mf_gvParseText(){}
function mf_gvLoadFromConsole(){}
function mf_gvParse(){}

mf_livePathInit();

/* Mainfail OS v3.0 — Custom Features */
/* SD: /webui/mainfail.js */
/* Functions: mf_switchTab, mf_toggleCard, mf_openSidebar, mf_closeSidebar,
   mf_switchSettingsTab, mf_startEepromCapture, mf_parseEepromLine,
   mf_buildEepromUI, mf_renderEeprom, mf_eepromChanged, mf_sendEepromLine,
   mf_startMeshCapture, mf_parseMeshLine, mf_renderMesh,
   mf_logPrintStart, mf_logPrintEnd, mf_updateHistoryUI,
   mf_updatePrintStatusCard, Extensions, Theme Engine */

function mf_switchTab(t){
  document.querySelectorAll('.mf-page').forEach(function(p){p.style.display='none'});
  var pg=document.getElementById('mf-page-'+t);
  if(pg)pg.style.display='block';
  document.querySelectorAll('.mf-nav-item').forEach(function(n){n.classList.remove('active')});
  var nav=document.getElementById('mf-nav-'+t);
  if(nav)nav.classList.add('active');
}
function mf_toggleCard(h){var b=h.nextElementSibling;if(b)b.style.display=b.style.display==='none'?'':'none'}
function mf_openSidebar(){
  var s=document.getElementById('mf-sidebar'), o=document.getElementById('mf-overlay');
  if(s) s.classList.add('open');
  if(o) o.classList.add('open');
}
function mf_closeSidebar(){
  var s=document.getElementById('mf-sidebar'), o=document.getElementById('mf-overlay');
  if(s) s.classList.remove('open');
  if(o) o.classList.remove('open');
}

function mf_escapeHtml(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}

function mf_sendCommand(cmd){
  if(typeof SendPrinterCommand==='function') SendPrinterCommand(cmd,true);
}

/* ═══ Settings Sub-tabs ═══ */
function mf_switchSettingsTab(t){
  document.querySelectorAll('.mf-stab-page').forEach(function(p){p.style.display='none'});
  var pg=document.getElementById('mf-stab-page-'+t);
  if(pg)pg.style.display='block';
  document.querySelectorAll('.mf-stab').forEach(function(n){n.classList.remove('active')});
  var tab=document.getElementById('mf-stab-'+t);
  if(tab)tab.classList.add('active');
}

/* ═══ Card Collapse Toggle ═══ */
function mf_toggleCard(el){
  var panel=el.closest('.panel');
  if(!panel)return;
  var body=panel.querySelector('.panel-body');
  var foot=panel.querySelector('.panel-footer');
  var chev=el.querySelector('.mf-chevron');
  if(body){body.classList.toggle('mf-collapsed');}
  if(foot){foot.classList.toggle('mf-collapsed');}
  if(chev){chev.classList.toggle('collapsed');}
}

/* ═══════════════════════════════════════════
   EEPROM Editor — M503 Response Parser
   ═══════════════════════════════════════════ */
var mf_eeprom = {
  capturing: false,
  buffer: [],
  sections: {}
};

function mf_startEepromCapture(){
  mf_eeprom.capturing=true;
  mf_eeprom.buffer=[];
  mf_eeprom.sections={};
  var el=document.getElementById('eeprom_content');
  if(el) el.innerHTML='<div class="mf-eeprom-loading">Reading EEPROM... <span class="mf-spinner"></span></div>';
}

function mf_parseEepromLine(line){
  if(!mf_eeprom.capturing) return;
  var s=line.trim();
  if(!s) return;
  // Strip "echo:" prefix
  s=s.replace(/^echo:\s*/,'');
  // Detect end
  if(s==='ok' || s.startsWith('ok') || mf_eeprom.buffer.length > 200){
    mf_eeprom.capturing=false;
    mf_buildEepromUI();
    return;
  }
  if(!s) return;
  mf_eeprom.buffer.push(s);
}

function mf_buildEepromUI(){
  var lines=mf_eeprom.buffer;
  var sections=[];
  var cur={title:'General',items:[]};
  for(var i=0;i<lines.length;i++){
    var L=lines[i].trim();
    if(!L||L==='ok') continue;
    // Section header: starts with "; "
    if(L.charAt(0)===';'){
      if(cur.items.length>0) sections.push(cur);
      cur={title:L.replace(/^;\s*/,''),items:[]};
      continue;
    }
    // Parse M/G command: e.g. "M92 X80.00 Y80.00 Z400.00 E420.00"
    var m=L.match(/^([MGT]\d+)\s*(.*)/);
    if(m){
      var cmd=m[1], params=m[2];
      var pairs=[];
      // Parse key=value pairs like X80.00 Y80.00
      var pMatch=params.match(/([A-Z])(-?[\d.]+)/g);
      if(pMatch){
        for(var j=0;j<pMatch.length;j++){
          var key=pMatch[j].charAt(0);
          var val=pMatch[j].substring(1);
          pairs.push({key:key,val:val});
        }
      }
      cur.items.push({cmd:cmd,raw:L,pairs:pairs,params:params});
    } else {
      cur.items.push({cmd:'',raw:L,pairs:[],params:L});
    }
  }
  if(cur.items.length>0) sections.push(cur);
  mf_eeprom.sections=sections;
  mf_renderEeprom(sections);
}

function mf_renderEeprom(sections){
  var el=document.getElementById('eeprom_content');
  if(!el) return;
  if(sections.length===0){
    el.innerHTML='<div class="mf-ph-empty">No EEPROM data received. Make sure printer is connected.</div>';
    return;
  }
  var h='';
  for(var i=0;i<sections.length;i++){
    var sec=sections[i];
    h+='<div class="mf-ee-section">';
    h+='<div class="mf-ee-header" onclick="this.nextElementSibling.classList.toggle(\'mf-collapsed\');this.querySelector(\'svg\').classList.toggle(\'collapsed\')">'+
       '<svg class="mf-chevron" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg> '+
       '<span>'+mf_escapeHtml(sec.title)+'</span></div>';
    h+='<div class="mf-ee-body">';
    for(var j=0;j<sec.items.length;j++){
      var it=sec.items[j];
      h+='<div class="mf-ee-row">';
      h+='<span class="mf-ee-cmd">'+mf_escapeHtml(it.cmd)+'</span>';
      if(it.pairs.length>0){
        for(var k=0;k<it.pairs.length;k++){
          var p=it.pairs[k];
          h+='<label class="mf-ee-param"><span class="mf-ee-key">'+p.key+'</span>'+
             '<input class="mf-ee-val" type="number" step="any" value="'+mf_escapeHtml(p.val)+'" data-cmd="'+mf_escapeHtml(it.cmd)+'" data-key="'+mf_escapeHtml(p.key)+'" data-orig="'+mf_escapeHtml(p.val)+'" onchange="mf_eepromChanged(this)"></label>';
        }
      } else {
        h+='<span class="mf-ee-raw">'+mf_escapeHtml(it.params)+'</span>';
      }
      h+='<button class="mf-ee-send" title="Send this command" onclick="mf_sendEepromLine(this)" data-cmd="'+mf_escapeHtml(it.cmd)+'" style="display:none">Apply</button>';
      h+='</div>';
    }
    h+='</div></div>';
  }
  h+='<div class="mf-ee-hint">Edit values and click <b>Apply</b> to send individual commands, or <b>Save to EEPROM (M500)</b> to persist all changes.</div>';
  el.innerHTML=h;
}

function mf_eepromChanged(inp){
  var row=inp.closest('.mf-ee-row');
  if(!row) return;
  var btn=row.querySelector('.mf-ee-send');
  var changed=false;
  row.querySelectorAll('.mf-ee-val').forEach(function(v){
    if(v.value!==v.getAttribute('data-orig')){changed=true;v.style.borderColor='var(--mf-primary)';}
    else{v.style.borderColor='';}
  });
  if(btn) btn.style.display=changed?'inline-block':'none';
}

function mf_sendEepromLine(btn){
  var row=btn.closest('.mf-ee-row');
  if(!row) return;
  var cmd=btn.getAttribute('data-cmd');
  if(!cmd) return;
  var params='';
  row.querySelectorAll('.mf-ee-val').forEach(function(v){
    params+=' '+v.getAttribute('data-key')+v.value;
    v.setAttribute('data-orig',v.value);
    v.style.borderColor='';
  });
  btn.style.display='none';
  mf_sendCommand(cmd+params);
}

/* ═══════════════════════════════════════════
   Heightmap — Bed Mesh Parser & Visualizer
   ═══════════════════════════════════════════ */
var mf_mesh = {
  capturing: false,
  buffer: [],
  grid: [],
  rows: 0,
  cols: 0
};

function mf_startMeshCapture(){
  mf_mesh.capturing=true;
  mf_mesh.buffer=[];
  mf_mesh.grid=[];
  var el=document.getElementById('mf_heightmap_data');
  if(el){el.style.display='block';el.textContent='Reading mesh data...\n';}
}

function mf_parseMeshLine(line){
  if(!mf_mesh.capturing) return;
  var s=line.trim();
  if(!s) return;
  s=s.replace(/^echo:\s*/,'');
  // Detect end
  if(s.startsWith('ok') || mf_mesh.buffer.length > 100){
    mf_mesh.capturing=false;
    mf_renderMesh();
    return;
  }
  mf_mesh.buffer.push(s);
  // Try to parse mesh row: numbers separated by spaces/tabs
  var nums=s.match(/-?\d+(?:\.\d+)?/g);
  if(nums && nums.length>=3){
    mf_mesh.grid.push(nums.map(Number));
  }
  // Update raw display
  var el=document.getElementById('mf_heightmap_data');
  if(el) el.textContent=mf_mesh.buffer.join('\n');
}

function mf_renderMesh(){
  if(mf_mesh.grid.length===0) return;
  var container=document.querySelector('#mf-page-heightmap .mf-placeholder-card');
  if(!container) return;
  var cols=mf_mesh.grid.reduce(function(min,row){
    return row.length>=3 ? Math.min(min,row.length) : min;
  },9999);
  if(cols===9999 || cols<3) return;
  var grid=mf_mesh.grid.filter(function(row){return row.length>=cols}).map(function(row){return row.slice(0,cols)});
  var rows=grid.length;
  // Find min/max
  var mn=Infinity,mx=-Infinity;
  for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
    if(grid[r][c]<mn) mn=grid[r][c];
    if(grid[r][c]>mx) mx=grid[r][c];
  }
  if(!isFinite(mn) || !isFinite(mx)) return;
  var range=mx-mn||0.01;
  // Build heatmap
  var cellW=Math.max(28,Math.min(60,Math.floor(320/cols)));
  var cellH=Math.max(22,Math.min(60,Math.floor(240/rows)));
  var h='<div class="mf-mesh-info">Mesh: '+cols+'×'+rows+' | Range: '+mn.toFixed(3)+' ~ '+mx.toFixed(3)+' mm | Δ '+(range).toFixed(3)+' mm</div>';
  h+='<div class="mf-mesh-grid" style="display:inline-grid;grid-template-columns:repeat('+cols+','+cellW+'px);gap:2px">';
  for(var r=0;r<rows;r++){
    for(var c=0;c<cols;c++){
      var v=grid[r][c];
      var t=(v-mn)/range; // 0..1
      // Color: blue(low) → green(mid) → red(high)
      var cr,cg,cb;
      if(t<0.5){cr=Math.round(60*(1-t*2));cg=Math.round(80+170*t*2);cb=Math.round(220*(1-t*2));}
      else{var t2=(t-0.5)*2;cr=Math.round(60+195*t2);cg=Math.round(250-170*t2);cb=Math.round(20);}
      h+='<div class="mf-mesh-cell" style="width:'+cellW+'px;height:'+cellH+'px;background:rgb('+cr+','+cg+','+cb+')" title="['+r+','+c+'] '+v.toFixed(3)+' mm">'+v.toFixed(2)+'</div>';
    }
  }
  h+='</div>';
  h+='<div id="heightmap_data" class="mf-raw-output" style="display:block;margin-top:12px;max-height:150px">'+mf_escapeHtml(mf_mesh.buffer.join('\n'))+'</div>';
  h+='<div style="margin-top:8px"><button class="btn btn-default mf-ph-btn" onclick="mf_mesh.grid=[];mf_startMeshCapture();mf_sendCommand(\'M420 V\')">Re-read Mesh</button></div>';
  container.innerHTML=h;
}

/* ═══════════════════════════════════════════
   Print History Logger
   ═══════════════════════════════════════════ */
var mf_history = {
  log: [],
  currentPrint: null,
  maxEntries: 50
};

function mf_logPrintStart(filename){
  mf_history.currentPrint={
    file: filename,
    start: new Date().toISOString(),
    status: 'printing'
  };
  mf_updateHistoryUI();
}

function mf_logPrintEnd(status){
  if(!mf_history.currentPrint) return;
  mf_history.currentPrint.end=new Date().toISOString();
  mf_history.currentPrint.status=status||'complete';
  // Calculate duration
  var s=new Date(mf_history.currentPrint.start);
  var e=new Date(mf_history.currentPrint.end);
  var dur=Math.round((e-s)/1000);
  var hh=Math.floor(dur/3600),mm=Math.floor((dur%3600)/60),ss=dur%60;
  mf_history.currentPrint.duration=(hh?hh+'h ':'')+(mm?mm+'m ':'')+(ss+'s');
  mf_history.log.unshift(mf_history.currentPrint);
  if(mf_history.log.length>mf_history.maxEntries) mf_history.log.pop();
  mf_history.currentPrint=null;
  mf_updateHistoryUI();
}

function mf_updateHistoryUI(){
  var el=document.getElementById('history_list');
  if(!el) return;
  if(mf_history.log.length===0 && !mf_history.currentPrint){
    el.innerHTML='<div class="mf-ph-empty">No print history yet. Start a print to begin recording.</div>';
    return;
  }
  var h='<table class="mf-hist-table"><tr><th>File</th><th>Started</th><th>Duration</th><th>Status</th></tr>';
  if(mf_history.currentPrint){
    h+='<tr class="mf-hist-active"><td>'+mf_escapeHtml(mf_history.currentPrint.file)+'</td><td>'+new Date(mf_history.currentPrint.start).toLocaleTimeString()+'</td><td><span class="mf-spinner-sm"></span> printing...</td><td><span class="mf-badge-printing">PRINTING</span></td></tr>';
  }
  for(var i=0;i<mf_history.log.length;i++){
    var e=mf_history.log[i];
    var cls=(e.status==='complete'||e.status==='completed')?'mf-badge-ok':e.status==='cancelled'?'mf-badge-warn':'mf-badge-err';
    var label=(e.status==='complete'||e.status==='completed')?'DONE':e.status==='cancelled'?'CANCELLED':'FAILED';
    h+='<tr><td>'+mf_escapeHtml(e.file)+'</td><td>'+new Date(e.start).toLocaleString()+'</td><td>'+(e.duration||'-')+'</td><td><span class="'+cls+'">'+label+'</span></td></tr>';
  }
  h+='</table>';
  el.innerHTML=h;
}

/* ═══════════════════════════════════════════
   Print Status Dashboard Card
   ═══════════════════════════════════════════ */
var mf_printStatus = {
  active: false,
  file: '',
  progress: 0
};

function mf_updatePrintStatusCard(update){
  if(update){
    if(typeof update.progress==='number') mf_printStatus.progress=update.progress;
    if(update.file) mf_printStatus.file=update.file;
    mf_printStatus.active=true;
  }
  var card=document.getElementById('mf-print-status-card');
  if(!card) return;
  if(!mf_printStatus.active){
    card.style.display='none';
    return;
  }
  card.style.display='block';
  var pct=Math.max(0,Math.min(100,parseFloat(mf_printStatus.progress)||0));
  card.innerHTML=
    '<div class="mf-ps-header"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--mf-primary)"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg> Printing</div>'+
    '<div class="mf-ps-file">'+mf_escapeHtml(mf_printStatus.file)+'</div>'+
    '<div class="mf-ps-bar-bg"><div class="mf-ps-bar" style="width:'+pct+'%"></div></div>'+
    '<div class="mf-ps-pct">'+pct.toFixed(1)+'%</div>';
}

/* ═══════════════════════════════════════════
   Console Interceptor — hooks into original JS
   Wraps Monitor_output_Update to capture data
   for EEPROM, Heightmap, and History
   WITHOUT modifying original functions.
   ═══════════════════════════════════════════ */
(function(){
  // Wait for original JS to be ready
  var _hookInstalled=false;
  function installHooks(){
    if(_hookInstalled) return;
    _hookInstalled=true;
    if(typeof mf_setupHooks==='function') mf_setupHooks();
  }

  // Line interceptor
  window.mf_interceptLine=function(line){
    mf_handleConsoleLine(line);
  };

  // Wrap EEPROM button to start capture before sending
  var eepromBtn=document.getElementById('eeprom_read_btn');
  if(eepromBtn){
    var origClick=eepromBtn.getAttribute('onclick');
    eepromBtn.setAttribute('onclick','mf_startEepromCapture();'+origClick);
  }

  // Wrap Heightmap buttons
  document.querySelectorAll('#mf-page-heightmap .mf-ph-btn').forEach(function(btn){
    var origClick=btn.getAttribute('onclick');
    btn.setAttribute('onclick','mf_startMeshCapture();'+origClick);
  });

  // Install hooks after a short delay to ensure original JS is loaded
  if(document.readyState==='complete') installHooks();
  else window.addEventListener('load',function(){setTimeout(installHooks,500);});
})();




/* ═══ State Machine & Cache ═══ */
var mf_state='idle', mf_dirty={}, mf_printFile='';

function mf_setState(s){
  var prev=mf_state; mf_state=s;
  console.log('[MF] State: '+prev+' → '+s);
  mf_updateStatusBadge(s);
  if(s==='idle'&&prev==='printing') mf_flushAll();
}

function mf_updateStatusBadge(mode){
  var b=document.querySelector('.mf-status-badge');
  if(!b) return;
  var map={idle:'Connected',printing:'Printing',paused:'Paused',
           error:'Error',disconnected:'Disconnected',sd_missing:'No SD'};
  b.textContent=map[mode]||mode;
  b.className='mf-status-badge mf-state-'+mode;
}

function mf_cacheWrite(key, data){
  mf_dirty[key]=data;
  console.log('[MF] Cache dirty: '+key);
}

function mf_flushAll(){
  if(mf_state==='printing'){console.log('[MF] Flush blocked: printing');return}
  var keys=Object.keys(mf_dirty);
  if(!keys.length) return;
  console.log('[MF] Flushing '+keys.length+' keys');
  for(var i=0;i<keys.length;i++){
    mf_writeSD(keys[i], mf_dirty[keys[i]]);
  }
  mf_dirty={};
}

function mf_writeSD(key, data){
  if(mf_state==='printing'){console.log('[MF] SD write blocked: printing');return}
  var j=JSON.stringify(data,null,2);
  var b=new Blob([j],{type:'application/json'});
  var path='/webui/';
  if(typeof mf_sdBase==='function') path=mf_sdBase()+'/webui/';
  var fd=new FormData();
  fd.append('path','/webui/');
  fd.append('myfile[]',new File([b],key),'/webui/'+key);
  var x=new XMLHttpRequest();
  x.open('POST','/upload',true);
  x.onreadystatechange=function(){
    if(x.readyState===4) console.log('[MF] SD write '+key+': '+(x.status===200?'ok':'fail'));
  };
  x.send(fd);
}

function mf_interceptLine(line){
  mf_handleConsoleLine(line);
}

function mf_handleConsoleLine(line){
  if(!line) return;
  var s=String(line).trim();
  /* Print progress detection */
  if(s.indexOf('SD printing byte')>=0){
    if(mf_state!=='printing') mf_setState('printing');
    var m=s.match(/byte\s+(\d+)\/(\d+)/);
    if(m){
      var total=parseInt(m[2],10);
      var pct=total>0 ? Math.round(parseInt(m[1],10)/total*100) : 0;
      mf_updatePrintStatusCard({progress:pct,printed:m[1],total:m[2]});
    }
  }
  if(s.indexOf('Done printing file')>=0){
    mf_printStatus.active=false;
    mf_updatePrintStatusCard();
    mf_logPrintEnd('complete');
    mf_setState('idle');
  }
  if(s.indexOf('Print aborted')>=0||s.indexOf('Printer halted')>=0){
    mf_printStatus.active=false;
    mf_updatePrintStatusCard();
    mf_logPrintEnd('failed');
    mf_setState('error');
  }
  /* Detect M503 output start */
  if(s.indexOf('G21')>-1 || s.indexOf('G20')>-1 || s.indexOf('Linear Units')>-1){
    if(!mf_eeprom.capturing) mf_startEepromCapture();
  }
  /* Detect mesh output start */
  if(s.indexOf('Bilinear')>-1 || s.indexOf('Mesh Bed')>-1 || s.indexOf('mesh_')>-1){
    if(!mf_mesh.capturing) mf_startMeshCapture();
  }
  /* EEPROM capture */
  if(mf_eeprom.capturing) mf_parseEepromLine(s);
  /* Mesh capture */
  if(mf_mesh.capturing) mf_parseMeshLine(s);
}

function mf_startPolling(){
  /* Polling is handled by original ESP3D JS (tempInterval, posInterval, statusInterval) */
  /* This function adjusts intervals based on state */
  var cfg=window.mf_config||{};
  var poll=cfg.polling||{temperature:2,position:3,status:3};
  if(mf_state==='printing'){
    /* More frequent during print */
    poll={temperature:1,position:1,status:2};
  }
  console.log('[MF] Polling: temp='+poll.temperature+'s pos='+poll.position+'s status='+poll.status+'s');
}

function mf_setupHooks(){
  if(window.mf_hooksInstalled) return;
  window.mf_hooksInstalled=true;
  /* Hook into ESP3D's Monitor_output_Update for console interception */
  if(typeof Monitor_output_Update==='function'){
    var _orig=Monitor_output_Update;
    Monitor_output_Update=function(msg){
      _orig.apply(this,arguments);
      try{
        String(msg || '').split('\n').forEach(function(line){mf_interceptLine(line)});
      }catch(e){}
    };
    console.log('[MF] Hook: Monitor_output_Update ✓');
  }
  /* Hook into files_print_start for print tracking */
  if(typeof files_print==='function'){
    var _origPrint=files_print;
    files_print=function(){
      var fn=document.getElementById('files_print_filename');
      var name=fn?(fn.textContent||fn.innerText||'unknown'):'unknown';
      mf_printStatus.active=true;
      mf_printStatus.file=name;
      mf_printStatus.progress=0;
      mf_updatePrintStatusCard();
      mf_logPrintStart(name);
      _origPrint.apply(this,arguments);
      mf_setState('printing');
    };
    console.log('[MF] Hook: files_print ✓');
  }
  /* Hook into files_progress for UI progress updates */
  if(typeof files_progress==='function'){
    var _origProgress=files_progress;
    files_progress=function(){
      _origProgress.apply(this,arguments);
      try{
        var prgEl=document.getElementById('files_prg');
        if(prgEl){
          mf_printStatus.progress=parseFloat(prgEl.value)||0;
          mf_updatePrintStatusCard();
          if(mf_printStatus.progress>=100){
            mf_printStatus.active=false;
            mf_updatePrintStatusCard();
            mf_logPrintEnd('complete');
            mf_setState('idle');
          }
        }
      }catch(e){}
    };
    console.log('[MF] Hook: files_progress ✓');
  }
  /* startSocket safety */
  if(typeof startSocket==='function'){
    var _origSock=startSocket;
    startSocket=function(){
      try{_origSock.apply(this,arguments)}catch(e){console.warn('[MF] startSocket error:',e)}
    };
  }
  /* beep safety */
  if(typeof beep==='function'){
    var _origBeep=beep;
    beep=function(){
      try{_origBeep.apply(this,arguments)}catch(e){}
    };
  }
  /* beforeunload flush */
  window.addEventListener('beforeunload',function(){mf_flushAll()});
  
  mf_startPolling();
  console.log('[MF] All hooks set up ✓');
}

/* Auto-setup hooks when SD JS loads */
if(document.readyState==='complete') mf_setupHooks();
else window.addEventListener('load',function(){setTimeout(mf_setupHooks,500)});

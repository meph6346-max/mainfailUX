/* Mainfail OS v3.0 — G-Code Viewer Module */
/* SD: /webui/js/gcode-viewer.js (loaded on demand) */

/* ═══════════════════════════════════════════
   G-Code Viewer — 2D Canvas Renderer
   ═══════════════════════════════════════════ */
var mf_gv = {
  lines: [], layers: [], maxLayer: 0, currentLayer: -1,
  bounds: {xMin:9999,xMax:-9999,yMin:9999,yMax:-9999,zMin:9999,zMax:-9999},
  pan: {x:0,y:0}, zoom: 1, dragging: false, lastMouse: {x:0,y:0}
};

function mf_gvEl(id){return document.getElementById(id)}
function mf_gvSetText(id,value){var el=mf_gvEl(id);if(el) el.textContent=value}
function mf_gvSetValue(id,prop,value){var el=mf_gvEl(id);if(el) el[prop]=value}
function mf_gvReadNumber(line,key){
  var m=line.match(new RegExp('(?:^|\\s)'+key+'(-?\\d+(?:\\.\\d+)?)','i'));
  return m ? parseFloat(m[1]) : null;
}

function mf_gvLoadFile(input){
  if(!input.files||!input.files[0]) return;
  var reader=new FileReader();
  reader.onload=function(e){
    mf_gvSetValue('mf_gv_text','value',e.target.result.substring(0,500000));
    mf_gvParse(e.target.result);
  };
  reader.readAsText(input.files[0]);
  input.value='';
}

function mf_gvParseText(){
  var el=mf_gvEl('mf_gv_text');
  var txt=el ? el.value : '';
  if(txt.trim()) mf_gvParse(txt);
}

function mf_gvLoadFromConsole(){
  if(typeof Monitor_output!=='undefined' && Monitor_output.length>0){
    var gcode=Monitor_output.filter(function(l){return l.match&&l.match(/^[GM]\d/);}).join('\n');
    if(gcode){mf_gvSetValue('mf_gv_text','value',gcode);mf_gvParse(gcode);}
    else alert('No G-code found in console output.');
  } else alert('Console is empty.');
}

function mf_gvParse(text){
  var lines=text.split('\n');
  var x=0,y=0,z=0,e=0,f=1000,lastZ=0;
  var layers=[[]];
  var b={xMin:Infinity,xMax:-Infinity,yMin:Infinity,yMax:-Infinity};
  var totalDist=0;
  var moveCount=0;

  for(var i=0;i<lines.length;i++){
    var L=lines[i].trim().split(';')[0];
    if(!L) continue;
    var cmd=L.match(/^(G[012])/i);
    if(!cmd) continue;
    var c=cmd[1].toUpperCase();
    var nx=x,ny=y,nz=z,ne=e,nf=f;
    var v;
    if((v=mf_gvReadNumber(L,'X'))!==null) nx=v;
    if((v=mf_gvReadNumber(L,'Y'))!==null) ny=v;
    if((v=mf_gvReadNumber(L,'Z'))!==null) nz=v;
    if((v=mf_gvReadNumber(L,'E'))!==null) ne=v;
    if((v=mf_gvReadNumber(L,'F'))!==null) nf=v;

    if(nz!==z && nz>z){
      layers.push([]);
      lastZ=nz;
    }

    var extrude=(ne>e);
    var move={x1:x,y1:y,x2:nx,y2:ny,z:nz,extrude:extrude,rapid:(c==='G0')};
    if(c==='G1'||c==='G0'){
      layers[layers.length-1].push(move);
      if(nx<b.xMin) b.xMin=nx; if(nx>b.xMax) b.xMax=nx;
      if(ny<b.yMin) b.yMin=ny; if(ny>b.yMax) b.yMax=ny;
      var dx=nx-x,dy=ny-y;
      totalDist+=Math.sqrt(dx*dx+dy*dy);
      moveCount++;
    }
    x=nx;y=ny;z=nz;e=ne;f=nf;
  }

  if(moveCount===0 || !isFinite(b.xMin) || !isFinite(b.yMin)){
    b={xMin:0,xMax:1,yMin:0,yMax:1};
    layers=[[]];
  }

  mf_gv.layers=layers;
  mf_gv.maxLayer=layers.length-1;
  mf_gv.bounds=b;
  mf_gv.currentLayer=-1;
  mf_gv.pan={x:0,y:0};
  mf_gv.zoom=1;

  mf_gvSetValue('mf_gv_layer','max',mf_gv.maxLayer);
  mf_gvSetValue('mf_gv_layer','value',mf_gv.maxLayer);
  mf_gvSetText('mf_gv_layer_num','All');
  mf_gvSetText('mf_gv_lines',lines.length.toLocaleString());
  mf_gvSetText('mf_gv_layers',layers.length);
  var w=(b.xMax-b.xMin).toFixed(1), h=(b.yMax-b.yMin).toFixed(1);
  mf_gvSetText('mf_gv_bounds',w+' x '+h+'mm');
  var estMin=Math.round(totalDist/60/60);
  mf_gvSetText('mf_gv_time',estMin>0?(estMin+'m'):'<1m');

  mf_gvRender();
}

function mf_gvSetLayer(v){
  var n=parseInt(v);
  if(n>=mf_gv.maxLayer){
    mf_gv.currentLayer=-1;
    mf_gvSetText('mf_gv_layer_num','All');
  } else {
    mf_gv.currentLayer=n;
    mf_gvSetText('mf_gv_layer_num',n+'/'+mf_gv.maxLayer);
  }
  mf_gvRender();
}

function mf_gvReset(){
  mf_gv.pan={x:0,y:0};mf_gv.zoom=1;
  mf_gvRender();
}

function mf_gvRender(){
  var canvas=document.getElementById('mf_gv_canvas');
  if(!canvas) return;
  var ctx=canvas.getContext('2d');
  var W=canvas.clientWidth, H=canvas.clientHeight;
  if(!W || !H){W=canvas.width||800;H=canvas.height||600;}
  canvas.width=W*2; canvas.height=H*2;
  ctx.scale(2,2);

  ctx.fillStyle='#0d0d12';
  ctx.fillRect(0,0,W,H);

  if(mf_gv.layers.length===0) return;

  var b=mf_gv.bounds;
  var bw=b.xMax-b.xMin||1, bh=b.yMax-b.yMin||1;
  var margin=30;
  var scale=Math.min((W-margin*2)/bw,(H-margin*2)/bh)*mf_gv.zoom;
  var ox=W/2-(b.xMin+bw/2)*scale+mf_gv.pan.x;
  var oy=H/2+(b.yMin+bh/2)*scale+mf_gv.pan.y;

  // Grid
  ctx.strokeStyle='rgba(255,255,255,.04)';
  ctx.lineWidth=0.5;
  var gridSize=10*scale;
  if(gridSize>5){
    for(var gx=Math.floor(b.xMin/10)*10;gx<=b.xMax;gx+=10){
      var sx=gx*scale+ox;
      ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,H);ctx.stroke();
    }
    for(var gy=Math.floor(b.yMin/10)*10;gy<=b.yMax;gy+=10){
      var sy=-gy*scale+oy;
      ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(W,sy);ctx.stroke();
    }
  }

  // Build bed outline
  ctx.strokeStyle='rgba(255,255,255,.08)';
  ctx.lineWidth=1;
  ctx.strokeRect(b.xMin*scale+ox,-b.yMax*scale+oy,bw*scale,bh*scale);

  // Draw layers
  var startLayer=0, endLayer=mf_gv.layers.length-1;
  if(mf_gv.currentLayer>=0){
    startLayer=mf_gv.currentLayer;
    endLayer=mf_gv.currentLayer;
  }

  for(var li=startLayer;li<=endLayer;li++){
    var layer=mf_gv.layers[li];
    var alpha=(mf_gv.currentLayer<0)? Math.max(0.15, (li/mf_gv.maxLayer)) : 1;

    for(var mi=0;mi<layer.length;mi++){
      var mv=layer[mi];
      var sx1=mv.x1*scale+ox, sy1=-mv.y1*scale+oy;
      var sx2=mv.x2*scale+ox, sy2=-mv.y2*scale+oy;

      if(mv.rapid){
        ctx.strokeStyle='rgba(0,180,255,'+alpha*0.3+')';
        ctx.lineWidth=0.3;
      } else if(mv.extrude){
        var hue=30+li/(mf_gv.maxLayer||1)*280;
        ctx.strokeStyle='hsla('+hue+',80%,55%,'+alpha+')';
        ctx.lineWidth=0.8;
      } else {
        ctx.strokeStyle='rgba(100,100,100,'+alpha*0.3+')';
        ctx.lineWidth=0.3;
      }
      ctx.beginPath();
      ctx.moveTo(sx1,sy1);
      ctx.lineTo(sx2,sy2);
      ctx.stroke();
    }
  }

  // Origin marker
  var osx=0*scale+ox, osy=0*scale+oy;
  ctx.fillStyle='rgba(232,113,10,.6)';
  ctx.beginPath();ctx.arc(osx,osy,3,0,Math.PI*2);ctx.fill();
}

// Canvas mouse interaction
(function(){
  var c=document.getElementById('mf_gv_canvas');
  if(!c) return;
  c.addEventListener('mousedown',function(e){mf_gv.dragging=true;mf_gv.lastMouse={x:e.clientX,y:e.clientY};});
  c.addEventListener('mousemove',function(e){
    if(!mf_gv.dragging) return;
    mf_gv.pan.x+=e.clientX-mf_gv.lastMouse.x;
    mf_gv.pan.y+=e.clientY-mf_gv.lastMouse.y;
    mf_gv.lastMouse={x:e.clientX,y:e.clientY};
    mf_gvRender();
  });
  c.addEventListener('mouseup',function(){mf_gv.dragging=false;});
  c.addEventListener('mouseleave',function(){mf_gv.dragging=false;});
  c.addEventListener('wheel',function(e){
    e.preventDefault();
    var d=e.deltaY>0?0.9:1.1;
    mf_gv.zoom*=d;
    mf_gv.zoom=Math.max(0.1,Math.min(50,mf_gv.zoom));
    mf_gvRender();
  },{passive:false});
  // Touch support
  var lastDist=0;
  c.addEventListener('touchstart',function(e){
    if(e.touches.length===1){mf_gv.dragging=true;mf_gv.lastMouse={x:e.touches[0].clientX,y:e.touches[0].clientY};}
    if(e.touches.length===2){var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;lastDist=Math.sqrt(dx*dx+dy*dy);}
  });
  c.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(e.touches.length===1&&mf_gv.dragging){
      mf_gv.pan.x+=e.touches[0].clientX-mf_gv.lastMouse.x;
      mf_gv.pan.y+=e.touches[0].clientY-mf_gv.lastMouse.y;
      mf_gv.lastMouse={x:e.touches[0].clientX,y:e.touches[0].clientY};
      mf_gvRender();
    }
    if(e.touches.length===2){
      var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(lastDist>0){mf_gv.zoom*=dist/lastDist;mf_gv.zoom=Math.max(0.1,Math.min(50,mf_gv.zoom));mf_gvRender();}
      lastDist=dist;
    }
  },{passive:false});
  c.addEventListener('touchend',function(){mf_gv.dragging=false;lastDist=0;});
})();

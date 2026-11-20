import './style.css';
import {AstraRenderer,MeshFactory,parseOBJ} from './engine.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],uid=()=>crypto.randomUUID();
const state={objects:[],selected:null,mode:'visual',grid:true,playing:false,time:0,duration:10,keys:{},camera:{target:[0,0,0],yaw:.65,pitch:.38,distance:7,fov:52}};
const hex=s=>s.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255),color=i=>['#63b7ed','#6ed6b0','#d89cf3','#f2b66d','#e9829a'][i%5];
function add(type,name){let o={id:uid(),name:name||type[0].toUpperCase()+type.slice(1),type,mesh:MeshFactory[type](),position:[(state.objects.length%3-1)*1.8,0,0],rotation:[0,0,0],scale:[1,1,1],color:hex(color(state.objects.length))};state.objects.push(o);state.selected=o.id;sync();}
function error(e){$('#toast').textContent=e.message||String(e);$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function sync(){let list=$('#object-list');list.innerHTML=state.objects.map(o=>`<button class="object-row ${o.id===state.selected?'active':''}" data-id="${o.id}"><i style="background:#${o.color.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}"></i><span>${o.name}</span><small>${o.type}</small></button>`).join('')||'<p class="empty">No objects yet. Add a primitive to begin.</p>';$$('[data-id]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.id;sync();});inspector();$('#object-count').textContent=state.objects.length;$('#timeline-label').textContent=state.objects.find(o=>o.id===state.selected)?.name||'No selection';renderKeys();}
function inspector(){let o=state.objects.find(x=>x.id===state.selected),box=$('#inspector');if(!o){box.innerHTML='<p class="empty">Select an object to inspect its properties.</p>';return;}box.innerHTML=`<div class="field-head"><strong>${o.name}</strong><span>${o.type.toUpperCase()}</span></div><label>Name<input id="obj-name" value="${o.name}"></label><label>Base color<input id="obj-color" type="color" value="#${o.color.map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}"></label>${['position','rotation','scale'].map(k=>`<fieldset><legend>${k}</legend><div class="triple">${['X','Y','Z'].map((a,i)=>`<label>${a}<input type="number" step="${k==='rotation'?'.05':'.1'}" data-prop="${k}" data-i="${i}" value="${o[k][i].toFixed(2)}"></label>`).join('')}</div></fieldset>`).join('')}<button id="delete-object" class="danger">Delete object</button>`;$ ('#obj-name').oninput=e=>{o.name=e.target.value;let b=$('[data-id="'+o.id+'"] span');if(b)b.textContent=o.name;};$('#obj-color').oninput=e=>{o.color=hex(e.target.value);};$$('[data-prop]').forEach(el=>el.onchange=()=>o[el.dataset.prop][+el.dataset.i]=+el.value);$('#delete-object').onclick=()=>{state.objects=state.objects.filter(x=>x.id!==o.id);delete state.keys[o.id];state.selected=state.objects[0]?.id||null;sync();};}
function setMode(m){state.mode=m;$$('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));$('#visual-panel').hidden=m!=='visual';$('#code-panel').hidden=m!=='code';}
function sampleCode(){return `// ASTRA3D Scene Script. Use one command per line.
ASTRA3D.clear();
ASTRA3D.cube({ "name": "Body", "position": [0, 0, 0], "scale": [1, 1.5, 0.6], "color": "#5599cc" });
ASTRA3D.sphere({ "name": "Head", "position": [0, 1.65, 0], "scale": [0.65, 0.65, 0.65], "color": "#e8bd91" });
ASTRA3D.cylinder({ "name": "Neck", "position": [0, 1.05, 0], "scale": [0.28, 0.35, 0.28], "color": "#d2a47a" });
ASTRA3D.sphere({ "name": "Left shoulder", "position": [-0.82, 0.55, 0], "scale": [0.32, 0.32, 0.32], "color": "#5599cc" });
ASTRA3D.sphere({ "name": "Right shoulder", "position": [0.82, 0.55, 0], "scale": [0.32, 0.32, 0.32], "color": "#5599cc" });`;}
function runCode(){let next=[];for(let raw of $('#code-editor').value.split(/\r?\n/)){let line=raw.replace(/\/\/.*$/,'').trim();if(!line||line==='ASTRA3D.clear();')continue;let m=line.match(/^ASTRA3D\.(cube|sphere|cylinder|torus|plane)\s*\((\{.*\})\)\s*;?$/);if(!m)throw Error('Unsupported command: '+line);let c=JSON.parse(m[2]);let mesh=MeshFactory[m[1]]();next.push({id:uid(),name:c.name||m[1],type:m[1],mesh,position:c.position||[0,0,0],rotation:c.rotation||[0,0,0],scale:c.scale||[1,1,1],color:hex(c.color||'#63b7ed')});}if(!next.length)throw Error('No supported ASTRA3D geometry commands were found.');state.objects=next;state.selected=next[0].id;state.keys={};sync();setMode('visual');}
function save(blob,name){let a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function exportScene(){save(new Blob([JSON.stringify({format:'ASTRA3D Scene',version:1,objects:state.objects.map(({id,name,type,position,rotation,scale,color,mesh})=>({id,name,type,position,rotation,scale,color,mesh}))},null,2)],{type:'application/json'}),'astra-scene.astra.json');}
function importScene(file){let r=new FileReader();r.onload=()=>{try{let d=JSON.parse(r.result);if(d.format!=='ASTRA3D Scene'||!Array.isArray(d.objects))throw Error('Not a supported ASTRA3D scene.');state.objects=d.objects.map(o=>({...o,id:uid()}));state.selected=state.objects[0]?.id||null;sync();}catch(e){error(e);}};r.readAsText(file);}
function importOBJ(file){let r=new FileReader();r.onload=()=>{try{let mesh=parseOBJ(r.result),o={id:uid(),name:file.name.replace(/\.obj$/i,''),type:'Imported OBJ',mesh,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:[.45,.68,.9]};state.objects.push(o);state.selected=o.id;sync();}catch(e){error(e);}};r.readAsText(file);}
function addKey(){let o=state.objects.find(x=>x.id===state.selected);if(!o)return error(Error('Select an object first.'));let t=+state.time.toFixed(2);state.keys[o.id]??=[];state.keys[o.id]=state.keys[o.id].filter(k=>k.time!==t);state.keys[o.id].push({time:t,position:[...o.position],rotation:[...o.rotation],scale:[...o.scale]});state.keys[o.id].sort((a,b)=>a.time-b.time);renderKeys();$('#key-status').textContent='Keyframe saved at '+t.toFixed(2)+' seconds';}
function renderKeys(){let keys=state.keys[state.selected]||[];$('#keyframes').innerHTML=keys.map(k=>`<button class="key" style="left:${k.time/state.duration*100}%" data-time="${k.time}" title="${k.time}s"></button>`).join('');$$('[data-time]').forEach(b=>b.onclick=()=>{state.time=+b.dataset.time;$('#scrubber').value=state.time;applyKeys();});}
function applyKeys(){for(let o of state.objects){let ks=state.keys[o.id]||[];if(!ks.length)continue;let a=ks[0],b=ks.at(-1);for(let i=0;i<ks.length-1;i++)if(state.time>=ks[i].time&&state.time<=ks[i+1].time){a=ks[i];b=ks[i+1];break;}let t=b.time===a.time?0:Math.max(0,Math.min(1,(state.time-a.time)/(b.time-a.time)));for(let k of ['position','rotation','scale'])o[k]=a[k].map((v,i)=>v+(b[k][i]-v)*t);}}
$('#app').innerHTML=`<header class="top"><a class="brand"><b>A</b> ASTRA<span>3D</span></a><div class="project-name">UNTITLED PROJECT <i>● LOCAL</i></div><div class="top-actions"><button id="open-scene">Open scene</button><button id="export-scene" class="primary">Export scene</button></div></header><nav class="workspace-tabs"><span class="workspace-caption">WORKSPACE</span><span class="workspace-tab active">Layout</span><span class="workspace-tab">Modeling</span><span class="workspace-tab">Sculpting</span><span class="workspace-tab">UV Editing</span><span class="workspace-tab">Shading</span><span class="workspace-tab">Rigging</span><span class="workspace-tab">Animation</span><span class="workspace-tab">Rendering</span><span class="workspace-tab">Scripting</span><span class="workspace-spacer"></span><span class="version-label">ASTRA ENGINE · EARLY ACCESS</span></nav><div class="workspace"><aside class="left"><div class="panel-title">CREATE</div><div class="mode-switch"><button data-mode="visual" class="active">Visual Studio</button><button data-mode="code">Code Studio</button></div><div id="visual-panel"><div class="section-label">ADD GEOMETRY</div><div class="primitive-grid">${['cube','sphere','cylinder','torus','plane'].map(x=>`<button data-add="${x}"><b>${({cube:'◇',sphere:'◉',cylinder:'▤',torus:'◎',plane:'▱'})[x]}</b>${x}</button>`).join('')}</div><div class="section-label">SCENE HIERARCHY</div><div id="object-list"></div><div class="left-bottom"><button id="import-obj">Import OBJ mesh</button><p>Wavefront .OBJ geometry import</p></div></div><div id="code-panel" hidden><div class="section-label">ASTRA3D SCRIPT</div><textarea id="code-editor" spellcheck="false"></textarea><button id="run-code" class="primary full">▶ Build scene from code</button><p class="hint">Restricted ASTRA3D commands; uploaded code is never executed as arbitrary JavaScript.</p></div></aside><main class="center"><div class="viewport-toolbar"><span>3D VIEWPORT <i>· PERSPECTIVE</i></span><div><button id="toggle-grid" class="active">Grid</button><button id="focus-view">Focus view</button></div></div><canvas id="viewport"></canvas><div class="viewport-help">DRAG TO ORBIT · SCROLL TO ZOOM · SELECT OBJECT IN HIERARCHY</div><section class="timeline"><div class="timeline-head"><strong>ANIMATION TIMELINE</strong><div><button id="add-key">◆ Keyframe</button><button id="play">▶ Play</button><button id="stop">■ Stop</button></div></div><div class="timebar"><span>0s</span><input id="scrubber" type="range" min="0" max="10" step=".01" value="0"><span>10s</span><output id="time-readout">0.00s</output></div><div class="track"><span id="timeline-label">No selection</span><div id="keyframes"></div></div><div id="key-status" class="key-status">Add keyframes to animate selected objects.</div></section></main><aside class="right"><div class="panel-title">PROPERTIES</div><div id="inspector"><p class="empty">Select an object.</p></div><div class="section-label">PROJECT</div><div class="project-meta"><span>Engine <b>ASTRA3D</b></span><span>Renderer <b>Custom WebGL 2</b></span><span>Objects <b id="object-count">0</b></span></div></aside></div><footer class="status-bar"><span>ASTRA3D STUDIO</span><span>SCENE: UNTITLED</span><span>LOCAL SESSION</span><span class="status-spacer"></span><span>WEBGL 2 VIEWPORT</span><span>METRIC · METERS</span></footer><div id="toast"></div><input id="obj-file" type="file" accept=".obj" hidden><input id="scene-file" type="file" accept=".json" hidden>`;
let renderer;try{renderer=new AstraRenderer($('#viewport'));}catch(e){error(e);}
$('#code-editor').value=sampleCode();sync();setMode('visual');
$$('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));$$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$('#run-code').onclick=()=>{try{runCode();}catch(e){error(e);}};
$('#export-scene').onclick=exportScene;$('#open-scene').onclick=()=>$('#scene-file').click();$('#scene-file').onchange=e=>e.target.files[0]&&importScene(e.target.files[0]);$('#import-obj').onclick=()=>$('#obj-file').click();$('#obj-file').onchange=e=>e.target.files[0]&&importOBJ(e.target.files[0]);
$('#toggle-grid').onclick=()=>{state.grid=!state.grid;$('#toggle-grid').classList.toggle('active',state.grid);};$('#focus-view').onclick=()=>{state.camera.target=[0,0,0];state.camera.distance=7;};
$('#add-key').onclick=addKey;$('#scrubber').oninput=e=>{state.time=+e.target.value;applyKeys();$('#time-readout').textContent=state.time.toFixed(2)+'s';};$('#play').onclick=()=>state.playing=true;$('#stop').onclick=()=>{state.playing=false;state.time=0;$('#scrubber').value=0;applyKeys();};
let drag=false,px=0,py=0,canvas=$('#viewport');canvas.onpointerdown=e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;state.camera.yaw-=(e.clientX-px)*.008;state.camera.pitch=Math.max(-1.45,Math.min(1.45,state.camera.pitch+(e.clientY-py)*.008));px=e.clientX;py=e.clientY;};canvas.onpointerup=()=>drag=false;canvas.onpointercancel=()=>drag=false;canvas.onwheel=e=>{e.preventDefault();state.camera.distance=Math.max(1.5,Math.min(50,state.camera.distance+Math.sign(e.deltaY)*.35));};
let last=performance.now();function frame(now){let dt=Math.min(.05,(now-last)/1000);last=now;if(state.playing){state.time+=dt;if(state.time>state.duration)state.time=0;$('#scrubber').value=state.time;$('#time-readout').textContent=state.time.toFixed(2)+'s';applyKeys();}renderer?.render(state.objects,state.camera,state.selected,state.grid);$('#object-count').textContent=state.objects.length;requestAnimationFrame(frame);}requestAnimationFrame(frame);


// Cross-device controls: compact tablets and phones use a focused viewport
// with accessible bottom-dock panels instead of squeezing desktop sidebars.
const workspace = $('.workspace');
const mobileDock = document.createElement('nav');
mobileDock.className = 'mobile-dock';
mobileDock.setAttribute('aria-label', 'Editor panels');
mobileDock.innerHTML = [
  ['scene', '▦', 'Scene'],
  ['view', '◇', 'Viewport'],
  ['inspector', '☷', 'Inspect'],
  ['timeline', '◷', 'Timeline'],
].map(([id, glyph, label]) =>
  `<button type="button" data-mobile-panel="${id}" aria-label="${label}" aria-pressed="${id === 'view' ? 'true' : 'false'}"><span>${glyph}</span><small>${label}</small></button>`
).join('');
workspace.append(mobileDock);

function setMobilePanel(panel) {
  workspace.classList.remove('mobile-panel-scene', 'mobile-panel-inspector', 'mobile-panel-timeline');
  if (panel && panel !== 'view') workspace.classList.add('mobile-panel-' + panel);
  mobileDock.querySelectorAll('[data-mobile-panel]').forEach(button => {
    const active = button.dataset.mobilePanel === (panel || 'view');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
mobileDock.querySelectorAll('[data-mobile-panel]').forEach(button => {
  button.addEventListener('click', () => setMobilePanel(button.dataset.mobilePanel));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMobilePanel('view');
});
document.addEventListener('click', event => {
  if (event.target.closest('[data-add], #run-code, #delete-object')) {
    if (window.matchMedia('(max-width: 900px)').matches) setMobilePanel('view');
  }
});
$('#obj-file').addEventListener('change', () => {
  if (window.matchMedia('(max-width: 900px)').matches) setMobilePanel('view');
});

// Installable browser app. Core editing remains available without an account.
const installButton = document.createElement('button');
installButton.id = 'install-app';
installButton.type = 'button';
installButton.textContent = 'Install app';
installButton.hidden = true;
$('.top-actions').prepend(installButton);
let installPrompt = null;
const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
if (isIOSDevice && !window.matchMedia('(display-mode: standalone)').matches) {
  installButton.hidden = false;
  installButton.textContent = 'Install';
}
installButton.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  } else if (isIOSDevice) {
    error(new Error('On iPhone or iPad: open the browser Share menu, then choose “Add to Home Screen”.'));
  }
});
window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installPrompt = null;
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is progressive enhancement; editing still works online.
    });
  }, { once: true });
}

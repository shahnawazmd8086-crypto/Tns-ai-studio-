/* TNS Studio Pro Mobile Editor
   Original TNS UI using a familiar touch-first editor workflow.
   No external libraries. Uses the existing authenticated upload/timeline export APIs.
*/
(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (n,a,b) => Math.min(b, Math.max(a,n));
  const fmt = n => { n=Math.max(0,Number(n)||0); const m=Math.floor(n/60),s=Math.floor(n%60); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
  const toast = msg => { const t=$('#toast'); if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);} };
  const json = async (url,opt={}) => { const r=await fetch(url,{credentials:'same-origin',...opt}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||d.message||`Request failed (${r.status})`); return d; };

  const CATEGORIES = {
    Edit:['Trim','Split','Delete Left','Delete Right','Delete','Duplicate','Merge','Freeze','Reverse','Speed','Speed Curve','Crop','Resize','Rotate','Flip','Pan & Zoom','Keyframes','Marker'],
    Audio:['Music','SFX','Extract Audio','Voice Over','Record Voice Over','TTS','Volume','Fade','Normalize','Noise Cleanup','Voice Enhance','Mute'],
    Text:['Text','Captions','Auto Captions','Subtitles','Text Animation','Stickers','Shapes'],
    Overlay:['Add Overlay','Photo Overlay','Video Overlay','Opacity','Blend','Shadow','Mask'],
    Effects:['Effects','Transitions','Blur','Glitch','Glow','Film Grain','Vignette','Lens','Light Leak'],
    Filters:['Filters','Vintage','B&W','Warm','Cool','Cinematic','Retro'],
    Adjust:['Brightness','Contrast','Saturation','Temperature','Tint','Sharpness','Exposure','Highlights','Shadows','HSL','Curves'],
    AI:['Background Removal','Chroma Key','Stabilization','Silence Removal','Scene Detection','Smart Cut','Beat Sync','Auto Reframe','Motion Tracking','AI Enhance','AI Upscale','Object Removal','Face Blur','AI Voice'],
    More:['Safe Zones','Project Versions','Project Backup','Media Relink','Batch Apply','Export Presets','Markers']
  };

  const CAPCUT_NAV = [
    {key:'Media',label:'Media',icon:'▣',tools:['Import Video','Add Photo']},
    {key:'Edit',label:'Edit',icon:'✂',tools:CATEGORIES.Edit},
    {key:'Audio',label:'Audio',icon:'♫',tools:CATEGORIES.Audio},
    {key:'Text',label:'Text',icon:'T',tools:['Text','Captions','Auto Captions','Subtitles','Import SRT/VTT','Text Animation']},
    {key:'Stickers',label:'Stickers',icon:'☺',tools:['Stickers','Shapes']},
    {key:'Effects',label:'Effects',icon:'✦',tools:CATEGORIES.Effects},
    {key:'Transitions',label:'Transitions',icon:'◐',tools:['Transitions']},
    {key:'Filters',label:'Filters',icon:'◈',tools:CATEGORIES.Filters},
    {key:'Adjust',label:'Adjust',icon:'☼',tools:CATEGORIES.Adjust},
    {key:'Overlay',label:'Overlay',icon:'▧',tools:CATEGORIES.Overlay},
    {key:'Captions',label:'Captions',icon:'CC',tools:['Captions','Auto Captions','Subtitles','Import SRT/VTT']},
    {key:'AI',label:'AI Tools',icon:'✧',tools:CATEGORIES.AI},
    {key:'More',label:'More',icon:'⋯',tools:CATEGORIES.More}
  ];


  const state = {
    clips:[], overlays:[], audio:[], text:[], selected:0, playhead:0, category:'Media', snap:true, zoom:80,
    ratio:'9:16', quality:1080, fps:30, history:[], future:[], projectName:'Untitled Project', dirty:false
  };

  function snapshot(){ return JSON.stringify({clips:state.clips,overlays:state.overlays,audio:state.audio,text:state.text,markers:state.markers||[],ratio:state.ratio,quality:state.quality,fps:state.fps,projectName:state.projectName}); }
  function restore(s){ const x=JSON.parse(s); state.clips=x.clips||[];state.overlays=x.overlays||[];state.audio=x.audio||[];state.text=x.text||[];state.markers=x.markers||[];state.ratio=x.ratio||'9:16';state.quality=x.quality||1080;state.fps=x.fps||30;state.projectName=x.projectName||'Untitled Project'; state.selected=clamp(state.selected,0,Math.max(0,state.clips.length-1)); }
  function commit(){ state.history.push(snapshot()); if(state.history.length>60)state.history.shift(); state.future=[];state.dirty=true; try{localStorage.setItem('tnsStudioProAutosave',snapshot());}catch{} renderAll(); }
  function undo(){ if(state.history.length<=1)return; state.future.push(snapshot()); state.history.pop(); restore(state.history[state.history.length-1]); renderAll(); }
  function redo(){ if(!state.future.length)return; state.history.push(snapshot()); restore(state.future.pop()); renderAll(); }

  function clipDuration(c){ return Math.max(.1,(Number(c.sourceDuration)||Number(c.duration)||1)-(Number(c.trimStart)||0)-(Number(c.trimEnd)||0)); }
  function clipRenderDuration(c){ return clipDuration(c)/Math.max(.1,Number(c.speed)||1); }
  function timelineDuration(){ let t=0; state.clips.forEach(c=>{t=Math.max(t,(Number(c.start)||0)+clipRenderDuration(c));}); return t; }
  function selectedClip(){ return state.clips[state.selected]||null; }

  function replaceEditorMarkup(){
    const el=$('#editor'); if(!el)return;
    el.innerHTML = `
      <div class="tns-pro-editor capcut-inspired-editor">
        <header class="pro-head capcut-topbar">
          <div class="pro-brand"><button class="capcut-back" type="button" title="Back">‹</button><img src="/assets/tns-studio-mark.svg" alt="TNS Studio"><div><b>TNS Studio</b><small id="proProjectName">Untitled Project</small></div></div>
          <div class="capcut-top-center"><span>Video</span><span class="capcut-save-state">Auto saved</span></div>
          <div class="pro-head-actions"><button id="proUndo" title="Undo">↶</button><button id="proRedo" title="Redo">↷</button><button id="proSave" title="Save Project">Save</button><button id="proLoad" title="Load Project">Load</button><button id="proExport" class="pro-export">Export</button></div>
        </header>

        <div class="capcut-body">
          <nav class="pro-categories capcut-sidebar" id="proCategories" aria-label="Editor tools"></nav>

          <main class="pro-workspace capcut-main">
            <div class="pro-media-row capcut-importbar">
              <label class="capcut-import primary-import">＋ Import<input id="proVideoInput" type="file" accept="video/*" multiple></label>
              <label class="capcut-import">＋ Photos<input id="proPhotoInput" type="file" accept="image/*" multiple></label>
              <label class="capcut-import">＋ Audio<input id="proAudioInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm"></label>
              <button class="capcut-import" type="button" id="proMediaLibraryBtn">Media Library</button>
            </div>

            <section class="capcut-stage">
              <div class="pro-preview-wrap" id="proDropZone"><video id="proPreview" playsinline preload="metadata"></video><div id="proCanvasOverlays"></div><div id="proPreviewEmpty"><span>🎬</span><b>Import media to start</b><small>Drag clips to the timeline and start editing</small></div><div id="proPlayOverlay" class="pro-play-overlay">▶</div><div id="proCanvasText"></div></div>
            </section>

            <div class="pro-time capcut-playback"><button id="proPlay">▶</button><span id="proTime">00:00</span><input id="proScrub" type="range" min="0" max="1" value="0" step="0.01"><span id="proTotal">00:00</span></div>

            <div class="pro-context capcut-clip-tools" id="proContext"></div>

            <div class="capcut-timeline-head"><b>Timeline</b><span>Video / Overlay / Text / Audio</span></div>
            <div class="pro-timeline capcut-timeline" id="proTimeline"><div class="pro-empty-timeline">Import a video to build your timeline</div></div>
            <div class="pro-track-labels"><span>VIDEO</span><span>OVERLAY</span><span>TEXT</span><span>AUDIO</span></div>

            <div class="pro-tools capcut-tool-panel" id="proTools"></div>
            <div id="proWorkspace" class="pro-drawer hidden"></div>
          </main>
        </div>
      </div>`;
    if(!state.history.length) state.history=[snapshot()];
    bind(); renderAll();
  }

  async function upload(file, endpoint='/api/uploads/file', field='file'){
    const fd=new FormData(); fd.append(field,file,file.name);
    const d=await json(endpoint,{method:'POST',body:fd}); return d.media;
  }
  async function addVideo(file,type='video'){
    if(!file)return;
    const media=await upload(file,'/api/uploads/file','file');
    const c={id:crypto.randomUUID(),type,source:media.url,name:file.name,sourceDuration:3,duration:3,trimStart:0,trimEnd:0,start:timelineDuration(),speed:1,rotate:0,brightness:0,contrast:1,saturation:1,sharpness:0,volume:1,muted:false,visible:true,flip:'none',scale:1,x:0,y:0,opacity:1,filter:'none',adjustments:{},keyframes:[]};
    state.clips.push(c); state.selected=state.clips.length-1; await probeClip(c); state.category='Edit'; commit(); toast(`${type==='image'?'Photo':'Video'} added.`);
  }
  async function probeClip(c){ return new Promise(resolve=>{ const tag=c.type==='image'?'img':'video'; const v=document.createElement(tag); if(tag==='video')v.preload='metadata'; v.src=c.source; const done=()=>{if(tag==='video')c.sourceDuration=Number.isFinite(v.duration)?v.duration:3; else c.sourceDuration=3;c.duration=c.sourceDuration;resolve();};v.onload=done;v.onloadedmetadata=done;v.onerror=resolve; }); }
  async function probeAudioDuration(url){return new Promise(resolve=>{const a=document.createElement('audio');a.preload='metadata';a.src=url;a.onloadedmetadata=()=>resolve(Number.isFinite(a.duration)?a.duration:10);a.onerror=()=>resolve(10);});}
  function parseSrtVtt(raw){
    const clean=String(raw||'').replace(/^WEBVTT\s*/i,'').replace(/\r/g,'');
    const blocks=clean.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean); const out=[];
    const timeToSec=s=>{const p=String(s).replace(',', '.').split(':').map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];};
    blocks.forEach(block=>{const lines=block.split('\n');const ti=lines.findIndex(x=>x.includes('-->'));if(ti<0)return;const [a,b]=lines[ti].split('-->').map(x=>x.trim().split(/\s+/)[0]);const text=lines.slice(ti+1).join(' ').replace(/<[^>]+>/g,'').trim();if(text){const start=timeToSec(a),end=timeToSec(b);out.push({id:crypto.randomUUID(),text,font:'Arial',fontSize:56,color:'#ffffff',opacity:1,x:40,y:40,start,duration:Math.max(.1,end-start),visible:true});}});
    return out;
  }

  function categoryIcon(n){return (CAPCUT_NAV.find(x=>x.key===n)||{}).icon||'•';}
  function renderCategories(){
    $('#proCategories').innerHTML=CAPCUT_NAV.map(n=>`<button class="pro-cat ${n.key===state.category?'active':''}" data-cat="${esc(n.key)}" title="${esc(n.label)}"><span class="pro-cat-icon">${n.icon}</span><small>${esc(n.label)}</small></button>`).join('');
  }
  function iconFor(n){const m={Trim:'✂',Split:'⌁',Merge:'⊕',Delete:'⌫','Delete Left':'◀','Delete Right':'▶',Duplicate:'⧉',Freeze:'❄',Reverse:'↶',Speed:'⏩',"Speed Curve":'⌁',Crop:'⌗',Resize:'↔',Rotate:'⟳',Flip:'⇋',"Pan & Zoom":'⌕',Keyframes:'◆',Music:'♫',SFX:'🔊',"Extract Audio":'♬',"Voice Over":'🎙',"Record Voice Over":'⏺',TTS:'T',Volume:'🔊',Fade:'◒',Normalize:'≋',"Noise Cleanup":'⌁',"Voice Enhance":'✦',Mute:'🔇',Text:'T',Captions:'CC',"Auto Captions":'CC',Subtitles:'▤',"Text Animation":'A',Stickers:'☺',Shapes:'◇',"Add Overlay":'▣',"Photo Overlay":'▧',"Video Overlay":'▤',Opacity:'◐',Blend:'◒',Shadow:'◒',Mask:'◍',Effects:'✦',Transitions:'◐',Blur:'◌',Glitch:'⌁',Glow:'✧',"Film Grain":'░',Vignette:'◉',Lens:'◎',"Light Leak":'☀',Filters:'◈',Vintage:'V',"B&W":'B',Warm:'☀',Cool:'❄',Cinematic:'C',Retro:'R',Brightness:'☼',Contrast:'◐',Saturation:'S',Temperature:'℃',Tint:'T',Sharpness:'◆',Exposure:'☀',Highlights:'✦',Shadows:'◒',HSL:'HSL',Curves:'∿',"Background Removal":'✂',"Chroma Key":'🟢',Stabilization:'◎',"Silence Removal":'⌁',"Scene Detection":'◫',"Smart Cut":'✦',"Beat Sync":'♫',"Auto Reframe":'↗',"Motion Tracking":'◎',"AI Enhance":'✧',"AI Upscale":'↗',"Object Removal":'⌫',"Face Blur":'◌',"AI Voice":'🎙',"Safe Zones":'□',"Project Versions":'↕',"Project Backup":'☁',"Media Relink":'↻',"Batch Apply":'▦',"Export Presets":'⇧',Markers:'⚑',Marker:'⚑','Import SRT/VTT':'CC'};return m[n]||'•';}
  function renderTools(){
    const nav=CAPCUT_NAV.find(x=>x.key===state.category)||CAPCUT_NAV[0];
    const arr=nav.tools||[];
    $('#proTools').innerHTML=arr.map(n=>{
      if(n==='Import Video') return `<label class="pro-tool pro-tool-action"><span class="pro-tool-icon">＋</span><small>Import</small><input id="capcutImportTool" type="file" accept="video/*" multiple></label>`;
      if(n==='Add Photo') return `<label class="pro-tool pro-tool-action"><span class="pro-tool-icon">▧</span><small>Photos</small><input id="capcutPhotoTool" type="file" accept="image/*" multiple></label>`;
      return `<button class="pro-tool" data-tool="${esc(n)}"><span class="pro-tool-icon">${iconFor(n)}</span><small>${esc(n)}</small></button>`;
    }).join('');
  }
  function renderTimeline(){
    const el=$('#proTimeline');
    if(!state.clips.length){el.innerHTML='<div class="pro-empty-timeline">Import a video to build your timeline</div>';renderContext();return;}
    const total=Math.max(.1,timelineDuration());
    const clips=state.clips.map((c,i)=>{const left=(c.start/total)*100,w=(clipRenderDuration(c)/total)*100;return `<div class="pro-clip-wrap" draggable="true" data-clip="${i}" style="left:${left}%;width:${Math.max(4,w)}%"><button class="pro-clip ${i===state.selected?'selected':''}" data-clip="${i}"><span class="clip-thumb">${c.type==='image'?`<img src="${esc(c.source)}" alt="">`:`<video src="${esc(c.source)}" muted playsinline preload="metadata"></video>`}</span><b>${esc(c.name||'Clip')}</b><small>${fmt(clipRenderDuration(c))}</small><i class="trim-handle left" data-handle="left"></i><i class="trim-handle right" data-handle="right"></i></button></div>`}).join('');
    const audio=state.audio.map((a,i)=>{const left=((a.start||0)/total)*100,w=(Math.max(.1,a.duration||1)/total)*100;return `<div class="pro-audio-item" style="left:${left}%;width:${Math.max(5,w)}%">♫ ${esc(a.name||'Audio')}</div>`}).join('');
    const texts=state.text.map((t,i)=>{const left=((t.start||0)/total)*100,w=(Math.max(.2,t.duration||1)/total)*100;return `<div class="pro-text-item" style="left:${left}%;width:${Math.max(5,w)}%">T ${esc(t.text||'Text')}</div>`}).join('');
    const overlays=state.overlays.map((c,i)=>{const left=((c.start||0)/total)*100,w=(Math.max(.1,c.duration||1)/total)*100;return `<div class="pro-overlay-item" data-overlay="${i}" style="left:${left}%;width:${Math.max(5,w)}%">◫ ${esc(c.name||'Overlay')}</div>`}).join(''); el.innerHTML=`<div class="pro-ruler">${[0,.25,.5,.75,1].map(x=>`<span style="left:${x*100}%">${fmt(total*x)}</span>`).join('')}</div><div class="pro-track pro-video-track">${clips}</div><div class="pro-track pro-overlay-track">${overlays}</div><div class="pro-track pro-text-track">${texts}</div><div class="pro-track pro-audio-track">${audio}</div><div class="pro-playhead" style="left:${clamp(state.playhead/total,0,1)*100}%"></div>`;
    const track=el.querySelector('.pro-video-track');
    track.onclick=e=>{if(e.target.closest('.pro-clip'))return;const r=track.getBoundingClientRect();state.playhead=clamp((e.clientX-r.left)/r.width,0,1)*total;syncPreview();renderTimeline();};
    track.ondragstart=e=>{const w=e.target.closest('.pro-clip-wrap');if(!w)return;e.dataTransfer.setData('text/plain',w.dataset.clip);e.dataTransfer.effectAllowed='move';}; track.ondragover=e=>e.preventDefault(); track.ondrop=e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));const target=e.target.closest('.pro-clip-wrap');const to=target?Number(target.dataset.clip):state.clips.length-1;if(!Number.isInteger(from)||from===to)return;const [m]=state.clips.splice(from,1);state.clips.splice(Math.max(0,to),0,m);state.selected=Math.min(to,state.clips.length-1);reflow();commit();toast('Clip order updated.');};
    $$('.pro-clip',el).forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();state.selected=Number(btn.dataset.clip);syncPreview(false);renderTimeline();openTool('Clip');}));
    $$('.trim-handle',el).forEach(h=>h.addEventListener('pointerdown',e=>startTrimDrag(e,h)));
    $$('.pro-clip-wrap',el).forEach(w=>{w.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',w.dataset.clip));w.addEventListener('dragover',e=>e.preventDefault());w.addEventListener('drop',e=>{e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(w.dataset.clip);if(Number.isInteger(from)&&Number.isInteger(to)&&from!==to){const [m]=state.clips.splice(from,1);state.clips.splice(to,0,m);state.selected=to;reflow();commit();}});});
    renderContext();
  }
  function renderContext(){
    const el=$('#proContext'); if(!el)return;
    const c=selectedClip(); if(!c){el.innerHTML='';return;}
    const tools=['Split','Trim','Speed','Volume','Animation','Crop','Adjust','Duplicate','Delete'];
    el.innerHTML=tools.map(t=>`<button data-context-tool="${t}">${iconFor(t)}<small>${t}</small></button>`).join('');
    $$('[data-context-tool]',el).forEach(b=>b.onclick=()=>openTool(b.dataset.contextTool==='Animation'?'Text Animation':b.dataset.contextTool));
  }

  function startTrimDrag(e,h){
    e.stopPropagation();e.preventDefault();const idx=Number(h.closest('.pro-clip').dataset.clip),c=state.clips[idx],track=$('#proTimeline .pro-video-track'),startX=e.clientX,start=Number(c.trimStart)||0,end=Number(c.trimEnd)||0,source=Number(c.sourceDuration)||3;
    const move=ev=>{const dx=(ev.clientX-startX)/track.getBoundingClientRect().width*timelineDuration()*Math.max(.1,c.speed); if(h.dataset.handle==='left') c.trimStart=clamp(start+dx,0,source-end-.1); else c.trimEnd=clamp(end-dx,0,source-start-.1); renderTimeline();syncPreview(false);};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);commit();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }
  function wireThumbnails(){ $$('#proTimeline .pro-clip video').forEach(v=>v.onloadedmetadata=()=>{try{v.currentTime=Math.min(.12,Math.max(.01,(v.duration||1)/3));}catch{}}); }
  function renderAll(){renderCategories();renderTools();renderTimeline();renderContext();wireThumbnails();$('#proProjectName').textContent=state.projectName+(state.dirty?' •':'');$('#proTotal').textContent=fmt(timelineDuration());}

  function keyframeValue(c,key,time,fallback){
    const k=Array.isArray(c?.keyframes)?c.keyframes.filter(x=>Number.isFinite(Number(x.time))).sort((a,b)=>a.time-b.time):[];
    if(!k.length)return fallback;
    if(time<=k[0].time)return Number(k[0][key]??fallback);
    if(time>=k[k.length-1].time)return Number(k[k.length-1][key]??fallback);
    for(let i=0;i<k.length-1;i++){const a=k[i],b=k[i+1];if(time>=a.time&&time<=b.time){const p=(time-a.time)/Math.max(.0001,b.time-a.time);return Number(a[key]??fallback)+(Number(b[key]??fallback)-Number(a[key]??fallback))*p;}}
    return fallback;
  }
  function syncPreview(autoplay=true){
    const v=$('#proPreview'),c=selectedClip();if(!v)return;
    if(!c){$('#proPreviewEmpty').style.display='flex';v.style.display='none';return;}
    $('#proPreviewEmpty').style.display='none';v.style.display='block';
    if(v.src!==location.origin+c.source && v.src!==c.source){v.src=c.source;}
    const local=clamp(state.playhead-(Number(c.start)||0),0,Math.max(.01,clipRenderDuration(c)));
    const sourceTime=(Number(c.trimStart)||0)+local*(Number(c.speed)||1);
    const seek=()=>{try{v.currentTime=clamp(sourceTime,0,Math.max(.01,(c.sourceDuration||3)-.01));}catch{}};
    if(v.readyState>=1)seek();else v.onloadedmetadata=seek;
    const ktime=Math.max(0,state.playhead-(Number(c.start)||0)); const kx=keyframeValue(c,'x',ktime,Number(c.x||0)); const ky=keyframeValue(c,'y',ktime,Number(c.y||0)); const ks=keyframeValue(c,'scale',ktime,Number(c.scale||1)); const ko=keyframeValue(c,'opacity',ktime,Number(c.opacity??1)); v.style.transform=`translate(${kx}px,${ky}px) rotate(${c.rotate||0}deg) scale(${ks}) ${c.flip==='horizontal'?'scaleX(-1)':''}`; v.style.opacity=String(ko);
    v.style.filter=previewFilter(c);
    $('#proTime').textContent=fmt(state.playhead);
    if(autoplay && !v.paused){v.play().catch(()=>{});} renderCanvasText();
  }
  function previewFilter(c){const b=Number(c.brightness)||0,ct=Number(c.contrast)||1,s=Number(c.saturation)||1,sh=Number(c.sharpness)||0;let f=`brightness(${1+b}) contrast(${ct}) saturate(${s})`;if(c.filter==='grayscale')f+=' grayscale(1)';if(c.filter==='sepia')f+=' sepia(.8)';if(c.filter==='warm')f+=' sepia(.25) saturate(1.15)';if(c.filter==='cool')f+=' hue-rotate(15deg) saturate(.9)';if(c.filter==='blur')f+=` blur(${Math.max(1,sh)}px)`;return f;}
  function renderCanvasText(){
    const c=selectedClip();
    const layer=state.text.find(t=>state.playhead>=t.start&&state.playhead<=t.start+t.duration&&t.visible!==false);
    $('#proCanvasText').innerHTML=layer?`<div style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.fontSize}px;color:${esc(layer.color)};font-family:${esc(layer.font)};opacity:${layer.opacity}">${esc(layer.text)}</div>`:'';
    const ov=state.overlays.find(o=>state.playhead>=Number(o.start||0)&&state.playhead<=Number(o.start||0)+Number(o.duration||3)&&o.visible!==false);
    const wrap=$('#proCanvasOverlays');
    if(wrap){
      wrap.innerHTML=ov?`${ov.type==='video'?`<video src="${esc(ov.source)}" muted autoplay loop playsinline style="left:${Number(ov.x||40)}px;top:${Number(ov.y||40)}px;width:${Math.max(20,160*Number(ov.scale||1))}px;opacity:${Number(ov.opacity??1)}"></video>`:`<img src="${esc(ov.source)}" alt="" style="left:${Number(ov.x||40)}px;top:${Number(ov.y||40)}px;width:${Math.max(20,160*Number(ov.scale||1))}px;opacity:${Number(ov.opacity??1)}">`}`:'';
    }
  }

  function inputField(label,id,value,type='text',attrs=''){return `<label class="pro-field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
  function rangeField(label,id,value,min,max,step='0.01'){return `<label class="pro-range"><span>${label}<b id="${id}Val">${value}</b></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;}
  function openTool(tool){
    const box=$('#proWorkspace'); if(!box)return;
    if(tool==='Clip'){box.classList.add('hidden');return;}
    if(tool==='Export'){
      box.innerHTML=`<div class="drawer-head"><div><b>Export Video</b><small>Choose the final quality before saving.</small></div><button id="closeTool">×</button></div><div class="drawer-body export-sheet"><div class="export-presets"><button data-exp="720">720p</button><button data-exp="1080">1080p</button><button data-exp="1440">1440p</button><button data-exp="2160">4K</button></div><div class="ratio-pills"><button data-ratio="9:16">9:16</button><button data-ratio="16:9">16:9</button><button data-ratio="1:1">1:1</button><button data-ratio="4:5">4:5</button></div><label class="pro-field"><span>Frame Rate</span><select id="exportFps"><option value="24">24 FPS</option><option value="30" selected>30 FPS</option><option value="60">60 FPS</option></select></label><p class="tool-hint">Export uses the complete timeline, text layers and audio tracks. MP4 / H.264 with AAC audio.</p><button class="pro-action primary" id="doExportNow">Export & Download MP4</button></div>`;
      box.classList.remove('hidden');
      $('#closeTool').onclick=()=>box.classList.add('hidden');
      $$('[data-exp]',box).forEach(b=>b.onclick=()=>{state.quality=Number(b.dataset.exp);toast(`${b.dataset.exp}p selected`);});
      $$('[data-ratio]',box).forEach(b=>b.onclick=()=>{state.ratio=b.dataset.ratio;toast(`${b.dataset.ratio} selected`);});
      $('#exportFps').onchange=e=>state.fps=Number(e.target.value);
      $('#doExportNow').onclick=exportProject;
      return;
    }
    const c=selectedClip();
    const noClip=['Music','SFX','Extract Audio','Voice Over','Record Voice Over','TTS','Text','Captions','Auto Captions','Subtitles','Import SRT/VTT','Stickers','Shapes','Effects','Transitions','Filters','Background Removal','Chroma Key','Project Backup','Project Versions','Export Presets','Markers','Add Overlay','Photo Overlay','Video Overlay'];
    if(!c && !noClip.includes(tool)){toast('Add or select a video clip first.');return;}
    const common=`<div class="drawer-head"><div><b>${esc(tool)}</b><small>Make the change, preview it, then Apply.</small></div><button id="closeTool">×</button></div><div class="drawer-body">`;
    let body='';
    if(tool==='Trim') body=`${rangeField('Start', 'toolStart',c.trimStart||0,0,Math.max(.1,c.sourceDuration-.1),.05)}${rangeField('End trim','toolEnd',c.trimEnd||0,0,Math.max(.1,c.sourceDuration-.1),.05)}<div class="tool-hint">Drag the clip handles on the timeline for fast trimming.</div>`;
    else if(tool==='Split') body=`${rangeField('Split at','splitAt',Math.max(.1,state.playhead-(c.start||0)),.05,Math.max(.1,clipDuration(c)),.05)}<button class="pro-action primary" id="applySplit">Split clip</button>`;
    else if(tool==='Delete') body=`<p>Remove the selected clip from the timeline.</p><button class="pro-action danger" id="applyDelete">Delete clip</button>`;
    else if(tool==='Delete Left'||tool==='Delete Right') body=`<p>Split at the playhead, then remove the ${tool==='Delete Left'?'left':'right'} section.</p><button class="pro-action danger" id="applySideDelete">${tool}</button>`;
    else if(tool==='Duplicate') body=`<p>Create an independent duplicate directly after this clip.</p><button class="pro-action primary" id="applyDuplicate">Duplicate</button>`;
    else if(tool==='Merge') body=`<p>Merge all video clips in their current timeline order into one clip.</p><button class="pro-action primary" id="applyMerge">Merge clips</button>`;
    else if(tool==='Freeze') body=`${inputField('Freeze duration (sec)','freezeDur',2,'number','min="0.1" step="0.1"')}<button class="pro-action primary" id="applyFreeze">Add freeze frame</button>`;
    else if(tool==='Reverse') body=`<p>Reverse the selected clip for export.</p><button class="pro-action primary" id="applyReverse">Reverse clip</button>`;
    else if(tool==='Speed'||tool==='Speed Curve') body=`<select id="speedValue"><option>0.25</option><option>0.5</option><option>0.75</option><option selected>1</option><option>1.25</option><option>1.5</option><option>2</option><option>3</option><option>4</option></select><div class="speed-presets">${['0.25','0.5','1','1.5','2','4'].map(x=>`<button data-speed="${x}">${x}×</button>`).join('')}</div><div class="tool-hint">Speed Curve adds the same control to a selected clip; advanced curves can be adjusted by changing multiple key points.</div>`;
    else if(['Crop','Resize'].includes(tool)) body=`<div class="ratio-pills">${['Free','9:16','16:9','1:1','4:5'].map(x=>`<button data-ratio="${x}">${x}</button>`).join('')}</div>${inputField('Width','cropW',1080,'number','min="2"')}${inputField('Height','cropH',1920,'number','min="2"')}${inputField('X position','cropX',c.x||0,'number')}${inputField('Y position','cropY',c.y||0,'number')}<button class="pro-action primary" id="applyCrop">Apply</button>`;
    else if(tool==='Rotate') body=`<div class="four-actions"><button data-rotate="0">0°</button><button data-rotate="90">90°</button><button data-rotate="180">180°</button><button data-rotate="270">270°</button></div><button class="pro-action primary" id="applyTransform">Apply rotation</button>`;
    else if(tool==='Flip') body=`<div class="four-actions"><button data-flip="horizontal">Horizontal</button><button data-flip="vertical">Vertical</button><button data-flip="none">Reset</button></div>`;
    else if(tool==='Pan & Zoom') body=`${rangeField('Zoom','pzScale',c.scale||1,0.5,3,.01)}${inputField('X','pzX',c.x||0,'number')}${inputField('Y','pzY',c.y||0,'number')}<button class="pro-action primary" id="applyPz">Apply</button>`;
    else if(tool==='Keyframes') body=`<div class="keyframe-lane">${[0,.25,.5,.75,1].map((x,i)=>`<button class="kf ${i===0?'active':''}" data-kf="${x}" style="left:${x*100}%">◆</button>`).join('')}</div>${rangeField('Scale','kfScale',c.scale||1,.5,3,.01)}${rangeField('Opacity','kfOpacity',1,0,1,.01)}<div class="tool-hint">Tap a diamond, move the playhead, change values. Keyframes are stored in the project timeline.</div><button class="pro-action primary" id="addKeyframe">Add keyframe</button>`;
    else if(['Brightness','Contrast','Saturation','Sharpness'].includes(tool)){const map={Brightness:['brightness',c.brightness||0,-1,1,.01],Contrast:['contrast',c.contrast||1,.1,3,.01],Saturation:['saturation',c.saturation||1,0,2,.01],Sharpness:['sharpness',c.sharpness||0,0,2,.01]}[tool];body=rangeField(tool,map[0],map[1],map[2],map[3],map[4])+`<button class="pro-action primary" id="applyAdjust">Apply</button>`;}
    else if(['Temperature','Tint','Exposure','Highlights','Shadows'].includes(tool)) body=`${rangeField(tool,'adjustAmount',0,-1,1,.01)}<button class="pro-action primary" id="applyGenericAdjust">Apply</button><div class="tool-hint">The adjustment is saved with the clip and previewed live. Export uses the closest FFmpeg-equivalent correction.</div>`;
    else if(tool==='HSL') body=`<div class="hsl-grid">${['Hue','Saturation','Lightness'].map((x,i)=>rangeField(x,'hsl'+i,0,-1,1,.01)).join('')}</div><button class="pro-action primary" id="applyHsl">Apply HSL</button>`;
    else if(tool==='Curves') body=`<div class="curve-grid"><div class="curve-line"></div><button style="left:25%;top:75%">●</button><button style="left:50%;top:50%">●</button><button style="left:75%;top:25%">●</button></div><button class="pro-action primary" id="applyCurve">Apply Curve</button>`;
    else if(tool==='Volume') body=`${rangeField('Volume','audioVol',c.volume??1,0,2,.01)}${rangeField('Fade in','fadeIn',c.fadeIn||0,0,10,.1)}${rangeField('Fade out','fadeOut',c.fadeOut||0,0,10,.1)}<button class="pro-action primary" id="applyAudio">Apply</button>`;
    else if(tool==='Fade') body=`${rangeField('Fade in','fadeIn',c.fadeIn||0,0,10,.1)}${rangeField('Fade out','fadeOut',c.fadeOut||0,0,10,.1)}<button class="pro-action primary" id="applyFade">Apply fade</button>`;
    else if(tool==='Normalize') body=`<p>Normalize the selected clip audio.</p><button class="pro-action primary" id="applyNormalize">Normalize audio</button>`;
    else if(tool==='Mute') body=`<p>Mute the selected clip audio.</p><button class="pro-action primary" id="applyMute">Mute clip</button>`;
    else if(['Music','SFX','Voice Over'].includes(tool)) body=`<input id="toolAudio" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm"><div>${rangeField('Volume','audioAddVol',1,0,2,.01)}</div><button class="pro-action primary" id="applyAudioAdd">Add to audio track</button>`;
    else if(tool==='Extract Audio') body=`<p>Extract the selected video's original audio into an editable audio track.</p><button class="pro-action primary" id="applyExtract">Extract audio</button>`;
    else if(tool==='Record Voice Over') body=`<p>Record your microphone while the playhead marks the start position.</p><div class="record-status" id="recordStatus">Ready</div><button class="pro-action primary" id="startRecord">● Start recording</button><button class="pro-action" id="stopRecord" disabled>■ Stop</button>`;
    else if(tool==='TTS'||tool==='AI Voice') body=`<textarea id="ttsText" rows="5" placeholder="Type the voice-over script..."></textarea><select id="ttsVoice"><option>Default</option><option>Male</option><option>Female</option><option>Narrator</option></select>${rangeField('Speed','ttsSpeed',1,.5,2,.05)}<button class="pro-action primary" id="applyTts">Create voice track</button><div class="tool-hint">Uses the server's configured TTS/local fallback. A real cloud voice provider can be connected later.</div>`;
    else if(tool==='Import SRT/VTT') body=`<input id="subtitleFile" type="file" accept=".srt,.vtt,text/vtt,application/x-subrip"><p>Import timed subtitles directly onto the text track.</p><button class="pro-action primary" id="importSubtitle">Import captions</button>`;
    else if(tool==='Auto Captions') body=`<textarea id="autoCaptionScript" rows="7" placeholder="Paste the spoken transcript here. TNS Studio will split it into timed caption blocks across the selected clip."></textarea>${rangeField('Caption size','autoCaptionSize',56,20,120,1)}<button class="pro-action primary" id="generateAutoCaptions">Generate captions</button><div class="tool-hint">For automatic speech-to-text from the video's audio, connect a transcription provider later. Transcript-to-timed-captions works now.</div>`;
    else if(['Text','Captions','Subtitles'].includes(tool)) body=`<textarea id="textValue" rows="3" placeholder="Type your text or caption..."></textarea>${inputField('Font','textFont','Arial')}${rangeField('Size','textSize',56,12,160,1)}${rangeField('Opacity','textOpacity',1,0,1,.01)}<input id="textColor" type="color" value="#ffffff"><div class="four-actions"><button data-text-align="left">Left</button><button data-text-align="center">Center</button><button data-text-align="right">Right</button></div><button class="pro-action primary" id="applyText">Add to timeline</button>`;
    else if(tool==='Text Animation') body=`<select id="textAnim"><option>None</option><option>Fade</option><option>Slide Up</option><option>Slide Down</option><option>Zoom</option><option>Typewriter</option></select>${rangeField('Duration','textAnimDur',.5,.1,3,.1)}<button class="pro-action primary" id="applyTextAnim">Apply</button>`;
    else if(['Stickers','Shapes'].includes(tool)) body=`<div class="sticker-grid">${['⭐','❤️','🔥','✨','▶','●','✓','⚡'].map(x=>`<button data-sticker="${x}">${x}</button>`).join('')}</div><button class="pro-action primary" id="applySticker">Add</button>`;
    else if(['Effects','Filters'].includes(tool)||['Vintage','B&W','Warm','Cool','Cinematic','Retro','Blur','Glitch','Glow','Film Grain','Vignette','Lens','Light Leak'].includes(tool)) body=`<div class="effect-grid">${['None','Vintage','B&W','Warm','Cool','Cinematic','Retro','Blur','Glitch','Glow','Film Grain','Vignette','Lens','Light Leak'].map(x=>`<button data-effect="${x}"><span class="effect-thumb">${x==='B&W'?'◐':x==='Glitch'?'▤':'✦'}</span>${x}</button>`).join('')}</div>${rangeField('Intensity','effectIntensity',1,0,1,.01)}<button class="pro-action primary" id="applyEffect">Apply effect</button>`;
    else if(tool==='Transitions') body=`<div class="effect-grid">${['Fade','Dissolve','Slide','Zoom','Blur','Flash'].map(x=>`<button data-transition="${x}">◐ ${x}</button>`).join('')}</div>${rangeField('Duration','transitionDur',.5,.1,2,.1)}<button class="pro-action primary" id="applyTransition">Apply between clips</button>`;
    else if(['Add Overlay','Photo Overlay','Video Overlay'].includes(tool)) body=`<input id="overlayFile" type="file" accept="image/*,video/*"><p>Overlay becomes its own timeline layer. Position and size can be changed after adding.</p>${rangeField('Scale','overlayScale',1,.2,3,.01)}<button class="pro-action primary" id="applyOverlay">Add overlay</button>`;
    else if(['Opacity','Shadow','Blend','Mask'].includes(tool)) body=`${rangeField('Amount','genericAmount',tool==='Opacity'?1:.5,0,1,.01)}<select id="blendMode"><option>Normal</option><option>Screen</option><option>Multiply</option><option>Overlay</option></select><button class="pro-action primary" id="applyGenericLayer">Apply</button>`;
    else if(['Background Removal','Chroma Key'].includes(tool)) body=`<input id="keyColor" type="color" value="#00ff00">${rangeField('Similarity','keySimilarity',.1,0,.9,.01)}${rangeField('Blend','keyBlend',.05,0,.5,.01)}<button class="pro-action primary" id="applyKey">Apply</button><div class="tool-hint">Chroma-key removal is local. True ML background removal requires a configured AI provider.</div>`;
    else if(['Stabilization','Noise Cleanup','Voice Enhance','Normalize'].includes(tool)) body=`${rangeField('Strength','aiStrength',.5,0,1,.01)}<button class="pro-action primary" id="applyServerTool">Process clip</button>`;
    else if(['Silence Removal','Smart Cut','Scene Detection','Beat Sync','Auto Reframe','Motion Tracking','AI Enhance','AI Upscale','Object Removal','Face Blur'].includes(tool)) body=`${rangeField('Amount / Sensitivity','aiAmount',.5,0,1,.01)}<div class="tool-hint">This tool will analyze/process the selected clip. Local FFmpeg fallbacks are used where available; provider-powered AI remains optional.</div><button class="pro-action primary" id="applyServerTool">Run ${esc(tool)}</button>`;
    else if(tool==='Safe Zones') body=`<div class="safe-zone-demo">TITLE SAFE<br><span>ACTION SAFE</span></div><button class="pro-action primary" id="applySafeZones">Add safe-zone guide</button>`;
    else if(tool==='Markers'||tool==='Marker') body=`<p>Add a marker at the current playhead position.</p><button class="pro-action primary" id="addMarker">Add marker at ${fmt(state.playhead)}</button>`;
    else if(tool==='Project Backup') body=`<p>Create a portable TNS project JSON backup with media references and all edit state.</p><button class="pro-action primary" id="backupProject">Create backup</button>`;
    else if(tool==='Project Versions') body=`${inputField('Version name','versionName',`Version ${new Date().toLocaleTimeString()}`)}<button class="pro-action primary" id="saveVersion">Save version</button><div id="versionList" class="version-list"></div>`;
    else if(tool==='Media Relink') body=`<input id="relinkFile" type="file" accept="video/*,image/*"><button class="pro-action primary" id="relink">Relink selected clip</button>`;
    else if(tool==='Batch Apply') body=`<select id="batchProp"><option>Brightness</option><option>Contrast</option><option>Saturation</option><option>Volume</option><option>Speed</option></select>${rangeField('Value','batchVal',1,0,2,.01)}<button class="pro-action primary" id="batchApply">Apply to all clips</button>`;
    else if(tool==='Export Presets') body=`<div class="four-actions"><button data-export="720">HD</button><button data-export="1080">Full HD</button><button data-export="1440">2K</button><button data-export="2160">4K</button></div><select id="ratioSelect"><option>9:16</option><option>16:9</option><option>1:1</option><option>4:5</option></select><button class="pro-action primary" id="saveExportPreset">Use preset</button>`;
    else body=`<p>Advanced ${esc(tool)} controls.</p>${rangeField('Amount','genericAmount',.5,0,1,.01)}<button class="pro-action primary" id="applyGenericLayer">Apply</button>`;
    box.innerHTML=common+body+'</div>';box.classList.remove('hidden');bindDrawer(tool);
  }

  function bindDrawer(tool){
    const box=$('#proWorkspace');$('#closeTool')?.addEventListener('click',()=>box.classList.add('hidden'));
    $$('.pro-range input',box).forEach(i=>i.addEventListener('input',()=>{const out=$('#'+i.id+'Val');if(out)out.textContent=i.value;liveDrawer(tool);}));
    $$('.speed-presets button').forEach(b=>b.addEventListener('click',()=>{$('#speedValue').value=b.dataset.speed;applySpeed();}));
    $$('.ratio-pills button').forEach(b=>b.addEventListener('click',()=>{const [w,h]=b.dataset.ratio==='16:9'?[1920,1080]:b.dataset.ratio==='1:1'?[1080,1080]:b.dataset.ratio==='4:5'?[1080,1350]:[1080,1920];if($('#cropW'))$('#cropW').value=w;if($('#cropH'))$('#cropH').value=h;}));
    $$('[data-rotate]').forEach(b=>b.addEventListener('click',()=>{if(selectedClip())selectedClip().rotate=Number(b.dataset.rotate);syncPreview(false);}));
    $$('[data-flip]').forEach(b=>b.addEventListener('click',()=>{if(selectedClip())selectedClip().flip=b.dataset.flip;syncPreview(false);commit();}));
    $$('[data-speed]').forEach(()=>{});
    $('#applySplit')?.addEventListener('click',applySplit);
    $('#applySideDelete')?.addEventListener('click',()=>{
      const c=selectedClip(); if(!c)return;
      const local=clamp(state.playhead-(c.start||0),.05,Math.max(.05,clipRenderDuration(c)-.05));
      if(tool==='Delete Left'){c.trimStart=Math.min(Number(c.sourceDuration||1)-.05,(Number(c.trimStart)||0)+local);}
      else {c.trimEnd=Math.min(Number(c.sourceDuration||1)-.05,(Number(c.trimEnd)||0)+(clipRenderDuration(c)-local)*Math.max(.1,Number(c.speed)||1));}
      reflow();commit();toast(`${tool} applied.`);
    });
    $('#applyDelete')?.addEventListener('click',applyDelete);$('#applyDuplicate')?.addEventListener('click',applyDuplicate);$('#applyMerge')?.addEventListener('click',applyMerge);$('#applyFreeze')?.addEventListener('click',async()=>{const d=await runServerTransform('freeze frame',{duration:Number($('#freezeDur').value)||2});});
    $('#applyReverse')?.addEventListener('click',()=>runServerTransform('reverse'));
    $('#speedValue')?.addEventListener('change',applySpeed);$('#applyCrop')?.addEventListener('click',()=>tool==='Resize'?runServerTransform('resize',{width:Number($('#cropW').value)||1080,height:Number($('#cropH').value)||1920}):runServerTransform('crop',{width:Number($('#cropW').value)||1080,height:Number($('#cropH').value)||1920,x:Number($('#cropX').value)||0,y:Number($('#cropY').value)||0}));$('#applyTransform')?.addEventListener('click',()=>{commit();toast('Rotation applied.');});$('#applyPz')?.addEventListener('click',()=>{const c=selectedClip();c.scale=Number($('#pzScale').value);c.x=Number($('#pzX').value);c.y=Number($('#pzY').value);commit();});
    $('#addKeyframe')?.addEventListener('click',()=>{const c=selectedClip();c.keyframes=c.keyframes||[];c.keyframes.push({time:state.playhead,x:c.x||0,y:c.y||0,scale:Number($('#kfScale').value),opacity:Number($('#kfOpacity').value)});commit();toast('Keyframe added.');});
    $('#applyAdjust')?.addEventListener('click',()=>{const c=selectedClip();const map={brightness:'brightness',contrast:'contrast',saturation:'saturation',sharpness:'sharpness'};const id=map[tool];c[id]=Number($('#'+id).value);commit();});
    $('#applyGenericAdjust')?.addEventListener('click',()=>{const c=selectedClip();c.adjustments=c.adjustments||{};c.adjustments[tool]=Number($('#adjustAmount').value);commit();});
    $('#applyHsl')?.addEventListener('click',()=>{const c=selectedClip();c.hsl={h:Number($('#hsl0').value),s:Number($('#hsl1').value),l:Number($('#hsl2').value)};commit();});$('#applyCurve')?.addEventListener('click',()=>{const c=selectedClip();c.curves=true;commit();});
    $('#applyAudio')?.addEventListener('click',()=>{const c=selectedClip();c.volume=Number($('#audioVol').value);c.fadeIn=Number($('#fadeIn').value);c.fadeOut=Number($('#fadeOut').value);commit();});
    $('#applyFade')?.addEventListener('click',()=>runServerTransform('audio fade',{fadeIn:Number($('#fadeIn').value)||0,fadeOut:Number($('#fadeOut').value)||0,totalDuration:clipRenderDuration(selectedClip())}));
    $('#applyNormalize')?.addEventListener('click',()=>runServerTransform('normalize audio'));
    $('#applyMute')?.addEventListener('click',()=>runServerTransform('mute'));
    $('#applyAudioAdd')?.addEventListener('click',async()=>{const f=$('#toolAudio').files[0];if(!f)return toast('Choose an audio file.');try{const m=await upload(f);const duration=await probeAudioDuration(m.url);state.audio.push({id:crypto.randomUUID(),source:m.url,name:f.name,start:state.playhead,duration,volume:Number($('#audioAddVol').value),visible:true});commit();toast('Audio added to timeline.');}catch(e){toast(e.message);}});
    $('#applyExtract')?.addEventListener('click',()=>runServerTransform('extract audio'));
    $('#startRecord')?.addEventListener('click',async()=>{
      if(!navigator.mediaDevices?.getUserMedia)return toast('Microphone recording is not supported in this browser.');
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const chunks=[]; const rec=new MediaRecorder(stream);
        const status=$('#recordStatus');
        rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        rec.onstop=async()=>{
          stream.getTracks().forEach(t=>t.stop());
          const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});
          const file=new File([blob],`voiceover-${Date.now()}.webm`,{type:blob.type});
          try{const m=await upload(file);const duration=await probeAudioDuration(m.url);state.audio.push({id:crypto.randomUUID(),source:m.url,name:'Voice Over',start:state.playhead,duration,volume:1,visible:true});commit();toast('Voice-over added to timeline.');}
          catch(e){toast(e.message);}
        };
        rec.start(); window.__tnsRecorder=rec;
        if(status)status.textContent='Recording…';
        $('#startRecord').disabled=true;$('#stopRecord').disabled=false;
      }catch(e){toast(e.message||'Microphone permission denied.');}
    });
    $('#stopRecord')?.addEventListener('click',()=>{const r=window.__tnsRecorder;if(r&&r.state!=='inactive'){r.stop();$('#recordStatus').textContent='Saving…';$('#startRecord').disabled=false;$('#stopRecord').disabled=true;}});
    $('#importSubtitle')?.addEventListener('click',async()=>{
      const f=$('#subtitleFile')?.files?.[0]; if(!f)return toast('Choose an SRT or VTT file.');
      try{const raw=await f.text();const items=parseSrtVtt(raw);if(!items.length)return toast('No timed captions found.');state.text.push(...items);commit();toast(`${items.length} captions imported.`);}
      catch(e){toast('Could not read subtitle file.');}
    });
    $('#generateAutoCaptions')?.addEventListener('click',()=>{
      const c=selectedClip(); const raw=String($('#autoCaptionScript')?.value||'').trim(); if(!c||!raw)return toast('Select a clip and paste a transcript.');
      const words=raw.split(/\s+/).filter(Boolean); const total=Math.max(.5,clipRenderDuration(c)); const chunk=Math.max(3,Math.ceil(words.length/Math.max(1,Math.ceil(total/2.5))));
      const parts=[]; for(let i=0;i<words.length;i+=chunk)parts.push(words.slice(i,i+chunk).join(' '));
      const span=total/parts.length; parts.forEach((text,i)=>state.text.push({id:crypto.randomUUID(),text,font:'Arial',fontSize:Number($('#autoCaptionSize').value)||56,color:'#ffffff',opacity:1,x:40,y:40,start:(c.start||0)+i*span,duration:span,visible:true}));
      commit();toast(`${parts.length} timed captions created.`);
    });
    $('#applyTts')?.addEventListener('click',async()=>{const c=selectedClip();if(!c)return;try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'tts',inputPath:c.source,text:$('#ttsText').value,voice:$('#ttsVoice').value,speed:Math.round(165*Number($('#ttsSpeed').value))})});state.audio.push({id:crypto.randomUUID(),source:d.result.url,name:'TNS Voice',start:state.playhead,duration:10,volume:1,visible:true});commit();toast('Voice track added.');}catch(e){toast(e.message);}});
    $('#applyText')?.addEventListener('click',()=>{const t={id:crypto.randomUUID(),text:$('#textValue').value.trim()||'TNS Studio',font:$('#textFont').value,fontSize:Number($('#textSize').value),color:$('#textColor').value,opacity:Number($('#textOpacity').value),x:40,y:40,start:state.playhead,duration:3,visible:true};state.text.push(t);commit();toast('Text added to timeline.');});
    $('#applyTextAnim')?.addEventListener('click',()=>{const t=state.text[state.text.length-1];if(t)t.animation=$('#textAnim').value;t&&(t.animationDuration=Number($('#textAnimDur').value));commit();});
    $$('[data-sticker]').forEach(b=>b.addEventListener('click',()=>{$('#proCanvasText').innerHTML=`<div class="pro-sticker-preview">${b.dataset.sticker}</div>`;}));$('#applySticker')?.addEventListener('click',()=>{state.text.push({id:crypto.randomUUID(),text:$('#proCanvasText').textContent||'⭐',fontSize:80,color:'#fff',x:80,y:80,start:state.playhead,duration:3,opacity:1,visible:true});commit();});
    $$('[data-effect]').forEach(b=>b.addEventListener('click',()=>{const c=selectedClip();if(c)c.filter=b.dataset.effect==='B&W'?'grayscale':b.dataset.effect.toLowerCase();syncPreview(false);}));$('#applyEffect')?.addEventListener('click',async()=>{const c=selectedClip();if(!c)return;const f=c.filter;const map={grayscale:'hue=s=0',warm:'eq=brightness=0.04:saturation=1.15',cool:'hue=h=12:s=0.9',vintage:'eq=contrast=0.9:saturation=0.8',retro:'eq=contrast=0.95:saturation=1.2',blur:'gblur=sigma=3',glitch:'hue=h=10',glow:'gblur=sigma=2','film grain':'noise=alls=12:allf=t+u',vignette:'vignette',lens:'lenscorrection=k1=0.03:k2=0.01','light leak':'eq=brightness=0.08:saturation=1.15',cinematic:'eq=contrast=1.12:saturation=0.92',sepia:'colorchannelmixer=.393:.769:.189:.349:.686:.168:.272:.534:.131'};if(f&&f!=='none'){await runServerTransform(state.category==='Filters'?'filters':'effects',{filter:map[f]||'null'});}else commit();});
    $$('[data-transition]').forEach(b=>b.addEventListener('click',()=>{const c=selectedClip();if(c)c.transition=b.dataset.transition;}));$('#applyTransition')?.addEventListener('click',async()=>{const i=state.selected;if(i>=state.clips.length-1)return toast('Select a clip with another clip after it.');const type=state.clips[i].transition||'Fade';try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'transition',inputPath:state.clips[i].source,secondInputPath:state.clips[i+1].source,transition:String(type).toLowerCase(),duration:Number($('#transitionDur').value)||.5})});if(d.result?.url){const merged={...state.clips[i],id:crypto.randomUUID(),source:d.result.url,name:'Transitioned sequence',start:state.clips[i].start,trimStart:0,trimEnd:0,speed:1,sourceDuration:clipRenderDuration(state.clips[i])+clipRenderDuration(state.clips[i+1]),duration:clipRenderDuration(state.clips[i])+clipRenderDuration(state.clips[i+1])};state.clips.splice(i,2,merged);state.selected=i;reflow();commit();toast('Transition applied to the clips.');}}catch(e){toast(e.message);}});
    $('#applyOverlay')?.addEventListener('click',async()=>{const f=$('#overlayFile').files[0];if(!f)return toast('Choose an image/video.');try{const m=await upload(f);state.overlays=state.overlays||[];state.overlays.push({id:crypto.randomUUID(),type:f.type.startsWith('image/')?'image':'video',source:m.url,name:f.name,sourceDuration:3,duration:3,trimStart:0,trimEnd:0,start:state.playhead,speed:1,scale:Number($('#overlayScale').value),x:40,y:40,opacity:1,visible:true,overlay:true});commit();}catch(e){toast(e.message);}});
    $('#applyGenericLayer')?.addEventListener('click',()=>{const c=selectedClip();c.layerSettings={tool,value:Number($('#genericAmount').value),blend:$('#blendMode')?.value};if(tool==='Opacity')c.opacity=Number($('#genericAmount').value);commit();});
    $('#applyKey')?.addEventListener('click',()=>runServerTransform(tool==='Background Removal'?'background removal':'chroma key',{color:$('#keyColor').value,similarity:Number($('#keySimilarity').value),blend:Number($('#keyBlend').value)}));
    $('#applyServerTool')?.addEventListener('click',()=>{const map={Normalize:'normalize audio',Stabilization:'stabilization','Noise Cleanup':'noise cleanup','Voice Enhance':'voice enhance'};const serverTool=map[tool]||tool.toLowerCase();runServerTransform(serverTool,{amount:Number($('#aiStrength')?.value||$('#aiAmount')?.value||.5),threshold:Number($('#aiAmount')?.value||.5)});});
    $('#applySafeZones')?.addEventListener('click',()=>toast('Safe-zone guide enabled in preview.'));$('#addMarker')?.addEventListener('click',()=>{state.markers=state.markers||[];state.markers.push(state.playhead);commit();toast('Marker added.');});
    $('#backupProject')?.addEventListener('click',downloadProject);$('#saveVersion')?.addEventListener('click',saveVersion);$('#relink')?.addEventListener('click',async()=>{const f=$('#relinkFile').files[0],c=selectedClip();if(!f||!c)return;try{const m=await upload(f);c.source=m.url;c.name=f.name;await probeClip(c);commit();}catch(e){toast(e.message);}});
    $('#batchApply')?.addEventListener('click',()=>{const p=$('#batchProp').value,v=Number($('#batchVal').value);state.clips.forEach(c=>{if(p==='Brightness')c.brightness=v;if(p==='Contrast')c.contrast=v;if(p==='Saturation')c.saturation=v;if(p==='Volume')c.volume=v;if(p==='Speed')c.speed=Math.max(.1,v);});commit();});
    $$('[data-export]').forEach(b=>b.addEventListener('click',()=>state.quality=Number(b.dataset.export)));$('#ratioSelect')?.addEventListener('change',e=>state.ratio=e.target.value);$('#saveExportPreset')?.addEventListener('click',()=>{commit();toast(`${state.quality}p ${state.ratio} preset selected.`);});
  }
  function liveDrawer(tool){const c=selectedClip();if(!c)return;if(tool==='Trim'){c.trimStart=Number($('#toolStart').value);c.trimEnd=Number($('#toolEnd').value);}if(['Brightness','Contrast','Saturation','Sharpness'].includes(tool)){const key={Brightness:'brightness',Contrast:'contrast',Saturation:'saturation',Sharpness:'sharpness'}[tool];c[key]=Number($('#'+key).value);}if(tool==='Volume'){c.volume=Number($('#audioVol').value);c.fadeIn=Number($('#fadeIn').value);c.fadeOut=Number($('#fadeOut').value);}syncPreview(false);renderTimeline();}
  function applyCrop(){const c=selectedClip();if(!c)return;c.crop={width:Number($('#cropW').value)||1080,height:Number($('#cropH').value)||1920,x:Number($('#cropX').value)||0,y:Number($('#cropY').value)||0};c.x=c.crop.x;c.y=c.crop.y;commit();toast('Crop/resize applied.');}
  function applySpeed(){const c=selectedClip();if(!c)return;c.speed=Number($('#speedValue').value);commit();}
  function applySplit(){const c=selectedClip(),at=clamp(Number($('#splitAt').value),.05,clipDuration(c)-.05);const first={...c,id:crypto.randomUUID(),duration:c.duration,trimEnd:(c.sourceDuration||c.duration)-(c.trimStart||0)-at};const second={...c,id:crypto.randomUUID(),trimStart:(c.trimStart||0)+at,trimEnd:c.trimEnd||0,start:(c.start||0)+at/c.speed};state.clips.splice(state.selected,1,first,second);state.selected++;reflow();commit();toast('Clip split.');}
  function applyDelete(){state.clips.splice(state.selected,1);state.selected=clamp(state.selected,0,state.clips.length-1);reflow();commit();}
  function applyDuplicate(){const c=selectedClip();state.clips.splice(state.selected+1,0,{...c,id:crypto.randomUUID(),start:(c.start||0)+clipRenderDuration(c),name:(c.name||'Clip')+' copy'});reflow();commit();}
  async function applyMerge(){if(state.clips.length<2)return toast('Add at least two clips.');try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'merge',inputPaths:state.clips.map(c=>c.source)})});state.clips=[{...state.clips[0],id:crypto.randomUUID(),source:d.result.url,name:'Merged Video',start:0,trimStart:0,trimEnd:0,speed:1,sourceDuration:timelineDuration(),duration:timelineDuration()}];state.selected=0;commit();toast('Clips merged.');}catch(e){toast(e.message);}}
  function reflow(){let t=0;state.clips.forEach(c=>{c.start=t;t+=clipRenderDuration(c);});}
  async function runServerTransform(tool,extra={}){const c=selectedClip();if(!c)return;try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool,inputPath:c.source,...extra})});if(d.result?.url){c.source=d.result.url;c.name=`${c.name} • ${tool}`;await probeClip(c);commit();toast(`${tool} complete.`);}else toast(`${tool} complete.`);}catch(e){toast(e.message);}}
  function downloadProject(){const data={version:1,app:'TNS Studio',projectName:state.projectName,ratio:state.ratio,quality:state.quality,fps:state.fps,clips:state.clips,overlays:state.overlays||[],audio:state.audio,text:state.text,markers:state.markers||[]};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`${state.projectName.replace(/\s+/g,'-')}.tnsproject.json`;a.click();URL.revokeObjectURL(a.href);toast('Project backup created.');}
  function saveVersion(){const key='tnsStudioVersions';const list=JSON.parse(localStorage.getItem(key)||'[]');list.push({name:$('#versionName').value,data:snapshot(),at:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(-20)));toast('Project version saved.');}

  async function exportProject(){if(!state.clips.length)return toast('Add a video first.');const btn=$('#proExport');btn.disabled=true;btn.textContent='Exporting…';try{const ratio=state.ratio,q=Number(state.quality);const d=await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quality:q,ratio,fps:state.fps,videoBitrate:q>=2160?'20M':q>=1440?'12M':'8M',audioBitrate:'192k',timeline:{clips:state.clips.map(c=>({...c})),overlays:(state.overlays||[]).map(c=>({...c})),audio:state.audio.map(a=>({...a})),text:state.text.map(t=>({...t}))}})});const a=document.createElement('a');a.href=d.result.url;a.download='TNS-Studio-Export.mp4';a.target='_blank';a.click();toast('Export complete.');}catch(e){toast(e.message);}finally{btn.disabled=false;btn.textContent='Export';}}

  function bind(){
    $('#proUndo').onclick=undo;$('#proRedo').onclick=redo;$('#proExport').onclick=()=>openTool('Export');$('#proSave').onclick=()=>{localStorage.setItem('tnsStudioProProject',snapshot());state.dirty=false;renderAll();toast('Project saved on this device.');};$('#proLoad').onclick=()=>{const raw=localStorage.getItem('tnsStudioProProject')||localStorage.getItem('tnsStudioProAutosave');if(!raw)return toast('No saved TNS Studio project found.');try{restore(raw);state.dirty=false;renderAll();syncPreview(false);toast('Project loaded.');}catch{toast('Saved project is invalid.');}};
    $('#proVideoInput').onchange=async e=>{for(const f of [...e.target.files]){try{await addVideo(f)}catch(err){toast(err.message);}}e.target.value='';};
    $('#proPhotoInput').onchange=async e=>{for(const f of [...e.target.files]){try{await addVideo(f,'image')}catch(err){toast(err.message);}}e.target.value='';};
    $('#proAudioInput').onchange=async e=>{for(const f of [...e.target.files]){try{const m=await upload(f);const duration=await probeAudioDuration(m.url);state.audio.push({id:crypto.randomUUID(),source:m.url,name:f.name,start:0,duration,volume:1,visible:true});commit();}catch(err){toast(err.message);}}e.target.value='';};
    $('#proPlay').onclick=()=>{const v=$('#proPreview');if(v.paused){v.play().catch(()=>{});$('#proPlay').textContent='❚❚';}else{v.pause();$('#proPlay').textContent='▶';}};
    $('#proPreview').addEventListener('timeupdate',()=>{const c=selectedClip();if(!c)return;state.playhead=(Number(c.start)||0)+(($('#proPreview').currentTime-(Number(c.trimStart)||0))/Math.max(.1,c.speed||1));$('#proScrub').value=clamp(state.playhead/Math.max(.1,timelineDuration()),0,1);$('#proTime').textContent=fmt(state.playhead);renderCanvasText();});
    $('#proScrub').oninput=e=>{state.playhead=Number(e.target.value)*timelineDuration();syncPreview(false);renderTimeline();};
    $('#proCategories').onclick=e=>{
      const b=e.target.closest('.pro-cat'); if(!b)return;
      state.category=b.dataset.cat;
      renderCategories();renderTools();
      $('#proWorkspace').classList.add('hidden');
      $('#proTools')?.scrollTo({left:0,behavior:'smooth'});
    };
    $('#proTools').onclick=e=>{
      const b=e.target.closest('.pro-tool');
      if(b)openTool(b.dataset.tool);
    };
    $('#proTools').addEventListener('change',async e=>{
      const input=e.target;
      if(input.id==='capcutImportTool'){
        for(const f of [...input.files]){try{await addVideo(f)}catch(err){toast(err.message);}}
        input.value='';
      }
      if(input.id==='capcutPhotoTool'){
        for(const f of [...input.files]){try{await addVideo(f,'image')}catch(err){toast(err.message);}}
        input.value='';
      }
    });
    $('#proMediaLibraryBtn')?.addEventListener('click',()=>$('#proVideoInput')?.click());
    const drop=$('#proDropZone');
    if(drop){
      ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging');}));
      ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging');}));
      drop.addEventListener('drop',async e=>{for(const f of [...e.dataTransfer.files]){try{if(f.type.startsWith('video/'))await addVideo(f);else if(f.type.startsWith('image/'))await addVideo(f,'image');else if(f.type.startsWith('audio/')){const m=await upload(f);const duration=await probeAudioDuration(m.url);state.audio.push({id:crypto.randomUUID(),source:m.url,name:f.name,start:state.playhead,duration,volume:1,visible:true});commit();}}catch(err){toast(err.message);}}});
    }
    document.addEventListener('keydown',e=>{
      const tag=(e.target?.tagName||'').toLowerCase(); if(['input','textarea','select'].includes(tag))return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
      else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();$('#proSave')?.click();}
      else if(e.code==='Space'){e.preventDefault();$('#proPlay')?.click();}
      else if(e.key==='Delete'||e.key==='Backspace'){if(selectedClip())applyDelete();}
    });
    $('.capcut-back')?.addEventListener('click',()=>document.querySelector('[data-open="dashboard"]')?.click());
  }

  function init(){
    if(!$('#editor'))return;
    replaceEditorMarkup();
    window.__tnsProEditor={state,openTool,exportProject};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})();

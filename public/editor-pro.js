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
    Edit:['Trim','Split','Merge','Delete','Duplicate','Freeze','Reverse','Speed','Speed Curve','Crop','Resize','Rotate','Flip','Pan & Zoom','Keyframes'],
    Audio:['Music','SFX','Extract Audio','Voice Over','TTS','Volume','Fade','Normalize','Noise Cleanup','Voice Enhance','Mute'],
    Text:['Text','Captions','Auto Captions','Subtitles','Text Animation','Stickers','Shapes'],
    Overlay:['Add Overlay','Photo Overlay','Video Overlay','Opacity','Blend','Shadow','Mask'],
    Effects:['Effects','Transitions','Blur','Glitch','Glow','Film Grain','Vignette','Lens','Light Leak'],
    Filters:['Filters','Vintage','B&W','Warm','Cool','Cinematic','Retro'],
    Adjust:['Brightness','Contrast','Saturation','Temperature','Tint','Sharpness','Exposure','Highlights','Shadows','HSL','Curves'],
    AI:['Background Removal','Chroma Key','Stabilization','Silence Removal','Scene Detection','Smart Cut','Beat Sync','Auto Reframe','Motion Tracking','AI Enhance','AI Upscale','Object Removal','Face Blur','AI Voice'],
    More:['Safe Zones','Project Versions','Project Backup','Media Relink','Batch Apply','Export Presets','Markers']
  };

  const state = {
    clips:[], audio:[], text:[], selected:0, playhead:0, category:'Edit', snap:true, zoom:80,
    ratio:'9:16', quality:1080, fps:30, history:[], future:[], projectName:'Untitled Project', dirty:false
  };

  function snapshot(){ return JSON.stringify({clips:state.clips,audio:state.audio,text:state.text,ratio:state.ratio,quality:state.quality,fps:state.fps,projectName:state.projectName}); }
  function restore(s){ const x=JSON.parse(s); state.clips=x.clips||[];state.audio=x.audio||[];state.text=x.text||[];state.ratio=x.ratio||'9:16';state.quality=x.quality||1080;state.fps=x.fps||30;state.projectName=x.projectName||'Untitled Project'; state.selected=clamp(state.selected,0,Math.max(0,state.clips.length-1)); }
  function commit(){ state.history.push(snapshot()); if(state.history.length>60)state.history.shift(); state.future=[];state.dirty=true; renderAll(); }
  function undo(){ if(!state.history.length)return; state.future.push(snapshot()); restore(state.history.pop()); renderAll(); }
  function redo(){ if(!state.future.length)return; state.history.push(snapshot()); restore(state.future.pop()); renderAll(); }

  function clipDuration(c){ return Math.max(.1,(Number(c.sourceDuration)||Number(c.duration)||1)-(Number(c.trimStart)||0)-(Number(c.trimEnd)||0)); }
  function clipRenderDuration(c){ return clipDuration(c)/Math.max(.1,Number(c.speed)||1); }
  function timelineDuration(){ let t=0; state.clips.forEach(c=>{t=Math.max(t,(Number(c.start)||0)+clipRenderDuration(c));}); return t; }
  function selectedClip(){ return state.clips[state.selected]||null; }

  function replaceEditorMarkup(){
    const el=$('#editor'); if(!el)return;
    el.innerHTML = `
      <div class="tns-pro-editor">
        <header class="pro-head">
          <div class="pro-brand"><img src="/assets/tns-studio-mark.svg" alt="TNS Studio"><div><b>TNS Studio</b><small id="proProjectName">Untitled Project</small></div></div>
          <div class="pro-head-actions"><button id="proUndo" title="Undo">↶</button><button id="proRedo" title="Redo">↷</button><button id="proExport" class="pro-export">Export</button></div>
        </header>
        <div class="pro-workspace">
          <div class="pro-preview-wrap"><video id="proPreview" playsinline preload="metadata"></video><div id="proPreviewEmpty"><span>🎬</span><b>Add a video to start</b><small>Your edits preview here</small></div><div id="proPlayOverlay" class="pro-play-overlay">▶</div><div id="proCanvasText"></div></div>
          <div class="pro-time"><button id="proPlay">▶</button><span id="proTime">00:00</span><input id="proScrub" type="range" min="0" max="1" value="0" step="0.01"><span id="proTotal">00:00</span></div>
          <div class="pro-media-row"><label>＋ Add video<input id="proVideoInput" type="file" accept="video/*" multiple></label><label>＋ Add photo<input id="proPhotoInput" type="file" accept="image/*" multiple></label><label>＋ Audio<input id="proAudioInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm"></label></div>
          <div class="pro-timeline" id="proTimeline"><div class="pro-empty-timeline">Import a video to build your timeline</div></div>
          <div class="pro-track-labels"><span>VIDEO</span><span>TEXT / OVERLAY</span><span>AUDIO</span></div>
          <div class="pro-categories" id="proCategories"></div>
          <div class="pro-tools" id="proTools"></div>
          <div id="proWorkspace" class="pro-drawer hidden"></div>
        </div>
      </div>`;
    bind(); renderAll();
  }

  async function upload(file, endpoint='/api/uploads/file', field='file'){
    const fd=new FormData(); fd.append(field,file,file.name);
    const d=await json(endpoint,{method:'POST',body:fd}); return d.media;
  }
  async function addVideo(file,type='video'){
    const media=await upload(file,'/api/uploads/file','file');
    const c={id:crypto.randomUUID(),type,source:media.url,name:file.name,sourceDuration:3,duration:3,trimStart:0,trimEnd:0,start:timelineDuration(),speed:1,rotate:0,brightness:0,contrast:1,saturation:1,sharpness:0,volume:1,muted:false,visible:true,flip:'none',scale:1,x:0,y:0,filter:'none'};
    state.clips.push(c); state.selected=state.clips.length-1; await probeClip(c); commit();
  }
  async function probeClip(c){ return new Promise(resolve=>{ const v=document.createElement('video');v.preload='metadata';v.src=c.source;v.onloadedmetadata=()=>{c.sourceDuration=Number.isFinite(v.duration)?v.duration:3;c.duration=c.sourceDuration;resolve();};v.onerror=()=>resolve(); }); }

  function renderCategories(){
    $('#proCategories').innerHTML=Object.keys(CATEGORIES).map(k=>`<button class="pro-cat ${k===state.category?'active':''}" data-cat="${k}">${k}</button>`).join('');
  }
  function iconFor(n){const m={Trim:'✂️',Split:'🔪',Crop:'▣',Resize:'↔',Rotate:'⟳',Speed:'⏩',Text:'T',Captions:'CC',Music:'♫',SFX:'🔊',Effects:'✨',Transitions:'◐',Filters:'◈',Brightness:'☀',HSL:'🎨',Keyframes:'◆',Mask:'◍',Stabilization:'◎',"Auto Captions":'CC',"Background Removal":'✂',"Chroma Key":'🟢',Export:'⬆'};return m[n]||'•';}
  function renderTools(){ const arr=CATEGORIES[state.category]||[]; $('#proTools').innerHTML=arr.map(n=>`<button class="pro-tool" data-tool="${esc(n)}"><span>${iconFor(n)}</span><small>${esc(n)}</small></button>`).join(''); }
  function renderTimeline(){
    const el=$('#proTimeline'); if(!state.clips.length){el.innerHTML='<div class="pro-empty-timeline">Import a video to build your timeline</div>';return;}
    const total=Math.max(.1,timelineDuration());
    el.innerHTML=`<div class="pro-ruler">${[0,.25,.5,.75,1].map(x=>`<span style="left:${x*100}%">${fmt(total*x)}</span>`).join('')}</div><div class="pro-video-track">${state.clips.map((c,i)=>{const left=(c.start/total)*100,w=(clipRenderDuration(c)/total)*100;return `<button class="pro-clip ${i===state.selected?'selected':''}" data-clip="${i}" style="left:${left}%;width:${Math.max(3,w)}%"><span class="clip-thumb">${c.type==='image'?'🖼️':'🎞️'}</span><b>${esc(c.name||'Clip')}</b><small>${fmt(clipRenderDuration(c))}</small><i class="trim-handle left" data-handle="left"></i><i class="trim-handle right" data-handle="right"></i></button>`}).join('')}</div><div class="pro-playhead" style="left:${clamp(state.playhead/total,0,1)*100}%"></div>`;
    const track=el.querySelector('.pro-video-track'); track.onclick=e=>{if(e.target.closest('.pro-clip'))return; const r=track.getBoundingClientRect();state.playhead=clamp((e.clientX-r.left)/r.width,0,1)*total;syncPreview();renderTimeline();};
    $$('.pro-clip',el).forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();state.selected=Number(btn.dataset.clip);syncPreview();renderTimeline();openTool('Clip');}));
    $$('.trim-handle',el).forEach(h=>h.addEventListener('pointerdown',e=>startTrimDrag(e,h)));
  }
  function startTrimDrag(e,h){
    e.stopPropagation();e.preventDefault();const idx=Number(h.closest('.pro-clip').dataset.clip),c=state.clips[idx],track=$('#proTimeline .pro-video-track'),startX=e.clientX,start=Number(c.trimStart)||0,end=Number(c.trimEnd)||0,source=Number(c.sourceDuration)||3;
    const move=ev=>{const dx=(ev.clientX-startX)/track.getBoundingClientRect().width*timelineDuration()*Math.max(.1,c.speed); if(h.dataset.handle==='left') c.trimStart=clamp(start+dx,0,source-end-.1); else c.trimEnd=clamp(end-dx,0,source-start-.1); renderTimeline();syncPreview(false);};
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);commit();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  }
  function renderAll(){renderCategories();renderTools();renderTimeline();$('#proProjectName').textContent=state.projectName+(state.dirty?' •':'');$('#proTotal').textContent=fmt(timelineDuration());}

  function syncPreview(autoplay=true){
    const v=$('#proPreview'),c=selectedClip();if(!v)return;
    if(!c){$('#proPreviewEmpty').style.display='flex';v.style.display='none';return;}
    $('#proPreviewEmpty').style.display='none';v.style.display='block';
    if(v.src!==location.origin+c.source && v.src!==c.source){v.src=c.source;}
    const local=clamp(state.playhead-(Number(c.start)||0),0,Math.max(.01,clipRenderDuration(c)));
    const sourceTime=(Number(c.trimStart)||0)+local*(Number(c.speed)||1);
    const seek=()=>{try{v.currentTime=clamp(sourceTime,0,Math.max(.01,(c.sourceDuration||3)-.01));}catch{}};
    if(v.readyState>=1)seek();else v.onloadedmetadata=seek;
    v.style.transform=`translate(${c.x||0}px,${c.y||0}px) rotate(${c.rotate||0}deg) scale(${c.scale||1}) ${c.flip==='horizontal'?'scaleX(-1)':''}`;
    v.style.filter=previewFilter(c);
    $('#proTime').textContent=fmt(state.playhead);
    if(autoplay && !v.paused){v.play().catch(()=>{});} renderCanvasText();
  }
  function previewFilter(c){const b=Number(c.brightness)||0,ct=Number(c.contrast)||1,s=Number(c.saturation)||1,sh=Number(c.sharpness)||0;let f=`brightness(${1+b}) contrast(${ct}) saturate(${s})`;if(c.filter==='grayscale')f+=' grayscale(1)';if(c.filter==='sepia')f+=' sepia(.8)';if(c.filter==='warm')f+=' sepia(.25) saturate(1.15)';if(c.filter==='cool')f+=' hue-rotate(15deg) saturate(.9)';if(c.filter==='blur')f+=` blur(${Math.max(1,sh)}px)`;return f;}
  function renderCanvasText(){const c=selectedClip();const layer=state.text.find(t=>state.playhead>=t.start&&state.playhead<=t.start+t.duration);$('#proCanvasText').innerHTML=layer?`<div style="left:${layer.x}px;top:${layer.y}px;font-size:${layer.fontSize}px;color:${esc(layer.color)};font-family:${esc(layer.font)};opacity:${layer.opacity}">${esc(layer.text)}</div>`:'';}

  function inputField(label,id,value,type='text',attrs=''){return `<label class="pro-field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;}
  function rangeField(label,id,value,min,max,step='0.01'){return `<label class="pro-range"><span>${label}<b id="${id}Val">${value}</b></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;}
  function openTool(tool){
    const box=$('#proWorkspace'); if(!box)return;
    if(tool==='Clip'){box.classList.add('hidden');return;}
    const c=selectedClip();
    const noClip=['Music','SFX','Extract Audio','Voice Over','TTS','Text','Captions','Auto Captions','Subtitles','Stickers','Shapes','Effects','Transitions','Filters','Background Removal','Chroma Key','Project Backup','Project Versions','Export Presets','Markers','Add Overlay','Photo Overlay','Video Overlay'];
    if(!c && !noClip.includes(tool)){toast('Add or select a video clip first.');return;}
    const common=`<div class="drawer-head"><div><b>${esc(tool)}</b><small>Make the change, preview it, then Apply.</small></div><button id="closeTool">×</button></div><div class="drawer-body">`;
    let body='';
    if(tool==='Trim') body=`${rangeField('Start', 'toolStart',c.trimStart||0,0,Math.max(.1,c.sourceDuration-.1),.05)}${rangeField('End trim','toolEnd',c.trimEnd||0,0,Math.max(.1,c.sourceDuration-.1),.05)}<div class="tool-hint">Drag the clip handles on the timeline for fast trimming.</div>`;
    else if(tool==='Split') body=`${rangeField('Split at','splitAt',Math.max(.1,state.playhead-(c.start||0)),.05,Math.max(.1,clipDuration(c)),.05)}<button class="pro-action primary" id="applySplit">Split clip</button>`;
    else if(tool==='Delete') body=`<p>Remove the selected clip from the timeline.</p><button class="pro-action danger" id="applyDelete">Delete clip</button>`;
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
    else if(['Music','SFX','Voice Over'].includes(tool)) body=`<input id="toolAudio" type="file" accept="audio/*,.mp3,.wav,.m4a,.webm"><div>${rangeField('Volume','audioAddVol',1,0,2,.01)}</div><button class="pro-action primary" id="applyAudioAdd">Add to audio track</button>`;
    else if(tool==='Extract Audio') body=`<p>Extract the selected video's original audio into an editable audio track.</p><button class="pro-action primary" id="applyExtract">Extract audio</button>`;
    else if(tool==='TTS'||tool==='AI Voice') body=`<textarea id="ttsText" rows="5" placeholder="Type the voice-over script..."></textarea><select id="ttsVoice"><option>Default</option><option>Male</option><option>Female</option><option>Narrator</option></select>${rangeField('Speed','ttsSpeed',1,.5,2,.05)}<button class="pro-action primary" id="applyTts">Create voice track</button><div class="tool-hint">Uses the server's configured TTS/local fallback. A real cloud voice provider can be connected later.</div>`;
    else if(['Text','Captions','Subtitles','Auto Captions'].includes(tool)) body=`<textarea id="textValue" rows="3" placeholder="Type your text or caption..."></textarea>${inputField('Font','textFont','Arial')}${rangeField('Size','textSize',56,12,160,1)}${rangeField('Opacity','textOpacity',1,0,1,.01)}<input id="textColor" type="color" value="#ffffff"><div class="four-actions"><button data-text-align="left">Left</button><button data-text-align="center">Center</button><button data-text-align="right">Right</button></div><button class="pro-action primary" id="applyText">Add to timeline</button>`;
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
    else if(tool==='Markers') body=`<p>Add a marker at the current playhead position.</p><button class="pro-action primary" id="addMarker">Add marker at ${fmt(state.playhead)}</button>`;
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
    $('#applySplit')?.addEventListener('click',applySplit);$('#applyDelete')?.addEventListener('click',applyDelete);$('#applyDuplicate')?.addEventListener('click',applyDuplicate);$('#applyMerge')?.addEventListener('click',applyMerge);$('#applyFreeze')?.addEventListener('click',async()=>{const d=await runServerTransform('freeze frame',{duration:Number($('#freezeDur').value)||2});});
    $('#applyReverse')?.addEventListener('click',()=>runServerTransform('reverse'));
    $('#speedValue')?.addEventListener('change',applySpeed);$('#applyCrop')?.addEventListener('click',()=>tool==='Resize'?runServerTransform('resize',{width:Number($('#cropW').value)||1080,height:Number($('#cropH').value)||1920}):runServerTransform('crop',{width:Number($('#cropW').value)||1080,height:Number($('#cropH').value)||1920,x:Number($('#cropX').value)||0,y:Number($('#cropY').value)||0}));$('#applyTransform')?.addEventListener('click',()=>{commit();toast('Rotation applied.');});$('#applyPz')?.addEventListener('click',()=>{const c=selectedClip();c.scale=Number($('#pzScale').value);c.x=Number($('#pzX').value);c.y=Number($('#pzY').value);commit();});
    $('#addKeyframe')?.addEventListener('click',()=>{const c=selectedClip();c.keyframes=c.keyframes||[];c.keyframes.push({time:state.playhead,x:c.x||0,y:c.y||0,scale:Number($('#kfScale').value),opacity:Number($('#kfOpacity').value)});commit();toast('Keyframe added.');});
    $('#applyAdjust')?.addEventListener('click',()=>{const c=selectedClip();const map={brightness:'brightness',contrast:'contrast',saturation:'saturation',sharpness:'sharpness'};const id=map[tool];c[id]=Number($('#'+id).value);commit();});
    $('#applyGenericAdjust')?.addEventListener('click',()=>{const c=selectedClip();c.adjustments=c.adjustments||{};c.adjustments[tool]=Number($('#adjustAmount').value);commit();});
    $('#applyHsl')?.addEventListener('click',()=>{const c=selectedClip();c.hsl={h:Number($('#hsl0').value),s:Number($('#hsl1').value),l:Number($('#hsl2').value)};commit();});$('#applyCurve')?.addEventListener('click',()=>{const c=selectedClip();c.curves=true;commit();});
    $('#applyAudio')?.addEventListener('click',()=>{const c=selectedClip();c.volume=Number($('#audioVol').value);c.fadeIn=Number($('#fadeIn').value);c.fadeOut=Number($('#fadeOut').value);commit();});
    $('#applyAudioAdd')?.addEventListener('click',async()=>{const f=$('#toolAudio').files[0];if(!f)return toast('Choose an audio file.');try{const m=await upload(f);state.audio.push({id:crypto.randomUUID(),source:m.url,name:f.name,start:state.playhead,duration:30,volume:Number($('#audioAddVol').value),visible:true});commit();toast('Audio added to timeline.');}catch(e){toast(e.message);}});
    $('#applyExtract')?.addEventListener('click',()=>runServerTransform('extract audio'));
    $('#applyTts')?.addEventListener('click',async()=>{const c=selectedClip();if(!c)return;try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'tts',inputPath:c.source,text:$('#ttsText').value,voice:$('#ttsVoice').value,speed:Math.round(165*Number($('#ttsSpeed').value))})});state.audio.push({id:crypto.randomUUID(),source:d.result.url,name:'TNS Voice',start:state.playhead,duration:10,volume:1,visible:true});commit();toast('Voice track added.');}catch(e){toast(e.message);}});
    $('#applyText')?.addEventListener('click',()=>{const t={id:crypto.randomUUID(),text:$('#textValue').value.trim()||'TNS Studio',font:$('#textFont').value,fontSize:Number($('#textSize').value),color:$('#textColor').value,opacity:Number($('#textOpacity').value),x:40,y:40,start:state.playhead,duration:3,visible:true};state.text.push(t);commit();toast('Text added to timeline.');});
    $('#applyTextAnim')?.addEventListener('click',()=>{const t=state.text[state.text.length-1];if(t)t.animation=$('#textAnim').value;t&&(t.animationDuration=Number($('#textAnimDur').value));commit();});
    $$('[data-sticker]').forEach(b=>b.addEventListener('click',()=>{$('#proCanvasText').innerHTML=`<div class="pro-sticker-preview">${b.dataset.sticker}</div>`;}));$('#applySticker')?.addEventListener('click',()=>{state.text.push({id:crypto.randomUUID(),text:$('#proCanvasText').textContent||'⭐',fontSize:80,color:'#fff',x:80,y:80,start:state.playhead,duration:3,opacity:1,visible:true});commit();});
    $$('[data-effect]').forEach(b=>b.addEventListener('click',()=>{const c=selectedClip();if(c)c.filter=b.dataset.effect==='B&W'?'grayscale':b.dataset.effect.toLowerCase();syncPreview(false);}));$('#applyEffect')?.addEventListener('click',async()=>{const c=selectedClip();if(!c)return;const f=c.filter;const map={grayscale:'hue=s=0',warm:'eq=brightness=0.04:saturation=1.15',cool:'hue=h=12:s=0.9',vintage:'eq=contrast=0.9:saturation=0.8',retro:'eq=contrast=0.95:saturation=1.2',blur:'gblur=sigma=3',glitch:'hue=h=10',glow:'gblur=sigma=2','film grain':'noise=alls=12:allf=t+u',vignette:'vignette',lens:'lenscorrection=k1=0.03:k2=0.01','light leak':'eq=brightness=0.08:saturation=1.15',cinematic:'eq=contrast=1.12:saturation=0.92',sepia:'colorchannelmixer=.393:.769:.189:.349:.686:.168:.272:.534:.131'};if(f&&f!=='none'){await runServerTransform('effects',{filter:map[f]||'null'});}else commit();});
    $$('[data-transition]').forEach(b=>b.addEventListener('click',()=>{const c=selectedClip();if(c)c.transition=b.dataset.transition;}));$('#applyTransition')?.addEventListener('click',async()=>{const i=state.selected;if(i>=state.clips.length-1)return toast('Select a clip with another clip after it.');const type=state.clips[i].transition||'Fade';try{const d=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool:'transition',inputPath:state.clips[i].source,secondInputPath:state.clips[i+1].source,transition:String(type).toLowerCase(),duration:Number($('#transitionDur').value)||.5})});if(d.result?.url){const merged={...state.clips[i],id:crypto.randomUUID(),source:d.result.url,name:'Transitioned sequence',start:state.clips[i].start,trimStart:0,trimEnd:0,speed:1,sourceDuration:clipRenderDuration(state.clips[i])+clipRenderDuration(state.clips[i+1]),duration:clipRenderDuration(state.clips[i])+clipRenderDuration(state.clips[i+1])};state.clips.splice(i,2,merged);state.selected=i;reflow();commit();toast('Transition applied to the clips.');}}catch(e){toast(e.message);}});
    $('#applyOverlay')?.addEventListener('click',async()=>{const f=$('#overlayFile').files[0];if(!f)return toast('Choose an image/video.');try{const m=await upload(f);state.clips.push({id:crypto.randomUUID(),type:f.type.startsWith('image/')?'image':'video',source:m.url,name:f.name,sourceDuration:3,duration:3,trimStart:0,trimEnd:0,start:state.playhead,speed:1,scale:Number($('#overlayScale').value),x:40,y:40,volume:1,visible:true,overlay:true});state.selected=state.clips.length-1;commit();}catch(e){toast(e.message);}});
    $('#applyGenericLayer')?.addEventListener('click',()=>{const c=selectedClip();c.layerSettings={tool,value:Number($('#genericAmount').value),blend:$('#blendMode')?.value};if(tool==='Opacity')c.opacity=Number($('#genericAmount').value);commit();});
    $('#applyKey')?.addEventListener('click',()=>runServerTransform(tool==='Background Removal'?'background removal':'chroma key',{color:$('#keyColor').value,similarity:Number($('#keySimilarity').value),blend:Number($('#keyBlend').value)}));
    $('#applyServerTool')?.addEventListener('click',()=>runServerTransform(tool.toLowerCase().replace(' ',' '),{amount:Number($('#aiStrength')?.value||$('#aiAmount')?.value||.5),threshold:Number($('#aiAmount')?.value||.5)}));
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
  function downloadProject(){const data={version:1,app:'TNS Studio',projectName:state.projectName,ratio:state.ratio,quality:state.quality,fps:state.fps,clips:state.clips,audio:state.audio,text:state.text,markers:state.markers||[]};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`${state.projectName.replace(/\s+/g,'-')}.tnsproject.json`;a.click();URL.revokeObjectURL(a.href);toast('Project backup created.');}
  function saveVersion(){const key='tnsStudioVersions';const list=JSON.parse(localStorage.getItem(key)||'[]');list.push({name:$('#versionName').value,data:snapshot(),at:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(-20)));toast('Project version saved.');}

  async function exportProject(){if(!state.clips.length)return toast('Add a video first.');const btn=$('#proExport');btn.disabled=true;btn.textContent='Exporting…';try{const ratio=state.ratio,q=Number(state.quality);const d=await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quality:q,ratio,fps:state.fps,videoBitrate:q>=2160?'20M':q>=1440?'12M':'8M',audioBitrate:'192k',timeline:{clips:state.clips.map(c=>({...c})),audio:state.audio.map(a=>({...a})),text:state.text.map(t=>({...t}))}})});const a=document.createElement('a');a.href=d.result.url;a.download='TNS-Studio-Export.mp4';a.target='_blank';a.click();toast('Export complete.');}catch(e){toast(e.message);}finally{btn.disabled=false;btn.textContent='Export';}}

  function bind(){
    $('#proUndo').onclick=undo;$('#proRedo').onclick=redo;$('#proExport').onclick=exportProject;
    $('#proVideoInput').onchange=async e=>{for(const f of [...e.target.files]){try{await addVideo(f)}catch(err){toast(err.message);}}e.target.value='';};
    $('#proPhotoInput').onchange=async e=>{for(const f of [...e.target.files]){try{await addVideo(f,'image')}catch(err){toast(err.message);}}e.target.value='';};
    $('#proAudioInput').onchange=async e=>{for(const f of [...e.target.files]){try{const m=await upload(f);state.audio.push({id:crypto.randomUUID(),source:m.url,name:f.name,start:0,duration:30,volume:1,visible:true});commit();}catch(err){toast(err.message);}}e.target.value='';};
    $('#proPlay').onclick=()=>{const v=$('#proPreview');if(v.paused){v.play().catch(()=>{});$('#proPlay').textContent='❚❚';}else{v.pause();$('#proPlay').textContent='▶';}};
    $('#proPreview').addEventListener('timeupdate',()=>{const c=selectedClip();if(!c)return;state.playhead=(Number(c.start)||0)+(($('#proPreview').currentTime-(Number(c.trimStart)||0))/Math.max(.1,c.speed||1));$('#proScrub').value=clamp(state.playhead/Math.max(.1,timelineDuration()),0,1);$('#proTime').textContent=fmt(state.playhead);renderCanvasText();});
    $('#proScrub').oninput=e=>{state.playhead=Number(e.target.value)*timelineDuration();syncPreview(false);renderTimeline();};
    $$('.pro-cat').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderCategories();renderTools();$('#proWorkspace').classList.add('hidden');});
    $('#proTools').onclick=e=>{const b=e.target.closest('.pro-tool');if(b)openTool(b.dataset.tool);};
  }

  function init(){
    if(!$('#editor'))return;
    replaceEditorMarkup();
    window.__tnsProEditor={state,openTool,exportProject};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0);
})();

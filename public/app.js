const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const LANGS=(window.TNSLanguageRegistry||[]).map(x=>[x.nativeName||x.name,(x.nativeName||x.name).slice(0,2),x.code,x.name,x.rtl]);
let selectedLang=null,otpIdentifier=null,currentMedia=null,currentContact=null,authenticatedUser=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function msg(id,text,type='info'){const e=$(id);if(!e)return;e.textContent=text;e.dataset.type=type}
async function json(url,options={}){const r=await fetch(url,{credentials:'include',...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||d.message||'Request failed.');return d}
function showPanel(id){$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='projects')renderProjects();if(id==='contact')loadContacts();}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.open)));
function showAuthScreens(which){['authScreen','otpScreen','languageScreen'].forEach(id=>$( '#'+id).classList.toggle('hidden',id!==which))}
function currentUser(){return authenticatedUser}
function setUser(u){authenticatedUser=u||null;window.TNSAuth?.setLoggedIn?.(u||null)}
function projectKey(){const u=currentUser();return 'tnsStudioProjects_'+(u?.id||'guest').replace(/[^a-z0-9_-]/gi,'_')}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderLanguages(filter=''){const q=filter.toLowerCase();const grid=$('#languageGrid');grid.innerHTML=LANGS.filter(x=>x[0].toLowerCase().includes(q)||x[3].toLowerCase().includes(q)||x[2].toLowerCase().includes(q)).map(x=>`<button class="language-option ${selectedLang===x[2]?'selected':''}" data-lang="${x[2]}"><span class="lang-icon">${escapeHtml(x[1])}</span><span><b>${escapeHtml(x[3])}</b><small>${escapeHtml(x[0])} · ${x[2].toUpperCase()}</small></span></button>`).join('');$$('.language-option').forEach(b=>b.addEventListener('click',()=>{selectedLang=b.dataset.lang;localStorage.setItem('tnsStudioLanguage',selectedLang);applyLanguageMeta(selectedLang);renderLanguages($('#languageSearch').value);$('#continueLanguage').disabled=false}))}
function startLanguage(){selectedLang=localStorage.getItem('tnsStudioLanguage');renderLanguages();$('#continueLanguage').disabled=!selectedLang;showAuthScreens('languageScreen')}
$('#languageSearch')?.addEventListener('input',e=>renderLanguages(e.target.value));$('#continueLanguage')?.addEventListener('click',()=>{showAuthScreens(null);$('#languageScreen').classList.add('hidden');$('#app').classList.remove('hidden');showPanel('dashboard');bootDashboard()});
function bootDashboard(){loadSettings();applyLanguageMeta(localStorage.getItem('tnsStudioLanguage')||'en');renderProjects()}
function initMasterScreenLinks(){
  document.querySelectorAll('[data-open-screen]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.openScreen)));
}

function applyLanguageMeta(code){const item=(window.TNSLanguageRegistry||[]).find(x=>x.code===code);document.documentElement.lang=code||'en';document.documentElement.dir=item?.rtl?'rtl':'ltr'}
$$('.auth-mode').forEach(b=>b.addEventListener('click',()=>{$$('.auth-mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');const mobile=b.dataset.authMode==='mobile';$('#emailField').classList.toggle('hidden',mobile);$('#mobileField').classList.toggle('hidden',!mobile)}));
function togglePassword(id){const i=$(id);if(i)i.type=i.type==='password'?'text':'password'}
$('#showPassword')?.addEventListener('click',()=>togglePassword('#loginPassword'));
$('#showSignupPassword')?.addEventListener('click',()=>togglePassword('#signupPassword'));
$('#showSignupConfirm')?.addEventListener('click',()=>togglePassword('#signupConfirm'));
$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const mobile=!$('#mobileField').classList.contains('hidden');const identifier=mobile?$('#loginMobile').value.trim():$('#loginEmail').value.trim().toLowerCase();const password=$('#loginPassword').value;if(password.length<8)return msg('#loginMessage','Password must be at least 8 characters.','error');try{msg('#loginMessage','Signing in…');const d=await json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});setUser(d.user);toast('Login successful');if(localStorage.getItem('tnsStudioLanguage')){showAuthScreens(null);$('#app').classList.remove('hidden');bootDashboard()}else startLanguage()}catch(err){msg('#loginMessage',err.message,'error')}});
$('#signupOpen')?.addEventListener('click',()=>$('#signupModal').classList.remove('hidden'));$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
$('#signupBtn')?.addEventListener('click',async()=>{const email=$('#signupEmail').value.trim().toLowerCase(),mobile=$('#signupMobile').value.trim(),password=$('#signupPassword').value,confirm=$('#signupConfirm').value;if(password.length<8)return msg('#signupMessage','Password must be at least 8 characters long.','error');if(password!==confirm)return msg('#signupMessage','Passwords do not match.','error');try{const d=await json('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,mobile,password})});setUser(d.user);$('#signupModal').classList.add('hidden');toast('Account created');startLanguage()}catch(err){msg('#signupMessage',err.message,'error')}});
$('#googleBtn')?.addEventListener('click',()=>toast('Google sign-in needs OAuth credentials in deployment configuration.'));
async function requestOtp(){const mobile=!$('#mobileField').classList.contains('hidden');otpIdentifier=(mobile?$('#loginMobile').value:$('#loginEmail').value).trim();if(!otpIdentifier)return msg('#loginMessage','Enter your email or mobile number.','error');try{const d=await json('/api/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier})});showAuthScreens('otpScreen');$('#otpHint').textContent=d.otp?`Demo OTP: ${d.otp}`:'Enter the OTP sent to you.'}catch(err){msg('#loginMessage',err.message,'error')}}
$('#otpRequestBtn')?.addEventListener('click',requestOtp);
$('#verifyOtpBtn')?.addEventListener('click',async()=>{try{const d=await json('/api/auth/otp/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier,code:$('#otpCode').value})});setUser(d.user);toast('OTP verified');startLanguage()}catch(err){msg('#otpMessage',err.message,'error')}});$('#backToLogin')?.addEventListener('click',()=>showAuthScreens('authScreen'));
function loadSettings(){const s=JSON.parse(localStorage.getItem('tnsStudioSettings')||'{}');$('#settingTheme').value=s.theme||'dark';$('#settingQuality').value=s.quality||'HD';$('#settingRatio').value=s.ratio||'9:16';applyTheme($('#settingTheme').value)}
const MODULE_SETTINGS={
  'ai-video':{title:'AI Video Settings',items:['Default duration','Default style','Quality','AI provider','Character consistency']},
  'ai-image':{title:'AI Image Settings',items:['Default style','Aspect ratio','Quality','AI provider','Reference images']},
  'edit-video':{title:'Edit Video Settings',items:['Auto-save','Preview quality','Export quality','Audio defaults','AI editing tools']},
  contact:{title:'TNS Contact Settings',items:['App Lock','Individual Chat Lock','Hide Locked Chats','Private Notifications','Notifications','Chat Settings','Call Settings','Media & Storage']},
  projects:{title:'Projects Settings',items:['Auto-save','Cloud storage','Project privacy','Default project format']},
  'ai-voice':{title:'AI Voice Settings',items:['Default language','Voice','Speech speed','Pitch','Audio quality','Voice provider']},
  'tns-ai':{title:'TNS AI Settings',items:['Chat history','Voice mode','File understanding','Research mode','Response language','AI provider']},
  help:{title:'Help & Support Settings',items:['Support notifications','Tutorial tips','Diagnostics','Privacy controls']},
  premium:{title:'Premium Settings',items:['Plan','Renewal','AI credits','Storage','Billing region']}
};
function openModuleSettings(key){const item=MODULE_SETTINGS[key];if(!item)return;showPanel('settings');$('#settingsTitle').textContent=item.title;const box=$('#moduleSettingsBox');box.classList.remove('hidden');box.innerHTML='<div class="module-settings-list">'+item.items.map((x)=>`<div class="module-setting-row"><div><b>${escapeHtml(x)}</b><small>Configure ${escapeHtml(x.toLowerCase())} for this feature.</small></div><button class="secondary" type="button">Configure</button></div>`).join('')+'</div>'}
$$('.module-settings-btn').forEach(b=>b.addEventListener('click',()=>openModuleSettings(b.dataset.moduleSettings)));
function saveSettings(){const s={theme:$('#settingTheme').value,quality:$('#settingQuality').value,ratio:$('#settingRatio').value};localStorage.setItem('tnsStudioSettings',JSON.stringify(s));applyTheme(s.theme)}function applyTheme(v){document.body.classList.toggle('light',v==='light');if(v==='system')document.body.classList.toggle('light',matchMedia('(prefers-color-scheme:light)').matches)}
$('#settingTheme')?.addEventListener('change',saveSettings);$('#settingQuality')?.addEventListener('change',saveSettings);$('#settingRatio')?.addEventListener('change',saveSettings);
$('#globalSettingsBtn')?.addEventListener('click',()=>showPanel('settings'));
$('#changeLanguageBtn')?.addEventListener('click',()=>startLanguage());
$('#logoutBtn')?.addEventListener('click',async()=>{try{await json('/api/auth/logout',{method:'POST'})}catch{}authenticatedUser=null;window.TNSAuth?.logout?.();localStorage.removeItem('tnsStudioLanguage');location.reload()});
async function waitForMediaJob(type, jobId, options = {}) {
  const id = String(jobId || '').trim();
  if (!id) throw new Error(`${type === 'image' ? 'Image' : 'Video'} job ID was not returned.`);
  const interval = Math.max(500, Number(options.interval) || 1500);
  const timeout = Math.max(interval, Number(options.timeout) || (type === 'video' ? 180000 : 120000));
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const job = await json(`/api/${type}/jobs/${encodeURIComponent(id)}`);
    const status = String(job?.status || job?.job?.status || '').toLowerCase();
    if (['completed','complete','succeeded'].includes(status)) return job;
    if (['failed','error','cancelled','canceled'].includes(status)) {
      throw new Error(job?.error || job?.message || `${type === 'image' ? 'Image' : 'Video'} generation failed.`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`${type === 'image' ? 'Image' : 'Video'} generation timed out.`);
}
$('#generateBtn')?.addEventListener('click',async()=>{const idea=$('#idea').value.trim();if(!idea)return msg('#jobBox','Describe your video first.','error');msg('#jobBox','Creating your video…');try{const d=await json('/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:idea,duration:Number($('#duration').value),format:$('#format').value,style:$('#style').value,quality:$('#videoQuality').value,camera:$('#videoCamera')?.value,characterConsistency:$('#characterConsistency')?.value,workflow:$('#videoWorkflow')?.value,negativePrompt:$('#videoNegativePrompt')?.value,referenceName:$('#videoReference')?.files?.[0]?.name||null})});const job=d.status==='completed'?d:await waitForMediaJob('video',d.id||d.job?.id);const url=job.result?.url;if(!url)throw new Error('Video generation completed without a video result.');$('#videoResult').innerHTML=`<video controls playsinline src="${url}"></video><a class="download-btn" href="${url}" download="tns-studio-ai-video.mp4">⬇ Download HD Video</a>`;msg('#jobBox','Video ready.','success');saveProject('AI Video',idea)}catch(err){msg('#jobBox',err.message,'error')}});
$('#generateImageBtn')?.addEventListener('click',async()=>{const prompt=$('#imagePrompt').value.trim();if(!prompt)return msg('#imageStatus','Describe your image first.','error');msg('#imageStatus','Generating image…');try{const d=await json('/api/image/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:$('#imageStyle').value,ratio:$('#imageRatio').value,quality:$('#imageQuality')?.value||'HD',variations:Number($('#imageVariations')?.value||1),characterConsistency:$('#imageCharacter')?.value||'Standard',negativePrompt:$('#imageNegativePrompt')?.value||'',referenceName:$('#imageReference')?.files?.[0]?.name||null})});const job=d.status==='completed'?d:await waitForMediaJob('image',d.id||d.job?.id);const url=job.result?.url;if(!url)throw new Error('Image generation completed without an image result.');$('#imagePreviewBox').innerHTML=`<img src="${url}" alt="Generated by TNS Studio">`;const a=$('#imageDownload');a.href=url;a.classList.remove('hidden');msg('#imageStatus','Image ready.','success');saveProject('AI Image',prompt)}catch(err){msg('#imageStatus',err.message,'error')}});
$('#videoFile')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;msg('#editStatus','Uploading video…');const fd=new FormData();fd.append('video',file);try{const d=await fetch('/api/uploads/video',{method:'POST',body:fd,credentials:'include'});const r=await d.json();if(!d.ok)throw Error(r.error||'Upload failed.');currentMedia=r.media;$('#preview').src=r.media.url;$('#preview').load();$('#timeline').innerHTML=`<div class="clip">${escapeHtml(r.media.originalName)} • ${(r.media.size/1048576).toFixed(1)} MB</div>`;msg('#editStatus','Video imported. You can preview and edit it.','success')}catch(err){msg('#editStatus',err.message,'error')}});
let editorClips=[];
$('#mergeFiles')?.addEventListener('change',async e=>{const files=[...e.target.files];if(files.length<2)return msg('#editStatus','Select at least 2 video clips to merge.','error');msg('#editStatus','Uploading clips…');try{editorClips=[];for(const file of files){const fd=new FormData();fd.append('video',file);const r=await fetch('/api/uploads/video',{method:'POST',body:fd,credentials:'include'});const d=await r.json();if(!r.ok)throw Error(d.error||`Upload failed: ${file.name}`);editorClips.push(d.media)}$('#timeline').innerHTML=editorClips.map((m,i)=>`<div class="clip">${i+1}. ${escapeHtml(m.originalName)} • ${(m.size/1048576).toFixed(1)} MB</div>`).join('');msg('#editStatus',`${editorClips.length} clips ready. Tap Merge.`,'success')}catch(err){msg('#editStatus',err.message,'error')}});
$('#audioFile')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;msg('#editStatus','Uploading audio…');try{const fd=new FormData();fd.append('file',file);const r=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const d=await r.json();if(!r.ok)throw Error(d.error||'Audio upload failed.');window.editorAudio=d.media;msg('#editStatus',`${file.name} ready. Tap Music, SFX or Voice Over.`,'success')}catch(err){msg('#editStatus',err.message,'error')}});
$('#preview')?.addEventListener('timeupdate',()=>{const v=$('#preview');const s=Math.floor(v.currentTime||0);$('#timelineTime').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`});$('#volume')?.addEventListener('input',e=>$('#preview').volume=Number(e.target.value));
$$('[data-tool]').forEach(b=>b.addEventListener('click',()=>msg('#toolMessage',`${b.dataset.tool} tool selected. Use the controls above for core edits; advanced tools can be expanded as the project grows.`)));
$('#exportBtn')?.addEventListener('click',async()=>{if(!currentMedia)return msg('#editStatus','Import a video first.','error');msg('#editStatus','Exporting HD MP4…');try{const d=await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputPath:currentMedia.url,trimStart:Number($('#trimStart').value||0),trimDuration:Number($('#trimDuration').value||0),brightness:Number($('#brightness').value||0),contrast:Number($('#contrast').value||1),filter:$('#filter').value,rotate:$('#rotate').value,speed:Number($('#speed').value||1),volume:Number($('#volume').value||1),saturation:Number($('#saturation')?.value||1),sharpness:Number($('#sharpness')?.value||0),fadeIn:Number($('#fadeIn')?.value||0),fadeOut:Number($('#fadeOut')?.value||0),quality:Number($('#exportQuality').value||1080)})});const a=document.createElement('a');a.href=d.result.url;a.download=d.result.fileName||'tns-studio-export.mp4';a.className='download-btn';a.textContent='⬇ Download exported MP4';$('#editStatus').replaceChildren(document.createTextNode('Export complete — '),a);$('#finalPreview').src=d.result.url;$('#finalSummaryText').textContent=`${currentMedia.originalName} • ${$('#exportQuality').value}p • MP4`;$('#finalDownloadBtn').onclick=()=>{const x=document.createElement('a');x.href=d.result.url;x.download=d.result.fileName||'tns-studio-export.mp4';x.click()};saveProject('Edited Video',currentMedia.originalName)}catch(err){msg('#editStatus',err.message,'error')}});
$('#resetVideo')?.addEventListener('click',()=>{if($('#preview').src?.startsWith('blob:'))URL.revokeObjectURL($('#preview').src);$('#preview').removeAttribute('src');$('#preview').load();$('#videoFile').value='';currentMedia=null;$('#timeline').innerHTML='<span class="muted">Import a video to start editing.</span>';msg('#editStatus','Editor reset.')});
$('#generateVoiceBtn')?.addEventListener('click',async()=>{const text=$('#voiceText').value.trim();if(!text)return msg('#voiceStatus','Enter text first.','error');msg('#voiceStatus','Creating voice…');try{const d=await json('/api/voice/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language:$('#voiceLanguage').value,quality:$('#voiceQuality').value})});if(d.status==='completed'&&d.result?.url){$('#voiceResult').innerHTML=`<audio controls src="${d.result.url}"></audio><a class="download-btn" href="${d.result.url}" download="tns-studio-voice.mp3">⬇ Download Voice</a>`;return msg('#voiceStatus','Voice ready.','success')}msg('#voiceStatus','Voice job created. A real voice provider is required for production output.','info')}catch(err){msg('#voiceStatus',err.message,'error')}});
$('#tnsAiForm')?.addEventListener('submit',async e=>{e.preventDefault();const input=$('#tnsAiInput').value.trim();if(!input)return;const box=$('#tnsAiMessages');box.insertAdjacentHTML('beforeend',`<div class="ai-message mine">${escapeHtml(input)}</div>`);$('#tnsAiInput').value='';try{const d=await json('/api/tns-ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input})});box.insertAdjacentHTML('beforeend',`<div class="ai-message">${escapeHtml(d.reply||'TNS AI is ready, but no AI provider is configured yet.')}</div>`);box.scrollTop=box.scrollHeight}catch(err){box.insertAdjacentHTML('beforeend',`<div class="ai-message error">${escapeHtml(err.message)}</div>`);}});
$('#tnsAiVoiceMode')?.addEventListener('click',()=>msg('#tnsAiStatus','Voice conversation UI is ready. Live voice requires the configured AI voice/STT provider.','info'));
$('#tnsAiChatMode')?.addEventListener('click',()=>msg('#tnsAiStatus','Chat mode selected.','info'));
$('#tnsAiUpload')?.addEventListener('click',()=>$('#tnsAiFile')?.click());
$('#tnsAiFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)msg('#tnsAiStatus',`${f.name} selected. AI file understanding requires the configured provider.`,'info')});
function saveProject(type,title){const key=projectKey();const list=JSON.parse(localStorage.getItem(key)||'[]');list.unshift({id:crypto.randomUUID?.()||String(Date.now()),type,title,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(0,30)));renderProjects()}
function renderProjects(){const list=JSON.parse(localStorage.getItem(projectKey())||'[]');$('#projectList').innerHTML=list.length?list.map(p=>`<div class="project-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)} • ${new Date(p.date).toLocaleString()}</small></div><span class="muted">Saved</span></div>`).join(''):'<p class="muted">No projects yet. Start creating.</p>';$('#recentProjects').innerHTML=list.slice(0,4).map(p=>`<div class="recent-card"><span>🎬</span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)}</small></div>`).join('')||'<div class="recent-card"><span>✨</span><b>Your creations appear here</b><small>Start with any creator tool.</small></div>'}
$('#clearBtn')?.addEventListener('click',()=>{localStorage.removeItem(projectKey());renderProjects();toast('Local projects cleared')});
async function loadContacts(){try{const d=await json('/api/contact/users');renderContacts(d.users||[])}catch(err){$('#contactList').innerHTML=`<p class="muted">${escapeHtml(err.message)}</p>`}}
async function renderContacts(users, showHidden=false){
  const decorated=await Promise.all(users.map(async u=>{
    try{const d=await json('/api/contact/settings?with='+encodeURIComponent(u.id));return {...u,security:d.settings||{}}}
    catch{return {...u,security:{}}}
  }));
  const visible=decorated.filter(u=>showHidden?u.security.hidden:!u.security.hidden);
  $('#contactList').innerHTML=visible.map(u=>`<button class="contact-item ${currentContact?.id===u.id?'active':''}" data-contact="${u.id}"><span class="avatar">${escapeHtml((u.email||u.mobile||'T').slice(0,1).toUpperCase())}</span><span><b>${escapeHtml(u.email||u.mobile||'TNS User')}</b><small>${u.security.locked?'🔒 Locked':'Available on TNS Studio'}</small></span></button>`).join('')||`<p class="muted">${showHidden?'No hidden chats.':'No registered TNS users found.'}</p>`;
  $$('[data-contact]').forEach(b=>b.addEventListener('click',()=>openChat(decorated.find(u=>u.id===b.dataset.contact))));
}
$('#contactSearch')?.addEventListener('input',async e=>{try{const d=await json('/api/contact/users?q='+encodeURIComponent(e.target.value));renderContacts(d.users||[])}catch{}});
async function openChat(u){if(!u)return;try{const sec=await json('/api/contact/settings?with='+encodeURIComponent(u.id));if(sec.settings?.locked){const password=prompt('This chat is locked. Enter your TNS Studio password to open it.');if(password===null)return;await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:u.id,action:'unlockCheck',password})})}}catch(err){if(err.message==='Incorrect TNS Studio password.')return toast(err.message);if(err.message&&!err.message.includes('Invalid contact security action'))return toast(err.message)}currentContact=u;$('#chatEmpty').classList.add('hidden');$('#chatView').classList.remove('hidden');$('#chatName').textContent=u.email||u.mobile;$('#chatPresence').textContent='TNS Studio user';ensureChatSecurityButtons();await loadMessages();loadContacts()}
function ensureChatSecurityButtons(){const head=document.querySelector('.chat-head .chat-actions');if(!head||head.querySelector('#lockChatBtn'))return;head.insertAdjacentHTML('afterbegin','<button id="lockChatBtn" title="Lock this chat">🔒</button><button id="hideChatBtn" title="Hide this chat">🙈</button>');$('#lockChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to lock/unlock this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleLock',password})});toast(d.locked?'Chat locked.':'Chat unlocked.')}catch(err){toast(err.message)}});$('#hideChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to hide/show this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleHide',password})});toast(d.hidden?'Chat hidden.':'Chat visible.');loadContacts()}catch(err){toast(err.message)}})}
async function loadMessages(){if(!currentContact)return;try{const d=await json('/api/contact/chats?with='+encodeURIComponent(currentContact.id));$('#messages').innerHTML=(d.messages||[]).map(m=>{const a=m.attachment;let media='';if(a?.url&&String(m.type).startsWith('media')) media=`<img class="chat-attachment" src="${escapeHtml(a.url)}" alt="Shared media">`;else if(a?.url&&m.type==='voice') media=`<audio class="chat-audio" controls src="${escapeHtml(a.url)}"></audio>`;else if(a?.url&&m.type==='file') media=`<a class="chat-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name||'Shared file')}</a>`;return `<div class="message ${m.from===currentUser()?.id?'mine':''}">${escapeHtml(m.text)}${media}<small>${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>`}).join('');const box=$('#messages');box.scrollTop=box.scrollHeight}catch(err){toast(err.message)}}
$('#messageForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=$('#messageInput').value.trim();if(!text||!currentContact)return;try{await json('/api/contact/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:currentContact.id,text})});$('#messageInput').value='';await loadMessages()}catch(err){toast(err.message)}});
$('#contactPermission')?.addEventListener('click',async()=>{if(!('contacts' in navigator)){toast('Phone contact sync is not supported on this browser.');return}try{const props=['name','tel'];const opts={multiple:true};const contacts=await navigator.contacts.select(props,opts);toast(`${contacts.length} phone contact(s) selected. TNS will match registered numbers.`)}catch{toast('Contact permission was cancelled.')}});
$('#voiceCallBtn')?.addEventListener('click',()=>toast('Voice call request UI ready — production calling needs WebRTC signaling/service setup.'));$('#videoCallBtn')?.addEventListener('click',()=>toast('Video call request UI ready — production calling needs WebRTC signaling/service setup.'));
$$('.contact-tab').forEach(b=>b.addEventListener('click',async()=>{$$('.contact-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');const tab=b.dataset.contactTab,note=$('#contactSectionNote');if(tab==='status'){const current=await json('/api/contact/status').catch(()=>({}));const text=prompt('Set your TNS Status',current.status?.text||'');if(text!==null){await json('/api/contact/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});note.textContent='Status updated.'}}else if(tab==='calls'){note.textContent='Voice/video call controls are available from each chat. Internet calling needs WebRTC signaling/service credentials in deployment.'}else if(tab==='contacts'){note.textContent='Select phone contacts to match their numbers against registered TNS Studio users.'}else{note.textContent='Your TNS chats are shown here.';loadContacts()}}));
$('#showHiddenChatsBtn')?.addEventListener('click',async()=>{const password=prompt('Enter your TNS Studio password to view hidden chats.');if(password===null)return;try{const users=(await json('/api/contact/users')).users||[];for(const u of users){await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:u.id,action:'unlockCheck',password})});}await renderContacts(users,true);toast('Hidden chats unlocked for this view.')}catch(err){toast(err.message)}});
$('#newGroupBtn')?.addEventListener('click',()=>{const name=prompt('Group name');if(name?.trim()){const groups=JSON.parse(localStorage.getItem('tnsStudioGroups')||'[]');groups.unshift({name:name.trim(),createdAt:new Date().toISOString()});localStorage.setItem('tnsStudioGroups',JSON.stringify(groups.slice(0,50)));toast('Group created on this device')}});
async function boot(){try{const d=await json('/api/auth/me');if(d.user){setUser(d.user);if(localStorage.getItem('tnsStudioLanguage')){showAuthScreens(null);$('#app').classList.remove('hidden');bootDashboard()}else startLanguage()}else showAuthScreens('authScreen')}catch{showAuthScreens('authScreen')}renderLanguages()}
initMasterScreenLinks();
setTimeout(()=>$('#splashScreen')?.classList.add('hidden'),1200);
boot();


/* ===== FINAL FEATURE ENHANCEMENTS ===== */
function ensureModuleSettingsModal(){
  if($('#moduleSettingsModal')) return;
  document.body.insertAdjacentHTML('beforeend',`<div id="moduleSettingsModal" class="modal hidden module-settings-modal"><div class="modal-card glass"><button class="modal-close" id="closeModuleSettings">×</button><p class="eyebrow">MODULE SETTINGS</p><h2 id="moduleModalTitle">Feature Settings</h2><div id="moduleModalForm" class="module-setting-form"></div><div class="setting-actions"><button id="saveModuleSettings" class="primary">Save Settings</button><button id="resetModuleSettings" class="secondary">Reset</button></div><p id="moduleSettingsStatus" class="status"></p></div></div>`);
  $('#closeModuleSettings').addEventListener('click',()=>$('#moduleSettingsModal').classList.add('hidden'));
}
const moduleSettingDefaults={
  'ai-video':{duration:'10',quality:'HD',style:'Photorealistic',aspect:'9:16',autoSave:true},
  'ai-image':{quality:'HD',style:'Photorealistic',aspect:'9:16',variations:'1',autoSave:true},
  'edit-video':{autoSave:true,preview:'HD',export:'1080',audio:'AAC 192k',aiTools:true},
  contact:{notifications:true,privateNotifications:true,lockNewChats:false,mediaAutoDownload:'Wi-Fi',callPrivacy:'Contacts'},
  projects:{autoSave:true,cloudSync:true,privacy:'Private',format:'9:16'},
  'ai-voice':{language:'Auto',voice:'Default',speed:'1x',quality:'HD'},
  'tns-ai':{history:true,voice:true,files:true,research:true,language:'Auto'},
  help:{tips:true,notifications:true,diagnostics:false},
  premium:{plan:'Current',credits:'Auto',storage:'Standard',renewal:'On'}
};
let activeModuleSettings='';
function openModuleSettingsModal(key){
  ensureModuleSettingsModal(); activeModuleSettings=key; const item=MODULE_SETTINGS[key]||{title:'Feature Settings',items:[]}; $('#moduleModalTitle').textContent=item.title;
  const saved=JSON.parse(localStorage.getItem('tnsStudioModuleSettings_'+key)||'null')||moduleSettingDefaults[key]||{};
  const fields=Object.entries(saved).map(([name,val])=>{const label=name.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());
    if(typeof val==='boolean') return `<div><label>${escapeHtml(label)}</label><select data-setting-key="${escapeHtml(name)}"><option value="true" ${val?'selected':''}>On</option><option value="false" ${!val?'selected':''}>Off</option></select></div>`;
    const options={quality:['SD','HD','Full HD','2K','4K'],style:['Photorealistic','Cinematic','Realistic Smartphone','Illustration','Anime','3D'],aspect:['9:16','16:9','1:1','4:5'],format:['9:16','16:9','1:1'],language:['Auto','English','Hindi'],voice:['Default','Male','Female','Narrator'],speed:['0.75x','1x','1.25x','1.5x','2x'],export:['720','1080','1440','2160'],audio:['AAC 192k','AAC 320k'],privacy:['Private','Shared'],storage:['Standard','High'],renewal:['On','Off'],plan:['Current','Monthly','Yearly']}[name];
    if(options) return `<div><label>${escapeHtml(label)}</label><select data-setting-key="${escapeHtml(name)}">${options.map(o=>`<option ${String(o)===String(val)?'selected':''}>${escapeHtml(o)}</option>`).join('')}</select></div>`;
    return `<div><label>${escapeHtml(label)}</label><input data-setting-key="${escapeHtml(name)}" value="${escapeHtml(val)}"></div>`;
  }).join('');
  $('#moduleModalForm').innerHTML=fields||'<p class="muted">No additional settings.</p>';
  $('#moduleSettingsStatus').textContent='Settings are saved on this device and used by the feature UI.';
  $('#moduleSettingsModal').classList.remove('hidden');
}
function saveModuleSettings(){
  const data={}; $$('#moduleModalForm [data-setting-key]').forEach(el=>data[el.dataset.settingKey]=el.tagName==='SELECT'&&['true','false'].includes(el.value)?el.value==='true':el.value);
  localStorage.setItem('tnsStudioModuleSettings_'+activeModuleSettings,JSON.stringify(data)); $('#moduleSettingsStatus').textContent='Settings saved.'; toast('Module settings saved');
}
function resetModuleSettings(){localStorage.removeItem('tnsStudioModuleSettings_'+activeModuleSettings);openModuleSettingsModal(activeModuleSettings);}
document.addEventListener('click',e=>{const btn=e.target.closest('.module-settings-btn');if(btn){e.preventDefault();e.stopImmediatePropagation();openModuleSettingsModal(btn.dataset.moduleSettings)}},true);
document.addEventListener('click',e=>{if(e.target.id==='saveModuleSettings')saveModuleSettings();if(e.target.id==='resetModuleSettings')resetModuleSettings()});

$$('.settings-tab').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.settingsTab;$$('.settings-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.settings-content').forEach(x=>x.classList.add('hidden'));$('#settings'+key.charAt(0).toUpperCase()+key.slice(1))?.classList.remove('hidden');if(key==='storage')$('#storageProjectCount').textContent=`${JSON.parse(localStorage.getItem(projectKey())||'[]').length} projects saved.`}));
$('#openLanguageInside')?.addEventListener('click',()=>showPanel('languageInside'));
function renderLanguageInside(filter=''){const grid=$('#languageInsideGrid');if(!grid)return;const q=filter.toLowerCase();grid.innerHTML=LANGS.filter(x=>x[0].toLowerCase().includes(q)||x[3].toLowerCase().includes(q)||x[2].toLowerCase().includes(q)).map(x=>`<button class="language-option ${selectedLang===x[2]?'selected':''}" data-inside-lang="${x[2]}"><span class="lang-icon">${escapeHtml(x[1])}</span><span><b>${escapeHtml(x[3])}</b><small>${escapeHtml(x[0])} · ${x[2].toUpperCase()}</small></span></button>`).join('');$$('[data-inside-lang]').forEach(b=>b.addEventListener('click',()=>{selectedLang=b.dataset.insideLang;localStorage.setItem('tnsStudioLanguage',selectedLang);applyLanguageMeta(selectedLang);renderLanguageInside($('#languageInsideSearch').value);toast('Language updated')}))}
$('#languageInsideSearch')?.addEventListener('input',e=>renderLanguageInside(e.target.value));
const oldShowPanel=showPanel; showPanel=function(id){oldShowPanel(id);if(id==='languageInside')renderLanguageInside();if(id==='settings')$('#settingsTitle').textContent='Global Settings';};

$('#improveVideoBtn')?.addEventListener('click',()=>{const x=$('#idea');if(x.value.trim())x.value=`Create a polished ${$('#style').value} video: ${x.value.trim()}. Include a clear hook, natural motion, realistic lighting, coherent camera movement, consistent subject identity and a satisfying ending.`;msg('#jobBox','Prompt improved. Review it before generating.','success')});
$('#variationVideoBtn')?.addEventListener('click',()=>{const x=$('#idea');if(!x.value.trim())return msg('#jobBox','Enter an idea first.','error');x.value += ' Create a fresh visual variation with different camera movement and composition while preserving the same subject and story.';msg('#jobBox','Variation prompt prepared.','success')});
$('#improveImageBtn')?.addEventListener('click',()=>{const x=$('#imagePrompt');if(x.value.trim())x.value=`High-quality ${$('#imageStyle').value} image of ${x.value.trim()}, detailed composition, realistic lighting, clean subject separation, professional framing.`;msg('#imageStatus','Prompt improved. Review it before generating.','success')});
$('#variationImageBtn')?.addEventListener('click',()=>{const x=$('#imagePrompt');if(!x.value.trim())return msg('#imageStatus','Enter an image idea first.','error');x.value += ' Create a distinct composition variation while keeping the main subject and identity consistent.';msg('#imageStatus','Variation prompt prepared.','success')});

$('#emojiBtn')?.addEventListener('click',()=>{$('#messageInput').value += ' 😊';$('#messageInput').focus()});
$('#mediaShareBtn')?.addEventListener('click',()=>$('#contactMediaFile')?.click());
$('#fileShareBtn')?.addEventListener('click',()=>$('#contactFile')?.click());
$('#voiceMessageBtn')?.addEventListener('click',()=>toast('Voice-message recording UI ready; microphone recording is enabled when browser permission is granted.'));
$('#contactMediaFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)toast(`${f.name} selected for media sharing.`)});
$('#contactFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)toast(`${f.name} selected for file sharing.`)});

$('#tnsAiNewChat')?.addEventListener('click',()=>{$('#tnsAiMessages').innerHTML='<div class="ai-message">New chat started. I am TNS AI.</div>';$('#tnsAiInput').value='';toast('New TNS AI chat started')});
$('#tnsAiResearch')?.addEventListener('click',()=>msg('#tnsAiStatus','Research mode selected. A configured search/research provider is required for live web results.','info'));
$('#tnsAiFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){$('#tnsAiMessages').insertAdjacentHTML('beforeend',`<div class="ai-message">📎 ${escapeHtml(f.name)} selected for AI understanding.</div>`);msg('#tnsAiStatus','File/image understanding request is ready for the configured TNS AI provider.','success')}});

$$('[data-open="premium"]').forEach(b=>b.addEventListener('dblclick',()=>showPanel('premiumDetails')));
$('#upgradePremiumBtn')?.addEventListener('click',()=>showPanel('premiumDetails'));
$('#openExportFromEditor')?.addEventListener('click',()=>{$('#exportQuality').value=$('#finalExportQuality').value;showPanel('editor');setTimeout(()=>$('#exportBtn')?.click(),50)});

// Add explicit navigation cards for the extra locked reference screens without changing the dashboard's 8-card layout.
const extraScreenMap={premiumDetails:'Premium Details',settingsApp:'App Settings',languageInside:'Language Selection',contactInside:'TNS Contact Privacy',editorTools:'Edit Video Tools',exportVideo:'Export Video',appIcon:'Mobile App Icon',finalEditView:'Final Editing View'};
function addExtraNavigation(){
  const help=$('#help .card');if(help&&!help.querySelector('.reference-screen-links')){help.insertAdjacentHTML('beforeend','<div class="reference-screen-links"><p class="eyebrow">TNS STUDIO SCREEN SYSTEM</p><h3>All module screens</h3><div class="screen-link-grid">'+Object.entries(extraScreenMap).map(([id,label])=>`<button data-open-screen="${id}">${escapeHtml(label)}</button>`).join('')+'</div></div>');help.querySelectorAll('[data-open-screen]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.openScreen)));}}
addExtraNavigation();

async function uploadContactAttachment(file,type='file'){
  if(!file||!currentContact)return;
  try{
    msg('#contactSectionNote',`Uploading ${file.name}…`,'info');
    const fd=new FormData();fd.append('file',file);
    const r=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Upload failed.');
    await json('/api/contact/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:currentContact.id,text:type==='voice'?'🎙️ Voice message':`📎 ${file.name}`,type,attachment:{name:file.name,url:d.media.url,size:d.media.size,contentType:d.media.contentType}})});
    await loadMessages();msg('#contactSectionNote',`${file.name} shared.`,'success');
  }catch(err){toast(err.message)}
}
$('#contactMediaFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)uploadContactAttachment(f,'media')});
$('#contactFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)uploadContactAttachment(f,'file')});
let tnsVoiceRecorder=null,tnsVoiceChunks=[];
$('#voiceMessageBtn')?.addEventListener('click',async()=>{
  if(!currentContact)return toast('Open a chat first.');
  if(tnsVoiceRecorder?.state==='recording'){tnsVoiceRecorder.stop();return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});tnsVoiceChunks=[];tnsVoiceRecorder=new MediaRecorder(stream);
    tnsVoiceRecorder.ondataavailable=e=>{if(e.data.size)tnsVoiceChunks.push(e.data)};
    tnsVoiceRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(tnsVoiceChunks,{type:'audio/webm'});const f=new File([blob],`tns-voice-${Date.now()}.webm`,{type:'audio/webm'});uploadContactAttachment(f,'voice')};
    tnsVoiceRecorder.start();toast('Recording voice message… tap 🎙️ again to stop.');
  }catch(err){toast('Microphone permission is required for voice messages.')}
});

/* ===== MASTER 24-SCREEN + FINAL FEATURE COMPLETION ===== */
(function(){
  const screenRegistry = [
    ["1","splashScreen","Splash Screen"],["2","authScreen","Login Screen"],["3","signupModal","Signup Screen"],
    ["4","otpScreen","OTP Verification"],["5","languageScreen","Language Selection"],["6","dashboard","Main Dashboard"],
    ["7","settings","TNS Studio Settings"],["8","editor","Edit Video"],["9","generate","AI Video"],["10","image","AI Image"],
    ["11","contact","TNS Contact"],["12","projects","Projects"],["13","tnsAi","TNS AI Chat"],["14","tnsAiVoice","TNS AI Voice"],
    ["15","tnsAi","TNS AI Image/File Understanding"],["16","help","Help & Support"],["17","premium","Premium"],
    ["18","settingsApp","App Settings"],["19","languageInside","Language Selection (Inside)"],["20","contactInside","TNS Contact (Inside)"],
    ["21","editorTools","Edit Video (Tools)"],["22","exportVideo","Export Video"],["23","appIcon","Mobile App Icon"],["24","finalEditView","Video Editing Final View"]
  ];
  window.TNSStudioScreenRegistry = screenRegistry;
  try {
    Object.entries(window.TNS_MODULE_SETTINGS_CONFIG||{}).forEach(([key,cfg])=>{
      if(typeof MODULE_SETTINGS!=='undefined' && !MODULE_SETTINGS[key]){
        MODULE_SETTINGS[key]={title:cfg.title||'Feature Settings',items:Object.keys(cfg.fields||{})};
      }
    });
    if(typeof moduleSettingDefaults!=='undefined'){
      Object.entries(window.TNS_MODULE_SETTINGS_CONFIG||{}).forEach(([key,cfg])=>{
        if(!moduleSettingDefaults[key]){
          const out={};
          Object.entries(cfg.fields||{}).forEach(([name,def])=>{
            out[name]=def==='boolean'?true:(Array.isArray(def)?def[0]:'');
          });
          moduleSettingDefaults[key]=out;
        }
      });
    }
  } catch {}

  // Make the 24-screen reference navigation explicit without adding Settings back to the dashboard grid.
  function addScreenSettingsButton(id,key,title){
    const panel=document.getElementById(id);
    if(!panel || panel.querySelector(`[data-module-settings="${key}"]`)) return;
    const head=panel.querySelector('.section-head');
    if(!head) return;
    const actions=head.querySelector('.section-actions');
    const btn=`<button class="icon-btn module-settings-btn" data-module-settings="${key}" title="${title}">⚙️</button>`;
    if(actions) actions.insertAdjacentHTML('afterbegin',btn);
    else {
      const wrap=document.createElement('div');
      wrap.className='section-actions';
      wrap.innerHTML=btn;
      head.appendChild(wrap);
    }
  }
  [
    ["premiumDetails","premium-details","Premium Details Settings"],["settingsApp","app-settings","App Settings"],
    ["languageInside","language-inside","Language Settings"],["contactInside","contact-inside","TNS Contact Privacy Settings"],
    ["editorTools","editor-tools","Editor Tools Settings"],["exportVideo","export-video","Export Settings"],
    ["appIcon","app-icon","Brand Settings"],["finalEditView","final-edit","Final View Settings"],
    ["tnsAiVoice","tns-ai-voice","TNS AI Voice Settings"]
  ].forEach(x=>addScreenSettingsButton(...x));

  // Continue means: accept the script/idea and start the selected generation workflow.
  document.getElementById('videoContinueBtn')?.addEventListener('click',()=>{
    const idea=document.getElementById('idea');
    if(!idea?.value.trim()) return msg('#jobBox','Paste your script or enter a video idea first.','error');
    document.getElementById('videoWorkflow')?.focus();
    msg('#jobBox','Script accepted. Choose options, then Generate AI Video.','success');
  });
  document.getElementById('imageContinueBtn')?.addEventListener('click',()=>{
    const prompt=document.getElementById('imagePrompt');
    if(!prompt?.value.trim()) return msg('#imageStatus','Enter your image idea first.','error');
    document.getElementById('imageStyle')?.focus();
    msg('#imageStatus','Idea accepted. Choose options, then Generate Image.','success');
  });

  // TNS AI voice conversation: browser speech recognition + speech synthesis, with TNS AI provider as the brain.
  let recognition=null;
  function speakTns(text){
    if(!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.rate=1; u.pitch=1;
    window.speechSynthesis.speak(u);
  }
  document.getElementById('startTnsAiVoice')?.addEventListener('click',()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return msg('#voiceStatus','Voice recognition is not supported by this browser. Use the text box instead.','error');
    if(recognition){ try{recognition.stop()}catch{} recognition=null; return; }
    recognition=new SR(); recognition.lang='en-IN'; recognition.interimResults=false; recognition.continuous=false;
    msg('#voiceStatus','Listening… speak to TNS AI.','info');
    recognition.onresult=async e=>{
      const text=String(e.results?.[0]?.[0]?.transcript||'').trim();
      if(!text) return;
      const input=document.getElementById('voiceText'); if(input) input.value=text;
      try{
        const d=await json('/api/tns-ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
        const reply=d.reply||'TNS AI is ready, but no reply was returned.';
        msg('#voiceStatus','TNS AI replied.','success'); speakTns(reply);
        const result=document.getElementById('voiceResult');
        if(result) result.innerHTML=`<div class="ai-message">${escapeHtml(reply)}</div>`;
      }catch(err){msg('#voiceStatus',err.message,'error')}
    };
    recognition.onerror=()=>msg('#voiceStatus','Microphone recognition failed or permission was denied.','error');
    recognition.onend=()=>{recognition=null};
    recognition.start();
  });

  // TNS AI image/file understanding: send a compact base64 payload to the configured provider.
  let selectedUnderstandFile=null;
  document.getElementById('tnsAiUnderstandFile')?.addEventListener('click',()=>document.getElementById('tnsAiFile')?.click());
  document.getElementById('tnsAiFile')?.addEventListener('change',e=>{
    const f=e.target.files?.[0]; selectedUnderstandFile=f||null;
    if(f) {
      const box=document.getElementById('tnsAiFilePreview');
      if(box) box.textContent=`Selected: ${f.name} • ${(f.size/1024).toFixed(0)} KB`;
    }
  });
  document.getElementById('tnsAiAnalyzeFile')?.addEventListener('click',async()=>{
    if(!selectedUnderstandFile) return msg('#tnsAiStatus','Choose an image or document first.','error');
    if(selectedUnderstandFile.size>1200*1024) return msg('#tnsAiStatus','For this browser workflow, choose a file under 1.2 MB.','error');
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        msg('#tnsAiStatus','Analyzing file with TNS AI…','info');
        const d=await json('/api/tns-ai/understand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          message:`Analyze this file: ${selectedUnderstandFile.name}`,
          file:{name:selectedUnderstandFile.name,type:selectedUnderstandFile.type,data:reader.result}
        })});
        const reply=d.reply||d.text||'TNS AI completed the analysis.';
        document.getElementById('tnsAiMessages')?.insertAdjacentHTML('beforeend',`<div class="ai-message">${escapeHtml(reply)}</div>`);
        msg('#tnsAiStatus','Analysis complete.','success');
      }catch(err){msg('#tnsAiStatus',err.message,'error')}
    };
    reader.readAsDataURL(selectedUnderstandFile);
  });

  // TNS Contact location sharing, keeping the communication UI original to TNS Contact.
  if(!document.getElementById('locationShareBtn')){
    const tools=document.querySelector('.tns-composer-tools');
    if(tools){
      const b=document.createElement('button'); b.id='locationShareBtn'; b.type='button'; b.title='Share location'; b.textContent='📍'; tools.appendChild(b);
      b.addEventListener('click',()=>{
        if(!navigator.geolocation) return toast('Location sharing is not supported on this device/browser.');
        navigator.geolocation.getCurrentPosition(pos=>{
          const text=`📍 TNS Contact location: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          const input=document.getElementById('messageInput'); if(input){input.value=text;input.focus();}
          toast('Location added to the message. Tap Send to share it.');
        },()=>toast('Location permission was denied.'));
      });
    }
  }

  // Real editor operations. UI buttons now execute authenticated server-side FFmpeg operations where supported.
  async function runEditorTool(tool) {
    if(!currentMedia) return msg('#editStatus','Import a video first.','error');
    const status=document.getElementById('toolMessage');
    const setStatus=(text,cls='')=>{if(status){status.textContent=text;status.className=`status ${cls}`.trim();}};
    const value=(id,fallback='')=>document.getElementById(id)?.value ?? fallback;
    const numeric=(id,fallback=0)=>Number(value(id,fallback));
    let body={inputPath:currentMedia.url,tool};
    if(tool==='Merge'){ if(!window.editorClips?.length && !editorClips.length) return msg('#editStatus','Add at least 2 video clips first.','error'); body.inputPaths=(window.editorClips||editorClips).map(m=>m.url); }
    if(['Music','SFX','Voice Over','Voice Recorder'].includes(tool)){ if(!window.editorAudio) return msg('#editStatus','Add an audio file first.','error'); body.audioPath=window.editorAudio.url; }

    if(tool==='Split') body.splitAt=Number(prompt('Split video at which time (seconds)?',String(Math.max(1,Math.floor(numeric('trimStart',0)+1)))))||0;
    if(tool==='Crop') { body.width=Number(prompt('Crop width (px)', '720'))||720; body.height=Number(prompt('Crop height (px)', '1280'))||1280; body.x=Number(prompt('Crop X (px)', '0'))||0; body.y=Number(prompt('Crop Y (px)', '0'))||0; }
    if(tool==='Resize') { body.width=Number(prompt('Output width (px)', '1080'))||1080; body.height=Number(prompt('Output height (px)', '1920'))||1920; }
    if(tool==='Flip') body.direction=(prompt('Flip direction: horizontal or vertical','horizontal')||'horizontal').toLowerCase();
    if(tool==='Freeze Frame') body.duration=Number(prompt('Freeze last frame for how many seconds?','2'))||2;
    if(tool==='Blur') body.strength=Number(prompt('Blur strength (1-32)','8'))||8;
    if(tool==='Noise Cleanup') body.amount=Number(prompt('Noise cleanup strength (1-97)','12'))||12;
    if(tool==='Chroma Key'||tool==='Green Screen') { body.color=prompt('Key color (hex, e.g. 0x00ff00)','0x00ff00')||'0x00ff00'; body.similarity=Number(prompt('Similarity (0.01-0.9)','0.1'))||0.1; }
    if(tool==='Text') { body.text=prompt('Text to place on the video','TNS Studio')||''; body.fontSize=Number(prompt('Font size','48'))||48; }
    if(tool==='Auto Reframe') { body.width=Number(prompt('Target width','1080'))||1080; body.height=Number(prompt('Target height','1920'))||1920; }
    if(tool==='Trim'||tool==='Cut') { body.start=numeric('trimStart',0); body.duration=numeric('trimDuration',0); }

    // These are already part of the real export pipeline.
    const exportTools={
      'Speed':{speed:numeric('speed',1)},
      'Rotate':{rotate:numeric('rotate',0)},
      'Brightness':{brightness:numeric('brightness',0)},
      'Contrast':{contrast:numeric('contrast',1)},
      'Saturation':{saturation:numeric('saturation',1)},
      'Sharpness':{sharpness:numeric('sharpness',0)},
      'Volume':{volume:numeric('volume',1)},
      'Filter':{filter:value('filter','none')},
      'Fade In':{fadeIn:numeric('fadeIn',0)},
      'Fade Out':{fadeOut:numeric('fadeOut',0)},
      'Normalize Audio':null,
      'Mute':null
    };

    try{
      setStatus(`${tool}: processing…`);
      let data;
      if(Object.prototype.hasOwnProperty.call(exportTools,tool) && !['Normalize Audio','Mute'].includes(tool)){
        const d=await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputPath:currentMedia.url,...exportTools[tool],quality:Number(value('exportQuality',1080))||1080})});
        data={result:d.result};
      }else{
        if(tool==='Normalize Audio') body.tool='normalize audio';
        if(tool==='Mute') body.tool='mute';
        data=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }

      if(data.results?.length){
        const links=data.results.map((r,i)=>{const a=document.createElement('a');a.href=r.url;a.download=r.fileName;a.textContent=`Download part ${i+1}`;a.className='download-btn';return a;});
        const box=document.getElementById('toolMessage');
        if(box){box.textContent='Split complete.';box.replaceChildren(document.createTextNode('Split complete — '),...links.flatMap((a,i)=>i?[document.createTextNode(' '),a]:[a]));}
        currentMedia={...currentMedia,...data.results[0],originalName:data.results[0].fileName};
        document.getElementById('preview').src=currentMedia.url;
        document.getElementById('preview').load();
      }else if(data.result){
        currentMedia={...currentMedia,...data.result,originalName:data.result.fileName};
        document.getElementById('preview').src=currentMedia.url;
        document.getElementById('preview').load();
        setStatus(`${tool} complete. Preview updated.`);
      }
      msg('#editStatus',`${tool} completed successfully.`,'success');
    }catch(err){setStatus(`${tool} failed: ${err.message}`,'error');msg('#editStatus',err.message,'error');}
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-tool]');
    if(!btn) return;
    const tool=btn.dataset.tool||'Tool';
    runEditorTool(tool);
  });

  // Ensure every numbered reference screen can reach its own settings without changing the dashboard grid.
  window.addEventListener('load',()=>{
    const seen=new Set();
    screenRegistry.forEach(([n,id])=>{
      if(seen.has(id) || id==='signupModal' || id==='splashScreen') return;
      seen.add(id);
      const panel=document.getElementById(id);
      if(panel && !panel.querySelector('.module-settings-btn')) addScreenSettingsButton(id,`screen-${n}`,`Screen ${n} Settings`);
    });
  });
})();

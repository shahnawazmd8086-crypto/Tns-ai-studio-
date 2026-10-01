const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const LANGS=(window.TNSLanguageRegistry||[]).map(x=>[x.nativeName||x.name,(x.nativeName||x.name).slice(0,2),x.code,x.name,x.rtl]);
let selectedLang=null,otpIdentifier=null,currentMedia=null,currentContact=null,currentGroup=null,authenticatedUser=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function msg(id,text,type='info'){const e=$(id);if(!e)return;e.textContent=text;e.dataset.type=type}
async function json(url,options={}){const r=await fetch(url,{credentials:'include',...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||d.message||'Request failed.');return d}
function showPanel(id){$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='projects')renderProjects();if(id==='contact')loadContacts();if(id==='profile')renderProfile();}
function renderProfile(){const u=currentUser()||{};const identifier=u.email||u.mobile||'Signed in account';const name=u.name||u.displayName||'TNS Studio User';const avatar=(name.trim()[0]||'👤').toUpperCase();$('#profileName')&&($('#profileName').textContent=name);$('#profileIdentifier')&&($('#profileIdentifier').textContent=identifier);$('#profileAccountId')&&($('#profileAccountId').textContent=u.id||'—');$('#profileLoginType')&&($('#profileLoginType').textContent=u.mobile?'Mobile Number':u.email?'Email':'Account');$('#profileAvatar')&&($('#profileAvatar').textContent=avatar)}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.open)));
function showAuthScreens(which){['authScreen','otpScreen','languageScreen'].forEach(id=>$( '#'+id).classList.toggle('hidden',id!==which))}
function currentUser(){return authenticatedUser}
function setUser(u){authenticatedUser=u||null;window.TNSAuth?.setLoggedIn?.(u||null)}
function projectKey(){const u=currentUser();return 'tnsStudioProjects_'+(u?.id||'guest').replace(/[^a-z0-9_-]/gi,'_')}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderLanguages(filter=''){
  const q=String(filter||'').trim().toLowerCase();
  const grid=$('#languageGrid');
  const meta=$('#languageResultsMeta');
  const matches=LANGS.filter(x=>x[0].toLowerCase().includes(q)||x[3].toLowerCase().includes(q)||x[2].toLowerCase().includes(q));
  matches.sort((a,b)=>{
    const score=x=>x[3].toLowerCase()===q?0:(x[3].toLowerCase().startsWith(q)||x[0].toLowerCase().startsWith(q))?1:2;
    return score(a)-score(b)||a[3].localeCompare(b[3]);
  });
  const limit=q?500:300;
  const visible=matches.slice(0,limit);
  grid.innerHTML=visible.map(x=>`<button class="language-option ${selectedLang===x[2]?'selected':''}" data-lang="${x[2]}"><span class="lang-icon">${escapeHtml(x[1])}</span><span><b>${escapeHtml(x[3])}</b><small>${escapeHtml(x[0])} · ${x[2].toUpperCase()}</small></span></button>`).join('');
  if(meta) meta.textContent=matches.length>visible.length?`Showing ${visible.length} of ${matches.length} languages — use search to find any language.`:`${matches.length} language${matches.length===1?'':'s'} available`;
  $$('.language-option').forEach(b=>b.addEventListener('click',()=>{
    selectedLang=b.dataset.lang;
    localStorage.setItem('tnsStudioLanguage',selectedLang);
    applyLanguageMeta(selectedLang);
    renderLanguages($('#languageSearch').value);
    $('#continueLanguage').disabled=false;
  }));
}
function startLanguage(){selectedLang=localStorage.getItem('tnsStudioLanguage');renderLanguages();$('#continueLanguage').disabled=!selectedLang;showAuthScreens('languageScreen')}
$('#languageBackBtn')?.addEventListener('click',()=>{showAuthScreens('otpScreen');});
$('#languageSearch')?.addEventListener('input',e=>renderLanguages(e.target.value));$('#continueLanguage')?.addEventListener('click',()=>{showAuthScreens(null);$('#languageScreen').classList.add('hidden');$('#app').classList.remove('hidden');showPanel('dashboard');bootDashboard()});
function bootDashboard(){loadSettings();applyLanguageMeta(localStorage.getItem('tnsStudioLanguage')||'en');renderProjects()}
function initMasterScreenLinks(){
  document.querySelectorAll('[data-open-screen]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.openScreen)));
}

function applyLanguageMeta(code){const item=(window.TNSLanguageRegistry||[]).find(x=>x.code===code);document.documentElement.lang=code||'en';document.documentElement.dir=item?.rtl?'rtl':'ltr'}
function renderCountrySelect(id){const select=$(id);if(!select)return;const list=window.TNSCountryConfig?.countries||[];select.innerHTML=list.map(([code,name,calling])=>`<option value="${calling}" data-country="${code}">${escapeHtml(name)} ${calling}</option>`).join('');const wanted=window.TNSCountryConfig?.defaultCallingCode||'+91';select.value=wanted;}
function countryCallingCode(id){return String($(id)?.value||'').trim();}
function normalizeMobileInput(number,code){const digits=String(number||'').replace(/\D/g,'');const calling=String(code||'').replace(/[^0-9+]/g,'');if(!digits||!calling)return '';return `${calling}${digits}`;}
function getAuthMode(){return document.querySelector('.auth-mode.active')?.dataset.authMode||'email'}
function setAuthMode(mode){$$('.auth-mode').forEach(x=>{if(x.closest('#forgotPasswordModal'))return;x.classList.toggle('active',x.dataset.authMode===mode)});const mobile=mode==='mobile';$('#emailField')?.classList.toggle('hidden',mobile);$('#mobileField')?.classList.toggle('hidden',!mobile);$('#otpRequestBtn')?.classList.toggle('hidden',!mobile);$('#loginEmail')?.toggleAttribute('required',!mobile);$('#loginMobile')?.toggleAttribute('required',mobile)}
$$('.auth-mode').forEach(b=>{if(b.closest('#forgotPasswordModal'))return;b.addEventListener('click',()=>setAuthMode(b.dataset.authMode))});
renderCountrySelect('#loginCountry');renderCountrySelect('#signupCountry');renderCountrySelect('#forgotCountry');setAuthMode('email');
function togglePassword(id){const i=$(id);if(!i)return;const show=i.type==='password';i.type=show?'text':'password';const map={'#loginPassword':'#showPassword','#signupPassword':'#showSignupPassword','#signupConfirm':'#showSignupConfirm','#forgotNewPassword':'#showForgotNew','#forgotConfirmPassword':'#showForgotConfirm'};const button=$(map[id]);if(button){button.setAttribute('aria-label',show?'Hide password':'Show password');button.setAttribute('title',show?'Hide password':'Show password');}}
$('#showPassword')?.addEventListener('click',()=>togglePassword('#loginPassword'));$('#showSignupPassword')?.addEventListener('click',()=>togglePassword('#signupPassword'));$('#showSignupConfirm')?.addEventListener('click',()=>togglePassword('#signupConfirm'));
function getLoginIdentifier(){if(getAuthMode()==='mobile'){const mobile=normalizeMobileInput($('#loginMobile')?.value,countryCallingCode('#loginCountry'));if(!mobile)throw new Error('Enter your mobile number and select your country code.');return mobile}const email=String($('#loginEmail')?.value||'').trim().toLowerCase();if(!email)throw new Error('Email address is required.');return email}
$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const identifier=getLoginIdentifier();const password=$('#loginPassword').value;if(password.length<8)throw new Error('Password must be at least 8 characters.');msg('#loginMessage','Signing in…');const d=await json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier,password})});setUser(d.user);window.__tnsPasswordLoginPending=false;otpIdentifier=null;msg('#loginMessage',d.message||'Login successful.','success');toast('Login successful');startLanguage()}catch(err){msg('#loginMessage',err.message,'error')}});
$('#signupOpen')?.addEventListener('click',()=>$('#signupModal').classList.remove('hidden'));$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).classList.add('hidden')));
$('#signupBtn')?.addEventListener('click',async()=>{const email=$('#signupEmail').value.trim().toLowerCase(),mobileRaw=$('#signupMobile').value.trim(),mobile=mobileRaw?normalizeMobileInput(mobileRaw,countryCallingCode('#signupCountry')):null,password=$('#signupPassword').value,confirm=$('#signupConfirm').value;if(!email&&!mobile)return msg('#signupMessage','Enter an email or mobile number.','error');if(password.length<8)return msg('#signupMessage','Password must be at least 8 characters long. Choose your own password.','error');if(password!==confirm)return msg('#signupMessage','Passwords do not match.','error');try{const d=await json('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,mobile,password})});setUser(d.user);$('#signupModal').classList.add('hidden');toast('Account created');startLanguage()}catch(err){msg('#signupMessage',err.message,'error')}});
$('#googleBtn')?.addEventListener('click',()=>{window.location.href='/api/auth/google'});
async function requestOtp(){try{window.__tnsPasswordLoginPending=false;otpIdentifier=getLoginIdentifier();const d=await json('/api/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier})});showAuthScreens('otpScreen');$('#otpHint').textContent=d.otp?`Demo OTP: ${d.otp}`:'Enter the OTP sent to you.';resetOtpBoxes();startOtpResendTimer()}catch(err){msg('#loginMessage',err.message,'error')}}
function resetOtpBoxes(){document.querySelectorAll('.otp-digit').forEach(i=>i.value='');syncOtpCode();const first=document.querySelector('.otp-digit');first?.focus()}
function syncOtpCode(){const code=[...document.querySelectorAll('.otp-digit')].map(i=>i.value.replace(/\D/g,'')).join('').slice(0,6);const hidden=$('#otpCode');if(hidden)hidden.value=code;return code}
let otpResendInterval=null;function startOtpResendTimer(){clearInterval(otpResendInterval);let seconds=120;const timer=$('#otpResendTimer'),button=$('#resendOtpBtn');if(button)button.disabled=true;const tick=()=>{if(timer)timer.textContent=`(${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')})`;if(seconds<=0){clearInterval(otpResendInterval);if(button)button.disabled=false;if(timer)timer.textContent=''}seconds--};tick();otpResendInterval=setInterval(tick,1000)}
function initOtpBoxes(){const boxes=[...document.querySelectorAll('.otp-digit')];boxes.forEach((box,index)=>{box.addEventListener('input',()=>{box.value=box.value.replace(/\D/g,'').slice(-1);syncOtpCode();if(box.value&&boxes[index+1])boxes[index+1].focus()});box.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!box.value&&boxes[index-1])boxes[index-1].focus()});box.addEventListener('paste',event=>{const pasted=(event.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);if(!pasted)return;event.preventDefault();boxes.forEach((b,i)=>b.value=pasted[i]||'');syncOtpCode();(boxes[Math.min(pasted.length,6)-1]||boxes[0])?.focus()})})}initOtpBoxes();
$('#otpRequestBtn')?.addEventListener('click',requestOtp);$('#resendOtpBtn')?.addEventListener('click',async()=>{try{const d=await json('/api/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier})});$('#otpMessage').textContent='';if(d.otp)$('#otpHint').textContent=`Demo OTP: ${d.otp}`;startOtpResendTimer();resetOtpBoxes()}catch(err){msg('#otpMessage',err.message,'error')}});
$('#verifyOtpBtn')?.addEventListener('click',async()=>{try{syncOtpCode();if(!/^\d{6}$/.test($('#otpCode').value))throw new Error('Enter the 6-digit OTP.');let d;if(window.__tnsPasswordLoginPending){d=await json('/api/auth/otp/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier,code:$('#otpCode').value})});if(!d.success)throw new Error(d.message||'OTP verification failed.')}else{d=await json('/api/auth/otp/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier,code:$('#otpCode').value})});setUser(d.user)}window.__tnsPasswordLoginPending=false;toast('OTP verified');startLanguage()}catch(err){msg('#otpMessage',err.message,'error')}});$('#backToLogin')?.addEventListener('click',()=>{window.__tnsPasswordLoginPending=false;showAuthScreens('authScreen')});

// Forgot-password flow: request reset OTP, then verify it and save the user's own new password.
let forgotMode='email',forgotIdentifier='';
function setForgotMode(mode){forgotMode=mode;$('#forgotEmailField')?.classList.toggle('hidden',mode!=='email');$('#forgotMobileField')?.classList.toggle('hidden',mode!=='mobile');$('#forgotEmailMode')?.classList.toggle('active',mode==='email');$('#forgotMobileMode')?.classList.toggle('active',mode==='mobile')}
function getForgotIdentifier(){if(forgotMode==='mobile'){const mobile=normalizeMobileInput($('#forgotMobile')?.value,countryCallingCode('#forgotCountry'));if(!mobile)throw new Error('Enter your mobile number and select your country code.');return mobile}const email=String($('#forgotEmail')?.value||'').trim().toLowerCase();if(!email)throw new Error('Email address is required.');return email}
$('#forgotPasswordBtn')?.addEventListener('click',()=>{$('#forgotPasswordModal')?.classList.remove('hidden');setForgotMode('email');$('#forgotPasswordMessage').textContent='';$('#forgotResetFields')?.classList.add('hidden')});$('#forgotEmailMode')?.addEventListener('click',()=>setForgotMode('email'));$('#forgotMobileMode')?.addEventListener('click',()=>setForgotMode('mobile'));$('#showForgotNew')?.addEventListener('click',()=>togglePassword('#forgotNewPassword'));$('#showForgotConfirm')?.addEventListener('click',()=>togglePassword('#forgotConfirmPassword'));
$('#forgotRequestBtn')?.addEventListener('click',async()=>{try{forgotIdentifier=getForgotIdentifier();const d=await json('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:forgotIdentifier})});$('#forgotResetFields')?.classList.remove('hidden');$('#forgotPasswordMessage').textContent=d.otp?`OTP sent. Demo OTP: ${d.otp}`:(d.message||'OTP sent through the configured channel.');$('#forgotPasswordMessage').dataset.type='success'}catch(err){msg('#forgotPasswordMessage',err.message,'error')}});
$('#forgotResetBtn')?.addEventListener('click',async()=>{try{const otp=String($('#forgotOtp')?.value||'').trim(),password=String($('#forgotNewPassword')?.value||''),confirm=String($('#forgotConfirmPassword')?.value||'');if(!/^\d{6}$/.test(otp))throw new Error('Enter the 6-digit OTP.');if(password.length<8)throw new Error('New password must be at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');const d=await json('/api/auth/password/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:forgotIdentifier,otp,newPassword:password})});msg('#forgotPasswordMessage',d.message||'Password reset successfully.','success');setTimeout(()=>$('#forgotPasswordModal')?.classList.add('hidden'),700)}catch(err){msg('#forgotPasswordMessage',err.message,'error')}});

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
$('#generateBtn')?.addEventListener('click',async()=>{const idea=$('#idea').value.trim();if(!idea)return msg('#jobBox','Describe your video first.','error');if(document.getElementById('videoStep2')?.classList.contains('hidden'))return msg('#jobBox','Press Continue first, then choose your video settings.','error');const ref=$('#videoReference')?.files?.[0];msg('#jobBox',ref?'Uploading reference media…':'Preparing your AI video…');try{let referenceUrl=null;if(ref){const fd=new FormData();fd.append('file',ref,ref.name);const uploaded=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const ud=await uploaded.json();if(!uploaded.ok)throw new Error(ud.error||'Reference upload failed.');referenceUrl=ud.media?.url||null;}msg('#jobBox','Generating video…');const d=await json('/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:idea,duration:Number($('#duration').value),format:$('#format').value,style:$('#style').value,quality:$('#videoQuality').value,camera:$('#videoCamera')?.value,characterConsistency:$('#characterConsistency')?.value,workflow:$('#videoWorkflow')?.value,negativePrompt:$('#videoNegativePrompt')?.value,referenceUrl,referenceName:ref?.name||null})});const job=d.status==='completed'?d:await waitForMediaJob('video',d.id||d.job?.id);const url=job.result?.url;if(!url)throw new Error('Video generation completed without a video result.');$('#videoResult').innerHTML=`<video controls playsinline src="${url}"></video><div class="video-result-meta"><span>${job.result?.width||''}×${job.result?.height||''}</span><span>${job.result?.duration||Number($('#duration').value)}s</span><span>${job.result?.mode==='local-fallback'?'Preview mode':'AI provider'}</span></div><a class="download-btn" href="${url}" download="tns-studio-ai-video.mp4">⬇ Download Video</a>`;msg('#jobBox','Video ready.','success');saveProject('AI Video',idea)}catch(err){msg('#jobBox',err.message,'error')}});
$('#generateImageBtn')?.addEventListener('click',async()=>{const prompt=$('#imagePrompt').value.trim();if(!prompt)return msg('#imageStatus','Describe your image first.','error');if(document.getElementById('imageStep2')?.classList.contains('hidden'))return msg('#imageStatus','Press Continue first, then choose your image settings.','error');msg('#imageStatus','Generating image…');try{const ref=$('#imageReference')?.files?.[0];let referenceUrl=null;if(ref){msg('#imageStatus','Uploading reference image…');const fd=new FormData();fd.append('file',ref,ref.name);const uploaded=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const ud=await uploaded.json();if(!uploaded.ok)throw new Error(ud.error||'Reference image upload failed.');referenceUrl=ud.media?.url||null;}msg('#imageStatus','Generating image…');const d=await json('/api/image/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:$('#imageStyle').value,ratio:$('#imageRatio').value,quality:$('#imageQuality')?.value||'HD',variations:Number($('#imageVariations')?.value||1),characterConsistency:$('#imageCharacter')?.value||'Standard',negativePrompt:$('#imageNegativePrompt')?.value||'',referenceUrl,referenceName:ref?.name||null})});const job=d.status==='completed'?d:await waitForMediaJob('image',d.id||d.job?.id);const result=job.result||{};const url=result.url;if(!url)throw new Error('Image generation completed without an image result.');const variations=result.variations||[result];$('#imagePreviewBox').innerHTML=variations.map((v,i)=>`<div class="image-variation"><img src="${escapeHtml(v.url)}" alt="Generated by TNS Studio variation ${i+1}"><a class="download-btn" href="${escapeHtml(v.url)}" download="tns-studio-ai-image-${i+1}.jpg">⬇ Download ${variations.length>1?`Variation ${i+1}`:'Image'}</a></div>`).join('');const a=$('#imageDownload');a.href=url;a.classList.remove('hidden');a.textContent='⬇ Download Selected Image';msg('#imageStatus',`${variations.length} image${variations.length===1?'':'s'} ready.`,'success');saveProject('AI Image',prompt)}catch(err){msg('#imageStatus',err.message,'error')}});
let editorVoiceRecorder=null; let editorVoiceChunks=[]; let editorVoiceStream=null;
$('#recordEditorVoice')?.addEventListener('click',async()=>{
  const btn=$('#recordEditorVoice');
  try{
    if(editorVoiceRecorder && editorVoiceRecorder.state==='recording'){editorVoiceRecorder.stop();btn.textContent='🎙️ Record Voice Over';return;}
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw Error('Voice recording is not supported in this browser.');
    editorVoiceStream=await navigator.mediaDevices.getUserMedia({audio:true});
    editorVoiceChunks=[]; editorVoiceRecorder=new MediaRecorder(editorVoiceStream);
    editorVoiceRecorder.ondataavailable=e=>{if(e.data.size) editorVoiceChunks.push(e.data);};
    editorVoiceRecorder.onstop=async()=>{
      editorVoiceStream?.getTracks().forEach(t=>t.stop());
      const blob=new Blob(editorVoiceChunks,{type:editorVoiceRecorder.mimeType||'audio/webm'});
      const ext=(blob.type.includes('mp4')||blob.type.includes('m4a'))?'m4a':(blob.type.includes('ogg')?'ogg':'webm');
      const fd=new FormData();fd.append('file',blob,`tns-voice-over.${ext}`);
      try{msg('#editStatus','Uploading recorded voice-over…');const r=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const d=await r.json();if(!r.ok)throw Error(d.error||'Voice upload failed.');window.editorAudio=d.media;msg('#editStatus','Voice-over recorded and ready. Tap Voice Over.','success');}catch(err){msg('#editStatus',err.message,'error');}
    };
    editorVoiceRecorder.start();btn.textContent='⏹ Stop Recording';msg('#editStatus','Recording voice-over… speak now.','success');
  }catch(err){msg('#editStatus',err.message,'error');}
});

$('#preview')?.addEventListener('timeupdate',()=>{const v=$('#preview');const s=Math.floor(v.currentTime||0);$('#timelineTime').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`});$('#volume')?.addEventListener('input',e=>$('#preview').volume=Number(e.target.value));
$('#exportBtn')?.addEventListener('click',async()=>{
  const c=editorApi();
  if(!currentMedia && !c?.state.timeline.length)return msg('#editStatus','Import a video first.','error');
  msg('#editStatus','Exporting your TNS Studio project…');
  try{
    const q=Number($('#exportQuality').value||1080); const ratio=$('#exportRatio')?.value||'9:16';
    const d=c?.state.timeline.length?await c.exportProject({quality:q,ratio,fps:30,videoBitrate:q>=2160?'20M':q>=1440?'12M':'8M',audioBitrate:'192k'}):await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputPath:currentMedia.url,trimStart:Number($('#trimStart').value||0),trimDuration:Number($('#trimDuration').value||0),brightness:Number($('#brightness').value||0),contrast:Number($('#contrast').value||1),filter:$('#filter').value,rotate:$('#rotate').value,speed:Number($('#speed').value||1),volume:Number($('#volume').value||1),saturation:Number($('#saturation')?.value||1),sharpness:Number($('#sharpness')?.value||0),fadeIn:Number($('#fadeIn')?.value||0),fadeOut:Number($('#fadeOut')?.value||0),quality:q,ratio})});
    const a=document.createElement('a');a.href=d.result.url;a.download=d.result.fileName||'tns-studio-export.mp4';a.className='download-btn';a.textContent='⬇ Download exported MP4';$('#editStatus').replaceChildren(document.createTextNode('Export complete — '),a);saveProject('Edited Video',currentMedia?.originalName||'TNS Studio Edit');
  }catch(err){msg('#editStatus',err.message,'error')}
});
$('#resetVideo')?.addEventListener('click',()=>{if($('#preview').src?.startsWith('blob:'))URL.revokeObjectURL($('#preview').src);$('#preview').removeAttribute('src');$('#preview').load();$('#videoFile').value='';currentMedia=null;window.currentMedia=null;editorApi()?.reset();renderEditorTimeline();msg('#editStatus','Editor reset.')});
$('#generateVoiceBtn')?.addEventListener('click',async()=>{const text=$('#voiceText').value.trim();if(!text)return msg('#voiceStatus','Enter text first.','error');msg('#voiceStatus','TNS AI is preparing a reply…','info');try{const d=await json('/api/tns-ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});const reply=d.reply||d.text||'TNS AI did not return a reply.';$('#voiceResult').innerHTML=`<div class="ai-message">${escapeHtml(reply)}</div><button id="replayTnsVoice" class="secondary" type="button">🔊 Play Reply</button>`;$('#replayTnsVoice').onclick=()=>speakTns(reply);speakTns(reply);msg('#voiceStatus','TNS AI replied with voice playback.','success')}catch(err){msg('#voiceStatus',err.message,'error')}});
let tnsAiResearchMode=false;
let tnsAiHistory=JSON.parse(localStorage.getItem('tnsAiHistory')||'[]');
function saveTnsAiHistory(user,reply){tnsAiHistory.unshift({id:Date.now(),user,reply,date:new Date().toISOString()});tnsAiHistory=tnsAiHistory.slice(0,20);localStorage.setItem('tnsAiHistory',JSON.stringify(tnsAiHistory));renderTnsAiHistory();}
function renderTnsAiHistory(){const el=$('#tnsAiHistory');if(!el)return;el.innerHTML=tnsAiHistory.length?tnsAiHistory.slice(0,6).map((x,i)=>`<button class="history-chip" data-history-index="${i}">${escapeHtml(x.user.slice(0,42))}</button>`).join(''):'<span class="muted">No previous chats yet.</span>';$$('[data-history-index]').forEach(b=>b.addEventListener('click',()=>{const x=tnsAiHistory[Number(b.dataset.historyIndex)];if(!x)return;$('#tnsAiMessages').innerHTML=`<div class="ai-message mine">${escapeHtml(x.user)}</div><div class="ai-message">${escapeHtml(x.reply)}</div>`;}));}
renderTnsAiHistory();
$('#tnsAiForm')?.addEventListener('submit',async e=>{e.preventDefault();const input=$('#tnsAiInput').value.trim();if(!input)return;const box=$('#tnsAiMessages');box.insertAdjacentHTML('beforeend',`<div class="ai-message mine">${escapeHtml(input)}</div>`);$('#tnsAiInput').value='';msg('#tnsAiStatus',tnsAiResearchMode?'Research mode: working…':'TNS AI is thinking…','info');try{const d=await json('/api/tns-ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input,research:tnsAiResearchMode})});const reply=d.reply||'TNS AI returned no reply.';box.insertAdjacentHTML('beforeend',`<div class="ai-message">${escapeHtml(reply)}</div>`);box.scrollTop=box.scrollHeight;saveTnsAiHistory(input,reply);msg('#tnsAiStatus',tnsAiResearchMode?'Research response ready.':'Response ready.','success');}catch(err){box.insertAdjacentHTML('beforeend',`<div class="ai-message error">${escapeHtml(err.message)}</div>`);msg('#tnsAiStatus',err.message,'error');}});
$('#tnsAiVoiceMode')?.addEventListener('click',()=>{document.getElementById('tnsAiVoice')?.scrollIntoView({behavior:'smooth'});msg('#tnsAiStatus','Voice mode selected. Use Start Voice Conversation for microphone input.','info')});
$('#tnsAiChatMode')?.addEventListener('click',()=>{document.getElementById('tnsAiInput')?.focus();msg('#tnsAiStatus','Chat mode selected.','success')});
$('#tnsAiNewChat')?.addEventListener('click',()=>{$('#tnsAiMessages').innerHTML='<div class="ai-message">New chat started. I am TNS AI. How can I help you today?</div>';$('#tnsAiInput').value='';tnsAiResearchMode=false;msg('#tnsAiStatus','New TNS AI chat started.','success')});
$('#tnsAiResearch')?.addEventListener('click',()=>{tnsAiResearchMode=!tnsAiResearchMode;const b=$('#tnsAiResearch');if(b)b.textContent=tnsAiResearchMode?'🔎 Research On':'🔎 Research';msg('#tnsAiStatus',tnsAiResearchMode?'Research mode enabled. Send a question to continue.':'Research mode disabled.','info')});
$('#tnsAiUpload')?.addEventListener('click',()=>$('#tnsAiFile')?.click());
$('#tnsAiFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){const box=$('#tnsAiFilePreview');if(box)box.textContent=`Selected: ${f.name} • ${(f.size/1024).toFixed(0)} KB`;msg('#tnsAiStatus',`${f.name} selected. Tap Analyze with TNS AI below.`,'info')}});
function saveProject(type,title){const key=projectKey();const list=JSON.parse(localStorage.getItem(key)||'[]');list.unshift({id:crypto.randomUUID?.()||String(Date.now()),type,title,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(0,30)));renderProjects()}
function renderProjects(){const list=JSON.parse(localStorage.getItem(projectKey())||'[]');$('#projectList').innerHTML=list.length?list.map(p=>`<div class="project-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)} • ${new Date(p.date).toLocaleString()}</small></div><span class="muted">Saved</span></div>`).join(''):'<p class="muted">No projects yet. Start creating.</p>';$('#recentProjects').innerHTML=list.slice(0,4).map(p=>`<div class="recent-card"><span>🎬</span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)}</small></div>`).join('')||'<div class="recent-card"><span>✨</span><b>Your creations appear here</b><small>Start with any creator tool.</small></div>'}
$('#clearBtn')?.addEventListener('click',()=>{localStorage.removeItem(projectKey());renderProjects();toast('Local projects cleared')});
async function loadContacts(){try{const d=await json('/api/contact/users');const g=await json('/api/contact/groups');renderContacts(d.users||[],false,g.groups||[])}catch(err){$('#contactList').innerHTML=`<p class="muted">${escapeHtml(err.message)}</p>`}}
async function renderContacts(users, showHidden=false, groups=[]){
  const decorated=await Promise.all(users.map(async u=>{
    try{const d=await json('/api/contact/settings?with='+encodeURIComponent(u.id));return {...u,security:d.settings||{}}}
    catch{return {...u,security:{}}}
  }));
  const visible=decorated.filter(u=>showHidden?u.security.hidden:!u.security.hidden);
  const groupButtons=groups.map(g=>`<button class="contact-item ${currentGroup?.id===g.id?'active':''}" data-group="${escapeHtml(g.id)}"><span class="avatar">✦</span><span><b>${escapeHtml(g.name)}</b><small>Group • ${g.members.length} member${g.members.length===1?'':'s'}</small></span></button>`).join('');
  const userButtons=visible.map(u=>`<button class="contact-item ${currentContact?.id===u.id?'active':''}" data-contact="${u.id}"><span class="avatar">${escapeHtml((u.email||u.mobile||'T').slice(0,1).toUpperCase())}</span><span><b>${escapeHtml(u.email||u.mobile||'TNS User')}</b><small>${u.security.locked?'🔒 Locked':'Available on TNS Studio'}</small></span></button>`).join('');
  $('#contactList').innerHTML=(groupButtons+userButtons)||`<p class="muted">${showHidden?'No hidden chats.':'No registered TNS users or groups yet.'}</p>`;
  $$('[data-contact]').forEach(b=>b.addEventListener('click',()=>openChat(decorated.find(u=>u.id===b.dataset.contact))));
  $$('[data-group]').forEach(b=>b.addEventListener('click',async()=>{const groupsNow=(await json('/api/contact/groups')).groups||[];openGroup(groupsNow.find(g=>g.id===b.dataset.group));}));
}
$('#contactSearch')?.addEventListener('input',async e=>{try{const d=await json('/api/contact/users?q='+encodeURIComponent(e.target.value));renderContacts(d.users||[])}catch{}});
async function openGroup(g){if(!g)return;currentGroup=g;currentContact=null;$('#chatEmpty').classList.add('hidden');$('#chatView').classList.remove('hidden');$('#chatName').textContent=g.name;$('#chatPresence').textContent=`TNS Contact group • ${g.members.length} members`;ensureChatSecurityButtons();try{const d=await json('/api/contact/group-messages?groupId='+encodeURIComponent(g.id));$('#messages').innerHTML=(d.messages||[]).map(m=>`<div class="message ${m.from===currentUser()?.id?'mine':''}">${escapeHtml(m.text)}<small>${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>`).join('');}catch(err){toast(err.message)}}
async function openChat(u){if(!u)return;try{const sec=await json('/api/contact/settings?with='+encodeURIComponent(u.id));if(sec.settings?.locked){const password=prompt('This chat is locked. Enter your TNS Studio password to open it.');if(password===null)return;await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:u.id,action:'unlockCheck',password})})}}catch(err){if(err.message==='Incorrect TNS Studio password.')return toast(err.message);if(err.message&&!err.message.includes('Invalid contact security action'))return toast(err.message)}currentContact=u;$('#chatEmpty').classList.add('hidden');$('#chatView').classList.remove('hidden');$('#chatName').textContent=u.email||u.mobile;$('#chatPresence').textContent='TNS Studio user';ensureChatSecurityButtons();await loadMessages();loadContacts()}
function ensureChatSecurityButtons(){const head=document.querySelector('.chat-head .chat-actions');if(!head||head.querySelector('#lockChatBtn'))return;head.insertAdjacentHTML('afterbegin','<button id="lockChatBtn" title="Lock this chat">🔒</button><button id="hideChatBtn" title="Hide this chat">🙈</button>');$('#lockChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to lock/unlock this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleLock',password})});toast(d.locked?'Chat locked.':'Chat unlocked.')}catch(err){toast(err.message)}});$('#hideChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to hide/show this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleHide',password})});toast(d.hidden?'Chat hidden.':'Chat visible.');loadContacts()}catch(err){toast(err.message)}})}
async function loadMessages(){if(!currentContact)return;try{const d=await json('/api/contact/chats?with='+encodeURIComponent(currentContact.id));$('#messages').innerHTML=(d.messages||[]).map(m=>{const a=m.attachment;let media='';if(a?.url&&String(m.type).startsWith('media')) media=`<img class="chat-attachment" src="${escapeHtml(a.url)}" alt="Shared media">`;else if(a?.url&&m.type==='voice') media=`<audio class="chat-audio" controls src="${escapeHtml(a.url)}"></audio>`;else if(a?.url&&m.type==='file') media=`<a class="chat-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name||'Shared file')}</a>`;return `<div class="message ${m.from===currentUser()?.id?'mine':''}">${escapeHtml(m.text)}${media}<small>${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>`}).join('');const box=$('#messages');box.scrollTop=box.scrollHeight}catch(err){toast(err.message)}}
$('#messageForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=$('#messageInput').value.trim();if(!text||(!currentContact&&!currentGroup))return;try{if(currentGroup)await json('/api/contact/group-messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId:currentGroup.id,text})});else await json('/api/contact/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:currentContact.id,text})});$('#messageInput').value='';if(currentGroup)await openGroup(currentGroup);else await loadMessages()}catch(err){toast(err.message)}});
$('#contactPermission')?.addEventListener('click',async()=>{if(!('contacts' in navigator)){toast('Phone contact sync is not supported on this browser.');return}try{const props=['name','tel'];const opts={multiple:true};const contacts=await navigator.contacts.select(props,opts);toast(`${contacts.length} phone contact(s) selected. TNS will match registered numbers.`)}catch{toast('Contact permission was cancelled.')}});
$('#voiceCallBtn')?.addEventListener('click',()=>toast('Voice call request UI ready — production calling needs WebRTC signaling/service setup.'));$('#videoCallBtn')?.addEventListener('click',()=>toast('Video call request UI ready — production calling needs WebRTC signaling/service setup.'));
$$('.contact-tab').forEach(b=>b.addEventListener('click',async()=>{$$('.contact-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');const tab=b.dataset.contactTab,note=$('#contactSectionNote');if(tab==='status'){const current=await json('/api/contact/status').catch(()=>({}));const text=prompt('Set your TNS Status',current.status?.text||'');if(text!==null){await json('/api/contact/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});note.textContent='Status updated.'}}else if(tab==='calls'){note.textContent='Voice/video call controls are available from each chat. Internet calling needs WebRTC signaling/service credentials in deployment.'}else if(tab==='contacts'){note.textContent='Select phone contacts to match their numbers against registered TNS Studio users.'}else{note.textContent='Your TNS chats are shown here.';loadContacts()}}));
$('#showHiddenChatsBtn')?.addEventListener('click',async()=>{const password=prompt('Enter your TNS Studio password to view hidden chats.');if(password===null)return;try{const users=(await json('/api/contact/users')).users||[];for(const u of users){await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:u.id,action:'unlockCheck',password})});}await renderContacts(users,true);toast('Hidden chats unlocked for this view.')}catch(err){toast(err.message)}});
$('#newGroupBtn')?.addEventListener('click',async()=>{const name=prompt('Group name');if(!name?.trim())return;try{const members=currentContact?[currentContact.id]:[];const d=await json('/api/contact/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),members})});toast(`Group '${d.group.name}' created.`);loadContacts();if(d.group)openGroup(d.group)}catch(err){toast(err.message)}});
async function boot(){const authError=new URLSearchParams(location.search).get('authError');try{const d=await json('/api/auth/me');if(d.user){setUser(d.user);if(localStorage.getItem('tnsStudioLanguage')){showAuthScreens(null);$('#app').classList.remove('hidden');bootDashboard()}else startLanguage()}else showAuthScreens('authScreen')}catch{showAuthScreens('authScreen')}if(authError){msg('#loginMessage',authError,'error');history.replaceState({},document.title,location.pathname)}renderLanguages()}
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

  // AI creation uses an explicit Step 1 -> Step 2 workflow. Continue never generates by itself.
  function enterCreationStep(kind){
    const video=kind==='video';
    const first=document.getElementById(video?'videoStep1':'imageStep1');
    const second=document.getElementById(video?'videoStep2':'imageStep2');
    const input=document.getElementById(video?'idea':'imagePrompt');
    const accepted=document.getElementById(video?'acceptedVideoIdea':'acceptedImageIdea');
    const continueBtn=document.getElementById(video?'videoContinueBtn':'imageContinueBtn');
    if(!input?.value.trim()){
      return msg(video?'#jobBox':'#imageStatus',video?'Paste your script or enter a video idea first.':'Enter your image idea first.','error');
    }
    accepted.textContent=input.value.trim();
    first.classList.add('hidden');
    second.classList.remove('hidden');
    continueBtn.textContent='Step 2 ✓';
    continueBtn.disabled=true;
    (video?document.getElementById('videoWorkflow'):document.getElementById('imageStyle'))?.focus();
    msg(video?'#jobBox':'#imageStatus',video?'Step 1 complete. Choose your video settings below.':'Step 1 complete. Choose your image settings below.','success');
  }
  document.getElementById('videoContinueBtn')?.addEventListener('click',()=>enterCreationStep('video'));
  document.getElementById('imageContinueBtn')?.addEventListener('click',()=>enterCreationStep('image'));
  document.getElementById('editVideoIdeaBtn')?.addEventListener('click',()=>{
    document.getElementById('videoStep2')?.classList.add('hidden');
    document.getElementById('videoStep1')?.classList.remove('hidden');
    const b=document.getElementById('videoContinueBtn'); if(b){b.disabled=false;b.textContent='Continue →';}
    document.getElementById('idea')?.focus();
  });
  document.getElementById('editImageIdeaBtn')?.addEventListener('click',()=>{
    document.getElementById('imageStep2')?.classList.add('hidden');
    document.getElementById('imageStep1')?.classList.remove('hidden');
    const b=document.getElementById('imageContinueBtn'); if(b){b.disabled=false;b.textContent='Continue →';}
    document.getElementById('imagePrompt')?.focus();
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
  function editorApi(){return window.TNSEditorComponent}
  function fmtTime(v){v=Math.max(0,Math.round(Number(v)||0));return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`}
  function renderEditorTimeline(){
    const c=editorApi(), box=$('#timeline'); if(!c||!box)return;
    const state=c.getState(); const tracks={video:[],text:[],audio:[]};
    state.timeline.forEach(x=>(tracks[x.type==='audio'?'audio':x.type==='text'?'text':'video']).push(x));
    const pxPerSec=Math.max(25,Number(state.timelineZoom)||80);
    if(!state.timeline.length){box.innerHTML='<span class="muted">Import media to start editing. Your clips will appear here as selectable timeline layers.</span>'}
    else {
      const total=Math.max(5,c.getTimelineDuration());
      const marks=[]; for(let t=0;t<=Math.ceil(total);t+=1) marks.push(`<span style="width:${pxPerSec}px">${fmtTime(t)}</span>`);
      box.innerHTML=`<div class="timeline-ruler" style="width:${Math.max(500,total*pxPerSec+86)}px">${marks.join('')}</div>`+
        Object.entries(tracks).filter(([,items])=>items.length).map(([type,items])=>`<div class="timeline-track" style="min-width:${Math.max(500,total*pxPerSec+86)}px"><div class="timeline-track-label">${type.toUpperCase()}</div>${items.map(x=>{const w=Math.max(90,(Number(x.duration)||3)*pxPerSec);return `<div class="timeline-clip ${state.selectedItemId===x.id?'selected':''} ${x.locked?'locked':''} ${x.visible===false?'hidden-clip':''}" style="--clip-width:${w}px;margin-left:${Math.max(0,(Number(x.start)||0))*pxPerSec}px" draggable="${!x.locked}" data-editor-item="${x.id}" title="Drag to move · click to select"><span class="clip-handle left" data-trim="left"></span><b>${escapeHtml(x.name)}</b><small>Start ${fmtTime(x.start)} · ${fmtTime(x.duration)} · ${x.muted?'Muted':'Audio '+Math.round((x.volume||1)*100)+'%'}</small><span class="clip-handle right" data-trim="right"></span></div>`}).join('')}</div>`).join('');
    }
    const dur=c.getTimelineDuration(); $('#editorDuration')&&($('#editorDuration').textContent=fmtTime(dur)); $('#editorScrub')&&($('#editorScrub').max=Math.max(1,dur)); $('#timelineZoom')&&($('#timelineZoom').value=state.timelineZoom); $('#timelineSnap')&&($('#timelineSnap').textContent=`🧲 Snap: ${state.snap?'On':'Off'}`);
    const selected=c.getSelectedItem(); const ins=$('#editorInspector');
    if(!selected){ins?.classList.add('hidden');if(ins)ins.innerHTML='';return}
    ins?.classList.remove('hidden');
    if(ins)ins.innerHTML=`<div class="section-head"><div><b>Selected: ${escapeHtml(selected.name)}</b><small class="muted">${escapeHtml(selected.type)} layer</small></div><span class="muted">${selected.locked?'🔒 Locked':'✋ Editable'}</span></div><div class="editor-inspector-grid"><div><label>Start (sec)</label><input id="insStart" type="number" min="0" step="0.1" value="${Number(selected.start)||0}"></div><div><label>Duration (sec)</label><input id="insDuration" type="number" min="0.1" step="0.1" value="${Number(selected.duration)||0}"></div><div><label>Trim Start</label><input id="insTrimStart" type="number" min="0" step="0.1" value="${Number(selected.trimStart)||0}"></div><div><label>Trim End</label><input id="insTrimEnd" type="number" min="0" step="0.1" value="${Number(selected.trimEnd)||0}"></div><div><label>Volume</label><input id="insVolume" type="range" min="0" max="1" step="0.01" value="${Number(selected.volume??1)}"></div><div><label>Speed</label><input id="insSpeed" type="number" min="0.1" max="10" step="0.05" value="${Number(selected.speed??1)}"></div><div><label>Rotation</label><select id="insRotate"><option value="0" ${Number(selected.rotate||0)===0?'selected':''}>0°</option><option value="90" ${Number(selected.rotate||0)===90?'selected':''}>90°</option><option value="180" ${Number(selected.rotate||0)===180?'selected':''}>180°</option><option value="270" ${Number(selected.rotate||0)===270?'selected':''}>270°</option></select></div><div><label>Brightness</label><input id="insBrightness" type="number" min="-1" max="1" step="0.01" value="${Number(selected.brightness||0)}"></div><div><label>Contrast</label><input id="insContrast" type="number" min="0.1" max="3" step="0.01" value="${Number(selected.contrast??1)}"></div><div><label>Saturation</label><input id="insSaturation" type="number" min="0" max="3" step="0.01" value="${Number(selected.saturation??1)}"></div></div><div class="editor-inspector-actions"><button id="insApply" class="primary" type="button">Apply Changes</button><button id="insDuplicate" class="secondary" type="button">Duplicate</button><button id="insSplit" class="secondary" type="button">Split at Playhead</button><button id="insMute" class="secondary" type="button">${selected.muted?'Unmute':'Mute'}</button><button id="insLock" class="secondary" type="button">${selected.locked?'Unlock':'Lock'}</button><button id="insVisible" class="secondary" type="button">${selected.visible===false?'Show':'Hide'}</button><button id="insDelete" class="secondary" type="button">Delete Clip</button></div>`;
    $('#insApply')?.addEventListener('click',()=>{if(selected.locked)return toast('Unlock this clip before editing it.');c.updateItem(selected.id,{start:Number($('#insStart').value)||0,duration:Number($('#insDuration').value)||0,trimStart:Number($('#insTrimStart').value)||0,trimEnd:Number($('#insTrimEnd').value)||0,volume:Number($('#insVolume').value),speed:Number($('#insSpeed').value)||1,rotate:Number($('#insRotate').value)||0,brightness:Number($('#insBrightness').value)||0,contrast:Number($('#insContrast').value)||1,saturation:Number($('#insSaturation').value)||1});renderEditorTimeline()});
    $('#insDuplicate')?.addEventListener('click',()=>{if(selected.locked)return toast('Unlock this clip before duplicating it.');c.duplicateItem(selected.id);renderEditorTimeline()});
    $('#insMute')?.addEventListener('click',()=>{c.muteItem(selected.id,!selected.muted);renderEditorTimeline()});
    $('#insLock')?.addEventListener('click',()=>{c.updateItem(selected.id,{locked:!selected.locked});renderEditorTimeline()});
    $('#insVisible')?.addEventListener('click',()=>{c.updateItem(selected.id,{visible:selected.visible===false});renderEditorTimeline()});
    $('#insDelete')?.addEventListener('click',()=>{if(selected.locked)return toast('Unlock this clip before deleting it.');c.removeItem(selected.id);renderEditorTimeline()});
    $('#insSplit')?.addEventListener('click',()=>splitSelectedAtPlayhead(selected));
  }
  function splitSelectedAtPlayhead(item){const c=editorApi();const t=Number(c.state.currentTime)||0;const local=t-(Number(item.start)||0);if(local<=0||local>=Number(item.duration||0))return toast('Place the playhead inside the selected clip first.');const first={...item,id:null,name:item.name+' Part 1',duration:local};const second={...item,id:null,name:item.name+' Part 2',start:(Number(item.start)||0)+local,duration:Number(item.duration)-local,trimStart:(Number(item.trimStart)||0)+local};c.removeItem(item.id);c.addItem(first);c.addItem(second);renderEditorTimeline()}
  function toolField(label,id,type='number',value='',attrs=''){return `<div><label>${label}</label><input id="tool_${id}" type="${type}" value="${value}" ${attrs}></div>`}
  function openEditorToolWorkspace(tool){
    if(!currentMedia)return msg('#editStatus','Import a video first.','error');
    let fields=''; const t=tool.toLowerCase();
    if(['text','captions','subtitles','karaoke captions','text animation','fonts','templates','shadow','tts'].includes(t)) fields+=`<div style="grid-column:1/-1"><label>Text / Caption</label><textarea id="tool_text">TNS Studio</textarea></div><div><label>Start (sec)</label><input id="tool_textStart" type="number" min="0" step="0.1" value="0"></div><div><label>Duration (sec)</label><input id="tool_textDuration" type="number" min="0.1" step="0.1" value="3"></div><div><label>X</label><input id="tool_textX" type="number" min="0" step="1" value="40"></div><div><label>Y</label><input id="tool_textY" type="number" min="0" step="1" value="40"></div><div><label>Font Size</label><input id="tool_textFontSize" type="number" min="8" max="240" value="56"></div><div><label>Colour</label><input id="tool_textColor" type="text" value="white"></div>`;
    if(['crop'].includes(t)) fields+=toolField('Width','width','number',720,'min="2"')+toolField('Height','height','number',1280,'min="2"')+toolField('X','x','number',0)+toolField('Y','y','number',0);
    if(['resize','ai enhance','ai upscale','auto reframe'].includes(t)) fields+=toolField('Width','width','number',1080,'min="2"')+toolField('Height','height','number',1920,'min="2"');
    if(['split'].includes(t)) fields+=toolField('Split at seconds','splitAt','number',1,'min="0.1" step="0.1"');
    if(['trim','cut'].includes(t)) fields+=toolField('Start','start','number',0,'min="0" step="0.1"')+toolField('Duration','duration','number',3,'min="0.1" step="0.1"');
    if(['blur','noise cleanup','vignette'].includes(t)) fields+=toolField('Strength','strength','number',t==='blur'?8:.5,'min="0" step="0.1"');
    if(['rotate'].includes(t)) fields+=toolField('Degrees','degrees','number',90,'step="90"');
    if(['speed curves','time remap'].includes(t)) fields+=toolField('Speed factor','speed','number',1.25,'min="0.1" step="0.05"');
    if(['keyframes','pan & zoom'].includes(t)) fields+=toolField('Zoom','zoom','number',1.2,'min="1" step="0.05"');
    if(['hsl','curves','colour match','exposure','highlights','shadows','temperature','tint'].includes(t)) fields+=toolField('Amount','amount','number',.1,'step="0.01"');
    if(['object removal','face blur','motion tracking'].includes(t)) fields+=toolField('X','x','number',40)+toolField('Y','y','number',40)+toolField('Width','width','number',240)+toolField('Height','height','number',240);
    if(['silence removal','smart cut'].includes(t)) fields+=toolField('Minimum silence','minSilence','number',.35,'min="0.05" step="0.05"');
    if(['beat sync','auto beat'].includes(t)) fields+=toolField('BPM','bpm','number',120,'min="40" max="240"')+toolField('Speed','speed','number',1,'min="0.1" step="0.05"');
    if(['chroma key','green screen','background removal','background replace'].includes(t)) fields+=toolField('Key color','color','text','0x00ff00')+toolField('Similarity','similarity','number',.1,'min="0.01" max="0.9" step="0.01"')+toolField('Blend','blend','number',.05,'min="0" max="1" step="0.01"');
    if(['music','sfx','voice over','voice recorder','audio overlay'].includes(t)) fields+=`<div style="grid-column:1/-1"><label>Audio source</label><span class="muted">Use the Add Music / SFX / Voice button above.</span></div>`;
    if(['effects','filters','lens','light leak','glow','film grain','glitch','blend modes','perspective','safe zones','proxy preview'].includes(t)) fields+=`<div><label>Preset</label><select id="tool_preset"><option>Default</option><option>Strong</option><option>Soft</option><option>Cinematic</option></select></div>`;
    if(!fields) fields='<div class="muted">This tool uses the selected clip with its default professional processing. Adjust the selected clip in the inspector if needed.</div>';
    let box=document.getElementById('editorToolWorkspace');if(!box){box=document.createElement('div');box.id='editorToolWorkspace';box.className='editor-tool-workspace';document.querySelector('#editor .card')?.appendChild(box)}
    box.innerHTML=`<div class="section-head"><div><p class="eyebrow">TOOL WORKSPACE</p><h3>${escapeHtml(tool)}</h3><small class="muted">Configure this tool here, then apply it to the selected/current media.</small></div></div><div class="tool-fields">${fields}</div><div class="tool-actions"><button id="applyEditorTool" class="primary" type="button">Apply ${escapeHtml(tool)}</button><button id="cancelEditorTool" class="secondary" type="button">Cancel</button></div><div id="toolWorkspaceStatus" class="status"></div>`;
    $('#applyEditorTool').onclick=()=>executeEditorTool(tool);$('#cancelEditorTool').onclick=()=>box.remove();box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function executeEditorTool(tool){
    if(!currentMedia)return msg('#editStatus','Import a video first.','error');
    const lowerTool=tool.toLowerCase();
    if(['text','captions','subtitles','karaoke captions','text animation'].includes(lowerTool)){
      const c=editorApi();
      const text=document.getElementById('tool_text')?.value?.trim();
      if(!text)return msg('#editStatus','Enter text first.','error');
      const item=c.addItem({type:'text',name:`${tool} Layer`,text,start:Number(document.getElementById('tool_textStart')?.value)||0,duration:Math.max(.1,Number(document.getElementById('tool_textDuration')?.value)||3),x:Math.max(0,Number(document.getElementById('tool_textX')?.value)||0),y:Math.max(0,Number(document.getElementById('tool_textY')?.value)||0),fontSize:Math.max(8,Math.min(240,Number(document.getElementById('tool_textFontSize')?.value)||56)),color:document.getElementById('tool_textColor')?.value||'white'});
      renderEditorTimeline();
      document.getElementById('editorToolWorkspace')?.remove();
      msg('#editStatus',`${tool} layer added to the timeline.`,'success');
      return item;
    }
    const value=id=>document.getElementById('tool_'+id)?.value;
    const n=(id,d=0)=>Number(value(id)??d); const lower=tool.toLowerCase(); let body={inputPath:currentMedia.url,tool};
    ['width','height','x','y','splitAt','start','duration','strength','degrees','speed','zoom','amount','minSilence','bpm','similarity','blend'].forEach(k=>{if(value(k)!==undefined)body[k]=n(k)});
    if(value('text')!==undefined)body.text=value('text'); if(value('color')!==undefined)body.color=value('color');
    if(['speed curves','time remap'].includes(lower))body.tool='speed';
    if(lower==='rotate')body.degrees=n('degrees',90);
    if(['voice enhance','ai voice'].includes(lower))body.tool='voice enhance';
    if(['extract audio','normalize audio','mute'].includes(lower))body.tool=lower;
    if(lower==='background replace'){if(window.editorBackground?.url)body.backgroundPath=window.editorBackground.url;}
    if(['music','sfx','voice over','voice recorder','audio overlay'].includes(lower)){if(!window.editorAudio)return msg('#editStatus','Add an audio file first.','error');body.audioPath=window.editorAudio.url}
    if(['merge','transitions'].includes(lower)){const clips=window.editorClips||[];if(clips.length<2)return msg('#editStatus','Add at least 2 video clips first.','error');body.inputPaths=clips.map(x=>x.url);body.secondInputPath=clips[1].url;if(lower==='transitions'){body.tool='transitions';body.transition='fade';body.duration=n('duration',1)}}
    if(lower==='split' && !body.splitAt)body.splitAt=(Number(editorApi().state.currentTime)||1);
    const status=$('#toolWorkspaceStatus');if(status)status.textContent=`${tool}: processing…`;
    try{let data;if(['speed','brightness','contrast','saturation','sharpness','volume','fade in','fade out'].includes(lower)){const map={speed:n('speed',1),brightness:n('amount',0),contrast:n('amount',1),saturation:n('amount',1),sharpness:n('amount',0)};if(lower==='volume')map.volume=n('amount',1);if(lower==='fade in')map.fadeIn=n('duration',1);if(lower==='fade out')map.fadeOut=n('duration',1);data=await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputPath:currentMedia.url,...map,quality:Number($('#exportQuality')?.value||1080)})})}else data=await json('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(data.result){currentMedia={...currentMedia,...data.result,originalName:data.result.fileName};window.currentMedia=currentMedia;$('#preview').src=currentMedia.url;$('#preview').load();const sel=editorApi().getSelectedItem();if(sel)editorApi().updateItem(sel.id,{src:currentMedia.url,name:data.result.fileName});msg('#editStatus',`${tool} completed successfully.`,'success');renderEditorTimeline();}
      if(data.results?.length){currentMedia={...currentMedia,...data.results[0],originalName:data.results[0].fileName};window.currentMedia=currentMedia;$('#preview').src=currentMedia.url;$('#preview').load();msg('#editStatus',`${tool} completed successfully.`,'success');renderEditorTimeline();}
      document.getElementById('editorToolWorkspace')?.remove();
    }catch(err){if(status)status.textContent=`${tool} failed: ${err.message}`;msg('#editStatus',err.message,'error')}
  }
  function syncEditorControls(){const c=editorApi();if(!c)return;$('#editorUndo')?.toggleAttribute('disabled',!c.canUndo());$('#editorRedo')?.toggleAttribute('disabled',!c.canRedo());$('#editorPlay')?.setAttribute('aria-pressed',String(c.state.isPlaying));renderEditorTimeline()}
  window.addEventListener('tns:editor-change',syncEditorControls);
  $('#editorUndo')?.addEventListener('click',()=>{editorApi().undo();renderEditorTimeline()});$('#editorRedo')?.addEventListener('click',()=>{editorApi().redo();renderEditorTimeline()});
  $('#editorSaveProject')?.addEventListener('click',()=>{editorApi().saveLocal();toast('Edit Video project saved on this device.')});$('#editorLoadProject')?.addEventListener('click',()=>{if(editorApi().loadLocal())toast('Edit Video project loaded.');else toast('No saved Edit Video project found.');renderEditorTimeline()});
  $('#editorPlay')?.addEventListener('click',()=>{const v=$('#preview');if(!v?.src)return;v.paused?v.play():v.pause()});$('#editorScrub')?.addEventListener('input',e=>{const v=$('#preview');if(v){v.currentTime=Number(e.target.value)||0;editorApi().seek(v.currentTime)}});
  $('#preview')?.addEventListener('loadedmetadata',()=>{const d=$('#preview').duration||0;$('#editorScrub')&&($('#editorScrub').max=Math.max(1,d));$('#editorDuration')&&($('#editorDuration').textContent=fmtTime(d))});
  $('#preview')?.addEventListener('timeupdate',()=>{const v=$('#preview');$('#editorScrub')&&($('#editorScrub').value=v.currentTime||0);editorApi().seek(v.currentTime||0)});
  $('#timeline')?.addEventListener('click',e=>{const el=e.target.closest('[data-editor-item]');if(!el)return;editorApi().selectItem(el.dataset.editorItem);renderEditorTimeline()});
  $('#timeline')?.addEventListener('dragstart',e=>{const el=e.target.closest('[data-editor-item]');if(el)e.dataTransfer.setData('text/editor-item',el.dataset.editorItem)});
  $('#timeline')?.addEventListener('dragover',e=>e.preventDefault());
  $('#timeline')?.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/editor-item');if(!id)return;const c=editorApi();const item=c.state.timeline.find(x=>x.id===id);if(!item||item.locked)return;const rect=$('#timeline').getBoundingClientRect();const x=Math.max(0,e.clientX-rect.left-90);c.moveItem(id,Math.round(x/10)/10);renderEditorTimeline()});
  $('#timelineZoom')?.addEventListener('input',e=>editorApi().setTimelineZoom(e.target.value)); $('#timelineZoomOut')?.addEventListener('click',()=>editorApi().setTimelineZoom(editorApi().state.timelineZoom-10)); $('#timelineZoomIn')?.addEventListener('click',()=>editorApi().setTimelineZoom(editorApi().state.timelineZoom+10)); $('#timelineSnap')?.addEventListener('click',()=>editorApi().toggleSnap());
  $('#timelineRipple')?.addEventListener('click',()=>{const c=editorApi(),x=c.getSelectedItem();if(!x)return toast('Select a clip first.');if(x.locked)return toast('Unlock this clip before ripple deleting.');const end=(Number(x.start)||0)+(Number(x.duration)||0);c.removeItem(x.id);c.state.timeline.forEach(i=>{if((Number(i.start)||0)>=end)c.moveItem(i.id,(Number(i.start)||0)-(Number(x.duration)||0))});renderEditorTimeline()});
  document.addEventListener('keydown',e=>{if(!document.getElementById('editor')?.classList.contains('active'))return;const c=editorApi(),x=c.getSelectedItem();if(!x)return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(!x.locked)c.removeItem(x.id);renderEditorTimeline()}else if(e.key==='ArrowLeft'){e.preventDefault();if(!x.locked)c.nudgeItem(x.id,e.shiftKey?-1:-0.1);renderEditorTimeline()}else if(e.key==='ArrowRight'){e.preventDefault();if(!x.locked)c.nudgeItem(x.id,e.shiftKey?1:0.1);renderEditorTimeline()}else if(e.key.toLowerCase()==='s'){e.preventDefault();if(!x.locked)splitSelectedAtPlayhead(x)}});
  function addMediaToEditor(media,type='video'){const c=editorApi();c.addItem({type,name:media.originalName||media.fileName||'Media',src:media.url,duration:3,start:c.getTimelineDuration()});renderEditorTimeline()}
  $('#videoFile')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;msg('#editStatus','Uploading video…');const fd=new FormData();fd.append('video',file);try{const d=await fetch('/api/uploads/video',{method:'POST',body:fd,credentials:'include'});const r=await d.json();if(!d.ok)throw Error(r.error||'Upload failed.');currentMedia=r.media;window.currentMedia=currentMedia;$('#preview').src=r.media.url;$('#preview').load();addMediaToEditor(r.media,'video');msg('#editStatus','Video imported into the timeline.','success')}catch(err){msg('#editStatus',err.message,'error')}});
      document.addEventListener('click',e=>{const btn=e.target.closest('[data-tool]');if(!btn)return;openEditorToolWorkspace(btn.dataset.tool||'Tool')});
  document.addEventListener('DOMContentLoaded',()=>syncEditorControls());

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

/* ===== TNS STUDIO EDITOR v12 — contextual tool system ===== */
(function initProfessionalEditor(){
  const categories = [
    {id:'edit',name:'Edit',icon:'✂️',tools:[['Trim','✂️'],['Cut','🔪'],['Split','➗'],['Merge','🧩'],['Ripple Delete','↔️'],['Duplicate Clip','⧉'],['Freeze Frame','❄️'],['Reverse','↩️'],['Speed','⏱️'],['Speed Curves','〰️'],['Time Remap','⌛'],['Scene Detection','🎬']]},
    {id:'canvas',name:'Canvas & Motion',icon:'🖼️',tools:[['Crop','▣'],['Resize','↔️'],['Rotate','⟳'],['Flip','⇋'],['Mirror','◐'],['Auto Reframe','🎯'],['Pan & Zoom','🔎'],['Keyframes','◆'],['Motion Tracking','🧭'],['Stabilization','🛡️'],['Perspective','◈']]},
    {id:'text',name:'Text & Captions',icon:'T',tools:[['Text','T'],['Fonts','Aa'],['Templates','▦'],['Captions','CC'],['AI Captions','✨'],['Subtitles','▤'],['Karaoke Captions','🎤'],['Text Animation','A↗'],['Stickers','😊'],['Shapes','⬡']]},
    {id:'visual',name:'Effects & Transitions',icon:'✨',tools:[['Effects','✦'],['Transitions','↝'],['Blur','◌'],['Vignette','◉'],['Glitch','⚡'],['Glow','☀️'],['Film Grain','▦'],['Lens','◍'],['Light Leak','☼'],['Blend Modes','◒']]},
    {id:'color',name:'Colour',icon:'🎨',tools:[['Brightness','☀️'],['Contrast','◐'],['Saturation','🌈'],['HSL','HSL'],['Curves','⌁'],['Sharpness','⌁'],['Temperature','🌡️'],['Tint','🟣'],['Exposure','EV'],['Highlights','↑'],['Shadows','↓'],['Colour Match','🎯'],['LUT','LUT']]},
    {id:'audio',name:'Audio',icon:'🎵',tools:[['Music','🎵'],['SFX','🔊'],['Extract Audio','↗'],['Voice Over','🎙️'],['Voice Recorder','⏺️'],['TTS','🗣️'],['Volume','🔈'],['Normalize Audio','N'],['Noise Cleanup','🧹'],['Silence Removal','🔇'],['Audio Fade','↗'],['Voice Enhance','✨']]},
    {id:'ai',name:'AI Tools',icon:'🤖',tools:[['Background Removal','✂️'],['Background Replace','🖼️'],['AI Enhance','✨'],['AI Upscale','⬆️'],['AI Voice','🗣️'],['Object Removal','🪄'],['Smart Cut','⚡'],['Beat Sync','🥁'],['Scene Extend','➕'],['Face Blur','🙂'],['Auto Highlight','⭐'],['Auto Reframe','🎯']]},
    {id:'advanced',name:'Advanced',icon:'⚙️',tools:[['Masks','◩'],['Chroma Key','🟢'],['Opacity','◒'],['Shadow','◐'],['Motion Tracking','🧭'],['Proxy Preview','⚡'],['Project Versions','🕘'],['Safe Zones','▣'],['Export Presets','📤'],['Project Backup','💾'],['Media Relink','🔗'],['Batch Apply','⚙️']]}
  ];
  const toolDescriptions={
    Trim:'Drag clip edges or set exact in/out points.',Cut:'Remove an unwanted section without leaving the editor.',Split:'Cut the selected clip exactly at the playhead.',Merge:'Combine multiple clips into one sequence.',Crop:'Crop the visible frame with preset or free ratios.',Resize:'Set exact canvas dimensions while preserving fit/fill.',Rotate:'Rotate the selected clip and preview the result.',Speed:'Change playback speed with Normal controls.',Keyframes:'Animate position, scale, rotation and opacity over time.',Text:'Create a real text layer with styling and timing.',Captions:'Create timed caption layers and edit their timing.',Effects:'Choose an effect, set intensity and duration, then apply.',Transitions:'Choose a transition between adjacent clips and set duration.',Music:'Add music/audio to a separate timeline track.',Voice:'Record a voice-over and place it on the audio track.',HSL:'Adjust individual colour channels with Hue/Saturation/Lightness.',Curves:'Use a curve editor for precision colour correction.',Masks:'Mask part of a layer and feather its edges.',Chroma:'Remove a selected colour using chroma-key controls.',Stabilization:'Process shaky footage with selectable stabilization strength.','AI Captions':'Speech-to-text workflow; provider/model can be connected for production.','AI Enhance':'Enhancement workflow; production AI requires a configured provider.','Project Versions':'Save named restore points without destroying the current edit.','Media Relink':'Reconnect a missing source while preserving the timeline item.'};
  let activeCategory='edit';
  function editor(){return window.TNSEditorComponent}
  function selected(){return editor()?.getSelectedItem()||null}
  function setStatus(text,type='info'){const el=document.getElementById('editStatus');if(el){el.textContent=text;el.className='status '+type}}
  function toolIcon(name){for(const c of categories){const t=c.tools.find(x=>x[0]===name);if(t)return t[1]}return '•'}
  function renderTabs(){const box=document.getElementById('editorCategoryTabs');if(!box)return;box.innerHTML=categories.map(c=>`<button type="button" class="${c.id===activeCategory?'active':''}" data-editor-category="${c.id}">${c.icon} ${c.name}</button>`).join('')}
  function renderTools(){const box=document.getElementById('editorToolStrip');if(!box)return;const c=categories.find(x=>x.id===activeCategory)||categories[0];box.innerHTML=c.tools.map(([name,icon])=>`<button type="button" class="editor-tool-card" data-tool="${escapeHtml(name)}" title="${escapeHtml(toolDescriptions[name]||'Open '+name+' workspace')}"><span class="tool-icon">${icon}</span><b>${escapeHtml(name)}</b><small>Open workspace</small></button>`).join('')}
  function field(label,id,type='number',value='',attrs=''){return `<label>${label}<input id="pw_${id}" type="${type}" value="${escapeHtml(String(value))}" ${attrs}></label>`}
  function selectField(label,id,options,value){return `<label>${label}<select id="pw_${id}">${options.map(x=>`<option ${String(x)===String(value)?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></label>`}
  function stageHTML(tool){const src=window.currentMedia?.url||document.getElementById('preview')?.src||'';return `<div class="workspace-stage">${src?`<video src="${escapeHtml(src)}" muted playsinline controls></video>`:`<div class="muted">Preview appears after importing media.</div>`}</div>`}
  function workspaceMarkup(tool){
    const t=tool.toLowerCase(); let controls=''; let library=''; let note=toolDescriptions[tool]||`Configure ${tool}, preview the change, then apply it to the selected timeline item.`;
    if(['crop'].includes(t)) controls=field('Width','width', 'number',1080,'min="2"')+field('Height','height','number',1920,'min="2"')+field('X','x','number',0)+field('Y','y','number',0)+selectField('Ratio','ratio',['Free','9:16','16:9','1:1','4:5'],'9:16')+field('Zoom','zoom','range',1,'min="1" max="3" step="0.01"');
    else if(t==='resize') controls=selectField('Preset','preset',['1080x1920','1920x1080','1080x1080','1080x1350','Custom'],'1080x1920')+field('Width','width','number',1080,'min="2"')+field('Height','height','number',1920,'min="2"')+selectField('Fit','fit',['Contain','Cover','Stretch'],'Contain');
    else if(t==='rotate') controls=selectField('Rotation','degrees',['0','90','180','270'],'90')+selectField('Flip','flip',['None','Horizontal','Vertical'],'None');
    else if(t==='trim'||t==='cut') controls=field('Start','start','number',0,'min="0" step="0.1"')+field('Duration','duration','number',selected()?.duration||3,'min="0.1" step="0.1"')+field('End','end','number',(Number(selected()?.start||0)+Number(selected()?.duration||3)).toFixed(1),'min="0" step="0.1"');
    else if(t==='split') controls=`<div class="full"><b>Playhead: ${fmtTime(editor()?.state.currentTime||0)}</b><p class="muted">Move the playhead above, then split the selected clip at that exact position.</p></div>`;
    else if(t==='speed'||t==='speed curves'||t==='time remap') controls=selectField('Mode','mode',['Normal','Curve','Time Remap'],'Normal')+field('Speed','speed','number',1,'min="0.1" max="10" step="0.05"')+field('Curve strength','curve','range',50,'min="0" max="100"');
    else if(t==='text'||t==='captions'||t==='subtitles'||t==='karaoke captions'||t==='text animation'||t==='fonts'||t==='templates') controls=`<label class="full">Text<textarea id="pw_text" rows="3">TNS Studio</textarea></label>`+field('Start','textStart','number',0,'min="0" step="0.1"')+field('Duration','textDuration','number',3,'min="0.1" step="0.1"')+field('Size','fontSize','number',56,'min="8" max="240"')+field('X','textX','number',40,'min="0"')+field('Y','textY','number',40,'min="0"')+field('Opacity','textOpacity','range',100,'min="0" max="100"')+selectField('Font','font',['Inter','Sans','Serif','Mono','Display'],'Inter')+selectField('Alignment','align',['Left','Center','Right'],'Center')+`<label>Color<input id="pw_color" type="color" value="#ffffff"></label>`;
    else if(t==='effects'||t==='filters'||t==='transitions'||t==='stickers'||t==='shapes'||t==='lens'||t==='glow'||t==='glitch'||t==='film grain'||t==='light leak'||t==='vignette') {library=`<div class="full workspace-library">${['Original','Cinematic','Soft','Vivid','Mono','Fade','Zoom','Blur'].map(x=>`<button type="button" data-workspace-preset="${x}">${x}</button>`).join('')}</div>`+field('Intensity','intensity','range',70,'min="0" max="100"')+field('Duration','effectDuration','number',1,'min="0.1" step="0.1"');controls=library}
    else if(['brightness','contrast','saturation','sharpness','temperature','tint','exposure','highlights','shadows','hsl','curves','colour match','lut'].includes(t)) controls=field('Amount','amount','range',50,'min="0" max="100"')+field('Red / Hue','red','range',50,'min="0" max="100"')+field('Green / Saturation','green','range',50,'min="0" max="100"')+field('Blue / Lightness','blue','range',50,'min="0" max="100"')+(t==='curves'?'<div class="full curve-editor"><div class="curve-line"></div></div>':'')+(t==='lut'?selectField('LUT','lutPreset',['None','Cinematic','Warm','Cool','Film'],'None'):'');
    else if(t==='keyframes'||t==='pan & zoom'||t==='motion tracking') controls=selectField('Property','property',['Position','Scale','Rotation','Opacity'],'Position')+field('Value','keyValue','number',100,'min="0" step="1"')+`<div class="full"><b>Keyframe lane</b><div class="keyframe-lane"><span class="keyframe-point" style="left:12%"></span><span class="keyframe-point" style="left:52%"></span><span class="keyframe-point" style="left:82%"></span></div></div>`;
    else if(t==='music'||t==='sfx'||t==='extract audio'||t==='voice over'||t==='voice recorder') controls=`<div class="full"><button type="button" id="pwChooseAudio" class="secondary">Choose Audio File</button><input id="pwAudioFile" type="file" accept="audio/*" hidden></div>`+field('Start','audioStart','number',0,'min="0" step="0.1"')+field('Volume','audioVolume','range',100,'min="0" max="100"')+field('Fade In','fadeIn','number',0,'min="0" step="0.1"')+field('Fade Out','fadeOut','number',0,'min="0" step="0.1"');
    else if(t==='tts'||t==='ai voice') controls=`<label class="full">Script<textarea id="pw_ttsText" rows="4">Hello from TNS Studio.</textarea></label>`+selectField('Voice','voice',['Default','Male','Female','Narrator'],'Default')+selectField('Speed','voiceSpeed',['0.75x','1x','1.25x','1.5x'],'1x');
    else if(t==='chroma key'||t==='background removal'||t==='background replace') controls=`<label>Key color<input id="pw_keyColor" type="color" value="#00ff00"></label>`+field('Similarity','similarity','range',20,'min="1" max="90"')+field('Blend','blend','range',5,'min="0" max="100"')+field('Edge softness','edge','range',20,'min="0" max="100"');
    else if(t==='masks') controls=selectField('Mask','mask',['Rectangle','Circle','Linear','Mirror'],'Rectangle')+field('Feather','feather','range',20,'min="0" max="100"')+field('Size','maskSize','range',70,'min="1" max="100"')+selectField('Invert','invert',['Off','On'],'Off');
    else if(t==='stabilization') controls=selectField('Strength','strength',['Recommended','Minimum cut','Most stable'],'Recommended');
    else if(t==='noise cleanup'||t==='voice enhance'||t==='silence removal') controls=field('Strength','strength','range',50,'min="0" max="100"')+field('Threshold','threshold','number',0.35,'min="0.05" step="0.05"');
    else if(t==='beat sync') controls=field('BPM','bpm','number',120,'min="40" max="240"')+selectField('Trigger','beatTrigger',['Music Beat','Voice/Speech','Manual'],'Music Beat');
    else if(t==='scene detection'||t==='smart cut'||t==='auto highlight') controls=field('Sensitivity','sensitivity','range',50,'min="0" max="100"')+`<div class="full"><p class="muted">Analyze first, review the detected cuts/highlights, then apply.</p></div>`;
    else if(t==='ai captions') controls=selectField('Language','captionLang',['Auto','English','Hindi','Kannada','Tamil','Telugu','Bengali','Marathi'],'Auto')+selectField('Style','captionStyle',['Clean','Bold','Karaoke','Minimal'],'Clean')+field('Size','captionSize','range',55,'min="20" max="100"');
    else if(t==='ai enhance'||t==='ai upscale') controls=selectField('Quality','aiQuality',['HD','Full HD','2K','4K'],'Full HD')+field('Enhancement','enhanceAmount','range',50,'min="0" max="100"');
    else if(t==='object removal'||t==='face blur') controls=field('X','x','number',40,'min="0"')+field('Y','y','number',40,'min="0"')+field('Width','width','number',240,'min="1"')+field('Height','height','number',240,'min="1"');
    else if(t==='opacity'||t==='shadow'||t==='blend modes'||t==='safe zones') controls=field('Amount','amount','range',70,'min="0" max="100"')+selectField('Mode','mode',['Normal','Screen','Multiply','Overlay'],'Normal');
    else if(t==='project versions') controls=`<label class="full">Version name<input id="pw_versionName" value="Before ${new Date().toLocaleTimeString()}" /></label><div class="full"><p class="muted">Save a local restore point without replacing the current project.</p></div>`;
    else if(t==='project backup') controls=`<div class="full"><p>Export the current timeline, settings and metadata as a TNS project backup.</p><button id="pwBackup" class="secondary" type="button">Create Backup</button></div>`;
    else if(t==='media relink') controls=`<div class="full"><p class="muted">Choose a replacement file for the selected media while keeping its timeline position.</p><button id="pwRelink" class="secondary" type="button">Choose Replacement</button><input id="pwRelinkFile" type="file" accept="video/*,audio/*,image/*" hidden></div>`;
    else if(t==='batch apply') controls=`<div class="full"><p>Select multiple timeline clips using Ctrl/Shift on desktop or long-press selection on mobile, then choose a property to apply.</p></div>`+selectField('Property','batchProperty',['Brightness','Contrast','Saturation','Volume','Speed'],'Brightness')+field('Value','batchValue','number',1,'step="0.05"');
    else if(t==='export presets') controls=selectField('Preset','exportPreset',['YouTube 16:9 1080p','Shorts 9:16 1080p','Instagram 4:5 1080p','Square 1:1 1080p','4K Master'],'Shorts 9:16 1080p');
    else controls=field('Value','amount','range',50,'min="0" max="100"');
    return `<div class="section-head"><div><p class="eyebrow">TOOL WORKSPACE</p><h3>${toolIcon(tool)} ${escapeHtml(tool)}</h3><small class="muted">${escapeHtml(note)}</small></div><button id="pwClose" class="secondary" type="button">× Close</button></div><div class="workspace-preview">${stageHTML(tool)}<div class="workspace-controls">${controls}</div></div><div class="workspace-actions"><button id="pwPreview" class="secondary" type="button">▶ Preview</button><button id="pwApply" class="primary" type="button">Apply ${escapeHtml(tool)}</button><button id="pwReset" class="secondary" type="button">Reset</button></div><div id="pwStatus" class="status"></div>`;
  }
  function openWorkspace(tool){
    const box=document.getElementById('editorToolWorkspace');if(!box)return;
    box.classList.remove('hidden');box.innerHTML=workspaceMarkup(tool);box.dataset.tool=tool;box.scrollIntoView({behavior:'smooth',block:'nearest'});
    box.querySelectorAll('[data-workspace-preset]').forEach(b=>b.addEventListener('click',()=>{box.querySelectorAll('[data-workspace-preset]').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
    box.querySelector('#pwClose')?.addEventListener('click',()=>box.classList.add('hidden'));
    box.querySelector('#pwPreview')?.addEventListener('click',()=>{const v=document.getElementById('preview');if(v?.src){v.currentTime=Number(editor()?.state.currentTime)||0;v.play().catch(()=>{});setTimeout(()=>v.pause(),1600)}setStatus(`${tool}: previewing changes before apply.`,'info')});
    box.querySelector('#pwApply')?.addEventListener('click',()=>applyWorkspace(tool,box));
    box.querySelector('#pwReset')?.addEventListener('click',()=>openWorkspace(tool));
    box.querySelector('#pwChooseAudio')?.addEventListener('click',()=>box.querySelector('#pwAudioFile')?.click());
    box.querySelector('#pwBackup')?.addEventListener('click',()=>downloadProjectBackup());
    box.querySelector('#pwRelink')?.addEventListener('click',()=>box.querySelector('#pwRelinkFile')?.click());
    box.querySelector('#pwRelinkFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){const url=URL.createObjectURL(f);const s=selected();if(s)editor().updateItem(s.id,{src:url,name:f.name});renderEditorTimeline();setStatus('Replacement media linked to the selected clip.','success')}});
  }
  function val(box,id,def=0){const x=box.querySelector('#pw_'+id);return x?.type==='range'?Number(x.value):x?.value??def}
  function applyWorkspace(tool,box){
    const c=editor(),s=selected(),t=tool.toLowerCase();
    if(!c)return;
    if(['text','captions','subtitles','karaoke captions','text animation','fonts','templates'].includes(t)){
      const text=String(val(box,'text','TNS Studio')).trim();if(!text)return setStatus('Enter text first.','error');
      c.addItem({type:'text',name:`${tool} Layer`,text,start:Number(val(box,'textStart',0)),duration:Math.max(.1,Number(val(box,'textDuration',3))),x:Number(val(box,'textX',40)),y:Number(val(box,'textY',40)),fontSize:Number(val(box,'fontSize',56)),color:val(box,'color','#ffffff'),opacity:Number(val(box,'textOpacity',100))/100,font:val(box,'font','Inter'),align:val(box,'align','Center')});renderEditorTimeline();setStatus(`${tool} layer added to the timeline.`,'success');return;
    }
    if(!s && !['project versions','project backup','export presets'].includes(t))return setStatus('Select a clip on the timeline first.','error');
    if(t==='split'){splitSelectedAtPlayhead(s);setStatus('Clip split at playhead.','success');return}
    if(t==='trim'||t==='cut'){c.updateItem(s.id,{trimStart:Number(val(box,'start',0)),duration:Number(val(box,'duration',s.duration||3))});renderEditorTimeline();setStatus(`${tool} applied to selected clip.`,'success');return}
    if(t==='crop'||t==='resize'||t==='rotate'||t==='speed'||t==='speed curves'||t==='time remap'||t==='brightness'||t==='contrast'||t==='saturation'||t==='sharpness'||t==='volume'){
      const patch={};if(t==='crop'){patch.crop={width:Number(val(box,'width',1080)),height:Number(val(box,'height',1920)),x:Number(val(box,'x',0)),y:Number(val(box,'y',0)),ratio:val(box,'ratio','9:16'),zoom:Number(val(box,'zoom',1))}};
      if(t==='resize'){const preset=val(box,'preset','1080x1920');const [w,h]=preset==='Custom'?[Number(val(box,'width',1080)),Number(val(box,'height',1920))]:preset.split('x').map(Number);patch.width=w;patch.height=h}
      if(t==='rotate'){patch.rotate=Number(val(box,'degrees',90));patch.flip=val(box,'flip','None')}
      if(['speed','speed curves','time remap'].includes(t))patch.speed=Number(val(box,'speed',1));
      if(t==='brightness')patch.brightness=(Number(val(box,'amount',50))-50)/50;
      if(t==='contrast')patch.contrast=Number(val(box,'amount',50))/50;
      if(t==='saturation')patch.saturation=Number(val(box,'amount',50))/50;
      if(t==='sharpness')patch.sharpness=Number(val(box,'amount',50))/50;
      if(t==='volume')patch.volume=Number(val(box,'amount',100))/100;
      c.updateItem(s.id,patch);renderEditorTimeline();setStatus(`${tool} settings applied to the timeline clip.`,'success');return;
    }
    if(t==='project versions'){const name=String(val(box,'versionName','Version'));const versions=JSON.parse(localStorage.getItem('tnsStudioProjectVersions')||'[]');versions.push({name,createdAt:new Date().toISOString(),state:c.getState()});localStorage.setItem('tnsStudioProjectVersions',JSON.stringify(versions.slice(-20)));setStatus(`Version “${name}” saved.`,'success');return}
    if(t==='project backup'){downloadProjectBackup();return}
    if(t==='export presets'){openExportModal(val(box,'exportPreset','Shorts 9:16 1080p'));return}
    if(t==='batch apply'){const patch={};const prop=val(box,'batchProperty','Brightness');const v=Number(val(box,'batchValue',1));if(prop==='Brightness')patch.brightness=v;if(prop==='Contrast')patch.contrast=v;if(prop==='Saturation')patch.saturation=v;if(prop==='Volume')patch.volume=v;if(prop==='Speed')patch.speed=v;c.updateItem(s.id,patch);renderEditorTimeline();setStatus('Batch-ready property applied to the selected clip. Select additional clips and repeat as needed.','success');return}
    const body={inputPath:window.currentMedia?.url||s?.src,tool};
    ['strength','similarity','blend','bpm','x','y','width','height','speed','amount','red','green','blue','minSilence','threshold'].forEach(k=>{if(box.querySelector('#pw_'+k))body[k]=Number(val(box,k,0))});
    if(t==='chroma key'||t==='background removal'||t==='background replace')body.color=val(box,'keyColor','#00ff00');
    if(t==='tts'||t==='ai voice'){body.text=val(box,'ttsText','Hello from TNS Studio.');body.voice=val(box,'voice','Default')}
    if(['effects','filters','transitions','vignette','glitch','glow','film grain','lens','light leak'].includes(t)){body.filter=val(box,'preset','Original');body.transition=val(box,'preset','Fade');body.duration=Number(val(box,'effectDuration',1))}
    if(t==='ai captions')body.language=val(box,'captionLang','Auto');
    if(!body.inputPath)return setStatus('Import media first.','error');
    const status=box.querySelector('#pwStatus');if(status)status.textContent=`${tool}: processing…`;
    fetch('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.message||`${tool} failed`);return d}).then(d=>{
      const result=d.result||d.results?.[0];if(result){window.currentMedia={...(window.currentMedia||{}),...result};const v=document.getElementById('preview');if(v){v.src=result.url;v.load()}if(s)c.updateItem(s.id,{src:result.url,name:result.fileName});renderEditorTimeline();setStatus(`${tool} completed and the result is now in the editor.`,'success')}else setStatus(`${tool} completed.`,'success');
    }).catch(e=>{if(status)status.textContent=e.message;setStatus(e.message,'error')});
  }
  function downloadProjectBackup(){const data={format:'tnsproject',version:1,createdAt:new Date().toISOString(),editor:editor()?.getState(),settings:JSON.parse(localStorage.getItem('tnsStudioModuleSettings_edit-video')||'{}')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tns-studio-project-${Date.now()}.tnsproject.json`;a.click();URL.revokeObjectURL(a.href);setStatus('Project backup created.','success')}
  function openExportModal(preset){
    if(document.getElementById('tnsExportModal'))document.getElementById('tnsExportModal').remove();
    const c=editor(),dur=c?.getTimelineDuration()||0;document.body.insertAdjacentHTML('beforeend',`<div id="tnsExportModal" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeTnsExport">×</button><p class="eyebrow">EXPORT VIDEO</p><h2>Export your TNS Studio project</h2><div class="export-summary"><b>Timeline</b><span>${c?.state.timeline.length||0} layers • ${fmtTime(dur)}</span></div><div class="export-modal-grid">${selectField('Resolution','exQuality',['720','1080','1440','2160'],preset?.includes('4K')?'2160':'1080')}${selectField('Aspect Ratio','exRatio',['9:16','16:9','1:1','4:5'],preset?.includes('16:9')?'16:9':'9:16')}${selectField('Frame Rate','exFps',['24','30','60'],'30')}${selectField('Format','exFormat',['MP4','MOV'],'MP4')}<label>Bitrate<input id="exBitrate" value="8M"></label><label>Audio<input id="exAudio" value="AAC 192k"></label></div><div class="setting-actions"><button id="runTnsExport" class="primary">Export / Download</button><button id="cancelTnsExport" class="secondary">Cancel</button></div><p id="tnsExportStatus" class="status"></p></div></div>`);
    const close=()=>document.getElementById('tnsExportModal')?.remove();document.getElementById('closeTnsExport').onclick=close;document.getElementById('cancelTnsExport').onclick=close;
    document.getElementById('runTnsExport').onclick=async()=>{const st=document.getElementById('tnsExportStatus');st.textContent='Rendering…';try{const d=await editor().exportProject({quality:Number(document.getElementById('exQuality').value),ratio:document.getElementById('exRatio').value,fps:Number(document.getElementById('exFps').value),videoBitrate:document.getElementById('exBitrate').value,audioBitrate:'192k'});if(d.result?.url){const a=document.createElement('a');a.href=d.result.url;a.download=d.result.fileName||'tns-studio-export.mp4';a.target='_blank';a.click();st.textContent='Export complete.';setStatus('Export completed successfully.','success')}else throw Error('Export did not return a file.')}catch(e){st.textContent=e.message;setStatus(e.message,'error')}};
  }
  function init(){
    if(!document.getElementById('editorCategoryTabs'))return;
    renderTabs();renderTools();
    document.getElementById('editorCategoryTabs').addEventListener('click',e=>{const b=e.target.closest('[data-editor-category]');if(!b)return;activeCategory=b.dataset.editorCategory;renderTabs();renderTools()});
    document.getElementById('editorToolStrip').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)openWorkspace(b.dataset.tool)});
    document.getElementById('exportTopBtn')?.addEventListener('click',()=>openExportModal());
    document.getElementById('editorSearchTool')?.addEventListener('click',()=>{const q=prompt('Find an editor tool');if(!q)return;const matches=categories.flatMap(c=>c.tools.map(x=>x[0])).filter(x=>x.toLowerCase().includes(q.toLowerCase()));if(matches.length){activeCategory=categories.find(c=>c.tools.some(x=>x[0]===matches[0]))?.id||activeCategory;renderTabs();renderTools();setTimeout(()=>document.querySelector(`[data-tool="${CSS.escape(matches[0])}"]`)?.scrollIntoView({inline:'center',behavior:'smooth'}),50);setStatus(`Found: ${matches.join(', ')}`,'success')}else setStatus('No matching tool found.','error')});
    document.getElementById('editorProjectInfo')?.addEventListener('click',()=>{const c=editor();toast(`${c?.state.timeline.length||0} layers • ${fmtTime(c?.getTimelineDuration()||0)} • ${c?.state.timeline.filter(x=>x.type==='video').length||0} video clips`)});
    document.getElementById('editorVersions')?.addEventListener('click',()=>openWorkspace('Project Versions'));
    document.getElementById('editorFindMedia')?.addEventListener('click',()=>openWorkspace('Media Relink'));
    document.getElementById('editorMediaLibrary')?.addEventListener('click',()=>toast('Media library uses the imported project media and timeline layers.'));
    document.getElementById('exportBtn')?.addEventListener('click',()=>openExportModal());
    window.addEventListener('tns:editor-change',()=>{const empty=document.getElementById('editorCanvasEmpty');if(empty)empty.classList.toggle('hidden',!!editor()?.state.timeline.length)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* Editor media ingestion + direct timeline manipulation */
(function wireEditorMediaAndTimeline(){
  async function uploadEditorFile(file,kind){
    const fd=new FormData();fd.append('file',file,file.name);
    const r=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Upload failed.');return d.media;
  }
  document.getElementById('mergeFiles')?.addEventListener('change',async e=>{
    const files=[...(e.target.files||[])];if(!files.length)return;setEditorMsg('Adding clips to timeline…','info');
    try{const c=window.TNSEditorComponent;for(const f of files){const media=await uploadEditorFile(f,'media');c.addItem({type:f.type.startsWith('image/')?'image':'video',name:f.name,src:media.url,duration:f.type.startsWith('image/')?3:3,start:c.getTimelineDuration()});}renderEditorTimeline();setEditorMsg(`${files.length} media item${files.length>1?'s':''} added.`,'success');}catch(err){setEditorMsg(err.message,'error')}finally{e.target.value=''}});
  document.getElementById('audioFile')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;setEditorMsg('Uploading audio…','info');try{const media=await uploadEditorFile(f,'audio');window.editorAudio=media;const c=window.TNSEditorComponent;c.addItem({type:'audio',name:f.name,src:media.url,duration:3,start:c.getTimelineDuration(),volume:1});renderEditorTimeline();setEditorMsg('Audio added to a separate timeline track.','success')}catch(err){setEditorMsg(err.message,'error')}finally{e.target.value=''}});
  function setEditorMsg(t,type){const el=document.getElementById('editStatus');if(el){el.textContent=t;el.className='status '+type}}
  const timeline=document.getElementById('timeline');if(!timeline)return;
  let dragTrim=null;
  timeline.addEventListener('mousedown',e=>{const h=e.target.closest('[data-trim]');const clip=e.target.closest('[data-editor-item]');if(!h||!clip)return;const c=window.TNSEditorComponent,s=c.state.timeline.find(x=>x.id===clip.dataset.editorItem);if(!s||s.locked)return;dragTrim={id:s.id,side:h.dataset.trim,startX:e.clientX,origStart:Number(s.start)||0,origDuration:Number(s.duration)||0};e.preventDefault()});
  window.addEventListener('mousemove',e=>{if(!dragTrim)return;const zoom=Math.max(25,Number(window.TNSEditorComponent?.state.timelineZoom)||80);const delta=(e.clientX-dragTrim.startX)/zoom;const s=window.TNSEditorComponent.state.timeline.find(x=>x.id===dragTrim.id);if(!s)return;if(dragTrim.side==='left'){const newStart=Math.max(0,dragTrim.origStart+delta);const consumed=newStart-dragTrim.origStart;s.start=newStart;s.duration=Math.max(.1,dragTrim.origDuration-consumed);s.trimStart=Math.max(0,(Number(s.trimStart)||0)+consumed)}else{s.duration=Math.max(.1,dragTrim.origDuration+delta)}renderEditorTimeline()});
  window.addEventListener('mouseup',()=>{if(dragTrim){window.TNSEditorComponent.commit();dragTrim=null}});
  timeline.addEventListener('click',e=>{if(e.target.closest('[data-editor-item]')||e.target.closest('[data-trim]'))return;const rect=timeline.getBoundingClientRect();const zoom=Math.max(25,Number(window.TNSEditorComponent?.state.timelineZoom)||80);const x=Math.max(0,e.clientX-rect.left-86+timeline.scrollLeft);window.TNSEditorComponent.seek(x/zoom);const v=document.getElementById('preview');if(v?.src)v.currentTime=window.TNSEditorComponent.state.currentTime;renderEditorTimeline()});
})();

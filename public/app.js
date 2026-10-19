const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const LANGS=(window.TNSLanguageRegistry||[]).map(x=>[x.nativeName||x.name,(x.nativeName||x.name).slice(0,2),x.code,x.name,x.rtl]);
let selectedLang=null,otpIdentifier=null,currentMedia=null,authenticatedUser=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function msg(id,text,type='info'){const e=$(id)||(id==='#voiceStatus'?$('#homeChatStatus'):null);if(!e)return;e.textContent=text;e.dataset.type=type}
async function json(url,options={}){const r=await fetch(url,{credentials:'include',...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||d.message||'Request failed.');return d}
function showPanel(id){$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo({top:0,behavior:'smooth'});if(id==='projects')renderProjects();}

async function loadSavedTasks(){
  const status=$('#savedTaskStatus'), list=$('#savedTaskList'), counts=$('#savedTaskCounts'), detail=$('#savedTaskDetail');
  if(!status||!list)return;
  status.textContent='Loading saved tasks…'; list.innerHTML=''; counts.innerHTML=''; detail.classList.add('hidden');
  try{
    const filter=$('#savedTaskStatusFilter')?.value||'';
    const activeOnly=Boolean($('#savedTaskActiveOnly')?.checked);
    const data=await json('/api/tns-ai/browser/task/list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:filter,activeOnly,limit:50})});
    const c=data.counts||{};
    counts.innerHTML=`<span>Total: <b>${Number(c.totalOwned)||0}</b></span><span>Active: <b>${Number(c.active)||0}</b></span><span>Completed: <b>${Number(c.completed)||0}</b></span>`;
    const tasks=Array.isArray(data.tasks)?data.tasks:[];
    if(!tasks.length){status.textContent='Is filter mein koi saved task nahi mila.';return;}
    status.textContent=`${tasks.length} saved task(s) mile.`;
    list.innerHTML=tasks.map(t=>`<article class="saved-task-card"><div class="saved-task-card-main"><b>${escapeHtml(t.goal)}</b><small>${escapeHtml(t.status||'unknown')} · ${Array.isArray(t.steps)?t.steps.filter(x=>x.status==='completed').length:0}/${Array.isArray(t.steps)?t.steps.length:0} steps complete</small><small>Updated: ${escapeHtml(t.updatedAt||'')}</small></div><button class="secondary" type="button" data-saved-task-resume="${escapeHtml(t.id)}">View task</button></article>`).join('');
  }catch(e){status.textContent=e.message||'Saved tasks load nahi ho sake. Sign in karke dobara try karein.';}
}
async function showSavedTask(taskId){
 const status=$('#savedTaskStatus'), detail=$('#savedTaskDetail');status.textContent='Task details loading…';detail.classList.remove('hidden');detail.innerHTML='';
 try{
  const d=await json('/api/tns-ai/browser/task/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId})});
  const t=d.task||{}, summary=d.summary||{}, steps=Array.isArray(t.steps)?t.steps:[];
  detail.innerHTML=`<div class="section-head"><div><p class="eyebrow">TASK DETAILS</p><h3>${escapeHtml(t.goal||'Saved task')}</h3><p class="muted">Status: ${escapeHtml(t.status||'unknown')} · ${Number(summary.completedCount)||0}/${Number(summary.totalSteps)||steps.length} steps complete</p></div><button class="back-btn" type="button" id="savedTaskDetailClose">Close</button></div><div class="saved-task-steps">${steps.map((s,i)=>`<div class="saved-task-step"><span>${s.status==='completed'?'✅':s.status==='failed'?'❌':s.status==='blocked'?'⚠️':s.needsApproval?'🔐':'⏳'}</span><div><b>${i+1}. ${escapeHtml(s.title)}</b><small>${escapeHtml(s.status||'pending')}${s.needsApproval?' · Fresh approval required':''}</small>${s.website?`<small>${escapeHtml(s.website)}</small>`:''}</div></div>`).join('')}</div><p class="status">Next step: ${escapeHtml(d.resumeAt?.title||'Task already completed')}</p><p class="tiny">${escapeHtml(d.note||'No action has been executed.')}</p>`;
  status.textContent='Task details ready. Website action nahi chalaya gaya.';
  $('#savedTaskDetailClose')?.addEventListener('click',()=>detail.classList.add('hidden'));
 }catch(e){status.textContent=e.message||'Task recover nahi ho saka.';detail.classList.add('hidden');}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-saved-task-resume]');if(b)showSavedTask(b.dataset.savedTaskResume)});
document.addEventListener('DOMContentLoaded',()=>{ $('#savedTaskRefresh')?.addEventListener('click',loadSavedTasks);$('#savedTaskStatusFilter')?.addEventListener('change',loadSavedTasks);$('#savedTaskActiveOnly')?.addEventListener('change',loadSavedTasks); });

// Reliable top menu navigation. Delegated events also work if the app re-renders parts of the header.
(function initTopbarMenu(){
  function bindMenu(){
    const menu=document.getElementById('topbarMenu');
    const toggle=document.querySelector('.topbar-menu-btn');
    if(!menu||!toggle||toggle.dataset.menuBound==='1')return;
    toggle.dataset.menuBound='1';
    const close=()=>{menu.classList.add('hidden');menu.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false')};
    const open=()=>{menu.classList.remove('hidden');menu.setAttribute('aria-hidden','false');toggle.setAttribute('aria-expanded','true')};
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(menu.classList.contains('hidden'))open();else close()});
    menu.addEventListener('click',e=>{
      const item=e.target.closest('[data-menu-open]');if(!item)return;
      e.preventDefault();e.stopPropagation();const target=item.dataset.menuOpen;close();
      if(target==='projects')showPanel('projects');
      else if(target==='savedTasks'){showPanel('savedTasks');loadSavedTasks();}
      else if(target==='editorTools')showPanel('editor');
      else if(target==='settings')openSettings();
      else if(target==='premium')showPanel('premium');
      else if(target==='help')showPanel('help');
    });
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!toggle.contains(e.target))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindMenu,{once:true});else bindMenu();
})();

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
$('#createNewAccountBtn')?.addEventListener('click',()=>$('#signupModal')?.classList.remove('hidden'));
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

function loadSettings(){
  const s=JSON.parse(localStorage.getItem('tnsStudioSettings')||'{}');
  applyTheme(s.theme||'system');
}
function saveSettingsPatch(patch){
  const old=JSON.parse(localStorage.getItem('tnsStudioSettings')||'{}');
  const next={...old,...patch};
  localStorage.setItem('tnsStudioSettings',JSON.stringify(next));
  applyTheme(next.theme||'system');
  return next;
}
function applyTheme(v){document.body.classList.toggle('light',v==='light');if(v==='system')document.body.classList.toggle('light',matchMedia('(prefers-color-scheme:light)').matches)}
const MODULE_SETTINGS={
  'ai-video':{title:'AI Video Settings',items:['Default duration','Default style','Quality','AI provider','Character consistency']},
  'edit-video':{title:'Edit Video Settings',items:['Auto-save','Preview quality','Export quality','Audio defaults','AI editing tools']},
  projects:{title:'Projects Settings',items:['Auto-save','Cloud storage','Project privacy','Default project format']},
  help:{title:'Help & Support Settings',items:['Support notifications','Tutorial tips','Diagnostics','Privacy controls']},
  premium:{title:'Premium Settings',items:['Plan','Renewal','AI credits','Storage','Billing region']}
};
function openModuleSettings(key){const item=MODULE_SETTINGS[key];if(!item)return;showPanel('settings');$('#settingsTitle').textContent=item.title;const box=$('#moduleSettingsBox');if(box){box.classList.remove('hidden');box.innerHTML='<div class="module-settings-list">'+item.items.map((x)=>`<div class="module-setting-row"><div><b>${escapeHtml(x)}</b><small>Configure ${escapeHtml(x.toLowerCase())} for this feature.</small></div><button class="secondary" type="button">Configure</button></div>`).join('')+'</div>'}}
$$('.module-settings-btn').forEach(b=>b.addEventListener('click',()=>openModuleSettings(b.dataset.moduleSettings)));

const SETTINGS_CATEGORIES=[
 {id:'app',icon:'⚙️',title:'App',desc:'Language, appearance, data usage'},
 {id:'help',icon:'❔',title:'Help & About',desc:'Support, policy, about'}
];

const SETTINGS_ROWS={
 app:[['Language','Choose your app language','language'],['Dark Mode','Use the dark appearance','toggle:darkMode'],['Data Saver','Reduce media data usage','toggle:dataSaver'],['Default Video Quality','HD / Full HD / 4K','quality'],['Default Aspect Ratio','9:16 / 16:9 / 1:1','ratio']],
 help:[['Help & Support','Get help and answers','support'],['Report a Problem','Report bugs or issues','report'],['Privacy Policy','Read the privacy policy','privacyPolicy'],['Terms & Conditions','Read the terms and conditions','terms'],['About TNS','Version and app information','about']]
};

const SETTINGS_SUBPAGES={
 language:{title:'Language',eyebrow:'APP',description:'Choose the language for TNS.',rows:[['English','Use English throughout the app.','choice:language'],['हिन्दी','Use Hindi throughout the app.','choice:languageHindi'],['Español','Use Spanish throughout the app.','choice:languageSpanish'],['Français','Use French throughout the app.','choice:languageFrench']]},
 quality:{title:'Default Video Quality',eyebrow:'APP',description:'Choose the default export quality.',rows:[['HD (720p)','Smaller files and faster export.','choice:qualityHD'],['Full HD (1080p)','Recommended quality for most videos.','choice:qualityFHD'],['4K (2160p)','Highest available quality.','choice:quality4K']]},
 ratio:{title:'Default Aspect Ratio',eyebrow:'APP',description:'Choose the default video shape.',rows:[['9:16 (Portrait)','Best for vertical mobile video.','choice:ratio916'],['16:9 (Landscape)','Standard wide video.','choice:ratio169'],['1:1 (Square)','Square social format.','choice:ratio11']]},
 support:{title:'Help & Support',eyebrow:'HELP & ABOUT',description:'Find answers and contact TNS support.',rows:[['Help Center','Find answers to common questions.','info'],['Contact Support','Send a support request.','info']]},
 report:{title:'Report a Problem',eyebrow:'HELP & ABOUT',description:'Tell us about a bug or issue.',rows:[['Problem','Describe the problem you experienced.','reportForm']]},
 privacyPolicy:{title:'Privacy Policy',eyebrow:'HELP & ABOUT',description:'TNS privacy information.',rows:[['Privacy','Your privacy information will be shown here.','info']]},
 terms:{title:'Terms & Conditions',eyebrow:'HELP & ABOUT',description:'TNS terms of service.',rows:[['Terms','Your terms and conditions will be shown here.','info']]},
 about:{title:'About TNS',eyebrow:'HELP & ABOUT',description:'App version and product information.',rows:[['TNS','Your creator app for editing, AI creation and social sharing.','info']]}
};

const SETTINGS_TOGGLE_DEFAULTS={darkMode:true,dataSaver:false,soundEffects:true};
let settingsStack=[];
let settingsCurrentId='__home__';
let settingsChoiceKey='';
function readSettingsMap(key){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
function writeSettingsMap(key,value){localStorage.setItem(key,JSON.stringify(value))}
function getSettingToggle(key){const s=readSettingsMap('tnsStudioSettingToggles');return Object.prototype.hasOwnProperty.call(s,key)?!!s[key]:!!SETTINGS_TOGGLE_DEFAULTS[key]}
function setSettingToggle(key,value){const s=readSettingsMap('tnsStudioSettingToggles');s[key]=!!value;writeSettingsMap('tnsStudioSettingToggles',s);if(key==='darkMode')applyTheme(value?'dark':'light')}
function selectedValue(key,fallback){return readSettingsMap('tnsStudioSettingValues')[key]||fallback}
function saveSelected(key,value){const s=readSettingsMap('tnsStudioSettingValues');s[key]=value;writeSettingsMap('tnsStudioSettingValues',s);toast(`${value} saved`)}
function settingsCategory(id){return SETTINGS_CATEGORIES.find(x=>x.id===id)}
function settingsBackButton(){return '<button class="settings-nav-arrow" id="settingsInnerBack" type="button" aria-label="Back" title="Back">←</button>'}
function renderSettingsHome(){
  const list=$('#settingsCategoryList');if(!list)return;
  list.innerHTML=SETTINGS_CATEGORIES.map(c=>`<button class="settings-category" data-settings-category="${c.id}" type="button"><span class="settings-category-icon">${c.icon}</span><span class="settings-category-copy"><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.desc)}</small></span><span class="settings-category-arrow">›</span></button>`).join('');
  $('#settingsSearchResults')?.classList.add('hidden');
}
function settingsRowHtml(title,desc,action){
  if(action.startsWith('toggle:')){const key=action.slice(7),on=getSettingToggle(key);return `<div class="settings-detail-row"><div class="row-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><button class="settings-switch ${on?'on':''}" data-setting-toggle="${escapeHtml(key)}" type="button" aria-label="${on?'Turn off':'Turn on'} ${escapeHtml(title)}" aria-pressed="${on}"><i></i></button></div>`}
  return `<button class="settings-detail-row settings-action-row" data-settings-action="${escapeHtml(action)}" type="button"><div class="row-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><span class="settings-category-arrow">›</span></button>`;
}
function renderSettingsCategory(id){
  const cat=settingsCategory(id),rows=SETTINGS_ROWS[id];if(!cat||!rows)return;
  settingsCurrentId=id;settingsStack=[];
  $('#settingsHomeView')?.classList.add('hidden');$('#settingsDetailView')?.classList.remove('hidden');$('#settingsHomeNav')?.classList.add('hidden');
  $('#settingsTitle').textContent=cat.title;$('#settingsDetailEyebrow').textContent=cat.title.toUpperCase();$('#settingsDetailTitle').textContent=cat.title;$('#settingsDetailDescription').textContent=cat.desc;
  const head=$('#settingsDetailView .settings-detail-head');if(head)head.innerHTML=`${settingsBackButton()}<h3 id="settingsDetailTitle">${escapeHtml(cat.title)}</h3>`;
  $('#settingsDetailList').innerHTML=rows.map(r=>settingsRowHtml(...r)).join('');
  wireSettingsInnerBack();
}

function renderSettingsSubpage(id,push=true){
  const page=SETTINGS_SUBPAGES[id];if(!page)return;
  if(push)settingsStack.push(settingsCurrentId);
  settingsCurrentId=id;$('#settingsHomeView')?.classList.add('hidden');$('#settingsDetailView')?.classList.remove('hidden');$('#settingsHomeNav')?.classList.add('hidden');
  const head=$('#settingsDetailView .settings-detail-head');if(head)head.innerHTML=`${settingsBackButton()}<h3>${escapeHtml(page.title)}</h3>`;
  const box=$('#settingsDetailList');box.innerHTML=page.rows.map(([title,desc,action])=>settingsSubRowHtml(title,desc,action)).join('');
}
function settingsSubRowHtml(title,desc,action){
  if(action.startsWith('toggle:')){const key=action.slice(7),on=getSettingToggle(key);return `<div class="settings-detail-row"><div class="row-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><button class="settings-switch ${on?'on':''}" data-setting-toggle="${escapeHtml(key)}" type="button" aria-pressed="${on}"><i></i></button></div>`}
  if(action.startsWith('choice:')){const key=action.slice(7);return `<button class="settings-detail-row settings-action-row" data-choice="${escapeHtml(key)}" type="button"><div class="row-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><span class="settings-choice-value">${escapeHtml(choiceLabel(key))}</span><span class="settings-category-arrow">›</span></button>`}
  if(action==='changePassword')return `<button class="settings-detail-row settings-action-row" data-settings-action="changePassword" type="button"><div class="row-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div><span class="settings-category-arrow">›</span></button>`;
  if(action==='reportForm')return `<div class="settings-detail-card"><label>Describe the problem<textarea id="settingsReportText" rows="5" placeholder="Tell us what happened…"></textarea></label><button class="primary wide" data-settings-action="sendReport" type="button">Send Report</button></div>`;
  if(action==='empty')return `<div class="settings-detail-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`;
  return `<div class="settings-detail-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`;
}
function choiceLabel(key){const v=selectedValue(key,'');const map={tagSource:'Everyone',mentionSource:'Everyone',followRequests:'Everyone',musicQuality:'High',sensitiveContent:'Standard',contentLanguage:'English',language:'English',languageHindi:'Not selected',languageSpanish:'Not selected',languageFrench:'Not selected',qualityHD:'HD (720p)',qualityFHD:'Full HD (1080p)',quality4K:'4K (2160p)',ratio916:'9:16',ratio169:'16:9',ratio11:'1:1'};return v||map[key]||'Choose'}
function renderChoicePage(key){
  const definitions={
    tagSource:['Allow Tags From',['Everyone','People You Follow','No One']],mentionSource:['Allow Mentions From',['Everyone','People You Follow','No One']],followRequests:['Follow Requests',['Everyone','Suggested Accounts','No One']],musicQuality:['Music Quality',['Standard','High','Original']],sensitiveContent:['Sensitive Content',['Standard','Less','More']],contentLanguage:['Preferred Language',['English','Hindi','Spanish','French']],language:['Language',['English','Hindi','Spanish','French']],languageHindi:['Language',['English','Hindi','Spanish','French']],languageSpanish:['Language',['English','Hindi','Spanish','French']],languageFrench:['Language',['English','Hindi','Spanish','French']],qualityHD:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],qualityFHD:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],quality4K:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],ratio916:['Default Aspect Ratio',['9:16','16:9','1:1']],ratio169:['Default Aspect Ratio',['9:16','16:9','1:1']],ratio11:['Default Aspect Ratio',['9:16','16:9','1:1']]
  };const def=definitions[key];if(!def)return;settingsStack.push(settingsCurrentId);const current=selectedValue('choice:'+key,'');settingsCurrentId='__choice__';const head=$('#settingsDetailView .settings-detail-head');head.innerHTML=`${settingsBackButton()}<h3>${escapeHtml(def[0])}</h3>`;$('#settingsDetailList').innerHTML=def[1].map(v=>`<button class="settings-detail-row settings-choice-row" data-choice-value="${escapeHtml(v)}"><div class="row-copy"><b>${escapeHtml(v)}</b></div><span class="settings-radio ${current===v?'selected':''}"></span></button>`).join('');wireSettingsInnerBack();}
function wireSettingsInnerBack(){document.getElementById('settingsInnerBack')?.addEventListener('click',()=>{const prev=settingsStack.pop();if(!prev||prev==='__home__'){showSettingsHome();return}if(SETTINGS_SUBPAGES[prev])renderSettingsSubpage(prev,false);else renderSettingsCategory(prev)})}
function wirePasswordEyes(){document.querySelectorAll('[data-password-eye]').forEach(b=>b.addEventListener('click',()=>{const input=document.getElementById(b.dataset.passwordEye);if(input)input.type=input.type==='password'?'text':'password'}))}
function renderChangePassword(){settingsStack.push(settingsCurrentId);settingsCurrentId='__password__';const head=$('#settingsDetailView .settings-detail-head');head.innerHTML=`${settingsBackButton()}<h3>Change Password</h3>`;$('#settingsDetailList').innerHTML=`<div class="settings-form-card"><label>Current Password<div class="settings-password-wrap"><input id="settingsCurrentPassword" type="password" autocomplete="current-password" placeholder="Enter your current password"><button type="button" data-password-eye="settingsCurrentPassword">◉</button></div></label><label>New Password<div class="settings-password-wrap"><input id="settingsNewPassword" type="password" autocomplete="new-password" placeholder="Enter new password"><button type="button" data-password-eye="settingsNewPassword">◉</button></div></label><label>Confirm New Password<div class="settings-password-wrap"><input id="settingsConfirmPassword" type="password" autocomplete="new-password" placeholder="Confirm new password"><button type="button" data-password-eye="settingsConfirmPassword">◉</button></div></label><div class="settings-password-rules"><b>Password must contain:</b><span>✓ At least 8 characters</span><span>✓ One uppercase letter</span><span>✓ One lowercase letter</span><span>✓ One number</span></div><button class="primary wide" id="settingsChangePasswordBtn" type="button">Change Password</button><p class="status" id="settingsPasswordStatus"></p></div>`;wireSettingsInnerBack();wirePasswordEyes();document.getElementById('settingsChangePasswordBtn')?.addEventListener('click',async()=>{const current=$('#settingsCurrentPassword')?.value||'',next=$('#settingsNewPassword')?.value||'',confirm=$('#settingsConfirmPassword')?.value||'',status=$('#settingsPasswordStatus');try{if(!current||!next||!confirm)throw Error('Fill all password fields.');if(next!==confirm)throw Error('New password and confirm password do not match.');if(next.length<8||!/[A-Z]/.test(next)||!/[a-z]/.test(next)||!/\d/.test(next))throw Error('Password must contain 8+ characters, uppercase, lowercase and a number.');const d=await json('/api/auth/password/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword:next})});if(!d.success)throw Error(d.message||d.error||'Password change failed.');if(status)status.textContent='Password changed successfully.';toast('Password changed successfully.');document.getElementById('settingsCurrentPassword').value='';document.getElementById('settingsNewPassword').value='';document.getElementById('settingsConfirmPassword').value='';}catch(err){if(status)status.textContent=err.message;toast(err.message)}})}
function renderSettingsSearch(q){
  const term=String(q||'').trim().toLowerCase(),box=$('#settingsSearchResults');
  if(!box)return;
  if(!term){box.classList.add('hidden');box.innerHTML='';return}
  const hits=[];
  Object.entries(SETTINGS_ROWS).forEach(([id,rows])=>rows.forEach(([title,desc,action])=>{
    if((title+' '+desc).toLowerCase().includes(term))hits.push({id,title,desc,action});
  }));
  box.classList.remove('hidden');
  box.innerHTML=hits.length?hits.slice(0,20).map(x=>`<button class="settings-search-result" data-settings-search-open="${escapeHtml(x.id)}" data-settings-search-action="${escapeHtml(x.action||'')}" type="button"><span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.desc)}</small></span><span class="settings-category-arrow">›</span></button>`).join(''):`<div class="settings-search-empty"><b>No settings found</b><small>Try privacy, password, messages or notifications.</small></div>`;
}
function showSettingsHome(){settingsStack=[];settingsChoiceKey='';settingsCurrentId='__home__';$('#settingsHomeView')?.classList.remove('hidden');$('#settingsDetailView')?.classList.add('hidden');$('#settingsHomeNav')?.classList.remove('hidden');$('#settingsTitle').textContent='Settings and activity';$('#settingsSearch')?.focus();renderSettingsHome()}
function openSettings(){showPanel('settings');showSettingsHome()}
$$('[data-open="settings"]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openSettings()}));
$('#settingsSearch')?.addEventListener('input',e=>renderSettingsSearch(e.target.value));
$('#settingsCategoryList')?.addEventListener('click',e=>{const b=e.target.closest('[data-settings-category]');if(b)renderSettingsCategory(b.dataset.settingsCategory)});
$('#settingsSearchResults')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-settings-search-open]');if(!b)return;
  const id=b.dataset.settingsSearchOpen, action=b.dataset.settingsSearchAction||'';
  $('#settingsSearch').value='';
  $('#settingsSearchResults').classList.add('hidden');
  renderSettingsCategory(id);
  if(action.startsWith('toggle:')) return;
  if(action==='personal') return renderPersonalInformation();
  if(SETTINGS_SUBPAGES[action]) return renderSettingsSubpage(action);
  if(action==='security'||action==='sessions'||action==='accountActivity'||action==='danger') return renderSettingsSubpage(action);
  if(action==='language'||action==='quality'||action==='ratio'||action==='music'||action==='content'||action==='messages'||action==='followers'||action==='sharing'||action==='mentions'||action==='blocked'||action==='restricted'||action==='hidden'||action==='saved'||action==='archive'||action==='history'||action==='support'||action==='report'||action==='privacyPolicy'||action==='terms'||action==='about') return renderSettingsSubpage(action);
});
$('#settingsDetailList')?.addEventListener('change',()=>{});
$('#settingsDetailList')?.addEventListener('click',e=>{
  const sw=e.target.closest('[data-setting-toggle]');if(sw){const key=sw.dataset.settingToggle;const next=!getSettingToggle(key);setSettingToggle(key,next);if(SETTINGS_SUBPAGES[settingsCurrentId])renderSettingsSubpage(settingsCurrentId,false);else renderSettingsCategory(settingsCurrentId);toast(`${next?'Enabled':'Disabled'} ${key}`);return}
  const choice=e.target.closest('[data-choice]');if(choice){renderChoicePage(choice.dataset.choice);return}
  const choiceValue=e.target.closest('[data-choice-value]');if(choiceValue){const value=choiceValue.dataset.choiceValue;const targetKey=choicePageKey(settingsChoiceKey);saveSelected(targetKey,value);const prev=settingsStack.pop();if(SETTINGS_SUBPAGES[prev])renderSettingsSubpage(prev,false);else renderSettingsCategory(prev||'app');return}
  const btn=e.target.closest('[data-settings-action]');if(!btn)return;const a=btn.dataset.settingsAction;
  if(a==='personal'){renderPersonalInformation();return}
  if(a==='changePassword'){renderChangePassword();return}
  if(a==='security'||a==='sessions'||a==='accountActivity'||a==='danger'||SETTINGS_SUBPAGES[a]){renderSettingsSubpage(a);return}
  if(a==='language'){renderSettingsSubpage('language');return}
  if(a==='quality'){renderSettingsSubpage('quality');return}
  if(a==='ratio'){renderSettingsSubpage('ratio');return}
  if(a==='deviceCurrent'||a==='deviceOthers'||a==='loginHistory'){renderSettingsSubpage(a);return}
  if(a==='sendReport'){toast('Problem report prepared.');return}
});
function choicePageKey(stackKey){const map={language:'language',languageHindi:'language',languageSpanish:'language',languageFrench:'language',qualityHD:'quality',qualityFHD:'quality',quality4K:'quality',ratio916:'ratio',ratio169:'ratio',ratio11:'ratio'};return map[stackKey]||stackKey}
$('#settingsHomeNav')?.addEventListener('click',()=>showPanel('dashboard'));
$('#logoutBtn')?.addEventListener('click',async()=>{try{await json('/api/auth/logout',{method:'POST'})}catch{}authenticatedUser=null;window.TNSAuth?.logout?.();localStorage.removeItem('tnsStudioLanguage');location.reload()});

async function waitForVideoJob(jobId, options = {}) {
  const id = String(jobId || '').trim();
  if (!id) throw new Error('Video job ID was not returned.');
  const interval = Math.max(500, Number(options.interval) || 1500);
  const timeout = Math.max(interval, Number(options.timeout) || (type === 'video' ? 180000 : 120000));
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const job = await json(`/api/${type}/jobs/${encodeURIComponent(id)}`);
    const status = String(job?.status || job?.job?.status || '').toLowerCase();
    if (['completed','complete','succeeded'].includes(status)) return job;
    if (['failed','error','cancelled','canceled'].includes(status)) {
      throw new Error(job?.error || job?.message || 'Video generation failed.');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Video generation timed out.');
}
$('#generateBtn')?.addEventListener('click',async()=>{const idea=$('#idea').value.trim();if(!idea)return msg('#jobBox','Describe your video first.','error');if(document.getElementById('videoStep2')?.classList.contains('hidden'))return msg('#jobBox','Press Continue first, then choose your video settings.','error');const ref=$('#videoReference')?.files?.[0];msg('#jobBox',ref?'Uploading reference media…':'Preparing your AI video…');try{let referenceUrl=null;if(ref){const fd=new FormData();fd.append('file',ref,ref.name);const uploaded=await fetch('/api/uploads/file',{method:'POST',body:fd,credentials:'include'});const ud=await uploaded.json();if(!uploaded.ok)throw new Error(ud.error||'Reference upload failed.');referenceUrl=ud.media?.url||null;}msg('#jobBox','Generating video…');const d=await json('/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:idea,duration:Number($('#duration').value),format:$('#format').value,style:$('#style').value,quality:$('#videoQuality').value,camera:$('#videoCamera')?.value,characterConsistency:$('#characterConsistency')?.value,workflow:$('#videoWorkflow')?.value,negativePrompt:$('#videoNegativePrompt')?.value,referenceUrl,referenceName:ref?.name||null})});const job=d.status==='completed'?d:await waitForVideoJob(d.id||d.job?.id);const url=job.result?.url;if(!url)throw new Error('Video generation completed without a video result.');$('#videoResult').innerHTML=`<video controls playsinline src="${url}"></video><div class="video-result-meta"><span>${job.result?.width||''}×${job.result?.height||''}</span><span>${job.result?.duration||Number($('#duration').value)}s</span><span>${job.result?.mode==='local-fallback'?'Preview mode':'AI provider'}</span></div><a class="download-btn" href="${url}" download="tns-ai-video.mp4">⬇ Download Video</a>`;msg('#jobBox','Video ready.','success');saveProject('AI Video',idea)}catch(err){msg('#jobBox',err.message,'error')}});
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
  msg('#editStatus','Exporting your TNS project…');
  try{
    const q=Number($('#exportQuality').value||1080); const ratio=$('#exportRatio')?.value||'9:16';
    const d=c?.state.timeline.length?await c.exportProject({quality:q,ratio,fps:30,videoBitrate:q>=2160?'20M':q>=1440?'12M':'8M',audioBitrate:'192k'}):await json('/api/editor/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inputPath:currentMedia.url,trimStart:Number($('#trimStart').value||0),trimDuration:Number($('#trimDuration').value||0),brightness:Number($('#brightness').value||0),contrast:Number($('#contrast').value||1),filter:$('#filter').value,rotate:$('#rotate').value,speed:Number($('#speed').value||1),volume:Number($('#volume').value||1),saturation:Number($('#saturation')?.value||1),sharpness:Number($('#sharpness')?.value||0),fadeIn:Number($('#fadeIn')?.value||0),fadeOut:Number($('#fadeOut')?.value||0),quality:q,ratio})});
    const a=document.createElement('a');a.href=d.result.url;a.download=d.result.fileName||'tns-export.mp4';a.className='download-btn';a.textContent='⬇ Download exported MP4';$('#editStatus').replaceChildren(document.createTextNode('Export complete — '),a);saveProject('Edited Video',currentMedia?.originalName||'TNS Edit');
  }catch(err){msg('#editStatus',err.message,'error')}
});
$('#resetVideo')?.addEventListener('click',()=>{if($('#preview').src?.startsWith('blob:'))URL.revokeObjectURL($('#preview').src);$('#preview').removeAttribute('src');$('#preview').load();$('#videoFile').value='';currentMedia=null;window.currentMedia=null;editorApi()?.reset();renderEditorTimeline();msg('#editStatus','Editor reset.')});
function saveProject(type,title){const key=projectKey();const list=JSON.parse(localStorage.getItem(key)||'[]');list.unshift({id:crypto.randomUUID?.()||String(Date.now()),type,title,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(0,30)));renderProjects()}
function renderProjects(){const list=JSON.parse(localStorage.getItem(projectKey())||'[]');$('#projectList').innerHTML=list.length?list.map(p=>`<div class="project-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)} • ${new Date(p.date).toLocaleString()}</small></div><span class="muted">Saved</span></div>`).join(''):'<p class="muted">No projects yet. Start creating.</p>';$('#recentProjects').innerHTML=list.slice(0,4).map(p=>`<div class="recent-card"><span>🎬</span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)}</small></div>`).join('')||'<div class="recent-card"><span>✨</span><b>Your creations appear here</b><small>Start with any creator tool.</small></div>'}
$('#clearBtn')?.addEventListener('click',()=>{localStorage.removeItem(projectKey());renderProjects();toast('Local projects cleared')});
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
  'edit-video':{autoSave:true,preview:'HD',export:'1080',audio:'AAC 192k',aiTools:true},
  projects:{autoSave:true,cloudSync:true,privacy:'Private',format:'9:16'},
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
const oldShowPanel=showPanel; showPanel=function(id){oldShowPanel(id);if(id==='languageInside')renderLanguageInside();if(id==='settings')showSettingsHome();};

$('#improveVideoBtn')?.addEventListener('click',()=>{const x=$('#idea');if(x.value.trim())x.value=`Create a polished ${$('#style').value} video: ${x.value.trim()}. Include a clear hook, natural motion, realistic lighting, coherent camera movement, consistent subject identity and a satisfying ending.`;msg('#jobBox','Prompt improved. Review it before generating.','success')});
$('#variationVideoBtn')?.addEventListener('click',()=>{const x=$('#idea');if(!x.value.trim())return msg('#jobBox','Enter an idea first.','error');x.value += ' Create a fresh visual variation with different camera movement and composition while preserving the same subject and story.';msg('#jobBox','Variation prompt prepared.','success')});



$$('[data-open="premium"]').forEach(b=>b.addEventListener('dblclick',()=>showPanel('premiumDetails')));
$('#upgradePremiumBtn')?.addEventListener('click',()=>showPanel('premiumDetails'));
$('#openExportFromEditor')?.addEventListener('click',()=>{$('#exportQuality').value=$('#finalExportQuality').value;showPanel('editor');setTimeout(()=>$('#exportBtn')?.click(),50)});

// Add explicit navigation cards for the extra locked reference screens without changing the dashboard's 8-card layout.
const extraScreenMap={premiumDetails:'Premium Details',settingsApp:'App Settings',languageInside:'Language Selection',editorTools:'Edit Video Tools',exportVideo:'Export Video',appIcon:'Mobile App Icon',finalEditView:'Final Editing View'};
function addExtraNavigation(){
  const help=$('#help .card');if(help&&!help.querySelector('.reference-screen-links')){help.insertAdjacentHTML('beforeend','<div class="reference-screen-links"><p class="eyebrow">TNS SCREEN SYSTEM</p><h3>All module screens</h3><div class="screen-link-grid">'+Object.entries(extraScreenMap).map(([id,label])=>`<button data-open-screen="${id}">${escapeHtml(label)}</button>`).join('')+'</div></div>');help.querySelectorAll('[data-open-screen]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.openScreen)));}}
addExtraNavigation();

/* ===== MASTER 24-SCREEN + FINAL FEATURE COMPLETION ===== */
(function(){
  const screenRegistry = [
    ["1","splashScreen","Splash Screen"],["2","authScreen","Login Screen"],["3","signupModal","Signup Screen"],
    ["4","otpScreen","OTP Verification"],["5","languageScreen","Language Selection"],["6","dashboard","Main Dashboard"],
    ["7","settings","TNS Settings"],["8","editor","Edit Video"],["9","generate","AI Video"],["12","projects","Projects"],["16","help","Help & Support"],["17","premium","Premium"],
    ["18","settingsApp","App Settings"],["19","languageInside","Language Selection (Inside)"],
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
    ["languageInside","language-inside","Language Settings"],
    ["editorTools","editor-tools","Editor Tools Settings"],["exportVideo","export-video","Export Settings"],
    ["appIcon","app-icon","Brand Settings"],["finalEditView","final-edit","Final View Settings"],
    
  ].forEach(x=>addScreenSettingsButton(...x));

  // AI creation uses an explicit Step 1 -> Step 2 workflow. Continue never generates by itself.
  function enterCreationStep(kind){
    const video=kind==='video';
    const first=document.getElementById('videoStep1');
    const second=document.getElementById('videoStep2');
    const input=document.getElementById('idea');
    const accepted=document.getElementById('acceptedVideoIdea');
    const continueBtn=document.getElementById('videoContinueBtn');
    if(!input?.value.trim()) return msg('#jobBox','Paste your script or enter a video idea first.','error');
    accepted.textContent=input.value.trim(); first.classList.add('hidden'); second.classList.remove('hidden');
    continueBtn.textContent='Step 2 ✓'; continueBtn.disabled=true; document.getElementById('videoWorkflow')?.focus();
    msg('#jobBox','Step 1 complete. Choose your video settings below.','success');
  }
  document.getElementById('videoContinueBtn')?.addEventListener('click',()=>enterCreationStep('video'));
  document.getElementById('editVideoIdeaBtn')?.addEventListener('click',()=>{
    document.getElementById('videoStep2')?.classList.add('hidden');
    document.getElementById('videoStep1')?.classList.remove('hidden');
    const b=document.getElementById('videoContinueBtn'); if(b){b.disabled=false;b.textContent='Continue →';}
    document.getElementById('idea')?.focus();
  });

  // TNS AI voice conversation: browser speech recognition + speech synthesis, with TNS AI provider as the brain.
  let recognition=null;
  // A generation token invalidates stale microphone sessions and late AI responses.
  let recognitionSequence=0;
  const voiceLanguageEl=document.getElementById('voiceLanguage');
  const voiceChoiceEl=document.getElementById('voiceSystemVoice');
  const voiceRateEl=document.getElementById('voiceSpeechRate');
  // Keep app UI language separate from voice input/output preferences. Restore only
  // values that still exist in the current controls; device voices may vary by device.
  if(voiceLanguageEl){
    const savedVoiceLanguage=localStorage.getItem('tnsVoiceLanguage');
    if(savedVoiceLanguage&&Array.from(voiceLanguageEl.options).some(option=>option.value===savedVoiceLanguage))voiceLanguageEl.value=savedVoiceLanguage;
  }
  if(voiceRateEl){
    const savedVoiceRate=localStorage.getItem('tnsVoiceRate');
    if(savedVoiceRate&&Array.from(voiceRateEl.options).some(option=>option.value===savedVoiceRate))voiceRateEl.value=savedVoiceRate;
  }
  function selectedVoiceLanguage(){
    const selected=voiceLanguageEl?.value||'auto';
    if(selected!=='auto')return selected;
    const detected=voiceLanguageEl?.dataset.detectedLanguage;
    const languageLocales={English:'en-IN',Hindi:'hi-IN',Tamil:'ta-IN',Kannada:'kn-IN',Telugu:'te-IN',Bengali:'bn-IN',Gujarati:'gu-IN',Punjabi:'pa-IN',Malayalam:'ml-IN',Marathi:'mr-IN',Urdu:'ur-IN',Odia:'or-IN',Arabic:'ar-SA',Russian:'ru-RU',Chinese:'zh-CN',Japanese:'ja-JP',Korean:'ko-KR',Thai:'th-TH',Greek:'el-GR',Hebrew:'he-IL'};
    if(detected&&languageLocales[detected])return languageLocales[detected];
    const appLanguage=localStorage.getItem('tnsStudioLanguage')||'hi';
    const appLocales={hi:'hi-IN',en:'en-IN',ta:'ta-IN',kn:'kn-IN',te:'te-IN',bn:'bn-IN',gu:'gu-IN',pa:'pa-IN',ml:'ml-IN',or:'or-IN',mr:'mr-IN',ur:'ur-IN',ar:'ar-SA',ru:'ru-RU',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',th:'th-TH',el:'el-GR',he:'he-IL'};
    return appLocales[appLanguage]||appLanguage;
  }
  function refreshTnsSystemVoices(){
    if(!voiceChoiceEl||!('speechSynthesis' in window))return;
    const saved=localStorage.getItem('tnsVoiceURI')||voiceChoiceEl.value;
    const voices=window.speechSynthesis.getVoices?.()||[];
    voiceChoiceEl.replaceChildren(new Option('Default device voice',''));
    voices.forEach(voice=>{
      const option=new Option(`${voice.name} (${voice.lang})`,voice.voiceURI);
      voiceChoiceEl.add(option);
    });
    if(saved&&Array.from(voiceChoiceEl.options).some(option=>option.value===saved))voiceChoiceEl.value=saved;
  }
  voiceChoiceEl?.addEventListener('change',()=>localStorage.setItem('tnsVoiceURI',voiceChoiceEl.value));
  voiceRateEl?.addEventListener('change',()=>localStorage.setItem('tnsVoiceRate',voiceRateEl.value));
  if('speechSynthesis' in window){refreshTnsSystemVoices();window.speechSynthesis.addEventListener?.('voiceschanged',refreshTnsSystemVoices);}
  voiceLanguageEl?.addEventListener('change',()=>{
    localStorage.setItem('tnsVoiceLanguage',voiceLanguageEl.value);
    delete voiceLanguageEl.dataset.detectedLanguage;
    recognitionSequence++;
    if(recognition){try{recognition.stop()}catch{} recognition=null;}
    msg('#voiceStatus',`Voice language set to ${voiceLanguageEl.selectedOptions?.[0]?.textContent||voiceLanguageEl.value}.`,'info');
  });
  let activeTnsUtterance=null;
  let tnsPlaybackSequence=0;
  function stopTnsVoicePlayback(showStatus=true){
    tnsPlaybackSequence++;
    activeTnsUtterance=null;
    // Also invalidate auto-speech waiting on a home-chat AI response.
    try{window.dispatchEvent(new Event('tns:stop-voice-playback'))}catch{}
    if('speechSynthesis' in window){try{window.speechSynthesis.cancel()}catch{}}
    if(showStatus)msg('#voiceStatus','Voice playback stopped. Your text reply is still available.','info');
  }
  document.getElementById('stopTnsVoicePlayback')?.addEventListener('click',()=>stopTnsVoicePlayback(true));
  function speakTns(text){
    const speechText=String(text||'').trim();
    if(!speechText){msg('#voiceStatus','There is no reply text to read aloud.','error');return false;}
    if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){
      msg('#voiceStatus','Voice playback is not supported by this browser. You can still read the text reply.','error');
      return false;
    }
    try{
      // Invalidate callbacks from any previous utterance before replacing it.
      stopTnsVoicePlayback(false);
      const playbackId=tnsPlaybackSequence;
      const u=new window.SpeechSynthesisUtterance(speechText);
      activeTnsUtterance=u;
      const language=selectedVoiceLanguage();
      u.lang=language;
      u.rate=Math.min(2,Math.max(0.5,Number(voiceRateEl?.value||1)));
      u.pitch=1;
      const selectedUri=voiceChoiceEl?.value;
      const availableVoices=window.speechSynthesis.getVoices?.()||[];
      const localeKey=value=>String(value||'').trim().toLowerCase().replace('_','-');
      const targetLocale=localeKey(language);
      const targetBase=targetLocale.split('-')[0];
      const voiceMatchesLanguage=voice=>{
        const voiceLocale=localeKey(voice?.lang);
        return !!voiceLocale && (voiceLocale===targetLocale || voiceLocale.split('-')[0]===targetBase);
      };
      const selectedVoice=availableVoices.find(voice=>voice.voiceURI===selectedUri);
      // Never force a saved device voice from a different language. Prefer a compatible
      // manually selected voice, then exact locale, then same-language regional variant.
      const matchingVoice=selectedVoice&&voiceMatchesLanguage(selectedVoice)
        ? selectedVoice
        : availableVoices.find(voice=>localeKey(voice.lang)===targetLocale)
          ||availableVoices.find(voice=>voiceMatchesLanguage(voice))
          ||null;
      u.voice=matchingVoice;
      u.onstart=()=>{
        if(playbackId!==tnsPlaybackSequence)return;
        if(matchingVoice)msg('#voiceStatus',`Playing reply with ${matchingVoice.name} (${matchingVoice.lang}).`,'success');
        else msg('#voiceStatus',`No matching ${targetBase.toUpperCase()} device voice was found. Trying the browser's default voice; pronunciation may differ. You can install a matching voice in device settings.`,'info');
      };
      u.onend=()=>{if(playbackId===tnsPlaybackSequence){activeTnsUtterance=null;msg('#voiceStatus','Voice playback finished.','success')}};
      u.onerror=(event)=>{
        if(playbackId!==tnsPlaybackSequence)return;
        activeTnsUtterance=null;
        const reason=event?.error==='not-allowed'
          ? 'The browser blocked voice playback. Tap Play Reply again or check browser permissions.'
          : event?.error==='language-unavailable'
            ? `The device cannot speak ${targetBase.toUpperCase()} with its available voices. Install a matching voice or choose another language.`
            : event?.error==='voice-unavailable'
              ? 'The selected voice is unavailable. Choose Default device voice or another installed voice, then try again.'
              : 'Voice playback could not start or was interrupted. You can read the text reply or try Play Reply again.';
        msg('#voiceStatus',`${reason} Your text reply is still available.`,'error');
      };
      window.speechSynthesis.speak(u);
      return true;
    }catch(err){
      msg('#voiceStatus','Voice playback failed. You can read the text reply or try Play Reply again.','error');
      return false;
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
    if(['text','captions','subtitles','karaoke captions','text animation','fonts','templates','shadow','tts'].includes(t)) fields+=`<div style="grid-column:1/-1"><label>Text / Caption</label><textarea id="tool_text">TNS</textarea></div><div><label>Start (sec)</label><input id="tool_textStart" type="number" min="0" step="0.1" value="0"></div><div><label>Duration (sec)</label><input id="tool_textDuration" type="number" min="0.1" step="0.1" value="3"></div><div><label>X</label><input id="tool_textX" type="number" min="0" step="1" value="40"></div><div><label>Y</label><input id="tool_textY" type="number" min="0" step="1" value="40"></div><div><label>Font Size</label><input id="tool_textFontSize" type="number" min="8" max="240" value="56"></div><div><label>Colour</label><input id="tool_textColor" type="text" value="white"></div>`;
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

/* ===== TNS EDITOR v12 — contextual tool system ===== */
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
    else if(t==='text'||t==='captions'||t==='subtitles'||t==='karaoke captions'||t==='text animation'||t==='fonts'||t==='templates') controls=`<label class="full">Text<textarea id="pw_text" rows="3">TNS</textarea></label>`+field('Start','textStart','number',0,'min="0" step="0.1"')+field('Duration','textDuration','number',3,'min="0.1" step="0.1"')+field('Size','fontSize','number',56,'min="8" max="240"')+field('X','textX','number',40,'min="0"')+field('Y','textY','number',40,'min="0"')+field('Opacity','textOpacity','range',100,'min="0" max="100"')+selectField('Font','font',['Inter','Sans','Serif','Mono','Display'],'Inter')+selectField('Alignment','align',['Left','Center','Right'],'Center')+`<label>Color<input id="pw_color" type="color" value="#ffffff"></label>`;
    else if(t==='effects'||t==='filters'||t==='transitions'||t==='stickers'||t==='shapes'||t==='lens'||t==='glow'||t==='glitch'||t==='film grain'||t==='light leak'||t==='vignette') {library=`<div class="full workspace-library">${['Original','Cinematic','Soft','Vivid','Mono','Fade','Zoom','Blur'].map(x=>`<button type="button" data-workspace-preset="${x}">${x}</button>`).join('')}</div>`+field('Intensity','intensity','range',70,'min="0" max="100"')+field('Duration','effectDuration','number',1,'min="0.1" step="0.1"');controls=library}
    else if(['brightness','contrast','saturation','sharpness','temperature','tint','exposure','highlights','shadows','hsl','curves','colour match','lut'].includes(t)) controls=field('Amount','amount','range',50,'min="0" max="100"')+field('Red / Hue','red','range',50,'min="0" max="100"')+field('Green / Saturation','green','range',50,'min="0" max="100"')+field('Blue / Lightness','blue','range',50,'min="0" max="100"')+(t==='curves'?'<div class="full curve-editor"><div class="curve-line"></div></div>':'')+(t==='lut'?selectField('LUT','lutPreset',['None','Cinematic','Warm','Cool','Film'],'None'):'');
    else if(t==='keyframes'||t==='pan & zoom'||t==='motion tracking') controls=selectField('Property','property',['Position','Scale','Rotation','Opacity'],'Position')+field('Value','keyValue','number',100,'min="0" step="1"')+`<div class="full"><b>Keyframe lane</b><div class="keyframe-lane"><span class="keyframe-point" style="left:12%"></span><span class="keyframe-point" style="left:52%"></span><span class="keyframe-point" style="left:82%"></span></div></div>`;
    else if(t==='music'||t==='sfx'||t==='extract audio'||t==='voice over'||t==='voice recorder') controls=`<div class="full"><button type="button" id="pwChooseAudio" class="secondary">Choose Audio File</button><input id="pwAudioFile" type="file" accept="audio/*" hidden></div>`+field('Start','audioStart','number',0,'min="0" step="0.1"')+field('Volume','audioVolume','range',100,'min="0" max="100"')+field('Fade In','fadeIn','number',0,'min="0" step="0.1"')+field('Fade Out','fadeOut','number',0,'min="0" step="0.1"');
    else if(t==='tts'||t==='ai voice') controls=`<label class="full">Script<textarea id="pw_ttsText" rows="4">Hello from TNS.</textarea></label>`+selectField('Voice','voice',['Default','Male','Female','Narrator'],'Default')+selectField('Speed','voiceSpeed',['0.75x','1x','1.25x','1.5x'],'1x');
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
    else if(t==='export presets') controls=selectField('Preset','exportPreset',['YouTube 16:9 1080p','Vertical 9:16 1080p','Instagram 4:5 1080p','Square 1:1 1080p','4K Master'],'Vertical 9:16 1080p');
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
      const text=String(val(box,'text','TNS')).trim();if(!text)return setStatus('Enter text first.','error');
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
    if(t==='export presets'){openExportModal(val(box,'exportPreset','Vertical 9:16 1080p'));return}
    if(t==='batch apply'){const patch={};const prop=val(box,'batchProperty','Brightness');const v=Number(val(box,'batchValue',1));if(prop==='Brightness')patch.brightness=v;if(prop==='Contrast')patch.contrast=v;if(prop==='Saturation')patch.saturation=v;if(prop==='Volume')patch.volume=v;if(prop==='Speed')patch.speed=v;c.updateItem(s.id,patch);renderEditorTimeline();setStatus('Batch-ready property applied to the selected clip. Select additional clips and repeat as needed.','success');return}
    const body={inputPath:window.currentMedia?.url||s?.src,tool};
    ['strength','similarity','blend','bpm','x','y','width','height','speed','amount','red','green','blue','minSilence','threshold'].forEach(k=>{if(box.querySelector('#pw_'+k))body[k]=Number(val(box,k,0))});
    if(t==='chroma key'||t==='background removal'||t==='background replace')body.color=val(box,'keyColor','#00ff00');
    if(t==='tts'||t==='ai voice'){body.text=val(box,'ttsText','Hello from TNS.');body.voice=val(box,'voice','Default')}
    if(['effects','filters','transitions','vignette','glitch','glow','film grain','lens','light leak'].includes(t)){body.filter=val(box,'preset','Original');body.transition=val(box,'preset','Fade');body.duration=Number(val(box,'effectDuration',1))}
    if(t==='ai captions')body.language=val(box,'captionLang','Auto');
    if(!body.inputPath)return setStatus('Import media first.','error');
    const status=box.querySelector('#pwStatus');if(status)status.textContent=`${tool}: processing…`;
    fetch('/api/editor/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.message||`${tool} failed`);return d}).then(d=>{
      const result=d.result||d.results?.[0];if(result){window.currentMedia={...(window.currentMedia||{}),...result};const v=document.getElementById('preview');if(v){v.src=result.url;v.load()}if(s)c.updateItem(s.id,{src:result.url,name:result.fileName});renderEditorTimeline();setStatus(`${tool} completed and the result is now in the editor.`,'success')}else setStatus(`${tool} completed.`,'success');
    }).catch(e=>{if(status)status.textContent=e.message;setStatus(e.message,'error')});
  }
  function downloadProjectBackup(){const data={format:'tnsproject',version:1,createdAt:new Date().toISOString(),editor:editor()?.getState(),settings:JSON.parse(localStorage.getItem('tnsStudioModuleSettings_edit-video')||'{}')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`tns-project-${Date.now()}.tnsproject.json`;a.click();URL.revokeObjectURL(a.href);setStatus('Project backup created.','success')}
  function openExportModal(preset){
    if(document.getElementById('tnsExportModal'))document.getElementById('tnsExportModal').remove();
    const c=editor(),dur=c?.getTimelineDuration()||0;document.body.insertAdjacentHTML('beforeend',`<div id="tnsExportModal" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeTnsExport">×</button><p class="eyebrow">EXPORT VIDEO</p><h2>Export your TNS project</h2><div class="export-summary"><b>Timeline</b><span>${c?.state.timeline.length||0} layers • ${fmtTime(dur)}</span></div><div class="export-modal-grid">${selectField('Resolution','exQuality',['720','1080','1440','2160'],preset?.includes('4K')?'2160':'1080')}${selectField('Aspect Ratio','exRatio',['9:16','16:9','1:1','4:5'],preset?.includes('16:9')?'16:9':'9:16')}${selectField('Frame Rate','exFps',['24','30','60'],'30')}${selectField('Format','exFormat',['MP4','MOV'],'MP4')}<label>Bitrate<input id="exBitrate" value="8M"></label><label>Audio<input id="exAudio" value="AAC 192k"></label></div><div class="setting-actions"><button id="runTnsExport" class="primary">Export / Download</button><button id="cancelTnsExport" class="secondary">Cancel</button></div><p id="tnsExportStatus" class="status"></p></div></div>`);
    const close=()=>document.getElementById('tnsExportModal')?.remove();document.getElementById('closeTnsExport').onclick=close;document.getElementById('cancelTnsExport').onclick=close;
    document.getElementById('runTnsExport').onclick=async()=>{const st=document.getElementById('tnsExportStatus');st.textContent='Rendering…';try{const d=await editor().exportProject({quality:Number(document.getElementById('exQuality').value),ratio:document.getElementById('exRatio').value,fps:Number(document.getElementById('exFps').value),videoBitrate:document.getElementById('exBitrate').value,audioBitrate:'192k'});if(d.result?.url){const a=document.createElement('a');a.href=d.result.url;a.download=d.result.fileName||'tns-export.mp4';a.target='_blank';a.click();st.textContent='Export complete.';setStatus('Export completed successfully.','success')}else throw Error('Export did not return a file.')}catch(e){st.textContent=e.message;setStatus(e.message,'error')}};
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



// TNS chat-first home dashboard: main entry point for universal assistance.
(function initTnsHomeAssistant(){
  const $id = id => document.getElementById(id);
  const form = $id('homeChatForm');
  const input = $id('homeChatInput');
  const messages = $id('homeChatMessages');
  const status = $id('homeChatStatus');
  const fileInput = $id('homeChatFile');
  const photoInput = $id('homeChatPhoto');
  const cameraInput = $id('homeChatCamera');
  const attachMenu = $id('homeChatAttachMenu');
  const preview = $id('homeChatFilePreview');
  const newChatButton = $id('homeChatNew');
  const historySelect = $id('homeChatHistorySelect');
  const deleteChatButton = $id('homeChatDelete');
  if (!form || !input || !messages) return;
  let currentConversationId = null;
  let historySaveTimer = null;
  // Protect the visible chat from late network responses and stale history saves.
  let conversationViewGeneration = 0;
  const conversationMessages = () => Array.from(messages.querySelectorAll('.home-chat-message'))
    .filter(node => !node.classList.contains('error') && !node.classList.contains('pending'))
    .map(node => { const clone=node.cloneNode(true); clone.querySelectorAll('button').forEach(button=>button.remove()); return {role:node.classList.contains('user')?'user':'assistant',content:String(clone.textContent||'').trim().slice(0,8000)}; })
    .filter(turn=>turn.content && turn.content!=='Soch raha hoon…').slice(-100);
  const refreshConversationList = async (selectId='') => {
    if(!historySelect)return true;
    try { const data=await json('/api/tns-ai/conversations'); const items=Array.isArray(data.conversations)?data.conversations:[];
      historySelect.replaceChildren(); const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='Saved chats'; historySelect.appendChild(placeholder);
      items.forEach(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=(item.title||'Nayi chat').slice(0,80);historySelect.appendChild(option);});
      historySelect.value=selectId||''; if(deleteChatButton)deleteChatButton.disabled=!historySelect.value;
      return true;
    } catch { return false; }
  };
  const saveConversation = async (expectedGeneration=conversationViewGeneration) => {
    const turns=conversationMessages(); if(!turns.length || expectedGeneration!==conversationViewGeneration)return;
    const targetId=currentConversationId;
    try { const data=await json('/api/tns-ai/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:targetId,messages:turns})});
      if(expectedGeneration!==conversationViewGeneration || currentConversationId!==targetId)return;
      currentConversationId=data.conversation.id;
      const refreshed=await refreshConversationList(currentConversationId);
      if(!refreshed)setStatus('Chat save ho gayi, lekin saved-chat list refresh nahi hui. Connection check karke list dobara kholein.');
    } catch { if(expectedGeneration===conversationViewGeneration)setStatus('Chat chal rahi hai, lekin history save nahi ho saki. Dobara login karke ya connection check karke koshish karein.'); }
  };
  const scheduleConversationSave = () => { clearTimeout(historySaveTimer); const generation=conversationViewGeneration; historySaveTimer=setTimeout(()=>saveConversation(generation),250); };
  const startNewConversation = () => { conversationViewGeneration++; clearTimeout(historySaveTimer); currentConversationId=null; messages.replaceChildren(); const welcome=document.createElement('div'); welcome.className='home-welcome-card'; welcome.textContent='Namaste! Main TNS hoon. Aap kya karna chahenge?'; messages.appendChild(welcome); input.value='';fitInput();updateActionButton();if(historySelect)historySelect.value='';if(deleteChatButton)deleteChatButton.disabled=true;setStatus('Nayi chat shuru ho gayi.'); };
  const openConversation = async id => { if(!id)return; const generation=++conversationViewGeneration; clearTimeout(historySaveTimer); try { const data=await json('/api/tns-ai/conversations/'+encodeURIComponent(id)); if(generation!==conversationViewGeneration)return; const c=data.conversation; if(!c)throw new Error('Conversation not found.'); currentConversationId=c.id; messages.replaceChildren(); (c.messages||[]).forEach(turn=>addBubble(turn.content,turn.role)); const hasAttachmentMarker=(c.messages||[]).some(turn=>/📎/.test(turn.content||'')); const refreshed=await refreshConversationList(c.id); if(generation!==conversationViewGeneration)return; if(deleteChatButton)deleteChatButton.disabled=false; setStatus(hasAttachmentMarker?'Purani chat khul gayi. Note: attached file khud save nahi hoti; sirf uska naam/message history mein hai.':(refreshed?'Purani chat khul gayi.':'Purani chat khul gayi, lekin saved-chat list refresh nahi hui.')); if(hasAttachmentMarker&&!refreshed)setStatus('Purani chat khul gayi; attachment dobara chahiye to file phir se chunein. Saved-chat list refresh nahi hui.'); } catch(error) { if(generation===conversationViewGeneration)setStatus(error.message||'Chat history nahi khul saki.'); } };
  newChatButton?.addEventListener('click',startNewConversation);
  historySelect?.addEventListener('change',()=>{if(historySelect.value)openConversation(historySelect.value);else if(deleteChatButton)deleteChatButton.disabled=true;});
  deleteChatButton?.addEventListener('click',async()=>{const id=currentConversationId||historySelect?.value;if(!id)return;if(!window.confirm('Kya aap is chat ko delete karna chahte hain?'))return;try{await json('/api/tns-ai/conversations/'+encodeURIComponent(id),{method:'DELETE'});if(id===currentConversationId)startNewConversation();await refreshConversationList();setStatus('Chat delete ho gayi.');}catch(error){setStatus(error.message||'Chat delete nahi ho saki.');}});
  refreshConversationList().then(ok=>{if(!ok)setStatus('Saved chat list abhi load nahi hui. Connection check karke dobara koshish karein.');});
  let researchEnabled = false;
  let attachedFile = null;
  let isSending = false;
  let retryingPreviousMessage = false;
  let speakNextReply = false;
  // Generation tokens prevent late AI responses or old speech events from restarting
  // playback or overwriting the status after a newer request/Stop action.
  let homeSpeechGeneration = 0;
  window.addEventListener('tns:stop-voice-playback',()=>{homeSpeechGeneration++;});
  let voiceRecognition = null;
  const voiceLanguageEl=document.getElementById('voiceLanguage');
  const voiceChoiceEl=document.getElementById('voiceSystemVoice');
  const voiceRateEl=document.getElementById('voiceSpeechRate');
  function selectedVoiceLanguage(){
    const chosen=voiceLanguageEl?.value||'auto';
    if(chosen!=='auto')return chosen;
    const code=localStorage.getItem('tnsStudioLanguage')||'hi';
    return ({hi:'hi-IN',en:'en-IN',ta:'ta-IN',kn:'kn-IN',te:'te-IN',bn:'bn-IN',gu:'gu-IN',pa:'pa-IN',ml:'ml-IN',mr:'mr-IN',ur:'ur-IN',or:'or-IN',ar:'ar-SA',ru:'ru-RU',zh:'zh-CN',ja:'ja-JP',ko:'ko-KR',th:'th-TH',el:'el-GR',he:'he-IL'})[code]||code;
  }
  const MAX_FILE_BYTES = 1200 * 1024;
  const allowedImageExtensions = new Set(['.png','.jpg','.jpeg','.webp','.gif','.bmp','.heic','.heif']);
  const allowedExtensions = new Set([...allowedImageExtensions,'.pdf','.txt','.doc','.docx','.csv','.xls','.xlsx','.ppt','.pptx','.rtf','.odt','.ods','.odp','.json','.xml','.zip']);
  const fileExtension = name => { const i=String(name||'').lastIndexOf('.'); return i>=0?String(name).slice(i).toLowerCase():''; };
  const renderAttachment = () => {
    if (!preview) return;
    preview.replaceChildren();
    preview.classList.toggle('hidden', !attachedFile);
    if (!attachedFile) return;
    const label=document.createElement('span');
    label.textContent=`📎 ${attachedFile.name} · ${(attachedFile.size/1024).toFixed(0)} KB`;
    const remove=document.createElement('button');
    remove.type='button'; remove.className='home-attachment-remove'; remove.textContent='Hataayein';
    remove.addEventListener('click',()=>{ attachedFile=null; [fileInput,photoInput,cameraInput].forEach(el=>{if(el)el.value='';}); renderAttachment(); setStatus('Attachment hata diya gaya.'); });
    preview.append(label,remove);
  };
  const setSending = busy => {
    isSending=busy;
    form.querySelectorAll('button').forEach(button=>{ button.disabled=busy; });
    if(input) input.disabled=busy;
    [fileInput,photoInput,cameraInput].forEach(el=>{if(el)el.disabled=busy;});
    if(newChatButton)newChatButton.disabled=busy;
    if(historySelect)historySelect.disabled=busy;
    if(deleteChatButton)deleteChatButton.disabled=busy||!historySelect?.value;
    const attachButton=$id('homeChatAttach');
    if(attachButton)attachButton.disabled=busy;
    if(attachMenu)attachMenu.classList.add('hidden');
    form.classList.toggle('is-sending',busy);
  };
  const addBubble = (text, role='assistant', isError=false) => {
    const welcome = messages.querySelector('.home-welcome-card');
    if (welcome) welcome.remove();
    const node = document.createElement('div');
    node.className = `home-chat-message ${role}${isError ? ' error' : ''}`;
    node.textContent = text;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };
  const setStatus = text => { if (status) status.textContent = text || ''; };
  const fitInput = () => { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,140)+'px'; };
  // On phones, focusing the composer hides introductory cards and bottom navigation,
  // giving the user a clear writing area while the on-screen keyboard is open.
  input.addEventListener('focus', () => { document.body.classList.add('tns-chat-typing'); positionComposerAboveKeyboard(); });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (document.activeElement !== input) { document.body.classList.remove('tns-chat-typing'); form.style.bottom = ''; }
    }, 160);
  });
  $id('homeChatAttach')?.setAttribute('aria-expanded','false');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && attachMenu && !attachMenu.classList.contains('hidden')) {
      attachMenu.classList.add('hidden');
      $id('homeChatAttach')?.setAttribute('aria-expanded','false');
      $id('homeChatAttach')?.focus();
    }
  });
  const actionButton = $id('homeChatVoice');
  const dictationButton = $id('homeChatDictation');
  const recordingBar = $id('homeChatRecordingBar');
  let dictationOriginalText = '';
  let dictationTranscript = '';
  // Inner-chat-microphone only: use the real input level to animate the recording waveform.
  let dictationMeterStream = null;
  let dictationMeterContext = null;
  let dictationMeterFrame = 0;
  const stopDictationMeter = () => {
    if (dictationMeterFrame) cancelAnimationFrame(dictationMeterFrame);
    dictationMeterFrame = 0;
    if (dictationMeterStream) dictationMeterStream.getTracks().forEach(track => track.stop());
    dictationMeterStream = null;
    if (dictationMeterContext) { try { dictationMeterContext.close(); } catch {} }
    dictationMeterContext = null;
    recordingBar?.querySelectorAll('.recording-wave i').forEach(bar => { bar.style.removeProperty('--voice-level'); bar.style.opacity = ''; });
  };
  const startDictationMeter = async () => {
    stopDictationMeter();
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!dictationButton?.classList.contains('is-listening')) { stream.getTracks().forEach(track => track.stop()); return; }
      dictationMeterStream = stream;
      dictationMeterContext = new AudioContext();
      const source = dictationMeterContext.createMediaStreamSource(stream);
      const analyser = dictationMeterContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const bars = Array.from(recordingBar?.querySelectorAll('.recording-wave i') || []);
      const draw = () => {
        if (!dictationMeterContext || !dictationButton?.classList.contains('is-listening')) return;
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) { const normalized = (sample - 128) / 128; sum += normalized * normalized; }
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 5.5);
        bars.forEach((bar, index) => {
          const shape = 0.18 + Math.abs(Math.sin(index * 0.72 + performance.now() / 170)) * 0.25;
          const height = 4 + level * 29 * shape * 2.4;
          bar.style.setProperty('--voice-level', String(Math.min(1, height / 32)));
          bar.style.opacity = String(0.55 + level * 0.45);
        });
        dictationMeterFrame = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // SpeechRecognition can still work if browser doesn't allow a second meter stream.
      stopDictationMeter();
    }
  };
  const showRecordingBar = (show) => { if(recordingBar) recordingBar.classList.toggle('hidden', !show); if(form) form.classList.toggle('is-dictating', show); };
  const setMicListeningUI = (listening) => {
    // Step 10: only the microphone inside the chat box owns this recording UI.
    const button = dictationButton;
    if (!button) return;
    button.classList.toggle('is-listening', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.dataset.listening = String(listening);
    showRecordingBar(listening);
    if (listening) startDictationMeter(); else stopDictationMeter();
  };
  const stopSpeechInput = () => {
    const active = voiceRecognition;
    if (!active) return false;
    setMicListeningUI(false);
    try { active.stop(); } catch {}
    voiceRecognition = null;
    setStatus('Microphone band ho gaya. Dobara bolne ke liye mic tap karein.');
    return true;
  };
  const updateActionButton = () => {
    const hasText = Boolean(input.value.trim());
    if (!actionButton) return;
    actionButton.classList.toggle('is-send', hasText);
    actionButton.classList.toggle('is-voice-mode', !hasText);
    actionButton.innerHTML = hasText ? '↑' : '<span class="home-wave-mic" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
    actionButton.setAttribute('aria-label', hasText ? 'Send message' : 'TNS se voice mein baat karein');
    actionButton.title = hasText ? 'Message bhejein' : 'TNS se voice mein baat karein';
  };
  const startSpeechInput = (conversationMode) => {
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){setStatus('Is browser mein microphone voice input supported nahi hai. Keyboard se likh sakte hain.');return;}
    if(voiceRecognition){try{voiceRecognition.stop()}catch{} voiceRecognition=null;}
    const recognition=new SpeechRecognition(); voiceRecognition=recognition;
    recognition.lang=selectedVoiceLanguage();
    recognition.interimResults=true; recognition.maxAlternatives=1;
    if(!conversationMode){dictationOriginalText=input.value;dictationTranscript='';}
    let receivedSpeech=false;
    let finalStatusSet=false;
    setMicListeningUI(true);
    setStatus(conversationMode?'🔴 Microphone CHALU hai — ab boliye. Band karne ke liye mic dobara tap karein.':'🔴 Microphone CHALU hai — apna message boliye. Band karne ke liye mic dobara tap karein.');
    recognition.onstart=()=>{if(voiceRecognition!==recognition)return;setMicListeningUI(true);setStatus(conversationMode?'🔴 Microphone CHALU hai — ab apna sawal boliye.':'🔴 Microphone CHALU hai — ab apna message boliye.');};
    recognition.onresult=event=>{
      if(voiceRecognition!==recognition)return;
      let spoken='';
      for(let i=event.resultIndex||0;i<(event.results?.length||0);i++){const result=event.results[i];if(result.isFinal)spoken+=result?.[0]?.transcript||'';}
      if(!spoken.trim())return;
      receivedSpeech=true; finalStatusSet=true;
      if(conversationMode){input.value=(input.value ? input.value+' ' : '')+spoken.trim();fitInput();updateActionButton();speakNextReply=true;setStatus('Aapki baat samajh raha hoon… TNS jawab awaaz mein dega.');form.requestSubmit();}
      else {dictationTranscript=(dictationTranscript+' '+spoken.trim()).trim();input.value=(dictationOriginalText ? dictationOriginalText+' ' : '')+dictationTranscript;fitInput();updateActionButton();setStatus('Aap bol rahe hain… recording rokne ya bhejne ke liye neeche buttons use karein.');}
    };
    recognition.onnomatch=()=>{if(voiceRecognition!==recognition)return;finalStatusSet=true;setStatus('Awaaz samajh nahi aayi. Dobara boliye ya type karein.');};
    recognition.onerror=event=>{
      if(voiceRecognition!==recognition)return;
      finalStatusSet=true;
      const reason=event?.error==='not-allowed'||event?.error==='service-not-allowed'
        ?'Microphone permission allow karein, phir dobara koshish karein.'
        :event?.error==='no-speech'?'Koi awaaz detect nahi hui. Dobara boliye.'
        :'Voice input nahi ho saka. Microphone permission check karein ya type karein.';
      setStatus(reason);
    };
    recognition.onend=()=>{
      if(voiceRecognition!==recognition)return;
      setMicListeningUI(false);
      voiceRecognition=null;
      if(dictationTranscript.trim()) showRecordingBar(true);
      if(!receivedSpeech&&!finalStatusSet)setStatus('Koi awaaz detect nahi hui. Dobara boliye ya type karein.');
    };
    try{recognition.start()}catch{setMicListeningUI(false);if(voiceRecognition===recognition)voiceRecognition=null;setStatus('Voice input shuru nahi ho saka. Browser permission aur microphone check karein.');}
  };
  const positionComposerAboveKeyboard = () => {
    if (!document.body.classList.contains('tns-chat-typing')) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const keyboardGap = Math.max(8, window.innerHeight - viewport.height - viewport.offsetTop + 8);
    form.style.bottom = `${keyboardGap}px`;
  };
  input.addEventListener('input', () => { fitInput(); updateActionButton(); });
  updateActionButton();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', positionComposerAboveKeyboard);
    window.visualViewport.addEventListener('scroll', positionComposerAboveKeyboard);
  }
  window.addEventListener('resize', positionComposerAboveKeyboard);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  const clearOtherInputs = keep => [fileInput,photoInput,cameraInput].forEach(el=>{if(el && el!==keep)el.value='';});
  const openPicker = picker => {
    if(!picker)return;
    if(attachMenu)attachMenu.classList.add('hidden');
    $id('homeChatAttach')?.setAttribute('aria-expanded','false');
    picker.click();
  };
  $id('homeChatAttach')?.addEventListener('click',()=>{
    if(!attachMenu)return;
    const opening=attachMenu.classList.contains('hidden');
    attachMenu.classList.toggle('hidden',!opening);
    $id('homeChatAttach')?.setAttribute('aria-expanded',String(opening));
  });
  $id('homeChatChoosePhoto')?.addEventListener('click',()=>openPicker(photoInput));
  $id('homeChatChooseFile')?.addEventListener('click',()=>openPicker(fileInput));
  $id('homeChatOpenCamera')?.addEventListener('click',()=>openPicker(cameraInput));
  document.addEventListener('click',event=>{
    if(attachMenu && !event.target.closest('.home-attach-wrap')){attachMenu.classList.add('hidden');$id('homeChatAttach')?.setAttribute('aria-expanded','false');}
  });
  [fileInput,photoInput,cameraInput].forEach(picker=>picker?.addEventListener('change',()=>{
    const selected=picker.files?.[0]||null;
    if(!selected)return;
    const ext=fileExtension(selected.name);
    const isImage=selected.type.startsWith('image/') || allowedImageExtensions.has(ext);
    if((picker===photoInput || picker===cameraInput) && (!isImage || !allowedImageExtensions.has(ext))){
      picker.value=''; setStatus('Sirf supported photo format chunein: JPG, PNG, WEBP, GIF, BMP ya HEIC.'); return;
    }
    if(picker===fileInput && !allowedExtensions.has(ext)){
      picker.value=''; setStatus('Yeh document format abhi supported nahi hai. PDF, Office document, TXT, CSV ya ZIP chunein.'); return;
    }
    if(selected.size>=MAX_FILE_BYTES){
      picker.value=''; setStatus('File 1.2 MB se chhoti honi chahiye.'); return;
    }
    clearOtherInputs(picker);
    attachedFile=selected;
    // The existing send workflow reads the shared file input, so transfer selection to it.
    if(picker!==fileInput){
      try {
        const transfer=new DataTransfer();
        transfer.items.add(selected);
        fileInput.files=transfer.files;
      } catch {
        // Keep the selected File object; submit logic below uses attachedFile directly.
      }
    }
    renderAttachment();
    setStatus(picker===cameraInput?'Camera photo attach ho gayi. Bhejne se pehle sawal likh sakte hain.':'Attachment jud gaya. Ab sawal likhein aur bhejein.');
  }));
  $id('homeResearchBtn')?.addEventListener('click',event=>{
    researchEnabled=!researchEnabled;
    event.currentTarget.classList.toggle('active',researchEnabled);
    event.currentTarget.setAttribute('aria-pressed',String(researchEnabled));
    event.currentTarget.textContent=researchEnabled?'🔎 Research On':'🔎 Research';
    setStatus(researchEnabled ? 'Live Web Research on: TNS website sources dhoondhega aur batayega kya kahan milega aur kaise aage badhna hai.' : 'Research mode band hai.');
  });
  $id('homeExploreToolsBtn')?.addEventListener('click',event=>{
    const grid=$id('homeToolsGrid');
    if(!grid)return;
    const opening=grid.classList.contains('hidden');
    grid.classList.toggle('hidden',!opening);
    event.currentTarget.setAttribute('aria-expanded',String(opening));
    event.currentTarget.textContent=opening?'☷ Tools band karein':'☷ Saare tools';
  });
  document.querySelectorAll('[data-home-prompt]').forEach(button=>button.addEventListener('click',()=>{
    input.value=(button.getAttribute('data-home-prompt')||'')+input.value;
    input.focus(); fitInput();
  }));
  // Outer microphone opens a dedicated voice-to-voice screen. It never submits
  // to the visible chat composer and never creates chat bubbles.
  const voiceOnlyPanel=$id('voiceConversation');
  const voiceOnlyStatus=$id('voiceOnlyStatus');
  const voiceOnlyOrb=$id('voiceOnlyOrb');
  const voiceOnlyStart=$id('voiceOnlyStart');
  const voiceOnlyStop=$id('voiceOnlyStop');
  let voiceOnlyRecognition=null;
  let voiceOnlyActive=false;
  let voiceOnlyBusy=false;
  let voiceOnlyTurn=0;
  const setVoiceOnlyStatus=text=>{if(voiceOnlyStatus)voiceOnlyStatus.textContent=text;};
  const setVoiceOnlyState=state=>{if(voiceOnlyPanel)voiceOnlyPanel.dataset.state=state;if(voiceOnlyOrb)voiceOnlyOrb.dataset.state=state;};
  const stopVoiceOnlyRecognition=()=>{const r=voiceOnlyRecognition;voiceOnlyRecognition=null;if(r){r.onresult=r.onerror=r.onend=null;try{r.abort()}catch{try{r.stop()}catch{}}}};
  const endVoiceOnly=({returnToChat=true}={})=>{
    voiceOnlyActive=false;voiceOnlyBusy=false;voiceOnlyTurn++;stopVoiceOnlyRecognition();
    try{window.speechSynthesis?.cancel()}catch{}
    setVoiceOnlyState('idle');setVoiceOnlyStatus('Voice conversation band hai.');
    if(voiceOnlyStart)voiceOnlyStart.disabled=false;if(voiceOnlyStop)voiceOnlyStop.disabled=true;
    if(returnToChat)showPanel('dashboard');
  };
  const startVoiceOnlyListening=()=>{
    if(!voiceOnlyActive||voiceOnlyBusy)return;
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){setVoiceOnlyStatus('Is browser mein speech recognition supported nahi hai. Chrome ya supported browser mein try karein.');setVoiceOnlyState('error');voiceOnlyActive=false;if(voiceOnlyStart)voiceOnlyStart.disabled=false;if(voiceOnlyStop)voiceOnlyStop.disabled=true;return;}
    const recognition=new SpeechRecognition();voiceOnlyRecognition=recognition;recognition.lang=selectedVoiceLanguage();recognition.interimResults=true;recognition.continuous=false;recognition.maxAlternatives=1;
    let finalText='';
    recognition.onstart=()=>{if(voiceOnlyRecognition!==recognition||!voiceOnlyActive)return;setVoiceOnlyState('listening');setVoiceOnlyStatus('🎙 Aap sun raha hoon… boliye.');};
    recognition.onresult=event=>{if(voiceOnlyRecognition!==recognition||!voiceOnlyActive)return;for(let i=event.resultIndex||0;i<(event.results?.length||0);i++){const res=event.results[i];const phrase=String(res?.[0]?.transcript||'').trim();if(res?.isFinal&&phrase)finalText+=(finalText?' ':'')+phrase;else if(phrase)setVoiceOnlyStatus('Aap: '+phrase);}};
    recognition.onerror=event=>{if(voiceOnlyRecognition!==recognition||!voiceOnlyActive)return;voiceOnlyRecognition=null;if(event?.error==='not-allowed'||event?.error==='service-not-allowed'){setVoiceOnlyStatus('Microphone permission allow karke dobara Start dabayein.');setVoiceOnlyState('error');voiceOnlyActive=false;if(voiceOnlyStart)voiceOnlyStart.disabled=false;if(voiceOnlyStop)voiceOnlyStop.disabled=true;}else if(event?.error==='no-speech'){setVoiceOnlyStatus('Awaaz nahi mili. Sun raha hoon—dobara boliye.');setTimeout(startVoiceOnlyListening,250);}else{setVoiceOnlyStatus('Voice input mein dikkat aayi. Dobara sunne ki koshish kar raha hoon.');setTimeout(startVoiceOnlyListening,500);}};
    recognition.onend=()=>{if(voiceOnlyRecognition!==recognition||!voiceOnlyActive)return;voiceOnlyRecognition=null;if(finalText.trim())void handleVoiceOnlyTurn(finalText.trim());else if(!voiceOnlyBusy)setTimeout(startVoiceOnlyListening,180);};
    try{recognition.start()}catch{voiceOnlyRecognition=null;setVoiceOnlyStatus('Microphone shuru nahi ho saka. Permission check karein.');setVoiceOnlyState('error');voiceOnlyActive=false;if(voiceOnlyStart)voiceOnlyStart.disabled=false;if(voiceOnlyStop)voiceOnlyStop.disabled=true;}
  };
  const handleVoiceOnlyTurn=async spokenText=>{
    if(!voiceOnlyActive||voiceOnlyBusy)return;voiceOnlyBusy=true;const turn=++voiceOnlyTurn;setVoiceOnlyState('thinking');setVoiceOnlyStatus('TNS aapki baat samajh raha hai…');
    try{
      const result=await json('/api/tns-ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:spokenText,history:[],research:false,appLanguage:localStorage.getItem('tnsStudioLanguage')||'hi',replyLanguage:selectedVoiceLanguage(),preferRequestedLanguage:voiceLanguageEl?.value!=='auto'})});
      if(!voiceOnlyActive||turn!==voiceOnlyTurn)return;
      const reply=String(result.reply||result.text||'Maaf kijiye, jawab nahi mila.');
      if(result.demo||result.provider==='mock')setVoiceOnlyStatus('Demo mode: asli AI service abhi connect nahi hai. Jawab awaaz mein sun rahe hain…');else setVoiceOnlyStatus('TNS jawab de raha hai…');
      if(!('speechSynthesis' in window)||typeof window.SpeechSynthesisUtterance!=='function'){setVoiceOnlyStatus('Is browser mein voice playback supported nahi hai.');setVoiceOnlyState('error');voiceOnlyBusy=false;return;}
      const utterance=new SpeechSynthesisUtterance(reply);utterance.lang=selectedVoiceLanguage();utterance.rate=Math.min(2,Math.max(.5,Number(voiceRateEl?.value||1)));
      const voices=window.speechSynthesis.getVoices?.()||[];const wanted=String(utterance.lang).toLowerCase().replace('_','-');const chosen=voices.find(v=>v.voiceURI===voiceChoiceEl?.value&&String(v.lang||'').toLowerCase().startsWith(wanted.split('-')[0]))||voices.find(v=>String(v.lang||'').toLowerCase().replace('_','-')===wanted)||voices.find(v=>String(v.lang||'').toLowerCase().startsWith(wanted.split('-')[0]));if(chosen)utterance.voice=chosen;
      utterance.onstart=()=>{if(voiceOnlyActive&&turn===voiceOnlyTurn){setVoiceOnlyState('speaking');setVoiceOnlyStatus('🔊 TNS bol raha hai…');}};
      utterance.onend=()=>{if(!voiceOnlyActive||turn!==voiceOnlyTurn)return;voiceOnlyBusy=false;setVoiceOnlyState('listening');setVoiceOnlyStatus('Aapki baari—boliye.');setTimeout(startVoiceOnlyListening,250);};
      utterance.onerror=()=>{if(!voiceOnlyActive||turn!==voiceOnlyTurn)return;voiceOnlyBusy=false;setVoiceOnlyState('error');setVoiceOnlyStatus('TNS ka voice jawab nahi chal saka. Dobara boliye.');setTimeout(startVoiceOnlyListening,500);};
      window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
    }catch(error){if(!voiceOnlyActive||turn!==voiceOnlyTurn)return;voiceOnlyBusy=false;setVoiceOnlyState('error');setVoiceOnlyStatus(String(error?.message||'TNS se jawab nahi mil saka.'));setTimeout(startVoiceOnlyListening,900);}
  };
  const beginVoiceOnly=()=>{if(voiceOnlyActive)return;voiceOnlyActive=true;voiceOnlyBusy=false;voiceOnlyTurn++;if(voiceOnlyStart)voiceOnlyStart.disabled=true;if(voiceOnlyStop)voiceOnlyStop.disabled=false;setVoiceOnlyState('listening');setVoiceOnlyStatus('Microphone taiyar ho raha hai… boliye.');startVoiceOnlyListening();};
  $id('homeChatVoice')?.addEventListener('click',()=>{showPanel('voiceConversation');setVoiceOnlyStatus('Voice-only mode shuru ho raha hai…');setVoiceOnlyState('idle');if(voiceOnlyStart)voiceOnlyStart.disabled=false;if(voiceOnlyStop)voiceOnlyStop.disabled=true;beginVoiceOnly();});
  voiceOnlyStart?.addEventListener('click',beginVoiceOnly);
  voiceOnlyStop?.addEventListener('click',()=>endVoiceOnly());
  $id('voiceOnlyClose')?.addEventListener('click',()=>endVoiceOnly());
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&voiceOnlyPanel?.classList.contains('active'))endVoiceOnly();});
  $id('homeChatDictation')?.addEventListener('click',()=>{
    if (voiceRecognition) { stopSpeechInput(); return; }
    startSpeechInput(false);
  });
  $id('homeChatRecordingCancel')?.addEventListener('click',()=>{
    if(voiceRecognition){const active=voiceRecognition;voiceRecognition=null;try{active.abort();}catch{try{active.stop();}catch{}}}
    input.value=dictationOriginalText;dictationTranscript='';fitInput();updateActionButton();setMicListeningUI(false);showRecordingBar(false);setStatus('Voice recording cancel kar di gayi.');
  });
  $id('homeChatRecordingStop')?.addEventListener('click',()=>{
    if(voiceRecognition){const active=voiceRecognition;try{active.stop();}catch{}voiceRecognition=null;}
    setMicListeningUI(false);showRecordingBar(Boolean(dictationTranscript.trim()));setStatus(dictationTranscript?'Recording ruk gayi. Bhejne ke liye neela arrow dabayein.':'Recording ruk gayi. Koi speech text nahi mila.');
  });
  $id('homeChatRecordingSend')?.addEventListener('click',()=>{
    if(voiceRecognition){const active=voiceRecognition;try{active.stop();}catch{}voiceRecognition=null;}
    setMicListeningUI(false);showRecordingBar(false);
    if(!dictationTranscript.trim()){setStatus('Pehle microphone mein boliye, phir bhejein.');return;}
    input.value=(dictationOriginalText ? dictationOriginalText+' ' : '')+dictationTranscript;fitInput();updateActionButton();form.requestSubmit();dictationTranscript='';
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(isSending){
      // If a retry submit races with an active request, consume its one-shot marker.
      // Otherwise a later normal message could be mistaken for a retry and lose its user bubble.
      retryingPreviousMessage=false;
      return;
    }
    const message=input.value.trim();
    if(!message && !attachedFile)return;
    if(attachedFile && attachedFile.size>=MAX_FILE_BYTES){
      setStatus('File 1.2 MB se chhoti honi chahiye.');
      return;
    }
    const shownMessage=message || `Is file ko samajhne mein madad karein: ${attachedFile.name}`;
    const originalMessage=message;
    const isRetrySubmission=retryingPreviousMessage;
    const requestViewGeneration=conversationViewGeneration;
    // Send a bounded conversation context to the AI provider. Capture it before
    // adding this turn's user bubble so the current message is not duplicated.
    const conversationHistory = conversationMessages().slice(-12);
    // Snapshot the one-shot voice request and invalidate events from older replies.
    homeSpeechGeneration++;
    try{window.speechSynthesis?.cancel()}catch{}
    const speechGenerationAtSubmit=homeSpeechGeneration;
    const shouldSpeakThisReply=speakNextReply;
    speakNextReply=false;
    retryingPreviousMessage=false;
    // The original user bubble already exists when retrying; do not duplicate it.
    if(!isRetrySubmission) addBubble(shownMessage+(attachedFile?`\n\n📎 ${attachedFile.name}`:''),'user');
    input.value=''; fitInput(); updateActionButton();
    const fileToSend=attachedFile;
    attachedFile=null;
    [fileInput,photoInput,cameraInput].forEach(el=>{if(el)el.value='';});
    renderAttachment();
    setSending(true);
    setStatus(researchEnabled?'Research request par kaam ho raha hai…':'TNS jawab taiyar kar raha hai…');
    const pending=addBubble('Soch raha hoon…','assistant');
    try{
      let result;
      if(fileToSend){
        const dataUrl=await new Promise((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(reader.result);
          reader.onerror=()=>reject(new Error('File padhne mein dikkat aayi.'));
          reader.readAsDataURL(fileToSend);
        });
        result=await json('/api/tns-ai/understand',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            message:message || `Please analyze this file and explain it in the selected language: ${fileToSend.name}`,
            research:researchEnabled,
            appLanguage:localStorage.getItem('tnsStudioLanguage')||'en',
            file:{name:fileToSend.name,type:fileToSend.type,data:dataUrl}
          })
        });
      }else{
        result=await json('/api/tns-ai/chat',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message,history:conversationHistory,research:researchEnabled,appLanguage:localStorage.getItem('tnsStudioLanguage')||'en',replyLanguage:selectedVoiceLanguage(),preferRequestedLanguage:voiceLanguageEl?.value!=='auto'})
        });
      }
      if(requestViewGeneration!==conversationViewGeneration){ pending.remove(); return; }
      let displayedReply=result.reply||result.text||'TNS se response nahi mila.';
      if(result.research && Array.isArray(result.sources) && result.sources.length && !(result.provider==='mock')) {
        displayedReply += '\n\nSources:\n' + result.sources.map((source,index)=>`${index+1}. ${source.title} — ${source.url}`).join('\n');
      }
      pending.textContent=displayedReply;
      pending.classList.remove('error');
      if(result.demo || result.provider==='mock') {
        setStatus('Demo jawab: abhi real AI service connected nahi hai.');
        pending.classList.add('demo-response');
      } else {
        pending.classList.remove('demo-response');
      }
      const shouldSpeakReply=shouldSpeakThisReply && speechGenerationAtSubmit===homeSpeechGeneration;
      if(shouldSpeakReply){
        const spokenReply=pending.textContent;
        if('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window){
          window.speechSynthesis.cancel();
          const utterance=new SpeechSynthesisUtterance(spokenReply);
          const lang=(voiceLanguageEl?.value&&voiceLanguageEl.value!=='auto')?selectedVoiceLanguage():(result.replyLanguage||localStorage.getItem('tnsStudioLanguage')||'hi');
          utterance.lang=lang==='Hindi'?'hi-IN':lang==='English'?'en-IN':lang==='Tamil'?'ta-IN':lang==='Kannada'?'kn-IN':lang==='Telugu'?'te-IN':lang==='Bengali'?'bn-IN':lang==='Gujarati'?'gu-IN':lang==='Punjabi'?'pa-IN':lang==='Malayalam'?'ml-IN':lang==='Odia'?'or-IN':lang==='hi'?'hi-IN':lang==='en'?'en-IN':lang;
          utterance.rate=Math.min(2,Math.max(0.5,Number(voiceRateEl?.value||1)));
          const wanted=String(utterance.lang||'').toLowerCase().replace('_','-');
          const voices=window.speechSynthesis.getVoices?.()||[];
          const chosen=voices.find(v=>v.voiceURI===voiceChoiceEl?.value);
          const compatible=v=>String(v?.lang||'').toLowerCase().replace('_','-').split('-')[0]===wanted.split('-')[0];
          utterance.voice=chosen&&compatible(chosen)?chosen:(voices.find(v=>String(v.lang||'').toLowerCase().replace('_','-')===wanted)||voices.find(compatible)||null);
          const playbackGeneration=homeSpeechGeneration;
          utterance.onstart=()=>{if(playbackGeneration===homeSpeechGeneration)setStatus('TNS awaaz mein jawab de raha hai…');};
          utterance.onend=()=>{if(playbackGeneration===homeSpeechGeneration)setStatus('Voice jawab poora hua.');};
          utterance.onerror=()=>{if(playbackGeneration===homeSpeechGeneration)setStatus('Jawab text mein aa gaya; is browser mein voice playback nahi chal saka.');};
          window.speechSynthesis.speak(utterance);
        }else setStatus('Jawab text mein aa gaya; is browser mein voice playback supported nahi hai.');
      } else if(!(result.demo || result.provider==='mock')) {
        setStatus(researchEnabled?'Research response aa gaya. Sources aur step-by-step details ko reply mein dekhein.':'Response aa gaya.');
      }
      speakNextReply=false;
    }catch(error){
      if(requestViewGeneration!==conversationViewGeneration){ pending.remove(); return; }
      const rawError=String(error?.message||'Request failed.').trim();
      let friendlyError=rawError;
      if(/failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(rawError)){
        friendlyError='Internet ya server connection mein dikkat hai. Connection check karke dobara koshish karein.';
      }else if(/provider.{0,35}(not configured|unavailable|not available)|ai service.{0,35}(not configured|unavailable|not available)|no ai provider/i.test(rawError)){
        friendlyError='TNS AI service abhi connected ya available nahi hai. Service configure hone ke baad dobara koshish karein.';
      }else if(/file padhne mein dikkat/i.test(rawError)){
        friendlyError='File padhne mein dikkat aayi. File dobara chunein aur phir koshish karein.';
      }
      pending.textContent=`Abhi jawab nahi mil saka: ${friendlyError} Aapka sawal yahin hai—dobara koshish kar sakte hain.`;
      pending.classList.add('error');
      const retryButton=document.createElement('button');
      retryButton.type='button';
      retryButton.className='home-chat-retry';
      retryButton.textContent='Dobara koshish karein';
      retryButton.setAttribute('aria-label','Pichhla sawal dobara bhejein');
      let retryStarted=false;
      retryButton.addEventListener('click',()=>{
        // Guard even if a click event is dispatched again before the UI settles.
        if(retryStarted) return;
        retryStarted=true;
        retryButton.disabled=true;
        // Retry the exact failed payload, not any newer text or attachment the user may have selected.
        input.value=originalMessage;
        fitInput();
        updateActionButton();
        attachedFile=fileToSend;
        if(fileToSend && fileInput){
          try {
            const transfer=new DataTransfer();
            transfer.items.add(fileToSend);
            fileInput.files=transfer.files;
          } catch { /* The retained File object is still used by the submit handler. */ }
        }
        renderAttachment();
        // Remove the previous failed response; a new attempt will create its own status bubble.
        pending.remove();
        retryingPreviousMessage=true;
        if(input.value.trim() || attachedFile) form.requestSubmit();
        else { retryingPreviousMessage=false; retryStarted=false; retryButton.disabled=false; setStatus('Dobara bhejne ke liye pichhla sawal ya file maujood nahi hai.'); }
      });
      pending.appendChild(retryButton);
      // Keep the user's text and attachment available for retry if the request fails.
      if(fileToSend){ attachedFile=fileToSend; renderAttachment(); }
      if(originalMessage && !input.value.trim()){ input.value=originalMessage; fitInput(); updateActionButton(); }
      speakNextReply=false;
      setStatus(fileToSend?'Request fail hui. Aapki file aur sawal dobara bhejne ke liye rakhe gaye hain.':'Request complete nahi hui. Aap apna sawal dobara bhej sakte hain.');
    } finally {
      setSending(false);
    }
    if(requestViewGeneration===conversationViewGeneration) scheduleConversationSave();
    messages.scrollTop=messages.scrollHeight;
  });
})();






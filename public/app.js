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
      else if(target==='settings')openSettings();
      else if(target==='premium')showPanel('premium');
      else if(target==='voiceConversation')showPanel('voiceConversation');
    });
    document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!toggle.contains(e.target))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindMenu,{once:true});else bindMenu();
})();

function showAuthScreens(which){['authScreen','otpScreen'].forEach(id=>$('#'+id)?.classList.toggle('hidden',id!==which))}
function enterTns(user){if(user)setUser(user);showAuthScreens(null);$('#app')?.classList.remove('hidden');bootDashboard()}
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
function startLanguage(){enterTns(authenticatedUser)}
function bootDashboard(){loadSettings();applyLanguageMeta(localStorage.getItem('tnsStudioLanguage')||'en');renderProjects()}
function initMasterScreenLinks(){
  document.querySelectorAll('[data-open-screen]').forEach(b=>b.addEventListener('click',()=>showPanel(b.dataset.openScreen)));
}

function applyLanguageMeta(code){const item=(window.TNSLanguageRegistry||[]).find(x=>x.code===code);document.documentElement.lang=code||'en';document.documentElement.dir=item?.rtl?'rtl':'ltr'}
function renderCountrySelect(id){const select=$(id);if(!select)return;const list=window.TNSCountryConfig?.countries||[];select.innerHTML=list.map(([code,name,calling])=>`<option value="${calling}" data-country="${code}">${escapeHtml(name)} ${calling}</option>`).join('');const wanted=window.TNSCountryConfig?.defaultCallingCode||'+91';select.value=wanted;}
function countryCallingCode(id){return String($(id)?.value||'').trim();}
function normalizeMobileInput(number,code){const digits=String(number||'').replace(/\D/g,'');const calling=String(code||'').replace(/[^0-9+]/g,'');if(!digits||!calling)return '';return `${calling}${digits}`;}
function getAuthMode(){return document.querySelector('.auth-mode.active')?.dataset.authMode||'email'}
let otpLoginEnabled=false;
function setAuthMode(mode){$$('#authScreen .auth-mode').forEach(x=>{const active=x.dataset.authMode===mode;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});const mobile=mode==='mobile';$('#emailField')?.classList.toggle('hidden',mobile);$('#mobileField')?.classList.toggle('hidden',!mobile);$('#loginEmail')?.toggleAttribute('required',!mobile);$('#loginMobile')?.toggleAttribute('required',mobile);const button=$('#otpRequestBtn');if(button)button.textContent=otpLoginEnabled?(mobile?'Continue with Mobile Number':'Continue with Email'):'Continue to Dashboard';$('#passwordLoginField')?.classList.toggle('hidden',otpLoginEnabled);$('#loginPassword')?.toggleAttribute('required',!otpLoginEnabled)}
async function loadAuthMode(){try{const c=await json('/api/auth/config');otpLoginEnabled=c.otpLoginEnabled===true;setAuthMode(getAuthMode())}catch{otpLoginEnabled=false;setAuthMode(getAuthMode())}}
$$('#authScreen .auth-mode').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.authMode)));
renderCountrySelect('#loginCountry');setAuthMode('email');loadAuthMode();
function getLoginIdentifier(){if(getAuthMode()==='mobile'){const mobile=normalizeMobileInput($('#loginMobile')?.value,countryCallingCode('#loginCountry'));if(!mobile)throw new Error('Enter your mobile number and country code.');return mobile}const email=String($('#loginEmail')?.value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');return email}

// First-time account creation: users set their own password; login never creates accounts.
function setSignupMode(show){const login=$('#loginForm'),signup=$('#signupForm');login?.classList.toggle('hidden',show);signup?.classList.toggle('hidden',!show);$('#showSignupBtn')?.classList.toggle('hidden',show);if(!show){signup?.reset();msg('#signupMessage','')}else $('#signupEmail')?.focus()}
$('#showSignupBtn')?.addEventListener('click',()=>setSignupMode(true));
$('#showLoginBtn')?.addEventListener('click',()=>setSignupMode(false));
$('#signupForm')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const button=form.querySelector('button[type="submit"]');try{const email=String($('#signupEmail')?.value||'').trim().toLowerCase();const mobile=String($('#signupMobile')?.value||'').replace(/[^0-9+]/g,'');const password=String($('#signupPassword')?.value||'');const confirm=String($('#signupConfirmPassword')?.value||'');if(!email&&!mobile)throw new Error('Enter an email address or mobile number.');if(password.length<8)throw new Error('Password must be at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');button.disabled=true;msg('#signupMessage','Creating your account…');const d=await json('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,mobile,password})});if(!d.success||!d.user)throw new Error(d.message||'Could not create account.');msg('#signupMessage','Account created. Opening TNS Studio…','success');toast('Account created successfully');enterTns(d.user)}catch(err){msg('#signupMessage',err.message||'Signup failed.','error')}finally{if(button)button.disabled=false}});
$('#loginForm')?.addEventListener('submit',async e=>{e.preventDefault();const button=$('#otpRequestBtn');try{otpIdentifier=getLoginIdentifier();button.disabled=true;if(!otpLoginEnabled){msg('#loginMessage','Signing in…');const d=await json('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier,password:String($('#loginPassword')?.value||'')})});if(!d.success||!d.user)throw new Error(d.message||'Password login failed.');msg('#loginMessage','');toast('Login successful');enterTns(d.user);return}msg('#loginMessage','Requesting OTP…');const d=await json('/api/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier})});showAuthScreens('otpScreen');$('#otpHint').textContent=d.otp?`Development OTP: ${d.otp}`:`Enter the 6-digit OTP sent to ${otpIdentifier}.`;msg('#otpMessage','');resetOtpBoxes();startOtpResendTimer()}catch(err){msg('#loginMessage',err.message,'error')}finally{if(button)button.disabled=false}});
async function requestOtp(){try{if(!otpIdentifier)otpIdentifier=getLoginIdentifier();const d=await json('/api/auth/otp/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier})});$('#otpHint').textContent=d.otp?`Development OTP: ${d.otp}`:`Enter the 6-digit OTP sent to ${otpIdentifier}.`;msg('#otpMessage','');resetOtpBoxes();startOtpResendTimer()}catch(err){msg('#otpMessage',err.message,'error')}}
function resetOtpBoxes(){document.querySelectorAll('.otp-digit').forEach(i=>i.value='');syncOtpCode();const first=document.querySelector('.otp-digit');first?.focus()}
function syncOtpCode(){const code=[...document.querySelectorAll('.otp-digit')].map(i=>i.value.replace(/\D/g,'')).join('').slice(0,6);const hidden=$('#otpCode');if(hidden)hidden.value=code;return code}
let otpResendInterval=null;function startOtpResendTimer(){clearInterval(otpResendInterval);let seconds=120;const timer=$('#otpResendTimer'),button=$('#resendOtpBtn');if(button)button.disabled=true;const tick=()=>{if(timer)timer.textContent=`(${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')})`;if(seconds<=0){clearInterval(otpResendInterval);if(button)button.disabled=false;if(timer)timer.textContent=''}seconds--};tick();otpResendInterval=setInterval(tick,1000)}
function initOtpBoxes(){const boxes=[...document.querySelectorAll('.otp-digit')];boxes.forEach((box,index)=>{box.addEventListener('input',()=>{box.value=box.value.replace(/\D/g,'').slice(-1);syncOtpCode();if(box.value&&boxes[index+1])boxes[index+1].focus()});box.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!box.value&&boxes[index-1])boxes[index-1].focus()});box.addEventListener('paste',event=>{const pasted=(event.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);if(!pasted)return;event.preventDefault();boxes.forEach((b,i)=>b.value=pasted[i]||'');syncOtpCode();(boxes[Math.min(pasted.length,6)-1]||boxes[0])?.focus()})})}initOtpBoxes();
$('#resendOtpBtn')?.addEventListener('click',requestOtp);
$('#verifyOtpBtn')?.addEventListener('click',async()=>{try{syncOtpCode();if(!/^\d{6}$/.test($('#otpCode').value))throw new Error('Enter the 6-digit OTP.');const d=await json('/api/auth/otp/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:otpIdentifier,code:$('#otpCode').value})});if(!d.success)throw new Error(d.message||'OTP verification failed.');toast('OTP verified');enterTns(d.user)}catch(err){msg('#otpMessage',err.message,'error')}});
$('#backToLogin')?.addEventListener('click',()=>{clearInterval(otpResendInterval);showAuthScreens('authScreen')});

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
  projects:{title:'Projects Settings',items:['Auto-save','Cloud storage','Project privacy','Default project format']},
  premium:{title:'Premium Settings',items:['Plan','Renewal','AI credits','Storage','Billing region']}
};
function openModuleSettings(key){const item=MODULE_SETTINGS[key];if(!item)return;showPanel('settings');$('#settingsTitle').textContent=item.title;const box=$('#moduleSettingsBox');if(box){box.classList.remove('hidden');box.innerHTML='<div class="module-settings-list">'+item.items.map((x)=>`<div class="module-setting-row"><div><b>${escapeHtml(x)}</b><small>Configure ${escapeHtml(x.toLowerCase())} for this feature.</small></div><button class="secondary" type="button">Configure</button></div>`).join('')+'</div>'}}
$$('.module-settings-btn').forEach(b=>b.addEventListener('click',()=>openModuleSettings(b.dataset.moduleSettings)));

const SETTINGS_CATEGORIES=[
 {id:'app',icon:'⚙️',title:'App',desc:'Language, appearance, data usage'}
];

const SETTINGS_ROWS={
 app:[['Language','Choose your app language','language'],['Dark Mode','Use the dark appearance','toggle:darkMode'],['Data Saver','Reduce media data usage','toggle:dataSaver'],['Default Video Quality','HD / Full HD / 4K','quality'],['Default Aspect Ratio','9:16 / 16:9 / 1:1','ratio']],
};

const SETTINGS_SUBPAGES={
 language:{title:'Language',eyebrow:'APP',description:'Choose the language for TNS.',rows:[['English','Use English throughout the app.','choice:language'],['हिन्दी','Use Hindi throughout the app.','choice:languageHindi'],['Español','Use Spanish throughout the app.','choice:languageSpanish'],['Français','Use French throughout the app.','choice:languageFrench']]},
 quality:{title:'Default Video Quality',eyebrow:'APP',description:'Choose the default export quality.',rows:[['HD (720p)','Smaller files and faster export.','choice:qualityHD'],['Full HD (1080p)','Recommended quality for most videos.','choice:qualityFHD'],['4K (2160p)','Highest available quality.','choice:quality4K']]},
 ratio:{title:'Default Aspect Ratio',eyebrow:'APP',description:'Choose the default video shape.',rows:[['9:16 (Portrait)','Best for vertical mobile video.','choice:ratio916'],['16:9 (Landscape)','Standard wide video.','choice:ratio169'],['1:1 (Square)','Square social format.','choice:ratio11']]},
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
  if(action==='empty')return `<div class="settings-detail-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`;
  return `<div class="settings-detail-card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(desc)}</p></div>`;
}
function choiceLabel(key){const v=selectedValue(key,'');const map={tagSource:'Everyone',mentionSource:'Everyone',followRequests:'Everyone',musicQuality:'High',sensitiveContent:'Standard',contentLanguage:'English',language:'English',languageHindi:'Not selected',languageSpanish:'Not selected',languageFrench:'Not selected',qualityHD:'HD (720p)',qualityFHD:'Full HD (1080p)',quality4K:'4K (2160p)',ratio916:'9:16',ratio169:'16:9',ratio11:'1:1'};return v||map[key]||'Choose'}
function renderChoicePage(key){
  const definitions={
    tagSource:['Allow Tags From',['Everyone','People You Follow','No One']],mentionSource:['Allow Mentions From',['Everyone','People You Follow','No One']],followRequests:['Follow Requests',['Everyone','Suggested Accounts','No One']],musicQuality:['Music Quality',['Standard','High','Original']],sensitiveContent:['Sensitive Content',['Standard','Less','More']],contentLanguage:['Preferred Language',['English','Hindi','Spanish','French']],language:['Language',['English','Hindi','Spanish','French']],languageHindi:['Language',['English','Hindi','Spanish','French']],languageSpanish:['Language',['English','Hindi','Spanish','French']],languageFrench:['Language',['English','Hindi','Spanish','French']],qualityHD:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],qualityFHD:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],quality4K:['Default Video Quality',['HD (720p)','Full HD (1080p)','4K (2160p)']],ratio916:['Default Aspect Ratio',['9:16','16:9','1:1']],ratio169:['Default Aspect Ratio',['9:16','16:9','1:1']],ratio11:['Default Aspect Ratio',['9:16','16:9','1:1']]
  };const def=definitions[key];if(!def)return;settingsStack.push(settingsCurrentId);const current=selectedValue('choice:'+key,'');settingsCurrentId='__choice__';const head=$('#settingsDetailView .settings-detail-head');head.innerHTML=`${settingsBackButton()}<h3>${escapeHtml(def[0])}</h3>`;$('#settingsDetailList').innerHTML=def[1].map(v=>`<button class="settings-detail-row settings-choice-row" data-choice-value="${escapeHtml(v)}"><div class="row-copy"><b>${escapeHtml(v)}</b></div><span class="settings-radio ${current===v?'selected':''}"></span></button>`).join('');wireSettingsInnerBack();}
function wireSettingsInnerBack(){document.getElementById('settingsInnerBack')?.addEventListener('click',()=>{const prev=settingsStack.pop();if(!prev||prev==='__home__'){showSettingsHome();return}if(SETTINGS_SUBPAGES[prev])renderSettingsSubpage(prev,false);else renderSettingsCategory(prev)})}
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
  if(action==='language'||action==='quality'||action==='ratio'||action==='music'||action==='content'||action==='messages'||action==='followers'||action==='sharing'||action==='mentions'||action==='blocked'||action==='restricted'||action==='hidden'||action==='saved'||action==='archive'||action==='history') return renderSettingsSubpage(action);
});
$('#settingsDetailList')?.addEventListener('change',()=>{});
$('#settingsDetailList')?.addEventListener('click',e=>{
  const sw=e.target.closest('[data-setting-toggle]');if(sw){const key=sw.dataset.settingToggle;const next=!getSettingToggle(key);setSettingToggle(key,next);if(SETTINGS_SUBPAGES[settingsCurrentId])renderSettingsSubpage(settingsCurrentId,false);else renderSettingsCategory(settingsCurrentId);toast(`${next?'Enabled':'Disabled'} ${key}`);return}
  const choice=e.target.closest('[data-choice]');if(choice){renderChoicePage(choice.dataset.choice);return}
  const choiceValue=e.target.closest('[data-choice-value]');if(choiceValue){const value=choiceValue.dataset.choiceValue;const targetKey=choicePageKey(settingsChoiceKey);saveSelected(targetKey,value);const prev=settingsStack.pop();if(SETTINGS_SUBPAGES[prev])renderSettingsSubpage(prev,false);else renderSettingsCategory(prev||'app');return}
  const btn=e.target.closest('[data-settings-action]');if(!btn)return;const a=btn.dataset.settingsAction;
  if(a==='personal'){renderPersonalInformation();return}
  if(a==='security'||a==='sessions'||a==='accountActivity'||a==='danger'||SETTINGS_SUBPAGES[a]){renderSettingsSubpage(a);return}
  if(a==='language'){renderSettingsSubpage('language');return}
  if(a==='quality'){renderSettingsSubpage('quality');return}
  if(a==='ratio'){renderSettingsSubpage('ratio');return}
  if(a==='deviceCurrent'||a==='deviceOthers'||a==='loginHistory'){renderSettingsSubpage(a);return}
});
function choicePageKey(stackKey){const map={language:'language',languageHindi:'language',languageSpanish:'language',languageFrench:'language',qualityHD:'quality',qualityFHD:'quality',quality4K:'quality',ratio916:'ratio',ratio169:'ratio',ratio11:'ratio'};return map[stackKey]||stackKey}
$('#settingsHomeNav')?.addEventListener('click',()=>showPanel('dashboard'));
$('#logoutBtn')?.addEventListener('click',async()=>{try{await json('/api/auth/logout',{method:'POST'})}catch{}authenticatedUser=null;window.TNSAuth?.logout?.();localStorage.removeItem('tnsStudioLanguage');location.reload()});

function saveProject(type,title){const key=projectKey();const list=JSON.parse(localStorage.getItem(key)||'[]');list.unshift({id:crypto.randomUUID?.()||String(Date.now()),type,title,date:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list.slice(0,30)));renderProjects()}
function renderProjects(){const list=JSON.parse(localStorage.getItem(projectKey())||'[]');$('#projectList').innerHTML=list.length?list.map(p=>`<div class="project-row"><div><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)} • ${new Date(p.date).toLocaleString()}</small></div><span class="muted">Saved</span></div>`).join(''):'<p class="muted">No projects yet. Start creating.</p>';$('#recentProjects').innerHTML=list.slice(0,4).map(p=>`<div class="recent-card"><span>🎬</span><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.type)}</small></div>`).join('')||'<div class="recent-card"><span>✨</span><b>Your creations appear here</b><small>Start with any creator tool.</small></div>'}
$('#clearBtn')?.addEventListener('click',()=>{localStorage.removeItem(projectKey());renderProjects();toast('Local projects cleared')});
async function boot(){const authError=new URLSearchParams(location.search).get('authError');try{const d=await json('/api/auth/me');if(d.user){setUser(d.user);enterTns(d.user)}else showAuthScreens('authScreen')}catch{showAuthScreens('authScreen')}if(authError){msg('#loginMessage',authError,'error');history.replaceState({},document.title,location.pathname)}}
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
  projects:{autoSave:true,cloudSync:true,privacy:'Private',format:'9:16'},
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

$$('[data-open="premium"]').forEach(b=>b.addEventListener('dblclick',()=>showPanel('premiumDetails')));
$('#upgradePremiumBtn')?.addEventListener('click',()=>showPanel('premiumDetails'));

// Add explicit navigation cards for the extra locked reference screens without changing the dashboard's 8-card layout.

/* ===== MASTER 24-SCREEN + FINAL FEATURE COMPLETION ===== */
(function(){
  const screenRegistry = [
    ["1","splashScreen","Splash Screen"],["2","authScreen","Login Screen"],["3","signupModal","Signup Screen"],
    ["4","otpScreen","OTP Verification"],["5","languageScreen","Language Selection"],["6","dashboard","Main Dashboard"],
    ["7","settings","TNS Settings"],["12","projects","Projects"],["17","premium","Premium"],
    ["18","settingsApp","App Settings"],["19","languageInside","Language Selection (Inside)"],
    ["23","appIcon","Mobile App Icon"]
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
    ["appIcon","app-icon","Brand Settings"],["finalEditView","final-edit","Final View Settings"],
    
  ].forEach(x=>addScreenSettingsButton(...x));

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
  const starterContainer = $id('homeChatStarters');
  if (!form || !input || !messages) return;
  const updateStarterVisibility = (forceShow = false) => {
    if (!starterContainer) return;
    const hasConversation = !!messages.querySelector('.home-chat-message');
    const hasDraft = !!input.value.trim();
    const composerFocused = document.activeElement === input;
    const shouldHide = !forceShow && (hasConversation || hasDraft || composerFocused);
    starterContainer.classList.toggle('hidden', shouldHide);
    starterContainer.setAttribute('aria-hidden', String(shouldHide));
  };
  input.addEventListener('input', () => updateStarterVisibility());
  input.addEventListener('focus', () => updateStarterVisibility());
  input.addEventListener('blur', () => window.setTimeout(() => updateStarterVisibility(), 180));
  updateStarterVisibility();
  starterContainer?.querySelectorAll('[data-starter-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      if (input.disabled) return;
      input.value = button.getAttribute('data-starter-prompt') || '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
  });
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
  const startNewConversation = () => { conversationViewGeneration++; clearTimeout(historySaveTimer); currentConversationId=null; messages.replaceChildren(); const welcome=document.createElement('div'); welcome.className='home-welcome-card'; welcome.textContent='Namaste! Main TNS hoon. Aap kya karna chahenge?'; messages.appendChild(welcome); input.value='';fitInput();updateActionButton();updateStarterVisibility(true);if(historySelect)historySelect.value='';if(deleteChatButton)deleteChatButton.disabled=true;setStatus('Nayi chat shuru ho gayi.'); };
  const openConversation = async id => { if(!id)return; const generation=++conversationViewGeneration; clearTimeout(historySaveTimer); try { const data=await json('/api/tns-ai/conversations/'+encodeURIComponent(id)); if(generation!==conversationViewGeneration)return; const c=data.conversation; if(!c)throw new Error('Conversation not found.'); currentConversationId=c.id; messages.replaceChildren(); (c.messages||[]).forEach(turn=>addBubble(turn.content,turn.role)); updateStarterVisibility(); const hasAttachmentMarker=(c.messages||[]).some(turn=>/📎/.test(turn.content||'')); const refreshed=await refreshConversationList(c.id); if(generation!==conversationViewGeneration)return; if(deleteChatButton)deleteChatButton.disabled=false; setStatus(hasAttachmentMarker?'Purani chat khul gayi. Note: attached file khud save nahi hoti; sirf uska naam/message history mein hai.':(refreshed?'Purani chat khul gayi.':'Purani chat khul gayi, lekin saved-chat list refresh nahi hui.')); if(hasAttachmentMarker&&!refreshed)setStatus('Purani chat khul gayi; attachment dobara chahiye to file phir se chunein. Saved-chat list refresh nahi hui.'); } catch(error) { if(generation===conversationViewGeneration)setStatus(error.message||'Chat history nahi khul saki.'); } };
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
    updateStarterVisibility();
    messages.scrollTop = messages.scrollHeight;
    return node;
  };
  const setStatus = text => { if (status) status.textContent = text || ''; };
  const fitInput = () => { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,140)+'px'; };
  // On phones, focusing the composer hides introductory cards and bottom navigation,
  // giving the user a clear writing area while the on-screen keyboard is open.
  input.addEventListener('focus', () => {
    document.body.classList.add('tns-chat-typing');
    // Mobile keyboards may resize the visual viewport a moment after focus.
    positionComposerAboveKeyboard();
    window.requestAnimationFrame(positionComposerAboveKeyboard);
    window.setTimeout(positionComposerAboveKeyboard, 120);
  });
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
    // The visual viewport's lower edge is the reliable boundary above the
    // on-screen keyboard; clamp the value to avoid negative/huge offsets.
    if (viewport) {
      const keyboardGap = Math.max(8, Math.min(window.innerHeight,
        window.innerHeight - (viewport.offsetTop + viewport.height) + 8));
      form.style.bottom = `${keyboardGap}px`;
    } else {
      form.style.bottom = '8px';
    }
  };
  input.addEventListener('input', () => { fitInput(); updateActionButton(); });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => { fitInput(); positionComposerAboveKeyboard(); }, 180);
  });
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






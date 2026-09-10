const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
$$('.tab').forEach(b=>b.onclick=()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); $$('.panel').forEach(x=>x.classList.remove('active')); $('#'+b.dataset.tab).classList.add('active'); if(b.dataset.tab==='projects') renderProjects(); });

$('#themeBtn').onclick=()=>{document.body.classList.toggle('light'); localStorage.tnsTheme=document.body.classList.contains('light')?'light':'dark'};
if(localStorage.tnsTheme==='light')document.body.classList.add('light');

function buildPlan(){
 const idea=$('#idea').value.trim()||'Create a visually engaging original video';
 const locked='Use ONE LOCKED CHARACTER for this entire idea. Keep the exact same face, person, age, gender, hairstyle, hair color, facial features, body type, clothing, colors, footwear, gloves and accessories in every scene. Only pose, expression, body position and hand/action may change.';
 const plan=`TNS AI VIDEO PRODUCTION PLAN

IDEA
${idea}

TYPE: ${$('#type').value}
FORMAT: ${$('#format').value}
DURATION: ${$('#duration').value}
CAMERA: ${$('#camera').value}

STRUCTURE
1. Hook: immediate visual action in the first seconds.
2. Setup: clearly show materials/characters/environment.
3. Process: show each important action with logical continuity.
4. Payoff: reveal the transformation/result.
5. Ending: satisfying final shot; add CTA only when appropriate.

VISUAL RULES
Photorealistic/appropriate style, coherent lighting, natural motion, clean continuity, no random object changes, no unexplained cuts.
${locked}
If the character speaks, show the materials/actions while they explain them and use natural lip-sync.

GENERATION
Use the selected provider through the secure server adapter. For long videos, generate scenes/jobs and stitch them server-side rather than relying on one oversized generation request.`;
 $('#plan').textContent=plan; return plan;
}
$('#buildBtn').onclick=buildPlan; $('#copyBtn').onclick=async()=>{await navigator.clipboard.writeText($('#plan').textContent); $('#copyBtn').textContent='Copied ✓'; setTimeout(()=>$('#copyBtn').textContent='Copy Plan',1200)};

$('#lockBtn').onclick=()=>{const d=`LOCKED CHARACTER — ${$('#charName').value||'Unnamed Character'}
Age/Gender: ${$('#charAge').value||'Not specified'}
Face/Hair: ${$('#charFace').value||'Not specified'}
Body/Outfit: ${$('#charOutfit').value||'Not specified'}

LOCK RULE: Repeat this exact character description in every image/video scene prompt for this IDEA. Never change identity or appearance. Only pose, expression, position and action may vary.`; $('#charOutput').textContent=d; localStorage.tnsChar=d};

$('#voiceBtn').onclick=()=>{$('#voiceOutput').textContent=`VOICE PLAN
Language: ${$('#language').value}
Style: ${$('#voiceStyle').value}

Dialogue:
${$('#dialogue').value||'[Add dialogue]'}

AUDIO RULES
Natural pacing, clear pronunciation, clean background, timing matched to scene actions. If the character is visible speaking, use natural lip-sync. Voice generation is a separate provider job so video and voice can be rendered independently and then synchronized.`};

$('#videoFile').onchange=e=>{const f=e.target.files[0]; if(f) $('#preview').src=URL.createObjectURL(f)};
$$('[data-tool]').forEach(b=>b.onclick=()=>$('#editStatus').textContent=`${b.dataset.tool}: tool selected. Connect the production FFmpeg/WebCodecs pipeline to make this operation render/export the video.`);

function currentProject(){return{title:($('#idea').value||'Untitled TNS Project').slice(0,60),date:new Date().toLocaleString(),type:$('#type').value,format:$('#format').value,duration:$('#duration').value,plan:$('#plan').textContent}};
function renderProjects(){const a=JSON.parse(localStorage['tnsProjects_'+((JSON.parse(localStorage.tnsSession||'{}').email)||'guest').replace(/[^a-z0-9@._-]/gi,'_')]||'[]'); $('#projectList').innerHTML=a.length?a.map((p,i)=>`<article><b>${escapeHtml(p.title)}</b><small>${escapeHtml(p.date)} • ${escapeHtml(p.type)}</small><button onclick="loadProject(${i})">Load</button></article>`).join(''):'<p>No local projects yet.</p>'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
window.loadProject=i=>{const p=JSON.parse(localStorage['tnsProjects_'+((JSON.parse(localStorage.tnsSession||'{}').email)||'guest').replace(/[^a-z0-9@._-]/gi,'_')]||'[]')[i]; if(!p)return; $('#idea').value=p.title; $('#type').value=p.type; $('#format').value=p.format; $('#duration').value=p.duration; $('#plan').textContent=p.plan; document.querySelector('[data-tab=generate]').click()};
$('#saveBtn').onclick=()=>{const a=JSON.parse(localStorage['tnsProjects_'+((JSON.parse(localStorage.tnsSession||'{}').email)||'guest').replace(/[^a-z0-9@._-]/gi,'_')]||'[]');a.unshift(currentProject());localStorage['tnsProjects_'+((JSON.parse(localStorage.tnsSession||'{}').email)||'guest').replace(/[^a-z0-9@._-]/gi,'_')]=JSON.stringify(a.slice(0,50));renderProjects()};
$('#clearBtn').onclick=()=>{localStorage.removeItem('tnsProjects');renderProjects()};
$('#saveSettings').onclick=()=>{localStorage.tnsEndpoint=$('#endpoint').value;localStorage.tnsPrefix=$('#prefix').value;alert('Settings saved locally.')};
if(localStorage.tnsEndpoint)$('#endpoint').value=localStorage.tnsEndpoint;
if(localStorage.tnsPrefix)$('#prefix').value=localStorage.tnsPrefix;


async function startAIJob(){
  const plan=buildPlan();
  const box=$('#jobBox');
  box.textContent='AI render status: submitting…';
  try{
    const r=await fetch('/api/video/jobs',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({idea:$('#idea').value,type:$('#type').value,format:$('#format').value,duration:$('#duration').value,camera:$('#camera').value,plan})});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||'Could not create job');
    box.textContent=`AI render status: ${data.status||'queued'} • Job: ${data.id}`;
    if(data.id) pollJob(data.id);
  }catch(e){box.textContent='AI render status: '+e.message}
}
async function pollJob(id){
  const box=$('#jobBox');
  let tries=0;
  const timer=setInterval(async()=>{
    tries++;
    try{
      const r=await fetch('/api/video/jobs/'+encodeURIComponent(id)); const j=await r.json();
      box.textContent=`AI render status: ${j.status||'unknown'} • Job: ${id}`;
      if(j.status==='completed'||j.status==='failed'||tries>30) clearInterval(timer);
    }catch(e){ if(tries>5) clearInterval(timer); }
  },2000);
}
$('#generateBtn').onclick=startAIJob;
$('#exportHint').onclick=()=>$('#editStatus').textContent='Export pipeline ready to connect: trim/crop/captions/audio/speed/effects → FFmpeg worker → MP4.';
$('#resetVideo').onclick=()=>{ $('#preview').removeAttribute('src'); $('#preview').load(); $('#videoFile').value=''; };

function initAuth(){
  const session=JSON.parse(localStorage.tnsSession||'null');
  if(session){ $('#authGate').classList.add('hidden'); $('#userBadge').textContent=session.email||'Guest'; }
}
$('#loginBtn').onclick=()=>{
  const email=$('#loginEmail').value.trim(), pass=$('#loginPass').value;
  if(!email||!pass){alert('Email और password डालें।');return}
  // Local prototype only. Real passwords must never be stored in localStorage in production.
  localStorage.tnsSession=JSON.stringify({email,mode:'email',at:Date.now()});
  initAuth();
};
$('#guestBtn').onclick=()=>{
  localStorage.tnsSession=JSON.stringify({email:'Guest Mode',mode:'guest',at:Date.now()}); initAuth();
};
$('#logoutBtn').onclick=()=>{localStorage.removeItem('tnsSession');location.reload()};
initAuth();

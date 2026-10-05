const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const LANGS=(window.TNSLanguageRegistry||[]).map(x=>[x.nativeName||x.name,(x.nativeName||x.name).slice(0,2),x.code,x.name,x.rtl]);
let selectedLang=null,otpIdentifier=null,currentMedia=null,currentContact=null,currentGroup=null,authenticatedUser=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function msg(id,text,type='info'){const e=$(id);if(!e)return;e.textContent=text;e.dataset.type=type}
async function json(url,options={}){const r=await fetch(url,{credentials:'include',...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||d.message||'Request failed.');return d}
function showPanel(id){$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));document.body.classList.toggle('shorts-mode',id==='shorts');document.body.classList.toggle('profile-mode',id==='profile');window.scrollTo({top:0,behavior:'smooth'});if(id==='projects')renderProjects();if(id==='contact')loadContacts();if(id==='profile')renderProfile();if(id==='shorts'){initShortsViewer();loadShortsFeed();renderShortsFeed();}}

const shortsDemoFeed=[
  {id:'s1',creator:'TNS Creator',likedByFriends:true,handle:'@tns_creator',title:'Create. Edit. Inspire. ✨',caption:'A new Short made with TNS Studio.',audio:'Original audio • TNS Studio',views:'125K',createdAt:4},
  {id:'s2',creator:'Nature Studio',repostedByFriends:true,handle:'@nature_studio',title:'Into the wild 🌿',caption:'Nature, travel and cinematic Shorts.',audio:'Nature ambience',views:'98K',createdAt:3},
  {id:'s3',creator:'AI Maker',commentedByFriends:true,handle:'@ai_maker',title:'AI creation in seconds 🤖',caption:'From an idea to a finished video.',audio:'Original audio • TNS AI',views:'210K',createdAt:2},
  {id:'s4',creator:'Survival Mood',handle:'@survival_mood',title:'One man. One shelter. 🏕️',caption:'Realistic survival build Short.',audio:'Original audio',views:'76K',createdAt:1}
];
let shortsFeedItems=[],shortsCommentsById={},shortsCurrentIndex=0,shortsTouchY=0,shortsFeedMode='home';
function shortsStoreKey(){const u=currentUser()||{};return 'tnsStudioShorts_'+(u.id||u.email||u.mobile||'guest').replace(/[^a-z0-9_-]/gi,'_')}
function loadShortsFeed(){const d=getProfileData();const settings=d.settings||{};const hidden=new Set(Array.isArray(settings.notInterestedShorts)?settings.notInterestedShorts:[]);let items=[...shortsDemoFeed].filter(x=>!hidden.has(x.id));const following=new Set(Array.isArray(settings.followingAccounts)?settings.followingAccounts:[]);if(shortsFeedMode==='friends'){items=items.filter(x=>{const h=String(x.handle||'').replace(/^@/,'');return following.has(h)||x.likedByFriends||x.repostedByFriends||x.commentedByFriends;});items=items.map(x=>({...x,friendActivity:x.likedByFriends?'Liked by someone you follow':(x.repostedByFriends?'Reposted by someone you follow':'Commented on by someone you follow')}));}else if((settings.feedView||'home')==='following'){items=items.filter(x=>following.has(String(x.handle||'').replace(/^@/,'')));items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));}else{items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));}shortsFeedItems=items;}
function shortsInitial(name){return (String(name||'T')[0]||'T').toUpperCase()}
function renderShortsFeed(){
  const box=$('#shortsFeed');if(!box)return;
  if(!shortsFeedItems.length){box.innerHTML='<div class="shorts-empty"><div class="shorts-empty-card"><div class="empty-icon">▶️</div><h2>No Shorts yet</h2><p class="muted">Upload your first Short and it will appear here.</p><button id="shortsEmptyUpload" class="primary" type="button">＋ Upload Short</button></div></div>';$('#shortsEmptyUpload')?.addEventListener('click',()=>$('#shortsUploadInput')?.click());return}
  box.innerHTML=shortsFeedItems.map((x,i)=>`<article class="short-item" data-short-id="${escapeHtml(x.id)}" data-short-index="${i}">
    ${x.url?`<video class="short-media" src="${escapeHtml(x.url)}" playsinline loop preload="metadata"></video>`:'<div class="short-placeholder"><span>TNS Studio</span></div>'}
    <div class="short-gradient"></div><div class="short-pause">▶</div>
    <div class="short-info">${x.trial&&!x.trialShared?'<div class="short-trial-badge">🧪 Trial Short</div>':''}${x.addYours&&x.addYoursPrompt?`<div class="short-trial-badge">🎯 Add Yours: ${escapeHtml(x.addYoursPrompt)}</div>`:''}${shortsFeedMode==='friends'&&x.friendActivity?`<div class="short-friend-activity">👥 ${escapeHtml(x.friendActivity)}</div>`:''}
      <div class="short-creator"><div class="short-avatar">${x.avatar?`<img src="${escapeHtml(x.avatar)}" alt="">`:escapeHtml(shortsInitial(x.creator))}</div><b>${escapeHtml(x.creator)}</b><button class="short-follow" data-short-follow="${escapeHtml(x.id)}" type="button">${x.following?'✓ Following':'Follow'}</button></div>
      <h3>${escapeHtml(x.title||'TNS Studio Short')}</h3><p>${escapeHtml(x.caption||'')}</p><div class="short-audio">♫ ${escapeHtml(x.audio||'Original audio')}</div>
    </div>
    <div class="short-actions">
      <button class="short-action ${x.liked?'liked':''}" data-short-action="like" data-short-id="${escapeHtml(x.id)}" type="button">♥<small>${escapeHtml(x.views||'0')}</small></button>
      <button class="short-action" data-short-action="comment" data-short-id="${escapeHtml(x.id)}" type="button">💬<small>${(shortsCommentsById[x.id]||[]).length}</small></button>
      <button class="short-action" data-short-action="share" data-short-id="${escapeHtml(x.id)}" type="button">↗<small>Share</small></button><button class="short-action ${x.reposted?'saved':''}" data-short-action="repost" data-short-id="${escapeHtml(x.id)}" type="button">🔁<small>${x.reposted?'Reposted':'Repost'}</small></button>
      <button class="short-action ${x.saved?'saved':''}" data-short-action="save" data-short-id="${escapeHtml(x.id)}" type="button">🔖<small>Save</small></button>
      <button class="short-action" data-short-action="notInterested" data-short-id="${escapeHtml(x.id)}" type="button">🚫<small>Not interested</small></button>
      <button class="short-action" data-short-action="profile" data-short-id="${escapeHtml(x.id)}" type="button">👤<small>Profile</small></button>${x.addYours&&x.addYoursPrompt?`<button class="short-action" data-short-action="addYours" data-short-id="${escapeHtml(x.id)}" type="button">🎯<small>Join</small></button>`:''}
    </div>
  </article>`).join('');
  $$('#shortsFeed .short-item').forEach(item=>{
    const video=item.querySelector('video');
    item.addEventListener('click',e=>{if(e.target.closest('button'))return;if(video){if(video.paused){video.play().catch(()=>{});item.classList.remove('is-paused')}else{video.pause();item.classList.add('is-paused')}}});
    if(video){const io=new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting){shortsCurrentIndex=Number(item.dataset.shortIndex)||0;video.play().catch(()=>{})}else video.pause()}),{threshold:.72});io.observe(item)}
  });
}
function openShorts(){shortsFeedMode='home';loadShortsFeed();renderShortsFeed();showPanel('shorts');document.body.classList.add('shorts-mode');setTimeout(()=>$('#shortsFeed')?.focus(),60)}
function toggleFriendsFeed(){shortsFeedMode=shortsFeedMode==='friends'?'home':'friends';loadShortsFeed();renderShortsFeed();const b=$('#shortsFriendsBtn');if(b)b.textContent=shortsFeedMode==='friends'?'▶ Shorts':'👥 Friends';toast(shortsFeedMode==='friends'?'Friends activity feed':'Shorts feed');}
function closeShorts(){document.body.classList.remove('shorts-mode');showPanel('dashboard')}
function shortsAction(id,action){
  const x=shortsFeedItems.find(v=>v.id===id);if(!x)return;
  if(action==='like'){x.liked=!x.liked;renderShortsFeed();return}
  if(action==='save'){x.saved=!x.saved;toast(x.saved?'Short saved':'Removed from saved');renderShortsFeed();return}
  if(action==='notInterested'){const d=getProfileData();d.settings=d.settings||{};const list=Array.isArray(d.settings.notInterestedShorts)?d.settings.notInterestedShorts:[];if(!list.includes(x.id))list.push(x.id);d.settings.notInterestedShorts=list.slice(-500);saveProfileData(d);shortsFeedItems=shortsFeedItems.filter(v=>v.id!==id);toast('Not interested — this Short was hidden');renderShortsFeed();return}
  if(action==='trialShare'){if(!x.trial||x.trialShared)return;const age=Date.now()-(Number(x.trialStartedAt)||Date.now());if(age<24*60*60*1000)return toast('Trial results are available after 24 hours.');x.trialShared=true;x.audience='public';const d=getProfileData();d.shortPosts=(d.shortPosts||[]).map(p=>String(p.id)===String(id)?({...p,trialShared:true,audience:'public'}):p);saveProfileData(d);toast('Trial Short shared with everyone');renderShortsFeed();return;}if(action==='repost'){const d=getProfileData();const reps=Array.isArray(d.reposts)?d.reposts:[];const idx=reps.findIndex(r=>String(r.id)===String(id));if(idx>=0){reps.splice(idx,1);d.reposts=reps;saveProfileData(d);x.reposted=false;toast('Repost removed');renderShortsFeed();return}const note=window.prompt('Add a note to your repost (optional):','');d.reposts=[{id:x.id,creator:x.creator,handle:x.handle,title:x.title,caption:x.caption,avatar:x.avatar||'',originalId:x.id,note:(note||'').trim(),createdAt:Date.now()} ,...reps];saveProfileData(d);x.reposted=true;toast('Reposted — original creator credited');renderShortsFeed();return}if(action==='addYours'){const x=shortsFeedItems.find(v=>String(v.id)===id);if(!x)return;openShortUpload();$('#shortAddYours').checked=true;$('#shortAddYoursFields').classList.remove('hidden');$('#shortAddYoursPrompt').value=x.addYoursPrompt||'';$('#shortUploadCaption').value=`Reply to Add Yours: ${x.addYoursPrompt||''}`.trim();toast('Add Yours prompt loaded — create your response');return}if(action==='comment'){openShortComments(id);return}
  if(action==='profile'){showPanel('profile');return}
  if(action==='share'){const text=`${x.title||'TNS Studio Short'} ${x.handle||''}`;if(navigator.share)navigator.share({title:x.title||'TNS Studio Short',text}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>toast('Short link text copied')).catch(()=>toast('Share is ready'));return}
}
function openShortComments(id){
  const box=$('#shortsComments');if(!box)return;box.dataset.shortId=id;box.classList.remove('hidden');
  const list=shortsCommentsById[id]||[];$('#shortsCommentList').innerHTML=list.length?list.map(c=>`<div class="short-comment"><div class="short-comment-avatar">${escapeHtml(shortsInitial(c.name))}</div><div><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.text)}</span></div></div>`).join(''):'<p class="muted">Be the first to comment.</p>';
}
function initShortsViewer(){
  if(window.__tnsShortsReady)return;window.__tnsShortsReady=true;
  $('#shortsCloseBtn')?.addEventListener('click',closeShorts);
  $('#shortsFriendsBtn')?.addEventListener('click',toggleFriendsFeed);
  $('#shortsUploadBtn')?.addEventListener('click',()=>openShortUpload());
  $('#shortsUploadInput')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){prepareShortUpload(f);e.target.value=''}});
  $('#shortsFeed')?.addEventListener('click',e=>{const b=e.target.closest('[data-short-action]');if(b)return shortsAction(b.dataset.shortId,b.dataset.shortAction);const follow=e.target.closest('[data-short-follow]');if(follow){const x=shortsFeedItems.find(v=>v.id===follow.dataset.shortFollow);if(!x)return;x.following=!x.following;const d=getProfileData();d.following=Math.max(0,(Number(d.following)||0)+(x.following?1:-1));d.settings=d.settings||{};const fa=Array.isArray(d.settings.followingAccounts)?d.settings.followingAccounts:[];const handle=String(x.handle||'').replace(/^@/,'');if(x.following&&!fa.includes(handle))fa.push(handle);if(!x.following){d.settings.followingAccounts=fa.filter(v=>v!==handle)}else d.settings.followingAccounts=fa;saveProfileData(d);loadShortsFeed();renderShortsFeed();}});
  $('#shortsCommentsClose')?.addEventListener('click',()=>$('#shortsComments')?.classList.add('hidden'));
  $('#shortsCommentSend')?.addEventListener('click',()=>{const input=$('#shortsCommentInput'),id=$('#shortsComments')?.dataset.shortId,text=input?.value.trim();if(!id||!text)return;const post=shortsFeedItems.find(x=>x.id===id);if(post?.comments===false)return toast('Comments are turned off for this Short.');if(post?.viewerCommenter&&isLimitedContact(post.viewerCommenter)&&!post.viewerCommenter.existingChat)return toast('Comments are temporarily limited for this account.');const d=getProfileData();const settings=d.settings||{};const words=Array.isArray(settings.hiddenWordList)?settings.hiddenWordList:[];const lower=text.toLowerCase();const blocked=words.some(w=>w&&lower.includes(String(w).toLowerCase()));if((post?.hiddenWords!==false&&blocked)||(post?.commentFilter==='strict'&&/(\bspam\b|\bscam\b)/i.test(text)))return toast('This comment was hidden by the comment filter.');(shortsCommentsById[id]||(shortsCommentsById[id]=[])).push({name:d.name||'TNS Studio User',text});input.value='';openShortComments(id);renderShortsFeed()});
  $('#shortsFeed')?.addEventListener('touchstart',e=>{shortsTouchY=e.touches[0].clientY},{passive:true});
  $('#shortsFeed')?.addEventListener('touchend',e=>{const dy=shortsTouchY-e.changedTouches[0].clientY;if(Math.abs(dy)<55)return;const box=$('#shortsFeed');const target=Math.max(0,Math.min(shortsFeedItems.length-1,shortsCurrentIndex+(dy>0?1:-1)));box.children[target]?.scrollIntoView({behavior:'smooth'});shortsCurrentIndex=target},{passive:true});
  $('#shortsFeed')?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();const i=Math.min(shortsFeedItems.length-1,shortsCurrentIndex+1);$('#shortsFeed').children[i]?.scrollIntoView({behavior:'smooth'});shortsCurrentIndex=i}if(e.key==='ArrowUp'){e.preventDefault();const i=Math.max(0,shortsCurrentIndex-1);$('#shortsFeed').children[i]?.scrollIntoView({behavior:'smooth'});shortsCurrentIndex=i}});
}

function profileStoreKey(){const u=currentUser()||{};return 'tnsStudioProfile_'+(u.id||u.email||u.mobile||'guest').replace(/[^a-z0-9_-]/gi,'_')}
function defaultProfile(){const u=currentUser()||{};const raw=u.name||u.displayName||'';const name=raw||'TNS Studio User';const handle=(u.username||u.handle||name).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24)||'tns_user';return {name,handle,bio:'Video Creator | AI Explorer | Dream Big',location:'India',website:'',dob:'',avatar:'',followers:0,following:0,posts:0,liked:[],settings:{trialShorts:false,accountVisibility:'public',followingVisibility:'public',followersVisibility:'public',likedVisibility:'private',shortAudience:'public',comments:'on',likes:'on',sharing:'on',downloads:'off',remix:'on',commentFilter:'standard',mentions:'everyone',tags:'everyone',hiddenWords:true,followRequests:'auto',messageRequests:'everyone',readReceipts:true,activityStatus:true,sleepMode:false,sleepStart:'22:00',sleepEnd:'07:00',sleepAutoReply:true,limits:'off',notifyFollowers:true,notifyLikes:true,notifyMentions:true,notifyMessages:true,notifyCreator:true,analytics:true,saveOriginals:true,wifiUpload:false,loginAlerts:true,loginAlertNewDevice:true,loginAlertSuspicious:true,loginAlertChannel:'in_app',sessions:[],twoFactor:false,twoFactorMethod:'authenticator',backupCodes:[],passkey:false,ageBand:'adult',madeForKids:'general',locationVisibility:'off',sensitiveContent:'limit',personalizedFeed:true,feedView:'home',recommendationResetAt:null,favoriteAccounts:[],notInterestedShorts:[],pinnedShorts:[],reposts:[],videoQuality:'auto',autoplay:true,wifiOnly:false,autoDownload:false}}}
function getProfileData(){const base=defaultProfile();try{return {...base,...JSON.parse(localStorage.getItem(profileStoreKey())||'{}')}}catch{return base}}
function saveProfileData(d){localStorage.setItem(profileStoreKey(),JSON.stringify(d))}
function profileShorts(){const d=getProfileData();return Array.isArray(d.shortPosts)?d.shortPosts:[]}
function profileReposts(){const d=getProfileData();return Array.isArray(d.reposts)?d.reposts:[]}
function profilePinnedShortIds(){const d=getProfileData();return Array.isArray(d.pinnedShorts)?d.pinnedShorts.slice(0,3):[]}
function togglePinnedShort(id){const d=getProfileData();const items=profileShorts();if(!items.some(x=>String(x.id)===String(id)))return;const pins=Array.isArray(d.pinnedShorts)?d.pinnedShorts:[];const idx=pins.findIndex(x=>String(x)===String(id));if(idx>=0){pins.splice(idx,1);d.pinnedShorts=pins;saveProfileData(d);toast('Short unpinned from profile');renderProfileContent('shorts',false);return}if(pins.length>=3){toast('You can pin up to 3 Shorts on your profile');return}pins.unshift(id);d.pinnedShorts=pins.slice(0,3);saveProfileData(d);toast('Short pinned to profile');renderProfileContent('shorts',false)}
function renderProfileContent(tab='shorts',publicMode=false){const box=$('#profileContent');if(!box)return;const d=getProfileData();if(publicMode&&d.settings?.accountVisibility==='private'){box.innerHTML='<div class="profile-empty profile-private-state"><div style="font-size:34px;margin-bottom:10px">🔒</div><b>This account is private</b><span>Only approved followers can see this profile&apos;s Shorts and videos.</span></div>';return}if(tab==='shorts'||tab==='videos'||tab==='reposts'){const rawItems=tab==='shorts'?profileShorts():(tab==='reposts'?profileReposts():(Array.isArray(d.videoPosts)?d.videoPosts:[]));const pins=tab==='shorts'?profilePinnedShortIds():[];const items=tab==='shorts'?[...rawItems].sort((a,b)=>{const ai=pins.indexOf(String(a.id)),bi=pins.indexOf(String(b.id));const ap=ai>=0?ai:999,bp=bi>=0?bi:999;return ap-bp}):rawItems;if(!items.length){const label=tab==='reposts'?'reposts':(tab==='shorts'?'Shorts':'videos');box.innerHTML=`<div class="profile-empty"><div style="font-size:34px;margin-bottom:10px">${tab==='reposts'?'🔁':(tab==='shorts'?'▶':'🎬')}</div><b>No ${label} yet</b><span>${tab==='reposts'?'Reposts you make will appear here.':(tab==='shorts'?'Create your first Short and share it with the TNS Studio community.':'Your uploaded videos will appear here.')}</span>${!publicMode&&tab==='shorts'?'<button class="primary profile-empty-action" type="button" id="profileCreateShortBtn">＋ Create Short</button>':''}</div>`;$('#profileCreateShortBtn')?.addEventListener('click',()=>showPanel('shorts'));return}box.innerHTML='<div class="profile-short-grid">'+items.map((x,i)=>{const id=String(x.id||x.title||'short');const pinned=pins.includes(id);return `<div class="profile-short-wrap"><button class="profile-short" type="button" data-profile-short="${escapeHtml(id)}"><span class="short-icon">${pinned?'📌 ':''}${tab==='reposts'?'🔁 Repost':('▶ '+(tab==='videos'?'Video':'Short'))}</span><span class="short-views">${formatProfileCount(x.views||0)}</span></button>${tab==='reposts'&&x.note?`<small class="muted" style="display:block;padding:6px 8px">${escapeHtml(x.note)}</small>`:''}${!publicMode&&tab==='shorts'?`<button class="profile-pin-btn secondary" type="button" data-pin-short="${escapeHtml(id)}">${pinned?'📌 Unpin':'📌 Pin'}</button>`:''}</div>`}).join('')+'</div>';return}const liked=Array.isArray(d.liked)?d.liked:[];box.innerHTML=liked.length?'<div class="profile-short-grid">'+liked.map((x,i)=>`<button class="profile-short" type="button"><span class="short-icon">♥ Liked</span><span class="short-views">${formatProfileCount(x.views||0)}</span></button>`).join('')+'</div>':'<div class="profile-empty"><div style="font-size:34px;margin-bottom:10px">♡</div><b>No liked videos yet</b><span>Liked Shorts will appear here.</span></div>'}
function renderProfile(){const d=getProfileData();const u=currentUser()||{};const identifier=u.email||u.mobile||'Signed in account';const name=d.name||'TNS Studio User';const initial=(name.trim()[0]||'👤').toUpperCase();$('#profileName')&&($('#profileName').textContent=name);$('#profileBio')&&($('#profileBio').textContent=d.bio||'Video Creator | AI Explorer | Dream Big');const bioMore=$('#profileBioMoreBtn');if(bioMore){bioMore.classList.toggle('hidden',String(d.bio||'Video Creator | AI Explorer | Dream Big').length<=100);bioMore.textContent='More';bioMore.setAttribute('aria-expanded','false');$('#profileBio')?.classList.remove('is-expanded')}$('#profileLocation')&&($('#profileLocation').innerHTML=`📍 ${escapeHtml(d.location||'India')} <span>•</span> 📅 Joined recently`);$('#profileFollowers')&&($('#profileFollowers').textContent=formatProfileCount(d.followers||0));$('#profileFollowing')&&($('#profileFollowing').textContent=formatProfileCount(d.following||0));$('#profilePosts')&&($('#profilePosts').textContent=String(profileShorts().length+(Array.isArray(d.videoPosts)?d.videoPosts.length:0)));$('#profilePostsLabel')&&($('#profilePostsLabel').textContent=`${profileShorts().length} Shorts`);$('#profileIdentifier')&&($('#profileIdentifier').textContent=identifier);$('#profileAccountId')&&($('#profileAccountId').textContent=u.id||'—');$('#profileLoginType')&&($('#profileLoginType').textContent=u.mobile?'Mobile Number':u.email?'Email':'Account');const av=$('#profileAvatar');if(av)av.innerHTML=d.avatar?`<img src="${escapeHtml(d.avatar)}" alt="Profile photo">`:escapeHtml(initial);renderProfileStatuses();renderProfileContent('shorts');}
function renderProfileStatuses(){const box=$('#profileStatuses');if(!box)return;const d=getProfileData();const items=Array.isArray(d.statuses)?d.statuses:[];const own=!$('#profile')?.classList.contains('profile-public-mode');const visible=own?items:items.filter(x=>x.audience!=='private');if(!visible.length){box.innerHTML=own?'<button class="profile-status add-status-circle" id="profileStatusQuickAdd" type="button"><span class="profile-status-ring add"><b>＋</b></span><small>Add status</small></button>':'<div class="profile-status-empty">No active status</div>';return}box.innerHTML=visible.map(x=>{const letter=escapeHtml((x.text||'Status').slice(0,1));const icon=x.url&&String(x.type||'').startsWith('video')?'▶':letter;return `<button class="profile-status" type="button" data-profile-status="${escapeHtml(String(x.id))}"><span class="profile-status-ring"><span>${icon}</span></span><small>${escapeHtml(x.text||'Status')}</small></button>`}).join('')+(own?'<button class="profile-status add-status-circle" id="profileStatusQuickAdd" type="button"><span class="profile-status-ring add"><b>＋</b></span><small>Add</small></button>':'');}
function openProfileStatus(id){const d=getProfileData();const x=(d.statuses||[]).find(v=>String(v.id)===String(id));if(!x)return;const message=x.text||'TNS Studio Status';if(x.url&&String(x.type||'').startsWith('video')){const w=window.open('','_blank','width=420,height=760');if(w){w.document.write(`<title>${escapeHtml(message)}</title><body style="margin:0;background:#050917;display:grid;place-items:center"><video src="${escapeHtml(x.url)}" controls autoplay playsinline style="max-width:100%;max-height:100vh"></video><div style="position:fixed;bottom:25px;left:20px;right:20px;color:white;font:600 16px sans-serif">${escapeHtml(message)}</div></body>`);w.document.close();}}else if(x.url){const w=window.open('','_blank','width=420,height=760');if(w){w.document.write(`<title>${escapeHtml(message)}</title><body style="margin:0;background:#050917;display:grid;place-items:center"><img src="${escapeHtml(x.url)}" style="max-width:100%;max-height:100vh;object-fit:contain"><div style="position:fixed;bottom:25px;left:20px;right:20px;color:white;font:600 16px sans-serif">${escapeHtml(message)}</div></body>`);w.document.close();}}else toast(message);}
function openProfileStatusModal(){const m=$('#profileStatusModal');if(!m)return;$('#profileStatusFile').value='';$('#profileStatusText').value='';$('#profileStatusMsg').textContent='';m.classList.remove('hidden')}
$('#profileAddStatusBtn')?.addEventListener('click',openProfileStatusModal);$('#profileStatuses')?.addEventListener('click',e=>{const b=e.target.closest('[data-profile-status]');if(b)return openProfileStatus(b.dataset.profileStatus);if(e.target.closest('#profileStatusQuickAdd'))openProfileStatusModal()});$('#profileStatusSave')?.addEventListener('click',()=>{const f=$('#profileStatusFile')?.files?.[0],text=($('#profileStatusText').value||'').trim();if(!f&&!text)return toast('Add a photo, video or status text');const d=getProfileData();d.statuses=Array.isArray(d.statuses)?d.statuses:[];const save=(url,type)=>{d.statuses.push({id:'status_'+Date.now(),url:url||'',type:type||'',text:text||'Status',audience:'followers',createdAt:Date.now()});saveProfileData(d);renderProfileStatuses();$('#profileStatusModal').classList.add('hidden');toast('Status added');};if(f){const r=new FileReader();r.onload=()=>save(r.result,f.type);r.readAsDataURL(f)}else save('','text')});

function formatProfileCount(n){n=Number(n)||0;if(n>=1000000)return (n/1000000).toFixed(1).replace('.0','')+'M';if(n>=1000)return (n/1000).toFixed(1).replace('.0','')+'K';return String(n)}
function openProfileEdit(){const d=getProfileData();$('#profileEditName').value=d.name||'';$('#profileEditHandle').value=d.handle||'';$('#profileEditBio').value=d.bio||'';$('#profileEditLocation').value=d.location||'India';$('#profileEditWebsite').value=d.website||'';$('#profileEditDob').value=d.dob||'';const av=$('#profileEditAvatar');const name=d.name||'TNS Studio User';const initial=(name.trim()[0]||'👤').toUpperCase();if(av)av.innerHTML=d.avatar?`<img src="${escapeHtml(d.avatar)}" alt="Profile photo">`:escapeHtml(initial);$('#profileEditStatus').textContent='';$('#profileEditModal').classList.remove('hidden')}
function setProfilePublicMode(on){const page=$('#profile');if(!page)return;page.classList.toggle('profile-public-mode',!!on);const d=getProfileData();const btn=$('#profilePublicBtn');if(btn)btn.textContent=on?'← My Profile':'👁 View Public';const edit=$('#profileEditBtn');if(edit)edit.classList.toggle('hidden',!!on);const follow=$('#profileFollowBtn');if(follow){follow.classList.toggle('hidden',!on);if(on)follow.textContent=(d.settings?.accountVisibility==='private'||d.settings?.followRequests==='approve')?'Request to follow':'＋ Follow'}if(on){const followers=Math.max(Number(d.followers)||0,0);$('#profileFollowers').textContent=formatProfileCount(followers);$('#profileContent').dataset.public='true';$('#profileAddStatusBtn')?.classList.add('hidden');$('#profileUploadBox')?.classList.add('hidden');$('#profileEditBtn')?.classList.add('hidden');$('#profileMessageBtn')?.classList.remove('hidden');renderProfileStatuses();renderProfileContent('shorts',true)}else{delete $('#profileContent').dataset.public;$('#profileAddStatusBtn')?.classList.remove('hidden');$('#profileUploadBox')?.classList.remove('hidden');$('#profileEditBtn')?.classList.remove('hidden');$('#profileMessageBtn')?.classList.add('hidden');renderProfileStatuses();renderProfileContent('shorts',false)}}
$('#profileEditBtn')?.addEventListener('click',openProfileEdit);
$('#profileBioMoreBtn')?.addEventListener('click',()=>{const bio=$('#profileBio');const btn=$('#profileBioMoreBtn');if(!bio||!btn)return;const expanded=bio.classList.toggle('is-expanded');btn.textContent=expanded?'Less':'More';btn.setAttribute('aria-expanded',expanded?'true':'false')});
$('#profilePublicBtn')?.addEventListener('click',()=>setProfilePublicMode(!$('#profile')?.classList.contains('profile-public-mode')));
$('#profileFollowBtn')?.addEventListener('click',()=>{const b=$('#profileFollowBtn');const d=getProfileData();if(d.settings?.accountVisibility==='private'||d.settings?.followRequests==='approve'){if(b.dataset.following==='pending')return;b.dataset.following='pending';b.textContent='✓ Requested';b.disabled=true;toast('Follow request sent');return}const following=b.dataset.following==='true';b.dataset.following=following?'false':'true';b.textContent=following?'＋ Follow':'✓ Following';if(!following)d.followers=(Number(d.followers)||0)+1;else d.followers=Math.max(0,(Number(d.followers)||0)-1);saveProfileData(d);$('#profileFollowers').textContent=formatProfileCount(d.followers)});
$('#profileMessageBtn')?.addEventListener('click',()=>{showPanel('contact');toast('TNS Contact opened');});
$('#profileUploadShortBtn')?.addEventListener('click',()=>showPanel('shorts'));
$('#profileUploadVideoBtn')?.addEventListener('click',()=>showPanel('shorts'));
$('#profileSaveBtn')?.addEventListener('click',()=>{const d=getProfileData();const first=$('#profileEditName').value.trim();const last=$('#profileEditHandle').value.trim();const name=[first,last].filter(Boolean).join(' ').trim()||'TNS Studio User';d.name=name;d.handle=last;d.bio=$('#profileEditBio').value.trim()||'Video Creator | AI Explorer | Dream Big';d.location=$('#profileEditLocation').value.trim()||'India';d.website=$('#profileEditWebsite').value.trim();d.dob=$('#profileEditDob').value||'';saveProfileData(d);$('#profileEditModal').classList.add('hidden');renderProfile();toast('Profile updated')});
$('#profileEditPhotoBtn')?.addEventListener('click',()=>$('#profileAvatarInput')?.click());
$('#profileAvatarInput')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)openProfilePhotoEditor(f);e.target.value=''});
$$('[data-profile-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-profile-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderProfileContent(b.dataset.profileTab,$('#profile')?.classList.contains('profile-public-mode'))}));
$('#profileContent')?.addEventListener('click',e=>{const b=e.target.closest('[data-pin-short]');if(b){e.preventDefault();e.stopPropagation();togglePinnedShort(b.dataset.pinShort);}});
$$('[data-profile-stat]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.profileStat;const d=getProfileData();if(type==='posts')return;const title=type==='followers'?'Followers':'Following';const list=type==='followers'?(Array.isArray(d.followerList)?d.followerList:[]):(Array.isArray(d.followingList)?d.followingList:[]);$('#profileSocialEyebrow').textContent=title.toUpperCase();$('#profileSocialTitle').textContent=title;$('#profileSocialList').innerHTML=list.length?list.map((x,i)=>`<div class="profile-social-row"><div class="profile-social-avatar">${escapeHtml((x.name||x[0]||'U')[0])}</div><div><b>${escapeHtml(x.name||x[0]||'User')}</b><small>${escapeHtml(x.handle||x[1]||'@user')}</small></div><button class="profile-social-follow" data-follow-demo="${i}" type="button">${type==='followers'?'Following':'Follow'}</button></div>`).join(''):'<div class="profile-empty compact"><b>No '+title.toLowerCase()+' yet</b><span>They will appear here when your account has '+title.toLowerCase()+'.</span></div>';$('#profileSocialModal').classList.remove('hidden') }));
$('#profileSocialList')?.addEventListener('click',e=>{const b=e.target.closest('[data-follow-demo]');if(!b)return;b.textContent=b.textContent==='Follow'?'Following':'Follow';b.style.opacity=b.textContent==='Following'?'.7':'1'});
let profilePhotoImage=null, profilePhotoScale=1, profilePhotoOffsetX=0, profilePhotoOffsetY=0, profilePhotoDragging=false, profilePhotoLastX=0, profilePhotoLastY=0, shortUploadFile=null, shortUploadObjectUrl='';
function drawProfilePhoto(){const c=$('#profilePhotoCanvas');if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#071022';ctx.fillRect(0,0,c.width,c.height);if(!profilePhotoImage)return;const scale=Math.max(c.width/profilePhotoImage.width,c.height/profilePhotoImage.height)*profilePhotoScale;const w=profilePhotoImage.width*scale,h=profilePhotoImage.height*scale;ctx.drawImage(profilePhotoImage,(c.width-w)/2+profilePhotoOffsetX,(c.height-h)/2+profilePhotoOffsetY,w,h);}
function openProfilePhotoEditor(file){if(!file.type.startsWith('image/'))return toast('Choose an image');const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{profilePhotoImage=img;profilePhotoScale=1;profilePhotoOffsetX=0;profilePhotoOffsetY=0;$('#profilePhotoZoom').value='1';$('#profilePhotoStatus').textContent='';$('#profilePhotoModal').classList.remove('hidden');drawProfilePhoto()};img.src=r.result};r.readAsDataURL(file)}
$('#profileCamera')?.addEventListener('click',()=>$('#profileAvatarInput')?.click());
$('#profilePhotoChoose')?.addEventListener('click',()=>{$('#profilePhotoFile')?.setAttribute('capture','');$('#profilePhotoFile')?.click()});
$('#profilePhotoTake')?.addEventListener('click',()=>{$('#profilePhotoFile')?.setAttribute('capture','environment');$('#profilePhotoFile')?.click()});
$('#profilePhotoFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)openProfilePhotoEditor(f);e.target.value=''});
$('#profilePhotoZoom')?.addEventListener('input',e=>{profilePhotoScale=Number(e.target.value)||1;drawProfilePhoto()});
$('#profilePhotoCanvas')?.addEventListener('pointerdown',e=>{profilePhotoDragging=true;profilePhotoLastX=e.clientX;profilePhotoLastY=e.clientY;$('#profilePhotoCanvas').setPointerCapture?.(e.pointerId)});
$('#profilePhotoCanvas')?.addEventListener('pointermove',e=>{if(!profilePhotoDragging)return;profilePhotoOffsetX+=e.clientX-profilePhotoLastX;profilePhotoOffsetY+=e.clientY-profilePhotoLastY;profilePhotoLastX=e.clientX;profilePhotoLastY=e.clientY;drawProfilePhoto()});
$('#profilePhotoCanvas')?.addEventListener('pointerup',()=>profilePhotoDragging=false);$('#profilePhotoCanvas')?.addEventListener('pointercancel',()=>profilePhotoDragging=false);
$('#profilePhotoRemove')?.addEventListener('click',()=>{const d=getProfileData();d.avatar='';saveProfileData(d);renderProfile();$('#profilePhotoModal').classList.add('hidden');toast('Profile photo removed')});
$('#profilePhotoCancel')?.addEventListener('click',()=>$('#profilePhotoModal').classList.add('hidden'));
$('#profilePhotoSave')?.addEventListener('click',()=>{if(!profilePhotoImage)return toast('Choose a photo first');const c=$('#profilePhotoCanvas');const d=getProfileData();d.avatar=c.toDataURL('image/jpeg',0.88);saveProfileData(d);renderProfile();$('#profilePhotoModal').classList.add('hidden');toast('Profile photo updated')});
function openShortUpload(){const m=$('#shortUploadModal');if(!m)return;const d=getProfileData();const accountPrivate=d.settings?.accountVisibility==='private';shortUploadFile=null;$('#shortUploadPreview').classList.add('hidden');$('#shortUploadPreview').removeAttribute('src');$('#shortUploadPlaceholder').classList.remove('hidden');$('#shortUploadDetails').classList.add('hidden');$('#shortUploadStatus').textContent='';$('#shortUploadCaption').value='';$('#shortUploadHashtags').value='';$('#shortUploadAudience').value=accountPrivate?'followers':(d.settings?.shortAudience||'public');$('#shortAllowComments').checked=d.settings?.comments!=='off';$('#shortAllowLikes').checked=d.settings?.likes!=='off';$('#shortAllowSharing').checked=d.settings?.sharing!=='off';$('#shortAllowDownloads').checked=d.settings?.downloads==='on';$('#shortAllowRemix').checked=d.settings?.remix!=='off';$('#shortTrial').checked=false;$('#shortCollab').checked=false;$('#shortCollabHandles').value='';$('#shortCollabFields').classList.add('hidden');$('#shortAddYours').checked=false;$('#shortAddYoursPrompt').value='';$('#shortAddYoursFields').classList.add('hidden');$('#shortTranslate').checked=false;$('#shortTranslateFields').classList.add('hidden');$('#shortTranslateLanguage').value='hi';$('#shortTranslateLipSync').checked=true;$('#shortTranslateVoice').checked=true;$('#shortCoverPreview').textContent='Cover';m.classList.remove('hidden')}
function prepareShortUpload(file){if(!file.type.startsWith('video/'))return toast('Choose a video file');shortUploadFile=file;const p=$('#shortUploadPreview');if(shortUploadObjectUrl)URL.revokeObjectURL(shortUploadObjectUrl);shortUploadObjectUrl=URL.createObjectURL(file);p.src=shortUploadObjectUrl;p.classList.remove('hidden');$('#shortUploadPlaceholder').classList.add('hidden');$('#shortUploadDetails').classList.remove('hidden');$('#shortUploadStatus').textContent='Video ready. Check preview and details before posting.'}
$('#shortChooseVideo')?.addEventListener('click',()=>$('#shortUploadFile')?.click());$('#shortUploadFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)prepareShortUpload(f);e.target.value=''});
$('#shortCoverFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#shortCoverPreview').innerHTML=`<img src="${escapeHtml(r.result)}" alt="Cover preview">`};r.readAsDataURL(f)});
$('#shortCollab')?.addEventListener('change',()=>{$('#shortCollabFields')?.classList.toggle('hidden',!$('#shortCollab').checked);}); $('#shortTranslate')?.addEventListener('change',()=>{$('#shortTranslateFields')?.classList.toggle('hidden',!$('#shortTranslate').checked);}); $('#shortAddYours')?.addEventListener('change',()=>{$('#shortAddYoursFields')?.classList.toggle('hidden',!$('#shortAddYours').checked);}); $('#shortAllowComments')?.addEventListener('change',()=>{}); $('#shortPostBtn')?.addEventListener('click',async()=>{if(!shortUploadFile)return toast('Choose a video first');const status=$('#shortUploadStatus');status.textContent='Uploading video…';try{const fd=new FormData();fd.append('video',shortUploadFile);const res=await fetch('/api/uploads/video',{method:'POST',body:fd,credentials:'include'});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Video upload failed. Please log in again.');const d=getProfileData();d.settings=d.settings||{};const id='short_'+Date.now();const title=(shortUploadFile.name||'My Short').replace(/\.[^.]+$/,'');const isTrial=!!$('#shortTrial')?.checked;const isCollab=!!$('#shortCollab')?.checked;const isAddYours=!!$('#shortAddYours')?.checked;const isTranslated=!!$('#shortTranslate')?.checked;const translateLanguage=$('#shortTranslateLanguage')?.value||'hi';const translateLipSync=!!$('#shortTranslateLipSync')?.checked;const translateVoice=!!$('#shortTranslateVoice')?.checked;const addYoursPrompt=($('#shortAddYoursPrompt').value||'').trim();if(isAddYours&&!addYoursPrompt)throw new Error('Add an Add Yours prompt.');const collaborators=isCollab?Array.from(new Set(($('#shortCollabHandles').value||'').split(/[,\n ]+/).map(v=>v.trim().replace(/^@/,'').toLowerCase()).filter(Boolean))).slice(0,3).map(handle=>'@'+handle):[];if(isCollab&&!collaborators.length)throw new Error('Add at least one collaborator handle.');const post={id,creator:d.name||'TNS Studio User',handle:'@'+(d.handle||'tns_user'),title,caption:$('#shortUploadCaption').value.trim(),hashtags:$('#shortUploadHashtags').value.trim(),audio:'Original audio',views:0,url:data.media.url,avatar:d.avatar||'',liked:false,saved:false,following:false,audience:isTrial?'trial':$('#shortUploadAudience').value,trial:isTrial,trialStartedAt:isTrial?Date.now():null,trialShared:false,collab:isCollab,collaborators,collabStatus:isCollab?'pending':'none',addYours:isAddYours,addYoursPrompt:isAddYours?addYoursPrompt:'',addYoursReplies:[],translation:isTranslated?{enabled:true,language:translateLanguage,lipSync:translateLipSync,voice:translateVoice,status:'pending'}:null,comments:$('#shortAllowComments').checked,likes:$('#shortAllowLikes').checked,sharing:$('#shortAllowSharing').checked,downloads:$('#shortAllowDownloads').checked,remix:$('#shortAllowRemix').checked,commentFilter:d.settings.commentFilter||'standard',hiddenWords:d.settings.hiddenWords!==false,mentionPolicy:d.settings.mentions||'everyone',tagPolicy:d.settings.tags||'everyone',interactionLimits:d.settings.limits||'off'};shortsFeedItems.unshift(post);d.shortPosts=[...(d.shortPosts||[]),{id,title,type:'short',views:0,url:data.media.url,caption:post.caption,audience:post.audience,trial:isTrial,trialStartedAt:post.trialStartedAt,trialShared:false,addYours:isAddYours,addYoursPrompt:isAddYours?addYoursPrompt:'',addYoursReplies:[],translation:post.translation}];d.posts=d.shortPosts.length;saveProfileData(d);renderShortsFeed();renderProfile();$('#shortUploadModal').classList.add('hidden');toast('Short posted successfully');}catch(err){status.textContent=err.message;toast(err.message)}});
function profileSettingsDefaults(){const d=getProfileData();const s=d.settings||{};if(s.sensitiveContent==='standard')s.sensitiveContent='limit';else if(s.sensitiveContent==='less')s.sensitiveContent='strict';return s;}
function syncSensitiveContentControl(){const age=$('#psAgeBand')?.value||'adult';const el=$('#psSensitiveContent');if(!el)return;const allow=el.querySelector('option[value=allow]');if(age==='teen'){if(allow)allow.disabled=true;if(el.value==='allow')el.value='strict';}else if(allow)allow.disabled=false;const note=$('#psSensitiveContentNote');if(note)note.textContent=age==='teen'?'Under 18 accounts use the most restrictive available setting; Allow is unavailable.':'Controls sensitive content in recommended areas such as Shorts, Search and Explore.';}

function applyCommentFilterToUpload(){const d=getProfileData();const s=d.settings||{};const el=$('#shortAllowComments');if(el)el.checked=s.comments!=='off';}function openProfileSettings(){const s=profileSettingsDefaults();s.mentions=s.mentions||'everyone';s.tags=s.tags||'everyone';s.feedView=s.feedView||'home';const ids=['accountVisibility','followingVisibility','followersVisibility','likedVisibility','shortAudience','comments','likes','sharing','downloads','remix','commentFilter','mentions','tags','followRequests','messageRequests','limits'];ids.forEach(k=>{const el=$('#ps'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.value=s[k]??el.value});['ageBand','madeForKids','locationVisibility','sensitiveContent','videoQuality','feedView'].forEach(k=>{const el=$('#ps'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.value=s[k]??el.value});syncSensitiveContentControl();['hiddenWords','readReceipts','activityStatus','sleepMode','sleepAutoReply','notifyFollowers','notifyLikes','notifyMentions','notifyMessages','notifyCreator','analytics','saveOriginals','wifiUpload','personalizedFeed','autoplay','autoDownload'].forEach(k=>{const el=$('#ps'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.checked=s[k]!==false});$('#psLoginAlerts')&&(document.getElementById('psLoginAlerts').dataset.on=s.loginAlerts!==false?'true':'false',document.getElementById('psLoginAlerts').textContent=`Login alerts: ${s.loginAlerts!==false?'On':'Off'}`);$('#psPasskey')&&(document.getElementById('psPasskey').textContent=`Passkey: ${s.passkey?'On':'Off'}`);$('#profileSettingsStatus').textContent='';const favs=Array.isArray(s.favoriteAccounts)?s.favoriteAccounts:[];$('#psFavoritesNote')&&($('#psFavoritesNote').textContent=`${favs.length}/50 favorite accounts selected. Their posts can be prioritized in your feed.`);$('#profileSettingsModal').classList.remove('hidden')}
$('#psNotInterestedInfo')?.addEventListener('click',()=>toast('Tap 🚫 Not interested on a Short to hide it from your feed.'));
$('#psFavorites')?.addEventListener('click',()=>{
  const d=getProfileData();
  const current=Array.isArray(d.settings?.favoriteAccounts)?d.settings.favoriteAccounts:[];
  const value=prompt('Favorite accounts (up to 50). Enter @handles separated by commas:',current.join(', '));
  if(value===null)return;
  const list=[...new Set(value.split(',').map(x=>x.trim().replace(/^@+/,'').toLowerCase()).filter(Boolean))].slice(0,50);
  d.settings={...d.settings,favoriteAccounts:list};
  saveProfileData(d);
  $('#psFavoritesNote')&&($('#psFavoritesNote').textContent=`${list.length}/50 favorite accounts selected. Their posts can be prioritized in your feed.`);
  toast(list.length?`Favorites updated: ${list.length} account${list.length===1?'':'s'}`:'Favorites cleared');
});
$('#psResetRecommendations')?.addEventListener('click',()=>{
  const d=getProfileData();
  if(!confirm('Reset suggested content? Your profile, posted Shorts and account settings will stay safe.'))return;
  d.settings={...d.settings,recommendationResetAt:new Date().toISOString(),personalizedFeed:true};
  saveProfileData(d);
  $('#psPersonalizedFeed') && ($('#psPersonalizedFeed').checked=true);
  $('#profileSettingsStatus').textContent='Suggested content reset. Recommendations will personalize again from your new interactions.';
  toast('Suggested content reset');
});
$('#psAgeBand')?.addEventListener('change',syncSensitiveContentControl);
$('#psAccountVisibility')?.addEventListener('change',()=>{const d=getProfileData();const value=$('#psAccountVisibility').value;d.settings={...d.settings,accountVisibility:value};if(value==='private')d.settings.shortAudience='followers';else if(d.settings.shortAudience==='followers')d.settings.shortAudience='public';saveProfileData(d);const audience=$('#psShortAudience');if(audience)audience.value=d.settings.shortAudience;$('#profileSettingsStatus').textContent=value==='private'?'Private account enabled. New Shorts default to Followers.':'Public account enabled. New Shorts default to Everyone.';toast(value==='private'?'Private account enabled':'Public account enabled');if($('#profile')?.classList.contains('profile-public-mode'))setProfilePublicMode(true);});
$('#profileSettingsSave')?.addEventListener('click',()=>{const d=getProfileData();d.settings={accountVisibility:$('#psAccountVisibility').value,followingVisibility:$('#psFollowingVisibility').value,followersVisibility:$('#psFollowersVisibility').value,likedVisibility:$('#psLikedVisibility').value,shortAudience:$('#psShortAudience').value,comments:$('#psComments').value,likes:$('#psLikes').value,sharing:$('#psSharing').value,downloads:$('#psDownloads').value,remix:$('#psRemix').value,commentFilter:$('#psCommentFilter').value,mentions:$('#psMentions').value,tags:$('#psTags').value,hiddenWords:$('#psHiddenWords').checked,followRequests:$('#psFollowRequests').value,messageRequests:$('#psMessageRequests').value,readReceipts:$('#psReadReceipts').checked,activityStatus:$('#psActivityStatus').checked,sleepMode:$('#psSleepMode').checked,sleepStart:$('#psSleepStart').value||'22:00',sleepEnd:$('#psSleepEnd').value||'07:00',sleepAutoReply:$('#psSleepAutoReply').checked,limits:$('#psLimits').value,notifyFollowers:$('#psNotifyFollowers').checked,notifyLikes:$('#psNotifyLikes').checked,notifyMentions:$('#psNotifyMentions').checked,notifyMessages:$('#psNotifyMessages').checked,notifyCreator:$('#psNotifyCreator').checked,analytics:$('#psAnalytics').checked,saveOriginals:$('#psSaveOriginals').checked,wifiUpload:$('#psWifiUpload').checked,loginAlerts:$('#psLoginAlerts').dataset.on!=='false',loginAlertNewDevice:!!d.settings.loginAlertNewDevice,loginAlertSuspicious:!!d.settings.loginAlertSuspicious,loginAlertChannel:d.settings.loginAlertChannel||'in_app',sessions:s.sessions||[],twoFactor:!!s.twoFactor,twoFactorMethod:s.twoFactorMethod||'authenticator',passkey:!!s.passkey,ageBand:$('#psAgeBand').value,madeForKids:$('#psMadeForKids').value,locationVisibility:$('#psLocationVisibility').value,sensitiveContent:(['limit','strict','allow'].includes($('#psSensitiveContent').value)?$('#psSensitiveContent').value:'limit'),personalizedFeed:$('#psPersonalizedFeed').checked,feedView:$('#psFeedView').value||'home',followingAccounts:Array.isArray(d.settings.followingAccounts)?d.settings.followingAccounts:[],recommendationResetAt:d.settings.recommendationResetAt||null,favoriteAccounts:Array.isArray(d.settings.favoriteAccounts)?d.settings.favoriteAccounts.slice(0,50):[],notInterestedShorts:Array.isArray(d.settings.notInterestedShorts)?d.settings.notInterestedShorts.slice(-500):[],videoQuality:$('#psVideoQuality').value,autoplay:$('#psAutoplay').checked,wifiOnly:$('#psWifiOnly').checked||$('#psWifiUpload').checked,autoDownload:$('#psAutoDownload').checked};saveProfileData(d);$('#profileSettingsStatus').textContent='Settings saved successfully';renderProfile();setTimeout(()=>$('#profileSettingsModal')?.classList.add('hidden'),650)});
$('#psSecurityCheckup')?.addEventListener('click',()=>{
  const d=profileSettingsData(); const s=d.settings||{};
  const modalId='securityCheckupModal'; let m=$('#'+modalId);
  const esc=v=>escapeHtml(String(v));
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeSecurityCheckup">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Security Checkup</h2><p class="muted">Review the main protections on your TNS Studio account in one quick check.</p><div id="securityCheckupList" class="profile-settings-list"></div><div class="setting-actions"><button id="securityCheckupRefresh" class="secondary" type="button">Refresh check</button><button id="securityCheckupDone" class="primary" type="button">Done</button></div><small class="muted">This checkup reviews your current TNS Studio settings. Real threat detection, device risk scoring and account recovery require the production security service.</small><p id="securityCheckupStatus" class="status"></p></div></div>`);
    m=$('#'+modalId);
    $('#closeSecurityCheckup').onclick=()=>m.classList.add('hidden');
    $('#securityCheckupDone').onclick=()=>m.classList.add('hidden');
    $('#securityCheckupRefresh').onclick=()=>renderCheckup();
  }
  function renderCheckup(){
    const x=profileSettingsData(), q=x.settings||{};
    const checks=[
      {key:'Password',ok:true,detail:'Your password is protected by the account password workflow.',action:null},
      {key:'2-step verification',ok:!!q.twoFactor,detail:q.twoFactor?'Enabled — an extra login check is configured.':'Not enabled — turn on 2-step verification for stronger protection.',action:'psTwoFactor'},
      {key:'Login alerts',ok:q.loginAlerts!==false,detail:q.loginAlerts!==false?'Enabled — new/suspicious login alerts are configured.':'Off — enable login alerts to be notified about risky sign-ins.',action:'psLoginAlerts'},
      {key:'Active devices',ok:true,detail:`${Array.isArray(q.sessions)?q.sessions.length:0} stored additional session${(Array.isArray(q.sessions)?q.sessions.length:0)===1?'':'s'} found. Review devices regularly.`,action:'psSessions'},
      {key:'Passkey',ok:!!q.passkey,detail:q.passkey?'Enabled — passkey preference is on.':'Not enabled — passkeys can provide stronger passwordless sign-in.',action:'psPasskey'},
      {key:'Backup codes',ok:Array.isArray(q.backupCodes)&&q.backupCodes.length>0,detail:Array.isArray(q.backupCodes)&&q.backupCodes.length?`${q.backupCodes.length} recovery codes available.`:'No recovery codes generated yet.',action:'psBackupCodes'},
      {key:'Security emails',ok:true,detail:'Security-email history is available for reviewing authentic account messages.',action:'psSecurityEmails'}
    ];
    const good=checks.filter(c=>c.ok).length;
    $('#securityCheckupList').innerHTML=checks.map(c=>`<div class="profile-settings-row"><div><b>${c.ok?'✓':'⚠️'} ${esc(c.key)}</b><small>${esc(c.detail)}</small></div>${c.action?`<button class="secondary" type="button" data-checkup-action="${c.action}">${c.ok?'Review':'Fix'}</button>`:''}</div>`).join('');
    $('#securityCheckupStatus').textContent=`Security check complete: ${good}/${checks.length} protections look ready.`;
    $('#securityCheckupList').querySelectorAll('[data-checkup-action]').forEach(btn=>btn.onclick=()=>{m.classList.add('hidden');document.getElementById(btn.dataset.checkupAction)?.click();});
  }
  renderCheckup(); m.classList.remove('hidden');
});
$('#psLoginAlerts')?.addEventListener('click',()=>{const d=profileSettingsData();const s=d.settings||{};const modalId='loginAlertsModal';let m=$('#'+modalId);if(!m){document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeLoginAlerts">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Login alerts</h2><p class="muted">Get an alert when a new device/browser signs in or when suspicious login activity is detected.</p><label class="setting-check"><input id="psAlertNewDevice" type="checkbox"> New device or browser</label><label class="setting-check"><input id="psAlertSuspicious" type="checkbox"> Suspicious login activity</label><label>Alert channel<select id="psAlertChannel"><option value="in_app">In-app notification</option><option value="email">Email</option><option value="in_app_email">In-app + Email</option></select></label><div class="setting-actions"><button id="saveLoginAlerts" class="primary" type="button">Save alert settings</button><button id="testLoginAlert" class="secondary" type="button">Test in-app alert</button></div><small class="muted">Actual email/push delivery requires the production notification service. The test alert only verifies the TNS Studio UI workflow.</small><p id="loginAlertStatus" class="status"></p></div></div>`);m=$('#'+modalId);$('#closeLoginAlerts').onclick=()=>m.classList.add('hidden');$('#saveLoginAlerts').onclick=()=>{const x=profileSettingsData();x.settings.loginAlerts=true;x.settings.loginAlertNewDevice=$('#psAlertNewDevice').checked;x.settings.loginAlertSuspicious=$('#psAlertSuspicious').checked;x.settings.loginAlertChannel=$('#psAlertChannel').value;saveProfileData(x);$('#psLoginAlerts').dataset.on='true';$('#psLoginAlerts').textContent='Login alerts: On';$('#loginAlertStatus').textContent='Login alert preferences saved.';toast('Login alert settings saved');};$('#testLoginAlert').onclick=()=>{toast('Test login alert: This device is recognized.');$('#loginAlertStatus').textContent='Test alert shown in-app.';};}const enabled=s.loginAlerts!==false;$('#psAlertNewDevice').checked=s.loginAlertNewDevice!==false;$('#psAlertSuspicious').checked=s.loginAlertSuspicious!==false;$('#psAlertChannel').value=s.loginAlertChannel||'in_app';$('#loginAlertStatus').textContent=enabled?'Alerts are currently enabled.':'Alerts are currently off. Tap Save to enable them.';m.classList.remove('hidden');});
function profileSettingsData(){const d=getProfileData();d.settings=d.settings||{};d.settings.limits=d.settings.limits||'off';d.blockedAccounts=Array.isArray(d.blockedAccounts)?d.blockedAccounts:[];d.restrictedAccounts=Array.isArray(d.restrictedAccounts)?d.restrictedAccounts:[];d.reportHistory=Array.isArray(d.reportHistory)?d.reportHistory:[];d.activity=d.activity||{watchHistory:[],savedShorts:[],comments:[],searchHistory:[]};return d;}
function openSimpleSettingsList(kind){const d=profileSettingsData();const map={blocked:['Blocked accounts',d.blockedAccounts,'No blocked accounts yet.'],restricted:['Restricted accounts',d.restrictedAccounts,'No restricted accounts yet.'],reports:['Report history',d.reportHistory,'No reports yet.']};const item=map[kind];if(!item)return;$('#profileListModalTitle').textContent=item[0];const list=item[1];$('#profileListModalBody').innerHTML=list.length?list.map((x,i)=>`<div class=\"profile-settings-row\"><div><b>${escapeHtml(x.name||x.title||'Account')}</b><small>${escapeHtml(x.handle||x.reason||'')}</small></div><button class=\"secondary\" data-settings-remove=\"${kind}:${i}\">${kind==='reports'?'View':'Remove'}</button></div>`).join(''):`<div class=\"profile-empty compact\"><b>${item[2]}</b><span>This list will update when you use the related safety action.</span></div>`;$('#profileListModal').classList.remove('hidden')}
$('#psBlockedBtn')?.addEventListener('click',()=>openSimpleSettingsList('blocked'));$('#psRestrictedBtn')?.addEventListener('click',()=>openSimpleSettingsList('restricted'));$('#psRestrictAddBtn')?.addEventListener('click',()=>{const d=profileSettingsData();const value=prompt('Restrict account\nEnter a name or @username:');if(value===null)return;const handle=value.trim();if(!handle)return;const clean=handle.replace(/^@/,'').trim();if(!clean)return;if(d.restrictedAccounts.some(x=>(x.handle||'').toLowerCase()===('@'+clean).toLowerCase())){toast('This account is already restricted');return}d.restrictedAccounts.unshift({name:clean,handle:'@'+clean,createdAt:new Date().toISOString()});saveProfileData(d);openSimpleSettingsList('restricted');toast('Account restricted quietly')});$('#profileListModalBody')?.addEventListener('click',e=>{const b=e.target.closest('[data-settings-remove]');if(!b)return;const [kind,index]=b.dataset.settingsRemove.split(':');if(kind==='reports'){toast('Report details are available in your safety history');return}const d=profileSettingsData();const key=kind==='blocked'?'blockedAccounts':'restrictedAccounts';d[key].splice(Number(index),1);saveProfileData(d);openSimpleSettingsList(kind);toast('Updated')});
$('#psChangePassword')?.addEventListener('click',()=>{const m=$('#changePasswordModal');if(!m)return;m.classList.remove('hidden');$('#cpCurrent').value='';$('#cpNew').value='';$('#cpConfirm').value='';$('#cpStatus').textContent='';$('#cpStrength').textContent='Enter a new password';$('#cpStrength').removeAttribute('data-level');$('#cpCurrent').focus()});
function cpToggle(id){const i=$(id);if(!i)return;i.type=i.type==='password'?'text':'password'}
$('#cpShowCurrent')?.addEventListener('click',()=>cpToggle('#cpCurrent'));$('#cpShowNew')?.addEventListener('click',()=>cpToggle('#cpNew'));$('#cpShowConfirm')?.addEventListener('click',()=>cpToggle('#cpConfirm'));
$('#cpNew')?.addEventListener('input',()=>{const v=$('#cpNew').value||'',box=$('#cpStrength');let level='weak',label='Weak — use at least 8 characters';if(v.length>=12&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/[0-9]/.test(v)&&/[^A-Za-z0-9]/.test(v)){level='strong';label='Strong password'}else if(v.length>=8){level='medium';label='Good — add uppercase, number or symbol for a stronger password'}box.textContent=label;box.dataset.level=level});
$('#cpSave')?.addEventListener('click',async()=>{const current=$('#cpCurrent').value,newPassword=$('#cpNew').value,confirm=$('#cpConfirm').value,status=$('#cpStatus');if(!current||!newPassword||!confirm){msg('#cpStatus','Please fill all password fields.','error');return}if(newPassword.length<8){msg('#cpStatus','New password must be at least 8 characters.','error');return}if(newPassword!==confirm){msg('#cpStatus','New password and confirmation do not match.','error');return}if(current===newPassword){msg('#cpStatus','New password must be different from the current password.','error');return}const b=$('#cpSave');b.disabled=true;b.textContent='Updating…';try{const r=await json('/api/auth/password/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:current,newPassword})});msg('#cpStatus',r.message||'Password changed successfully.','success');toast('Password updated successfully');setTimeout(()=>$('#changePasswordModal')?.classList.add('hidden'),700)}catch(e){msg('#cpStatus',e.message||'Unable to change password.','error')}finally{b.disabled=false;b.textContent='Update password'}});
function tnsCurrentDevice(){const key='tnsStudioDeviceId';let id=localStorage.getItem(key);if(!id){id='dev_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(key,id)}const ua=navigator.userAgent||'';const mobile=/Mobile|Android|iPhone|iPad/i.test(ua);let platform=/Android/i.test(ua)?'Android':/iPhone|iPad/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Mac OS X/i.test(ua)?'macOS':'Browser';let browser=/Edg\//i.test(ua)?'Edge':/Chrome\//i.test(ua)?'Chrome':/Firefox\//i.test(ua)?'Firefox':/Safari\//i.test(ua)&&!/Chrome\//i.test(ua)?'Safari':'Web browser';return{id,name:`${platform} • ${browser}`,type:mobile?'Mobile':'Web browser',lastActive:new Date().toISOString()}}

function isSleepModeActive(){const s=profileSettingsData()?.settings||{};if(!s.sleepMode)return false;const toMin=v=>{const [h,m]=String(v||'00:00').split(':').map(Number);return h*60+(m||0)};const now=new Date();const n=now.getHours()*60+now.getMinutes(),a=toMin(s.sleepStart||'22:00'),b=toMin(s.sleepEnd||'07:00');return a===b?true:(a<b?n>=a&&n<b:n>=a||n<b)}
function sleepAutoReplyMessage(){const s=profileSettingsData()?.settings||{};return s.sleepAutoReply&&isSleepModeActive()?'Sleep mode is on right now. I may reply later.':''}
$('#psSleepMode')?.addEventListener('change',()=>{const on=$('#psSleepMode').checked;$('#psSleepStart').disabled=!on;$('#psSleepEnd').disabled=!on;$('#psSleepAutoReply').disabled=!on;});
$('#psSessions')?.addEventListener('click',()=>{const d=profileSettingsData();d.settings=d.settings||{};const current=tnsCurrentDevice();const sessions=Array.isArray(d.settings.sessions)?d.settings.sessions:[];const others=sessions.filter(x=>x&&x.id&&x.id!==current.id);d.settings.sessions=others;saveProfileData(d);$('#profileListModalTitle').textContent='Active devices';$('#profileListModalBody').innerHTML=`<p class="muted">Review devices that have recently used this account. If you do not recognize a device, sign it out.</p><div class="profile-settings-row"><div><b>✓ ${escapeHtml(current.name)}</b><small>Current device • Active now</small></div><span class="status">This device</span></div>`+(others.length?others.map((x,i)=>`<div class="profile-settings-row"><div><b>${escapeHtml(x.name||'Other device')}</b><small>${escapeHtml(x.lastActive?new Date(x.lastActive).toLocaleString():'Previously active')}</small></div><button class="secondary" type="button" data-session-remove="${i}">Sign out</button></div>`).join(''):`<div class="profile-empty compact"><b>No other active devices</b><span>Only this device is currently listed.</span></div>`)+`<div class="setting-actions" style="margin-top:12px"><button id="signOutOtherDevices" class="secondary" type="button" ${others.length?'':'disabled'}>Sign out all other devices</button></div><small class="muted">Device activity is stored locally in this build. Production multi-device sign-out requires server-side session management.</small>`;$('#profileListModal').classList.remove('hidden');$('#profileListModalBody').onclick=e=>{const b=e.target.closest('[data-session-remove]');if(b){const i=Number(b.dataset.sessionRemove);const x=profileSettingsData();x.settings=x.settings||{};const list=Array.isArray(x.settings.sessions)?x.settings.sessions:[];list.splice(i,1);x.settings.sessions=list;saveProfileData(x);$('#psSessions').click();toast('Device signed out');return}if(e.target.id==='signOutOtherDevices'){const x=profileSettingsData();x.settings=x.settings||{};x.settings.sessions=[];saveProfileData(x);$('#psSessions').click();toast('All other devices signed out')}}});$('#psPasskey')?.addEventListener('click',()=>{
  const d=profileSettingsData(); const s=d.settings||{};
  const modalId='tnsPasskeyModal'; let m=document.getElementById(modalId);
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closePasskey">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Passkey</h2><p class="muted">Sign in with your fingerprint, face recognition or device PIN. Passkeys are designed to be stronger than reusable passwords.</p><div class="profile-settings-row"><div><b id="passkeyState">Current status</b><small>Preference can be saved now. Actual passkey registration/login requires the production authentication service and WebAuthn support.</small></div></div><div class="setting-actions"><button id="passkeyEnable" class="primary" type="button">Save passkey preference</button><button id="passkeyDisable" class="secondary" type="button">Turn off</button></div><p id="passkeyStatus" class="status"></p></div></div>`);
    m=document.getElementById(modalId);
    $('#closePasskey').onclick=()=>m.classList.add('hidden');
    $('#passkeyEnable').onclick=()=>{const x=profileSettingsData();x.settings=x.settings||{};x.settings.passkey=true;saveProfileData(x);$('#psPasskey').textContent='Passkey: On';$('#passkeyState').textContent='Enabled preference';$('#passkeyStatus').textContent='Preference saved. Connect WebAuthn/passkey authentication before treating passkey login as active.';};
    $('#passkeyDisable').onclick=()=>{const x=profileSettingsData();x.settings=x.settings||{};x.settings.passkey=false;saveProfileData(x);$('#psPasskey').textContent='Passkey: Off';$('#passkeyState').textContent='Current status • Off';$('#passkeyStatus').textContent='Passkey preference turned off.';};
  }
  $('#passkeyState').textContent=s.passkey?'Enabled preference':'Current status • Off'; $('#passkeyStatus').textContent=''; m.classList.remove('hidden');
$('#psSecurityEmails')?.addEventListener('click',()=>{
  const modalId='tnsSecurityEmailsModal'; let m=document.getElementById(modalId);
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeSecurityEmails">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Security emails</h2><p class="muted">Review authentic security emails sent by TNS Studio. Use this page to check whether a security message really came from your account.</p><div id="securityEmailList" class="profile-settings-list"></div><div class="profile-settings-row"><div><b>Stay safe</b><small>TNS Studio will never ask for your password, verification code or passkey through an unexpected email.</small></div></div><p id="securityEmailsStatus" class="status"></p></div></div>`);
    m=document.getElementById(modalId);
    $('#closeSecurityEmails').onclick=()=>m.classList.add('hidden');
  }
  const list=$('#securityEmailList');
  const items=JSON.parse(localStorage.getItem('tnsStudioSecurityEmails')||'[]');
  if(!items.length){
    list.innerHTML='<div class="profile-settings-row"><div><b>No security emails yet</b><small>When the production notification service records a TNS Studio security email, it can appear here with its date and security category.</small></div></div>';
  }else{
    list.innerHTML=items.slice().reverse().map(e=>`<div class="profile-settings-row"><div><b>${String(e.subject||'TNS Studio security notice').replace(/[<>]/g,'')}</b><small>${String(e.date||'').replace(/[<>]/g,'')} • ${String(e.category||'Security').replace(/[<>]/g,'')}</small></div></div>`).join('');
  }
  $('#securityEmailsStatus').textContent='';
  m.classList.remove('hidden');
});});$('#psTwoFactor')?.addEventListener('click',()=>{
  const d=profileSettingsData(); const s=d.settings||{};
  const modalId='tns2faSetupModal'; let m=document.getElementById(modalId);
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="close2faSetup">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>2-step verification</h2><p class="muted">Add a second check after your password. Choose a method, then finish the setup with the TNS Studio security service.</p><label>Verification method<select id="ps2faMethod"><option value="authenticator">Authenticator app</option><option value="sms">SMS code</option></select></label><div class="profile-settings-row"><div><b id="ps2faState">Current status</b><small>Preference is saved now; login enforcement requires the production authentication service.</small></div></div><div class="setting-actions"><button id="ps2faEnable" class="primary" type="button">Save 2-step preference</button><button id="ps2faDisable" class="secondary" type="button">Turn off</button></div><p id="ps2faStatus" class="status"></p></div></div>`);
    m=document.getElementById(modalId);
    $('#close2faSetup').onclick=()=>m.classList.add('hidden');
    $('#ps2faEnable').onclick=()=>{const x=profileSettingsData();x.settings=x.settings||{};x.settings.twoFactor=true;x.settings.twoFactorMethod=$('#ps2faMethod').value;saveProfileData(x);$('#psTwoFactor').textContent='2-step verification: On';$('#ps2faState').textContent=`Enabled preference • ${x.settings.twoFactorMethod==='sms'?'SMS code':'Authenticator app'}`;$('#ps2faStatus').textContent='Preference saved. Connect the authentication/OTP service before treating login enforcement as active.';};
    $('#ps2faDisable').onclick=()=>{const x=profileSettingsData();x.settings=x.settings||{};x.settings.twoFactor=false;delete x.settings.twoFactorMethod;saveProfileData(x);$('#psTwoFactor').textContent='2-step verification: Off';$('#ps2faState').textContent='Current status • Off';$('#ps2faStatus').textContent='2-step preference turned off.';};
  }
  $('#ps2faMethod').value=s.twoFactorMethod||'authenticator'; $('#ps2faState').textContent=s.twoFactor?`Enabled preference • ${s.twoFactorMethod==='sms'?'SMS code':'Authenticator app'}`:'Current status • Off'; $('#ps2faStatus').textContent=''; m.classList.remove('hidden');
 });$('#psBackupCodes')?.addEventListener('click',()=>{
  const d=profileSettingsData(); const s=d.settings||{};
  const modalId='tnsBackupCodesModal'; let m=document.getElementById(modalId);
  const makeCodes=()=>Array.from({length:10},()=>{const a=new Uint32Array(2);crypto.getRandomValues(a);return String(a[0]).padStart(10,'0').slice(0,5)+'-'+String(a[1]).padStart(10,'0').slice(0,5)});
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeBackupCodes">×</button><p class="eyebrow">ACCOUNT SECURITY</p><h2>Backup codes</h2><p class="muted">Use a backup code if you cannot access your normal 2-step verification method. Each code is intended to be used only once.</p><div class="profile-settings-row"><div><b id="backupCodesState">Backup codes</b><small>Keep these codes private. Do not share them with anyone.</small></div></div><div id="backupCodesList" class="profile-settings-list"></div><div class="setting-actions"><button id="backupCodesCopy" class="secondary" type="button">Copy codes</button><button id="backupCodesDownload" class="secondary" type="button">Download</button><button id="backupCodesRegenerate" class="primary" type="button">Generate new codes</button></div><p id="backupCodesStatus" class="status"></p><small class="muted">Production note: recovery codes should be generated, stored securely (preferably hashed) and invalidated server-side after use.</small></div></div>`);
    m=document.getElementById(modalId);
    $('#closeBackupCodes').onclick=()=>m.classList.add('hidden');
    $('#backupCodesRegenerate').onclick=()=>{
      const x=profileSettingsData(); x.settings=x.settings||{};
      if(x.settings.backupCodes?.length && !confirm('Generate new backup codes? Your old codes will stop working.')) return;
      x.settings.backupCodes=makeCodes(); saveProfileData(x); renderCodes(x.settings.backupCodes); $('#backupCodesStatus').textContent='New backup codes generated. Store them somewhere safe.';
    };
    $('#backupCodesCopy').onclick=async()=>{const x=profileSettingsData();const codes=x.settings?.backupCodes||[];if(!codes.length){$('#backupCodesStatus').textContent='Generate backup codes first.';return;}try{await navigator.clipboard.writeText(codes.join('\n'));$('#backupCodesStatus').textContent='Backup codes copied.';}catch(e){$('#backupCodesStatus').textContent='Copy is not available on this browser. Use Download instead.';}};
    $('#backupCodesDownload').onclick=()=>{const x=profileSettingsData();const codes=x.settings?.backupCodes||[];if(!codes.length){$('#backupCodesStatus').textContent='Generate backup codes first.';return;}const blob=new Blob([`TNS Studio backup codes\\n\\n${codes.join('\\n')}\\n\\nEach code is for one-time recovery. Keep this file private.`],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tns-studio-backup-codes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#backupCodesStatus').textContent='Backup codes downloaded.';};
  }
  function renderCodes(codes){const list=$('#backupCodesList');if(!list)return;list.innerHTML=codes?.length?codes.map((c,i)=>`<div class="profile-settings-row"><div><b>${escapeHtml(c)}</b><small>Recovery code ${i+1}</small></div></div>`).join(''):'<div class="profile-settings-row"><div><b>No backup codes yet</b><small>Turn on 2-step verification first, then generate recovery codes.</small></div></div>';$('#backupCodesState').textContent=codes?.length?`${codes.length} backup codes available`:'No backup codes';}
  const codes=s.backupCodes||[]; renderCodes(codes); $('#backupCodesStatus').textContent=s.twoFactor?'':'2-step verification is currently off. Codes can be prepared, but production recovery requires 2-step verification to be enabled.'; m.classList.remove('hidden');
});$('#psClearCache')?.addEventListener('click',()=>{try{localStorage.removeItem('tnsStudioShortsCache');}catch(e){}toast('Temporary cache cleared')});
const activityLabels={psWatchHistory:['watchHistory','Watch history','No watch history yet.'],psSavedShorts:['savedShorts','Saved Shorts','No saved Shorts yet.'],psCommentsActivity:['comments','My comments','No comments yet.'],psSearchHistory:['searchHistory','Search history','No search history yet.']};Object.entries(activityLabels).forEach(([id,[key,title,empty]])=>$('#'+id)?.addEventListener('click',()=>{const d=profileSettingsData();const list=d.activity[key]||[];$('#profileListModalTitle').textContent=title;$('#profileListModalBody').innerHTML=list.length?list.map(x=>`<div class=\"profile-settings-row\"><div><b>${escapeHtml(x.title||x.text||x.query||'Activity')}</b><small>${escapeHtml(x.date||x.createdAt||'')}</small></div></div>`).join(''):`<div class=\"profile-empty compact\"><b>${empty}</b><span>Your activity will appear here automatically.</span></div>`;$('#profileListModal').classList.remove('hidden')}));
$('#psPrivacyCheckup')?.addEventListener('click',()=>{
  const modalId='tnsPrivacyCheckupModal'; let m=document.getElementById(modalId);
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closePrivacyCheckup">×</button><p class="eyebrow">PRIVACY CHECKUP</p><h2>Review your privacy</h2><p class="muted">A quick step-by-step review of who can see, contact and interact with you. Meta describes Privacy Checkup as a guided way to review important privacy choices.</p><div id="privacyCheckupSteps" class="profile-settings-list"></div><div class="setting-actions"><button id="privacyCheckupBack" class="secondary" type="button">Back</button><button id="privacyCheckupNext" class="primary" type="button">Next</button><button id="privacyCheckupDone" class="primary hidden" type="button">Done</button></div><p id="privacyCheckupStatus" class="status"></p></div></div>`);
    m=document.getElementById(modalId);
    const close=()=>m.classList.add('hidden'); $('#closePrivacyCheckup').onclick=close;
    const steps=[
      {title:'Who can see your profile & Shorts',id:'privacyVisibility',desc:'Review account visibility and new Shorts audience.',open:()=>{$('#psAccountVisibility')?.scrollIntoView({behavior:'smooth',block:'center'});}},
      {title:'Who can contact you',id:'privacyContact',desc:'Review follow requests, message requests, mentions and tags.',open:()=>{$('#psMessageRequests')?.scrollIntoView({behavior:'smooth',block:'center'});}},
      {title:'Comments & unwanted interactions',id:'privacyComments',desc:'Review comment filtering, hidden words and interaction limits.',open:()=>{$('#psCommentFilter')?.scrollIntoView({behavior:'smooth',block:'center'});}},
      {title:'Location & personalized content',id:'privacyContent',desc:'Review profile location visibility and personalized Shorts.',open:()=>{$('#psLocationVisibility')?.scrollIntoView({behavior:'smooth',block:'center'});}}
    ];
    let step=0;
    const render=()=>{const x=steps[step];$('#privacyCheckupSteps').innerHTML=`<div class="profile-settings-row"><div><b>${step+1}. ${escapeHtml(x.title)}</b><small>${escapeHtml(x.desc)}</small></div><span class="status">${step+1}/${steps.length}</span></div><div class="profile-empty compact"><span>Review this setting in Profile Settings, then continue.</span></div>`;$('#privacyCheckupBack').disabled=step===0;$('#privacyCheckupNext').classList.toggle('hidden',step===steps.length-1);$('#privacyCheckupDone').classList.toggle('hidden',step!==steps.length-1);$('#privacyCheckupStatus').textContent='';};
    $('#privacyCheckupBack').onclick=()=>{if(step>0){step--;render();}};
    $('#privacyCheckupNext').onclick=()=>{steps[step].open();step++;render();};
    $('#privacyCheckupDone').onclick=()=>{steps[step].open();$('#privacyCheckupStatus').textContent='Privacy checkup completed. Review the highlighted settings and save any changes.';};
    render();
  }
  m.classList.remove('hidden');
});
$('#psDownloadData')?.addEventListener('click',()=>{
  const modalId='tnsDataExportModal'; let m=document.getElementById(modalId);
  if(!m){
    document.body.insertAdjacentHTML('beforeend',`<div id="${modalId}" class="modal"><div class="modal-card glass"><button class="modal-close" id="closeDataExport">×</button><p class="eyebrow">YOUR INFORMATION</p><h2>Download account data</h2><p class="muted">Choose what you want to export. Your file is created on this device from the information currently stored in TNS Studio.</p><div class="profile-settings-list"><label class="setting-check"><input id="dataIncludeProfile" type="checkbox" checked> Profile & account information</label><label class="setting-check"><input id="dataIncludeSettings" type="checkbox" checked> Privacy & security settings</label><label class="setting-check"><input id="dataIncludeShorts" type="checkbox" checked> Your uploaded Shorts</label><label class="setting-check"><input id="dataIncludeActivity" type="checkbox" checked> Activity history</label></div><label>Time range<select id="dataRange"><option value="all">All available data</option><option value="90">Last 90 days</option><option value="30">Last 30 days</option></select></label><div class="setting-actions"><button id="dataExportJson" class="primary" type="button">Download JSON</button><button id="dataExportCancel" class="secondary" type="button">Cancel</button></div><p id="dataExportStatus" class="status"></p><small class="muted">For production, account exports should be generated server-side and delivered through an authenticated download link.</small></div></div>`);
    m=document.getElementById(modalId);
    const close=()=>m.classList.add('hidden'); $('#closeDataExport').onclick=close; $('#dataExportCancel').onclick=close;
    $('#dataExportJson').onclick=()=>{
      const d=profileSettingsData(); const out={exportedAt:new Date().toISOString(),format:'tns-studio-account-export',version:1};
      const range=$('#dataRange').value; const cutoff=range==='all'?0:Date.now()-Number(range)*86400000;
      const recent=(arr)=>Array.isArray(arr)?arr.filter(x=>{const t=Date.parse(x?.createdAt||x?.date||'');return !cutoff||!t||t>=cutoff}):[];
      if($('#dataIncludeProfile').checked) out.profile={name:d.name,handle:d.handle,bio:d.bio,location:d.location,website:d.website,dob:d.dob,followers:d.followers,following:d.following,posts:d.posts};
      if($('#dataIncludeSettings').checked) out.settings=d.settings;
      if($('#dataIncludeShorts').checked) out.shorts=recent(d.shortPosts||[]);
      if($('#dataIncludeActivity').checked) out.activity={watchHistory:recent(d.activity?.watchHistory||[]),savedShorts:recent(d.activity?.savedShorts||[]),comments:recent(d.activity?.comments||[]),searchHistory:recent(d.activity?.searchHistory||[])};
      const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`tns-studio-account-data-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); $('#dataExportStatus').textContent='Account data export downloaded.';
    };
  }
  $('#dataExportStatus').textContent=''; m.classList.remove('hidden');
});$('#psDeactivate')?.addEventListener('click',()=>{const d=profileSettingsData();if(!confirm('Deactivate this account? You can reactivate later by signing in again.'))return;d.settings.deactivated=true;saveProfileData(d);toast('Account marked for deactivation. Server confirmation is required for production.')});$('#psDelete')?.addEventListener('click',()=>{if(!confirm('Delete this account? This cannot be undone.'))return;const d=profileSettingsData();d.settings.deleteRequested=true;saveProfileData(d);toast('Deletion request recorded. Server confirmation is required for production.')});


function applyProfilePreset(name){
  const presets={
    creator:{sensitiveContent:'limit',accountVisibility:'public',followingVisibility:'public',followersVisibility:'public',likedVisibility:'private',shortAudience:'public',comments:'on',likes:'on',sharing:'on',downloads:'off',remix:'on',commentFilter:'standard',mentions:'everyone',tags:'everyone',hiddenWords:true,followRequests:'auto',messageRequests:'followers',limits:'recent',notifyFollowers:true,notifyLikes:true,notifyMentions:true,notifyMessages:true,notifyCreator:true,analytics:true,saveOriginals:true,wifiUpload:false,loginAlerts:true},
    private:{sensitiveContent:'strict',accountVisibility:'private',followingVisibility:'private',followersVisibility:'followers',likedVisibility:'private',shortAudience:'followers',comments:'on',likes:'on',sharing:'on',downloads:'off',remix:'off',commentFilter:'strict',mentions:'followers',tags:'followers',hiddenWords:true,followRequests:'approve',messageRequests:'followers',notifyFollowers:true,notifyLikes:true,notifyMentions:true,notifyMessages:true,notifyCreator:true,analytics:true,saveOriginals:true,wifiUpload:false,loginAlerts:true},
    open:{sensitiveContent:'limit',accountVisibility:'public',followingVisibility:'public',followersVisibility:'public',likedVisibility:'public',shortAudience:'public',comments:'on',likes:'on',sharing:'on',downloads:'on',remix:'on',commentFilter:'standard',mentions:'everyone',tags:'everyone',hiddenWords:true,followRequests:'auto',messageRequests:'everyone',readReceipts:true,activityStatus:true,sleepMode:false,sleepStart:'22:00',sleepEnd:'07:00',sleepAutoReply:true,limits:'off',notifyFollowers:true,notifyLikes:true,notifyMentions:true,notifyMessages:true,notifyCreator:true,analytics:true,saveOriginals:true,wifiUpload:false,loginAlerts:true}
  };
  const preset=presets[name]; if(!preset)return;
  Object.entries(preset).forEach(([k,v])=>{const el=$('#ps'+k.charAt(0).toUpperCase()+k.slice(1));if(el){if(el.type==='checkbox')el.checked=!!v;else el.value=v}});
  const d=getProfileData(); d.settings={...d.settings,...preset}; saveProfileData(d); $('#profileSettingsStatus').textContent=name==='private'?'Private setup applied.':'Recommended setup applied.'; toast(name==='private'?'Private profile settings applied':'Profile settings applied');
}
$('#psReportHistory')?.addEventListener('click',()=>openSimpleSettingsList('reports'));$('#psHiddenWordsManage')?.addEventListener('click',()=>{const d=profileSettingsData();const words=Array.isArray(d.settings.hiddenWordList)?d.settings.hiddenWordList:[];const value=prompt('Hidden words (comma separated)',words.join(', '));if(value===null)return;d.settings.hiddenWordList=value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).slice(0,100);saveProfileData(d);toast('Hidden words updated')});$('#psPresetRecommended')?.addEventListener('click',()=>applyProfilePreset('creator'));
$('#psPresetCreator')?.addEventListener('click',()=>applyProfilePreset('creator'));
$('#psPresetPrivate')?.addEventListener('click',()=>applyProfilePreset('private'));
$('#psPresetOpen')?.addEventListener('click',()=>applyProfilePreset('open'));
$('#profileSettingsBtn')?.addEventListener('click',openProfileSettings);

$$('[data-open]').forEach(b=>b.addEventListener('click',()=>{if(b.classList.contains('profile-back-icon')){b.classList.add('is-pressed');setTimeout(()=>b.classList.remove('is-pressed'),180)}showPanel(b.dataset.open)}));
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
const topbarMenu=$('#topbarMenu');
$('#topbarMenu')?.addEventListener('click',(e)=>{
  const item=e.target.closest('[data-menu-open]');
  if(!item)return;
  topbarMenu?.classList.add('hidden');
  topbarMenu?.setAttribute('aria-hidden','true');
  showPanel(item.dataset.menuOpen);
});
$('.topbar-menu-btn')?.addEventListener('click',(e)=>{
  e.stopPropagation();
  const open=topbarMenu?.classList.contains('hidden');
  topbarMenu?.classList.toggle('hidden',!open);
  topbarMenu?.setAttribute('aria-hidden',String(!open));
});
document.addEventListener('click',(e)=>{
  if(topbarMenu && !topbarMenu.classList.contains('hidden') && !e.target.closest('.topbar-menu-btn') && !e.target.closest('#topbarMenu')){
    topbarMenu.classList.add('hidden');
    topbarMenu.setAttribute('aria-hidden','true');
  }
});

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
async function openChat(u){if(!u)return;try{const sec=await json('/api/contact/settings?with='+encodeURIComponent(u.id));if(sec.settings?.locked){const password=prompt('This chat is locked. Enter your TNS Studio password to open it.');if(password===null)return;await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:u.id,action:'unlockCheck',password})})}}catch(err){if(err.message==='Incorrect TNS Studio password.')return toast(err.message);if(err.message&&!err.message.includes('Invalid contact security action'))return toast(err.message)}currentContact=u;$('#chatEmpty').classList.add('hidden');$('#chatView').classList.remove('hidden');$('#chatName').textContent=u.email||u.mobile;$('#chatPresence').textContent=`TNS Studio user • ${isSleepModeActive()?'Sleep mode':' '+(activityStatusEnabled()?'Active now':'Activity status hidden')} • ${readReceiptsEnabled()?'Read receipts on':'Read receipts off'}`;if(isSleepModeActive()&&sleepAutoReplyMessage())toast('Sleep mode is active — notifications are muted in this UI and DMs can show an auto-reply.');ensureChatSecurityButtons();await loadMessages();loadContacts()}
function ensureChatSecurityButtons(){const head=document.querySelector('.chat-head .chat-actions');if(!head||head.querySelector('#lockChatBtn'))return;head.insertAdjacentHTML('afterbegin','<button id="lockChatBtn" title="Lock this chat">🔒</button><button id="hideChatBtn" title="Hide this chat">🙈</button>');$('#lockChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to lock/unlock this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleLock',password})});toast(d.locked?'Chat locked.':'Chat unlocked.')}catch(err){toast(err.message)}});$('#hideChatBtn').addEventListener('click',async()=>{if(!currentContact)return;const password=prompt('Enter your TNS Studio password to hide/show this chat.');if(password===null)return;try{const d=await json('/api/contact/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contactId:currentContact.id,action:'toggleHide',password})});toast(d.hidden?'Chat hidden.':'Chat visible.');loadContacts()}catch(err){toast(err.message)}})}
async function loadMessages(){if(!currentContact)return;try{const d=await json('/api/contact/chats?with='+encodeURIComponent(currentContact.id));$('#messages').innerHTML=(d.messages||[]).map(m=>{const a=m.attachment;let media='';if(a?.url&&String(m.type).startsWith('media')) media=`<img class="chat-attachment" src="${escapeHtml(a.url)}" alt="Shared media">`;else if(a?.url&&m.type==='voice') media=`<audio class="chat-audio" controls src="${escapeHtml(a.url)}"></audio>`;else if(a?.url&&m.type==='file') media=`<a class="chat-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name||'Shared file')}</a>`;return `<div class="message ${m.from===currentUser()?.id?'mine':''}">${escapeHtml(m.text)}${media}<small>${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>`}).join('');const box=$('#messages');box.scrollTop=box.scrollHeight}catch(err){toast(err.message)}}
function getMessageRequestPolicy(){return getProfileData()?.settings?.messageRequests||'everyone'}
function readReceiptsEnabled(){return getProfileData()?.settings?.readReceipts!==false}
function activityStatusEnabled(){const s=getProfileData()?.settings||{};return s.activityStatus!==false&&!isSleepModeActive()}
function getInteractionLimits(){return getProfileData()?.settings?.limits||'off'}
function isLimitedContact(contact){const limit=getInteractionLimits();if(limit==='off'||!contact)return false;if(contact.isCloseFriend)return false;if(limit==='everyone')return true;if(limit==='nonfollowers')return !(contact.isFollower||contact.followsMe||contact.isFollowing);if(limit==='recent')return !(contact.isFollower||contact.followsMe||contact.isFollowing) || !!contact.recentFollower;return false}
function contactCanStartMessageRequest(contact){
  const policy=getMessageRequestPolicy();
  if(!contact)return false;
  if(policy==='noone')return !!contact.existingChat;
  if(policy==='followers')return !!(contact.isFollower||contact.followsMe||contact.isFollowing||contact.existingChat);
  return true;
}
function enforceMessageRequestPolicy(contact){
  if(!contact)return true;
  if(isLimitedContact(contact) && !contact.existingChat){toast('This account is temporarily limited by your Profile Settings.');return false}
  const policy=getMessageRequestPolicy();
  if(policy==='noone' && !contact.existingChat){toast('New message requests are turned off in Profile Settings.');return false}
  if(policy==='followers' && !contact.isFollower && !contact.followsMe && !contact.isFollowing && !contact.existingChat){toast('Message requests are limited to your allowed contacts.');return false}
  return true;
}
$('#messageForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=$('#messageInput').value.trim();if(!text||(!currentContact&&!currentGroup))return;if(currentContact&&!enforceMessageRequestPolicy(currentContact))return;try{if(currentGroup)await json('/api/contact/group-messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId:currentGroup.id,text})});else await json('/api/contact/chats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:currentContact.id,text})});$('#messageInput').value='';if(currentGroup)await openGroup(currentGroup);else await loadMessages()}catch(err){toast(err.message)}});
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
  if(!enforceMessageRequestPolicy(currentContact))return;
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
  if(!enforceMessageRequestPolicy(currentContact))return;
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

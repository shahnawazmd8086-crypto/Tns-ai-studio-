'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function safeId(value) { const id=String(value || ''); return /^[a-zA-Z0-9_-]{1,80}$/.test(id) ? id : ''; }
function directory(root, userId) { const ownerKey = crypto.createHash('sha256').update(String(userId || '')).digest('hex'); const dir = path.join(path.resolve(root), ownerKey); fs.mkdirSync(dir, {recursive:true, mode:0o700}); try { fs.chmodSync(dir,0o700); } catch {} return dir; }
function filePath(root, userId, id) { const safe = safeId(id); if (!safe) throw new Error('Conversation ID is invalid.'); return path.join(directory(root,userId), `${safe}.json`); }
function cleanMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('Messages must be a list.');
  return messages.slice(-100).map(m => {
    if (!m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string') return null;
    const content = m.content.trim().slice(0,8000);
    return content ? {role:m.role, content, createdAt: typeof m.createdAt === 'string' ? m.createdAt.slice(0,40) : new Date().toISOString()} : null;
  }).filter(Boolean);
}
function save(root,userId,input={}) {
  if (!userId) throw new Error('Authentication required.');
  if (input.id !== undefined && input.id !== null && input.id !== '' && !safeId(input.id)) throw new Error('Conversation ID is invalid.');
  const id = safeId(input.id) || crypto.randomUUID();
  const messages = cleanMessages(input.messages || []);
  const previous = load(root,userId,id);
  const title = String(input.title || messages.find(m=>m.role==='user')?.content || 'Nayi chat').replace(/\s+/g,' ').slice(0,100) || 'Nayi chat';
  const record = {id,title,messages,createdAt:previous?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
  const target=filePath(root,userId,id);
  const temp=`${target}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(record,null,2), {encoding:'utf8',mode:0o600,flag:'wx'}); try { fs.chmodSync(temp,0o600); } catch {} fs.renameSync(temp,target); } finally { try { fs.unlinkSync(temp); } catch {} }
  prune(root,userId,id);
  return record;
}
function load(root,userId,id) {
  try { const p=filePath(root,userId,id); if(!fs.existsSync(p)) return null; const data=JSON.parse(fs.readFileSync(p,'utf8')); return data && data.id===safeId(id) ? data : null; } catch { return null; }
}
function records(root,userId) {
  const dir=directory(root,userId);
  return fs.readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>{try{const x=JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));return x && typeof x.id==='string' && safeId(x.id)===x.id ? x : null;}catch{return null;}}).filter(Boolean).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function prune(root,userId,keepId) {
  const all=records(root,userId);
  const keep=new Set(all.slice(0,100).map(x=>x.id)); if(keepId) keep.add(keepId);
  for(const item of all) if(!keep.has(item.id)) { try { fs.unlinkSync(filePath(root,userId,item.id)); } catch {} }
}
function list(root,userId) {
  return records(root,userId).slice(0,100).map(({id,title,createdAt,updatedAt,messages})=>({id,title,createdAt,updatedAt,messageCount:Array.isArray(messages)?messages.length:0}));
}
function remove(root,userId,id) { const p=filePath(root,userId,id); const record=load(root,userId,id); if(!record)return false; fs.unlinkSync(p); return true; }
module.exports={save,load,list,remove};

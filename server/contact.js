const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SecureStore = require('./utils/SecureStore');

const DATA_DIR = path.join(__dirname, 'Data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const STATUS_FILE = path.join(DATA_DIR, 'statuses.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'contact-settings.json');

function ensure() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONTACTS_FILE)) fs.writeFileSync(CONTACTS_FILE, SecureStore.encode({}));
  if (!fs.existsSync(STATUS_FILE)) fs.writeFileSync(STATUS_FILE, SecureStore.encode({}));
  if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, SecureStore.encode({}));
}
function read(file) { ensure(); try { return SecureStore.decode(fs.readFileSync(file, 'utf8')) || {}; } catch { return {}; } }
function write(file, value) { ensure(); const tmp = `${file}.tmp`; fs.writeFileSync(tmp, SecureStore.encode(value)); fs.renameSync(tmp, file); }
function key(a,b){ return [String(a),String(b)].sort().join('__'); }
function listMessages(a,b){ const db=read(CONTACTS_FILE); return Array.isArray(db[key(a,b)]) ? db[key(a,b)] : []; }
function addMessage(from,to,text){
  const body=String(text||'').trim(); if(!body) throw new Error('Message cannot be empty.');
  if(body.length>4000) throw new Error('Message is too long.');
  const db=read(CONTACTS_FILE); const k=key(from,to); const messages=Array.isArray(db[k])?db[k]:[];
  const message={id:crypto.randomUUID(),from:String(from),to:String(to),text:body,createdAt:new Date().toISOString()};
  messages.push(message); db[k]=messages.slice(-500); write(CONTACTS_FILE,db); return message;
}
function setStatus(userId,text){ const db=read(STATUS_FILE); db[String(userId)]={text:String(text||'').trim().slice(0,280),updatedAt:new Date().toISOString()}; write(STATUS_FILE,db); return db[String(userId)]; }
function getStatus(userId){ return read(STATUS_FILE)[String(userId)] || null; }
function allStatuses(){ return read(STATUS_FILE); }
function getContactSettings(userId, contactId) {
  const db = read(SETTINGS_FILE);
  return db[`${userId}__${contactId}`] || { locked: false, hidden: false };
}
function updateContactSettings(userId, contactId, action) {
  const db = read(SETTINGS_FILE); const k = `${userId}__${contactId}`;
  const current = db[k] || { locked: false, hidden: false };
  if (action === 'toggleLock') current.locked = !current.locked;
  if (action === 'toggleHide') current.hidden = !current.hidden;
  db[k] = current; write(SETTINGS_FILE, db); return current;
}

module.exports={listMessages,addMessage,setStatus,getStatus,allStatuses,getContactSettings,updateContactSettings};

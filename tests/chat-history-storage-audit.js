'use strict';
const assert=require('assert');const fs=require('fs');const os=require('os');const path=require('path');const Store=require('../server/storage/ChatHistory');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tns-chat-history-'));
try {
 const saved=Store.save(root,'user-a',{messages:[{role:'user',content:'Namaste TNS'},{role:'assistant',content:'Namaste!'}]});
 assert(saved.id && saved.messages.length===2,'conversation saved');
 assert.strictEqual(Store.load(root,'user-a',saved.id).messages[0].content,'Namaste TNS','conversation loads');
 assert.strictEqual(Store.load(root,'user-b',saved.id),null,'another user cannot read it');
 assert.strictEqual(Store.list(root,'user-a').length,1,'conversation listed');
 const updated=Store.save(root,'user-a',{id:saved.id,messages:[{role:'user',content:'Updated'}]});
 assert.strictEqual(updated.id,saved.id,'update retains conversation id');
 assert.strictEqual(Store.load(root,'user-a',saved.id).messages.length,1,'update overwrites message list');
 assert.strictEqual(Store.remove(root,'user-a',saved.id),true,'delete succeeds');
 assert.strictEqual(Store.load(root,'user-a',saved.id),null,'deleted conversation is gone');
 assert.throws(()=>Store.save(root,'user-a',{id:'../../escape',messages:[]}),/Conversation ID is invalid/,'rejects unsafe conversation IDs');
 const capped=[]; for(let i=0;i<105;i++) capped.push(Store.save(root,'cap-user',{messages:[{role:'user',content:`chat ${i}`}]}));
 assert.strictEqual(Store.list(root,'cap-user').length,100,'keeps at most 100 conversations');
 const capDir=path.join(root,require('crypto').createHash('sha256').update('cap-user').digest('hex'));
 assert.strictEqual(fs.readdirSync(capDir).filter(n=>n.endsWith('.json')).length,100,'prunes older conversation files instead of hiding them');
 const mode=fs.statSync(capDir).mode & 0o777; assert.strictEqual(mode,0o700,'user directory permissions are restrictive where supported');
 console.log('CHAT_HISTORY_STORAGE_AUDIT_OK');
} finally { fs.rmSync(root,{recursive:true,force:true}); }

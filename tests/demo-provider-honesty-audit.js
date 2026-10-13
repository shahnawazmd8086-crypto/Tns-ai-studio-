const fs=require('fs');const assert=require('assert');
const server=fs.readFileSync('server/server.js','utf8');
const app=fs.readFileSync('public/app.js','utf8');
assert(server.includes("demo: providerName === 'mock'"),'API responses must explicitly identify mock/demo provider');
assert(app.includes("Demo jawab: abhi real AI service connected nahi hai."),'UI must clearly label mock replies as demo');
assert(app.includes("result.demo || result.provider==='mock'"),'UI must inspect provider metadata');
console.log('DEMO_PROVIDER_HONESTY_AUDIT_OK');

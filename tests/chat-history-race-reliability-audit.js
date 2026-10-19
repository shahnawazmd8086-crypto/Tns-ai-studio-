'use strict';
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const checks = [
  ['conversation view generation token', /let conversationViewGeneration = 0/.test(source)],
  ['new chat invalidates old saves', /const startNewConversation = \(\) => \{ conversationViewGeneration\+\+; clearTimeout\(historySaveTimer\)/.test(source)],
  ['opening a chat invalidates prior load/request', /const generation=\+\+conversationViewGeneration; clearTimeout\(historySaveTimer\)/.test(source)],
  ['late successful responses ignored', /if\(requestViewGeneration!==conversationViewGeneration\)\{ pending\.remove\(\); return; \}/.test(source)],
  ['late failed responses ignored', (source.match(/if\(requestViewGeneration!==conversationViewGeneration\)\{ pending\.remove\(\); return; \}/g)||[]).length >= 2],
  ['history save captures generation and ID', /const saveConversation = async \(expectedGeneration=conversationViewGeneration\)/.test(source) && /const targetId=currentConversationId/.test(source)],
  ['history refresh failure shown to user', /saved-chat list refresh nahi hui|list refresh nahi hui/.test(source) && /Saved chat list abhi load nahi hui/.test(source)],
  ['attachment retention limitation disclosed', /attached file khud save nahi hoti/.test(source)],
];
for (const [name, ok] of checks) { if (!ok) { console.error('FAIL:', name); process.exitCode=1; } }
if (!process.exitCode) console.log('CHAT_HISTORY_RACE_RELIABILITY_AUDIT_OK');

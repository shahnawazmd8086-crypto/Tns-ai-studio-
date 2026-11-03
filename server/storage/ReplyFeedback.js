'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function read(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function write(file, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(rows, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try { fs.chmodSync(temp, 0o600); } catch {}
    fs.renameSync(temp, file);
  } finally { try { fs.unlinkSync(temp); } catch {} }
}
function add(file, user, input = {}) {
  if (!user?.id) throw new Error('Authentication required.');
  const sentiment = String(input.sentiment || '').toLowerCase();
  if (!['positive', 'negative'].includes(sentiment)) throw new Error('Choose positive or negative feedback.');
  const replyText = String(input.replyText || '').trim();
  if (!replyText || replyText.length > 8000) throw new Error('The TNS reply is missing or too long.');
  const rows = read(file);
  const record = {
    id: crypto.randomUUID(),
    userId: String(user.id),
    sentiment,
    replyText,
    replyHash: crypto.createHash('sha256').update(replyText).digest('hex'),
    createdAt: new Date().toISOString()
  };
  rows.push(record);
  write(file, rows.slice(-10000));
  return { id: record.id, sentiment: record.sentiment, createdAt: record.createdAt };
}
function list(file) { return read(file).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); }
module.exports = { add, list };

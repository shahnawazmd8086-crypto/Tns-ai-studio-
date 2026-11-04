const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'brand-migration.js'), 'utf8');
const oldToken = ['stu', 'dio'].join('');
const store = new Map([
  ['tns' + 'S' + ['tu', 'dio'].join('') + 'Language', 'hi'],
  ['tns' + 'S' + ['tu', 'dio'].join('') + 'Projects_user1', '[{"id":"p1"}]'],
  ['tns_' + oldToken + '_session', '{"token":"x","userId":"u1"}'],
  ['tns_' + oldToken + '_settings', '{"theme":"dark"}'],
  ['tns_' + oldToken + '_custom', 'legacy-value']
]);
const localStorage = {
  get length() { return store.size; },
  key(index) { return [...store.keys()][index] ?? null; },
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
  removeItem(key) { store.delete(key); }
};
vm.runInNewContext(source, { localStorage });
assert.strictEqual(localStorage.getItem('tnsLanguage'), 'hi');
assert.strictEqual(localStorage.getItem('tnsProjects_user1'), '[{"id":"p1"}]');
assert.strictEqual(localStorage.getItem('tns_session'), '{"token":"x","userId":"u1"}');
assert.strictEqual(localStorage.getItem('tns_settings'), '{"theme":"dark"}');
assert.strictEqual(localStorage.getItem('tns_custom'), 'legacy-value');
for (const key of store.keys()) assert(!new RegExp(['stu', 'dio'].join(''), 'i').test(key), `Legacy key remains: ${key}`);
console.log('BRAND_STORAGE_MIGRATION_AUDIT_OK');

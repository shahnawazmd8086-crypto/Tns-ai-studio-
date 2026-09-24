const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'Data');
const INDEX_FILE = path.join(DATA_DIR, 'media-index.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, '{}', 'utf8');
}

function readIndex() {
  ensureStore();
  try {
    const value = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeIndex(index) {
  ensureStore();
  const tmp = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8');
  fs.renameSync(tmp, INDEX_FILE);
}

function register(fileName, ownerId, metadata = {}) {
  if (!fileName || !ownerId) throw new Error('Media file and owner are required.');
  const index = readIndex();
  index[String(fileName)] = {
    ownerId: String(ownerId),
    originalName: String(metadata.originalName || fileName).slice(0, 180),
    createdAt: metadata.createdAt || new Date().toISOString()
  };
  writeIndex(index);
  return index[String(fileName)];
}

function get(fileName) {
  if (!fileName) return null;
  return readIndex()[String(fileName)] || null;
}

function canAccess(fileName, ownerId) {
  const item = get(fileName);
  return Boolean(item && ownerId && item.ownerId === String(ownerId));
}

function remove(fileName) {
  const index = readIndex();
  if (!Object.prototype.hasOwnProperty.call(index, String(fileName))) return false;
  delete index[String(fileName)];
  writeIndex(index);
  return true;
}

module.exports = { INDEX_FILE, register, get, canAccess, remove };

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detectReplyLanguage, languageInstruction, normalizeLanguage } = require('../server/utils/language');
const root = path.join(__dirname, '..');

// Script-based detection checks, one representative sample for each supported script.
const scriptCases = [
  ['नमस्ते, आप कैसे हैं?', 'Hindi'],
  ['வணக்கம், எப்படி இருக்கிறீர்கள்?', 'Tamil'],
  ['ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ?', 'Kannada'],
  ['నమస్కారం, మీరు ఎలా ఉన్నారు?', 'Telugu'],
  ['নমস্কার, আপনি কেমন আছেন?', 'Bengali'],
  ['નમસ્તે, તમે કેમ છો?', 'Gujarati'],
  ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', 'Punjabi'],
  ['നമസ്കാരം, സുഖമാണോ?', 'Malayalam'],
  ['ନମସ୍କାର, ଆପଣ କେମିତି ଅଛନ୍ତି?', 'Odia'],
  ['مرحبا، كيف حالك؟', 'Arabic'],
  ['Привет, как дела?', 'Russian'],
  ['你好，你好吗？', 'Chinese'],
  ['こんにちは、お元気ですか？', 'Japanese'],
  ['안녕하세요, 잘 지내세요?', 'Korean'],
  ['สวัสดี คุณเป็นอย่างไรบ้าง', 'Thai'],
  ['Γεια σου, τι κάνεις;', 'Greek'],
  ['שלום, מה שלומך?', 'Hebrew']
];
for (const [sample, expected] of scriptCases) {
  assert.equal(detectReplyLanguage(sample), expected, `script detection failed for ${expected}`);
}

// Cyrillic languages share a script; distinctive words should override the Russian default.
assert.equal(detectReplyLanguage('Привіт, дякую за допомогу'), 'Ukrainian');
assert.equal(detectReplyLanguage('Здравей, благодаря'), 'Bulgarian');
assert.equal(detectReplyLanguage('Здраво, хвала'), 'Serbian');
assert.equal(detectReplyLanguage('Привет, спасибо'), 'Russian');
// Persian clues must be checked before characters shared with Urdu.
assert.equal(detectReplyLanguage('السلام عليكم ورحمة الله وبركاته'), 'Arabic');
assert.equal(detectReplyLanguage('وعليكم السلام'), 'Arabic');
assert.equal(detectReplyLanguage('السلام علیکم'), 'Urdu');
assert.equal(detectReplyLanguage('آپ کیسے ہیں؟'), 'Urdu');
assert.equal(detectReplyLanguage('سلام، چطور هستید؟'), 'Persian');
assert.equal(detectReplyLanguage('سلام، ممنون'), 'Persian');
assert.equal(detectReplyLanguage('لطفاً کمک کنید'), 'Persian');
assert.equal(detectReplyLanguage('یہ اردو ہے'), 'Urdu');
assert.equal(detectReplyLanguage('Answer in Ukrainian please', 'English'), 'Ukrainian');

// Every supported locale alias family should normalize consistently.
const localeCases = [
  ['en-IN', 'English'], ['en-US', 'English'], ['hi-IN', 'Hindi'],
  ['ta-IN', 'Tamil'], ['kn-IN', 'Kannada'], ['te-IN', 'Telugu'],
  ['bn-IN', 'Bengali'], ['gu-IN', 'Gujarati'], ['pa-IN', 'Punjabi'],
  ['ml-IN', 'Malayalam'], ['or-IN', 'Odia'], ['mr-IN', 'Marathi'],
  ['ur-IN', 'Urdu'], ['ar-SA', 'Arabic'], ['ru-RU', 'Russian'],
  ['zh-TW', 'Chinese'], ['ja-JP', 'Japanese'], ['ko-KR', 'Korean'],
  ['th-TH', 'Thai'], ['el-GR', 'Greek'], ['he-IL', 'Hebrew']
];
for (const [locale, expected] of localeCases) {
  assert.equal(normalizeLanguage(locale), expected, `locale normalization failed for ${locale}`);
}

// Shared scripts must not automatically override a clear app-language fallback.
assert.equal(detectReplyLanguage('माझं नाव अमोल आहे.', 'mr-IN'), 'Marathi');
assert.equal(detectReplyLanguage('नमस्ते, आप कैसे हैं?', 'hi-IN'), 'Hindi');
assert.equal(detectReplyLanguage('مرحبا، كيف حالك؟', 'ur-IN'), 'Urdu');
assert.equal(detectReplyLanguage('こんにちは', 'ja-JP'), 'Japanese');
assert.equal(detectReplyLanguage('你好', 'zh-CN'), 'Chinese');
assert.equal(detectReplyLanguage('Dost kya haal hai?'), 'Hindi');
assert.equal(detectReplyLanguage('Kya karna hai abhi?'), 'Hindi');
assert.equal(detectReplyLanguage('Bhai mujhe batao'), 'Hindi');
// Explicit reply-language requests override the language used to phrase the request.
assert.equal(detectReplyLanguage('Dost Hindi mein jawab do', 'English'), 'Hindi');
assert.equal(detectReplyLanguage('Please answer in English', 'Hindi'), 'English');
assert.equal(detectReplyLanguage('Mujhe Urdu mein batao', 'English'), 'Urdu');
assert.equal(detectReplyLanguage('Répondez en français, s’il vous plaît', 'English'), 'French');
assert.equal(detectReplyLanguage('¿Cómo estás? Necesito ayuda', 'English'), 'Spanish');
assert.equal(detectReplyLanguage('Hallo, ich brauche Hilfe', 'English'), 'German');
assert.equal(detectReplyLanguage('Olá, preciso de ajuda', 'English'), 'Portuguese');
assert.equal(detectReplyLanguage('Merhaba, yardıma ihtiyacım var', 'English'), 'Turkish');
assert.equal(detectReplyLanguage('Xin chào, giúp tôi', 'English'), 'Vietnamese');
assert.equal(detectReplyLanguage('Terima kasih, tolong bantu saya', 'English'), 'Indonesian');
assert.equal(detectReplyLanguage('???', 'es-MX'), 'Spanish');
// Very short/common fragments should not trigger Hindi detection by themselves.
assert.equal(detectReplyLanguage('HO', 'en-IN'), 'English');
assert.equal(detectReplyLanguage('AP', 'en-IN'), 'English');
assert.equal(detectReplyLanguage('Hello, how are you?', 'en-IN'), 'English');
// Romanized text without a confident marker follows the chosen app language.
assert.equal(detectReplyLanguage('Good morning friend', 'mr-IN'), 'English');
assert.equal(detectReplyLanguage('', 'hi'), 'Hindi');
assert.equal(detectReplyLanguage('???', 'ta-IN'), 'Tamil');
assert.equal(detectReplyLanguage('Please help', 'kn'), 'English');
assert.equal(detectReplyLanguage('???', 'te-IN'), 'Telugu');
assert.match(languageInstruction('Tamil'), /Reply in Tamil/);
assert.match(languageInstruction('Tamil'), /unless the user explicitly requests another language/);

const server = fs.readFileSync(path.join(root, 'server/server.js'), 'utf8');
const httpProvider = fs.readFileSync(path.join(root, 'server/providers/http.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
assert.match(server, /detectReplyLanguage\(message/);
assert.match(server, /languageInstruction: languageInstruction\(replyLanguage\)/);
assert.match(server, /replyLanguage: result\?\.replyLanguage \|\| replyLanguage/);
assert.match(httpProvider, /async chat\(input = \{\}\)[\s\S]*callJson\(this\.aiUrl, this\.apiKey, \{ type: 'chat', \.\.\.input \}/, 'HTTP provider must forward replyLanguage and languageInstruction');
assert.match(app, /appLanguage:localStorage\.getItem\('tnsStudioLanguage'\)\|\|'en'/);
assert.match(app, /result\.replyLanguage\|\|localStorage\.getItem\('tnsStudioLanguage'\)/);
for (const locale of ['ta-IN','kn-IN','te-IN','bn-IN','gu-IN','pa-IN','ml-IN','mr-IN','ur-IN']) assert.ok(html.includes(`value="${locale}"`), `missing voice locale ${locale}`);
console.log('LANGUAGE_REPLY_AUDIT_OK');

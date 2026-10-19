'use strict';

// Lightweight, dependency-free best-effort language detection. A real multilingual
// AI provider should still follow the returned replyLanguage/instruction.
const SCRIPT_LANGUAGES = [
  [/\p{Script=Devanagari}/u, 'Hindi'], [/\p{Script=Tamil}/u, 'Tamil'],
  [/\p{Script=Kannada}/u, 'Kannada'], [/\p{Script=Telugu}/u, 'Telugu'],
  [/\p{Script=Bengali}/u, 'Bengali'], [/\p{Script=Gujarati}/u, 'Gujarati'],
  [/\p{Script=Gurmukhi}/u, 'Punjabi'], [/\p{Script=Malayalam}/u, 'Malayalam'],
  [/\p{Script=Oriya}/u, 'Odia'], [/\p{Script=Cyrillic}/u, 'Russian'],
  [/\p{Script=Han}/u, 'Chinese'], [/\p{Script=Hangul}/u, 'Korean'],
  [/\p{Script=Thai}/u, 'Thai'], [/\p{Script=Greek}/u, 'Greek'],
  [/\p{Script=Hebrew}/u, 'Hebrew'], [/\p{Script=Armenian}/u, 'Armenian'],
  [/\p{Script=Georgian}/u, 'Georgian'], [/\p{Script=Myanmar}/u, 'Burmese'],
  [/\p{Script=Sinhala}/u, 'Sinhala'], [/\p{Script=Khmer}/u, 'Khmer'],
  [/\p{Script=Lao}/u, 'Lao'], [/\p{Script=Ethiopic}/u, 'Amharic'],
  [/\p{Script=Tibetan}/u, 'Tibetan']
];
const LANGUAGE_ALIASES = {
  en:'English', english:'English', hi:'Hindi', hindi:'Hindi', ta:'Tamil', tamil:'Tamil',
  kn:'Kannada', kannada:'Kannada', te:'Telugu', telugu:'Telugu', bn:'Bengali', bengali:'Bengali',
  gu:'Gujarati', gujarati:'Gujarati', pa:'Punjabi', punjabi:'Punjabi', ml:'Malayalam', malayalam:'Malayalam',
  or:'Odia', ori:'Odia', odia:'Odia', mr:'Marathi', marathi:'Marathi', ur:'Urdu', urdu:'Urdu',
  ar:'Arabic', arabic:'Arabic', ru:'Russian', russian:'Russian', zh:'Chinese', chinese:'Chinese',
  ja:'Japanese', japanese:'Japanese', ko:'Korean', korean:'Korean', th:'Thai', thai:'Thai',
  el:'Greek', greek:'Greek', he:'Hebrew', hebrew:'Hebrew', es:'Spanish', spanish:'Spanish',
  fr:'French', french:'French', français:'French', francaise:'French', español:'Spanish', de:'German', german:'German', deutsch:'German', pt:'Portuguese', portuguese:'Portuguese', português:'Portuguese',
  it:'Italian', italian:'Italian', italiano:'Italian', nl:'Dutch', dutch:'Dutch', nederlands:'Dutch', pl:'Polish', polish:'Polish',
  tr:'Turkish', turkish:'Turkish', türkçe:'Turkish', vi:'Vietnamese', vietnamese:'Vietnamese', 'tiếng việt':'Vietnamese', id:'Indonesian', indonesian:'Indonesian',
  ms:'Malay', malay:'Malay', sw:'Swahili', swahili:'Swahili', fa:'Persian', persian:'Persian',
  ps:'Pashto', pashto:'Pashto', uk:'Ukrainian', ukrainian:'Ukrainian', cs:'Czech', czech:'Czech',
  ro:'Romanian', romanian:'Romanian', hu:'Hungarian', hungarian:'Hungarian', sv:'Swedish', swedish:'Swedish',
  da:'Danish', danish:'Danish', no:'Norwegian', norwegian:'Norwegian', fi:'Finnish', finnish:'Finnish',
  et:'Estonian', estonian:'Estonian', lv:'Latvian', latvian:'Latvian', lt:'Lithuanian', lithuanian:'Lithuanian',
  bg:'Bulgarian', bulgarian:'Bulgarian', sr:'Serbian', serbian:'Serbian', hr:'Croatian', croatian:'Croatian',
  sk:'Slovak', slovak:'Slovak', sl:'Slovenian', slovenian:'Slovenian', sq:'Albanian', albanian:'Albanian',
  az:'Azerbaijani', azerbaijani:'Azerbaijani', kk:'Kazakh', kazakh:'Kazakh', uz:'Uzbek', uzbek:'Uzbek',
  am:'Amharic', amharic:'Amharic', my:'Burmese', burmese:'Burmese', si:'Sinhala', sinhala:'Sinhala',
  km:'Khmer', khmer:'Khmer', lo:'Lao', lao:'Lao', hy:'Armenian', armenian:'Armenian', ka:'Georgian', georgian:'Georgian',
  bo:'Tibetan', tibetan:'Tibetan'
};
function normalizeLanguage(value) {
  const raw=String(value||'').trim(); if(!raw)return 'English';
  const lower=raw.toLowerCase().replace(/_/g,'-');
  if(LANGUAGE_ALIASES[lower])return LANGUAGE_ALIASES[lower];
  return LANGUAGE_ALIASES[lower.split('-')[0]]||raw;
}
const SHARED_SCRIPT_FAMILIES={Hindi:['Hindi','Marathi'],Marathi:['Hindi','Marathi'],Arabic:['Arabic','Urdu','Persian','Pashto'],Urdu:['Arabic','Urdu','Persian','Pashto'],Persian:['Arabic','Urdu','Persian','Pashto'],Pashto:['Arabic','Urdu','Persian','Pashto'],Chinese:['Chinese','Japanese'],Japanese:['Chinese','Japanese']};
const LATIN_MARKERS = {
  Portuguese: /\b(olá|obrigado|obrigada|por favor|você|vocês|preciso|ajuda|bom dia|boa noite|não|estou|como vai|porque)\b|[ãõç]/i,
  Vietnamese: /\b(xin chào|cảm ơn|làm ơn|tôi|không|giúp tôi|tại sao|xin hãy|chào bạn)\b|[đơư]/i,
  Spanish: /\b(hola|gracias|por favor|qué|como|cómo|estoy|quiero|necesito|puedes|ayuda|buenos días|buenas noches|porque|para|esto|una|pero|tengo)\b|[¿¡ñ]/i,
  French: /\b(bonjour|merci|s'il vous plaît|je suis|j'ai|vous|nous|avec|pourquoi|comment|besoin|aidez|salut|bonne nuit|ça|est-ce)\b|[àâçéèêëîïôùûüÿœ]/i,
  German: /\b(hallo|danke|bitte|ich|nicht|und|ist|sind|wie|warum|brauche|hilfe|guten morgen|guten tag|tschüss|möchte)\b|[äöüß]/i,
  Italian: /\b(ciao|grazie|per favore|buongiorno|buonasera|sono|vorrei|bisogno|aiuto|come stai|perché|questo|questa)\b|[àèéìòù]/i,
  Dutch: /\b(hallo|bedankt|alsjeblieft|ik|niet|goedemorgen|hoe gaat|waarom|nodig|jij|zijn|dank je)\b/i,
  Turkish: /\b(merhaba|teşekkürler|lütfen|nasılsın|yardım|istiyorum|neden|evet|hayır|günaydın)\b|[ığüşöçİ]/i,
  Indonesian: /\b(halo|terima kasih|tolong|saya|kamu|bagaimana|butuh|bantu|selamat pagi|tidak|mengapa)\b/i,
  Malay: /\b(apa khabar|terima kasih|tolong|saya|awak|selamat pagi|boleh|perlukan bantuan)\b/i,
  Swahili: /\b(jambo|asante|tafadhali|habari|ninahitaji|msaada|karibu|hujambo)\b/i,
  Polish: /\b(cześć|dziękuję|proszę|jak się masz|pomocy|potrzebuję|dzień dobry)\b|[ąćęłńóśźż]/i,
  Ukrainian: /\b(привіт|дякую|будь ласка|допоможіть|як справи)\b/i,
  Romanian: /\b(bună|mulțumesc|te rog|ajutor|am nevoie|cum ești)\b|[ăâîșț]/i,
  Swedish: /\b(hej|tack|snälla|hur mår du|hjälp|behöver)\b|[åäö]/i,
  Danish: /\b(hej|tak|venligst|hvordan går det|hjælp|behøver)\b|[æøå]/i,
  Norwegian: /\b(hei|takk|vær så snill|hvordan går det|hjelp|trenger)\b|[æøå]/i,
  Finnish: /\b(hei|kiitos|ole hyvä|mitä kuuluu|apua|tarvitsen)\b|[äö]/i,
  Czech: /\b(ahoj|děkuji|prosím|pomoc|jak se máš)\b|[ěščřžýáíéů]/i,
  Slovak: /\b(ahoj|ďakujem|prosím|pomoc|ako sa máš)\b|[áäčďéíľĺňóôŕšťúýž]/i,
  Hungarian: /\b(szervusz|köszönöm|kérem|segítség|hogy vagy)\b|[őű]/i,
  Estonian: /\b(tere|aitäh|palun|abi|kuidas läheb)\b|[õäöü]/i,
  Latvian: /\b(sveiki|paldies|lūdzu|palīdziet|kā jums klājas)\b|[āčēģīķļņšūž]/i,
  Lithuanian: /\b(labas|ačiū|prašau|pagalbos|kaip sekasi)\b|[ąčęėįšųūž]/i,
  Albanian: /\b(përshëndetje|faleminderit|ju lutem|ndihmë|si jeni)\b|[ëç]/i,
  Azerbaijani: /\b(salam|təşəkkür|zəhmət olmasa|kömək|necəsən)\b|[əğıİöüşç]/i,
  Uzbek: /\b(salom|rahmat|iltimos|yordam|qandaysiz)\b/i,
  English: /\b(hello|please|thank you|how are you|can you|could you|help me|explain|tell me|what is|why|good morning|good evening|i need|i want|the|this|that|with|for)\b/i
};
function detectExplicitRequest(value) {
  const text=String(value||'');
  const names=Object.keys(LANGUAGE_ALIASES).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const namePattern=names.join('|');
  const re=new RegExp('(?:reply|answer|respond|speak|write|translate)?\\s*(?:in|en|using|language\\s*[:=]|mein|me|में|میں|में जवाब|میں جواب)\\s*\\b('+namePattern+')\\b(?:\\s+(?:language|mein|me|में|میں))?','i');
  const m=text.match(re);
  if(m)return normalizeLanguage(m[1]);
  // Natural requests like "Hindi mein jawab do", "Urdu میں جواب دیں", or "English please".
  for (const alias of names) {
    const lang=normalizeLanguage(alias);
    const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const before=new RegExp('\\b'+escaped+'\\s+(?:mein|me|में|میں|please|plz)\\b','i');
    const directName=new RegExp('\\b(?:reply|answer|respond|write|speak)\\s+(?:in\\s+)?'+escaped+'\\b','i');
    if(before.test(text)||directName.test(text)) return lang;
  }
  return null;
}
function detectReplyLanguage(text,fallback='English') {
  const normalizedFallback=normalizeLanguage(fallback), value=String(text||'').trim();
  if(!value)return normalizedFallback;
  const requested=detectExplicitRequest(value); if(requested)return requested;
  // Japanese uses Han plus kana; Arabic script is disambiguated using language-specific letters.
  if(/[\u3040-\u30ff]/u.test(value))return 'Japanese';
  // Distinguish common Arabic and Urdu greetings before Persian markers.
  // The word سلام alone is shared widely and must not classify a message as Persian.
  if(/السلام علیکم|وعلیکم السلام|آپ کیسے ہیں|آپ کا شکریہ|یہ اردو ہے|کیا حال ہے|مجھے مدد چاہیے/u.test(value)) return 'Urdu';
  if(/السلام عليكم|وعليكم السلام|مرحبا بكم|كيف حالك|كيف حالكم|شكرا جزيلا/u.test(value) && !SHARED_SCRIPT_FAMILIES.Arabic.includes(normalizedFallback)) return 'Arabic';
  // Check distinctive Persian vocabulary before Urdu-specific letters; Persian also uses
  // several characters shared with Urdu (for example پ, چ, ژ, گ, ک and ی).
  if(/(?:ممنون|لطفاً?|چطور|چگونه|خوبی|سپاسگزارم|متشکرم|فارسی|من هستم|چه خبر|روز بخیر|خداحافظ)/u.test(value)) return 'Persian';
  if(/[ۀ]/u.test(value)) return 'Persian';
  if(/[ٹڈڑںھہےپچژگکی]/u.test(value))return 'Urdu';
  // For ambiguous Arabic-script text, honor a selected language in the family.
  if(/[پچژگک]/u.test(value) && SHARED_SCRIPT_FAMILIES.Arabic.includes(normalizedFallback)) return normalizedFallback;
  if(/[ٹڈڑںھہے]/u.test(value)) return 'Urdu';
  if(/\p{Script=Arabic}/u.test(value)) {
    const family=SHARED_SCRIPT_FAMILIES.Arabic;
    return family.includes(normalizedFallback)?normalizedFallback:'Arabic';
  }
  // Romanized Hindi phrases are detected before generic Latin-language markers.
  const romanHindiStrong=/\b(kya|kyu|kyun|kyon|kaise|kaisa|kaisi|mujhe|aap|tum|dost|batao|bataiye|chahiye|nahi|nahin|mein|mera|meri|abhi|pahle|pehle|bhai|hoga|hogi|raha|rahi|rahe|kripya|accha|achha|theek|kahan|kab)\b/i;
  if(romanHindiStrong.test(value))return 'Hindi';
  // Cyrillic is shared by many languages; check distinctive vocabulary before
  // falling back to Russian as the broad script default.
  if(/\p{Script=Cyrillic}/u.test(value)) {
    if(/(привіт|дякую|будь ласка|допоможіть|україна|як справи)/iu.test(value)) return 'Ukrainian';
    if(/(здравей|благодаря|моля|как си)/iu.test(value)) return 'Bulgarian';
    if(/(здраво|хвала|молим|како си)/iu.test(value)) return 'Serbian';
    if(/(привет|спасибо|пожалуйста|как дела|помогите)/iu.test(value)) return 'Russian';
    if(SHARED_SCRIPT_FAMILIES[normalizedFallback]?.includes(normalizedFallback)) return normalizedFallback;
    return 'Russian';
  }
  // Devanagari is also shared by Hindi, Marathi and Nepali. Keep an explicit
  // selected locale, and use a few strong lexical clues when available.
  if(/\p{Script=Devanagari}/u.test(value)) {
    if(/(माझं|माझे|आहे|कसं|धन्यवाद|तुम्ही)/u.test(value)) return normalizedFallback === 'Hindi' ? 'Marathi' : (normalizedFallback === 'Nepali' ? 'Nepali' : 'Marathi');
    if(/(नमस्ते|कैसे हैं|मुझे|कृपया|बताइए|क्या)/u.test(value)) return 'Hindi';
    return ['Hindi','Marathi','Nepali'].includes(normalizedFallback) ? normalizedFallback : 'Hindi';
  }
  for(const [pattern,language] of SCRIPT_LANGUAGES){if(pattern.test(value)){const family=SHARED_SCRIPT_FAMILIES[language];return family&&family.includes(normalizedFallback)?normalizedFallback:language;}}
  // Score marker matches; only return a Latin language when it has a clear marker.
  for(const [language,pattern] of Object.entries(LATIN_MARKERS)){if(pattern.test(value))return language;}
  return normalizedFallback;
}
function languageInstruction(language) {
  const name=normalizeLanguage(language);
  return `Reply in ${name}, the language the user requested or used. Keep the same language throughout unless the user explicitly requests another language. If the user mixes languages, mirror their mix naturally. Do not translate the user's request unless asked. If you cannot confidently identify the language, use the selected app language or ask a brief clarification. Use natural, fluent spelling and script for ${name}.`;
}
module.exports={detectReplyLanguage,languageInstruction,normalizeLanguage};

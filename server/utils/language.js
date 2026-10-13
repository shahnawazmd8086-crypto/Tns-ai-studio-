'use strict';

// Best-effort script/phrase detection. The configured AI provider remains responsible
// for understanding mixed-language/romanized text and following the reply instruction.
const SCRIPT_LANGUAGES = [
  [/\p{Script=Devanagari}/u, 'Hindi'],
  [/\p{Script=Tamil}/u, 'Tamil'],
  [/\p{Script=Kannada}/u, 'Kannada'],
  [/\p{Script=Telugu}/u, 'Telugu'],
  [/\p{Script=Bengali}/u, 'Bengali'],
  [/\p{Script=Gujarati}/u, 'Gujarati'],
  [/\p{Script=Gurmukhi}/u, 'Punjabi'],
  [/\p{Script=Malayalam}/u, 'Malayalam'],
  [/\p{Script=Oriya}/u, 'Odia'],
  [/\p{Script=Arabic}/u, 'Arabic'],
  [/\p{Script=Cyrillic}/u, 'Russian'],
  [/\p{Script=Han}/u, 'Chinese'],
  [/\p{Script=Hiragana}|\p{Script=Katakana}/u, 'Japanese'],
  [/\p{Script=Hangul}/u, 'Korean'],
  [/\p{Script=Thai}/u, 'Thai'],
  [/\p{Script=Greek}/u, 'Greek'],
  [/\p{Script=Hebrew}/u, 'Hebrew']
];

const LANGUAGE_ALIASES = {
  en: 'English', english: 'English', hi: 'Hindi', hindi: 'Hindi',
  ta: 'Tamil', tamil: 'Tamil', kn: 'Kannada', kannada: 'Kannada',
  te: 'Telugu', telugu: 'Telugu', bn: 'Bengali', bengali: 'Bengali',
  gu: 'Gujarati', gujarati: 'Gujarati', pa: 'Punjabi', punjabi: 'Punjabi',
  ml: 'Malayalam', malayalam: 'Malayalam', or: 'Odia', ori: 'Odia', odia: 'Odia',
  mr: 'Marathi', marathi: 'Marathi', ur: 'Urdu', urdu: 'Urdu',
  ar: 'Arabic', arabic: 'Arabic', ru: 'Russian', russian: 'Russian',
  zh: 'Chinese', chinese: 'Chinese', ja: 'Japanese', japanese: 'Japanese',
  ko: 'Korean', korean: 'Korean', th: 'Thai', thai: 'Thai',
  el: 'Greek', greek: 'Greek', he: 'Hebrew', hebrew: 'Hebrew'
};

function normalizeLanguage(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'English';
  const lower = raw.toLowerCase().replace(/_/g, '-');
  if (LANGUAGE_ALIASES[lower]) return LANGUAGE_ALIASES[lower];
  // Accept locale variants consistently (for example mr-IN, ur-IN, zh-TW).
  const base = lower.split('-')[0];
  return LANGUAGE_ALIASES[base] || raw;
}

// Some languages share a writing system. If the app/user selected a language in
// that same script family, prefer that context instead of silently mislabelling it.
const SHARED_SCRIPT_FAMILIES = {
  Hindi: ['Hindi', 'Marathi'], Marathi: ['Hindi', 'Marathi'],
  Arabic: ['Arabic', 'Urdu'], Urdu: ['Arabic', 'Urdu'],
  Chinese: ['Chinese', 'Japanese'], Japanese: ['Chinese', 'Japanese']
};

function detectReplyLanguage(text, fallback = 'English') {
  const normalizedFallback = normalizeLanguage(fallback);
  const value = String(text || '').trim();
  if (!value) return normalizedFallback;
  // Best-effort Romanized Hindi detection. Avoid short/common tokens such as
  // "ho" and "ap" on their own, which can create false positives in other text.
  const romanHindiStrong = /\b(kya|kyu|kyun|kyon|kaise|kaisa|kaisi|mujhe|aap|tum|dost|batao|bataiye|chahiye|nahi|nahin|mein|mera|meri|abhi|pahle|pehle|bhai|hoga|hogi|raha|rahi|rahe|kripya|accha|achha|theek|kahan|kab)\b/i;
  if (romanHindiStrong.test(value)) return 'Hindi';
  // Japanese commonly mixes Han characters with Hiragana/Katakana; test it before Han/Chinese.
  if ((/\p{Script=Hiragana}/u.test(value) || /\p{Script=Katakana}/u.test(value))) return 'Japanese';
  for (const [pattern, language] of SCRIPT_LANGUAGES) {
    if (!pattern.test(value)) continue;
    const family = SHARED_SCRIPT_FAMILIES[language];
    if (family && family.includes(normalizedFallback)) return normalizedFallback;
    return language;
  }
  // Latin-script languages cannot be reliably distinguished without a language
  // detection model; retain the selected/app locale as the honest fallback.
  return normalizedFallback;
}

function languageInstruction(language) {
  const name = String(language || 'English').trim() || 'English';
  return `Reply in ${name}, the language used by the user. Keep the same language throughout unless the user explicitly requests another language. If the user mixes languages, mirror their mix naturally. Do not translate the user's request unless asked. If you cannot confidently identify the language, ask a brief clarification in the most likely language.`;
}

module.exports = { detectReplyLanguage, languageInstruction, normalizeLanguage };

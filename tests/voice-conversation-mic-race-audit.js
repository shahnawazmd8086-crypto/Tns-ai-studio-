const assert=require('assert');
const fs=require('fs');
const path=require('path');
const js=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
// The outside microphone uses a dedicated voice-only screen; the inner mic keeps dictation.
assert(js.includes('let voiceRecognition = null;'),'Dashboard voice input must track its active recognition instance.');
assert(js.includes('if(voiceRecognition){try{voiceRecognition.stop()}catch{} voiceRecognition=null;}'),'Starting a new dashboard voice input must stop the prior recognition instance.');
assert(js.includes('if(voiceRecognition!==recognition)return;'),'Stale dashboard recognition events must be ignored.');
assert(js.includes('let homeSpeechGeneration = 0;'),'Dashboard voice playback must track response generations.');
assert(js.includes('speechGenerationAtSubmit===homeSpeechGeneration'),'Late AI replies must not speak after the dashboard voice request is invalidated.');
console.log('DASHBOARD_VOICE_RACE_AUDIT_OK');

assert(js.includes("const handleVoiceOnlyTurn=async spokenText=>"),'Voice-only screen must send recognized speech directly to the AI provider.');
assert(js.includes("setVoiceOnlyStatus('🔊 TNS bol raha hai…')"),'Voice-only screen must provide spoken-response state.');
assert(js.includes("const endVoiceOnly=({returnToChat=true}={})=>"),'Voice-only screen must have a stop/exit cleanup path.');

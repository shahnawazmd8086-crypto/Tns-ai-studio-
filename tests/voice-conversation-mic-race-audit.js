const assert=require('assert');
const fs=require('fs');
const path=require('path');
const js=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
// Checkpoint 45 now removes the standalone voice screen but preserves the dashboard's own voice flow.
assert(js.includes('let voiceRecognition = null;'),'Dashboard voice input must track its active recognition instance.');
assert(js.includes('if(voiceRecognition){try{voiceRecognition.stop()}catch{} voiceRecognition=null;}'),'Starting a new dashboard voice input must stop the prior recognition instance.');
assert(js.includes('if(voiceRecognition!==recognition)return;'),'Stale dashboard recognition events must be ignored.');
assert(js.includes('let homeSpeechGeneration = 0;'),'Dashboard voice playback must track response generations.');
assert(js.includes('speechGenerationAtSubmit===homeSpeechGeneration'),'Late AI replies must not speak after the dashboard voice request is invalidated.');
console.log('DASHBOARD_VOICE_RACE_AUDIT_OK');

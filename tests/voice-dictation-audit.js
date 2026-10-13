const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
assert(html.includes('id="homeChatDictation"'),'Inner dictation mic control is missing.');
assert(js.includes("$id('homeChatDictation')?.addEventListener('click',()=>startSpeechInput(false))"),'Inner mic must start dictation mode.');
assert(js.includes('recognition.onresult=event=>'),'Speech recognition result handler is missing.');
assert(js.includes("input.value=(input.value ? input.value+' ' : '')+spoken.trim()"),'Recognized text must be added to composer without replacing existing text.');
assert(js.includes('Yeh abhi send nahi hui—arrow dabakar bhejein.'),'Dictation must clearly say it does not auto-send.');
assert(js.includes("recognition.onerror=event=>"),'Speech recognition errors must be handled.');
assert(js.includes("event?.error==='not-allowed'||event?.error==='service-not-allowed'"),'Microphone permission errors must have specific guidance.');
assert(js.includes("recognition.onnomatch=()=>"),'Unrecognized speech must show a useful message.');
assert(js.includes('if(!receivedSpeech&&!finalStatusSet)setStatus('),'Empty recognition sessions must have a fallback status.');

assert(js.includes('recognition.onresult=event=>{\n      if(voiceRecognition!==recognition)return;'), 'Stale speech results must not modify a newer recognition session.');
assert(js.includes('recognition.onerror=event=>{\n      if(voiceRecognition!==recognition)return;'), 'Stale recognition errors must not overwrite the current status.');
assert(js.includes('recognition.onend=()=>{\n      if(voiceRecognition!==recognition)return;'), 'An older recognition session must not clear the current microphone state.');
assert(js.includes('recognition.onstart=()=>{if(voiceRecognition!==recognition)return;'), 'Stale start events must not overwrite the current status.');

console.log('VOICE_DICTATION_AUDIT_OK');

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const appJs=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');

// Retained core screens.
for(const id of ['splashScreen','authScreen','signupModal','otpScreen','languageScreen','dashboard','editor','generate','projects','help','premium','settings','premiumDetails','settingsApp','languageInside','editorTools','exportVideo','appIcon','finalEditView']) {
  assert(html.includes(`id="${id}"`),`Missing retained screen/section: ${id}`);
}
// Removed modules must be physically absent from the HTML, not merely hidden.
for(const id of ['image','contact','tnsAi','tnsAiVoice','tnsAiUnderstanding','contactInside','shorts','profile']) {
  assert(!html.includes(`id="${id}"`),`Removed module screen still present: ${id}`);
}
const dashboard=html.slice(html.indexOf('id="dashboard"'),html.indexOf('</section>',html.indexOf('id="dashboard"')));
for(const control of ['homeChatMessages','homeChatForm','homeChatInput','homeChatAttach','homeChatPhoto','homeChatFile','homeChatCamera','homeChatAttachMenu','homeChatChoosePhoto','homeChatChooseFile','homeChatOpenCamera','homeChatVoice','homeChatDictation','homeResearchBtn','homeExploreToolsBtn','homeToolsGrid','voiceLanguage','voiceSystemVoice','voiceSpeechRate']) {
  assert(dashboard.includes(`id="${control}"`),`Missing retained dashboard control: ${control}`);
}
assert(dashboard.includes('home-tools-grid hidden'),'Tool shortcuts should be collapsed by default.');
assert(dashboard.includes('aria-pressed="false"'),'Research toggle must expose its off state accessibly.');
for(const feature of ['data-open="editor"','data-open="generate"','data-open="projects"']) assert(dashboard.includes(feature),`Dashboard missing ${feature}`);
for(const feature of ['data-open="image"','data-open="contact"','data-open="tnsAi"','data-open="shorts"','data-open="profile"']) assert(!dashboard.includes(feature),`Dashboard still offers removed feature ${feature}`);
assert(!dashboard.includes('data-open="premium"')&&!dashboard.includes('data-open="help"'),'Premium and Help must remain in the top menu, not dashboard cards.');
const menuStart=html.indexOf('id="topbarMenu"'),menuEnd=html.indexOf('<main>',menuStart);
const topbarMenu=menuStart>=0&&menuEnd>menuStart?html.slice(menuStart,menuEnd):'';
for(const x of ['data-menu-open="premium"','data-menu-open="help"','data-menu-open="settings"']) assert(topbarMenu.includes(x),`Missing top menu item: ${x}`);
assert(!dashboard.includes('data-open="settings"'),'Settings card must not be in dashboard grid.');
for(const x of ['videoCamera','characterConsistency','videoReference','videoNegativePrompt','saturation','sharpness','fadeIn','fadeOut']) assert(html.includes(`id="${x}"`),`Missing retained feature control: ${x}`);
for(const x of ['ai-image','contact-inside','tns-ai-voice','tns-ai']) assert(!html.includes(`data-module-settings="${x}"`),`Removed module settings still present: ${x}`);
assert((html.match(/data-tool="/g)||[]).length>=60,'Expected at least 60 Edit Video tools.');
for(const x of ['videoStep1','videoStep2','acceptedVideoIdea','editVideoIdeaBtn','videoContinueBtn']) assert(html.includes(`id="${x}"`),`Missing AI Video workflow element: ${x}`);
for(const x of ['imageStep1','imageStep2','acceptedImageIdea','editImageIdeaBtn','imageContinueBtn','startTnsAiVoice','tnsAiUnderstandFile','tnsAiAnalyzeFile']) assert(!html.includes(`id="${x}"`),`Removed feature control still present: ${x}`);
assert(html.includes('data-screen-number="24"'),'Missing 24-screen registry marker.');
for(const uxRule of ['MAX_FILE_BYTES = 1200 * 1024','allowedExtensions','home-attachment-remove','if(isSending){','setSending(true)','setSending(false)','homeChatChoosePhoto','homeChatChooseFile','homeChatOpenCamera','homeChatCamera']) assert(appJs.includes(uxRule),`Missing home chat usability safeguard: ${uxRule}`);
assert(appJs.includes('live web search provider abhi connect nahi hai'),'Research mode must not imply live web search is connected.');
assert(appJs.includes('startSpeechInput(true)')&&appJs.includes('startSpeechInput(false)'),'Dashboard voice conversation and dictation must remain.');
assert(appJs.includes('speechSynthesis.speak(utterance)'),'Dashboard voice reply playback missing.');
assert(css.includes('tns-chat-typing')&&css.includes('#dashboard .home-chat-composer'),'Missing compact chat layout rules.');
console.log('UI_AUDIT_OK');

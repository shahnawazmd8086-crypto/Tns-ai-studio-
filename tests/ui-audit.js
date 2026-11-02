const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const appJs=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');

// Retained core screens.
for(const id of ['splashScreen','authScreen','otpScreen','dashboard','projects','premium','settings','premiumDetails','settingsApp','languageInside','appIcon']) {
  assert(html.includes(`id="${id}"`),`Missing retained screen/section: ${id}`);
}
// Current account creation and password login controls remain intact.
for(const id of ['loginEmail','loginMobile','loginPassword','signupForm','signupPassword','signupConfirmPassword','showSignupBtn','otpScreen']) assert(html.includes(`id="${id}"`),`Missing retained account control: ${id}`);
assert(appJs.includes("json('/api/auth/signup'")&&appJs.includes("json('/api/auth/login'"),'Account signup/password login flow is not wired.');
assert(appJs.includes('function enterTns(user)')&&appJs.includes("$('#app')?.classList.remove('hidden')"),'Successful login must enter TNS directly.');
// Removed modules must be physically absent from the HTML, not merely hidden.
for(const id of ['image','contact','tnsAi','tnsAiVoice','tnsAiUnderstanding','contactInside','shorts','profile']) {
  assert(!html.includes(`id="${id}"`),`Removed module screen still present: ${id}`);
}
const dashboard=html.slice(html.indexOf('id="dashboard"'),html.indexOf('</section>',html.indexOf('id="dashboard"')));
for(const control of ['homeChatMessages','homeChatForm','homeChatInput','homeChatAttach','homeChatPhoto','homeChatFile','homeChatCamera','homeChatAttachMenu','homeChatChoosePhoto','homeChatChooseFile','homeChatOpenCamera','homeChatVoice','homeChatDictation','voiceLanguage','voiceSystemVoice','voiceSpeechRate']) {
  assert(dashboard.includes(`id="${control}"`),`Missing retained dashboard control: ${control}`);
}
assert(!dashboard.includes('homeResearchBtn')&&!dashboard.includes('Link samjho')&&!dashboard.includes('Address / jagah')&&!dashboard.includes('Compare options'),'Research/link/location/compare shortcuts should be removed from beneath chat.');
assert(dashboard.includes('data-open="projects"'),'Dashboard missing Projects access.');
for(const feature of ['data-open="editor"','data-open="generate"']) assert(!dashboard.includes(feature),`Removed video module still appears: ${feature}`);
for(const feature of ['data-open="image"','data-open="contact"','data-open="tnsAi"','data-open="shorts"','data-open="profile"']) assert(!dashboard.includes(feature),`Dashboard still offers removed feature ${feature}`);
assert(!dashboard.includes('data-open="premium"')&&!dashboard.includes('data-open="help"'),'Premium must remain in the top menu, not dashboard cards.');
assert(!html.includes('id="help"')&&!html.includes('data-menu-open="help"')&&!appJs.includes('Help & Support'),'Help & Support must be fully removed.');
const menuStart=html.indexOf('id="topbarMenu"'),menuEnd=html.indexOf('<main>',menuStart);
const topbarMenu=menuStart>=0&&menuEnd>menuStart?html.slice(menuStart,menuEnd):'';
for(const x of ['data-menu-open="premium"','data-menu-open="settings"']) assert(topbarMenu.includes(x),`Missing top menu item: ${x}`);
assert(!dashboard.includes('data-open="settings"'),'Settings card must not be in dashboard grid.');

for(const x of ['ai-image','contact-inside','tns-ai-voice','tns-ai']) assert(!html.includes(`data-module-settings="${x}"`),`Removed module settings still present: ${x}`);
for(const token of ['id="editor"','id="generate"','/api/editor/','/api/video/jobs','data-tool=']) assert(!html.includes(token),`Removed video feature UI still present: ${token}`);
for(const token of ['api/editor','api/video/jobs','TNSEditorComponent','initProfessionalEditor','waitForVideoJob']) assert(!appJs.includes(token),`Removed video feature JavaScript still present: ${token}`);
for(const x of ['imageStep1','imageStep2','acceptedImageIdea','editImageIdeaBtn','imageContinueBtn','startTnsAiVoice','tnsAiUnderstandFile','tnsAiAnalyzeFile']) assert(!html.includes(`id="${x}"`),`Removed feature control still present: ${x}`);
assert(html.includes('data-screen-number="24"'),'Missing 24-screen registry marker.');
for(const uxRule of ['MAX_FILE_BYTES = 1200 * 1024','allowedExtensions','home-attachment-remove','if(isSending){','setSending(true)','setSending(false)','homeChatChoosePhoto','homeChatChooseFile','homeChatOpenCamera','homeChatCamera']) assert(appJs.includes(uxRule),`Missing home chat usability safeguard: ${uxRule}`);
assert(!html.includes('<b>Saare Tools</b>'),'Removed editor tools menu should not remain.');
assert(appJs.includes('startSpeechInput(false)'),'Dashboard inner-mic dictation must remain.');
assert(html.includes('id="voiceConversation"')&&appJs.includes("showPanel('voiceConversation')")&&appJs.includes('beginVoiceOnly();'),'Outer microphone must open the dedicated voice-only conversation screen.');
assert(appJs.includes('speechSynthesis.speak(utterance)'),'Dashboard voice reply playback missing.');
assert(css.includes('tns-chat-typing')&&css.includes('#dashboard .home-chat-composer'),'Missing compact chat layout rules.');
console.log('UI_AUDIT_OK');

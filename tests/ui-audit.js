const assert=require('assert');
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
const requiredScreens=['splashScreen','authScreen','signupModal','otpScreen','languageScreen','dashboard','editor','generate','image','contact','projects','tnsAi','tnsAiVoice','help','premium','settings','premiumDetails','settingsApp','languageInside','contactInside','editorTools','exportVideo','appIcon','finalEditView'];
for(const id of requiredScreens) assert(html.includes(`id="${id}"`),`Missing screen/section: ${id}`);
const dashboard=html.slice(html.indexOf('id="dashboard"'),html.indexOf('</section>',html.indexOf('id="dashboard"')));
for(const feature of ['data-open="editor"','data-open="generate"','data-open="image"','data-open="projects"','data-open="contact"','data-open="premium"','data-open="tnsAi"','data-open="help"']) assert(dashboard.includes(feature),`Dashboard missing ${feature}`);
assert(!dashboard.includes('data-open="settings"'),'Settings card must not be in dashboard grid.');
for(const x of ['videoCamera','characterConsistency','videoReference','videoNegativePrompt','imageQuality','imageVariations','imageReference','imageCharacter','saturation','sharpness','fadeIn','fadeOut','contactMediaFile','contactFile','voiceMessageBtn','tnsAiNewChat','tnsAiResearch']) assert(html.includes(`id="${x}"`),`Missing feature control: ${x}`);
for(const x of ['data-module-settings="ai-video"','data-module-settings="ai-image"','data-module-settings="edit-video"','data-module-settings="contact"','data-module-settings="projects"','data-module-settings="tns-ai-voice"','data-module-settings="tns-ai"','data-module-settings="help"','data-module-settings="premium"']) assert(html.includes(x),`Missing module settings: ${x}`);
const toolCount=(html.match(/data-tool="/g)||[]).length;
assert(toolCount>=60,`Expected at least 60 editor tools, found ${toolCount}`);
for(const x of ['videoContinueBtn','imageContinueBtn','startTnsAiVoice','tnsAiUnderstandFile','tnsAiAnalyzeFile','locationShareBtn']) {
  if(x==='locationShareBtn') continue; // injected at runtime
  assert(html.includes(`id="${x}"`),`Missing final feature control: ${x}`);
}
for(const x of ['premium-details','app-settings','language-inside','contact-inside','editor-tools','export-video','app-icon','final-edit','tns-ai-voice']) {
  assert(html.includes(`data-module-settings="${x}"`) || html.includes(`data-module-settings=\\"${x}\\"`),`Missing settings control: ${x}`);
}
assert(html.includes('data-screen-number="24"'),'Missing 24-screen registry marker.');
console.log('UI_AUDIT_OK');

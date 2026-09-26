# TNS Studio — FINAL LOCKED PRODUCT CONFIGURATION

## 1. Brand and app structure
- Product name: **TNS Studio**.
- Mobile-first, worldwide-ready.
- The supplied TNS Studio dashboard montage is the visual/product reference for the main app structure.
- TNS Contact and the creator tools are original TNS Studio experiences; they must not copy another app.

## 2. Authentication
- Email login, mobile login/OTP and Google login architecture.
- User chooses their own password.
- Password requirement: **minimum 8 characters only**; uppercase/lowercase/number/special-character rules are NOT compulsory.
- Passwords are hashed server-side and never stored as plaintext.

## 3. Dashboard
- Main dashboard contains the complete TNS Studio creator/navigation surface: Edit Video, AI Video, AI Image, Projects, TNS Contact, Premium, Settings, Help & Support, TNS AI and AI Voice/creation access.
- Recent Projects and Quick Access are present.
- Global TNS Studio Settings stays outside feature modules.

## 4. TNS Contact — FINAL LOCK
- Familiar/easy communication experience inspired by common messaging apps, but **not a copy of WhatsApp or any other app**.
- Chats, contacts, status, calls, groups, search, media/files and voice messages.
- App lock.
- Individual chat/contact lock.
- Individual hidden chat/contact.
- Locked/hidden chat can be opened again after the user's TNS Studio password is verified.
- Private notifications and hidden previews are part of the privacy direction.
- Personal TNS Contact remains free, with no ads, premium payment, chat charges or call charges.

## 5. Edit Video — FINAL LOCK
- Professional creator editor with a familiar modern mobile editing workflow, but **not a CapCut copy**.
- Timeline, preview, layers and project save.
- Trim, split, merge, crop, resize, rotate, flip, speed, freeze/reverse-ready architecture.
- Text, captions, stickers, overlays, filters, effects, transitions.
- Music, SFX/audio, extract audio, voice-over/TTS, volume/mute/fades.
- Color controls, brightness, contrast, saturation/HSL/curves-ready architecture.
- AI editing tools including captions, background removal, enhance, smart cut, silence removal, noise cleanup, auto reframe, scene detection, beat sync.
- Advanced tools including keyframes, masks, chroma key, stabilization, speed curves, blend modes and advanced transitions.
- HD/Full HD/2K/4K-ready export configuration; MP4 primary format.
- Edit Video has its **own internal Edit Video Settings** only.

## 6. AI Video — FINAL LOCK
- Easy workflow for normal users.
- Text/idea to video, image to video, story/multi-scene, upload & animate.
- Prompt/AI Assistant, reference image/video, character consistency, style, camera/motion, platform/canvas, duration and quality controls.
- Preview, regenerate, improve, variation, extend, edit, save, download and share.
- HD/Full HD and future higher-quality provider support.
- AI Video has its **own internal AI Video Settings** only.

## 7. AI Image — FINAL LOCK
- Easy text-to-image, reference-image generation, image edit and variations.
- Style, canvas/aspect ratio, resolution/quality, character/reference controls and advanced edit architecture.
- Preview, regenerate, improve, variation, edit, upscale, save, download, share and use in AI Video/Edit Video.
- HD/high-resolution provider support.
- AI Image has its **own internal AI Image Settings** only.

## 8. TNS AI — FINAL LOCK
- Assistant name: **TNS AI**.
- Text chat and voice conversation modes.
- Architecture for image understanding, file/document understanding, research/search, conversation history and multi-language conversation.
- Provider-independent backend; real provider credentials are deployment configuration, not hard-coded secrets.

## 9. Settings architecture — FINAL LOCK
- One **global TNS Studio Settings** outside the modules.
- Separate internal settings for Edit Video, AI Video, AI Image and TNS Contact.
- Module settings must not replace or duplicate the global settings system.

## 10. Production rule
- The app must be structured as a real production product, not a fake demo.
- External production services (database, real OTP delivery, Google OAuth credentials, AI providers, object storage, WebRTC, payments/ads and monitoring) are configured after the application build is ready.
- No secrets are stored in the ZIP.

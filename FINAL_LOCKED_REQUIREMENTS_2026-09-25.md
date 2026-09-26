# TNS Studio — Final Locked Requirements — 25 September 2026

This document is the final implementation lock for this release. The supplied TNS Studio dashboard/product montage from the user is the visual reference for the app structure.

## Authentication
- TNS Studio is the final brand name.
- Email login, mobile login/OTP and Google login architecture remain supported.
- The user chooses their own password.
- Password requirement: minimum 8 characters only.
- Uppercase, lowercase, number and special-character rules are NOT compulsory.
- Passwords are securely hashed server-side and are never stored as plaintext.

## Main Dashboard
The dashboard must expose the complete creator/communication surface:
- Edit Video
- AI Video
- AI Image
- Projects
- TNS Contact
- Premium
- TNS Studio Settings
- Help & Support
- AI Voice
- TNS AI
- Recent Projects
- Quick Access

## TNS Contact
- Easy, familiar messaging experience, but not a copy of WhatsApp or another product.
- Contacts, chats, status, groups, voice/video call entry points, search, media/files and voice-message architecture.
- Global TNS Contact app lock.
- Individual contact/chat lock.
- Individual contact/chat hide.
- Locked chats require the user's TNS Studio password to open.
- Hidden chats require the user's TNS Studio password to reveal.
- Private notifications/hidden previews and relock-on-exit privacy direction.
- Personal TNS Contact remains free, with no ads, premium payment, chat charges or call charges.

## Edit Video
- Professional mobile editing experience inspired by familiar creator editors, but not a CapCut copy.
- Timeline, preview, layers/project workflow.
- Trim, split, merge, crop, resize, rotate, flip, speed and timing controls.
- Text, captions, stickers, overlays, filters, effects and transitions.
- Music, SFX/audio, voice-over/TTS, volume, mute and fades.
- Brightness, contrast, color/HSL/curves-ready architecture.
- AI editing architecture: captions, background removal, enhance, smart cut, silence removal, noise cleanup, auto reframe, scene detection and beat sync.
- Advanced architecture: keyframes, masks, chroma key, stabilization, speed curves, blend modes and advanced transitions.
- HD/Full HD/2K/4K-ready export configuration; MP4 primary output.
- Edit Video has its own internal Edit Video Settings.

## AI Video
- Simple user workflow.
- Text/idea to video, image to video, story/multi-scene and upload/animate.
- Prompt assistant, reference image/video, character consistency, style, camera/motion, platform/canvas, duration and quality.
- Preview, regenerate, improve, variation, extend, edit, save, download and share.
- HD/Full HD and provider-ready higher quality.
- AI Video has its own internal settings.

## AI Image
- Simple user workflow.
- Text-to-image, reference-image generation, image editing and variations.
- Style, canvas/aspect ratio, resolution/quality, reference/character consistency and advanced controls.
- Preview, regenerate, improve, variation, edit, upscale, save, download, share and use in AI Video/Edit Video.
- AI Image has its own internal settings.

## TNS AI
- Assistant name: TNS AI.
- Text chat and voice conversation modes.
- Architecture for file/document understanding, image understanding, research/search, history and multilingual conversations.
- Provider-independent backend. Production provider credentials are deployment configuration.

## Settings
- One global TNS Studio Settings area outside the feature modules.
- Separate internal settings for Edit Video, AI Video, AI Image and TNS Contact.
- Module settings must only control that module.

## Production
- The release is structured as a real product, not a fake claim of connected external services.
- Real OTP delivery, Google OAuth, AI providers, persistent production database/storage, WebRTC calling, payments/ads and monitoring are deployment services to be configured after the application build is ready.
- No production secrets are included in the ZIP.

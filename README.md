# TNS AI Studio

TNS AI Studio is a mobile-first AI video creation and editing platform.

The project is designed to support AI video generation, video editing, AI voice, character consistency, multiple languages, long-video workflows, and future AI provider integrations.

## Main Features

- AI video creation
- Realistic video generation workflow
- Garden Jugaad DIY video creation
- Cartoon and animation video creation
- Cinematic video creation
- Story video creation
- YouTube Shorts and Reels support
- AI voice workflow
- Multiple language selection
- Locked character consistency
- Video upload and preview
- Video editing tools
- Project save and load
- Mobile-first interface
- Modular backend architecture
- Future AI provider support

## Supported Video Categories

TNS AI Studio is designed for different types of videos, including:

- Realistic videos
- Garden Jugaad DIY
- Cartoon / Animation
- Cinematic videos
- Story videos
- YouTube Shorts
- Reels
- Educational videos
- Promotional videos
- Creative videos

## Locked Character System

TNS AI Studio supports an idea-wise locked character system.

### Rule

One idea = one locked character.

The same character should remain consistent from the first scene to the final scene.

The following details should remain unchanged:

- Face
- Person identity
- Age
- Gender
- Hairstyle
- Hair color
- Facial features
- Body type
- Clothing
- Clothing colors
- Footwear
- Gloves
- Accessories

Only the following can change:

- Pose
- Body position
- Facial expression
- Hand movement
- Action

A new video idea can use a completely different character.

## AI Voice

The AI Voice Studio is designed to support:

- Multiple languages
- Different voice styles
- Natural speaking
- Storytelling
- Professional voice
- Energetic voice
- Adjustable speaking speed
- Dialogue and script preparation

Actual AI voice generation requires a connected AI voice provider.

## Language Support

The interface is designed so additional languages can be added in the future.

The actual AI generation and voice languages depend on the connected AI providers.

## Video Editing

The editor architecture is designed for essential video editing operations such as:

- Trim
- Cut
- Split
- Merge
- Crop
- Resize
- Rotate
- Speed control
- Text
- Captions
- Music
- Volume
- Effects
- Export

Advanced editing and production export require a proper media-processing backend such as FFmpeg or WebCodecs.

## Long Video Workflow

Long videos can be created using multiple scenes.

The planned workflow is:

1. Create the video idea.
2. Generate the production plan.
3. Create individual scenes.
4. Keep the character consistent across scenes.
5. Generate the required video segments.
6. Generate or prepare voice.
7. Combine the segments.
8. Apply editing operations.
9. Export the final video.

## Project Structure

```text
TNS AI Studio
├── package.json
├── README.md
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── server/
    ├── server.js
    ├── ffmpeg-worker.js
    ├── jobs/
    │   ├── video-job.js
    │   └── voice-job.js
    ├── providers/
    │   ├── provider.js
    │   └── mock.js
    └── editor/
        ├── timeline.js
        ├── video-tools.js
        └── export.js

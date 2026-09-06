# Chloe’s Little Adventure

A complete, gentle, landscape-first learning game for ages 2–3. Tap through twelve rounds: fruit recognition, counting bees, feeding a friendly dinosaur, and packing a picnic. Collect four stickers and play again.

## Play

Open the GitHub Pages site on a phone and turn it sideways. Tap **Let’s play!** Desktop mouse clicks also work. Sound is optional: fruit pictures and quantity dots accompany the prompts. The small speaker button turns sound on or off; tap an activity instruction to hear it again.

There are no timers, lives, penalties, ads, purchases, accounts, analytics, or input permissions. No microphone, camera, or location APIs are used. Progress stays in memory and resets when the page reloads. Rotating the device pauses transitions and preserves the current round.

## Run locally

From this folder, run `python -m http.server 4173`, then open `http://localhost:4173`. No build step or runtime dependencies. Serve over HTTP rather than opening the HTML file directly because the game uses JavaScript modules.

## Files

```text
index.html
css/game.css
js/
  game.js             # Scene flow, Pointer Events, transitions
  state.js           # Session state and shuffle
  assets.js          # Central image manifest, preload and fallback handling
  fallback-images.js # Embedded SVG fallback images
  audio.js           # Recorded narration, music mixing and gentle effects
  audio-manifest.js  # Every spoken prompt and the music track
  animations.js      # Animation helpers, cancellable landscape-time waits
  activities/
    fruitGarden.js
    beeMeadow.js
    dinoFeed.js
    picnic.js
assets/
  reference/chloe_reference.png
  chloe/chloe-poses.webp
  fruit/{apple,banana,strawberry,orange,grapes,watermelon}.svg
  bees/bee.svg
  dinosaurs/dino.svg
  ui/{basket,star}.svg
  audio/little-wonder.mp3
  audio/voice/*.mp3
  audio/voice/transcript.json
tests/game.cjs
tests/audio.cjs
```

## Artwork and audio

Chloe’s three new waving, pointing, and celebrating poses were generated from the supplied character reference. They share a transparent WebP sprite sheet. The fruit, bee, dinosaur, basket, and star are custom SVG prototype illustrations; the backgrounds are CSS scenery. These are deliberately replaceable with painted production artwork through the manifest. The supplied reference is retained for future art work and is not loaded during gameplay.

Narration consists of 20 bundled MP3 clips generated with Microsoft's British female **Sonia Neural** voice at a gently reduced pace, using [edge-tts](https://github.com/rany2/edge-tts) during development. This is synthetic narration rendered to audio files, not a human voice recording. The complete spoken script is in `assets/audio/voice/transcript.json`. There is no browser speech synthesis and no runtime speech-service request; all players hear the same voice. Missing audio stays silent rather than reverting to a device voice.

**Little Wonder** is an original 49-second instrumental loop composed for this game, with soft piano/celesta-like notes and warm sustained harmony at 78 BPM. It starts after Play, loops during the adventure, and automatically lowers beneath narration. Web Audio gain channels keep the balance consistent across devices. The sound button mutes narration, music, and effects together. Home stops all playback; portrait orientation and hidden tabs pause and resume it. Narration never overlaps itself, and the counting animations wait for each recorded number to finish. No audio plays before a user gesture.

Sound effects are synthesized locally with Web Audio. All audio assets are served with the game; there are no analytics, third-party runtime calls, or audio input permissions.

Optional future polish: painted replacements for the SVG scenery and props. Real-device iOS and Android testing is recommended; automated checks use desktop Edge with touch emulation.

## Verification

With the local server running, install the test-only dependency using `npm install`, then run `npm test`. The test expects Microsoft Edge by default; set `BROWSER_CHANNEL=chromium` to use Playwright’s Chromium (install it with `npx playwright install chromium`). No dependencies are used by the deployed game.

The browser tests cover all twelve rounds, wrong choices, counting, replay, home during transitions, secondary pointers, repeated taps, sound toggles, portrait pause/resume, and bounds/target sizes at 844×390, 852×393, 915×412, 1024×768, and 667×375. Audio checks verify every prompt has a decodable clip, music ducking and recovery, overlapping-voice cancellation, no autoplay, independent orientation/tab pauses, and mute/home behavior. Tests check for runtime errors and page scrolling. Screenshots go into the ignored `work` directory.

## Publish

GitHub Pages serves the `main` branch at `/` using the standard static Pages build. All game asset references are relative, so project Pages URLs work without a bundler or base-path configuration.

# Chloe’s Little Adventure

Three landscape-first games starring Chloe: a gentle preschool Numbers adventure, **Chloieo**, a three-level side-scrolling platformer, and **Chlio Karts**, a scenic kart racer.

## Play

Open the [GitHub Pages site](https://rickyhyde-ship-it.github.io/chloes-little-adventure/) on a phone and turn it sideways. Choose **Let's Play Numbers**, **Let's Play Chloieo!**, or **Let's Play Chlio Karts!**. The small speaker button turns sound on or off. In Numbers, tap an activity instruction to hear it again.

There are no lives, game-over screens, ads, purchases, accounts, analytics, or input permissions. No microphone, camera, or location APIs are used. Progress stays in memory and resets when the page reloads. Rotating the device pauses all games and preserves progress.

## Chlio Karts

Choose one of three tracks and one of three speeds before the race: **Gentle**, **Cruise**, or **Zoom**. Chloe accelerates and follows the road automatically. There are exactly three driving buttons: hold **Left** or **Right** to move in that direction on screen, or hold **Brake** to slow down. Keeping Brake held after stopping engages reverse; releasing it accelerates forward again. Left and Right keep the same screen direction while reversing. Simultaneous touch contacts work for steering while braking. Desktop controls: Left/Right arrows or A/D to steer; Down, S, or Space to brake/reverse.

- **Blossom Meadow:** apple and blossom trees, a river and waterfall, rolling hills, and a rainbow loop.
- **Seashell Coast:** turquoise sea, palm trees, shells, a sailboat and a striped lighthouse, with a winding beach straight.
- **Starlight Speedway:** colourful ringed planets, a rocket, crystals and a starry sky, with a wider winding straight.

Every closed circuit has two launch ramps, automatic airborne jumps and a genuine vertical loop with continuous road and camera frames through the upside-down section. Two laps make a race. Race alongside Dino, Bunny and Bee, steer towards golden stars, and drive over mint boost pads. Road edges gently keep Chloe on track; bumps slow her slightly without a failure screen. All finishers receive a cheerful celebration, with stars, jumps, loops and race time. Race again or choose another track; Home returns to the three-game menu.

Orientation changes, hidden tabs and window blur clear held controls. Portrait orientation and hidden tabs pause countdowns, physics, jump motion, rivals and race time. Karts shares the existing music and sound toggle. Returning Home disposes of input listeners, frame loops and GPU resources. A Canvas fallback keeps the driving controls, race simulation and Chloe artwork available if WebGL 2 is unavailable or the graphics context is lost; its scenery is simpler than the 3D renderer.

Chloe's new transparent kart illustration and its final image-generation prompt are documented in [assets/karts/README.md](assets/karts/README.md). Three.js 0.186.1 is bundled locally with its MIT license, and loaded only when Karts is opened. The game remains a static site with no build step and no third-party runtime requests.

## Chloieo

Hold the left or right button on the left side to move; tap the large jump button on the right. Simultaneous touches let one thumb move while the other jumps. Optional desktop controls: arrows/A/D to move and Space/Up/W to jump.

- **Apple Meadow — Easy:** forgiving ground, accessible platform rewards, a few dinosaurs and one bee.
- **Dinosaur Valley — Medium:** more platforms, moving enemies, and gaps to jump.
- **The Webwood — Hard:** narrower platform routes, faster enemies, wider gaps, and a very large spider boss.

Collect apples and bananas on the ground and on elevated platforms. Dinosaurs push Chloe back until she jumps past them. Bees bob vertically and shrink Chloe to half width and height for ten active-play seconds; her jump height also becomes half its normal height. The timer pauses while the game is hidden or in portrait orientation. A repeat bee collision after the brief grace period refreshes the effect.

The giant spider patrols its arena and fires aimed webs, adding a two-web spread during the second half of the fight. Web hits briefly slow Chloe and push her back; jumping remains available. Land on its head while descending **ten separate times** to defeat it. Body contact does not count, and the exit remains locked until it is defeated. Nearby stepping platforms provide alternative approaches. The hit counter is always visible during the fight.

Pink checkpoint flags activate as Chloe passes them. Falling into a gap returns her to the last checkpoint without removing collected fruit. Finish flags lead to the next level; after level three, replay resets all Chloieo progress. Home returns to the three-game menu and disposes of the platformer loop and controls. All three games share the gentle music and sound toggle.

## Run locally

From this folder, run `python -m http.server 4173`, then open `http://localhost:4173`. No build step or runtime package installation is required. Serve over HTTP rather than opening the HTML file directly because the game uses JavaScript modules.

## Files

```text
index.html
css/game.css
css/chloieo.css
css/karts.css
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
  platformer/
    levels.js         # Three difficulty-graded worlds and fruit layouts
    engine.js         # Deterministic movement, collisions and boss mechanics
    render.js         # Canvas scenery, Chloe, enemies and giant spider
    game.js           # Touch controls, camera, overlays and lifecycle
  karts/
    tracks.js         # Three closed circuits, road frames, ramps and loops
    engine.js         # Deterministic driving, rivals, stars, jumps and laps
    render.js         # Local Three.js scenery and Canvas fallback
    scenery.js        # Whole-circuit clearance for decorative assets
    game.js           # Track/speed picker, touch controls and lifecycle
  vendor/             # Bundled Three.js and MIT license
assets/
  karts/chloe-kart.png
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
tests/platformer-engine.mjs
tests/platformer-traversal.mjs
tests/platformer-ui.cjs
tests/karts-engine.mjs
tests/karts-ui.cjs
tests/karts-regressions.mjs
```

## Artwork and audio

Chloe’s three new waving, pointing, and celebrating poses were generated from the supplied character reference. They share a transparent WebP sprite sheet. The fruit, bee, dinosaur, basket, and star are custom SVG prototype illustrations; the backgrounds are CSS scenery. These are deliberately replaceable with painted production artwork through the manifest. The supplied reference is retained for future art work and is not loaded during gameplay.

Narration consists of 20 bundled MP3 clips generated with Microsoft's British female **Sonia Neural** voice at a gently reduced pace, using [edge-tts](https://github.com/rany2/edge-tts) during development. This is synthetic narration rendered to audio files, not a human voice recording. The complete spoken script is in `assets/audio/voice/transcript.json`. There is no browser speech synthesis and no runtime speech-service request; all players hear the same voice. Missing audio stays silent rather than reverting to a device voice.

**Little Wonder** is an original 49-second instrumental loop composed for this game, with soft piano/celesta-like notes and warm sustained harmony at 78 BPM. It starts after Play, loops during the adventure, and automatically lowers beneath narration. Web Audio gain channels keep the balance consistent across devices. The sound button mutes narration, music, and effects together. Home stops all playback; portrait orientation and hidden tabs pause and resume it. Narration never overlaps itself, and the counting animations wait for each recorded number to finish. No audio plays before a user gesture.

Sound effects are synthesized locally with Web Audio. All audio assets are served with the game; there are no analytics, third-party runtime calls, or audio input permissions.

Optional future polish: painted replacements for the SVG scenery and props. Real-device iOS and Android testing is recommended; automated checks use desktop Edge with touch emulation.

## Verification

With the local server running, install development dependencies using `npm install`, then run `npm test` for all three games or `npm run test:karts` for the racer. Tests expect Microsoft Edge by default; set `BROWSER_CHANNEL=chromium` to use Playwright’s Chromium (install it with `npx playwright install chromium`). Karts serves its checked-in Three.js files directly; no package installation is needed for deployment.

The browser tests cover all twelve rounds, wrong choices, counting, replay, home during transitions, secondary pointers, repeated taps, sound toggles, portrait pause/resume, and bounds/target sizes at 844×390, 852×393, 915×412, 1024×768, and 667×375. Audio checks verify every prompt has a decodable clip, music ducking and recovery, overlapping-voice cancellation, no autoplay, independent orientation/tab pauses, and mute/home behavior. Tests check for runtime errors and page scrolling. Screenshots go into the ignored `work` directory.

Chloieo tests cover collision physics, elevated fruit, dinosaur escape, bee oscillation, ten-second shrinking, the half-height jump trajectory, checkpoint retention, webs, boss gating, and ten distinct stomps. A deterministic traversal completes all three levels with movement/jump inputs from their starting positions, without teleporting. Browser tests exercise genuine simultaneous touch contacts, six landscape sizes (including 568×320), paused timers, level/replay UI, disposal, and returning to Numbers. Browser transition tests set up encounter states; physics and full traversal tests cover reaching those outcomes.

Karts engine tests complete nine races from the starting line (all track/speed combinations) with braking, reverse and steering inputs. They check closed tracks, upside-down loop normals, airborne jumps, safe road edges, forward recovery, one-time stars, reverse lap protection and finish stability. Browser tests cover actual simultaneous touches, keyboard input, six landscape sizes including 568×320, orientation/hidden-tab pauses, all three track renderers, Chloe's visibility during loops, replay and track selection, graphics-context loss fallback, Home cleanup, and both original games. Asset requests and runtime errors are checked. Real iOS/Android device checks remain useful beyond desktop Edge touch emulation.

Scenery placements reserve the full footprint of every hill, tree group, crystal group and planet against the entire circuit. Large hills stay outside the circuit. Regression tests check rendered steering direction on straights, bends and loops, in forward and reverse, and raycast the actual scenery meshes across all lanes and the camera clearance. Versioned game entry points refresh changed driving modules after a deployment.

The checked-in renderer subset can be regenerated after `npm ci` with `npm run vendor:karts`. This maintenance command bundles the pinned Three.js dependency and retains its license; ordinary editing and deployment do not require it.

## Publish

GitHub Pages serves the `main` branch at `/` using the standard static Pages build. All game asset references are relative, so project Pages URLs work without a bundler or base-path configuration.

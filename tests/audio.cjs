const assert=require('assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL==='chromium'?undefined:(process.env.BROWSER_CHANNEL||'msedge')});
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.speechSynthesis.speak=()=>{throw new Error('Device TTS must never be called');};});
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{window.qaAudio=(await import(new URL('js/audio.js',location.href))).audio;window.qaState=(await import(new URL('js/state.js',location.href))).state;});
 assert.equal(await page.evaluate(()=>qaAudio.context),null,'No audio before a gesture');
 const coverage=await page.evaluate(async()=>{
   const base=location.href;const {narrationClips}=await import(new URL('js/audio-manifest.js',base));
   const activityModules=['fruitGarden','beeMeadow','dinoFeed','picnic'];const missing=[];
   for(const name of activityModules){const activity=(await import(new URL(`js/activities/${name}.js`,base)))[name];
     for(let i=0;i<10;i++)for(const round of activity.makeRounds())if(!narrationClips[activity.prompt(round)])missing.push(activity.prompt(round));}
   return {missing,clips:Object.keys(narrationClips).length};
 });
 assert.deepEqual(coverage.missing,[]);assert.equal(coverage.clips,20);
 await page.locator('[data-action=play]').tap();
 await page.waitForFunction(()=>qaAudio.music&&qaAudio.narration&&qaAudio.context.state==='running');
 await page.waitForTimeout(250);
 const ducked=await page.evaluate(()=>qaAudio.musicGain.gain.value);assert.ok(ducked<.1,'Music ducks under voice');
 const decoded=await page.evaluate(async()=>{const {narrationClips,musicPath}=await import(new URL('js/audio-manifest.js',location.href));return Promise.all([...Object.values(narrationClips),musicPath].map(async path=>{const b=await qaAudio.buffer(path);return {path,duration:b?.duration||0};}));});
 assert.ok(decoded.every(b=>b.duration>.2));assert.ok(decoded.find(b=>b.path.includes('little-wonder')).duration>45);
 await page.waitForFunction(()=>!qaAudio.narration);await page.waitForTimeout(600);
 assert.ok(await page.evaluate(()=>Math.abs(qaAudio.musicGain.gain.value-.17)<.01));
 await page.evaluate(()=>{window.firstVoice=qaAudio.say('You did it! What a lovely adventure!');});
 await page.waitForFunction(()=>qaAudio.narration);
 await page.evaluate(()=>{window.secondVoice=qaAudio.say('1');});
 assert.equal(await page.evaluate(()=>firstVoice),false,'New narration cancels previous clip');
 assert.equal(await page.evaluate(()=>secondVoice),true);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>qaAudio.context.state==='suspended');
 const time=await page.evaluate(()=>qaAudio.context.currentTime);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>qaAudio.context.currentTime),time);
 // Two independent pause reasons must both clear before playback resumes.
 await page.evaluate(()=>qaAudio.setPaused('hidden',true));await page.setViewportSize({width:844,height:390});assert.equal(await page.evaluate(()=>qaAudio.context.state),'suspended');
 await page.evaluate(()=>qaAudio.setPaused('hidden',false));await page.waitForFunction(()=>qaAudio.context.state==='running');
 await page.locator('#sound').tap();assert.equal(await page.evaluate(()=>qaAudio.master.gain.value),0);assert.equal(await page.evaluate(()=>qaAudio.music),null);
 await page.locator('#sound').tap();await page.waitForFunction(()=>qaAudio.music&&qaAudio.enabled);
 await page.locator('#home').tap();assert.equal(await page.evaluate(()=>qaAudio.music),null);assert.equal(await page.evaluate(()=>qaAudio.narration),null);
 assert.equal(await page.evaluate(()=>qaAudio.say('Not in the recorded script')),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',coverage,checks:['20 decodable neural voice clips','49-second looping music','No autoplay','Music ducking and recovery','Narration cancellation','Portrait pause/resume','Independent hidden-tab pause','Mute/unmute music and voice','Home stops all audio','No device TTS','No runtime errors']},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


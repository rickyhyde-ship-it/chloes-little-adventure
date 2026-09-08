require('fs').mkdirSync('work',{recursive:true});
const assert=require('assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL==='chromium'?undefined:(process.env.BROWSER_CHANNEL||'msedge')}),p=await b.newPage({viewport:{width:844,height:390},hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 assert.equal(await p.locator('[data-action=play]').textContent(),"Let's Play Numbers");
 assert.equal(await p.locator('[data-action=chloieo]').textContent(),"Let's Play Chloieo!");
 await p.locator('[data-action=chloieo]').tap();
 await p.evaluate(async()=>{window.gameModule=await import(new URL('js/game.js',location.href));window.audioModule=await import(new URL('js/audio.js',location.href));});
 const cdp=await p.context().newCDPSession(p);
 const right=await p.locator('[data-control=right]').boundingBox(),jump=await p.locator('[data-control=jump]').boundingBox();
 const r={x:right.x+right.width/2,y:right.y+right.height/2,id:1},j={x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2};
 const start=await p.evaluate(()=>gameModule.runner.world.player.x);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});await p.waitForTimeout(300);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r,j]});await p.waitForTimeout(250);
 assert.ok(await p.evaluate(()=>gameModule.runner.world.player.y<220),'Second simultaneous touch jumps');
 assert.ok(await p.evaluate(()=>gameModule.runner.input.right),'Right remains held while jumping');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[r]});await p.waitForTimeout(120);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(await p.evaluate(()=>gameModule.runner.world.player.x)>start+80);
 assert.equal(await p.evaluate(()=>gameModule.runner.input.right),false);
 await p.evaluate(()=>gameModule.runner.world.shrink());
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);
 const paused=await p.evaluate(()=>({time:gameModule.runner.world.time,small:gameModule.runner.world.player.small}));
 await p.waitForTimeout(350);assert.deepEqual(await p.evaluate(()=>({time:gameModule.runner.world.time,small:gameModule.runner.world.player.small})),paused);
 assert.equal(await p.locator('#orientation').isVisible(),true);
 await p.setViewportSize({width:844,height:390});
 const layouts=[];
 for(const [width,height] of [[844,390],[852,393],[915,412],[1024,768],[667,375],[568,320]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(80);
  const bounds=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,buttons:[...document.querySelectorAll('[data-control]')].map(e=>e.getBoundingClientRect().toJSON())}));
  assert.equal(bounds.sw,width);assert.equal(bounds.sh,height);
  for(const x of bounds.buttons){assert.ok(x.width>=72&&x.height>=72);assert.ok(x.x>=0&&x.y>=0&&x.right<=width&&x.bottom<=height);}
  layouts.push(`${width}x${height}`);
 }
 await p.setViewportSize({width:844,height:390});
 // Test actual transition UI, carrying rewards between levels.
 for(let level=0;level<2;level++){
  await p.evaluate(()=>{const w=gameModule.runner.world;w.score.apple=7;w.player.x=w.level.length-100;});
  await p.locator('[data-runner-next]').waitFor({state:'visible'});await p.locator('[data-runner-next]').tap();
  assert.equal(await p.evaluate(()=>gameModule.runner.world.levelIndex),level+1);assert.equal(await p.evaluate(()=>gameModule.runner.world.score.apple),7);
 }
 await p.evaluate(()=>{const w=gameModule.runner.world;w.player.x=4180;w.boss.active=true;w.camera=3820;});
 await p.waitForTimeout(300);await p.screenshot({path:'work/chloieo-spider.png'});
 // Physics of ten stomps is tested separately; here verify the resulting victory/replay screen.
 await p.evaluate(()=>{const w=gameModule.runner.world;w.boss.hits=10;w.boss.defeated=true;w.player.x=5020;});
 await p.locator('[data-runner-next]').waitFor({state:'visible'});assert.ok((await p.locator('.runner-card h2').textContent()).includes('champion'));
 await p.setViewportSize({width:568,height:320});await p.waitForTimeout(100);const nextBox=await p.locator('[data-runner-next]').boundingBox();assert.ok(nextBox.height>=72&&nextBox.y>=0&&nextBox.y+nextBox.height<=320);await p.setViewportSize({width:844,height:390});
 await p.locator('[data-runner-next]').tap();assert.equal(await p.evaluate(()=>gameModule.runner.world.levelIndex),0);assert.equal(await p.evaluate(()=>gameModule.runner.world.score.apple),0);
 await p.locator('#home').tap();assert.equal(await p.evaluate(()=>gameModule.runner),null);assert.equal(await p.evaluate(()=>audioModule.audio.music),null);
 await p.locator('[data-action=play]').tap();assert.equal(await p.locator('.fruit-choice').count(),3);await p.locator('#home').tap();
 await p.locator('[data-action=chloieo]').tap();assert.equal(await p.evaluate(()=>gameModule.runner.world.levelIndex),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',checks:['Both menu buttons','Real simultaneous touch movement/jump','Touch release','Orientation pauses physics and shrink timer','Checkpoint/level UI and carried rewards','Spider presentation','Victory/replay','Home destroys controller and music','Numbers remains accessible','No runtime errors'],layouts},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});


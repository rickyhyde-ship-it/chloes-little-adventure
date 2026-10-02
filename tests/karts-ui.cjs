const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
fs.mkdirSync('work',{recursive:true});
const sizes=[[844,390],[852,393],[915,412],[1024,768],[667,375],[568,320]];
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL==='chromium'?undefined:(process.env.BROWSER_CHANNEL||'msedge')});
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{window.gameModule=await import(document.querySelector('script[type=module]').src);window.audioModule=await import(new URL('js/audio.js',location.href));});
  const layouts=[];
  async function layout(selector,label,min=44){
    for(const [width,height] of sizes){
      await page.setViewportSize({width,height});await page.waitForTimeout(60);
      const boxes=await page.locator(selector).evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));
      assert.ok(boxes.length>0);
      for(const b of boxes){assert.ok(b.width>=min&&b.height>=min,`${label} small target ${width}: ${JSON.stringify(b)}`);assert.ok(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1,`${label} clipped ${width}: ${JSON.stringify(b)}`);}
      const bounds=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]);assert.deepEqual(bounds,[width,height]);layouts.push(`${label} ${width}x${height}`);
    }
    await page.setViewportSize({width:844,height:390});
  }
  await layout('.home-buttons button','four-game menu',72);
  await page.locator('[data-action=karts]').tap();await page.locator('[data-kart-start]').waitFor();
  assert.equal(await page.locator('[data-kart-track]').count(),3);assert.equal(await page.locator('[data-kart-speed]').count(),3);
  await layout('[data-kart-track],[data-kart-speed],[data-kart-start]','track picker');
  await page.screenshot({path:'work/karts-picker-mobile.png'});
  await page.locator('[data-kart-track="1"]').tap();await page.locator('[data-kart-speed="2"]').tap();await page.locator('[data-kart-start]').tap();
  assert.equal(await page.evaluate(()=>gameModule.runner.world.trackIndex),1);assert.equal(await page.evaluate(()=>gameModule.runner.world.speedIndex),2);
  assert.equal(await page.evaluate(()=>gameModule.runner.renderer.constructor.name),'KartRenderer','WebGL scenery renders');
  await page.waitForFunction(()=>gameModule.runner.world.status==='racing');
  assert.equal(await page.locator('[data-kart-control]').count(),3);await page.waitForTimeout(800);
  const start=await page.evaluate(()=>gameModule.runner.world.distance);await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>gameModule.runner.world.distance)>start,'Automatic forward motion');
  const cdp=await page.context().newCDPSession(page),box=await page.locator('[data-kart-control=right]').boundingBox(),brakeBox=await page.locator('[data-kart-control=brake]').boundingBox();
  const right={x:box.x+box.width/2,y:box.y+box.height/2,id:2},brake={x:brakeBox.x+brakeBox.width/2,y:brakeBox.y+brakeBox.height/2,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[brake]});await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[brake,right]});await page.waitForTimeout(250);
  assert.deepEqual(await page.evaluate(()=>[gameModule.runner.input.right,gameModule.runner.input.brake]),[true,true],'Genuine simultaneous touches');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[right]});await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>gameModule.runner.input.right),false);assert.ok(await page.evaluate(()=>gameModule.runner.world.speed)<0,'Brake hold reverses');
  const reverse=await page.evaluate(()=>gameModule.runner.world.distance);await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>gameModule.runner.world.distance)<reverse);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>gameModule.runner.world.speed>0);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>gameModule.runner.input.left),true);
  await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowDown');assert.equal(await page.evaluate(()=>gameModule.runner.input.brake),true);await page.keyboard.up('ArrowDown');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
  const paused=await page.evaluate(()=>({time:gameModule.runner.world.time,distance:gameModule.runner.world.distance,countdown:gameModule.runner.world.countdown}));
  await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>({time:gameModule.runner.world.time,distance:gameModule.runner.world.distance,countdown:gameModule.runner.world.countdown})),paused);assert.equal(await page.locator('#orientation').isVisible(),true);
  await page.setViewportSize({width:844,height:390});await layout('[data-kart-control]','race controls',72);
  // A true hidden-tab event, without navigating or replacing the controller.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(80);const hidden=await page.evaluate(()=>gameModule.runner.world.time);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>gameModule.runner.world.time),hidden);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  // Physics reaches every lap separately in engine tests. Inspect the actual
  // browser graphics and outcome controls at the important camera positions.
  for(let track=0;track<3;track++) {
    await page.evaluate(i=>{const g=gameModule.runner;g.trackIndex=i;g.speedIndex=1;g.start();},track);
    await page.evaluate(()=>{const w=gameModule.runner.world;w.status='racing';w.distance=65;});await page.waitForTimeout(100);await page.screenshot({path:`work/karts-${track}-scenery.png`});
    for(const fraction of [.24,.5,.76]){
      await page.evaluate(f=>{const w=gameModule.runner.world,loop=w.track.features.find(f=>f.type==='loop');w.distance=loop.start+(loop.end-loop.start)*f;w.jumpHeight=0;w.speed=0;},fraction);await page.waitForTimeout(80);
      const corners=await page.evaluate(()=>{const r=gameModule.runner.renderer,a=r.chloe.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>{const p=r.chloe.position.clone().set(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(r.chloe.matrixWorld).project(r.camera);return [p.x,p.y,p.z];});});
      assert.ok(corners.every(p=>Math.abs(p[0])<.99&&Math.abs(p[1])<.99&&p[2]>-1&&p[2]<1),`Chloe stays visible through track ${track} loop at ${fraction}`);
      await page.screenshot({path:`work/karts-${track}-loop-${fraction}.png`});
    }
    await page.evaluate(()=>{const w=gameModule.runner.world;w.distance=w.track.length*w.track.laps-1;w.speed=44;});await page.locator('[data-kart-again]').waitFor();
    assert.ok((await page.locator('.kart-result h2').textContent()).includes('you did it'));await layout('[data-kart-again],[data-kart-choose]','finish screen');
    await page.locator('[data-kart-again]').tap();assert.equal(await page.evaluate(()=>gameModule.runner.world.stars),0);assert.equal(await page.evaluate(()=>gameModule.runner.world.distance),0);assert.equal(await page.evaluate(()=>gameModule.runner.world.status),'countdown');
  }
  // Context loss retains progress and switches to playable Canvas rendering.
  await page.evaluate(()=>{const g=gameModule.runner;g.world.status='racing';g.world.distance=300;g.renderer.renderer.forceContextLoss();});
  await page.waitForFunction(()=>gameModule.runner.renderer.constructor.name==='CanvasKartRenderer');
  assert.ok(await page.evaluate(()=>gameModule.runner.world.distance)>=300);await page.waitForTimeout(100);
  await page.evaluate(()=>{gameModule.runner.world.distance=gameModule.runner.world.track.length*2-1;gameModule.runner.world.speed=44;});await page.locator('[data-kart-choose]').waitFor();await page.locator('[data-kart-choose]').tap();await page.locator('[data-kart-start]').waitFor();
  await page.locator('#home').tap();assert.equal(await page.evaluate(()=>gameModule.runner),null);assert.equal(await page.evaluate(()=>audioModule.audio.music),null);
  await page.locator('[data-action=play]').tap();assert.equal(await page.locator('.fruit-choice').count(),3);await page.locator('#home').tap();
  await page.locator('[data-action=chloieo]').tap();assert.equal(await page.locator('[data-control=jump]').count(),1);await page.locator('#home').tap();
  await page.locator('[data-action=karts]').tap();await page.locator('[data-kart-start]').waitFor();assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  console.log(JSON.stringify({result:'PASS',checks:['Four-game menu','Three tracks and speeds','WebGL scenery','Exactly three driving buttons','Real simultaneous steer and brake','Brake and reverse','Keyboard','Orientation/tab pauses','All track camera positions','Finish/replay/track selection','Context loss fallback','Lifecycle and both original games','No runtime or asset errors'],layouts},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

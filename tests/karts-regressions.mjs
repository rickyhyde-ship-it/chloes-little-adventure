import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import * as THREE from 'three';
import { KartWorld } from '../js/karts/engine.js';
import { makeTrack, sampleTrack, add, mul } from '../js/karts/tracks.js';
import { sceneryAnchor, nearestRoad } from '../js/karts/scenery.js';

// Reproduce the original oversized hill placement, then require its complete
// footprint to clear the road after relocation on every circuit.
for(let index=0;index<3;index++) {
  const track=makeTrack(index);let overlaps=0;
  for(let i=0;i<14;i++) {
    const original=[Math.sin(i*9.1)*350,-8,Math.cos(i*7)*350+160],radius=Math.max(60+i%3*25,70);
    if(nearestRoad(track,original).distance<radius+10.4)overlaps++;
    const p=sceneryAnchor(track,original,radius,{background:true});
    assert.ok(nearestRoad(track,p).distance-radius>=35.4-.001,'Full hill footprint outside road and camera margin');
  }
  assert.ok(overlaps>0,'Regression reproduces hills occupying the track');
  for(const input of [{left:true,brake:true},{right:true,brake:true}]) {
    const world=new KartWorld(index);world.status='racing';world.distance=50;world.speed=-5;
    for(let i=0;i<60;i++)world.update(1/120,input);
    assert.ok(input.left?world.lane<0:world.lane>0,'Lane controls keep their direction while reversing');
  }
}

const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL==='chromium'?undefined:(process.env.BROWSER_CHANNEL||'msedge')});
try {
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('[data-action=karts]').tap();await page.locator('[data-kart-start]').tap();
  await page.evaluate(async()=>window.kartGame=(await import(document.querySelector('script[type=module]').src)).runner);
  const screenX=()=>page.evaluate(()=>{const r=kartGame.renderer;return r.chloe.position.clone().project(r.camera).x;});
  const evidence=[];
  for(let index=0;index<3;index++) {
    await page.evaluate(i=>{kartGame.trackIndex=i;kartGame.start();kartGame.world.status='racing';},index);
    const track=makeTrack(index),loop=track.features.find(f=>f.type==='loop');
    // Check the rendered kart, not just the sign of the physics lane. This
    // catches the camera's mirrored axis on straights, bends and in the loop.
    for(const d of [45,track.length*.43,(loop.start+loop.end)/2]) {
      for(const control of ['left','right'])for(const reverse of [false,true]) {
        await page.evaluate(({d,reverse})=>{const g=kartGame,w=g.world;g.clearInput();w.status='racing';w.distance=d;w.speed=reverse?-5:0;w.lane=0;w.steer=0;w.jumpHeight=0;w.rivals.forEach(r=>r.distance=d+100);g.renderer.render();},{d,reverse});
        const from=await screenX();
        const button=await page.locator(`[data-kart-control="${control}"]`).boundingBox();
        await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();
        if(reverse)await page.keyboard.down('ArrowDown');
        await page.waitForTimeout(250);const to=await screenX();
        await page.mouse.up();if(reverse)await page.keyboard.up('ArrowDown');
        assert.ok(control==='left'?to<from-.008:to>from+.008,`${track.name}: ${control} moves the kart ${control} on screen, ${reverse?'reverse':'forward'} at ${d}`);
      }
    }
    const data=await page.evaluate(()=>({bounds:kartGame.renderer.sceneryBounds,meshes:kartGame.renderer.scene.children.filter(m=>m.userData.scenery).map(m=>({positions:Array.from(m.geometry.attributes.position.array),indices:m.geometry.index?Array.from(m.geometry.index.array):null,matrices:Array.from(m.instanceMatrix.array),count:m.count}))}));
    for(const b of data.bounds)assert.ok(nearestRoad(track,b.position).distance-b.radius>=15.4-.001,`${track.name}: whole scenery group clears the track`);
    // Raycast the actual rendered geometry independently of the placement
    // helper. Solid scenery must not cross any lane or the chase camera path.
    const scenery=data.meshes.map(data=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));if(data.indices)geometry.setIndex(data.indices);
      const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),data.count);
      for(let i=0;i<data.count;i++)mesh.setMatrixAt(i,new THREE.Matrix4().fromArray(data.matrices,i*16));mesh.updateMatrixWorld(true);return mesh;
    });
    let rays=0;
    for(let d=0;d<track.length;d+=6)for(const lane of [-8,0,8]) {
      const s=sampleTrack(track,d),base=add(s.p,mul(s.right,lane)),origin=add(base,mul(s.up,12));
      const ray=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...mul(s.up,-1)),0,11.7);
      const hits=ray.intersectObjects(scenery,false);assert.equal(hits.length,0,`${track.name}: decorative geometry covers the road at ${d}m, lane ${lane}`);rays++;
    }
    scenery.forEach(m=>{m.geometry.dispose();m.material.dispose();});
    await page.evaluate(()=>{const w=kartGame.world;w.distance=w.track.length*.75;w.lane=0;w.speed=0;kartGame.renderer.render();});
    await page.screenshot({path:`work/karts-clear-track-${index}.png`});evidence.push({track:track.name,rays,sceneryGroups:data.bounds.length});
  }
  // The lightweight fallback uses the same intuitive screen directions.
  await page.evaluate(()=>kartGame.renderer.renderer.forceContextLoss());await page.waitForFunction(()=>kartGame.renderer.constructor.name==='CanvasKartRenderer');
  for(const control of ['left','right']){
    await page.evaluate(()=>{const w=kartGame.world;w.status='racing';w.lane=0;w.steer=0;w.speed=0;});
    await page.keyboard.down(control==='left'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(200);await page.keyboard.up(control==='left'?'ArrowLeft':'ArrowRight');
    const lane=await page.evaluate(()=>kartGame.world.lane);assert.ok(control==='left'?lane<0:lane>0);
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:['Original hill overlap reproduced','Whole scenery groups clear every road section','Actual mesh raycasts across all lanes','Rendered left/right steering on straights, bends and loops','Consistent reverse steering','Canvas fallback directions'],evidence},null,2));
} finally {await browser.close();}

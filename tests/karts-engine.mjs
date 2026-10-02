import assert from 'node:assert/strict';
import { KartWorld, crossed } from '../js/karts/engine.js';
import { makeTrack, sampleTrack, SPEEDS, length } from '../js/karts/tracks.js';
const run=(w,seconds,input={})=>{for(let i=0;i<seconds*120;i++)w.update(1/120,input);};
const results=[];
for(let trackIndex=0;trackIndex<3;trackIndex++) {
  const track=makeTrack(trackIndex);
  assert.ok(length(track.samples[0].p.map((v,i)=>v-track.samples.at(-1).p[i]))<.001,'Closed circuit');
  assert.equal(track.features.filter(f=>f.type==='loop').length,1);assert.equal(track.features.filter(f=>f.type==='jump').length,2);
  for(const [i,s] of track.samples.entries()) {
    assert.ok([...s.p,...s.up,...s.forward,...s.right].every(Number.isFinite));
    for(const axis of [s.up,s.forward,s.right])assert.ok(Math.abs(length(axis)-1)<.00001);
    if(i)assert.ok(s.d>track.samples[i-1].d);
  }
  const loop=track.features.find(f=>f.type==='loop'),top=sampleTrack(track,(loop.start+loop.end)/2);
  assert.ok(top.up[1]<-.99,'The loop actually turns upside down');assert.ok(top.p[1]>45);
  for(let speedIndex=0;speedIndex<3;speedIndex++) {
    const world=new KartWorld(trackIndex,speedIndex);world.start();run(world,3.1);
    assert.equal(world.status,'racing');run(world,20);
    assert.ok(world.speed>SPEEDS[speedIndex].speed*.7);const from=world.distance;
    run(world,3,{brake:true});assert.ok(world.speed<0,'Holding brake reverses');assert.ok(world.distance<from+35);
    const after=world.distance;run(world,1,{brake:true});assert.ok(world.distance<after);
    run(world,4);assert.ok(world.speed>0,'Release resumes auto acceleration');
    run(world,2,{left:true});assert.equal(world.lane,-7.3,'Safe road edge');run(world,4,{right:true});assert.equal(world.lane,7.3);
    run(world,1.5,{left:true});
    let airborne=false;const completedEvents=[];
    for(let i=0;i<250*120&&world.status!=='finished';i++) {
      world.update(1/120);airborne ||=world.jumpHeight>1;completedEvents.push(...world.events.splice(0));
    }
    assert.equal(world.status,'finished','Full race from start with input, without teleporting');
    assert.ok(airborne);assert.ok(world.jumps>=4);assert.equal(world.loops,2);assert.ok(world.stars>0);
    assert.ok(world.position>=1&&world.position<=4);assert.equal(world.lap,2);assert.equal(world.progress,1);assert.equal(completedEvents.filter(e=>e==='finish').length,1);
    const final=world.distance;run(world,5,{brake:true});assert.equal(world.distance,final,'Finish is stable');
    results.push(`${track.name} / ${SPEEDS[speedIndex].label}`);
  }
}
assert.equal(crossed(90,110,100,1000),true);assert.equal(crossed(110,90,100,1000),false);assert.equal(crossed(1090,1110,100,1000),true);
const w=new KartWorld();w.start();run(w,3.1);run(w,4,{brake:true});assert.ok(w.distance<0);assert.equal(w.lap,1);assert.equal(w.stars,0);
run(w,2);w.distance=34;w.speed=22;w.lane=0;run(w,.2);const stars=w.stars;w.distance=34;run(w,.2);assert.equal(w.stars,stars,'No duplicate stars from reversing and recrossing');
console.log(JSON.stringify({result:'PASS',checks:['Nine full races','Three speeds','Brake then reverse','Auto acceleration on release','Safe steering edges','Real vertical loop frames','Automatic airborne jumps','No reverse lap or star exploits','Stable finish'],races:results},null,2));

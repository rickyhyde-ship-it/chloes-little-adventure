import assert from 'node:assert/strict';
import { FishingWorld } from '../js/fishing/engine.js';
import { SPECIES, freshProgress, cleanProgress, costFor, loadProgress, saveProgress, STORAGE_KEY } from '../js/fishing/data.js';
function stepUntil(w,status,input={},tap=false){for(let i=0;i<120*60;i++){if(w.status===status)return;if(tap&&i%20===0)w.tap();w.update(1/120,typeof input==='function'?input(w):input);}assert.fail(`Did not reach ${status} from ${w.status}`);}
const launch=(p=freshProgress(),zone=0,weak=false)=>{const w=new FishingWorld(p,zone);w.aim();if(weak)w.time=Math.PI/5.2;w.cast();stepUntil(w,'dive');return w;};
const perfect=launch(),weak=launch(freshProgress(),0,true);
assert.equal(perfect.quality,1);assert.ok(weak.quality<.001);assert.ok(perfect.hook.x>weak.hook.x);assert.ok(perfect.depthLimit>weak.depthLimit);assert.equal(perfect.bounces,1);
const upgraded=freshProgress();upgraded.upgrades.strength=5;upgraded.upgrades.rebound=4;const skips=launch(upgraded);assert.equal(skips.bounces,4);assert.ok(skips.hook.x>perfect.hook.x);
assert.equal(perfect.chooseZone(1),false);assert.equal(perfect.buy('weight'),false);
const plain=launch(),tapping=launch();stepUntil(plain,'reel');stepUntil(tapping,'reel',{},true);assert.ok(tapping.depth>plain.depth+20,'Dive taps extend depth beyond the unaided descent');assert.ok(tapping.depth<=tapping.maxDepth/4+.1);
const steering=launch();const x=steering.hook.x;for(let i=0;i<30;i++)steering.update(1/120,{left:true});assert.ok(steering.hook.x<x);for(let i=0;i<1000;i++)steering.update(1/120,{right:true});assert.ok(steering.hook.x<=964);
// Catching is on the upward journey, and each friend/reward is counted once.
const catches=launch();catches.hook.y=200;catches.depth=50;catches.fish=Array.from({length:6},(_,i)=>({id:i,species:SPECIES[i%2],x:catches.hook.x,y:180-i*20,baseY:180-i*20,phase:0,speed:0,direction:1,caught:false}));catches.reel();stepUntil(catches,'result');assert.equal(catches.caught.length,3);assert.equal(Object.values(catches.result.counts).reduce((a,b)=>a+b,0),3);assert.equal(catches.progress.casts,1);assert.equal(catches.progress.coins,catches.result.coins);const reward=catches.progress.coins;catches.finish();for(let i=0;i<100;i++)catches.update(1/120);assert.equal(catches.progress.coins,reward);
const empty=launch();empty.fish=[];empty.reel();stepUntil(empty,'result');assert.ok(empty.result.coins>=3,'An empty cast can still fund future upgrades');
// Full casts use only steering/tapping inputs from launch to result.
const voyages=[];
for(let zone=0;zone<3;zone++){
  const p=freshProgress();p.record=400;for(const key of Object.keys(p.upgrades))p.upgrades[key]=4;
  const w=launch(p,zone);stepUntil(w,'reel',{},true);stepUntil(w,'result',w=>{
    const target=w.fish.filter(f=>!f.caught&&f.y<=w.hook.y+25&&f.y>w.hook.y-220).sort((a,b)=>Math.abs(a.x-w.hook.x)+Math.abs(a.y-w.hook.y)-Math.abs(b.x-w.hook.x)-Math.abs(b.y-w.hook.y))[0];
    return target?{left:target.x<w.hook.x-5,right:target.x>w.hook.x+5}:{};
  });assert.ok(w.caught.length>0,`Full cast catches friends in zone ${zone}`);assert.ok(w.depth>150);assert.ok(w.caught.every(id=>SPECIES.find(s=>s.id===id).zone===zone));voyages.push({zone:w.zone.name,depth:Math.floor(w.depth),caught:w.caught.length,coins:w.result.coins});
  const max=freshProgress();max.record=600;max.upgrades.weight=8;const deep=launch(max,zone);assert.ok(SPECIES.filter(s=>s.zone===zone).every(s=>deep.fish.some(f=>f.species.id===s.id)),`All species spawn within upgraded gear's reach in ${zone}`);
}
const wallet=freshProgress();wallet.coins=10000;const shop=new FishingWorld(wallet);for(let i=0;i<8;i++){const before=shop.progress.coins;assert.equal(shop.buy('weight'),true);assert.equal(before-shop.progress.coins,costFor('weight',i));}assert.equal(shop.buy('weight'),false);assert.equal(shop.buy('unknown'),false);shop.progress.record=120;assert.equal(shop.chooseZone(1),true);assert.equal(shop.chooseZone(2),false);shop.progress.record=280;assert.equal(shop.chooseZone(2),true);
const unlock=launch();unlock.depth=125;unlock.fish=[];unlock.reel();stepUntil(unlock,'result');assert.deepEqual(unlock.result.newZones,[1]);
const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};assert.equal(saveProgress(storage,catches.progress),true);assert.deepEqual(loadProgress(storage),catches.progress);map.set(STORAGE_KEY,'broken');assert.deepEqual(loadProgress(storage),freshProgress());assert.deepEqual(loadProgress(null),freshProgress());assert.equal(saveProgress(null,catches.progress),false);
const safe=cleanProgress({coins:Infinity,record:-1,casts:'100',upgrades:{weight:99},collection:{minnow:4,unknown:900}});assert.equal(safe.coins,0);assert.equal(safe.record,0);assert.equal(safe.upgrades.weight,8);assert.deepEqual(safe.collection,{minnow:4});
console.log(JSON.stringify({result:'PASS',checks:['Timed cast power','Real water bounces and upgrade effect','Tap-extended dive','Left/right hook steering','Upward catch capacity and single reward','Empty-cast progress','Three full input-driven voyages','All twelve species reachable','Upgrade costs, limits and area unlocks','Saved progress and corrupt/unavailable storage'],voyages},null,2));

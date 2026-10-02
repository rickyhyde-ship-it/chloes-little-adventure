import { ZONES, SPECIES, UPGRADES, MAX_LEVEL, costFor, cleanProgress } from './data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function randomFor(seed){let n=seed>>>0;return()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
export class FishingWorld {
  constructor(progress,zone=0) {
    this.progress=cleanProgress(progress);this.zoneIndex=0;this.chooseZone(zone);this.status='dock';this.time=0;this.events=[];this.castNumber=this.progress.casts;this.hook={x:250,y:-65,vx:0,vy:0};this.fish=[];this.caught=[];this.depth=0;this.cameraY=0;
  }
  get zone(){return ZONES[this.zoneIndex];}
  get capacity(){return 3+this.progress.upgrades.resistance;}
  get meter(){return (Math.sin(this.time*2.6)+1)/2;}
  get unlocked(){return ZONES.map(z=>this.progress.record>=z.unlock);}
  chooseZone(index){if(Number.isInteger(index)&&ZONES[index]&&this.progress.record>=ZONES[index].unlock&&(!this.status||['dock','result'].includes(this.status))){this.zoneIndex=index;return true;}return false;}
  buy(id){const u=UPGRADES.find(u=>u.id===id);if(!u||!['dock','result'].includes(this.status))return false;const level=this.progress.upgrades[id],cost=costFor(id,level);if(level>=MAX_LEVEL||this.progress.coins<cost)return false;this.progress.coins-=cost;this.progress.upgrades[id]++;this.events.push('upgrade');return true;}
  aim(){if(!['dock','result'].includes(this.status))return false;this.status='aim';this.time=0;this.hook={x:250,y:-65,vx:0,vy:0};this.caught=[];this.fish=[];this.depth=0;this.cameraY=0;this.events.push('aim');return true;}
  cast(){
    if(this.status!=='aim')return false;
    this.quality=1-Math.abs(this.meter-.5)*2;this.castLabel=this.quality>.78?'Brilliant cast!':this.quality>.38?'Lovely cast!':'A little cast!';
    const u=this.progress.upgrades;this.depthLimit=(75+u.weight*32)*4*(.7+this.quality*.6);this.maxDepth=this.depthLimit*1.45;
    this.hook.vx=(155+u.strength*26)*(.6+this.quality*.55);this.hook.vy=-95-this.quality*85;
    this.bouncesLeft=1+Math.floor(u.rebound*.75);this.bounces=0;this.castTime=0;this.diveTime=0;this.lastTap=-1;this.pendingReward=null;this.castNumber++;this.spawnFish();this.status='flight';this.events.push('cast');return true;
  }
  spawnFish(){
    const rng=randomFor(1987+this.castNumber*137+this.zoneIndex*1709),species=SPECIES.filter(s=>s.zone===this.zoneIndex);this.fish=[];
    for(let y=40,row=0;y<this.maxDepth+60;y+=88,row++)for(let i=0;i<3;i++){
      const choices=species.filter(s=>s.min<=y/4);if(!choices.length)continue;const s=choices[Math.floor(rng()*choices.length)];
      this.fish.push({id:this.fish.length,species:s,x:95+i*290+rng()*160,y:y+rng()*35,baseY:y+rng()*35,direction:rng()>.5?1:-1,speed:12+rng()*16,phase:rng()*6.28,caught:false});
    }
  }
  tap(){if(this.status==='aim')return this.cast();if(this.status!=='dive'||this.time-this.lastTap<.12)return false;this.lastTap=this.time;this.hook.vy=Math.min(175,this.hook.vy+30);this.depthLimit=Math.min(this.maxDepth,this.depthLimit+16);this.events.push('diveTap');return true;}
  reel(){if(this.status!=='dive')return false;this.status='reel';this.events.push('reel');return true;}
  update(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,1/30);this.time+=dt;
    if(['dock','result','aim'].includes(this.status))return;
    this.castTime+=dt;const previous={...this.hook};
    for(const f of this.fish){if(f.caught)continue;f.x+=f.direction*f.speed*dt;if(f.x<40||f.x>960){f.x=clamp(f.x,40,960);f.direction*=-1;}f.y=f.baseY+Math.sin(this.time*1.1+f.phase)*7;}
    if(this.status==='flight'){
      const h=this.hook;h.vy+=360*dt;h.x=clamp(h.x+h.vx*dt,40,940);h.y+=h.vy*dt;
      if(h.y>=0&&h.vy>0){h.y=0;if(this.bouncesLeft>0){this.bouncesLeft--;this.bounces++;h.vy=-Math.max(75,h.vy*.5);h.vx*=.73;this.events.push('bounce');}else{this.status='dive';h.vy=74;h.vx=0;this.events.push('splash');}}
    }else{
      const direction=(input.right?1:0)-(input.left?1:0),h=this.hook;
      h.x=clamp(h.x+direction*235*dt,36,964);
      if(Number.isFinite(input.targetX))h.x+=clamp(input.targetX-h.x,-320*dt,320*dt);
      if(this.status==='dive'){
        this.diveTime+=dt;h.vy=Math.max(76,h.vy-27*dt);h.y+=h.vy*dt;this.depth=Math.max(this.depth,h.y/4);
        if(h.y>=this.depthLimit||this.diveTime>13){h.y=Math.min(h.y,this.depthLimit);this.reel();}
      }else if(this.status==='reel'){
        h.y=Math.max(0,h.y-(125+this.progress.upgrades.weight*12)*dt);
        for(const f of this.fish){if(f.caught||this.caught.length>=this.capacity)continue;if(segmentDistance(f.x,f.y,previous,h)<f.species.size*.6+23){f.caught=true;this.caught.push(f.species.id);this.events.push('fish');}}
        if(this.caught.length===this.capacity&&!this.fullNoticed){this.fullNoticed=true;this.events.push('full');}
        if(h.y===0)this.finish();
      }
    }
    this.cameraY+=((Math.max(0,this.hook.y-150))-this.cameraY)*Math.min(1,dt*6);
  }
  finish(){
    if(this.status!=='reel')return;
    const oldRecord=this.progress.record,previousUnlocks=this.unlocked,counts={};for(const id of this.caught)counts[id]=(counts[id]||0)+1;
    const newSpecies=Object.keys(counts).filter(id=>!this.progress.collection[id]);
    const fishCoins=this.caught.reduce((n,id)=>n+SPECIES.find(s=>s.id===id).value,0),exploreCoins=Math.max(3,Math.floor(this.depth/18)),coins=fishCoins+exploreCoins;
    this.progress.coins+=coins;this.progress.casts++;this.progress.record=Math.max(oldRecord,Math.floor(this.zone.base+this.depth));
    for(const [id,n] of Object.entries(counts))this.progress.collection[id]=(this.progress.collection[id]||0)+n;
    this.result={coins,fishCoins,exploreCoins,depth:Math.floor(this.depth),counts,newSpecies,bounces:this.bounces,newRecord:this.progress.record>oldRecord,newZones:this.unlocked.flatMap((yes,i)=>yes&&!previousUnlocks[i]?[i]:[])};
    this.fullNoticed=false;this.status='result';this.events.push('finish');
  }
}

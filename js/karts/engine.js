import { makeTrack, sampleTrack, SPEEDS, mod } from './tracks.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
// Crossings use absolute progress, never modulo alone: reversing across the
// start line cannot grant laps, stars or a second copy of a jump reward.
export function crossed(from,to,at,length) {
  if(to<=from)return false;
  const lap=Math.floor((to-at)/length);
  return from<at+lap*length && to>=at+lap*length;
}
export class KartWorld {
  constructor(trackIndex=0,speedIndex=0) {
    this.trackIndex=trackIndex;this.track=makeTrack(trackIndex);this.speedIndex=clamp(speedIndex,0,2);
    this.status='ready';this.countdown=3;this.time=0;this.raceTime=0;
    this.distance=0;this.furthest=0;this.speed=0;this.lane=0;this.steer=0;
    this.jumpHeight=0;this.jumpVelocity=0;this.boost=0;this.stars=0;
    this.collected=new Set();this.events=[];this.brakeHeld=0;this.jumps=0;this.loops=0;
    this.rivals=[{name:'Dino',color:'#83bc80',distance:5,lane:-4,pace:.93},{name:'Bunny',color:'#eee0e9',distance:10,lane:4,pace:.97},{name:'Bee',color:'#f3cd63',distance:16,lane:0,pace:1.01}];
  }
  start(){this.status='countdown';}
  get lap(){return Math.min(this.track.laps,Math.floor(this.furthest/this.track.length)+1);}
  get position(){return this.finishPosition||1+this.rivals.filter(r=>r.distance>this.distance).length;}
  get progress(){return clamp(this.furthest/(this.track.length*this.track.laps),0,1);}
  get sample(){return sampleTrack(this.track,this.distance);}
  update(dt,input={}) {
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,1/30);
    if(this.status==='ready'||this.status==='finished')return;
    this.time+=dt;
    if(this.status==='countdown') {
      const old=Math.ceil(this.countdown);this.countdown=Math.max(0,this.countdown-dt);
      if(Math.ceil(this.countdown)!==old)this.events.push('count');
      if(!this.countdown){this.status='racing';this.events.push('go');}
      return;
    }
    this.raceTime+=dt;this.boost=Math.max(0,this.boost-dt);
    const cruise=SPEEDS[this.speedIndex].speed, previous=this.distance;
    if(input.brake) {
      this.brakeHeld+=dt;
      // Brake first; only engage reverse after coming fully to rest.
      this.speed=approach(this.speed,this.speed>0?0:-cruise*.32,38*dt);
    } else {this.brakeHeld=0;this.speed=approach(this.speed,cruise*(this.boost>0?1.32:1),15*dt);}
    const direction=(input.right?1:0)-(input.left?1:0);
    this.steer=approach(this.steer,direction,7*dt);
    // These are child-friendly lane controls: Left remains left in reverse.
    this.lane=clamp(this.lane+this.steer*8*dt,-7.3,7.3);
    this.distance=Math.max(-25,this.distance+this.speed*dt);this.furthest=Math.max(this.furthest,this.distance);
    for(const feature of this.track.features) {
      if(feature.type==='jump'&&crossed(previous,this.distance,feature.launch,this.track.length)&&this.jumpHeight===0) {
        this.jumpVelocity=9.5;this.jumpHeight=.01;this.jumps++;this.events.push('jump');
      }
      if(feature.type==='loop'&&crossed(previous,this.distance,feature.end,this.track.length)) {this.loops++;this.events.push('loop');}
    }
    if(this.jumpHeight>0) {
      this.jumpVelocity-=17*dt;this.jumpHeight=Math.max(0,this.jumpHeight+this.jumpVelocity*dt);
      if(!this.jumpHeight){this.jumpVelocity=0;this.events.push('land');}
    }
    for(const star of this.track.stars) {
      const lap=Math.floor((this.distance-star.d)/this.track.length),key=`${lap}:${star.id}`;
      if(lap>=0&&crossed(previous,this.distance,star.d,this.track.length)&&Math.abs(this.lane-star.lane)<2.4&&!this.collected.has(key)) {
        this.collected.add(key);this.stars++;this.events.push('star');
      }
    }
    for(const pad of this.track.boosts)if(crossed(previous,this.distance,pad.d,this.track.length)&&Math.abs(this.lane-pad.lane)<3) {this.boost=2;this.events.push('boost');}
    for(const [i,rival] of this.rivals.entries()) {
      rival.distance+=cruise*rival.pace*dt;
      rival.lane=[-4,4,0][i]+Math.sin(this.raceTime*.6+i)*.6;
      if(Math.abs(rival.distance-this.distance)<3.6&&Math.abs(rival.lane-this.lane)<2.1&&this.speed>0) {
        this.speed=Math.max(cruise*.75,this.speed-8*dt);this.lane=clamp(this.lane+(this.lane>=rival.lane?1:-1)*dt*3,-7.3,7.3);
      }
      if(rival.distance>=this.track.length*this.track.laps && rival.finishedAt===undefined)rival.finishedAt=this.raceTime;
      rival.distance=Math.min(this.track.length*this.track.laps,rival.distance);
    }
    if(this.distance>=this.track.length*this.track.laps) {
      this.finishPosition=1+this.rivals.filter(r=>r.finishedAt!==undefined&&r.finishedAt<this.raceTime).length;
      this.distance=this.track.length*this.track.laps;this.status='finished';this.speed=0;this.events.push('finish');
    }
  }
  starCollected(star) {return this.collected.has(`${Math.max(0,Math.floor(this.distance/this.track.length))}:${star.id}`);}
  get loopProgress() {
    const d=mod(this.distance,this.track.length),feature=this.track.features.find(f=>f.type==='loop'&&d>=f.start&&d<=f.end);
    return feature?(d-feature.start)/(feature.end-feature.start):null;
  }
}

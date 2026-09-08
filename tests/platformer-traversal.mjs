import { PlatformWorld } from '../js/platformer/engine.js';
const results=[];
for(let level=0;level<3;level++){
 const w=new PlatformWorld(level);let jumps=0,falls=0;
 for(let i=0;i<120*240&&w.status==='playing';i++){
  const p=w.player,feet=p.y+p.h;let input={right:true};
  if(w.boss?.active&&!w.boss.defeated){
   const target=w.boss.x+w.boss.w/2-p.w/2,delta=target-p.x;
   input={right:delta>8,left:delta< -8};
   if(p.grounded){w.jump();jumps++;}
  }else if(p.grounded){
   const nearPit=w.level.pits.find(g=>g.x-(p.x+p.w/2)>0&&g.x-(p.x+p.w/2)<50);
   if(nearPit&&p.small>0){input={left:p.vx>10};}
   else if(nearPit||w.dinosaurs.some(d=>d.x-p.x>0&&d.x-p.x<100)||w.level.platforms.some(s=>s.x-p.x<80&&s.x+s.w>p.x+p.w&&s.y<feet-25&&s.y>=feet-100)){
    w.jump();jumps++;
   }
  }
  w.update(1/120,input);for(const e of w.events.splice(0))if(e==='respawn')falls++;
 }
 results.push({level:level+1,status:w.status,time:w.time,x:w.player.x,jumps,falls,score:w.score,boss:w.boss?.hits,small:w.player.small});
}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!['levelComplete','won'].includes(r.status)))process.exit(1);


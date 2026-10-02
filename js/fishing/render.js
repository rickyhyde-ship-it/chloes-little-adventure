import { SPECIES } from './data.js';
import { fishSVG } from './art.js';
export class FishingRenderer {
  constructor(canvas,world){this.canvas=canvas;this.world=world;this.ctx=canvas.getContext('2d');this.chloe=new Image();this.chloe.src='assets/fishing/chloe-fishing.webp';this.fallback=new Image();this.fallback.src='assets/chloe/chloe-poses.webp';this.fishImages=Object.fromEntries(SPECIES.map(s=>{const im=new Image();im.src=`data:image/svg+xml,${encodeURIComponent(fishSVG(s))}`;return[s.id,im];}));this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);}
  get scale(){return this.width/1000;}
  // Keep the hook above the touch controls even on short landscape phones.
  get surfaceY(){return Math.min(this.height*.56,this.height-112);}
  get cameraY(){const w=this.world;return Math.max(0,w.hook.y-(this.height-122-this.surfaceY)/this.scale);}
  worldPoint(clientX,clientY){const r=this.canvas.getBoundingClientRect();return{x:(clientX-r.left)/this.scale,y:(clientY-r.top-this.surfaceY)/this.scale+this.cameraY};}
  friend(id,x,y,size,direction=1,alpha=1){const c=this.ctx,im=this.fishImages[id];if(!im?.complete||!im.naturalWidth)return;c.save();c.translate(x,y);c.scale(direction,1);c.globalAlpha=alpha;c.drawImage(im,-size,-size*.65,size*2,size*1.3);c.restore();}
  render(){
    const c=this.ctx,w=this.world,W=this.width,H=this.height,s=this.scale,cam=this.cameraY,water=this.surfaceY-cam*s;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,W,H);
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,w.zone.sky);sky.addColorStop(1,'#fff6d8');c.fillStyle=sky;c.fillRect(0,0,W,H);
    // Quiet islands, clouds and a crescent form the above-water world.
    if(water>0){c.fillStyle=w.zoneIndex===2?'#fff0b9':'#f7cf7e';c.beginPath();c.arc(W*.8,water*.28,Math.max(18,W*.035),0,Math.PI*2);c.fill();if(w.zoneIndex===2){c.fillStyle=w.zone.sky;c.beginPath();c.arc(W*.81,water*.24,Math.max(15,W*.03),0,Math.PI*2);c.fill();}
      c.fillStyle='#a5cdb6';for(const [x,y,r] of [[.7,.94,.2],[.91,.95,.15]]){c.beginPath();c.ellipse(W*x,water*y,W*r,water*.2,0,Math.PI,Math.PI*2);c.fill();}
      c.fillStyle='#fffaf0bb';for(const x of [.44,.65,.93]){c.beginPath();c.ellipse(W*x,water*.38,W*.065,water*.025,0,0,Math.PI*2);c.fill();}
    }
    const gradient=c.createLinearGradient(0,Math.max(water,0),0,H);gradient.addColorStop(0,w.zone.water);gradient.addColorStop(1,w.zone.deep);c.fillStyle=gradient;c.fillRect(0,Math.max(0,water),W,H);
    // Soft shafts, water layers and small bubbles follow the diving camera.
    c.save();c.beginPath();c.rect(0,Math.max(0,water),W,H);c.clip();
    for(let i=0;i<6;i++){c.fillStyle=`rgba(255,248,211,${.03+.02*(i%2)})`;const x=(i*190-50)*s;c.beginPath();c.moveTo(x,water);c.lineTo(x+38*s,water);c.lineTo(x+200*s,H);c.lineTo(x+50*s,H);c.fill();}
    c.font=`bold ${Math.max(10,13*s)}px Trebuchet MS`;c.textAlign='left';
    for(let metres=0;metres<1000;metres+=25){const y=this.surfaceY+(metres*4-cam)*s;if(y<35||y>H)continue;c.strokeStyle='#e0fbf133';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.lineTo(18*s,y);c.stroke();c.fillStyle='#e9fff199';c.fillText(`${w.zone.base+metres} m`,22*s,y+4);}
    for(let i=0;i<25;i++){const x=(Math.sin(i*6.3)*.44+.5)*W,y=this.surfaceY+((i*93-w.time*16)%1800-cam)*s;if(y<0||y>H)continue;c.strokeStyle='#e6ffff55';c.lineWidth=1.5;c.beginPath();c.arc(x,y,(2+i%3)*s,0,Math.PI*2);c.stroke();}
    // Repeating edge gardens leave the centre and the hook unobstructed.
    for(let row=0;row<18;row++){
      const y=this.surfaceY+(row*150+165-cam)*s;if(y< -90||y>H+80)continue;
      for(const side of [0,1]){const x=side?W-12*s:12*s;c.strokeStyle=['#5aadb0','#bd97cb','#84bdb0'][w.zoneIndex];c.lineWidth=8*s;c.lineCap='round';for(let b=0;b<4;b++){c.beginPath();c.moveTo(x,y+45*s);c.bezierCurveTo(x+(side?-1:1)*(10+b*8)*s,y+15*s,x+(side?-1:1)*(5+b*5)*s,y-10*s,x+(side?-1:1)*(12+b*6)*s,y-(b%2)*30*s);c.stroke();}c.fillStyle=['#f2baa0','#e5a8c0','#aa98d2'][w.zoneIndex];c.beginPath();c.ellipse(x,y+44*s,32*s,11*s,0,0,Math.PI*2);c.fill();}
    }
    c.restore();
    if(water>-20){c.strokeStyle='#f9f5d1bb';c.lineWidth=3;for(let x=0;x<W;x+=35){c.beginPath();c.moveTo(x,water+Math.sin(x*.03+w.time)*3);c.quadraticCurveTo(x+12,water+5,x+26,water);c.stroke();}}
    // Surface Chloe stays visible in a small portrait during deep exploration.
    this.boatTip=null;
    if(water>95){const artH=Math.min(W*.20,H*.60,(water-42)/.87),artW=artH*1.5,x=W*.06,y=water-artH*.87+Math.sin(w.time*1.3)*2;this.boat(x,y,artW,artH);this.boatTip={x:x+artW*.90,y:y+artH*.03};}
    if(['dock','aim'].includes(w.status)&&!w.fish.length){for(const [i,id] of ['guppy','minnow','puffer'].entries())this.friend(id,W*(.43+i*.19),water+30+i*18,18*s,1,.5);}
    for(const f of w.fish){if(f.caught)continue;const x=f.x*s,y=this.surfaceY+(f.y-cam)*s;if(y< -70||y>H+70)continue;this.friend(f.species.id,x,y,f.species.size*s,f.direction);}
    if(!['dock','result'].includes(w.status)){
      const hx=w.hook.x*s,hy=this.surfaceY+(w.hook.y-cam)*s;
      c.strokeStyle='#fff9e4cc';c.lineWidth=Math.max(1.4,2*s);c.beginPath();c.moveTo(this.boatTip?.x??hx,this.boatTip?.y??-20);c.quadraticCurveTo(hx+35*s,hy-60*s,hx,hy);c.stroke();
      c.fillStyle='#fff1b4';c.strokeStyle='#e5a469';c.lineWidth=2;c.beginPath();c.ellipse(hx,hy-8*s,8*s,12*s,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#fff6df';c.lineWidth=3*s;c.beginPath();c.moveTo(hx,hy+4*s);c.lineTo(hx,hy+23*s);c.quadraticCurveTo(hx-13*s,hy+30*s,hx-12*s,hy+15*s);c.stroke();
      w.caught.forEach((id,i)=>this.friend(id,hx+Math.sin(i*2.2+w.time)*12*s,hy+(42+i*30)*s,18*s,i%2?1:-1));
      if(w.status==='dive'&&w.time-w.lastTap<.25){c.strokeStyle='#fff8c799';c.lineWidth=3;c.beginPath();c.arc(hx,hy,25*s+(w.time-w.lastTap)*70*s,0,Math.PI*2);c.stroke();}
    }
  }
  boat(x,y,width,height){if(this.chloe.complete&&this.chloe.naturalWidth)this.ctx.drawImage(this.chloe,x,y,width,height);else if(this.fallback.complete&&this.fallback.naturalWidth){const im=this.fallback;this.ctx.drawImage(im,0,0,im.naturalWidth/3,im.naturalHeight,x,y,width*.42,height);}}
  destroy(){this.ctx=null;}
}

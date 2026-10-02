// Metres, sampled at roughly one-metre intervals. Frames remain continuous even
// at the top of a vertical loop, where world-up is the wrong road normal.
export const SPEEDS = [
  { name: 'Little driver', label: 'Gentle', speed: 22 },
  { name: 'Happy cruiser', label: 'Cruise', speed: 32 },
  { name: 'Super speedy', label: 'Zoom', speed: 44 }
];
export const TRACKS = [
  { id: 'meadow', name: 'Blossom Meadow', badge: '01', icon: '✿', description: 'Apple trees, waterfalls & a rainbow loop.', sky: '#b9e5ec', ground: '#91c97d', road: '#edcf98', edge: '#ec7999', accent: '#bd4d73', straight: 320, radius: 76, loopRadius: 24, wiggle: 9, laps: 2 },
  { id: 'coast', name: 'Seashell Coast', badge: '02', icon: '☀', description: 'Ocean views, palm trees & a seaside leap.', sky: '#b2e8f4', ground: '#efd8a1', road: '#e9c4a0', edge: '#5fbdbc', accent: '#247a80', straight: 370, radius: 100, loopRadius: 29, wiggle: 29, laps: 2 },
  { id: 'space', name: 'Starlight Speedway', badge: '03', icon: '✦', description: 'Planets, rockets & a cosmic loop-the-loop.', sky: '#282747', ground: '#777298', road: '#a5a0c9', edge: '#69cfca', accent: '#7354a5', straight: 410, radius: 88, loopRadius: 34, wiggle: 40, laps: 2 }
];
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const mul = (a,s) => a.map(v=>v*s);
export const length = a => Math.hypot(...a);
export const unit = a => mul(a,1/(length(a)||1));
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
export const mod = (v,n) => ((v%n)+n)%n;
const smooth = t => t*t*(3-2*t);

export function makeTrack(index=0) {
  const config=TRACKS[index], points=[], features=[];
  let origin=[0,2,0], yaw=0;
  const push=(p, tangent, right, kind='road')=>{
    const d=points.length ? points.at(-1).d+length(p.map((v,i)=>v-points.at(-1).p[i])) : 0;
    const forward=unit(tangent), side=unit(right), up=unit(cross(forward,side));
    points.push({p,forward,right:side,up,d,kind});
  };
  const straight=(metres,wiggle=0,ramp=false)=>{
    const start=[...origin], f=[Math.sin(yaw),0,Math.cos(yaw)], r=[Math.cos(yaw),0,-Math.sin(yaw)], first=points.at(-1)?.d||0;
    for(let s=0;s<=metres;s++) {
      const t=s/metres, side=wiggle*Math.sin(t*Math.PI*2)**3;
      let h=0;
      if(ramp && s>=70 && s<92) h=5*smooth((s-70)/22);
      if(ramp && s>=92 && s<=120) h=5*(1-smooth((s-92)/28));
      const p=add(add(start,mul(f,s)),mul(r,side));p[1]+=h;
      const ds=wiggle*3*Math.sin(t*Math.PI*2)**2*Math.cos(t*Math.PI*2)*Math.PI*2/metres;
      const dh=ramp&&s>70&&s<92 ? 30*((s-70)/22)*(1-(s-70)/22)/22 : ramp&&s>=92&&s<120 ? -30*((s-92)/28)*(1-(s-92)/28)/28 : 0;
      const tangent=add(f,mul(r,ds));tangent[1]=dh;
      push(p,tangent,unit([tangent[2],0,-tangent[0]]),ramp&&s>=70&&s<=120?'ramp':'road');
    }
    origin=add(start,mul(f,metres));
    if(ramp) {
      const nearest=s=>points.find(p=>p.d>=first+s)?.d||first+s;
      features.push({type:'jump',start:nearest(70),launch:nearest(91),end:nearest(125)});
    }
  };
  const loop=()=>{
    const start=[...origin], radius=config.loopRadius, f=[Math.sin(yaw),0,Math.cos(yaw)], right=[Math.cos(yaw),0,-Math.sin(yaw)], first=points.at(-1).d;
    const n=220;
    for(let i=0;i<=n;i++) {
      const a=i/n*Math.PI*2, travel=radius*Math.sin(a)+40*i/n;
      const p=add(start,mul(f,travel));p[1]+=radius*(1-Math.cos(a));
      const tangent=mul(f,radius*Math.cos(a)+40/(Math.PI*2));tangent[1]=radius*Math.sin(a);
      push(p,tangent,right,'loop');
    }
    origin=add(start,mul(f,40)); features.push({type:'loop',start:first,end:points.at(-1).d});
  };
  const turn=()=>{
    const start=[...origin], radius=config.radius, initial=yaw, n=Math.ceil(Math.PI*radius);
    for(let i=0;i<=n;i++) {
      const a=i/n*Math.PI, angle=initial+a;
      push([start[0]+radius*(Math.cos(initial)-Math.cos(angle)),2,start[2]+radius*(Math.sin(angle)-Math.sin(initial))], [Math.sin(angle),0,Math.cos(angle)], [Math.cos(angle),0,-Math.sin(angle)]);
    }
    origin=[...points.at(-1).p];yaw+=Math.PI;
  };
  straight(160,0,true);loop();straight(config.straight-160);turn();
  straight(config.straight+40,config.wiggle,true);turn();
  // Remove duplicate section endpoints to make binary search interpolation safe.
  const samples=points.filter((p,i)=>!i||p.d>points[i-1].d+0.0001), total=samples.at(-1).d;
  const stars=[];
  for(let d=35,i=0;d<total-20;d+=39,i++) stars.push({d,lane:[0,-4,4,0][i%4],id:i});
  const boosts=[{d:145,lane:0},{d:total*.67,lane:0}];
  return {...config, samples,length:total,width:18,features,stars,boosts};
}

export function sampleTrack(track,distance) {
  const d=mod(distance,track.length), points=track.samples;
  let lo=0,hi=points.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].d<=d)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],t=(d-a.d)/(b.d-a.d||1);
  return {p:mix(a.p,b.p,t),forward:unit(mix(a.forward,b.forward,t)),right:unit(mix(a.right,b.right,t)),up:unit(mix(a.up,b.up,t)),kind:a.kind};
}

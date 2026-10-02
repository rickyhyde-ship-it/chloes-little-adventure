// Reserve the whole circuit, including the other straight and the loop's
// footprint. Checking only the point that spawned a prop misses nearby road.
export function nearestRoad(track,position) {
  let distance=Infinity,point=[0,0];
  for(let i=1;i<track.samples.length;i++) {
    const a=track.samples[i-1].p,b=track.samples[i].p,dx=b[0]-a[0],dz=b[2]-a[2];
    const t=Math.max(0,Math.min(1,((position[0]-a[0])*dx+(position[2]-a[2])*dz)/(dx*dx+dz*dz||1)));
    const x=a[0]+dx*t,z=a[2]+dz*t,d=Math.hypot(position[0]-x,position[2]-z);
    if(d<distance){distance=d;point=[x,z];}
  }
  return {distance,point};
}
export function sceneryAnchor(track,position,radius,{background=false}={}) {
  const margin=track.width/2+1.4+(background?25:5),required=radius+margin;
  let p=[...position];
  const xs=track.samples.map(s=>s.p[0]),zs=track.samples.map(s=>s.p[2]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  // Large hills belong outside the circuit, rather than in the infield.
  const outside=p[0]<=minX-required||p[0]>=maxX+required||p[2]<=minZ-required||p[2]>=maxZ+required;
  if(!background||outside) {
    for(let i=0;i<16;i++) {
      const nearest=nearestRoad(track,p);
      if(nearest.distance>=required-.00001)return p;
      const dx=p[0]-nearest.point[0],dz=p[2]-nearest.point[1],length=Math.hypot(dx,dz);
      if(length<.0001)break;
      const step=required-nearest.distance+.1;
      p[0]+=dx/length*step;p[2]+=dz/length*step;
    }
  }
  // A large object may not fit between two road sections. Choose the closest
  // safe position outside the circuit instead of oscillating between them.
  const candidates=[
    [minX-required-.1,position[1],position[2]],
    [maxX+required+.1,position[1],position[2]],
    [position[0],position[1],minZ-required-.1],
    [position[0],position[1],maxZ+required+.1]
  ];
  candidates.sort((a,b)=>Math.hypot(a[0]-position[0],a[2]-position[2])-Math.hypot(b[0]-position[0],b[2]-position[2]));
  return candidates[0];
}

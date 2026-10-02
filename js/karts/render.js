import * as T from '../vendor/three.js';
import { sampleTrack, add, mul } from './tracks.js';
import { sceneryAnchor } from './scenery.js';
const v=a=>new T.Vector3(...a);
const basis=s=>new T.Matrix4().makeBasis(v(s.right),v(s.up),v(s.forward));
const local=(s,x,y,z=0)=>add(add(add(s.p,mul(s.right,x)),mul(s.up,y)),mul(s.forward,z));
// A +Z-facing road frame has +X on the chase camera's left. Physics lanes
// use the child's screen direction, so positive lanes must negate that axis.
const lanePosition=(s,lane,y,z=0)=>local(s,-lane,y,z);

export class KartRenderer {
  constructor(canvas,world) {
    this.canvas=canvas;this.world=world;this.textures=new Set();this.materials=new Map();this.geometries=new Map();this.batches=new Map();this.sceneryBounds=[];
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    this.scene=new T.Scene();this.scene.background=new T.Color(world.track.sky);
    this.scene.fog=new T.Fog(world.track.sky,120,430);
    this.camera=new T.PerspectiveCamera(62,1,.3,1000);
    this.scene.add(new T.HemisphereLight('#fff8e8',world.track.ground,2.3));
    const sun=new T.DirectionalLight('#fff0dc',2);sun.position.set(-90,140,70);this.scene.add(sun);
    this.buildRoad();this.buildingScenery=true;this.buildScenery();this.buildingScenery=false;this.buildProps();this.flushBatches();
    this.rivals=world.rivals.map((r,i)=>this.makeRival(r,i));
    const texture=new T.TextureLoader().load(new URL('../../assets/karts/chloe-kart.png',import.meta.url).href);
    texture.colorSpace=T.SRGBColorSpace;this.textures.add(texture);
    this.chloe=new T.Mesh(new T.PlaneGeometry(5.3,5.3),new T.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.08,depthTest:false,depthWrite:false,side:T.DoubleSide}));
    this.chloe.renderOrder=10;
    this.scene.add(this.chloe);
    this.starMesh=new T.InstancedMesh(new T.OctahedronGeometry(.85),new T.MeshLambertMaterial({color:'#fff093',emissive:'#77530a'}),world.track.stars.length);
    this.starMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(this.starMesh);
    this.resize();
  }
  geometry(kind) {
    if(!this.geometries.has(kind))this.geometries.set(kind,kind==='sphere'?new T.SphereGeometry(1,10,7):kind==='cone'?new T.ConeGeometry(1,2,7):kind==='cylinder'?new T.CylinderGeometry(1,1,1,10):kind==='crystal'?new T.OctahedronGeometry(1):kind==='ring'?new T.TorusGeometry(1,.1,6,32):new T.BoxGeometry(1,1,1));
    return this.geometries.get(kind);
  }
  material(color){if(!this.materials.has(color))this.materials.set(color,new T.MeshLambertMaterial({color}));return this.materials.get(color);}
  primitive(kind,color,pos,scale,rotation=null,parent=null) {
    const matrix=new T.Matrix4().compose(v(pos),rotation||new T.Quaternion(),v(scale));
    if(parent){const mesh=new T.Mesh(this.geometry(kind),this.material(color));mesh.applyMatrix4(matrix);parent.add(mesh);return mesh;}
    const key=`${this.buildingScenery?'scenery':'prop'}:${kind}:${color}`;if(!this.batches.has(key))this.batches.set(key,{kind,color,matrices:[],scenery:!!this.buildingScenery});this.batches.get(key).matrices.push(matrix);
  }
  flushBatches(){for(const b of this.batches.values()){const mesh=new T.InstancedMesh(this.geometry(b.kind),this.material(b.color),b.matrices.length);mesh.userData.scenery=b.scenery;b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));this.scene.add(mesh);}this.batches.clear();}
  buildRoad() {
    const track=this.world.track,positions=[],colors=[],indices=[];
    const push=(a,color)=>{positions.push(...a);colors.push(...new T.Color(color).toArray());};
    const strip=(a,b,left,right,color)=>{
      const n=positions.length/3;push(local(a,left,.04),color);push(local(a,right,.04),color);push(local(b,left,.04),color);push(local(b,right,.04),color);indices.push(n,n+2,n+1,n+1,n+2,n+3);
    };
    for(let i=0;i<track.samples.length-1;i++) {
      const a=track.samples[i],b=track.samples[i+1];
      strip(a,b,-9,9,Math.floor(a.d/9)%2?track.road:new T.Color(track.road).multiplyScalar(.97).getStyle());
      const edge=track.id==='meadow'&&a.kind==='loop'?['#ed94b2','#f4d681','#9fd6af','#99cfdc','#c6ace0'][Math.floor(a.d/12)%5]:track.edge;
      for(const side of [-1,1])strip(a,b,side*9,side*10.4,Math.floor(a.d/5)%2?edge:'#fff9e9');
      if(Math.floor(a.d/7)%2===0)strip(a,b,-.12,.12,'#fff4d9');
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));this.scene.add(mesh);
    for(let d=0;d<track.length;d+=13) {
      const s=sampleTrack(track,d),q=new T.Quaternion().setFromRotationMatrix(basis(s));
      for(const side of [-1,1]) {
        this.primitive('cylinder','#fff5df',local(s,side*10,.8),[.16,1.6,.16],q);
        this.primitive('sphere',track.edge,local(s,side*10,1.65),[.3,.3,.3]);
      }
    }
    for(const pad of track.boosts) {
      const s=sampleTrack(track,pad.d),q=new T.Quaternion().setFromRotationMatrix(basis(s));
      this.primitive('box','#72d9cc',lanePosition(s,pad.lane,.09),[5.4,.1,8],q);
      for(let i=0;i<3;i++)this.primitive('box','#fff7c3',lanePosition(s,pad.lane,.16,-2+i*2),[3,.08,.5],q);
    }
  }
  sceneryAnchor(position,radius,background=false) {
    const p=sceneryAnchor(this.world.track,position,radius,{background});
    this.sceneryBounds.push({position:p,radius,background});return p;
  }
  buildScenery() {
    const track=this.world.track;
    this.primitive('box',track.ground,[90,-5,200],[1600,10,1700]);
    if(track.id==='coast') {
      this.primitive('box','#67c9d9',[-150,-.6,220],[190,1,1350]);
      for(let i=0;i<28;i++)this.primitive('box','#ceffff',[-96-i%4*22,.03,i*41-300],[20, .12,2]);
      // A stripy lighthouse and a sailboat visible from the beach straight.
      for(let i=0;i<7;i++)this.primitive('cylinder',i%2?'#f27984':'#fff5e4',[-36,i*4+2,240],[4.8,4,4.8]);
      this.primitive('cone','#527f9b',[-36,31,240],[7,3,7]);
      this.primitive('sphere','#ffeea1',[-36,27,240],[3,2,3]);
      this.primitive('sphere','#f7f0df',[-130,1,170],[4,2,12]);
      this.primitive('cone','#fff9e4',[-130,12,170],[.4,10,7]);
    } else if(track.id==='meadow') {
      this.primitive('box','#7dcbd9',[100,.02,170],[56,.3,140]);
      const p=this.sceneryAnchor([115,0,155],36);
      this.primitive('box','#bedfe3',add(p,[0,14,0]),[20,28,7]);
      this.primitive('sphere','#849991',add(p,[0,8,-6]),[27,16,19]);
      this.primitive('box','#b9f0f1',add(p,[0,20,10]),[12,38,1.5]);
      this.primitive('sphere','#e7faf0',add(p,[0,1,15]),[17,1,6]);
    } else {
      for(let i=0;i<5;i++) {
        const x=[-95,260,-70,215,120][i],z=i*105;
        const p=this.sceneryAnchor([x,65+i%2*32,z],i%2===0?35+i*2:15+i*2);
        this.primitive('sphere',['#e5a2bb','#90cad9','#efc085','#ad9fd9','#8ed6bd'][i],p,[15+i*2,15+i*2,15+i*2]);
        const q=new T.Quaternion().setFromEuler(new T.Euler(1.1,.3,.4));
        if(i%2===0)this.primitive('ring','#e6cfed',p,[30+i*2,30+i*2,30+i*2],q);
      }
      for(let i=0;i<100;i++)this.primitive('crystal','#fff0b2',this.sceneryAnchor([Math.sin(i*12.3)*350,60+(i*19)%180,Math.cos(i*7.2)*430+200],1),[.6,.6,.6]);
      this.primitive('cylinder','#eee8ed',[-32,9,60],[4,18,4]);this.primitive('cone','#ef94b8',[-32,21,60],[4,4,4]);
      this.primitive('sphere','#70d5e3',[-32,13,64],[1.6,1.6,.4]);
      for(const x of [-38,-26])this.primitive('cone','#ac8ada',[x,3,60],[3,6,3]);
    }
    for(let i=0;i<105;i++) {
      const d=i*track.length/105,s=sampleTrack(track,d);
      if(s.kind==='loop'||s.p[1]>6)continue;
      const side=i%2?1:-1,x=side*(20+(i*17%23)),scale=2.5+(i%4)*.65,original=local(s,x,0);
      original[1]=0;const p=this.sceneryAnchor(original,scale*3+5);
      if(track.id==='meadow') {
        this.primitive('cylinder','#b28e69',add(p,[0,scale*1.4,0]),[.65,scale*3,.65]);
        this.primitive('sphere',i%3?'#5d9c6a':'#edb5c8',add(p,[0,scale*3.7,0]),[scale*1.8,scale*1.8,scale*1.8]);
        for(let k=0;k<3;k++)this.primitive('sphere','#f2c186',add(p,[Math.sin(k*2)*scale,scale*3,Math.cos(k*2)*scale]),[.55,.55,.55]);
        this.primitive('sphere','#ffe7a3',add(p,[3,.6,2]),[1.2,.5,1.2]);
      } else if(track.id==='coast') {
        this.primitive('cylinder','#b99c78',add(p,[0,scale*2,0]),[.7,scale*4,.7]);
        for(let k=0;k<5;k++){const a=k*Math.PI*2/5,q=new T.Quaternion().setFromEuler(new T.Euler(.25,a,.2));this.primitive('sphere','#67aa80',add(p,[Math.sin(a)*scale,scale*4,Math.cos(a)*scale]),[scale*.65,.5,scale*2],q);}
        this.primitive('sphere','#fff3da',add(p,[4,.7,1]),[1.9,.65,1.3]);
      } else {
        this.primitive('crystal',i%2?'#8ae0d5':'#c5a7e6',add(p,[0,scale*1.5,0]),[scale,scale*2,scale]);
        this.primitive('sphere','#9792ae',add(p,[3,1,3]),[3,1.5,2]);
      }
    }
    for(let i=0;i<14;i++) {
      const x=Math.sin(i*9.1)*350,z=Math.cos(i*7)*350+160;
      const radius=Math.max(60+i%3*25,70),p=this.sceneryAnchor([x,-8,z],radius,true);
      this.primitive('sphere',track.id==='space'?'#666287':track.id==='coast'?'#9bcbbc':'#80b37d',p,[60+i%3*25,20+i%4*8,70]);
      if(track.id!=='space'){
        const cloud=this.sceneryAnchor([x+7,76+i%4*8,z],30);
        for(let k=0;k<3;k++)this.primitive('sphere','#f9ffff',add(cloud,[(k-1)*7,0,0]),[14,4,7]);
      }
    }
  }
  buildProps() {
    const track=this.world.track,s=sampleTrack(track,3),q=new T.Quaternion().setFromRotationMatrix(basis(s));
    for(const side of [-1,1])this.primitive('cylinder',track.edge,local(s,side*11,6),[.65,12,.65],q);
    for(let i=0;i<12;i++)for(let row=0;row<2;row++)this.primitive('box',(i+row)%2?'#5e5160':'#fff7df',local(s,-11+i*2,11+row,0),[2,1,.7],q);
    for(const feature of track.features) {
      const frame=sampleTrack(track,feature.start-14),rotation=new T.Quaternion().setFromRotationMatrix(basis(frame));
      this.primitive('cylinder','#fff4d4',local(frame,-12,2.5),[.3,5,.3],rotation);
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d');
      ctx.fillStyle=track.edge;ctx.fillRect(0,0,256,128);ctx.fillStyle='#fffaf0';ctx.textAlign='center';ctx.font='bold 30px Trebuchet MS';ctx.fillText(feature.type==='loop'?'LOOP! ↻':'JUMP! ↑',128,75);
      const texture=new T.CanvasTexture(canvas);this.textures.add(texture);const sign=new T.Mesh(new T.PlaneGeometry(6,3),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));sign.position.copy(v(local(frame,-12,5)));sign.quaternion.copy(rotation);this.scene.add(sign);
      if(feature.type==='loop')for(const side of [-1,1])this.primitive('box',track.edge,local(frame,side*12,9,35),[1,18,1]);
    }
  }
  makeRival(rival,index) {
    const g=new T.Group();this.primitive('box',rival.color,[0,.65,0],[2.5,.6,3.6],null,g);
    this.primitive('sphere',rival.color,[0,.95,1.2],[1.25,.45,.8],null,g);
    for(const x of [-1.3,1.3])for(const z of [-1,1])this.primitive('sphere','#555164',[x,.45,z],[.48,.48,.6],null,g);
    const color=index===0?'#85bb7c':index===1?'#f3e9e4':'#f4d164';
    this.primitive('sphere',color,[0,1.5,-.5],[.8,.85,.7],null,g);this.primitive('sphere',color,[0,2.55,-.35],[.9,.8,.85],null,g);
    if(index===1)for(const x of [-.4,.4])this.primitive('sphere','#f3e9e4',[x,3.5,-.35],[.22,.8,.25],null,g);
    if(index===2)for(const x of [-1,1])this.primitive('sphere','#d5f5f3',[x,1.9,-.8],[.65,.15,.8],null,g);
    for(const x of [-.38,.38]){this.primitive('sphere','#fff9ed',[x,2.6,.35],[.25,.3,.18],null,g);this.primitive('sphere','#514d5c',[x,2.59,.49],[.12,.15,.08],null,g);}
    this.scene.add(g);return g;
  }
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  render() {
    const w=this.world,s=w.sample;
    // Follow the curved road itself rather than extending its tangent. The
    // tangent alone puts the camera through the road at the top of a loop.
    const loop=w.loopProgress,loopBlend=loop===null?0:Math.min(1,loop*8,(1-loop)*8);
    const behind=sampleTrack(w.track,w.distance-16-8*loopBlend);
    const position=v(lanePosition(behind,w.lane*.65,7.4+w.jumpHeight*.45));
    this.camera.position.copy(position);this.camera.up.copy(v(s.up));
    this.camera.lookAt(v(lanePosition(s,w.lane*.8,6+w.jumpHeight*.6)));
    this.chloe.position.copy(v(lanePosition(s,w.lane,2.5+w.jumpHeight)));this.chloe.quaternion.copy(this.camera.quaternion);
    this.chloe.rotateZ(-w.steer*.065);
    w.rivals.forEach((r,i)=>{const frame=sampleTrack(w.track,r.distance);this.rivals[i].position.copy(v(lanePosition(frame,r.lane,.05)));this.rivals[i].quaternion.setFromRotationMatrix(basis(frame));});
    const matrix=new T.Matrix4();w.track.stars.forEach((star,i)=>{
      const frame=sampleTrack(w.track,star.d),scale=w.starCollected(star)?0:1;
      matrix.compose(v(lanePosition(frame,star.lane,2+Math.sin(w.time*2+i)*.25)),new T.Quaternion().setFromEuler(new T.Euler(0,w.time,Math.PI/4)),new T.Vector3(scale,scale,scale));this.starMesh.setMatrixAt(i,matrix);
    });this.starMesh.instanceMatrix.needsUpdate=true;
    this.renderer.render(this.scene,this.camera);
  }
  destroy() {
    const geometry=new Set(),materials=new Set();this.scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.forceContextLoss();
  }
}

// Keep all controls and race physics available on devices without WebGL 2.
export class CanvasKartRenderer {
  constructor(canvas,world){this.canvas=canvas;this.world=world;this.ctx=canvas.getContext('2d');this.image=new Image();this.image.src=new URL('../../assets/karts/chloe-kart.png',import.meta.url).href;this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect();this.canvas.width=r.width;this.canvas.height=r.height;}
  render(){
    const c=this.ctx,w=this.world,width=this.canvas.width,height=this.canvas.height,track=w.track;
    c.fillStyle=track.sky;c.fillRect(0,0,width,height);c.fillStyle=track.ground;c.fillRect(0,height*.42,width,height);
    const horizon=height*.42;
    for(let i=0;i<40;i++) {
      const t=i/40,t2=(i+1)/40,y=horizon+t*t*height*.58,y2=horizon+t2*t2*height*.58;
      const half=width*(.03+t*.56),half2=width*(.03+t2*.56),bend=Math.sin(w.distance/95+(1-t)*1.5)*width*.06;
      c.fillStyle=(Math.floor(w.distance/8)+i)%2?track.road:track.edge;c.beginPath();c.moveTo(width/2+bend-half,y);c.lineTo(width/2+bend+half,y);c.lineTo(width/2+bend+half2,y2);c.lineTo(width/2+bend-half2,y2);c.fill();
    }
    const loop=track.features.find(f=>f.type==='loop'),d=((w.distance%track.length)+track.length)%track.length;
    if(Math.abs(loop.start-d)<120||w.loopProgress!==null){c.strokeStyle=track.edge;c.lineWidth=12;c.beginPath();c.ellipse(width*.5,height*.4,width*.1,height*.28,0,0,Math.PI*2);c.stroke();}
    const size=Math.min(height*.46,200),x=width/2+w.lane*width*.012;
    if(this.image.complete&&this.image.naturalWidth)c.drawImage(this.image,x-size/2,height-size-8-w.jumpHeight*6,size,size);
    c.fillStyle='#fff5c2';c.font='bold 18px Trebuchet MS';if(w.loopProgress!==null)c.fillText('↻ Loop-the-loop!',width*.4,80);
  }
  destroy(){}
}

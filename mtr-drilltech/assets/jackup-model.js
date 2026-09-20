import * as THREE from '../vendor/three.module.min.js';

/** Original educational jack-up assembly. Dimensions are illustrative, not a vessel survey. */
export function buildJackup() {
  const group = new THREE.Group();
  group.name = 'MTR · illustrative independent-leg jack-up';
  const parts = new Map();
  const steel = (color, roughness = .58, metalness = .55) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const M = {
    green: steel('#187967', .51, .43), greenDark: steel('#10584c'), greenLight: steel('#4c9e82'),
    deck: steel('#c3cac0', .88, .18), pale: steel('#dce3da', .58, .35), white: steel('#ecece3', .64, .23),
    steel: steel('#798b89'), dark: steel('#344541'), black: steel('#192a2d', .76, .22),
    yellow: steel('#ecb742', .57, .30), yellowDark: steel('#a17c25'), red: steel('#b74535', .55, .40),
    orange: steel('#ee7434', .51, .2), blue: steel('#6e9fa5', .43, .48),
    glass: new THREE.MeshStandardMaterial({color:'#213d48', roughness:.22, metalness:.63}),
    rubber: steel('#25302e', .95, .04), brass: steel('#b8a477', .45, .58),
    emissive: new THREE.MeshStandardMaterial({color:'#f3dec0', emissive:'#e8bb62', emissiveIntensity:.45}),
  };
  const unitBox = new THREE.BoxGeometry(1,1,1);
  const unitTube = new THREE.CylinderGeometry(1,1,1,8);
  const unitCylinder = new THREE.CylinderGeometry(1,1,1,20);
  const unitBall = new THREE.SphereGeometry(1,12,8);
  const batches = new Map();
  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion();
  const up = new THREE.Vector3(0,1,0);
  const v = (a) => new THREE.Vector3(...a);

  function part(id) {
    const p = new THREE.Group(); p.name = id; p.userData.componentId = id;
    parts.set(id,p); group.add(p); return p;
  }
  function addBatch(p, geometry, material, position, scale, rotation) {
    let byKey = batches.get(p); if(!byKey) batches.set(p, byKey = new Map());
    const key = geometry.uuid + material.uuid;
    let b = byKey.get(key); if(!b) byKey.set(key,b = {geometry,material,matrices:[]});
    const q = rotation instanceof THREE.Quaternion ? rotation : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation || [0,0,0])));
    b.matrices.push(new THREE.Matrix4().compose(v(position),q,v(scale)));
  }
  function box(p, size, pos, material=M.pale, rot) {addBatch(p,unitBox,material,pos,size,rot);}
  function cyl(p,r,h,pos,material=M.steel,rot) {addBatch(p,unitCylinder,material,pos,[r,h,r],rot);}
  function ball(p,r,pos,material=M.steel) {addBatch(p,unitBall,material,pos,[r,r,r]);}
  function tube(p,a,b,r=.10,material=M.steel) {
    const av=v(a),bv=v(b),diff=bv.clone().sub(av), length=diff.length();
    if(length<.001)return;
    quat.setFromUnitVectors(up,diff.normalize());
    addBatch(p,unitTube,material,av.add(bv).multiplyScalar(.5).toArray(),[r,length,r],quat);
  }
  function mesh(p,geometry,material,pos=[0,0,0],rot=[0,0,0]) {
    const m=new THREE.Mesh(geometry,material);m.position.set(...pos);m.rotation.set(...rot);
    m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
  }
  function taper(p,rt,rb,h,pos,material=M.steel,rot=[0,0,0],sides=20) {
    return mesh(p,new THREE.CylinderGeometry(rt,rb,h,sides),material,pos,rot);
  }
  function torus(p,r,t,pos,material=M.steel,rot=[Math.PI/2,0,0]) {
    return mesh(p,new THREE.TorusGeometry(r,t,7,28),material,pos,rot);
  }
  function rail(p,a,b,height=1.25) {
    const av=v(a), bv=v(b), distance=av.distanceTo(bv), count=Math.ceil(distance/2.6);
    for(let i=0;i<=count;i++) {
      const at=av.clone().lerp(bv,i/count);tube(p,at.toArray(),[at.x,at.y+height,at.z],.052,M.yellow);
    }
    for(const h of [height*.5,height])tube(p,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.045,M.yellow);
    tube(p,[a[0],a[1]+.10,a[2]],[b[0],b[1]+.10,b[2]],.065,M.dark);
  }
  function perimeter(p,corners,y,height=1.2) {
    for(let i=0;i<corners.length;i++) {
      const a=corners[i], b=corners[(i+1)%corners.length];rail(p,[a[0],y,a[1]],[b[0],y,b[1]],height);
    }
  }
  function stairs(p,start,end,width=1.35) {
    const a=v(start),b=v(end),d=b.clone().sub(a), n=Math.max(3,Math.ceil(Math.abs(d.y)/.24));
    const horizontal=new THREE.Vector3(d.x,0,d.z).normalize(),side=new THREE.Vector3(horizontal.z,0,-horizontal.x);
    const yaw=Math.atan2(horizontal.x,horizontal.z);
    for(let i=0;i<n;i++) {const c=a.clone().lerp(b,(i+.5)/n);box(p,[width,.12,Math.sqrt(d.x*d.x+d.z*d.z)/n+.07],c.toArray(),M.steel,[0,yaw,0]);}
    for(const s of [-1,1]) {
      const offset=side.clone().multiplyScalar(s*width*.5),a1=a.clone().add(offset),b1=b.clone().add(offset);
      tube(p,a1.toArray(),b1.toArray(),.09,M.dark);rail(p,a1.toArray(),b1.toArray(),1.05);
    }
  }
  function ladder(p,x,y,z,height,angle=0) {
    const dx=Math.cos(angle)*.45,dz=Math.sin(angle)*.45;
    for(const s of [-1,1])tube(p,[x+s*dx,y,z+s*dz],[x+s*dx,y+height,z+s*dz],.055,M.yellow);
    for(let yy=y;yy<=y+height;yy+=.38)tube(p,[x-dx,yy,z-dz],[x+dx,yy,z+dz],.04,M.steel);
  }
  function pipeRoute(p,pts,r=.25,material=M.green) {
    for(let i=0;i<pts.length-1;i++)tube(p,pts[i],pts[i+1],r,material);
    for(let i=1;i<pts.length-1;i++)ball(p,r*1.05,pts[i],material);
  }
  function flange(p,x,y,z,r=.7,axis='y',material=M.steel) {
    const rot=axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0];
    cyl(p,r,.18,[x,y,z],material,rot);
    for(let j=0;j<8;j++) {
      const a=j*Math.PI/4,c=Math.cos(a)*r*.77,s=Math.sin(a)*r*.77;
      const at=axis==='z'?[x+c,y+s,z]:axis==='x'?[x,y+c,z+s]:[x+c,y,z+s];
      cyl(p,.065,.24,at,M.brass,rot);
    }
  }
  function valve(p,x,y,z,scale=1,axis='z') {
    const rot=axis==='z'?[Math.PI/2,0,0]:axis==='x'?[0,0,Math.PI/2]:[0,0,0];
    cyl(p,.40*scale,.90*scale,[x,y,z],M.red,rot);
    tube(p,[x,y,z],[x,y+1.1*scale,z],.1*scale,M.brass);
    torus(p,.48*scale,.055*scale,[x,y+1.12*scale,z],M.red);
    tube(p,[x-.45*scale,y+1.12*scale,z],[x+.45*scale,y+1.12*scale,z],.04*scale,M.red);
  }
  function label(p,text,size,pos,rotation=[0,0,0],fg='#ffffff',bg=null) {
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
    const c=canvas.getContext('2d');if(!c)return;
    if(bg){c.fillStyle=bg;c.fillRect(0,0,1024,256);}c.fillStyle=fg;
    c.font='bold 122px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,512,133,980);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    mesh(p,new THREE.PlaneGeometry(size,size/4),material,pos,rotation);
  }
  function interior(p,name) {
    const g=new THREE.Group();g.name=name;g.userData.interior=true;g.userData.componentId=p.userData.componentId;g.visible=false;p.add(g);return g;
  }

  // The chamfered, welded pontoon is lifted clear of the user's water plane.
  const hull=part('hull');
  const outline=[[-35,-32.5],[35,-32.5],[40,-27.5],[40,24.5],[33,32.5],[-33,32.5],[-40,24.5],[-40,-27.5]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const hg=new THREE.ExtrudeGeometry(shape,{depth:5,bevelEnabled:true,bevelSize:.5,bevelThickness:.3,bevelSegments:1,steps:1});
  mesh(hull,hg,M.green,[0,10.7,0],[-Math.PI/2,0,0]);
  const dg=new THREE.ShapeGeometry(shape);mesh(hull,dg,M.deck,[0,16.04,0],[-Math.PI/2,0,0]);
  perimeter(hull,outline.map(([x,z])=>[x*.987,z*.987]),16.1);
  for(let x=-32;x<=32;x+=8){box(hull,[.10,4.0,.16],[x,13.6,-32.86],M.greenLight);box(hull,[.10,4.0,.16],[x,13.6,32.83],M.greenDark);}
  for(let z=-24;z<=24;z+=8){box(hull,[.16,4.1,.11],[-40.35,13.55,z],M.greenDark);box(hull,[.16,4.1,.11],[40.35,13.55,z],M.greenLight);}
  for(const x of [-37,37])for(const z of [-26,23]){cyl(hull,.5,.9,[x,16.5,z],M.dark);box(hull,[1.7,.3,.55],[x,16.9,z],M.dark);}
  for(let x=-29;x<=29;x+=8){cyl(hull,.17,.35,[x,15.0,32.9],M.black,[Math.PI/2,0,0]);}
  label(hull,'MTR DRILLTECH',20,[0,13.3,32.89],[0,0,0]);
  label(hull,'MTR',9,[40.47,13.6,1],[0,Math.PI/2,0]);
  for(const z of [-24,24]) {box(hull,[30,.035,.16],[10,16.10,z],M.yellow);}
  // Main deck longitudinal stringers and exposed underside girders.
  for(const x of [-32,-16,0,16,32])box(hull,[.7,1.15,54],[x,10.3,0],M.dark);
  for(const z of [-26,-13,0,13,26])box(hull,[71,.75,.5],[0,9.85,z],M.greenDark);

  // Three triangular open-truss legs. Batched cylinders keep the dense bracing efficient.
  const legs=part('legs'), jacking=part('jacking');
  const legPositions=[[-29,-21],[29,-21],[0,24]], chordR=3.2;
  legPositions.forEach(([cx,cz],index)=>{
    const chords=Array.from({length:3},(_,i)=>[cx+Math.sin(i*Math.PI*2/3)*chordR,cz+Math.cos(i*Math.PI*2/3)*chordR]);
    for(const [x,z] of chords) {
      tube(legs,[x,-21.5,z],[x,86,z],.43,M.pale);
      // The brown rack strip beside each leg chord reads as a continuous pinion rail.
      box(legs,[.17,106,.20],[x+.4,32,z],M.dark);
      for(let y=-17;y<85;y+=.85)box(legs,[.23,.12,.29],[x+.45,y,z],M.steel);
    }
    for(let y=-20;y<85;y+=5.8)for(let i=0;i<3;i++){
      const a=chords[i],b=chords[(i+1)%3];
      tube(legs,[a[0],y,a[1]],[b[0],y,b[1]],.16,M.steel);
      const next=Math.min(86,y+5.8);
      tube(legs,[a[0],y,a[1]],[b[0],next,b[1]],.15,M.pale);
      tube(legs,[b[0],y,b[1]],[a[0],next,a[1]],.12,M.steel);
    }
    taper(legs,4.5,6.9,2.6,[cx,-22.0,cz],M.greenDark,[0,0,0],8);
    taper(legs,6.9,2.7,1.5,[cx,-24.05,cz],M.steel,[0,0,0],8);
    for(let a=0;a<8;a++){const ang=a*Math.PI/4;tube(legs,[cx,-20.7,cz],[cx+Math.sin(ang)*6.3,-22.7,cz+Math.cos(ang)*6.3],.17,M.steel);}
    const collarCorners=chords.map(([x,z])=>[cx+(x-cx)*1.5,cz+(z-cz)*1.5]);
    for(const y of [16.5,23.4]){
      for(let i=0;i<3;i++){const a=collarCorners[i],b=collarCorners[(i+1)%3];tube(jacking,[a[0],y,a[1]],[b[0],y,b[1]],.48,M.green);}
      perimeter(jacking,collarCorners,y+.15);
    }
    chords.forEach(([x,z],i)=>{
      const dx=(x-cx)/chordR,dz=(z-cz)/chordR;
      const ox=x+dx*1.08,oz=z+dz*1.08;
      box(jacking,[1.9,5.9,2.0],[ox,20,oz],M.green);
      for(const yy of [18.4,20.1,21.8]){
        cyl(jacking,.57,1.2,[ox+dx*.8,yy,oz+dz*.8],M.yellow,[Math.PI/2,0,0]);
        box(jacking,[1.15,.75,1.25],[ox+dx*1.6,yy,oz+dz*1.6],M.dark);
      }
      box(jacking,[.16,5.9,2.1],[ox+1.02,20,oz],M.yellow);
    });
    ladder(jacking,cx+4.6,16.2,cz,8);
    const inside=interior(jacking,`Leg ${index+1} · pinion gear train`);
    for(let yy=18;yy<23;yy+=1.6){
      cyl(inside,.93,.5,[cx+3.8,yy,cz],M.brass,[Math.PI/2,0,0]);
      for(let n=0;n<12;n++){const a=n*Math.PI/6;box(inside,[.25,.35,.6],[cx+3.8+Math.cos(a),yy+Math.sin(a),cz],M.yellow,[0,0,a]);}
    }
  });

  const cantilever=part('cantilever');
  // Deep rail-supported cantilever beams, extending aft of the pontoon.
  for(const x of [-9,9]){
    box(cantilever,[1.0,1.0,42],[x,17.1,-22],M.dark);
    box(cantilever,[1.6,.35,43],[x,17.7,-23],M.steel);
    box(cantilever,[1.25,1.5,42],[x,22.0,-31],M.pale);
    box(cantilever,[1.15,.85,42],[x,18.8,-31],M.green);
    for(let z=-50;z<-11;z+=5.5){tube(cantilever,[x,18.8,z],[x,22.0,z+5.5],.20,M.steel);tube(cantilever,[x,22,z],[x,18.8,z+5.5],.20,M.steel);}
  }
  for(let z=-51;z<-10;z+=5)box(cantilever,[20,.65,.55],[0,22.55,z],M.steel);
  box(cantilever,[22,.48,37],[0,23.08,-33.5],M.deck);
  for(const x of [-10.7,10.7])rail(cantilever,[x,23.4,-51.4],[x,23.4,-15.4]);
  rail(cantilever,[-10.7,23.4,-51.4],[10.7,23.4,-51.4]);
  for(const x of [-9,9]){cyl(cantilever,.35,7,[x,19.1,-10],M.yellow,[Math.PI/2,0,0]);cyl(cantilever,.18,6,[x,19.1,-15.5],M.steel,[Math.PI/2,0,0]);}
  stairs(cantilever,[13,16.2,-17],[13,23.4,-28],1.65);
  box(cantilever,[3,.25,3],[12.1,23.3,-28.0],M.deck);

  const floor=part('drill-floor');
  box(floor,[14,.8,14],[0,24.0,-38],M.green);
  box(floor,[13.7,.12,13.7],[0,24.5,-38],M.dark);
  const floorCorners=[[-6.8,-44.8],[6.8,-44.8],[6.8,-31.2],[-6.8,-31.2]];
  perimeter(floor,floorCorners,24.65);
  cyl(floor,1.50,.22,[0,24.66,-38],M.steel);
  cyl(floor,.55,.25,[0,24.80,-38],M.black);
  // Driller cabin offset from the well centre and elevated doghouse.
  box(floor,[4.1,3.0,3.8],[5,26.15,-33],M.white);
  box(floor,[3.65,1.40,.055],[5,26.4,-34.93],M.glass);
  box(floor,[.055,1.40,3.25],[2.93,26.4,-33],M.glass);
  box(floor,[4.35,.22,4.05],[5,27.72,-33],M.green);
  for(let x=3.6;x<=6.2;x+=1.2)box(floor,[.08,1.6,.10],[x,26.4,-34.97],M.pale);
  stairs(floor,[-8,23.4,-31],[-5.8,24.7,-32.8],1.2);

  const derrick=part('derrick');
  const derrickLevels=[24.65,31.6,38.5,45.4,52.3,59.2,66.1,73.0];
  const halfAt=y=>5.9-(y-24.65)*.073;
  for(let side=0;side<4;side++){
    const sx=side===0||side===3?-1:1,sz=side<2?-1:1;
    tube(derrick,[sx*halfAt(24.65),24.65,-38+sz*halfAt(24.65)],[sx*halfAt(73),73,-38+sz*halfAt(73)],.25,M.pale);
  }
  for(let j=0;j<derrickLevels.length-1;j++){
    const y=derrickLevels[j],yn=derrickLevels[j+1],h=halfAt(y),hn=halfAt(yn);
    const corners=[[-h,-h],[h,-h],[h,h],[-h,h]],tops=[[-hn,-hn],[hn,-hn],[hn,hn],[-hn,hn]];
    for(let s=0;s<4;s++){
      const a=corners[s],b=corners[(s+1)%4],ta=tops[s],tb=tops[(s+1)%4];
      tube(derrick,[a[0],y,a[1]-38],[b[0],y,b[1]-38],.15,M.pale);
      tube(derrick,[a[0],y,a[1]-38],[tb[0],yn,tb[1]-38],.105,M.steel);
      tube(derrick,[b[0],y,b[1]-38],[ta[0],yn,ta[1]-38],.105,M.steel);
    }
    if(j%2===0){
      box(derrick,[1.15,.14,h*2+.8],[h+.75,y,-38],M.steel);
      rail(derrick,[h+1.25,y,-38-h],[h+1.25,y,-38+h]);
    }
  }
  ladder(derrick,6.4,24.7,-36.2,15.5);
  ladder(derrick,5.2,40.2,-36.2,14);
  ladder(derrick,4.0,54.2,-36.2,19.3);
  // Fingerboard and racking platform.
  box(derrick,[7,.23,4.8],[0,45.65,-32.6],M.steel);
  rail(derrick,[-3.5,45.8,-30.2],[3.5,45.8,-30.2]);
  for(let x=-3.1;x<=3.2;x+=.5)box(derrick,[.12,.35,4.2],[x,45.95,-33],M.yellow);
  for(let x=-4;x<=-2.2;x+=.42)for(let z=-35.8;z<=-33.8;z+=.5)tube(derrick,[x,25,z],[x,44.9,z],.14,M.dark);
  box(derrick,[4.1,.18,4.1],[0,73.25,-38],M.steel);
  perimeter(derrick,[[-2.1,-40.1],[2.1,-40.1],[2.1,-35.9],[-2.1,-35.9]],73.4);
  tube(derrick,[0,74,-38],[0,77.6,-38],.07,M.pale);ball(derrick,.20,[0,77.6,-38],M.red);
  label(derrick,'MTR',3.6,[0,62.1,-41.31],[0,Math.PI,0]);

  const crown=part('crown');
  box(crown,[3.6,.45,2.3],[0,72.5,-38],M.yellow);
  for(const x of [-1.4,1.4])box(crown,[.24,1.5,2.2],[x,73.25,-38],M.yellow);
  for(let x=-1.05;x<=1.1;x+=.42){
    cyl(crown,.85,.24,[x,73.45,-38],M.dark,[0,0,Math.PI/2]);
    torus(crown,.72,.055,[x,73.45,-38],M.steel,[0,Math.PI/2,0]);
  }
  tube(crown,[-1.7,73.45,-38],[1.7,73.45,-38],.16,M.steel);

  const travelling=part('travelling');
  for(const x of [-1.45,1.45])box(travelling,[.2,3.5,2.0],[x,52.1,-38],M.yellow);
  for(let x=-1.0;x<=1.01;x+=.4)cyl(travelling,.77,.26,[x,52.6,-38],M.dark,[0,0,Math.PI/2]);
  box(travelling,[2.7,.65,1.8],[0,50.3,-38],M.yellow);
  for(let x=-1.04;x<=1.05;x+=.42)for(const z of [-38.64,-37.36])tube(travelling,[x,72.9,z],[x,52.6,z],.036,M.dark);
  taper(travelling,.35,.5,1.2,[0,49.45,-38],M.steel);
  torus(travelling,.50,.14,[0,48.75,-38],M.yellow,[0,0,0]);

  const topdrive=part('top-drive');
  box(topdrive,[2.8,3.6,2.5],[0,46.2,-38],M.green);
  for(const x of [-1.2,1.2])tube(topdrive,[x,48.5,-38],[x,46.8,-38],.15,M.yellow);
  cyl(topdrive,.80,2.25,[0,46.5,-38],M.greenDark);
  cyl(topdrive,.42,1.2,[0,43.7,-38],M.steel);
  for(let y=45;y<47.4;y+=.35)box(topdrive,[2.83,.08,2.53],[0,y,-38],M.steel);
  box(topdrive,[.35,22,.45],[1.9,39.7,-36.6],M.steel);
  for(const x of [-1.5,1.5])tube(topdrive,[x,45.2,-38],[x,42.5,-38],.11,M.yellow);
  torus(topdrive,.6,.13,[0,42.6,-38],M.yellow);
  pipeRoute(topdrive,[[0,47.8,-37.5],[0,49.5,-35.1],[3.8,48.2,-34.8],[4.5,37,-34.8],[4.5,27,-35]],.15,M.rubber);
  const driveInside=interior(topdrive,'Top drive · shaft and motor rotor');
  cyl(driveInside,.36,4.5,[0,46,-38],M.brass);
  for(let y=45.2;y<=47.5;y+=.45)cyl(driveInside,.62,.19,[0,y,-38],M.orange);
  cyl(driveInside,.8,.4,[0,44.4,-38],M.yellow);

  const string=part('drill-string');
  tube(string,[0,-14,-38],[0,43.5,-38],.20,M.steel);
  for(let y=-12;y<42;y+=9.2)cyl(string,.29,.58,[0,y,-38],M.dark);
  taper(string,.23,.38,1.2,[0,-14.5,-38],M.brass);
  for(let i=0;i<3;i++){const a=i*2*Math.PI/3;ball(string,.25,[Math.cos(a)*.21,-15.05,-38+Math.sin(a)*.21],M.steel);}

  const bop=part('bop');
  box(bop,[6,.42,5.6],[0,16.35,-38],M.steel);
  for(const x of [-2.6,2.6])for(const z of [-40.5,-35.5])tube(bop,[x,16.5,z],[x,23.0,z],.14,M.yellow);
  for(const y of [17.3,19,20.65]){
    box(bop,[2.5,1.25,2.3],[0,y,-38],M.red);
    cyl(bop,.96,1.6,[0,y,-38],M.red);
    for(const x of [-1.8,1.8]){cyl(bop,.53,1.5,[x,y,-38],M.red,[0,0,Math.PI/2]);flange(bop,x+(x>0?.78:-.78),y,-38,.64,'x');}
    flange(bop,0,y+.7,-38,1.10);
  }
  taper(bop,.65,1.1,1.15,[0,22.15,-38],M.red);flange(bop,0,22.8,-38,.93);
  for(const x of [-1.55,1.55])pipeRoute(bop,[[x,17,-39.2],[x,21.9,-39.2],[x*.65,22.2,-38.8]],.07,M.steel);
  const bopInside=interior(bop,'BOP · opposed ram blocks and well bore');
  for(const y of [17.3,19,20.65])for(const x of [-.9,.9])box(bopInside,[1.2,.62,1.0],[x,y,-38],M.yellow);
  cyl(bopInside,.32,6.1,[0,19.5,-38],M.brass);

  const choke=part('choke');
  box(choke,[5,.35,4],[7.2,17,-38],M.steel);
  for(const x of [5.7,8.4])pipeRoute(choke,[[x,17.4,-39.3],[x,20,-39.3],[x,20,-36.7],[x,17.4,-36.7]],.23,M.red);
  for(const z of [-39.3,-36.7]){tube(choke,[5.7,19,z],[9.3,19,z],.25,M.green);for(const x of [6.6,8.6])valve(choke,x,19,z,.66,'x');}
  pipeRoute(choke,[[1.3,19,-38],[3.3,19,-38],[3.3,19,-39.3],[5.7,19,-39.3]],.25,M.red);
  for(const x of [6.2,8.2]){tube(choke,[x,20,-37.2],[x,21,-37.2],.07,M.steel);cyl(choke,.25,.10,[x,21.1,-37.2],M.white,[Math.PI/2,0,0]);}

  const drawworks=part('drawworks');
  box(drawworks,[6.4,.45,4.0],[0,24.0,-47.1],M.green);
  for(const x of [-2,2])box(drawworks,[.5,2.7,3.5],[x,25.5,-47.1],M.green);
  cyl(drawworks,1.03,3.6,[0,25.55,-47.1],M.dark,[0,0,Math.PI/2]);
  for(let x=-1.6;x<1.7;x+=.12)torus(drawworks,1.05,.04,[x,25.55,-47.1],M.steel,[0,Math.PI/2,0]);
  for(const x of [-2.4,2.4]){cyl(drawworks,.97,.4,[x,25.55,-47.1],M.yellow,[0,0,Math.PI/2]);cyl(drawworks,.64,1.0,[x+(x>0?.5:-.5),25.55,-47.1],M.green,[0,0,Math.PI/2]);}
  tube(drawworks,[0,26.5,-47.1],[1.0,72.8,-38.5],.045,M.dark);
  box(drawworks,[2.7,1.3,1.1],[0,24.9,-49.2],M.greenDark);

  const tanks=part('mud-tanks');
  for(let i=0;i<3;i++){
    const x=-29+i*7.1;
    box(tanks,[6.5,3.15,11.5],[x,17.8,0],M.green);
    box(tanks,[6.7,.23,11.7],[x,19.5,0],M.steel);
    for(let z=-4.5;z<5;z+=3){cyl(tanks,.85,.20,[x,19.74,z],M.dark);cyl(tanks,.50,.85,[x,20.23,z],M.blue);}
    for(const side of [-1,1])box(tanks,[.14,2.9,11.7],[x+side*3.1,17.8,0],M.greenLight);
    label(tanks,`MUD ${i+1}`,3.1,[x,17.9,5.8]);
  }
  perimeter(tanks,[[-32.4,-6],[-11.3,-6],[-11.3,6],[-32.4,6]],19.65);
  stairs(tanks,[-33.5,16.2,9.9],[-33.5,19.65,4.4],1.3);
  for(let z=-4;z<=4;z+=4)pipeRoute(tanks,[[-31,20,z],[-13,20,z],[-13,17,z]],.15,M.yellow);

  const pumps=part('mud-pumps');
  for(let i=0;i<3;i++) {
    const x=12.2+i*7.4,z=-8;
    box(pumps,[6.5,.35,6.4],[x,16.42,z],M.dark);
    box(pumps,[3.4,2.8,3.8],[x,18.0,z],M.green);
    box(pumps,[3.9,1.7,1.2],[x,17.75,z-2.6],M.greenLight);
    for(let j=-1;j<=1;j++) {
      cyl(pumps,.42,1.1,[x+j*1.1,17.85,z-3.1],M.steel,[Math.PI/2,0,0]);
      flange(pumps,x+j*1.1,17.85,z-3.7,.53,'z');
    }
    cyl(pumps,.82,2.4,[x,17.75,z+2.5],M.blue,[Math.PI/2,0,0]);
    for(let zz=z+1.5;zz<z+3.5;zz+=.26)cyl(pumps,.88,.08,[x,17.75,zz],M.steel,[Math.PI/2,0,0]);
    cyl(pumps,.55,.65,[x+1.1,19.7,z-1.7],M.red);taper(pumps,.1,.55,.62,[x+1.1,20.3,z-1.7],M.red);
    tube(pumps,[x-2,17.2,z-3.5],[x+2,17.2,z-3.5],.24,M.red);
    const inside=interior(pumps,`Pump ${i+1} · triplex plungers`);
    for(let j=-1;j<=1;j++) {cyl(inside,.24,3.4,[x+j*1.1,17.85,z-.8],M.brass,[Math.PI/2,0,0]);cyl(inside,.46,.7,[x+j*1.1,17.85,z-1.2],M.orange,[Math.PI/2,0,0]);}
    cyl(inside,.30,3.6,[x,17.85,z+1.0],M.yellow,[0,0,Math.PI/2]);
  }
  pipeRoute(pumps,[[10,17.2,-11.5],[30.5,17.2,-11.5],[33.5,17.2,-11.5],[33.5,17.2,-27],[5,17.2,-27],[5,28,-35]],.25,M.red);
  for(let x=12;x<31;x+=7.4)valve(pumps,x,17.2,-11.5,.65,'x');

  const shakers=part('shakers');
  for(let i=0;i<3;i++) {
    const x=-22+i*5.1,z=-12.2;
    box(shakers,[4.4,.35,5.6],[x,16.5,z],M.dark);
    for(const dx of [-1.6,1.6])for(const dz of [-1.7,1.7]){cyl(shakers,.21,.7,[x+dx,17.0,z+dz],M.yellow);torus(shakers,.26,.09,[x+dx,17,z+dz],M.steel);}
    box(shakers,[4.1,1.25,5.0],[x,18,z],M.green,[.10,0,0]);
    box(shakers,[3.5,.08,4.5],[x,18.7,z],M.dark,[.10,0,0]);
    for(let zz=-1.8;zz<=1.9;zz+=.38)box(shakers,[3.5,.06,.04],[x,18.7-zz*.1,z+zz],M.steel);
    cyl(shakers,.42,1.15,[x,18.3,z+2.7],M.blue,[0,0,Math.PI/2]);
  }
  pipeRoute(shakers,[[-24.5,19,-14.6],[-9.4,19,-14.6],[-9.4,18,-5]],.30,M.green);

  const generators=part('generators');
  for(let i=0;i<3;i++) {
    const x=15+i*7.8,z=5.3;
    box(generators,[6.6,.35,9.3],[x,16.4,z],M.dark);
    box(generators,[6.0,4.25,8.5],[x,18.65,z],M.white);
    box(generators,[6.2,.22,8.7],[x,20.85,z],M.green);
    for(let zz=z-3.5;zz<z+3.6;zz+=.45)box(generators,[.09,2.1,.19],[x+3.04,18.6,zz],M.dark);
    for(let xx=x-2.2;xx<=x+2.3;xx+=.35)box(generators,[.11,2.2,.08],[xx,18.7,z+4.30],M.dark);
    box(generators,[1.4,2.3,.08],[x-1.5,18.0,z-4.29],M.greenLight);
    tube(generators,[x+1.5,20.85,z+1.9],[x+1.5,25.3,z+1.9],.25,M.dark);
    cyl(generators,.52,1.7,[x+1.5,22.9,z+1.9],M.steel);
    tube(generators,[x+1.5,25.3,z+1.9],[x+1.5,25.3,z+2.7],.25,M.dark);
    label(generators,`G0${i+1}`,1.8,[x+1.1,19.1,z-4.30],[0,Math.PI,0],'#187967');
  }

  const rack=part('pipe-rack');
  for(const x of [-18.5,18.5]) {
    const z=-25.6;
    box(rack,[10,.45,12],[x,16.5,z],M.dark);
    for(const dz of [-4,0,4]){box(rack,[10,.6,.5],[x,17,z+dz],M.yellow);}
    for(let layer=0;layer<3;layer++)for(let i=0;i<15-layer;i++){
      const px=x-4.2+i*.60+layer*.30;
      tube(rack,[px,17.6+layer*.5,z-5.2],[px,17.6+layer*.5,z+5.2],.25,M.steel);
      cyl(rack,.29,.42,[px,17.6+layer*.5,z-5.1],M.dark,[Math.PI/2,0,0]);
    }
    for(const dx of [-5,5])for(const dz of [-4,4])box(rack,[.23,2.5,.23],[x+dx,17.8,z+dz],M.yellow);
  }
  box(rack,[2.0,.25,14],[0,18,-18],M.steel,[.32,0,0]);
  for(const x of [-.8,.8])tube(rack,[x,16,-10],[x,22.3,-28],.12,M.yellow);

  const accommodation=part('accommodation');
  const ax=-20,az=19.2;
  box(accommodation,[25,13.0,19.2],[ax,22.75,az],M.white);
  box(accommodation,[25.6,.40,19.8],[ax,29.4,az],M.green);
  for(let level=0;level<4;level++){
    const y=17.6+level*3.12;
    box(accommodation,[25.15,.16,19.36],[ax,y-1.25,az],M.greenLight);
    for(let x=-30.8;x<=-9.3;x+=2.8){
      box(accommodation,[1.6,1.12,.07],[x,y,az+9.66],M.glass);
      box(accommodation,[1.6,1.12,.07],[x,y,az-9.66],M.glass);
      box(accommodation,[1.8,.12,.20],[x,y-.62,az+9.7],M.pale);
    }
    for(let z=az-7.5;z<=az+7.5;z+=3.0)for(const xx of [ax-12.55,ax+12.55])box(accommodation,[.07,1.1,1.7],[xx,y,z],M.glass);
    box(accommodation,[1.4,.17,19.4],[-33.25,y-1.27,az],M.steel);
    rail(accommodation,[-33.8,y-1.18,az-9.7],[-33.8,y-1.18,az+9.7]);
    if(level<3)stairs(accommodation,[-34,y-1.1,az+6],[-34,y+2.05,az+.8],1.3);
  }
  // Bridge roof, panoramic bridge glazing, ventilation and communications.
  box(accommodation,[18,3.35,8.3],[-19,31.2,23.8],M.white);
  box(accommodation,[18.8,.25,8.8],[-19,32.98,23.8],M.green);
  for(let x=-27;x<=-11;x+=2.0)box(accommodation,[1.7,1.55,.075],[x,31.4,28.0],M.glass);
  for(const xx of [-28.05,-9.95])box(accommodation,[.08,1.55,6.6],[xx,31.4,23.8],M.glass);
  perimeter(accommodation,[[-32.6,9.3],[-7.4,9.3],[-7.4,29.1],[-32.6,29.1]],29.65);
  for(const x of [-28,-23,-18]){box(accommodation,[3.1,1.1,2.0],[x,30.15,13],M.steel);for(let z=12.3;z<=13.7;z+=.3)box(accommodation,[2.7,.05,.08],[x,30.72,z],M.dark);}
  tube(accommodation,[-13,33.1,23],[-13,39.2,23],.10,M.white);
  for(const y of [35.4,37.4])tube(accommodation,[-15,y,23],[-11,y,23],.06,M.white);
  ball(accommodation,.9,[-25,34.0,23],M.white);cyl(accommodation,.55,.5,[-25,33.3,23],M.pale);
  cyl(accommodation,.30,1.7,[-18,34.1,24],M.white);
  box(accommodation,[2.5,.2,.36],[-18,35,24],M.pale);
  label(accommodation,'MTR',8,[-19,28.0,28.86],[0,0,0],'#187967');
  box(accommodation,[1.5,2.35,.08],[-9.2,17.52,28.88],M.green);

  const heli=part('helideck');
  const hx=-20,hz=43,hy=30.8,hr=13.5;
  const hp=new THREE.Shape();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4,x=hx+Math.cos(a)*hr,z=hz+Math.sin(a)*hr;i?hp.lineTo(x,-z):hp.moveTo(x,-z);}hp.closePath();
  mesh(heli,new THREE.ExtrudeGeometry(hp,{depth:.45,bevelEnabled:false}),M.green,[0,hy-.5,0],[-Math.PI/2,0,0]);
  const hc=Array.from({length:8},(_,i)=>{const a=Math.PI/8+i*Math.PI/4;return [hx+Math.cos(a)*hr,hz+Math.sin(a)*hr];});
  for(let i=0;i<8;i++){
    const a=hc[i],b=hc[(i+1)%8];tube(heli,[a[0],hy,a[1]],[b[0],hy,b[1]],.12,M.pale);
    const outerA=[hx+(a[0]-hx)*1.07,hy-.45,hz+(a[1]-hz)*1.07],outerB=[hx+(b[0]-hx)*1.07,hy-.45,hz+(b[1]-hz)*1.07];
    tube(heli,outerA,outerB,.07,M.steel);
    for(let t=0;t<=1;t+=.2){const xx=a[0]+(b[0]-a[0])*t,zz=a[1]+(b[1]-a[1])*t;tube(heli,[xx,hy,zz],[hx+(xx-hx)*1.07,hy-.45,hz+(zz-hz)*1.07],.025,M.steel);}
    ball(heli,.14,[a[0],hy+.13,a[1]],M.emissive);
  }
  torus(heli,9.5,.18,[hx,hy+.05,hz],M.yellow);
  for(const x of [-2.1,2.1])box(heli,[.8,.06,6.1],[hx+x,hy+.1,hz],M.white);
  box(heli,[4.7,.06,.8],[hx,hy+.1,hz],M.white);
  label(heli,'12.8 t',4.8,[hx,hy+.12,hz+6.0],[-Math.PI/2,0,0]);
  for(const x of [-29,-11]){
    tube(heli,[x,17,28],[x,30.3,47],.28,M.pale);
    tube(heli,[x,28.8,28],[x,30.3,51],.25,M.pale);
    tube(heli,[x,30.3,32],[x,30.3,53],.25,M.steel);
  }
  for(const z of [36,43,50])tube(heli,[-31,30.2,z],[-9,30.2,z],.18,M.steel);
  box(heli,[4.5,.22,7.0],[-20,30.7,30.5],M.deck);
  for(const x of [-22.2,-17.8])rail(heli,[x,30.8,27],[x,30.8,33]);
  tube(heli,[-32,30.8,35],[-32,34.4,35],.055,M.pale);
  taper(heli,.15,.42,1.8,[-31.2,34.4,35],M.orange,[0,0,-Math.PI/2]);

  const lifeboats=part('lifeboats');
  for(const z of [5,17]) {
    const boat=new THREE.Group();boat.position.set(-41.4,17.8,z);lifeboats.add(boat);
    const body=mesh(boat,new THREE.SphereGeometry(1,20,12),M.orange);body.scale.set(2.0,1.55,4.7);
    const cabin=mesh(boat,new THREE.SphereGeometry(1,16,10),M.orange,[0,.85,0]);cabin.scale.set(1.35,.95,2.65);
    box(boat,[2.0,.70,.09],[0,1.08,2.4],M.glass);
    for(const x of [-1.4,1.4])for(let zz=-1.5;zz<=1.5;zz+=1.1)box(boat,[.08,.55,.76],[x,1.05,zz],M.glass);
    for(const x of [-2.1,2.1])tube(boat,[x,-.15,-3.6],[x,-.15,3.6],.065,M.dark);
    label(boat,'MTR',1.5,[0,.1,4.65],[0,0,0]);
    for(const dz of [-3.2,3.2]){
      tube(lifeboats,[-37,16.2,z+dz],[-37,22.0,z+dz],.16,M.pale);
      tube(lifeboats,[-37,22,z+dz],[-42.0,22,z+dz],.16,M.pale);
      tube(lifeboats,[-37,20,z+dz],[-41,22,z+dz],.12,M.pale);
      tube(lifeboats,[-41.4,22,z+dz],[-41.4,19.1,z+dz],.035,M.dark);
    }
  }

  const crane=part('crane');
  function craneAssembly(cx,cz,baseY,azimuth,length,rise) {
    const c=new THREE.Group();c.position.set(cx,baseY,cz);c.rotation.y=azimuth;crane.add(c);
    cyl(c,1.5,4.8,[0,2.4,0],M.green);cyl(c,2.0,.55,[0,4.85,0],M.yellow);
    box(c,[4.4,2.5,4.8],[0,6.3,0],M.yellow);
    box(c,[3.3,2.5,2.8],[0,6.3,-3.15],M.yellowDark);
    box(c,[2.4,2.4,2.6],[-2.8,6.4,.5],M.white);
    box(c,[.06,1.3,2.3],[-4.04,6.8,.5],M.glass);
    box(c,[2.15,1.3,.06],[-2.8,6.8,1.84],M.glass);
    const root=[0,7.0,1.4],tip=[0,7+rise,length];
    const N=12;
    for(let i=0;i<N;i++) {
      const t=i/N,tn=(i+1)/N, w=1.35-.83*t,wn=1.35-.83*tn;
      const y=root[1]+rise*t,z=root[2]+(length-root[2])*t;
      const yn=root[1]+rise*tn,zn=root[2]+(length-root[2])*tn;
      const corners=[[-w,y-w,z],[w,y-w,z],[w,y+w,z],[-w,y+w,z]];
      const next=[[-wn,yn-wn,zn],[wn,yn-wn,zn],[wn,yn+wn,zn],[-wn,yn+wn,zn]];
      for(let j=0;j<4;j++){
        tube(c,corners[j],next[j],.13,M.yellow);
        tube(c,corners[j],corners[(j+1)%4],.075,M.yellowDark);
        tube(c,corners[j],next[(j+1)%4],.068,M.yellow);
      }
    }
    tube(c,[-1.4,7,-1],[0,13,-1.5],.15,M.yellow);tube(c,[1.4,7,-1],[0,13,-1.5],.15,M.yellow);
    for(const x of [-.4,.4])tube(c,[x,13,-1.5],[x,7+rise,length],.043,M.dark);
    for(const x of [-.25,.25])tube(c,[x,7+rise,length],[x,4.0,length],.045,M.dark);
    box(c,[1.1,1.4,.8],[0,3.5,length],M.yellow);
    torus(c,.55,.13,[0,2.4,length],M.dark,[0,0,0]);
    cyl(c,.8,2,[0,6.9,-2],M.dark,[0,0,Math.PI/2]);
    ladder(c,1.75,0,-1,5);
    rail(c,[-2.2,5.0,-2.3],[2.2,5,-2.3]);
  }
  craneAssembly(32,21,16.2,.96,32,22);
  craneAssembly(-34,-6,16.2,-1.7,23,15);

  // A few deck service details make scale and circulation legible.
  for(const [x,z] of [[36,-4],[7,24],[9,-2],[-35,-17]]){
    box(hull,[1.3,1.4,1.0],[x,16.85,z],M.red);
    tube(hull,[x,16.15,z+.7],[x,18.25,z+.7],.055,M.pale);
    ball(hull,.12,[x,18.3,z+.7],M.emissive);
  }
  for(const [x,z] of [[7,15],[8,20],[8,25]]){
    cyl(hull,.6,2.8,[x,17.65,z],M.white);taper(hull,.3,.6,.6,[x,19.35,z],M.white);
  }
  for(const x of [-36,36])for(let z=-15;z<=25;z+=10){
    tube(hull,[x,16.2,z],[x,20.3,z],.075,M.pale);
    box(hull,[.72,.25,.5],[x,20.4,z],M.emissive);
  }

  // Flush per-parent geometry/material batches. Equipment remains individually pickable by component.
  for(const [parent,byKey] of batches)for(const {geometry,material,matrices} of byKey.values()){
    const inst=new THREE.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((m,i)=>inst.setMatrixAt(i,m));inst.instanceMatrix.needsUpdate=true;
    inst.castShadow=true;inst.receiveShadow=true;inst.name=`${parent.name || 'detail'} · ${matrices.length} repeated elements`;
    parent.add(inst);inst.computeBoundingBox();inst.computeBoundingSphere();
  }
  group.updateMatrixWorld(true);
  for(const [id,p] of parts){
    const b=new THREE.Box3().setFromObject(p),center=b.getCenter(new THREE.Vector3());
    p.userData.focusTarget=center.toArray();p.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};
    p.traverse(child=>{child.userData.componentId=id;});
  }
  const bounds=new THREE.Box3().setFromObject(group);
  group.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  group.userData.description='Original illustrative jack-up rig, world Y up, nominal metre units.';
  return {group,parts,bounds};
}

export default buildJackup;

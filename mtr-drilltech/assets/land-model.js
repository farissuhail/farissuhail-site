import * as THREE from '../vendor/three.module.min.js';
import { buildJackup } from './jackup-model.js';

/** Original illustrative land drilling rig, reusing the common drilling machinery. */
export function buildLandRig() {
  const source=buildJackup();
  const group=new THREE.Group();group.name='MTR · illustrative land drilling rig';
  const ids=['derrick','crown','travelling','top-drive','drawworks','drill-string','bop','choke','mud-pumps','mud-tanks','shakers','generators','pipe-rack','drill-floor'];
  const parts=new Map(ids.map(id=>[id,source.parts.get(id)]));
  const material=(color,roughness=.60,metalness=.45)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const M={green:material('#187967'),steel:material('#798b89'),dark:material('#344541'),pale:material('#dce3da'),yellow:material('#ecb742'),deck:material('#bcc6bf',.85,.2),red:material('#b74535'),brass:material('#b8a477'),black:material('#192a2d')};
  const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10);
  const batches=new Map(),up=new THREE.Vector3(0,1,0);
  const vector=a=>new THREE.Vector3(...a);
  function instance(parent,geo,mat,pos,scale,q=new THREE.Quaternion()) {
    let table=batches.get(parent);if(!table)batches.set(parent,table=new Map());
    const key=geo.uuid+mat.uuid;let batch=table.get(key);if(!batch)table.set(key,batch={geo,mat,matrices:[]});
    batch.matrices.push(new THREE.Matrix4().compose(vector(pos),q,vector(scale)));
  }
  function box(p,size,pos,mat=M.steel,rotation=[0,0,0]){instance(p,cube,mat,pos,size,new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));}
  function tube(p,a,b,r=.1,mat=M.steel){const av=vector(a),bv=vector(b),d=bv.clone().sub(av),len=d.length();instance(p,cylinder,mat,av.add(bv).multiplyScalar(.5).toArray(),[r,len,r],new THREE.Quaternion().setFromUnitVectors(up,d.normalize()));}
  function cyl(p,r,h,pos,mat=M.steel){instance(p,cylinder,mat,pos,[r,h,r]);}
  function rail(p,a,b,height=1.2){
    const av=vector(a),bv=vector(b),count=Math.ceil(av.distanceTo(bv)/2.4);
    for(let i=0;i<=count;i++){const v=av.clone().lerp(bv,i/count);tube(p,v.toArray(),[v.x,v.y+height,v.z],.05,M.yellow);}
    for(const h of [.12,.62,height])tube(p,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],h===.12?.065:.045,h===.12?M.dark:M.yellow);
  }
  function stairs(p,a,b,width=1.65){
    const av=vector(a),bv=vector(b),d=bv.clone().sub(av),run=Math.hypot(d.x,d.z),n=Math.ceil(d.y/.23),yaw=Math.atan2(d.x,d.z),side=new THREE.Vector3(d.z,0,-d.x).normalize();
    for(let i=0;i<n;i++)box(p,[width,.10,run/n+.06],av.clone().lerp(bv,(i+.5)/n).toArray(),M.steel,[0,yaw,0]);
    for(const s of [-1,1]){const off=side.clone().multiplyScalar(s*width*.5);tube(p,av.clone().add(off).toArray(),bv.clone().add(off).toArray(),.12,M.green);rail(p,av.clone().add(off).toArray(),bv.clone().add(off).toArray(),1.1);}
  }
  function worldExtras(p,name){const g=new THREE.Group();g.name=name;g.position.copy(p.position).multiplyScalar(-1);p.add(g);return g;}
  // Remove jack-up-specific deck pipe extensions while retaining pump bodies and internals.
  function filterInstances(p,predicate){
    for(const node of [...p.children]){
      if(!node.isInstancedMesh)continue;
      const kept=[],m=new THREE.Matrix4(),v=new THREE.Vector3();
      for(let i=0;i<node.count;i++){node.getMatrixAt(i,m);v.setFromMatrixPosition(m);if(predicate(v))kept.push(m.clone());}
      if(kept.length===node.count)continue;
      if(kept.length){const replacement=new THREE.InstancedMesh(node.geometry,node.material,kept.length);kept.forEach((m,i)=>replacement.setMatrixAt(i,m));replacement.castShadow=true;replacement.receiveShadow=true;replacement.name=node.name;replacement.computeBoundingBox();replacement.computeBoundingSphere();p.add(replacement);}
      p.remove(node);
    }
  }
  filterInstances(parts.get('mud-pumps'),v=>v.x>8&&v.x<32.7&&v.z>-12.2&&v.z<-3.9&&v.y<21);
  filterInstances(parts.get('pipe-rack'),v=>Math.abs(v.x)>10);
  // Make a clear opening for the land rig's pipe ramp in the front guardrail.
  filterInstances(parts.get('drill-floor'),v=>!(Math.abs(v.z+31.2)<.08&&v.y>24.6&&Math.abs(v.x)<1.9));
  for(const [id,p] of parts){
    p.removeFromParent();group.add(p);p.position.set(0,-15.5,38);
  }
  const groundAt=(id,x,z)=>{
    const p=parts.get(id);p.position.set(0,0,0);p.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(p),c=b.getCenter(new THREE.Vector3());
    p.position.set(x-c.x,.25-b.min.y,z-c.z);return p;
  };
  groundAt('mud-pumps',-29,16);
  groundAt('mud-tanks',-36,-11);
  groundAt('shakers',-18,-8);
  groundAt('generators',13,-24);
  groundAt('pipe-rack',0,25);
  parts.get('drawworks').position.y+=.6;

  // Main drill floor at 9.15 m; the rear machinery bay carries the drawworks.
  const floor=parts.get('drill-floor'),structure=worldExtras(floor,'Land rig · raised steel substructure');
  for(const x of [-8,8])for(const z of [-13,-3,8]){
    box(structure,[3.5,.32,3.0],[x,.18,z],M.dark);
    box(structure,[.75,8.5,.75],[x,4.55,z],M.green);
    for(const yy of [.6,4.7,8.7])box(structure,[1.05,.30,1.05],[x,yy,z],M.steel);
    for(const dx of [-1.25,1.25])for(const dz of [-1,1])cyl(structure,.09,.22,[x+dx,.43,z+dz],M.brass);
  }
  for(const x of [-8,8])for(const y of [1,4.6,8.65])box(structure,[.55,.60,21.5],[x,y,-2.5],M.green);
  for(const z of [-13,-3,8])for(const y of [1,8.65])box(structure,[16.5,.65,.55],[0,y,z],M.green);
  for(const x of [-8,8])for(const [a,b] of [[-13,-3],[-3,8]]){
    tube(structure,[x,1,a],[x,8.65,b],.19,M.steel);
    tube(structure,[x,8.65,a],[x,1,b],.19,M.steel);
  }
  for(const z of [-13,8]){
    tube(structure,[-8,1,z],[0,8.65,z],.19,M.steel);tube(structure,[8,1,z],[0,8.65,z],.19,M.steel);
  }
  // Extra rear deck under the drawworks and safe peripheral walkways.
  box(structure,[16.5,.33,6.3],[0,8.68,-10.0],M.deck);
  for(const x of [-7.65,7.65])box(structure,[1.15,.25,15.0],[x,8.85,0],M.deck);
  for(const x of [-8.25,8.25])rail(structure,[x,9.02,-13.1],[x,9.02,7.6]);
  rail(structure,[-8.25,8.88,-13.1],[8.25,8.88,-13.1]);
  rail(structure,[-6.8,9.15,6.8],[-1.9,9.15,6.8]);
  rail(structure,[1.9,9.15,6.8],[6.8,9.15,6.8]);
  // Switchback stairs make the raised drill floor accessible from grade.
  stairs(structure,[11.1,.3,13.9],[11.1,4.65,6.6],1.8);
  box(structure,[4.7,.25,2.4],[10.1,4.65,5.5],M.deck);
  stairs(structure,[9.1,4.8,4.4],[9.1,9.02,-2.8],1.8);
  box(structure,[3,.25,3],[8.3,8.90,-3.8],M.deck);
  for(const x of [8,12.3])tube(structure,[x,.3,5.5],[x,4.55,5.5],.14,M.green);
  rail(structure,[8,4.8,4.3],[12.3,4.8,4.3]);
  rail(structure,[12.3,4.8,4.3],[12.3,4.8,6.7]);
  for(const x of [-7.4,7.4])for(const z of [-12,6.8]){
    tube(structure,[x,9,z],[x,12.4,z],.065,M.pale);box(structure,[.65,.21,.42],[x,12.4,z],M.pale);
  }
  // Shallow cellar frame and well foundation, no ground plane is part of this asset.
  const bopExtras=worldExtras(parts.get('bop'),'Land well · cellar and service supports');
  for(const x of [-3,3])box(bopExtras,[.35,.6,6.5],[x,.3,0],M.dark);
  for(const z of [-3,3])box(bopExtras,[6.5,.6,.35],[0,.3,z],M.dark);
  cyl(bopExtras,.72,1.25,[0,.45,0],M.steel);

  // Replace the long subsea depiction with a short well section below grade.
  const string=parts.get('drill-string');string.clear();string.position.set(0,0,0);
  tube(string,[0,-1.4,0],[0,28,0],.20,M.steel);
  for(let y=.4;y<27;y+=9.2)cyl(string,.29,.58,[0,y,0],M.dark);
  cyl(string,.35,.6,[0,-1.5,0],M.brass);

  const catwalk=worldExtras(parts.get('pipe-rack'),'Land rig · hydraulic catwalk and pipe ramp');
  box(catwalk,[3.8,.45,21],[0,.75,29],M.green);
  box(catwalk,[3.1,.15,20.2],[0,1.04,29],M.dark);
  for(let z=19;z<=39;z+=3.3){
    box(catwalk,[5,.3,.65],[0,.35,z],M.dark);
    tube(catwalk,[-1.45,1.15,z],[1.45,1.15,z],.15,M.steel);
  }
  for(const x of [-1.65,1.65])tube(catwalk,[x,1.2,18.5],[x,8.92,6.3],.15,M.yellow);
  const rampStart=new THREE.Vector3(0,1.15,18.5),rampEnd=new THREE.Vector3(0,8.82,6.3),rampDiff=rampEnd.clone().sub(rampStart);
  instance(catwalk,cube,M.steel,rampStart.clone().add(rampEnd).multiplyScalar(.5).toArray(),[2.8,.22,rampDiff.length()],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),rampDiff.normalize()));
  for(const x of [-1.15,1.15])tube(catwalk,[x,.7,20],[x,5.3,12],.19,M.green);
  tube(catwalk,[0,1.36,22],[0,1.36,36],.20,M.steel);
  for(const z of [21,26,31,36])for(const x of [-8.8,8.8]){
    box(catwalk,[10,.18,.6],[x,1.6,z],M.yellow);
    for(const end of [-4.2,4.2])tube(catwalk,[x+end,.25,z],[x+end,1.5,z],.10,M.green);
  }

  // Low skids and external fluid lines tie the modules into one coherent site.
  for(const id of ['mud-pumps','mud-tanks','shakers','generators']) {
    const p=parts.get(id);p.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(p);
    const extras=worldExtras(p,`${id} · land skid`),cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2;
    const sx=b.max.x-b.min.x,sz=b.max.z-b.min.z;
    for(const x of [b.min.x+.5,b.max.x-.5])box(extras,[.55,.27,sz+.6],[x,.14,cz],M.dark);
    for(const z of [b.min.z+.4,b.max.z-.4])box(extras,[sx+.7,.27,.55],[cx,.14,z],M.dark);
  }
  const pumpExtras=worldExtras(parts.get('mud-pumps'),'Land rig · discharge and standpipe');
  for(const [a,b] of [
    [[-18,.75,13],[-10,.75,13]],[[-10,.75,13],[-10,.75,1]],[[-10,.75,1],[-5,.75,1]],
    [[-5,.75,1],[-5,11.8,1]],[[-5,11.8,1],[-4,11.8,1]],
  ])tube(pumpExtras,a,b,.22,M.red);
  const tankExtras=worldExtras(parts.get('mud-tanks'),'Land rig · mud suction manifold');
  for(const [a,b] of [
    [[-36,.8,-2],[-36,.8,8]],[[-36,.8,8],[-22,.8,8]],[[-22,.8,8],[-22,.8,13]],
    [[-25,1.1,-11],[-20,1.1,-11]],
  ])tube(tankExtras,a,b,.27,M.green);

  for(const [p,table] of batches)for(const {geo,mat,matrices} of table.values()){
    const inst=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>inst.setMatrixAt(i,m));
    inst.instanceMatrix.needsUpdate=true;inst.castShadow=true;inst.receiveShadow=true;inst.computeBoundingBox();inst.computeBoundingSphere();p.add(inst);
  }
  group.updateMatrixWorld(true);
  for(const [id,p] of parts){const b=new THREE.Box3().setFromObject(p);p.userData.componentId=id;p.userData.focusTarget=b.getCenter(new THREE.Vector3()).toArray();p.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};p.traverse(node=>node.userData.componentId=id);}
  const bounds=new THREE.Box3().setFromObject(group);
  group.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  group.userData.description='Original illustrative land drilling rig, 9 m steel substructure, world Y up, nominal metre units.';
  return {group,parts,bounds};
}

export const buildLand=buildLandRig;
export default buildLandRig;

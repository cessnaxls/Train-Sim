import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const toRad=d=>d*Math.PI/180;
const haversine=(a,b)=>{const R=6371000,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
function metrics(points){let d=0;const cumulative=[0];for(let i=1;i<points.length;i++){d+=haversine(points[i-1],points[i]);cumulative.push(d)}return{distance:d,cumulative}}
function interp(points,cumulative,d){if(!points.length)return null;if(points.length===1)return points[0];d=clamp(d,0,cumulative.at(-1));let i=1;while(i<cumulative.length&&cumulative[i]<d)i++;const lo=cumulative[i-1],hi=cumulative[i],t=(d-lo)/Math.max(1,hi-lo),a=points[i-1],b=points[i];return{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}}
function makeRouteData(points,terrain){
  if(points.length<2)return null;
  const origin=points[0],lat0=toRad(origin.lat),mLat=111132.92,mLon=111412.84*Math.cos(lat0),rm=metrics(points);
  const elev=(d)=>{if(terrain.length<2)return 0;let i=1;while(i<terrain.length&&terrain[i].d<d)i++;i=clamp(i,1,terrain.length-1);const a=terrain[i-1],b=terrain[i],t=(d-a.d)/Math.max(1,b.d-a.d);return (a.elev+(b.elev-a.elev)*t)-terrain[0].elev};
  const count=Math.min(1800,Math.max(80,Math.ceil(rm.distance/10)));const pts=[];
  for(let i=0;i<count;i++){const d=rm.distance*i/(count-1),p=interp(points,rm.cumulative,d);pts.push(new THREE.Vector3((p.lng-origin.lng)*mLon,elev(d),(p.lat-origin.lat)*mLat));}
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.15);curve.arcLengthDivisions=Math.min(6000,Math.max(400,pts.length*3));curve.updateArcLengths();
  return{origin,curve,distance:rm.distance,cumulative:rm.cumulative};
}
function frameAt(curve,u){const p=curve.getPointAt(clamp(u,0,1)),t=curve.getTangentAt(clamp(u,0,1)).normalize(),up=new THREE.Vector3(0,1,0),right=new THREE.Vector3().crossVectors(t,up).normalize();if(right.lengthSq()<.2)right.set(1,0,0);const realUp=new THREE.Vector3().crossVectors(right,t).normalize();return{p,t,right,up:realUp}}
function ribbon(curve,width,step=6,yOffset=0){const len=curve.getLength(),n=Math.max(8,Math.ceil(len/step)),pos=[],idx=[];for(let i=0;i<=n;i++){const f=frameAt(curve,i/n),p=f.p.clone().addScaledVector(f.up,yOffset);const a=p.clone().addScaledVector(f.right,-width/2),b=p.clone().addScaledVector(f.right,width/2);pos.push(a.x,a.y,a.z,b.x,b.y,b.z);if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
function tube(curve,rad,segments=900,sides=6){return new THREE.TubeGeometry(curve,Math.min(segments,Math.max(64,Math.ceil(curve.getLength()/3))),rad,sides,false)}
function localCurveOffset(curve,offset){const pts=[];for(let i=0;i<=Math.min(1400,Math.max(80,Math.ceil(curve.getLength()/7)));i++){const f=frameAt(curve,i/Math.min(1400,Math.max(80,Math.ceil(curve.getLength()/7))));pts.push(f.p.clone().addScaledVector(f.right,offset))}return new THREE.CatmullRomCurve3(pts,false,'centripetal',.1)}
function disposeTree(o){o.traverse(x=>{x.geometry?.dispose?.();if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material?.dispose?.()})}
function addTrain(group,train,full=true){
  const bodyMat=new THREE.MeshStandardMaterial({color:new THREE.Color(train.bodyColor||'#d6aa43'),metalness:.45,roughness:.38});
  const stripeMat=new THREE.MeshStandardMaterial({color:new THREE.Color(train.stripeColor||'#3de2b1'),metalness:.25,roughness:.35});
  const glass=new THREE.MeshStandardMaterial({color:0x163846,metalness:.25,roughness:.15});
  const dark=new THREE.MeshStandardMaterial({color:0x151a1d,metalness:.55,roughness:.5});
  const count=full?Math.min(train.carCount+1,12):Math.min(train.carCount+1,7);
  for(let i=0;i<count;i++){
    const car=new THREE.Group(),isLead=i===0,len=isLead?20:23.5;
    const body=new THREE.Mesh(new THREE.BoxGeometry(3.05,3.5,len),bodyMat);body.position.y=2.15;car.add(body);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(2.85,.32,len*.96),dark);roof.position.y=4.03;car.add(roof);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(3.09,.17,len*.96),stripeMat);stripe.position.set(0,2.15,0);car.add(stripe);
    for(const side of [-1,1])for(let w=-Math.floor(len/2)+2;w<len/2-1;w+=2.6){const win=new THREE.Mesh(new THREE.BoxGeometry(.035,.9,1.45),glass);win.position.set(side*1.535,2.85,w);car.add(win)}
    if(isLead){const windshield=new THREE.Mesh(new THREE.BoxGeometry(2.25,1.1,.06),glass);windshield.position.set(0,3.0,-len/2-.04);car.add(windshield);for(const x of [-.85,.85]){const l=new THREE.PointLight(0xfff2c7,1.8,35);l.position.set(x,1.75,-len/2-.2);car.add(l)}}
    for(const z of [-len*.32,len*.32])for(const x of [-1.15,1.15]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.2,16),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.55,z);car.add(wheel)}
    car.userData.offset=i*25;group.add(car);
  }
  return group;
}
function placeObjectOnTrack(obj,curve,distance,d,side=0,y=0){const f=frameAt(curve,clamp(d/distance,0,1));obj.position.copy(f.p).addScaledVector(f.right,side).addScaledVector(f.up,y);obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.right,f.up,f.t.clone().negate()));}
function buildWorld(scene,data,{mode,stations,train}){
  const root=new THREE.Group();scene.add(root);const {curve,distance}=data;
  const ballastMat=new THREE.MeshStandardMaterial({color:mode==='subway'?0x303336:0x625f58,roughness:1});
  const groundMat=new THREE.MeshStandardMaterial({color:0x56774e,roughness:1});
  const railMat=new THREE.MeshStandardMaterial({color:0xc8d0d2,metalness:.9,roughness:.22});
  const sleeperMat=new THREE.MeshStandardMaterial({color:0x47382c,roughness:.9});
  const platformMat=new THREE.MeshStandardMaterial({color:0xb8b8b0,roughness:.85});
  if(mode==='surface'){
    const g=new THREE.Mesh(ribbon(curve,90,12,-.65),groundMat);root.add(g);
    const ballast=new THREE.Mesh(ribbon(curve,4.2,4,-.18),ballastMat);root.add(ballast);
  } else {
    const shell=new THREE.Mesh(tube(curve,5.3,1200,16),new THREE.MeshStandardMaterial({color:0x4b5052,roughness:.8,side:THREE.BackSide}));root.add(shell);
  }
  for(const off of [-.72,.72]){const rc=localCurveOffset(curve,off),rail=new THREE.Mesh(tube(rc,.075,1200,6),railMat);rail.position.y=.05;root.add(rail)}
  const spacing=mode==='subway'?0.7:0.65,nSleep=Math.min(8000,Math.max(1,Math.floor(distance/spacing))),sleepGeo=new THREE.BoxGeometry(2.8,.15,.25),sleep=new THREE.InstancedMesh(sleepGeo,sleeperMat,nSleep),dummy=new THREE.Object3D();
  for(let i=0;i<nSleep;i++){const f=frameAt(curve,i/Math.max(1,nSleep-1));dummy.position.copy(f.p).addScaledVector(f.up,-.06);dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.right,f.up,f.t));dummy.updateMatrix();sleep.setMatrixAt(i,dummy.matrix)}sleep.instanceMatrix.needsUpdate=true;root.add(sleep);
  if(mode==='surface'&&train.kind==='electric'){
    const poleMat=new THREE.MeshStandardMaterial({color:0x60696c,metalness:.7,roughness:.35}),wireMat=new THREE.MeshBasicMaterial({color:0x2b3032});
    const poles=Math.min(700,Math.floor(distance/45));for(let i=0;i<=poles;i++){const d=i*distance/Math.max(1,poles),f=frameAt(curve,d/distance),grp=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,6.8,8),poleMat);pole.position.y=3.35;grp.add(pole);const arm=new THREE.Mesh(new THREE.BoxGeometry(3,.07,.07),poleMat);arm.position.set(1.25,6.25,0);grp.add(arm);placeObjectOnTrack(grp,curve,distance,d,-2.2,0);root.add(grp)}
    const wireCurve=localCurveOffset(curve,0),wire=new THREE.Mesh(tube(wireCurve,.018,1400,4),wireMat);wire.position.y=5.9;root.add(wire);
  }
  stations.forEach((s,idx)=>{
    const grp=new THREE.Group(),plat=new THREE.Mesh(new THREE.BoxGeometry(4,.65,120),platformMat);plat.position.y=.25;grp.add(plat);
    const canopy=new THREE.Mesh(new THREE.BoxGeometry(3.3,.18,65),new THREE.MeshStandardMaterial({color:0x34434a,metalness:.4,roughness:.45}));canopy.position.set(0,3.4,0);grp.add(canopy);
    for(const z of [-28,0,28]){const post=new THREE.Mesh(new THREE.BoxGeometry(.16,3.2,.16),new THREE.MeshStandardMaterial({color:0x5f6a70,metalness:.55,roughness:.4}));post.position.set(0,1.7,z);grp.add(post)}
    placeObjectOnTrack(grp,curve,distance,s.d,3.65,0);root.add(grp);
    const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;const c=signCanvas.getContext('2d');c.fillStyle='#102329';c.fillRect(0,0,512,128);c.fillStyle='#fff';c.font='bold 42px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(s.name,256,64);const tex=new THREE.CanvasTexture(signCanvas),sign=new THREE.Mesh(new THREE.PlaneGeometry(5,1.25),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));placeObjectOnTrack(sign,curve,distance,s.d,2.05,2.45);root.add(sign);
  });
  const sigMat=new THREE.MeshStandardMaterial({color:0x222a2d,metalness:.55,roughness:.4});for(let d=700;d<distance;d+=1200){const grp=new THREE.Group(),post=new THREE.Mesh(new THREE.BoxGeometry(.12,3.5,.12),sigMat);post.position.y=1.75;grp.add(post);const head=new THREE.Mesh(new THREE.BoxGeometry(.6,1.3,.45),sigMat);head.position.y=3.7;grp.add(head);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshBasicMaterial({color:0x46ff82}));lamp.position.set(0,3.85,-.24);grp.add(lamp);placeObjectOnTrack(grp,curve,distance,d,-2.4,0);root.add(grp)}
  return root;
}
function createRenderer(el){const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.setSize(el.clientWidth,el.clientHeight,false);renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.appendChild(renderer.domElement);return renderer}
function sky(scene,mode){scene.background=new THREE.Color(mode==='subway'?0x050708:0x86bad2);scene.fog=new THREE.Fog(mode==='subway'?0x101416:0x9fbfc8,180,mode==='subway'?1200:3600);const hemi=new THREE.HemisphereLight(mode==='subway'?0x68727a:0xdaf4ff,mode==='subway'?0x1d1f21:0x50684d,mode==='subway' ? 0.55 : 1.8);scene.add(hemi);const sun=new THREE.DirectionalLight(0xfff3d8,mode==='subway' ? 0.15 : 2.4);sun.position.set(-300,500,-150);scene.add(sun)}
function addCab(camera){const cab=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x11191d,roughness:.6,metalness:.3});const dash=new THREE.Mesh(new THREE.BoxGeometry(4.4,.75,1.3),mat);dash.position.set(0,-1.25,-2);cab.add(dash);for(const x of [-2.05,2.05]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.22,4,.28),mat);pillar.position.set(x,0,-2.4);cab.add(pillar)}const top=new THREE.Mesh(new THREE.BoxGeometry(4.5,.22,.3),mat);top.position.set(0,1.75,-2.35);cab.add(top);camera.add(cab);return cab}
export function World3D({route,terrain=[],stations=[],train,state,mode,cameraMode='cab'}){
  const mount=useRef(null),stateRef=useRef(state);useEffect(()=>{stateRef.current=state},[state]);
  useEffect(()=>{const el=mount.current;if(!el||route.length<2)return;const renderer=createRenderer(el),scene=new THREE.Scene();sky(scene,mode);const camera=new THREE.PerspectiveCamera(68,el.clientWidth/el.clientHeight,.08,7000);scene.add(camera);const data=makeRouteData(route,terrain);if(!data){renderer.dispose();return}const world=buildWorld(scene,data,{mode,stations,train});
    const consist=new THREE.Group();addTrain(consist,train,true);scene.add(consist);const cab=addCab(camera);const cars=[...consist.children];let raf;
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();
    const loop=()=>{const s=stateRef.current||{x:0,v:0},u=clamp(s.x/data.distance,0,1),f=frameAt(data.curve,u);cars.forEach((car,i)=>{const d=clamp(s.x-i*25,0,data.distance),ff=frameAt(data.curve,d/data.distance);car.position.copy(ff.p).addScaledVector(ff.up,.15);car.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ff.right,ff.up,ff.t.clone().negate()))});
      consist.visible=cameraMode!=='cab';cab.visible=cameraMode==='cab';
      const lookD=Math.min(data.distance,s.x+(cameraMode==='cab'?55:80)),lf=frameAt(data.curve,lookD/data.distance);
      if(cameraMode==='cab'){camera.position.copy(f.p).addScaledVector(f.up,3.25);camera.lookAt(lf.p.clone().addScaledVector(lf.up,2.1));}
      else if(cameraMode==='chase'){camera.position.copy(f.p).addScaledVector(f.up,8).addScaledVector(f.t,-28).addScaledVector(f.right,10);camera.lookAt(f.p.clone().addScaledVector(f.up,2));}
      else{camera.position.copy(f.p).addScaledVector(f.up,32).addScaledVector(f.right,34).addScaledVector(f.t,-18);camera.lookAt(f.p)}
      if(mode==='subway'){const light=camera.userData.headlight||(camera.userData.headlight=new THREE.PointLight(0xfff1cd,3.5,85));if(!light.parent)camera.add(light);light.position.set(0,.2,-1);}
      renderer.render(scene,camera);raf=requestAnimationFrame(loop)};loop();
    return()=>{cancelAnimationFrame(raf);ro.disconnect();disposeTree(world);disposeTree(consist);renderer.dispose();renderer.domElement.remove()};
  },[route,terrain,stations,train,mode,cameraMode]);return <div ref={mount} className="three-world"/>;
}
export function TrainPreview3D({train}){const mount=useRef(null);useEffect(()=>{const el=mount.current;if(!el)return;const renderer=createRenderer(el),scene=new THREE.Scene();scene.background=new THREE.Color(0x071015);const camera=new THREE.PerspectiveCamera(48,el.clientWidth/el.clientHeight,.1,500);camera.position.set(18,10,33);camera.lookAt(0,2,0);scene.add(new THREE.HemisphereLight(0xdff6ff,0x132229,2.2));const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(10,20,10);scene.add(key);const floor=new THREE.Mesh(new THREE.PlaneGeometry(110,45),new THREE.MeshStandardMaterial({color:0x101c22,roughness:.95}));floor.rotation.x=-Math.PI/2;scene.add(floor);const g=new THREE.Group();addTrain(g,train,false);g.rotation.y=-Math.PI/2;g.position.set(-((Math.min(train.carCount+1,7)-1)*12),0,0);scene.add(g);let raf,a=0;const loop=()=>{a+=.0025;camera.position.x=30*Math.cos(a);camera.position.z=30*Math.sin(a);camera.position.y=9;camera.lookAt(0,2,0);renderer.render(scene,camera);raf=requestAnimationFrame(loop)};loop();const ro=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/Math.max(1,el.clientHeight);camera.updateProjectionMatrix()});ro.observe(el);return()=>{cancelAnimationFrame(raf);ro.disconnect();disposeTree(g);renderer.dispose();renderer.domElement.remove()}},[train]);return <div ref={mount} className="train-preview-3d"/>}

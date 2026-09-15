
import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {loadPBR,steel} from './assets';
import {makeRailProfile,makeTie,makeSignal,makePlatform,makeTrain,makeBuilding,makeTree} from './models';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export default function Simulator({route,onExit}){
 const host=useRef(), world=useRef(null), [hud,setHud]=useState({mph:0,power:0,brake:0,fps:60,cam:'CAB'}), ctl=useRef({power:0,brake:0,s:5,v:0,cam:'CAB',yaw:0,pitch:0,zoom:60,lat:0,up:0});
 useEffect(()=>{let dead=false,raf,renderer,scene,camera,train; const init=async()=>{
   const el=host.current,w=el.clientWidth,h=el.clientHeight;scene=new THREE.Scene();scene.background=new THREE.Color(0x9dc7e8);scene.fog=new THREE.FogExp2(0xb9c8ce,.0017);
   camera=new THREE.PerspectiveCamera(60,w/h,.08,1800);renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.appendChild(renderer.domElement);
   scene.add(new THREE.HemisphereLight(0xcce7ff,0x59684d,1.7));const sun=new THREE.DirectionalLight(0xfff2d6,3.2);sun.position.set(-120,180,-90);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;scene.add(sun);
   const [grass,ballast,concrete,brick]=await Promise.all([loadPBR('grass',[80,80]),loadPBR('ballast',[2,24]),loadPBR('concrete',[12,2]),loadPBR('brick',[3,3])]); if(dead)return;
   const ground=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600,1,1),grass);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
   const bed=new THREE.Mesh(new THREE.BoxGeometry(7,.38,1200),ballast);bed.position.set(0,.18,-450);bed.receiveShadow=true;scene.add(bed);
   const railMat=steel(); for(const x of [-.7175,.7175]){const r=makeRailProfile(1200,railMat);r.rotation.y=-Math.PI/2;r.position.set(x,.43,150);r.castShadow=true;scene.add(r)}
   for(let z=145;z>-1040;z-=.62){const t=makeTie(concrete);t.position.set(0,.36,z);scene.add(t)}
   const plat=makePlatform(concrete,1);plat.position.z=-105;scene.add(plat);
   for(let z=80;z>-900;z-=280){const sig=makeSignal();sig.position.set(-3.1,0,z);scene.add(sig)}
   for(let z=-160;z>-850;z-=90){const b=makeBuilding(brick,concrete,14+(Math.random()*16),z,12+Math.random()*15,10+Math.random()*10,8+Math.random()*20);scene.add(b);const b2=makeBuilding(brick,concrete,-18-Math.random()*20,z-35,14+Math.random()*12,10+Math.random()*12,10+Math.random()*18);scene.add(b2)}
   for(let i=0;i<100;i++){const t=makeTree();t.position.set((Math.random()<.5?-1:1)*(8+Math.random()*55),0,120-Math.random()*1100);t.scale.setScalar(.7+Math.random()*.9);scene.add(t)}
   train=makeTrain('#9b1c1c','#e7e5e4',route.cars||4);scene.add(train);
   world.current={scene,camera,renderer,train};
   let last=performance.now(),acc=0,frames=0,fps=60;
   const tick=(now)=>{if(dead)return;const dt=Math.min(.05,(now-last)/1000);last=now;const c=ctl.current;
     const mass=route.mass||260000, maxF=route.tractive||280000, drag=1200+c.v*c.v*12, brakeF=c.brake*340000, tractive=c.power*maxF;
     c.v=Math.max(0,c.v+(tractive-drag-brakeF)/mass*dt);c.s+=c.v*dt;
     train.position.z=150-c.s;train.position.y=.5;
     const mph=c.v*2.23694; const camMode=c.cam;
     const baseZ=train.position.z;
     if(camMode==='CAB'){camera.position.set(c.lat,3.2+c.up,baseZ-7.5);camera.rotation.order='YXZ';camera.rotation.set(c.pitch,c.yaw,0);camera.fov=c.zoom}
     else if(camMode==='CHASE'){camera.position.set(8+c.lat,5+c.up,baseZ+18);camera.lookAt(train.position.x,2,baseZ-10);camera.fov=c.zoom}
     else if(camMode==='TRACKSIDE'){camera.position.set(12+c.lat,2+c.up,baseZ-40);camera.lookAt(0,2,baseZ);camera.fov=c.zoom}
     else {camera.position.set(5+c.lat,3+c.up,-105);camera.lookAt(0,2,baseZ);camera.fov=c.zoom}
     camera.updateProjectionMatrix();renderer.render(scene,camera);frames++;acc+=dt;if(acc>.5){fps=Math.round(frames/acc);frames=0;acc=0;setHud({mph,power:c.power,brake:c.brake,fps,cam:c.cam})}raf=requestAnimationFrame(tick)};
   raf=requestAnimationFrame(tick);
   const resize=()=>{const W=el.clientWidth,H=el.clientHeight;camera.aspect=W/H;camera.updateProjectionMatrix();renderer.setSize(W,H)};window.addEventListener('resize',resize);
   world.current.cleanup=()=>window.removeEventListener('resize',resize);
 };init();return()=>{dead=true;cancelAnimationFrame(raf);world.current?.cleanup?.();renderer?.dispose();host.current&&(host.current.innerHTML='')};},[]);
 const set=(k,v)=>ctl.current[k]=v;
 const cycle=()=>{const a=['CAB','CHASE','TRACKSIDE','STATION'];const i=a.indexOf(ctl.current.cam);set('cam',a[(i+1)%a.length])};
 return <div className="sim"><div ref={host} className="viewport"/><div className="topbar"><b>WORLDRAIL</b><span>{hud.cam}</span><span>{hud.fps} FPS</span><button onClick={cycle}>CAMERA</button><button onClick={onExit}>EXIT</button></div>
 <div className="speed"><strong>{Math.round(hud.mph)}</strong><small>MPH</small><i>LIMIT 79</i></div>
 <div className="cabstats"><span>POWER {Math.round(hud.power*100)}%</span><span>BRAKE {Math.round(hud.brake*100)}%</span><span>NEXT: CENTRAL • 1.8 MI</span></div>
 <div className="touch">
   <div className="lever"><label>POWER</label><input type="range" min="0" max="1" step=".01" defaultValue="0" onInput={e=>set('power',+e.target.value)}/></div>
   <div className="camctl"><button onPointerDown={()=>set('lat',ctl.current.lat-.4)}>←</button><button onPointerDown={()=>set('up',ctl.current.up+.3)}>↑</button><button onPointerDown={()=>set('up',ctl.current.up-.3)}>↓</button><button onPointerDown={()=>set('lat',ctl.current.lat+.4)}>→</button><button onClick={()=>set('zoom',clamp(ctl.current.zoom-5,25,90))}>＋</button><button onClick={()=>set('zoom',clamp(ctl.current.zoom+5,25,90))}>−</button></div>
   <div className="lever brake"><label>BRAKE</label><input type="range" min="0" max="1" step=".01" defaultValue="0" onInput={e=>set('brake',+e.target.value)}/></div>
 </div></div>
}

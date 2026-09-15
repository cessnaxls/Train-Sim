
import * as THREE from 'three';
import {steel,paintedMetal,glass} from './assets';

export function makeRailProfile(length,mat){
  const shape=new THREE.Shape();
  shape.moveTo(-.07,0);shape.lineTo(.07,0);shape.lineTo(.075,.025);shape.lineTo(.035,.045);
  shape.lineTo(.025,.13);shape.lineTo(.06,.145);shape.lineTo(.055,.18);shape.lineTo(-.055,.18);
  shape.lineTo(-.06,.145);shape.lineTo(-.025,.13);shape.lineTo(-.035,.045);shape.lineTo(-.075,.025);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1}); g.rotateY(Math.PI/2);
  return new THREE.Mesh(g,mat||steel());
}
export function makeTie(mat){
  const g=new THREE.BoxGeometry(2.7,.18,.26,4,1,2); const m=new THREE.Mesh(g,mat); m.castShadow=m.receiveShadow=true; return m;
}
export function makeSignal(){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,4,12),new THREE.MeshStandardMaterial({color:0x303438,metalness:.7,roughness:.35}));pole.position.y=2;g.add(pole);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.42,1.05,.3),new THREE.MeshStandardMaterial({color:0x151719,metalness:.45,roughness:.4}));head.position.set(0,3.65,0);g.add(head);
  [0xff2b2b,0xffc928,0x42ff68].forEach((c,i)=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.11,20,12),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i===2?4:.1}));l.position.set(0,3.95-i*.3,-.17);g.add(l)});
  return g;
}
export function makePlatform(concrete,side=1){
  const g=new THREE.Group(), deck=new THREE.Mesh(new THREE.BoxGeometry(95,.6,4.3),concrete);deck.position.set(0,.3,side*4.2);deck.receiveShadow=true;g.add(deck);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(95,.05,.45),new THREE.MeshStandardMaterial({color:0xe0b820,roughness:.72}));edge.position.set(0,.63,side*2.25);g.add(edge);
  for(let x=-40;x<=40;x+=16){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,3.2,12),steel());post.position.set(x,2,side*5);g.add(post);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.12,16,10),new THREE.MeshStandardMaterial({color:0xfff4d2,emissive:0xffe0a0,emissiveIntensity:2.5}));lamp.position.set(x,3.55,side*5);g.add(lamp);
  }
  return g;
}
export function makeTrain(body='#b91c1c',stripe='#e5e7eb',cars=4){
  const consist=new THREE.Group();
  for(let c=0;c<cars;c++){
    const car=new THREE.Group(), L=19.5, z=-c*20.3;
    const shell=new THREE.Mesh(new THREE.BoxGeometry(3.05,2.8,L,3,3,12),paintedMetal(body));shell.position.y=2.15;shell.castShadow=true;car.add(shell);
    const roof=new THREE.Mesh(new THREE.CylinderGeometry(1.53,1.53,L,24,1,false,0,Math.PI),new THREE.MeshStandardMaterial({color:0x8a8e91,metalness:.7,roughness:.32}));roof.rotation.x=Math.PI/2;roof.rotation.z=Math.PI/2;roof.position.y=3.55;car.add(roof);
    const band=new THREE.Mesh(new THREE.BoxGeometry(3.09,.24,L+.02),new THREE.MeshStandardMaterial({color:stripe,metalness:.4,roughness:.3}));band.position.y=2.55;car.add(band);
    for(let i=-7;i<=7;i+=2.25)for(const s of [-1,1]){
      const w=new THREE.Mesh(new THREE.PlaneGeometry(1.35,.72),glass());w.position.set(s*1.531,2.65,i);w.rotation.y=s>0?-Math.PI/2:Math.PI/2;car.add(w);
    }
    for(const bz of [-6.5,6.5]){const bog=new THREE.Group();for(const wz of [-1.05,1.05])for(const s of [-1,1]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.16,24),new THREE.MeshStandardMaterial({color:0x202124,metalness:.82,roughness:.38}));wh.rotation.z=Math.PI/2;wh.position.set(s*1.34,.55,bz+wz);bog.add(wh)}car.add(bog)}
    car.position.z=z;consist.add(car);
  }
  return consist;
}
export function makeBuilding(brick,concrete,x,z,w=16,d=12,h=12){
  const g=new THREE.Group(); const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),brick);body.position.y=h/2;body.castShadow=body.receiveShadow=true;g.add(body);
  for(let yy=2.5;yy<h-1;yy+=3)for(let xx=-w/2+2;xx<w/2-1;xx+=3.2){
    const win=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.35),glass());win.position.set(xx,yy,-d/2-.012);g.add(win);
  }
  const sill=new THREE.Mesh(new THREE.BoxGeometry(w+.2,.25,d+.2),concrete);sill.position.y=.15;g.add(sill);g.position.set(x,0,z);return g;
}
export function makeTree(){
  const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.34,3.4,10),new THREE.MeshStandardMaterial({color:0x5a3b27,roughness:1}));trunk.position.y=1.7;g.add(trunk);
  const leafMat=new THREE.MeshStandardMaterial({color:0x315f2d,roughness:.9});
  [[0,4,0,1.6],[.8,4.2,.2,1.25],[-.8,4.1,-.1,1.3],[.2,5,.2,1.25]].forEach(([x,y,z,r])=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),leafMat);m.position.set(x,y,z);m.castShadow=true;g.add(m)});return g;
}

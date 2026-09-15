
import * as THREE from 'three';

const PH='https://dl.polyhaven.org/file/ph-assets/Textures';
const tex=(asset,map,ext='jpg',res='2k')=>`${PH}/${ext}/${res}/${asset}/${asset}_${map}_${res}.${ext}`;

export const ASSET_CATALOG={
  ballast:{name:'Poly Haven Gravel Road',license:'CC0',source:'Poly Haven',maps:{
    color:tex('gravel_road','diff'),normal:tex('gravel_road','nor_gl'),rough:tex('gravel_road','rough','png')
  }},
  grass:{name:'Poly Haven Leafy Grass',license:'CC0',source:'Poly Haven',maps:{
    color:tex('leafy_grass','diff'),normal:tex('leafy_grass','nor_gl'),rough:tex('leafy_grass','rough','png')
  }},
  concrete:{name:'Poly Haven Concrete Pavement',license:'CC0',source:'Poly Haven',maps:{
    color:tex('concrete_pavement','diff'),normal:tex('concrete_pavement','nor_gl'),rough:tex('concrete_pavement','rough','png')
  }},
  brick:{name:'Poly Haven Brick Wall 001',license:'CC0',source:'Poly Haven',maps:{
    color:tex('brick_wall_001','diff'),normal:tex('brick_wall_001','nor_gl'),rough:tex('brick_wall_001','rough','png')
  }},
  asphalt:{name:'Poly Haven Asphalt 02',license:'CC0',source:'Poly Haven',maps:{
    color:tex('asphalt_02','diff'),normal:tex('asphalt_02','nor_gl'),rough:tex('asphalt_02','rough','png')
  }},
  wood:{name:'Poly Haven Wood Planks',license:'CC0',source:'Poly Haven',maps:{
    color:tex('wood_planks','diff'),normal:tex('wood_planks','nor_gl'),rough:tex('wood_planks','rough','png')
  }}
};

function canvasFallback(kind){
  const c=document.createElement('canvas'); c.width=c.height=512;
  const x=c.getContext('2d'); const img=x.createImageData(512,512);
  const palettes={
    ballast:[[78,75,70],[105,101,92],[133,128,116],[62,60,57]],
    grass:[[45,70,38],[64,88,45],[83,100,55],[36,58,32]],
    concrete:[[126,124,118],[150,147,139],[102,101,98],[166,162,153]],
    brick:[[105,54,42],[130,68,50],[83,42,34],[155,87,62]],
    asphalt:[[48,48,47],[63,62,60],[35,36,36],[78,76,72]],
    wood:[[99,67,42],[122,82,48],[76,50,34],[145,100,61]]
  };
  const p=palettes[kind]||palettes.concrete;
  for(let y=0;y<512;y++)for(let xx=0;xx<512;xx++){
    const n=Math.random(), a=p[Math.floor(Math.random()*p.length)];
    const grain=(Math.sin(xx*.18)+Math.sin(y*.11))*5+(n-.5)*25;
    const i=(y*512+xx)*4; img.data[i]=a[0]+grain;img.data[i+1]=a[1]+grain;img.data[i+2]=a[2]+grain;img.data[i+3]=255;
  }
  x.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.SRGBColorSpace; return t;
}
export async function loadPBR(kind,repeat=[8,8]){
  const spec=ASSET_CATALOG[kind], loader=new THREE.TextureLoader();
  const load=url=>new Promise((ok,bad)=>loader.load(url,ok,undefined,bad));
  let color,normal,roughness;
  try{
    [color,normal,roughness]=await Promise.all([load(spec.maps.color),load(spec.maps.normal),load(spec.maps.rough)]);
    color.colorSpace=THREE.SRGBColorSpace;
  }catch(e){ color=canvasFallback(kind); normal=null; roughness=null; }
  for(const t of [color,normal,roughness].filter(Boolean)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;}
  return new THREE.MeshStandardMaterial({map:color,normalMap:normal,roughnessMap:roughness,roughness:.88,metalness:0});
}
export function steel(){
  return new THREE.MeshPhysicalMaterial({color:0xb8bcc0,metalness:.92,roughness:.22,clearcoat:.18,clearcoatRoughness:.2});
}
export function paintedMetal(color='#1d4ed8'){
  return new THREE.MeshPhysicalMaterial({color,metalness:.62,roughness:.28,clearcoat:.85,clearcoatRoughness:.12});
}
export function glass(){
  return new THREE.MeshPhysicalMaterial({color:0x8eb5c7,transmission:.72,transparent:true,opacity:.5,roughness:.08,metalness:0,ior:1.5,thickness:.03});
}

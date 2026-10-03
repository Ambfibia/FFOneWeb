export {};
type Marker = { x: number; y: number; name: string; id?: string; type?: number };
type Snapshot = { connected: boolean; updatedAt: number; players: Marker[] };
const canvas = document.querySelector<HTMLCanvasElement>('#world-map')!;
const ctx = canvas.getContext('2d')!;
const status = document.querySelector<HTMLElement>('#map-status')!;
const detail = document.querySelector<HTMLElement>('#map-detail')!;
const search = document.querySelector<HTMLInputElement>('#map-search')!;
const playersToggle = document.querySelector<HTMLInputElement>('#map-players')!;
const npcsToggle = document.querySelector<HTMLInputElement>('#map-npcs')!;
const image = new Image(); image.src = '/images/world-map.png';
let npcs: Marker[] = [], players: Marker[] = [], scale = 1, centerX = .5, centerY = .5;
let visible: { marker: Marker; x: number; y: number; player: boolean }[] = [];
let drag: { x: number; y: number; moved: boolean } | null = null;
let loading = false, npcLoaded = false;
// Same 16 × 51200 world bounds and inverted Y used by OpenFusionMap-rs.
const point = (m: Marker) => ({ x: m.x / 819200, y: 1 - m.y / 819200 });
function draw() {
 const w = canvas.width, h = canvas.height, size = Math.min(w, h) * scale;
 centerX = Math.max(0, Math.min(1, centerX)); centerY = Math.max(0, Math.min(1, centerY));
 const ox = w / 2 - centerX * size, oy = h / 2 - centerY * size;
 ctx.fillStyle = '#00111b'; ctx.fillRect(0, 0, w, h);
 if (image.complete && image.naturalWidth) ctx.drawImage(image, ox, oy, size, size);
 visible = [];
 const query = search.value.trim().toLocaleLowerCase('ru');
 function markers(items: Marker[], player: boolean) {
  for (const marker of items) {
   if (!player && query && !marker.name.toLocaleLowerCase('ru').includes(query)) continue;
   const p = point(marker); if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) continue;
   const x = ox + p.x * size, y = oy + p.y * size;
   if (x < 0 || y < 0 || x > w || y > h) continue;
   ctx.beginPath(); ctx.arc(x, y, player ? 6 : 3.5, 0, Math.PI * 2);
   ctx.fillStyle = player ? '#52e5ff' : '#ffe17a'; ctx.fill();
   ctx.strokeStyle = '#002438'; ctx.lineWidth = 1.5; ctx.stroke();
   visible.push({ marker, x, y, player });
  }
 }
 if (npcsToggle.checked) markers(npcs, false);
 if (playersToggle.checked) markers(players, true);
}
function zoom(amount: number) { scale = Math.max(1, Math.min(16, scale * amount)); draw(); }
function cursor(event: PointerEvent) {
 const r = canvas.getBoundingClientRect();
 return { x: (event.clientX-r.left)*canvas.width/r.width, y: (event.clientY-r.top)*canvas.height/r.height };
}
canvas.addEventListener('pointerdown', event => { if(event.button !== 0) return; canvas.setPointerCapture(event.pointerId); drag = { ...cursor(event), moved: false }; });
canvas.addEventListener('pointermove', event => {
 if (!drag) return;
 const p = cursor(event), size = Math.min(canvas.width, canvas.height)*scale;
 if (Math.abs(p.x-drag.x)+Math.abs(p.y-drag.y)>2) drag.moved=true;
 centerX -= (p.x-drag.x)/size; centerY -= (p.y-drag.y)/size;
 drag.x=p.x; drag.y=p.y; draw();
});
canvas.addEventListener('pointerup', event => {
 if (drag && !drag.moved) {
  const p=cursor(event);
  const selected=visible.filter(m=>Math.hypot(m.x-p.x,m.y-p.y)<12).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  detail.textContent=selected ? `${selected.player?'Игрок':'NPC'}: ${selected.marker.name} · X: ${Math.round(selected.marker.x)}, Y: ${Math.round(selected.marker.y)}` : 'В этой точке нет метки.';
 }
 drag=null;
});
canvas.addEventListener('pointercancel', ()=>drag=null);
canvas.addEventListener('wheel', event=>{event.preventDefault();zoom(event.deltaY<0?1.2:1/1.2);},{passive:false});
canvas.addEventListener('keydown', event=>{
 const delta=.08/scale;
 if(event.key==='+'||event.key==='=') zoom(1.4);
 else if(event.key==='-') zoom(1/1.4);
 else if(event.key==='ArrowLeft') centerX-=delta;
 else if(event.key==='ArrowRight') centerX+=delta;
 else if(event.key==='ArrowUp') centerY-=delta;
 else if(event.key==='ArrowDown') centerY+=delta;
 else return;
 event.preventDefault();draw();
});
document.querySelector('#map-plus')!.addEventListener('click',()=>zoom(1.4));
document.querySelector('#map-minus')!.addEventListener('click',()=>zoom(1/1.4));
document.querySelector('#map-reset')!.addEventListener('click',()=>{scale=1;centerX=centerY=.5;draw();});
[playersToggle,npcsToggle,search].forEach(input=>input.addEventListener('input',draw));
image.addEventListener('load',draw);
image.addEventListener('error',()=>{detail.textContent='Не удалось загрузить изображение карты. Обновите страницу.';});
async function refresh() {
 if (document.querySelector<HTMLElement>('[data-view="map"]')!.hidden || document.hidden || loading) return;
 loading=true;
 try {
  if (!npcLoaded) { const response=await fetch('/map-api/npcs',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('NPC');npcs=await response.json();npcLoaded=true; }
  const response=await fetch('/map-api/players',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Monitor');
  const data: Snapshot=await response.json();
  const live=data.connected && Date.now()-data.updatedAt<15000;
  players=live?data.players:[];
  status.textContent=live ? `Сервер онлайн · Игроков: ${players.length} · NPC: ${npcs.length}` : `Связь с сервером потеряна · NPC: ${npcs.length}`;
 } catch {players=[];status.textContent=npcLoaded?`Игроки временно недоступны · NPC: ${npcs.length}`:'Данные карты временно недоступны.';}
 finally {loading=false;draw();}
}
window.addEventListener('hashchange',()=>setTimeout(refresh,0));
document.addEventListener('visibilitychange',refresh);
setInterval(refresh,3000);setTimeout(refresh,0);draw();

import net from 'node:net';
import http from 'node:http';
import fs from 'node:fs';

// Only public player positions are forwarded. Chat, email and moderation
// events from the shared monitor feed are deliberately discarded.
const root = process.env.MAP_TABLEDATA || '/opt/rustyfusion/tabledata';
const table = JSON.parse(fs.readFileSync(`${root}/xdt.json`, 'utf8')).m_pNpcTable;
const placement = JSON.parse(fs.readFileSync(`${root}/NPCs.json`, 'utf8')).NPCs;
const definitions = new Map(table.m_pNpcData.map(npc => [npc.m_iNpcNumber, npc]));
const npcs = Object.entries(placement).filter(([, npc]) => !npc.iMapNum).map(([id, npc]) => {
 const definition = definitions.get(npc.iNPCType);
 return { id, type: npc.iNPCType, name: table.m_pNpcStringData[definition?.m_iNpcName]?.m_strName || `NPC ${npc.iNPCType}`, x: npc.iX, y: npc.iY };
});
let players = [], updatedAt = 0, connected = false;
function connect() {
 let buffer = '', batch = null;
 const socket = net.createConnection({ host: '127.0.0.1', port: Number(process.env.MONITOR_PORT || 8003) });
 socket.setEncoding('utf8');
 socket.setTimeout(15000, () => socket.destroy());
 socket.on('data', chunk => {
  buffer += chunk;
  if (buffer.length > 2_000_000) { socket.destroy(); return; }
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
   const line = buffer.slice(0, end).trimEnd(); buffer = buffer.slice(end + 1);
   if (line === 'begin') batch = [];
   else if (line === 'end' && batch) { players = batch; batch = null; updatedAt = Date.now(); connected = true; }
   else if (batch) {
    const match = /^player (-?\d+) (-?\d+) (.{1,128})$/u.exec(line);
    if (match) batch.push({ x: Number(match[1]), y: Number(match[2]), name: match[3] });
   }
  }
 });
 socket.on('error', () => {});
 socket.on('close', () => { connected = false; players = []; setTimeout(connect, 3000); });
}
connect();
http.createServer((request, response) => {
 const live = connected && Date.now() - updatedAt < 15000;
 const payload = request.url === '/players' ? { connected: live, updatedAt, players: live ? players : [] }
  : request.url === '/npcs' ? npcs : null;
 response.writeHead(payload ? 200 : 404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
 response.end(JSON.stringify(payload || { error: 'Not found' }));
}).listen(Number(process.env.MAP_API_PORT || 8890), '127.0.0.1');

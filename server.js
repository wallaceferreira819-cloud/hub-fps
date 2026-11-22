const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const server = http.createServer((req,res)=>{
  let file = req.url === '/' ? '/index.html' : req.url;
  const full = path.join(__dirname,'public',path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(full,(err,data)=>{
    if(err){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':full.endsWith('.js')?'text/javascript': 'text/html'});res.end(data);
  });
});
const wss = new WebSocket.Server({server});
const players = new Map();
const MAX = 20;
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function snapshot(){return [...players.values()].map(p=>({id:p.id,x:p.x,z:p.z,rot:p.rot,name:p.name}));}
wss.on('connection',ws=>{
  if(players.size>=MAX){send(ws,{type:'full'});ws.close();return;}
  const id = Math.random().toString(36).slice(2,9);
  const p={id,x:(Math.random()-.5)*18,z:(Math.random()-.5)*18,rot:0,name:'Jogador'};
  players.set(id,p);
  send(ws,{type:'welcome',id,players:snapshot(),max:MAX});
  for(const other of wss.clients) if(other!==ws) send(other,{type:'join',player:p});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return;}
    if(m.type==='move'){
      p.x=Math.max(-48,Math.min(48,Number(m.x)||0));
      p.z=Math.max(-48,Math.min(48,Number(m.z)||0));
      p.rot=Number(m.rot)||0;
      if(typeof m.name==='string')p.name=m.name.slice(0,16);
    }
  });
  ws.on('close',()=>{
    players.delete(id);
    for(const other of wss.clients)send(other,{type:'leave',id});
  });
});
setInterval(()=>{const data=JSON.stringify({type:'state',players:snapshot()});for(const ws of wss.clients)if(ws.readyState===WebSocket.OPEN)ws.send(data)},50);
server.listen(PORT,()=>console.log(`Zona de Combate rodando na porta ${PORT}`));
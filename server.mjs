import { createServer } from 'http';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, createReadStream, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || process.env.APP_PORT || 3000);

const MIME = {
  '.html':'text/html; charset=utf-8','.js':'application/javascript',
  '.css':'text/css','.json':'application/json','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.mp4':'video/mp4',
  '.webm':'video/webm','.woff2':'font/woff2','.woff':'font/woff',
  '.ttf':'font/ttf','.webp':'image/webp',
};

async function getKickLive() {
  try {
    const { stdout } = await execFileAsync('curl',[
      '-s','--max-time','8',
      '-H','User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      '-H','Accept: application/json',
      '-H','Referer: https://kick.com/',
      'https://kick.com/api/v2/channels/maramjk/livestream',
    ],{ timeout:10000 });
    const j = JSON.parse(stdout);
    if(j && j.data) return { live:true, title:j.data.session_title||'Live', viewers:j.data.viewers||0 };
    return { live:false };
  } catch(e) { console.error('kick error:',e.message); return { live:false }; }
}

createServer(async(req,res)=>{
  const url=(req.url||'/').split('?')[0];
  console.log(req.method,url);
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='OPTIONS'){ res.writeHead(204);res.end();return; }

  if(url==='/api/kick/live'){
    const d=await getKickLive();
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(d));
    return;
  }

  const pub=join(__dirname,'public');
  if(existsSync(pub)){
    let fp=url==='/'?join(pub,'index.html'):join(pub,url);
    if(!existsSync(fp)) fp=join(pub,'index.html');
    try{
      const st=statSync(fp);
      const mime=MIME[extname(fp).toLowerCase()]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Content-Length':st.size});
      createReadStream(fp).pipe(res);
    }catch{ res.writeHead(404);res.end('Not found'); }
    return;
  }
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({status:'ok',message:'Maramjk API running - add public/ folder'}));
}).listen(PORT,'0.0.0.0',()=>console.log('Maramjk server on port',PORT));

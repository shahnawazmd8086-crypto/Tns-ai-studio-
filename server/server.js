const http=require('http'),fs=require('fs'),path=require('path');
const jobs=require('./jobs/video-job');
const MockProvider=require('./providers/mock');
const port=process.env.PORT||3000, publicDir=path.join(__dirname,'..','public');
const provider=new MockProvider();

const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4'};
function headers(type){return {'content-type':type,'x-content-type-options':'nosniff','x-frame-options':'SAMEORIGIN','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'"}}
function json(res,code,data){res.writeHead(code,headers('application/json'));res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let b='';let n=0;req.on('data',c=>{n+=c.length;if(n>1e6){req.destroy();reject(new Error('Body too large'));}else b+=c});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}

http.createServer(async(req,res)=>{
 try{
  if(req.url==='/health') return json(res,200,{ok:true,service:'TNS AI Studio',version:'4.0.0'});
  if(req.method==='POST'&&req.url==='/api/video/jobs'){
    const input=await body(req); const job=jobs.create(process.env.TNS_VIDEO_PROVIDER||'mock',input);
    // Real provider adapter call belongs here. Demo stays queued to avoid pretending a render occurred.
    return json(res,202,job);
  }
  if(req.method==='GET'&&req.url.startsWith('/api/video/jobs/')){
    const id=req.url.split('/').pop(); const job=jobs.get(id);
    return job?json(res,200,job):json(res,404,{error:'Job not found'});
  }
  let file=req.url.split('?')[0]; if(file==='/')file='/index.html';
  const clean=path.normalize(file).replace(/^([.][.][/\\\\])+/, '');
  const target=path.join(publicDir,clean);
  if(!target.startsWith(publicDir)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,headers(mime[path.extname(target)]||'application/octet-stream'));res.end(data)});
 }catch(e){json(res,400,{error:e.message||'Bad request'})}
}).listen(port,()=>console.log(`TNS AI Studio v4 on http://localhost:${port}`));

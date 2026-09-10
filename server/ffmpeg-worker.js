/*
TNS FFmpeg worker skeleton.
Install FFmpeg on the server and call this worker from a sandboxed job process.
Never pass untrusted strings directly to a shell. Prefer spawn() with an argument array.

Example operations to implement:
- concatenate generated scenes
- normalize audio
- burn captions
- trim/cut
- resize/crop to 9:16, 16:9, 1:1
- speed changes
- mute/replace audio
- export MP4

This file intentionally contains no unsafe shell execution.
*/
const {spawn}=require('child_process');
function runFFmpeg(args){
  return new Promise((resolve,reject)=>{
    const p=spawn('ffmpeg',args,{stdio:['ignore','pipe','pipe']});
    let err=''; p.stderr.on('data',d=>err+=d);
    p.on('error',reject);
    p.on('close',code=>code===0?resolve():reject(new Error(err||`ffmpeg exited ${code}`)));
  });
}
module.exports={runFFmpeg};

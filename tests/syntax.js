const fs=require('fs');const path=require('path');const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');let failed=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','uploads','Data'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&p.endsWith('.js')){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0)failed.push({p,err:r.stderr})}}}
walk(root);if(failed.length){for(const x of failed)console.error(x.p+'\n'+x.err);process.exit(1)}console.log('JS_SYNTAX_OK');

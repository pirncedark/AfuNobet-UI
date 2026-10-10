// Headless Windows runner: network-drive discovery is optional and unavailable in this sandbox.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const original=childProcess.exec;
childProcess.exec=function(command,...args){
 if(command==='net use') { const callback=args.find(a=>typeof a==='function');queueMicrotask(()=>callback?.(new Error('Network-drive discovery disabled in headless runner'),'',''));return; }
 return original.call(this,command,...args);
};
syncBuiltinESMExports();

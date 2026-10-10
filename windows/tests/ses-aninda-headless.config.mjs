import ts from 'typescript';
export default {
 esbuild:false,
 plugins:[{name:'headless-typescript',enforce:'pre',transform(code,id){if(/\.tsx?(?:\?|$)/.test(id))return {code:ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,map:null};}}],
 optimizeDeps:{noDiscovery:true,include:[]},
 test:{include:['tests/**/*.test.ts'],pool:'threads',maxWorkers:1,execArgv:['--import','./tests/ses-aninda-preload.mjs']}
};

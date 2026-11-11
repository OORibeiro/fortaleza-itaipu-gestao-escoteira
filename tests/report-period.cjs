const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,fetch){const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:(name)=>{if(name==='@/utils/reportPeriod')return load('utils/reportPeriod.ts');throw Error(name);},fetch,Response,URL,console});return exports;}
(async()=>{
const {monthRange,referenceMonths}=load('utils/reportPeriod.ts');
assert.equal(monthRange('2026-10',3).from,'2026-08-01');assert.equal(monthRange('2026-10',3).to,'2026-10-31');
assert.equal(monthRange('2026-02',6).from,'2025-09-01');assert.equal(monthRange('2028-02',12).to,'2028-02-29');
assert.throws(()=>referenceMonths('2026-02-29','2026-03-01'));assert.throws(()=>referenceMonths('2026-11-01','2026-10-31'));
for(const n of [1,3,6,12]) {
 const calls=[];const api=load('services/financeService.ts',async(url)=>{calls.push(url);const month=new URL(url,'http://localhost').searchParams.get('month');return Response.json([{id:calls.length,amount:'50.00',status:'pago',reference_month:month}]);}).financeService;
 const range=monthRange('2026-10',n);const dues=await api.duesForRange('token',range.from,range.to);
 assert.equal(calls.length,n);assert.equal(dues.length,n);assert.equal(dues.reduce((sum,due)=>sum+due.amountCents,0),n*5000);
 assert.ok(calls.at(-1).includes('2026-10-01'));
}
const failing=load('services/financeService.ts',async()=>Response.json({error:'Falha de consulta'},{status:500})).financeService;
await assert.rejects(failing.duesForRange('token','2026-08-01','2026-10-31'),/Falha de consulta/);
for(const file of ['views/ReportsView.tsx','views/FinanceView.tsx','app/page.tsx']) {
 const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(source.parseDiagnostics.length,0,`${file}: erro de sintaxe`);
}
console.log('OK: períodos 1/3/6/12, virada de ano, bissexto, datas inválidas, soma de todos os meses, falha da API e sintaxe TSX.');
})();

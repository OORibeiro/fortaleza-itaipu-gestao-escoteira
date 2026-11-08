const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const pending={id:9,status:'pendente',finance_id:null,payment_date:null,reference_key:'2026-11'};
function setup(row=pending,fail=false) {
 const calls=[];let released=false;
 const client={async query(sql,params){calls.push({sql,params});if(sql.startsWith('SELECT'))return {rows:row?[row]:[]};if(fail&&sql.startsWith('UPDATE'))throw Error('test failure');return {rows:[]};},release(){released=true;}};
 const sandbox={exports:{},require:()=>({connect:async()=>client}),console:{error(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/modules/dues/Duecontroller.js'),'utf8'),sandbox);
 return {api:sandbox.exports,calls,released:()=>released};
}
function res(){return {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
const req={params:{id:'9'},body:{amount:65.75,due_date:'2026-11-30'}};
test('edita valor e vencimento com trava, commit e liberação',async()=>{
 const s=setup();const r=res();await s.api.updateDue(req,r);assert.equal(r.code,200);
 assert.match(s.calls[1].sql,/FOR UPDATE/);assert.deepEqual(Array.from(s.calls[2].params),[65.75,'2026-11-30',9]);assert.equal(s.calls[3].sql,'COMMIT');assert.ok(s.released());
});
test('exclui somente a mensalidade selecionada',async()=>{
 const s=setup();const r=res();await s.api.deleteDue({params:{id:'9'}},r);assert.equal(r.code,200);assert.equal(s.calls[2].sql,'DELETE FROM dues WHERE id = $1');assert.equal(s.calls[2].params[0],9);assert.equal(s.calls[3].sql,'COMMIT');
});
test('pagamento ou vínculo financeiro bloqueia ambas as operações',async()=>{
 for(const patch of [{status:'pago'},{finance_id:12},{payment_date:'2026-11-02'}])for(const action of ['updateDue','deleteDue']){
 const s=setup({...pending,...patch});const r=res();await s.api[action](req,r);assert.equal(r.code,409);assert.equal(s.calls.at(-1).sql,'ROLLBACK');assert.equal(s.calls.length,3);assert.ok(s.released());}
});
test('rejeita valores e datas inválidos antes de acessar banco',async()=>{
 for(const patch of [{amount:-1},{amount:1.234},{due_date:'2026-11-31'},{due_date:'2026-02-29'},{due_date:''},{due_date:'2026-13-10'}]){
 const s=setup();const r=res();await s.api.updateDue({...req,body:{...req.body,...patch}},r);assert.equal(r.code,400);assert.equal(s.calls.length,0);}
});
test('rejeita vencimento fora da referência',async()=>{
 const s=setup();const r=res();await s.api.updateDue({...req,body:{...req.body,due_date:'2026-12-01'}},r);assert.equal(r.code,400);assert.equal(s.calls.at(-1).sql,'ROLLBACK');
});
test('registro ausente retorna 404 e falha de escrita faz rollback',async()=>{
 const s=setup(null);const r=res();await s.api.deleteDue(req,r);assert.equal(r.code,404);assert.ok(s.released());
 const failed=setup(pending,true);const r2=res();await failed.api.updateDue(req,r2);assert.equal(r2.code,500);assert.equal(failed.calls.at(-1).sql,'ROLLBACK');assert.ok(failed.released());
});
test('PUT e DELETE exigem autenticação e cargo financeiro',()=>{
 const routes=[];const auth=()=>{};const handlers={updateDue(){},deleteDue(){}};
 const router={get(){},post(){},put(...a){routes.push(['PUT',...a]);},delete(...a){routes.push(['DELETE',...a]);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/modules/dues/Dueroutes.js'),'utf8'),{module:{exports:{}},require(name){if(name==='express')return {Router:()=>router};if(name==='./Duecontroller')return handlers;if(name.includes('authMiddleware'))return auth;return roles=>({roles:Array.from(roles)});}});
 for(const method of ['PUT','DELETE']){const route=routes.find(r=>r[0]===method&&r[1]==='/:id');assert.equal(route[2],auth);assert.deepEqual(route[3].roles,['ADMIN','presidente','FINANCEIRO']);assert.equal(typeof route[4],'function');}
});

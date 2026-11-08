const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function load(query) {
  const sandbox = {exports:{}, require:()=>({query}), console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/modules/dues/Duecontroller.js'),'utf8'), sandbox);
  return sandbox.exports;
}
function response(){return {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
const body={branch_id:2,member_id:7,reference_month:'2026-10-01',amount:50,due_day:31};
test('gera somente para o membro selecionado e aceita dia 31',async()=>{
 const calls=[];
 const api=load(async(sql,params)=>{calls.push({sql,params});return {rows:calls.length===1?[{id:7,name:'Pessoa de teste'}]:[{id:90,member_id:7}]};});
 const res=response();await api.generateMemberDue({body},res);
 assert.equal(res.code,201);assert.equal(calls.length,2);
 assert.match(calls[1].sql,/WHERE id = \$1 AND branch_id = \$2/);
 assert.equal(calls[1].params[0],7);assert.equal(calls[1].params[3],'2026-10-31');
 assert.equal(res.body.dues.length,1);
});
test('sem membro não gera cobranças',async()=>{
 const api=load(()=>{throw new Error('Não deveria consultar o banco');});const res=response();
 await api.generateMemberDue({body:{...body,member_id:undefined}},res);assert.equal(res.code,400);
});
test('membro de outro ramo é rejeitado antes de inserir',async()=>{
 let count=0;const api=load(async()=>{count++;return {rows:[]};});const res=response();
 await api.generateMemberDue({body},res);assert.equal(res.code,404);assert.equal(count,1);
});
test('mensalidade existente retorna conflito e não atualiza nem duplica',async()=>{
 let count=0;const api=load(async(sql)=>{count++;if(count===2) assert.match(sql,/ON CONFLICT \(member_id, reference_month\) DO NOTHING/);return {rows:count===1?[{id:7,name:'Pessoa'}]:[]};});
 const res=response();await api.generateMemberDue({body},res);assert.equal(res.code,409);assert.equal(count,2);
});
test('rejeita datas inexistentes, valores negativos e meses inválidos',async()=>{
 const api=load(()=>{throw new Error('Não deveria consultar o banco');});
 for(const patch of [{reference_month:'2026-02-01',due_day:29},{reference_month:'2026-04-01',due_day:31},{reference_month:'2026-13-01'},{amount:-1},{amount:1.234},{due_day:0}]){
  const res=response();await api.generateMemberDue({body:{...body,...patch}},res);assert.equal(res.code,400);
 }
});
test('aceita 29 de fevereiro em ano bissexto',async()=>{
 let count=0;const api=load(async()=>({rows:++count===1?[{id:7,name:'Pessoa'}]:[{id:90}]}));const res=response();
 await api.generateMemberDue({body:{...body,reference_month:'2028-02-01',due_day:29}},res);assert.equal(res.code,201);
});
test('lista só dados do ramo solicitado',async()=>{
 const api=load(async(sql,params)=>{assert.match(sql,/SELECT id, name, branch_id FROM members WHERE branch_id = \$1/);assert.equal(params[0],2);return {rows:[{id:7,name:'Pessoa',branch_id:2}]};});
 const res=response();await api.getMembersForDues({query:{branch_id:'2'}},res);assert.equal(res.body.length,1);
});
test('rotas individuais mantêm autenticação e cargos financeiros',()=>{
 const routes=[];const auth=()=>{};const authorize=()=>{};const handlers={getMembersForDues(){},generateMemberDue(){}};
 const router={get(...args){routes.push(args);},post(...args){routes.push(args);},put(){},delete(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/modules/dues/Dueroutes.js'),'utf8'),{module:{exports:{}},require(name){if(name==='express')return {Router:()=>router};if(name==='./Duecontroller')return handlers;if(name.includes('authMiddleware'))return auth;return roles=>{const middleware=()=>{};middleware.roles=Array.from(roles);return middleware;};}});
 for(const url of ['/members','/generate-member']){const route=routes.find(r=>r[0]===url);assert.equal(route[1],auth);assert.deepEqual(route[2].roles,['ADMIN','presidente','FINANCEIRO']);assert.equal(typeof route[3],'function');}
});

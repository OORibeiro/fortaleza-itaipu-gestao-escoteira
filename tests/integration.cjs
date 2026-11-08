// Run: node --test tests/integration.cjs
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function loadTS(file) {
  const name = path.resolve(__dirname, '..', file);
  const compiled = new Module(name);
  compiled.paths = Module._nodeModulePaths(path.dirname(name));
  compiled._compile(ts.transpileModule(fs.readFileSync(name, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, name);
  return compiled.exports;
}
const { financeService, ApiError } = loadTS('services/financeService.ts');
const proxy = loadTS('app/api/render/[...path]/route.ts');
const originalFetch = global.fetch;
after(() => { global.fetch = originalFetch; });
const finance = { id: 7, description: 'Material', amount: '120.35', type: 'despesa', transaction_date: '2026-09-12T00:00:00.000Z', branch_id: 2, branch_name: 'Escoteiro', category: 'materiais' };
const due = { id: 9, member_name: 'Membro de teste', branch_name: 'Escoteiro', amount: '35.50', reference_month: '2026-09-01T00:00:00.000Z', due_date: '2026-09-10T00:00:00.000Z', status: 'pendente', status_calculado: 'atrasado', payment_date: null };
test('monthly API reads preserve cents, branch and calculated overdue status', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push([url, init]); return Response.json(url.includes('/finances') ? [finance] : [due]); };
  const state = await financeService.load('test-token', '2026-09');
  assert.deepEqual(calls.map(([u]) => u).sort(), ['/api/render/dues?month=2026-09-01', '/api/render/finances']);
  assert.ok(calls.every(([,o]) => o.headers.Authorization === 'Bearer test-token'));
  assert.equal(state.transactions[0].amountCents, 12035);
  assert.equal(state.transactions[0].branchId, 2);
  assert.equal(state.dues[0].status, 'overdue');
  assert.equal(state.dues[0].dueDate, '2026-09-10');
  assert.equal(state.dues[0].patrol, 'Escoteiro');
});
test('create and update use the backend currency, date and type contract', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push([url, init]); return Response.json(finance); };
  const input = { description: 'Material', amountCents: 12035, kind: 'expense', occurredAt: '2026-09-12T12:00:00-03:00', branchId: 2, category: 'materiais', counterparty: '' };
  await financeService.create('t', input); await financeService.update('t', 7, input);
  assert.equal(calls[0][1].method, 'POST'); assert.equal(calls[1][1].method, 'PUT');
  assert.equal(calls[1][0], '/api/render/finances/7');
  assert.deepEqual(JSON.parse(calls[0][1].body), { description: 'Material', amount: 120.35, type: 'despesa', transaction_date: '2026-09-12', branch_id: 2, category: 'materiais' });
});
test('pay sends one PUT and never creates a duplicate income', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push([url, init]); return Response.json({ due: { ...due, status: 'pago' } }); };
  await financeService.pay('t', 9);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], '/api/render/dues/9/pay'); assert.equal(calls[0][1].method, 'PUT');
});
test('API failures propagate; no demonstration data replaces server errors', async () => {
  global.fetch = async () => Response.json({ error: 'Token inválido' }, { status: 401 });
  await assert.rejects(financeService.load('t', '2026-09'), e => e instanceof ApiError && e.status === 401);
  global.fetch = async () => Response.json({ error: 'Não encontrado' }, { status: 404 });
  await assert.rejects(financeService.pay('t', 9), e => e.status === 404);
  global.fetch = async () => { throw new TypeError('Network failed'); };
  await assert.rejects(financeService.pay('t', 9), /Atualize os dados/);
});
test('proxy forwards only approved routes to fixed Render origin and preserves token', async () => {
  let call;
  global.fetch = async (url, init) => { call = [String(url), init]; return Response.json([due]); };
  const res = await proxy.GET(new Request('http://localhost/api/render/dues?month=2026-09-01&url=https://other.test', { headers: { Authorization: 'Bearer t' } }), { params: Promise.resolve({ path: ['dues'] }) });
  assert.equal(res.status, 200); assert.equal(call[0], 'https://grupo-escoteiro.onrender.com/dues?month=2026-09-01');
  assert.equal(call[1].headers.get('Authorization'), 'Bearer t'); assert.equal(res.headers.get('Cache-Control'), 'no-store');
  const rejected = await proxy.GET(new Request('http://localhost/api/render/users'), { params: Promise.resolve({ path: ['users'] }) });
  assert.equal(rejected.status, 404);
});
test('proxy surfaces unpublished routes as JSON and does not follow redirects', async () => {
  global.fetch = async (_url, init) => { assert.equal(init.redirect, 'manual'); return new Response('Cannot GET /dues', { status: 404 }); };
  const res = await proxy.GET(new Request('http://localhost/api/render/dues'), { params: Promise.resolve({ path: ['dues'] }) });
  assert.equal(res.status, 404); assert.match((await res.json()).error, /não publicada/);
});

test('individual dues preserve member ID and never call bulk generation', async () => {
  const calls=[];
  global.fetch=async(url,init)=>{calls.push([url,init]);return Response.json({message:'Gerada',dues:[]});};
  await financeService.generateDues('t',{branch_id:2,member_id:7,reference_month:'2026-10-01',amount:50,due_day:31});
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'/api/render/dues/generate-member');
  assert.equal(JSON.parse(calls[0][1].body).member_id,7);
});
test('proxy forwards only member selector branch query and permits individual generation', async () => {
  const calls=[];
  global.fetch=async(url,init)=>{calls.push([String(url),init]);return Response.json([]);};
  const res=await proxy.GET(new Request('http://localhost/api/render/dues/members?branch_id=2&url=https://other.test'),{params:Promise.resolve({path:['dues','members']})});
  assert.equal(res.status,200);
  assert.equal(calls[0][0],'https://grupo-escoteiro.onrender.com/dues/members?branch_id=2');
  const body={branch_id:2,member_id:7,reference_month:'2026-10-01',amount:50,due_day:31};
  await proxy.POST(new Request('http://localhost/api/render/dues/generate-member',{method:'POST',body:JSON.stringify(body),headers:{Authorization:'Bearer t'}}),{params:Promise.resolve({path:['dues','generate-member']})});
  assert.equal(calls[1][0],'https://grupo-escoteiro.onrender.com/dues/generate-member');
  assert.equal(JSON.parse(calls[1][1].body).member_id,7);
  assert.equal(calls[1][1].headers.get('Authorization'),'Bearer t');
  const old=await proxy.POST(new Request('http://localhost/api/render/dues/generate',{method:'POST'}),{params:Promise.resolve({path:['dues','generate']})});
  assert.equal(old.status,404);
  assert.equal(calls.length,2);
});
test('period loads every month across year boundaries and fails on incomplete data', async () => {
 const months=[];
 global.fetch=async(url)=>{if(url.includes('/finances')) return Response.json([]); const month=new URL(url,'http://local').searchParams.get('month');months.push(month);return Response.json([{...due,id:months.length,reference_month:month}]);};
 const state=await financeService.load('t','2026-02',3);
 assert.deepEqual(months,['2025-12-01','2026-01-01','2026-02-01']);assert.equal(state.dues.length,3);
 months.length=0;await financeService.load('t','2026-02',12);assert.equal(months.length,12);assert.equal(months[0],'2025-03-01');
 global.fetch=async(url)=>url.includes('2026-01')?Response.json({error:'Falha'},{status:500}):Response.json([]);
 await assert.rejects(financeService.load('t','2026-02',3),/Falha/);
});
test('financial periods include current month, cross years and end today', () => {
  const {financePeriod}=loadTS('utils/financePeriod.ts');
  assert.deepEqual(financePeriod(3,new Date(2026,9,28)),{from:'2026-08-01',to:'2026-10-28'});
  assert.deepEqual(financePeriod(6,new Date(2026,1,10)),{from:'2025-09-01',to:'2026-02-10'});
  assert.deepEqual(financePeriod(12,new Date(2028,1,29)),{from:'2027-03-01',to:'2028-02-29'});
});

test('dues edit/delete use dedicated routes, preserve auth and forward conflicts', async () => {
 const calls=[];
 global.fetch=async(url,init)=>{calls.push([String(url),init]);return Response.json({message:'ok'});};
 await financeService.updateDue('t',9,{amount:65.75,due_date:'2026-11-30'});
 await financeService.deleteDue('t',9);
 assert.equal(calls[0][0],'/api/render/dues/9');assert.equal(calls[0][1].method,'PUT');assert.deepEqual(JSON.parse(calls[0][1].body),{amount:65.75,due_date:'2026-11-30'});assert.equal(calls[1][1].method,'DELETE');
 for(const method of ['PUT','DELETE']){
 const result=await proxy[method](new Request('http://localhost/api/render/dues/9',{method,headers:{Authorization:'Bearer t'},...(method==='PUT'?{body:JSON.stringify({amount:65.75,due_date:'2026-11-30'})}:{})}),{params:Promise.resolve({path:['dues','9']})});
 assert.equal(result.status,200);assert.equal(calls.at(-1)[0],'https://grupo-escoteiro.onrender.com/dues/9');assert.equal(calls.at(-1)[1].headers.get('Authorization'),'Bearer t');
 }
 global.fetch=async()=>Response.json({error:'Pagamento registrado'},{status:409});
 await assert.rejects(financeService.deleteDue('t',9),e=>e.status===409);
});

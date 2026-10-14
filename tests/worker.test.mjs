import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import worker, {MODEL, sha256} from '../src/index.ts';

const request = (body = JSON.stringify({instruction:'Find junior roles'}), headers = {}) => new Request('https://worker.test/reason', {
  method:'POST', headers:{'Authorization':'Bearer test-token','Content-Type':'application/json',...headers}, body
});
async function run(req, verification = {authorized:true}, output = {response:'Test-only model output'}) {
  const original = globalThis.fetch;
  let verifications=0, inferences=0, sent;
  globalThis.fetch = async (url, options) => {
    verifications++; sent={url, ...options};
    if (verification instanceof Error) throw verification;
    return verification instanceof Response ? verification : Response.json(verification);
  };
  try {
    const response = await worker.fetch(req, {AI:{run:async (model, options) => {
      inferences++; assert.equal(model,MODEL); assert.equal(options.max_tokens,650);
      if(output instanceof Error) throw output;
      return output;
    }}});
    return {status:response.status, body:await response.json(), headers:response.headers, verifications,inferences,sent};
  } finally {globalThis.fetch=original;}
}
test('health is liveness, not a claim of verified inference', async()=>{
  const r=await run(new Request('https://worker.test/health'));
  assert.equal(r.body.inference,'UNVERIFIED'); assert.equal(r.inferences,0); assert.equal(r.verifications,0);
  assert.equal(r.headers.get('Cache-Control'),'no-store');
});
for (const auth of ['', 'Bearer ', 'Basic value', 'Bearer a b', 'Bearer '+ 'x'.repeat(4001)]) {
  test('rejects invalid authentication '+auth.slice(0,20),async()=>{
    const r=await run(request(undefined,{Authorization:auth}));
    assert.equal(r.status,401); assert.equal(r.inferences,0); assert.equal(r.verifications,0);
  });
}
for (const body of ['{', 'null', '[]', '{}', '{"instruction":4}', '{"instruction":"   "}']) {
  test('rejects malformed instruction '+body,async()=>{
    const r=await run(request(body)); assert.equal(r.status,400); assert.equal(r.inferences,0); assert.equal(r.verifications,0);
  });
}
test('rejects oversized body without content length',async()=>{
  const r=await run(request(JSON.stringify({instruction:'ok',padding:'x'.repeat(14000)})));
  assert.equal(r.status,413); assert.equal(r.verifications,0); assert.equal(r.inferences,0);
});
test('rejects oversized multi-byte text even with lying length',async()=>{
  const r=await run(request(JSON.stringify({instruction:'😀'.repeat(4000)}),{'Content-Length':'1'}));
  assert.equal(r.status,413); assert.equal(r.inferences,0);
});
test('rejects oversized chunked stream and cancels reader',async()=>{
  let cancelled=false;
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(8000));c.enqueue(new Uint8Array(8000));},cancel(){cancelled=true;}});
  const req=new Request('https://worker.test/reason',{method:'POST',headers:{Authorization:'Bearer token','Content-Type':'application/json'},body:stream,duplex:'half'});
  const r=await run(req); assert.equal(r.status,413); assert.equal(cancelled,true); assert.equal(r.inferences,0);
});
test('requires JSON media type',async()=>{
  const r=await run(request(undefined,{'Content-Type':'text/plain'})); assert.equal(r.status,415); assert.equal(r.verifications,0);
});
for (const verify of [{authorized:false},{authorized:'true'},null,new Response('invalid'),new Response('',{status:401})]) {
  test('fails closed on rejected or malformed authorization '+JSON.stringify(verify),async()=>{
    const r=await run(request(),verify); assert.equal(r.status,401); assert.equal(r.inferences,0);
  });
}
for (const verify of [new Error('network'),new Response('',{status:503})]) {
  test('verifier unavailable prevents inference',async()=>{
    const r=await run(request(),verify); assert.equal(r.status,503); assert.equal(r.inferences,0);
  });
}
test('verifier quota prevents inference',async()=>{
  const r=await run(request(),new Response('',{status:429})); assert.equal(r.status,429); assert.equal(r.inferences,0);
});
test('Unicode hashing agrees with independent Node crypto',async()=>{
  const text='नमस्ते 👋 café';
  assert.equal(await sha256(text),createHash('sha256').update(text,'utf8').digest('hex'));
  const r=await run(request(JSON.stringify({instruction:text})));
  assert.equal(JSON.parse(r.sent.body).requestHash,await sha256(text));
  assert.equal(r.sent.redirect,'error'); assert.equal(r.inferences,1); assert.equal(r.status,200);
  assert.equal(r.body.provider,'CLOUDFLARE_WORKERS_AI'); assert.equal(typeof r.body.latencyMs,'number');
});
for(const output of [new Error('failure'),{}, {response:''},{response:'x'.repeat(18001)}]) {
  test('rejects failed or invalid model output',async()=>{
    const r=await run(request(),{authorized:true},output); assert.equal(r.status,502); assert.equal(r.inferences,1);
  });
}
test('unknown route never invokes provider',async()=>{
  const r=await run(new Request('https://worker.test/not-found')); assert.equal(r.status,404); assert.equal(r.inferences,0);
});

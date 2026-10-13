interface AIModelBinding { run(model: string, options: { messages: Array<{role:"system" | "user"; content:string}>; max_tokens:number; temperature:number }): Promise<{response?: string}> }
export interface Env { AI: AIModelBinding }
const MODEL = "@cf/google/gemma-4-26b-a4b-it";
const VERIFY_URL = "https://apex-forge-intelligence.floot.app/_api/apex/gateway-verify";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
async function sha256(s:string):Promise<string>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(n=>n.toString(16).padStart(2,"0")).join("")}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==="/health"&&request.method==="GET")return json({service:"APEX Neural Core",status:"ONLINE",model:MODEL,mode:"reasoning_only"});
  if(url.pathname!=="/reason"||request.method!=="POST")return json({error:"NOT_FOUND"},404);
  const bearer=request.headers.get("Authorization")||"";
  if(!bearer.startsWith("Bearer ")||bearer.length>4100)return json({error:"AUTH_REQUIRED"},401);
  if(Number(request.headers.get("Content-Length")||0)>14000)return json({error:"REQUEST_TOO_LARGE"},413);
  let body:unknown;
  try{body=await request.json()}catch{return json({error:"INVALID_JSON"},400)}
  const instruction=typeof (body as any)?.instruction==="string"?(body as any).instruction:"";
  if(!instruction||instruction.length>12000)return json({error:"INVALID_INSTRUCTION"},400);
  const digest=await sha256(instruction);
  let checked:Response;
  try{checked=await fetch(VERIFY_URL,{method:"POST",headers:{"Authorization":bearer,"Content-Type":"application/json"},body:JSON.stringify({requestHash:digest}),redirect:"error",signal:AbortSignal.timeout(9000)})}
  catch{return json({error:"AUTH_BACKEND_UNAVAILABLE"},503)}
  if(!checked.ok)return json({error:"REQUEST_NOT_AUTHORIZED"},401);
  const granted=await checked.json().catch(()=>null) as any;
  if(granted?.authorized!==true)return json({error:"REQUEST_NOT_AUTHORIZED"},401);
  let output:any;
  try{output=await env.AI.run(MODEL,{messages:[{role:"system",content:"You are APEX Neural Core, a truthful career research assistant. Do not invent candidate credentials, employer application confirmations, or tool executions. Return JSON only when the user explicitly asks for a structured plan."},{role:"user",content:instruction}],max_tokens:650,temperature:0.2})}
  catch{return json({error:"MODEL_INFERENCE_FAILED"},502)}
  const result=typeof output?.response==="string"?output.response:null;
  if(!result)return json({error:"MODEL_RESPONSE_EMPTY"},502);
  return json({response:result,model:MODEL,mode:"reasoning_only"});
 }
};

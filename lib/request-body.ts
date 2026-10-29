/**
 * Actual UTF-8 JSON request limit for the public analysis demo.
 * JSON encoding overhead counts toward the limit.
 */
export const MAX_ANALYSIS_BODY_BYTES=16_000;
export class RequestBodyTooLargeError extends Error {
  constructor(){super("The analysis request exceeds the 16 KB limit.");this.name="RequestBodyTooLargeError";}
}
export function analysisPayloadBytes(content:string,mode:"quick"|"deep"):number {
  return new TextEncoder().encode(JSON.stringify({content,mode})).byteLength;
}
/**
 * A chunked request or spoofed Content-Length must never bypass the size limit.
 * Read only up to the configured maximum and stop reading on overflow.
 */
export async function readBoundedJson(request:Request,limit=MAX_ANALYSIS_BODY_BYTES):Promise<unknown> {
  if(!request.body)throw new SyntaxError("Missing request body.");
  const reader=request.body.getReader();
  let total=0;
  const chunks:Uint8Array[]=[];
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>limit){
        // Do not wait on a potentially unresponsive client to acknowledge cancellation.
        void reader.cancel().catch(()=>undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let decoded:string;
  try{decoded=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}
  catch{throw new SyntaxError("Request body must use valid UTF-8.");}
  return JSON.parse(decoded) as unknown;
}

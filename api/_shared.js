const STYLE_PROMPTS = {
  'egyptian-cartoon': 'expressive Egyptian editorial cartoon, bold ink outlines, warm colors, lively facial expressions, contemporary Cairo visual humor',
  'modern-comic': 'modern polished comic book illustration, dynamic composition, bold clean line art, cinematic lighting, expressive faces',
  'manga': 'clean manga illustration, expressive faces, crisp line art, screentone-inspired shading, cinematic framing',
  '3d': 'high-quality stylized 3D animated movie look, expressive characters, soft cinematic lighting, detailed environment',
  'sketch': 'hand-drawn ink and watercolor comic sketch, textured paper feel, expressive loose lines',
  'retro': '1990s Arabic magazine comic aesthetic, halftone print texture, bold colors, vintage ink outlines'
};

function send(res,status,obj){res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(obj));}

async function readJson(req){
  if(req.body && typeof req.body==='object') return req.body;
  let raw=''; for await(const chunk of req) raw+=chunk;
  try{return JSON.parse(raw||'{}')}catch{return {}}
}

function findText(obj){
  if(!obj)return null;
  if(typeof obj==='string') return null;
  if(typeof obj.output_text==='string') return obj.output_text;
  if(obj.interaction){const x=findText(obj.interaction);if(x)return x;}
  if(Array.isArray(obj.outputs)){
    for(let i=obj.outputs.length-1;i>=0;i--){const o=obj.outputs[i];if(typeof o?.text==='string')return o.text;const x=findText(o);if(x)return x;}
  }
  if(Array.isArray(obj.steps)){
    for(let i=obj.steps.length-1;i>=0;i--){const x=findText(obj.steps[i]);if(x)return x;}
  }
  for(const v of Object.values(obj)){if(v&&typeof v==='object'){const x=findText(v);if(x)return x;}}
  return null;
}

function findImage(obj){
  if(!obj)return null;
  const direct=obj.output_image||obj.outputImage;
  if(direct?.data)return {data:direct.data,mime_type:direct.mime_type||direct.mimeType||'image/jpeg'};
  if(obj.interaction){const x=findImage(obj.interaction);if(x)return x;}
  if(Array.isArray(obj.outputs)){
    for(let i=obj.outputs.length-1;i>=0;i--){const o=obj.outputs[i];if(o?.data && String(o?.mime_type||o?.mimeType||'').startsWith('image/')) return {data:o.data,mime_type:o.mime_type||o.mimeType};const x=findImage(o);if(x)return x;}
  }
  if(Array.isArray(obj.steps)){
    for(let i=obj.steps.length-1;i>=0;i--){const x=findImage(obj.steps[i]);if(x)return x;}
  }
  for(const v of Object.values(obj)){if(v&&typeof v==='object'){const x=findImage(v);if(x)return x;}}
  return null;
}

async function geminiInteraction(body){
  const key=process.env.GEMINI_API_KEY;
  if(!key) throw new Error('MISSING_GEMINI_KEY');
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),55000);
  try{
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:controller.signal});
    const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}}
    if(!r.ok){const msg=data?.error?.message||`Gemini API ${r.status}`;throw new Error(msg)}
    return data;
  }finally{clearTimeout(t)}
}

function cleanText(s=''){return String(s).replace(/[<>]/g,'').trim().slice(0,500)}

module.exports={STYLE_PROMPTS,send,readJson,findText,findImage,geminiInteraction,cleanText};

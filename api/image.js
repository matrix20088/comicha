const {STYLE_PROMPTS,send,readJson,findImage,geminiInteraction,cleanText}=require('./_shared');

function demoSvg(index=0){
  const palettes=[['#7357e8','#281650'],['#ee5a9d','#5a2149'],['#36c3d7','#173c64'],['#f0b541','#6d3615'],['#69ca82','#1e4b42'],['#e67355','#51213c']];
  const [a,b]=palettes[index%palettes.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="40" fill="white" opacity=".035"/></pattern></defs><rect width="900" height="675" fill="url(#g)"/><rect width="900" height="675" fill="url(#p)"/><circle cx="250" cy="315" r="120" fill="#ffd2aa" stroke="#161020" stroke-width="12"/><circle cx="215" cy="290" r="12"/><circle cx="285" cy="290" r="12"/><path d="M205 360 Q250 395 300 350" fill="none" stroke="#161020" stroke-width="12" stroke-linecap="round"/><path d="M150 210 Q250 90 345 215 Q260 175 150 210" fill="#23152d"/><circle cx="650" cy="335" r="110" fill="#ffd2aa" stroke="#161020" stroke-width="12"/><circle cx="620" cy="315" r="11"/><circle cx="680" cy="315" r="11"/><path d="M610 375 Q650 340 700 380" fill="none" stroke="#161020" stroke-width="12" stroke-linecap="round"/><path d="M555 245 Q650 135 745 245" fill="#352040"/><path d="M0 560 L900 500 L900 675 L0 675Z" fill="#0d0920" opacity=".55"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return send(res,405,{error:'POST only'});
  const b=await readJson(req); const panel=b.panel||{}; const scene=cleanText(panel.scene||''); const idx=Number(b.panelIndex)||0;
  if(!process.env.GEMINI_API_KEY) return send(res,200,{image:demoSvg(idx),demo:true});
  const chars=(Array.isArray(b.characters)?b.characters:[]).map(c=>`${cleanText(c.name)}: ${cleanText(c.appearance)}; personality ${cleanText(c.personality)}`).join('\n');
  const visual=STYLE_PROMPTS[b.style]||STYLE_PROMPTS['egyptian-cartoon'];
  const prompt=`Create ONE comic panel image only.\nStyle: ${visual}.\nScene: ${scene}.\nCharacter bible (keep their appearance consistent across the series):\n${chars}\nImportant constraints:\n- contemporary Egyptian setting unless the scene says otherwise\n- expressive readable body language and facial expressions\n- polished professional comic composition\n- NO text anywhere in the image\n- NO letters, captions, speech bubbles, word balloons, signs, logos or watermarks\n- leave some uncluttered space near the upper and lower sides so the app can overlay Arabic speech bubbles later\n- family-friendly visual content\n- 4:3 landscape panel`;
  try{
    const data=await geminiInteraction({model:process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image',input:prompt,response_format:{type:'image',mime_type:'image/jpeg',aspect_ratio:'4:3',image_size:'1K',delivery:'inline'}});
    const im=findImage(data); if(!im?.data) throw new Error('Gemini returned no image');
    return send(res,200,{image:`data:${im.mime_type||'image/jpeg'};base64,${im.data}`,demo:false});
  }catch(e){
    console.error(e); return send(res,200,{image:demoSvg(idx),demo:true,warning:'Image fallback: '+e.message});
  }
}

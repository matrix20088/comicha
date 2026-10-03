const {send,readJson,findText,geminiInteraction,cleanText}=require('./_shared');

const schema={
  type:'object',
  properties:{
    title:{type:'string'},
    characters:{type:'array',items:{type:'object',properties:{name:{type:'string'},appearance:{type:'string'},personality:{type:'string'}},required:['name','appearance','personality']}},
    panels:{type:'array',items:{type:'object',properties:{scene:{type:'string'},caption:{type:'string'},dialogues:{type:'array',items:{type:'object',properties:{speaker:{type:'string'},text:{type:'string'},position:{type:'string',enum:['left','right']}},required:['speaker','text','position']}}},required:['scene','caption','dialogues']}}
  },
  required:['title','characters','panels']
};

function fallbackStory(scenario,count){
  const short=cleanText(scenario).slice(0,115);
  const base=[
    {caption:'الموضوع بدأ عادي جدًا…',scene:'Two Egyptian friends or coworkers at the start of an everyday situation, one explaining something, expressive faces',dialogues:[{speaker:'أنا',text:`بص يا سيدي… ${short}`,position:'right'}]},
    {caption:'بعدها بثانيتين',scene:'The other Egyptian character reacts with disbelief, comic timing, exaggerated raised eyebrow',dialogues:[{speaker:'صاحبي',text:'استنى بس… إنت بتتكلم جد؟',position:'left'},{speaker:'أنا',text:'والله ده اللي حصل بالحرف 😅',position:'right'}]},
    {caption:'وهنا بدأت الكارثة',scene:'The situation escalates in a funny harmless way, both characters surprised, dynamic comic composition',dialogues:[{speaker:'صاحبي',text:'طب وإنت عملت إيه بقى؟',position:'left'},{speaker:'أنا',text:'عملت أهم حاجة… اتصرفت إني فاهم كل حاجة.',position:'right'}]},
    {caption:'النهاية المنطقية جدًا طبعًا',scene:'Funny final reaction shot, Egyptian character walking away pretending everything is normal, friend facepalming',dialogues:[{speaker:'أنا',text:'ومن ساعتها وأنا عامل نفسي الموضوع ما حصلش 😂',position:'right'}]},
    {caption:'بس القصة ما خلصتش',scene:'The problem unexpectedly returns, phone notification or person reappearing, comedic shock',dialogues:[{speaker:'صاحبي',text:'هو مش ده نفس الموضوع راجع تاني؟',position:'left'},{speaker:'أنا',text:'يا نهار أبيض… أنا كنت فاكرنا قفلناه!',position:'right'}]},
    {caption:'الخلاصة',scene:'Final punchline, both characters laughing at the absurdity, lively Egyptian street or office background',dialogues:[{speaker:'صاحبي',text:'المهم اتعلمت حاجة؟',position:'left'},{speaker:'أنا',text:'آه… المرة الجاية هعمل نفسي مش موجود من الأول.',position:'right'}]}
  ];
  return {title:'لما الموقف يقلب كوميك',characters:[{name:'أنا',appearance:'Egyptian adult, casual contemporary clothes, expressive face',personality:'witty and slightly nervous'},{name:'صاحبي',appearance:'Egyptian adult friend or coworker, contemporary clothes, expressive reactions',personality:'dry humor'}],panels:base.slice(0,count)};
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return send(res,405,{error:'POST only'});
  const b=await readJson(req); const scenario=cleanText(b.scenario||''); const count=[2,4,6].includes(Number(b.panelCount))?Number(b.panelCount):4;
  if(scenario.length<8) return send(res,400,{error:'اكتب موقف أو نص أوضح شوية'});
  if(!process.env.GEMINI_API_KEY) return send(res,200,{story:fallbackStory(scenario,count),demo:true});
  const dialectMap={egyptian:'Egyptian Arabic colloquial, natural modern everyday Egyptian', 'egyptian-cairene':'light contemporary Cairene Egyptian Arabic', 'egyptian-popular':'popular street-style Egyptian Arabic but not offensive', msa:'Modern Standard Arabic'};
  const toneMap={funny:'light and funny',sarcastic:'witty and sarcastic',natural:'natural and realistic',dramatic:'dramatic but believable',absurd:'absurd and extra funny'};
  const mode=b.mode==='script'?'The user supplied dialogue/script. Preserve the meaning and as much of their exact wording as possible; only split it naturally between panels.':'The user described a situation. Invent the complete dialogue and comic beats from it.';
  const prompt=`You are an expert Egyptian comic writer and storyboard artist.\n${mode}\nTurn the input into EXACTLY ${count} comic panels.\nDialogue language: ${dialectMap[b.dialect]||dialectMap.egyptian}.\nTone: ${toneMap[b.tone]||toneMap.funny}.\nRules:\n- Dialogue must sound genuinely Egyptian, short, punchy, readable in speech bubbles, and not like formal translation.\n- Build setup -> escalation -> punchline.\n- Never add hateful, sexual, dangerous or defamatory content.\n- Keep character names consistent.\n- Each scene description MUST be in English and visually detailed for an image generation model.\n- Do NOT put written text, speech bubbles, captions, signs or letters in the visual scene description.\n- Prefer 1-2 dialogue bubbles per panel, max 3.\n- title and caption can be Arabic.\n\nUSER INPUT:\n${scenario}`;
  try{
    const data=await geminiInteraction({model:process.env.GEMINI_TEXT_MODEL||'gemini-3.8-flash',input:prompt,response_format:{type:'text',mime_type:'application/json',schema}});
    const out=findText(data); if(!out) throw new Error('Gemini returned no text');
    let story=JSON.parse(out); story.panels=(story.panels||[]).slice(0,count);
    if(story.panels.length!==count) throw new Error('عدد الكادرات غير مكتمل');
    return send(res,200,{story,demo:false});
  }catch(e){
    console.error(e); return send(res,200,{story:fallbackStory(scenario,count),demo:true,warning:'AI fallback: '+e.message});
  }
}

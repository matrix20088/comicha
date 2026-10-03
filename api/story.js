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

function newFallbackStory(scenario,count){
  const text=cleanText(scenario);
  let pack;
  if(/مدير|شغل|تقرير|مكتب|موظف|دوام/.test(text)){
    pack={
      title:'لما الشغل يحب يختبر أعصابك',
      characters:[
        {name:'الموظف',appearance:'Egyptian office employee in casual-smart clothes, expressive face',personality:'quick-witted and trying to survive the moment'},
        {name:'المدير',appearance:'Egyptian manager in a modern office, neat business clothes, expressive skeptical face',personality:'direct, observant, dry humor'}
      ],
      beats:[
        ['السؤال اللي بييجي في أسوأ توقيت','Modern Egyptian office, manager looking up from desk at employee, tense but funny body language',[['المدير','ها… طمّني. إحنا تمام؟','left'],['الموظف','تمام جدًا… على حسب تعريف حضرتك لـ تمام.','right']]],
        ['محاولة إنقاذ الموقف','Employee improvising an answer while manager narrows eyes, office setting, comedic tension',[['المدير','يعني خلص؟','left'],['الموظف','يعني… وصلنا لمرحلة متقدمة جدًا من التفكير فيه.','right']]],
        ['اللحظة اللي مفيهاش رجوع','Manager silently stares while employee forces a confident smile, strong comic reaction shot',[['المدير','إنت لسه ما بدأتش، صح؟','left'],['الموظف','أنا معترض بس على كلمة لسه.','right']]],
        ['الخاتمة المتوقعة','Employee sitting at desk working at top speed while manager walks away, exaggerated comic urgency',[['المدير','آخر اليوم يكون عندي.','left'],['الموظف','طبعًا… هو اليوم آخره إمتى بالظبط؟','right']]],
        ['الموضوع سخن زيادة','Office computer shows a generic loading glow with no readable text, employee panics, manager returns',[['المدير','في حاجة؟','left'],['الموظف','ولا حاجة… التكنولوجيا بس قررت تشاركنا التوتر.','right']]],
        ['الخلاصة','Employee typing furiously with coffee cups around, manager watches from doorway, funny exhausted ending',[['الموظف','أنا كده اتعلمت الدرس.','right'],['المدير','هتبدأ بدري؟','left'],['الموظف','لأ… هتعلم أجاوب أسرع.','right']]]
      ]
    };
  } else if(/ماما|أمي|امي|بابا|أبويا|ابويا|البيت/.test(text)){
    pack={
      title:'مهمة بسيطة… نظريًا',
      characters:[
        {name:'أنا',appearance:'Egyptian young adult at home, casual clothes, expressive face',personality:'lovable and easily distracted'},
        {name:'ماما',appearance:'Egyptian mother at home, warm but firm expression, everyday clothes',personality:'sharp memory and perfect comic timing'}
      ],
      beats:[
        ['تكليف عائلي بسيط جدًا','Egyptian home entrance, mother giving a simple instruction, young adult listening confidently',[['ماما','خد بالك… عايزاها تتعمل من غير لف ودوران.','left'],['أنا','اعتبريها خلصت.','right']]],
        ['الثقة في غير محلها','Young adult outside looking distracted by several harmless temptations, comedic indecision',[['أنا','دقيقة واحدة بس وأرجع.','right']]],
        ['الرجوع الكبير','Young adult returns home proudly carrying unrelated things, mother stares in disbelief',[['ماما','طب والحاجة اللي بعتك عشانها؟','left'],['أنا','هو ينفع نركز في اللي أنجزته الأول؟','right']]],
        ['الحكم النهائي','Mother folds arms while young adult slowly realizes the mistake, warm family comic scene',[['ماما','ارجع تاني.','left'],['أنا','كنت حاسس إن الرحلة دي ليها جزء تاني.','right']]],
        ['محاولة تفاوض فاشلة','At the doorway, young adult tries to negotiate while mother points outside, comedic pose',[['أنا','طب ما نعتبرها تجربة تعليمية؟','right'],['ماما','اعتبرها تجربة مشي.','left']]],
        ['النهاية','Young adult walking out again dramatically, mother smiles knowingly from doorway',[['أنا','حاضر… المرة دي هكتبها على إيدي.','right']]]
      ]
    };
  } else if(/مطعم|منيو|حساب|أكل|اكل|قهوة|كافيه/.test(text)){
    pack={
      title:'الحساب عنده رأي تاني',
      characters:[
        {name:'أنا',appearance:'Egyptian adult at a trendy cafe or restaurant, casual clothes',personality:'optimistic until the bill arrives'},
        {name:'صاحبي',appearance:'Egyptian friend, casual clothes, expressive reactions',personality:'dry humor and practical'}
      ],
      beats:[
        ['بداية كلها ثقة','Trendy Cairo restaurant, two friends sit down confidently looking at menu with no readable text',[['أنا','النهارده هنعيشها.','right'],['صاحبي','بس في حدود العقل لو سمحت.','left']]],
        ['اختيارات محسوبة جدًا','Two friends whispering and pointing at menu, trying to look sophisticated',[['أنا','هات الأرخص… بس قوله بطريقة شيك.','right'],['صاحبي','يعني مية؟','left']]],
        ['لحظة الحقيقة','Waiter leaves a bill folder, both friends freeze dramatically, no readable text visible',[['صاحبي','إحنا أكلنا المطعم نفسه؟','left'],['أنا','واضح إننا دفعنا إيجار الترابيزة كمان.','right']]],
        ['خطة النجاة','Two friends checking pockets and phones with exaggerated seriousness',[['أنا','معاك تحويل؟','right'],['صاحبي','معايا دعاء.','left']]],
        ['الحسبة المعقدة','Friends calculating on fingers while trying to stay calm, waiter waits politely in background',[['أنا','لو قسمناها علينا وعلى مستقبلنا؟','right'],['صاحبي','مستقبلنا انسحب من الموضوع.','left']]],
        ['الخلاصة','Friends walking outside laughing and looking relieved, lively city evening',[['أنا','المرة الجاية ناكل قبل ما ننزل.','right'],['صاحبي','ونعدي نبص على المطعم من بعيد.','left']]]
      ]
    };
  } else {
    pack={
      title:'لما الموقف ياخد سكة لوحده',
      characters:[
        {name:'أنا',appearance:'Egyptian adult in contemporary casual clothes, expressive face',personality:'witty, spontaneous, slightly nervous'},
        {name:'صاحبي',appearance:'Egyptian friend or coworker in contemporary clothes, expressive reactions',personality:'dry humor and quick reactions'}
      ],
      beats:[
        ['الموضوع بدأ عادي جدًا…','Two Egyptian friends in an everyday contemporary setting, one starts explaining something, expressive faces',[['أنا','بص… الموضوع كان بسيط جدًا في الأول.','right'],['صاحبي','الجملة دي عمرها ما بتطمن.','left']]],
        ['بعدها بثانيتين','The second character reacts with disbelief, exaggerated raised eyebrow, comic timing',[['صاحبي','استنى… إنت عملت إيه؟','left'],['أنا','تصرفت بثقة ملهاش أي أساس.','right']]],
        ['وهنا بدأت الكارثة','Situation escalates in a harmless funny way, both characters surprised, dynamic comic composition',[['صاحبي','قوللي إنك وقفت هنا.','left'],['أنا','كنت أتمنى أقولك كده.','right']]],
        ['النهاية المنطقية جدًا طبعًا','Funny final reaction shot, one character facepalming while the other pretends everything is normal',[['أنا','المهم إن كله عدّى. تقريبًا.','right'],['صاحبي','أنا عندي أسئلة… بس خايف من الإجابات.','left']]],
        ['بس القصة ما خلصتش','The problem unexpectedly returns in a harmless way, both characters react with comic shock',[['صاحبي','هو الموضوع رجع تاني؟','left'],['أنا','واضح إنه متعلق بيا عاطفيًا.','right']]],
        ['الخلاصة','Both characters laughing at the absurdity, lively Egyptian everyday background',[['صاحبي','اتعلمت حاجة؟','left'],['أنا','آه… ما أقولش الموضوع بسيط تاني.','right']]]
      ]
    };
  }
  const panels=pack.beats.slice(0,count).map(b=>({
    caption:b[0],
    scene:b[1],
    dialogues:b[2].map(d=>({speaker:d[0],text:d[1],position:d[2]}))
  }));
  return {title:pack.title,characters:pack.characters,panels};
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return send(res,405,{error:'POST only'});
  const b=await readJson(req); const scenario=cleanText(b.scenario||''); const count=[2,4,6].includes(Number(b.panelCount))?Number(b.panelCount):4;
  if(scenario.length<8) return send(res,400,{error:'اكتب موقف أو نص أوضح شوية'});
  if(!process.env.GEMINI_API_KEY) return send(res,200,{story:newFallbackStory(scenario,count),demo:true});
  const dialectMap={egyptian:'Egyptian Arabic colloquial, natural modern everyday Egyptian', 'egyptian-cairene':'light contemporary Cairene Egyptian Arabic', 'egyptian-popular':'popular street-style Egyptian Arabic but not offensive', msa:'Modern Standard Arabic'};
  const toneMap={funny:'light and funny',sarcastic:'witty and sarcastic',natural:'natural and realistic',dramatic:'dramatic but believable',absurd:'absurd and extra funny'};
  const mode=b.mode==='script'?'SCRIPT MODE: The user supplied dialogue/script. Preserve its meaning and as much of the exact wording as possible; only split it naturally between panels.':'SITUATION MODE: The user input is CONTEXT ONLY, not dialogue. Understand what happened, infer the characters and relationships, then WRITE ALL dialogue from scratch. Do not quote, paraphrase, mirror, or recycle the user\'s wording in dialogue, captions, or title. Only proper names, essential numbers, brands, or indispensable factual terms may be reused.';
  const prompt=`You are an expert Egyptian comic writer and storyboard artist.\n${mode}\nTurn the input into EXACTLY ${count} comic panels.\nDialogue language: ${dialectMap[b.dialect]||dialectMap.egyptian}.\nTone: ${toneMap[b.tone]||toneMap.funny}.\nRules:\n- Dialogue must sound genuinely Egyptian, short, punchy, readable in speech bubbles, and not like formal translation.\n- In SITUATION MODE, the source text is factual context only. NEVER turn the user's sentences into speech bubbles. Invent what people would naturally SAY in that situation.\n- In SITUATION MODE, avoid any verbatim sequence of 3 or more meaningful words from USER INPUT unless it is a proper name, number, brand, or indispensable factual term.\n- In SITUATION MODE, captions and title must also be newly written rather than paraphrases of the input.\n- Build setup -> escalation -> punchline.\n- Never add hateful, sexual, dangerous or defamatory content.\n- Keep character names consistent.\n- Each scene description MUST be in English and visually detailed for an image generation model.\n- Do NOT put written text, speech bubbles, captions, signs or letters in the visual scene description.\n- Prefer 1-2 dialogue bubbles per panel, max 3.\n- title and caption can be Arabic.\n\nUSER INPUT:\n${scenario}`;
  try{
    const data=await geminiInteraction({model:process.env.GEMINI_TEXT_MODEL||'gemini-3.8-flash',input:prompt,response_format:{type:'text',mime_type:'application/json',schema}});
    const out=findText(data); if(!out) throw new Error('Gemini returned no text');
    let story=JSON.parse(out); story.panels=(story.panels||[]).slice(0,count);
    if(story.panels.length!==count) throw new Error('عدد الكادرات غير مكتمل');
    return send(res,200,{story,demo:false});
  }catch(e){
    console.error(e); return send(res,200,{story:newFallbackStory(scenario,count),demo:true,warning:'AI fallback: '+e.message});
  }
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  mode: 'situation',
  panelCount: 4,
  story: null,
  images: [],
  generating: false,
};

const examples = [
  'المدير سألني التقرير خلص ولا لأ وأنا كنت لسه ما فتحتش الملف، وفجأة الويندوز قرر يعمل تحديث قدامه.',
  'أنا وصاحبي دخلنا مطعم غالي جدًا وطلبنا أرخص حاجة في المنيو، وفي الآخر الحساب جه أغلى من مرتبنا.',
  'أمي قالتلي انزل هات عيش بس، رجعت بعد ساعتين بكيس شيبسي ونسيت العيش.',
  'صحيت متأخر على الشغل وقررت أقول إن العربية عطلت، ولما وصلت لقيت المدير واقف عند عربيتي في الجراج.',
  'طلبت من الذكاء الاصطناعي يساعدني أوفر وقت، فضلت ساعتين أظبط البرومبت.'
];

const styleNames = {
  'egyptian-cartoon':'كاريكاتير مصري',
  'modern-comic':'كوميك عصري',
  'manga':'مانجا',
  '3d':'3D كرتوني',
  'sketch':'رسم يدوي',
  'retro':'ريترو التسعينات'
};

function toast(msg){
  const el=$('#toast'); el.textContent=msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200);
}

function setStatus(msg, show=true){
  const el=$('#statusBar');
  el.textContent=msg;
  el.classList.toggle('hidden',!show);
}

$$('.mode').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.mode').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  state.mode=btn.dataset.mode;
  $('#scenario').placeholder = state.mode === 'situation'
    ? 'احكي اللي حصل من غير ما تكتب حوار. مثال: المدير سألني عن التقرير وأنا أصلًا ما بدأتش، وحاولت أهرب من السؤال…'
    : 'اكتب الحوار أو النص زي ما عايزه يظهر. مثال:\nالمدير: التقرير خلص؟\nأنا: أيوه… فاضل بس أبدأ فيه.';
  $('#modeHint').textContent = state.mode === 'situation'
    ? '🧠 اكتب اللي حصل بطريقتك. هنفهم السياق ونكتب الحوار من الصفر — مش هننسخ كلامك.'
    : '✍️ هنا هنحافظ على نصك قدر الإمكان ونقسّمه لكادرات بشكل طبيعي.';
}));

$$('#panelCount button').forEach(btn=>btn.addEventListener('click',()=>{
  $$('#panelCount button').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
  state.panelCount=Number(btn.dataset.value);
}));

$('#scenario').addEventListener('input',e=>$('#charCount').textContent=e.target.value.length);
$('#surpriseBtn').addEventListener('click',()=>{
  const text=examples[Math.floor(Math.random()*examples.length)];
  $('#scenario').value=text; $('#charCount').textContent=text.length; toast('حطينا لك موقف 👌');
});

$('#examplesBtn').addEventListener('click',()=>$('#examplesDialog').showModal());
$('#closeExamples').addEventListener('click',()=>$('#examplesDialog').close());
examples.forEach(text=>{
  const d=document.createElement('div'); d.className='example-item'; d.textContent=text;
  d.onclick=()=>{ $('#scenario').value=text; $('#charCount').textContent=text.length; $('#examplesDialog').close(); $('#studio').scrollIntoView({behavior:'smooth'}); };
  $('#examplesList').appendChild(d);
});

$('#generateBtn').addEventListener('click', generateComic);
$('#newComicBtn').addEventListener('click',()=>{ $('#resultSection').classList.add('hidden'); $('#studio').scrollIntoView({behavior:'smooth'}); });
$('#downloadBtn').addEventListener('click', downloadComic);
$('#shareBtn').addEventListener('click', shareComic);

async function generateComic(){
  const scenario=$('#scenario').value.trim();
  if(scenario.length<8){ toast('احكي الموقف الأول بكلمتين زيادة 😄'); $('#scenario').focus(); return; }
  if(state.generating) return;
  state.generating=true;
  const btn=$('#generateBtn'); btn.disabled=true; btn.querySelector('span:nth-child(2)').textContent='بنكتب الكوميك…';
  try{
    const res=await fetch('/api/story',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      scenario, mode:state.mode, panelCount:state.panelCount, style:$('#style').value, tone:$('#tone').value, dialect:$('#dialect').value
    })});
    const raw=await res.text();
    let data;
    try{ data=JSON.parse(raw); }
    catch{ throw new Error(res.ok ? 'السيرفر رجّع رد غير مفهوم. جرّب تاني.' : 'حصل خطأ في السيرفر. جرّب كمان شوية.'); }
    if(!res.ok) throw new Error(data.error||'مشكلة في كتابة الكوميك');
    state.story=data.story; state.images=Array(state.story.panels.length).fill(null);
    $('#comicTitle').textContent=state.story.title||'الكوميك بتاعك';
    $('#resultSection').classList.remove('hidden');
    renderPanels();
    $('#resultSection').scrollIntoView({behavior:'smooth',block:'start'});
    setStatus(data.demo ? 'وضع تجريبي: الحوار اتكتب كنموذج من نوع الموقف من غير نسخ كلامك. أضف GEMINI_API_KEY لتفعيل فهم السياق والرسم الحقيقي.' : (state.mode==='situation' ? 'فهمنا الموقف وكتبنا الحوار من الصفر ✨ دلوقتي بنرسم الكادرات…' : 'رتبنا نصك للكوميك ✨ دلوقتي بنرسم الكادرات…'));
    await generateAllImages();
    setStatus(data.demo ? 'خلصنا النسخة التجريبية. بعد إضافة مفتاح Gemini هتتولد رسومات AI حقيقية.' : 'الكوميك جاهز 🎉 تقدر تعدّل الكلام أو تعيد توليد أي كادر.');
  }catch(err){
    console.error(err); toast(err.message||'حصلت مشكلة، جرّب تاني');
  }finally{
    state.generating=false; btn.disabled=false; btn.querySelector('span:nth-child(2)').textContent='حوّلها لكوميك';
  }
}

function renderPanels(){
  const grid=$('#comicGrid'); grid.innerHTML='';
  const count=state.story.panels.length;
  grid.style.gridTemplateColumns = window.innerWidth<620 ? '1fr' : (count===2?'repeat(2,1fr)':'repeat(2,1fr)');
  state.story.panels.forEach((panel,i)=>{
    const article=document.createElement('article'); article.className='comic-panel'; article.dataset.index=i;
    const img=document.createElement('img'); img.alt=`كادر ${i+1}`; img.className='panel-image';
    if(state.images[i]) img.src=state.images[i];
    const loading=document.createElement('div'); loading.className='panel-loading'; loading.innerHTML='<span>🎨 بنرسم الكادر…</span>';
    if(state.images[i]) loading.classList.add('hidden');
    const overlay=document.createElement('div'); overlay.className='panel-overlay';
    const cap=document.createElement('div'); cap.className='caption'; cap.contentEditable='true'; cap.textContent=panel.caption||'';
    cap.addEventListener('input',()=>{ state.story.panels[i].caption=cap.textContent.trim(); });
    const bubbles=document.createElement('div'); bubbles.className='bubbles';
    (panel.dialogues||[]).forEach((d,j)=>{
      const b=document.createElement('div'); b.className='dialogue-bubble'; b.contentEditable='true'; b.dataset.side=d.position||((j%2)?'left':'right');
      b.textContent=d.speaker ? `${d.speaker}: ${d.text}` : d.text;
      b.addEventListener('input',()=>{
        const val=b.textContent.trim(); const idx=val.indexOf(':');
        if(idx>0){d.speaker=val.slice(0,idx).trim();d.text=val.slice(idx+1).trim();}else{d.text=val;}
      });
      bubbles.appendChild(b);
    });
    overlay.append(cap,bubbles);
    const tools=document.createElement('div'); tools.className='panel-tools';
    const regen=document.createElement('button'); regen.textContent='↻ إعادة الرسم'; regen.onclick=()=>generatePanelImage(i,true);
    tools.appendChild(regen);
    article.append(img,loading,overlay,tools); grid.appendChild(article);
  });
}

async function generateAllImages(){
  let cursor=0; const workers=Math.min(2,state.story.panels.length);
  await Promise.all(Array.from({length:workers},async()=>{
    while(cursor<state.story.panels.length){ const i=cursor++; await generatePanelImage(i,false); }
  }));
}

async function generatePanelImage(i,force=false){
  const panelEl=$(`.comic-panel[data-index="${i}"]`); if(!panelEl)return;
  const loading=panelEl.querySelector('.panel-loading'); loading.classList.remove('hidden');
  loading.querySelector('span').textContent=force?'🎨 بنعيد رسم الكادر…':'🎨 بنرسم الكادر…';
  try{
    const res=await fetch('/api/image',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      panel:state.story.panels[i], characters:state.story.characters, style:$('#style').value, title:state.story.title, panelIndex:i, totalPanels:state.story.panels.length
    })});
    const raw=await res.text();
    let data;
    try{ data=JSON.parse(raw); }
    catch{ throw new Error(res.ok ? 'رد الرسم غير مفهوم' : 'خدمة الرسم حصل فيها خطأ'); }
    if(!res.ok) throw new Error(data.error||'تعذر رسم الكادر');
    state.images[i]=data.image;
    const img=panelEl.querySelector('.panel-image'); img.src=data.image;
    if(data.demo && !panelEl.querySelector('.demo-badge')){ const badge=document.createElement('span');badge.className='demo-badge';badge.textContent='DEMO';panelEl.appendChild(badge); }
  }catch(err){
    console.error(err); panelEl.querySelector('.panel-loading span').textContent='⚠️ الرسم فشل — دوس إعادة الرسم';
    return;
  }
  loading.classList.add('hidden');
}

function loadImage(src){ return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;}); }

function roundRect(ctx,x,y,w,h,r,fill,stroke){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=4;ctx.stroke();}
}

function wrapRtl(ctx,text,maxWidth){
  const words=(text||'').split(/\s+/); const lines=[]; let line='';
  for(const word of words){ const test=line?`${line} ${word}`:word; if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=word;}else line=test; }
  if(line)lines.push(line); return lines.slice(0,4);
}

async function renderToCanvas(){
  if(!state.story) throw new Error('مفيش كوميك لسه');
  const count=state.story.panels.length; const cols=count===2?1:2; const rows=Math.ceil(count/cols);
  const panelW=900,panelH=675,gap=16,pad=26,header=120;
  const W=cols*panelW+(cols-1)*gap+pad*2; const H=rows*panelH+(rows-1)*gap+pad*2+header;
  const canvas=$('#exportCanvas'); canvas.width=W; canvas.height=H; const ctx=canvas.getContext('2d');
  ctx.fillStyle='#090616';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffd84d';ctx.font='900 46px Cairo, sans-serif';ctx.textAlign='right';ctx.direction='rtl';ctx.fillText(state.story.title||'كوميكها',W-pad,pad+55);
  ctx.fillStyle='#9b91b4';ctx.font='700 22px Cairo, sans-serif';ctx.fillText('comicha • معمول بالذكاء الاصطناعي',W-pad,pad+91);
  const images=await Promise.all(state.images.map((src,i)=>src?loadImage(src):loadImage(makeDemoSvg(state.story.panels[i].scene,i))));
  for(let i=0;i<count;i++){
    const r=Math.floor(i/cols),c=i%cols; const x=pad+c*(panelW+gap),y=pad+header+r*(panelH+gap);
    ctx.save();ctx.beginPath();ctx.rect(x,y,panelW,panelH);ctx.clip();
    const im=images[i]; const ir=im.width/im.height,pr=panelW/panelH; let dw,dh,dx,dy;
    if(ir>pr){dh=panelH;dw=dh*ir;dx=x-(dw-panelW)/2;dy=y}else{dw=panelW;dh=dw/ir;dx=x;dy=y-(dh-panelH)/2}
    ctx.drawImage(im,dx,dy,dw,dh);ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(x,y,panelW,panelH);ctx.restore();
    ctx.strokeStyle='#05030b';ctx.lineWidth=10;ctx.strokeRect(x,y,panelW,panelH);
    const p=state.story.panels[i];
    if(p.caption){ctx.font='700 20px Cairo, sans-serif';const lines=wrapRtl(ctx,p.caption,540);const bw=Math.min(570,Math.max(...lines.map(t=>ctx.measureText(t).width))+35);const bh=lines.length*31+18;roundRect(ctx,x+panelW-bw-18,y+18,bw,bh,8,'rgba(15,10,28,.92)',null);ctx.fillStyle='#fff';ctx.textAlign='right';lines.forEach((t,k)=>ctx.fillText(t,x+panelW-34,y+48+k*31));}
    const ds=p.dialogues||[]; ds.slice(0,3).forEach((d,j)=>{
      ctx.font='800 22px Cairo, sans-serif'; const full=d.speaker?`${d.speaker}: ${d.text}`:d.text; const lines=wrapRtl(ctx,full,480); const tw=Math.max(...lines.map(t=>ctx.measureText(t).width)); const bw=Math.min(520,tw+42),bh=lines.length*34+24;
      const side=d.position||((j%2)?'left':'right'); const bx=side==='left'?x+22:x+panelW-bw-22; const by=y+panelH-(j+1)*(bh+18)-14;
      roundRect(ctx,bx,by,bw,bh,24,'#fff','#161020');ctx.fillStyle='#161020';ctx.textAlign='right';ctx.direction='rtl';lines.forEach((t,k)=>ctx.fillText(t,bx+bw-19,by+36+k*34));
    });
  }
  return canvas;
}

async function downloadComic(){
  try{const canvas=await renderToCanvas();const a=document.createElement('a');a.download=`comicha-${Date.now()}.png`;a.href=canvas.toDataURL('image/png',.95);a.click();toast('اتحملت الصورة 🎉');}catch(e){console.error(e);toast('مش قادر أجهز الصورة دلوقتي');}
}

async function shareComic(){
  try{
    const canvas=await renderToCanvas(); const blob=await new Promise(r=>canvas.toBlob(r,'image/png',.95)); const file=new File([blob],'comicha.png',{type:'image/png'});
    if(navigator.share && navigator.canShare?.({files:[file]})){await navigator.share({title:state.story.title,text:'شوف الكوميك ده 😄 — معمول على كوميكها',files:[file]});}
    else{await downloadComic();toast('المشاركة المباشرة مش متاحة هنا — نزّلنا الصورة بدلها');}
  }catch(e){if(e.name!=='AbortError')toast('المشاركة ما كملتش');}
}

function makeDemoSvg(scene='',index=0){
  const palettes=[['#7357e8','#281650'],['#ee5a9d','#5a2149'],['#36c3d7','#173c64'],['#f0b541','#6d3615'],['#69ca82','#1e4b42'],['#e67355','#51213c']];
  const [a,b]=palettes[index%palettes.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675" viewBox="0 0 900 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="40" fill="white" opacity=".035"/></pattern></defs><rect width="900" height="675" fill="url(#g)"/><rect width="900" height="675" fill="url(#p)"/><circle cx="250" cy="315" r="120" fill="#ffd2aa" stroke="#161020" stroke-width="12"/><circle cx="215" cy="290" r="12"/><circle cx="285" cy="290" r="12"/><path d="M205 360 Q250 395 300 350" fill="none" stroke="#161020" stroke-width="12" stroke-linecap="round"/><path d="M150 210 Q250 90 345 215 Q260 175 150 210" fill="#23152d"/><circle cx="650" cy="335" r="110" fill="#ffd2aa" stroke="#161020" stroke-width="12"/><circle cx="620" cy="315" r="11"/><circle cx="680" cy="315" r="11"/><path d="M610 375 Q650 340 700 380" fill="none" stroke="#161020" stroke-width="12" stroke-linecap="round"/><path d="M555 245 Q650 135 745 245" fill="#352040"/><path d="M0 560 L900 500 L900 675 L0 675Z" fill="#0d0920" opacity=".55"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

window.addEventListener('resize',()=>{ if(state.story) renderPanels(); });

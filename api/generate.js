function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function clean(value) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, 1800);
}

function buildPrompt(situation) {
  return `Create ONE finished vertical comic page as a single image based on the situation below.

CORE GOAL:
Turn the situation into a polished, funny, shareable Egyptian comic. The user's wording is CONTEXT ONLY. Do not copy the user's sentences into speech bubbles. Infer what happened, infer the characters and relationship, then invent ALL dialogue from scratch.

STORY:
- Use 2 to 4 panels, choosing the smallest number that tells the joke well.
- Clear setup -> escalation/reaction -> punchline.
- Keep the same characters visually consistent across all panels.
- Use believable locations and props that match the situation.
- Strong facial expressions and natural body language.
- Keep dialogue brief so the page stays readable on a phone.

LANGUAGE AND TEXT:
- All dialogue and captions must be natural contemporary Egyptian Arabic colloquial.
- Dialogue should sound like real Egyptians talking, not formal Arabic and not translated phrasing.
- Do not reuse or closely paraphrase the user's wording except proper names, brand names, numbers, or indispensable factual terms.
- Arabic spelling must be clean and readable.
- Put dialogue inside clean white comic speech bubbles with bold black Arabic lettering.
- Never mix Arabic letter order or render mirrored text.
- No English text unless the situation absolutely requires a proper English term.
- Avoid long paragraphs: each bubble should usually be one short sentence.

VISUAL STYLE:
- Modern professional comic illustration, similar to a polished editorial/social-media comic.
- Detailed people, real environments, cinematic framing, expressive acting.
- Consistent character faces, hair, clothing, age, and body type across panels.
- Distinct panels with clean gutters/borders.
- Full finished artwork, not a storyboard, sketch, placeholder, icon faces, emoji faces, stick figures, or simplistic circles.
- No watermark, no app UI, no extra explanation outside the comic.

FORMAT:
- Portrait comic page optimized for mobile viewing.
- The final output is ONLY the comic artwork.

SITUATION:
${situation}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });

  const body = await readJson(req);
  const situation = clean(body.situation);
  if (situation.length < 8) return send(res, 400, { error: 'اكتب موقف أوضح شوية.' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return send(res, 503, {
      error: 'توليد الصور لسه محتاج تفعيل مفتاح OpenAI على السيرفر.'
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110000);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${key}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',
        prompt: buildPrompt(situation),
        size: '1024x1536'
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!response.ok) {
      const message = data?.error?.message || data?.message || 'خدمة الصور رجّعت خطأ.';
      console.error('OpenAI image error', response.status, message);
      return send(res, response.status >= 400 && response.status < 500 ? 400 : 502, {
        error: 'توليد الكوميك فشل: ' + message
      });
    }

    const item = data?.data?.[0];
    if (item?.b64_json) {
      return send(res, 200, { image: `data:image/png;base64,${item.b64_json}` });
    }
    if (item?.url) {
      return send(res, 200, { image: item.url });
    }

    console.error('OpenAI image response missing image', data);
    return send(res, 502, { error: 'الخدمة اشتغلت لكن ما رجعتش صورة.' });
  } catch (err) {
    console.error(err);
    if (err?.name === 'AbortError') return send(res, 504, { error: 'التوليد أخد وقت أطول من المتوقع. جرّب تاني.' });
    return send(res, 500, { error: 'حصل خطأ أثناء توليد الكوميك.' });
  }
};

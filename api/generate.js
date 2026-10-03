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
  return `Create ONE finished vertical 2-panel comic image based on the user's input.

ABSOLUTE PRIORITY:
This must be a SHORT two-beat comic like a social-media meme, NOT a story, NOT a long comic, NOT an explanation.

LAYOUT:
- EXACTLY 2 panels stacked vertically.
- Panel 1 = setup/question.
- Panel 2 = reply/punchline.
- Same characters, same location, same clothing, same faces across both panels.
- No title.
- No captions.
- No narration boxes.
- No explanatory text.
- No third panel.
- No extra dialogue outside the speech bubbles.

DIALOGUE LOGIC:
- If the user explicitly wrote a question/answer or dialogue, preserve that dialogue as closely as possible and simply visualize it.
- If the user only described a situation, treat it as context and invent the SHORTEST natural Egyptian Arabic exchange that captures it.
- In situation-description cases, do NOT copy the user's descriptive sentences into bubbles.
- Aim for just ONE speech bubble in panel 1 and ONE speech bubble in panel 2.
- Maximum 2 bubbles in a panel only if absolutely necessary.
- Each bubble should usually be 3–12 Arabic words.
- Total comic dialogue should be very short; prioritize the joke over completeness.
- The second panel must contain the punchline or funny payoff.
- Natural contemporary Egyptian colloquial Arabic only; no formal Arabic unless the user's explicit dialogue is formal.
- No extra setup, no moral, no summary, no "after that", no "in the end", no scene captions.

ARABIC TEXT:
- Use clean white speech bubbles with bold black Arabic lettering.
- Arabic must be correctly ordered right-to-left and visually readable.
- Never mirror Arabic letters.
- Never invent extra text.
- No English text unless it is an essential proper term from the user's dialogue.

VISUAL STYLE:
- Polished modern comic illustration similar to a professional social-media editorial comic.
- Real human-looking cartoon characters, detailed office/home/street/cafe as appropriate.
- Expressive facial reactions and believable body language.
- Do NOT use emojis, stick figures, circular placeholder faces, simplistic icons, storyboards, or sketch placeholders.
- Strong visual continuity between the two panels.
- Clean border/gutter between the panels.
- Portrait image optimized for a phone screen.

FINAL OUTPUT:
Only the finished two-panel comic artwork.

USER INPUT:
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

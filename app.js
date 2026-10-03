const $ = (s) => document.querySelector(s);

const situation = $('#situation');
const charCount = $('#charCount');
const generateBtn = $('#generateBtn');
const statusEl = $('#status');
const resultSection = $('#resultSection');
const resultImage = $('#resultImage');
const imageLoader = $('#imageLoader');
const downloadBtn = $('#downloadBtn');
const shareBtn = $('#shareBtn');
const againBtn = $('#againBtn');

let currentImage = '';
let generating = false;

situation.addEventListener('input', () => {
  charCount.textContent = situation.value.length;
});

generateBtn.addEventListener('click', generateComic);
downloadBtn.addEventListener('click', downloadComic);
shareBtn.addEventListener('click', shareComic);
againBtn.addEventListener('click', () => {
  resultSection.classList.add('hidden');
  currentImage = '';
  resultImage.removeAttribute('src');
  situation.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.classList.remove('hidden');
  statusEl.classList.toggle('error', error);
}

function hideStatus() {
  statusEl.classList.add('hidden');
  statusEl.classList.remove('error');
}

async function readApiResponse(res) {
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(res.ok ? 'السيرفر رجّع رد غير مفهوم.' : 'حصل خطأ في السيرفر. جرّب تاني بعد شوية.');
  }
}

async function generateComic() {
  const text = situation.value.trim();
  if (text.length < 8) {
    setStatus('احكي الموقف بتفاصيل أكتر شوية 😄', true);
    situation.focus();
    return;
  }
  if (generating) return;

  generating = true;
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span>✦</span><strong>بنحوّله لكوميك…</strong>';
  resultSection.classList.remove('hidden');
  resultImage.removeAttribute('src');
  imageLoader.classList.remove('hidden');
  setStatus('بنحوّل وصفك لبرومبت كوميك، وبعدها بنولّد الصورة كاملة…');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ situation: text })
    });

    const data = await readApiResponse(res);
    if (!res.ok) throw new Error(data.error || 'التوليد فشل، جرّب تاني.');

    if (!data.image) throw new Error('ماوصلتش صورة من خدمة التوليد.');

    currentImage = data.image;
    resultImage.src = currentImage;
    await new Promise((resolve, reject) => {
      if (resultImage.complete) return resolve();
      resultImage.onload = resolve;
      resultImage.onerror = () => reject(new Error('الصورة اتولدت لكن حصلت مشكلة في عرضها.'));
    });

    imageLoader.classList.add('hidden');
    setStatus('الكوميك جاهز 🎉');
  } catch (err) {
    console.error(err);
    imageLoader.classList.add('hidden');
    resultSection.classList.add('hidden');
    setStatus(err.message || 'حصلت مشكلة غير متوقعة.', true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    generating = false;
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span>✦</span><strong>حوّل الموقف لكوميك</strong>';
  }
}

function downloadComic() {
  if (!currentImage) return;
  const a = document.createElement('a');
  a.href = currentImage;
  a.download = `comicha-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function shareComic() {
  if (!currentImage) return;
  try {
    const blob = await (await fetch(currentImage)).blob();
    const file = new File([blob], 'comicha.png', { type: blob.type || 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'كوميكها',
        text: 'شوف الكوميك ده 😄',
        files: [file]
      });
    } else {
      downloadComic();
      setStatus('المشاركة المباشرة مش متاحة على الجهاز ده، فنزّلنا الصورة بدلها.');
    }
  } catch (err) {
    if (err?.name !== 'AbortError') setStatus('المشاركة ما كملتش.', true);
  }
}

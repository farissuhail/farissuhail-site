// Year
document.getElementById('year').textContent = new Date().getFullYear();

// Language toggle (EN <-> BM)
const langBtn = document.getElementById('langToggle');
const html = document.documentElement;

function applyLang(lang) {
  html.setAttribute('data-lang', lang);
  document.querySelectorAll('[data-en][data-bm]').forEach(el => {
    el.textContent = lang === 'bm' ? el.dataset.bm : el.dataset.en;
  });
  langBtn.querySelector('.lang-en').classList.toggle('active', lang === 'en');
  langBtn.querySelector('.lang-bm').classList.toggle('active', lang === 'bm');
  try { localStorage.setItem('fs-lang', lang); } catch (e) {}
}

langBtn.addEventListener('click', () => {
  const next = html.getAttribute('data-lang') === 'en' ? 'bm' : 'en';
  applyLang(next);
});

// Restore preference
try {
  const saved = localStorage.getItem('fs-lang');
  if (saved === 'bm') applyLang('bm');
} catch (e) {}

// Contact form → Web3Forms (free form backend for static hosting)
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');

function t(en, bm) {
  return html.getAttribute('data-lang') === 'bm' ? bm : en;
}

// True once the real Web3Forms access key has been pasted into the form.
// Until then (and in local preview) we fall back to mailto so the form still works.
function hasAccessKey() {
  const k = ((form.querySelector('[name="access_key"]') || {}).value || '').trim();
  return k.length > 10 && !/YOUR_WEB3FORMS_ACCESS_KEY/i.test(k);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = (fd.get('name') || '').toString().trim();
  const email = (fd.get('email') || '').toString().trim();
  const business = (fd.get('business') || '').toString().trim();
  const message = (fd.get('message') || '').toString().trim();

  // Honeypot — bots tick the hidden box; quietly pretend it succeeded.
  if (fd.get('botcheck')) { form.reset(); return; }

  if (!name || !email || !message) {
    note.hidden = false;
    note.className = 'form-note error';
    note.textContent = t(
      'Please fill in your name, email, and a few project details.',
      'Sila isi nama, e-mel dan butiran projek.'
    );
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtn = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>${t('Sending…', 'Menghantar…')}</span>`;

  try {
    if (hasAccessKey()) {
      const payload = {};
      fd.forEach((v, k) => { payload[k] = v.toString(); });
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Submission failed');

      note.hidden = false;
      note.className = 'form-note success';
      note.textContent = t(
        "Thanks! Your enquiry's in — I'll reply within 1 working day.",
        'Terima kasih! Pertanyaan anda diterima — saya akan balas dalam 1 hari bekerja.'
      );
      form.reset();
    } else {
      // No access key yet (or local preview) — fall back to mailto so the form still works.
      const subject = encodeURIComponent(`New project enquiry — ${business || name}`);
      const mailBody = encodeURIComponent(
`Hi Faris,

Name: ${name}
Email: ${email}
Business: ${business || '—'}

What I'd like the app to do:
${message}

Thanks!`
      );
      window.location.href = `mailto:tech@farissuhail.com?subject=${subject}&body=${mailBody}`;
      note.hidden = false;
      note.className = 'form-note success';
      note.textContent = t(
        'Opening your email client… if nothing opens, email tech@farissuhail.com directly.',
        'Membuka klien e-mel anda… jika tidak terbuka, e-mel terus ke tech@farissuhail.com'
      );
    }
  } catch (err) {
    note.hidden = false;
    note.className = 'form-note error';
    note.textContent = t(
      'Something went wrong. Please email tech@farissuhail.com directly.',
      'Terdapat masalah. Sila e-mel terus ke tech@farissuhail.com'
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtn;
  }
});

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in-view');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.service-card, .step, .why-card, .usecase, .work-card, .price-card, .faq details').forEach(el => {
  el.classList.add('reveal');
  io.observe(el);
});

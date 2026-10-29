// Shared counter: free Abacus API (https://abacus.jasoncameron.dev), so every
// visitor sees the same number. Falls back to a local count if it's offline.
const COUNTER_URL = 'https://abacus.jasoncameron.dev';
const COUNTER_NS = 'izu83-tomov';
const COUNTER_KEY = 'dvoiki';
const LOCAL_KEY = 'tomov-dvoiki-local';

const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли',
  'август', 'септември', 'октомври', 'ноември', 'декември'];

const $ = (id) => document.getElementById(id);

let lections = [];

// ---------- Lections ----------

async function loadLections() {
  const res = await fetch('lections/lections.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Не може да се зареди lections.json');
  const list = await res.json();
  // Oldest first; the last one is the most recent lection
  return list
    .map((l) => ({ ...l, slug: l.file.replace(/\.md$/, '') }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function renderSidebar(activeSlug) {
  const latest = lections[lections.length - 1];
  $('lectionList').innerHTML = lections.map((l, i) => `
    <a class="lection-link${l.slug === activeSlug ? ' active' : ''}" href="#/${l.slug}">
      <span class="lection-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="lection-title">${l.title}${l === latest ? '<span class="tag-latest">ново</span>' : ''}</span>
      <span class="lection-date">${formatDate(l.date)}</span>
    </a>`).join('');
}

function renderPager(index) {
  const prev = lections[index - 1];
  const next = lections[index + 1];
  $('pager').innerHTML =
    (prev ? `<a class="prev" href="#/${prev.slug}"><small>← Предишна</small><span>${prev.title}</span></a>` : '') +
    (next ? `<a class="next" href="#/${next.slug}"><small>Следваща →</small><span>${next.title}</span></a>` : '');
}

// Image and link paths in the .md files are relative to the lections/ folder
function fixRelativePaths(article, file) {
  const base = new URL(`lections/${file}`, location.href);
  article.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
    img.loading = 'lazy';
  });
  article.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (/^[a-z]+:|^#/i.test(href)) return;
    const target = lections.find((l) => href.replace(/^\.\//, '') === l.file);
    a.href = target ? `#/${target.slug}` : new URL(href, base).href;
  });
}

async function showLection(slug) {
  const index = slug ? lections.findIndex((l) => l.slug === slug) : lections.length - 1;
  const article = $('article');

  if (index === -1) {
    $('lectionMeta').textContent = '';
    article.innerHTML = '<h1>Няма такава лекция</h1><p><a href="#/">Към последната лекция</a></p>';
    $('pager').innerHTML = '';
    renderSidebar(null);
    return;
  }

  const lection = lections[index];
  renderSidebar(lection.slug);
  renderPager(index);
  $('lectionMeta').textContent =
    `Лекция ${String(index + 1).padStart(2, '0')} · ${formatDate(lection.date)}` +
    (index === lections.length - 1 ? ' · последна' : '');
  document.title = `${lection.title} · Лекции по ООП`;

  try {
    const res = await fetch(`lections/${lection.file}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    article.innerHTML = marked.parse(await res.text());
    fixRelativePaths(article, lection.file);
    article.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
  } catch {
    article.innerHTML = `<h1>${lection.title}</h1><p class="muted">Лекцията не можа да се зареди.</p>`;
  }
  window.scrollTo(0, 0);
}

function route() {
  document.body.classList.remove('nav-open');
  const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  showLection(slug || null);
}

// ---------- Counter ----------

let counterOnline = true;

function setCounter(value) {
  const el = $('counterValue');
  el.textContent = value;
  el.classList.remove('bump');
  void el.offsetWidth; // restart the animation
  el.classList.add('bump');
}

function localCount() {
  try { return Number(localStorage.getItem(LOCAL_KEY)) || 0; } catch { return 0; }
}

async function loadCounter() {
  try {
    const res = await fetch(`${COUNTER_URL}/get/${COUNTER_NS}/${COUNTER_KEY}`);
    if (res.status === 404) return setCounter(0); // nobody has clicked yet
    if (!res.ok) throw new Error(res.status);
    setCounter((await res.json()).value);
  } catch {
    counterOnline = false;
    $('counterBtn').title = 'Броячът е офлайн — броим само на това устройство';
    setCounter(localCount());
  }
}

function floatPlusOne(btn) {
  const rect = btn.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'plus-one';
  el.textContent = '+1';
  el.style.left = `${rect.right - 34}px`;
  el.style.top = `${rect.top - 4}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

async function hitCounter() {
  const btn = $('counterBtn');
  const current = Number($('counterValue').textContent) || 0;
  setCounter(current + 1); // optimistic
  floatPlusOne(btn);

  if (counterOnline) {
    try {
      const res = await fetch(`${COUNTER_URL}/hit/${COUNTER_NS}/${COUNTER_KEY}`);
      if (!res.ok) throw new Error(res.status);
      $('counterValue').textContent = (await res.json()).value;
      return;
    } catch {
      // keep the optimistic value
    }
  }
  try { localStorage.setItem(LOCAL_KEY, current + 1); } catch {}
}

// ---------- Init ----------

$('counterBtn').addEventListener('click', hitCounter);
$('menuBtn').addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  $('menuBtn').setAttribute('aria-expanded', open);
});
$('scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
window.addEventListener('hashchange', route);

loadCounter();
loadLections()
  .then((list) => {
    lections = list;
    if (!lections.length) {
      $('lectionList').innerHTML = '<p class="muted" style="padding:0 10px">Още няма лекции.</p>';
      $('article').innerHTML = '<h1>Още няма лекции</h1>';
      return;
    }
    route();
  })
  .catch((err) => {
    $('lectionList').innerHTML = '';
    $('article').innerHTML = `<h1>Грешка</h1><p class="muted">${err.message}</p>`;
  });

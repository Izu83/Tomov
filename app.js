// Shared counter: free Abacus API (https://abacus.jasoncameron.dev), so every
// visitor sees the same number. Falls back to a local count if it's offline.
const COUNTER_URL = 'https://abacus.jasoncameron.dev';
const COUNTER_NS = 'izu83-tomov';
const COUNTER_KEY = 'dvoiki-v2';
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

// `> [!TIP]` / `> [!NOTE]` blockquotes are additions to the professor's notes
const CALLOUTS = {
  TIP: { cls: 'tip', label: 'Пример' },
  NOTE: { cls: 'note', label: 'Уточнение' },
};

function renderCallouts(article) {
  article.querySelectorAll('blockquote').forEach((bq) => {
    const first = bq.querySelector('p');
    const match = first && first.innerHTML.match(/^\s*\[!(\w+)\]\s*/);
    const type = match && CALLOUTS[match[1].toUpperCase()];
    if (!type) return;
    first.innerHTML = first.innerHTML.slice(match[0].length);
    if (!first.textContent.trim()) first.remove();
    const box = document.createElement('aside');
    box.className = `callout callout-${type.cls}`;
    box.innerHTML = `<div class="callout-title">${type.label}<span class="callout-added" title="Не е от лекцията — добавено за по-лесно разбиране">добавено</span></div>`;
    box.append(...bq.childNodes);
    bq.replaceWith(box);
  });
}

function tidyArticle(article, lection) {
  // The date heading + rule at the top duplicates the meta line
  const first = article.firstElementChild;
  if (first && /^H[1-6]$/.test(first.tagName) && /^\d{2}[./]\d{2}[./]\d{4}$/.test(first.textContent.trim())) {
    if (first.nextElementSibling?.tagName === 'HR') first.nextElementSibling.remove();
    first.remove();
  }
  if (!article.querySelector('h1')) {
    const h1 = document.createElement('h1');
    h1.textContent = lection.title;
    article.prepend(h1);
  }
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
    tidyArticle(article, lection);
    renderCallouts(article);
    fixRelativePaths(article, lection.file);
    article.querySelectorAll('pre code').forEach((el) => hljs.highlightElement(el));
    if (window.renderMathInElement) {
      renderMathInElement(article, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false,
      });
    }
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

const MESSAGES = [
  'Още една в колекцията.',
  'Поне не е единица.',
  'Поправката е през юни.',
  'Двойката също е оценка.',
  'Бележникът плаче.',
  'Компилирано с грешки.',
  'NullPointerException в знанията.',
  'int оценка = 2;',
  'Дисциплина. Всеки. Ден.',
  'Следващия път ще уча. Може би.',
  'Това не е бъг, а фийчър.',
  'Статистиката расте.',
  'Пак ли?',
  'Мама ще се гордее.',
  'Томов записа.',
];
const MILESTONE_EVERY = 10;
const POLL_MS = 20000;
const COMBO_MS = 700;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let counterOnline = true;
let shown = null;     // value on screen
let pending = 0;      // clicks not yet sent to the server
let sending = false;
let combo = 0;
let comboTimer;
let toastTimer;
let lastMessage = -1;

// Old number slides up and out, new one rolls in from below
function showCount(value, animate = true) {
  if (value === shown) return;
  const box = $('counterValue');
  const next = document.createElement('span');
  next.textContent = value;
  if (animate && shown !== null && !reducedMotion) {
    box.querySelectorAll('span').forEach((old) => {
      old.classList.add('roll-out');
      old.addEventListener('animationend', () => old.remove());
    });
    next.classList.add('roll-in');
    box.append(next);
  } else {
    box.replaceChildren(next);
  }
  shown = value;
}

function localCount() {
  try { return Number(localStorage.getItem(LOCAL_KEY)) || 0; } catch { return 0; }
}

async function fetchCount() {
  const res = await fetch(`${COUNTER_URL}/get/${COUNTER_NS}/${COUNTER_KEY}`);
  if (res.status === 404) return 0; // nobody has clicked yet
  if (!res.ok) throw new Error(res.status);
  return (await res.json()).value;
}

async function loadCounter() {
  try {
    showCount(await fetchCount(), false);
  } catch {
    counterOnline = false;
    $('counterBtn').title = 'Броячът е офлайн — броим само на това устройство';
    showCount(localCount(), false);
  }
}

// Pick up other people's clicks while the page is open
function pollCounter() {
  if (!counterOnline || document.hidden || pending || sending) return;
  fetchCount().then((v) => { if (v > shown) showCount(v); }).catch(() => {});
}

// Hits go out one at a time so fast clicking doesn't trip the API rate limit
async function flushHits() {
  if (sending) return;
  sending = true;
  while (pending > 0) {
    pending--;
    try {
      const res = await fetch(`${COUNTER_URL}/hit/${COUNTER_NS}/${COUNTER_KEY}`);
      if (!res.ok) throw new Error(res.status);
      const value = (await res.json()).value;
      showCount(Math.max(shown, value + pending));
    } catch {
      // keep the optimistic number
    }
  }
  sending = false;
}

function burst(count, spread) {
  if (reducedMotion) return;
  const rect = $('counterStamp').getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'flying-two';
    el.textContent = '2';
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height / 2}px`;
    el.style.setProperty('--dx', `${(Math.random() - 0.6) * spread}px`);
    el.style.setProperty('--up', `${-20 - Math.random() * spread * 0.5}px`);
    el.style.setProperty('--fall', `${60 + Math.random() * spread}px`);
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`);
    el.style.setProperty('--size', `${18 + Math.random() * 18}px`);
    el.style.animationDelay = `${Math.random() * 80}ms`;
    document.body.append(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function toast(text, big = false) {
  const el = $('counterToast');
  el.textContent = text;
  el.classList.toggle('big', big);
  el.classList.remove('show');
  void el.offsetWidth; // restart the animation
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), big ? 3200 : 1800);
}

function randomMessage() {
  let i;
  do { i = Math.floor(Math.random() * MESSAGES.length); } while (i === lastMessage);
  lastMessage = i;
  return MESSAGES[i];
}

function restartAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function hitCounter() {
  const value = (shown || 0) + 1;
  showCount(value);

  combo++;
  clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { combo = 0; }, COMBO_MS);

  restartAnimation($('counterStamp'), 'stamp');
  restartAnimation($('counterBtn'), 'shake');

  if (value % MILESTONE_EVERY === 0) {
    burst(28, 260);
    toast(`Юбилей! ${value} двойки във випуска.`, true);
  } else if (combo >= 3) {
    burst(4 + Math.min(combo, 10), 120 + combo * 8);
    toast(`×${combo} комбо!`);
  } else {
    burst(6, 130);
    toast(randomMessage());
  }

  if (counterOnline) {
    pending++;
    flushHits();
  } else {
    try { localStorage.setItem(LOCAL_KEY, value); } catch {}
  }
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
setInterval(pollCounter, POLL_MS);
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

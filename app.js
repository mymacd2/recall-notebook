// ── State ──────────────────────────────────────────────────────────────────
const state = {
  notes: [],        // array of note metadata from index.json
  current: null,    // { meta, rawBody }
  revealed: false,
  mode: 'daily',    // 'daily' | 'random' | 'browse'
};

// ── Fetch helpers ──────────────────────────────────────────────────────────
async function fetchIndex() {
  const res = await fetch('./notes/index.json');
  if (!res.ok) throw new Error(`Failed to load notes/index.json (${res.status})`);
  const data = await res.json();
  return data.notes ?? [];
}

async function fetchNoteFile(filename) {
  const res = await fetch(`./notes/${filename}`);
  if (!res.ok) throw new Error(`Failed to load notes/${filename} (${res.status})`);
  return res.text();
}

// ── Frontmatter parser ─────────────────────────────────────────────────────
// Splits raw .md text into { meta, rawBody }.
// meta is the parsed YAML frontmatter (relies on index.json for most fields;
// this is only used for fallback when loading a card directly without index data).
function splitFrontmatter(text) {
  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = text.match(FM_RE);
  if (!m) return { rawBody: text };
  return { rawBody: m[2] };
}

// ── Math extraction pipeline ───────────────────────────────────────────────
// Prevents marked.js from mangling LaTeX delimiters by temporarily replacing
// math expressions with placeholder tokens.

function extractMath(text) {
  const store = [];

  // 1. Extract fenced code blocks first (don't want math inside them touched)
  const withoutCode = text.replace(/```[\s\S]*?```/g, (match) => {
    const idx = store.length;
    store.push({ type: 'code', content: match });
    return `@@PLACEHOLDER_${idx}@@`;
  });

  // 2. Extract display math $$...$$ (must come before inline to avoid partial match)
  const withoutDisplay = withoutCode.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const idx = store.length;
    store.push({ type: 'display-math', content: match });
    return `@@PLACEHOLDER_${idx}@@`;
  });

  // 3. Extract inline math $...$ (not preceded/followed by $, content non-empty,
  //    no leading/trailing whitespace in content, avoids "$5 and $10" false positives
  //    by requiring at least one non-digit/non-space character)
  const withoutInline = withoutDisplay.replace(
    /(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g,
    (match, inner) => {
      // Skip if inner looks purely like a currency amount (digits/commas/dots only)
      if (/^[\d,. ]+$/.test(inner)) return match;
      const idx = store.length;
      store.push({ type: 'inline-math', content: match });
      return `@@PLACEHOLDER_${idx}@@`;
    }
  );

  return { sanitized: withoutInline, store };
}

function restorePlaceholders(html, store) {
  return html.replace(/@@PLACEHOLDER_(\d+)@@/g, (_, idx) => store[+idx].content);
}

// ── Markdown renderer ──────────────────────────────────────────────────────
function renderMarkdown(rawBody) {
  const { sanitized, store } = extractMath(rawBody);
  const rawHtml = window.marked.parse(sanitized);
  return restorePlaceholders(rawHtml, store);
}

function renderMath(container) {
  window.renderMathInElement(container, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$',  right: '$',  display: false },
    ],
    throwOnError: false,
  });
}

// ── Daily card seeding ─────────────────────────────────────────────────────
// djb2 hash — fast, deterministic, no dependencies
function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash >>>= 0; // keep as unsigned 32-bit
  }
  return hash;
}

function todayString() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getDailyIndex(len) {
  return djb2(todayString()) % len;
}

// ── Sources rendering ──────────────────────────────────────────────────────
function renderSources(sources) {
  if (!sources || sources.length === 0) return '';
  const items = sources.map(s => {
    const isUrl = /^https?:\/\//.test(s);
    const content = isUrl
      ? `<a href="${s}" target="_blank" rel="noopener noreferrer">${s}</a>`
      : escapeHtml(s);
    return `<li>${content}</li>`;
  }).join('');
  return `
    <div class="card-sources">
      <div class="card-sources-heading">Sources</div>
      <ul>${items}</ul>
    </div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Card rendering ─────────────────────────────────────────────────────────
function renderCardFront(meta) {
  const tags = (meta.tags ?? []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const tagsHtml = tags ? `<div class="card-tags">${tags}</div>` : '';
  const promptHtml = meta.prompt
    ? `<p class="card-prompt">${escapeHtml(meta.prompt)}</p>`
    : '';
  return `
    <div class="card">
      ${tagsHtml}
      <h1 class="card-title">${escapeHtml(meta.title)}</h1>
      ${promptHtml}
      <button id="btn-reveal" class="btn-reveal">Reveal Answer</button>
    </div>`;
}

function renderCardBack(meta, bodyHtml) {
  const tags = (meta.tags ?? []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const tagsHtml = tags ? `<div class="card-tags">${tags}</div>` : '';
  const promptHtml = meta.prompt
    ? `<p class="card-prompt">${escapeHtml(meta.prompt)}</p>`
    : '';
  return `
    <div class="card">
      ${tagsHtml}
      <h1 class="card-title">${escapeHtml(meta.title)}</h1>
      ${promptHtml}
      <hr class="card-divider">
      <div class="card-back">
        <div class="card-body">${bodyHtml}</div>
        ${renderSources(meta.sources)}
        <div class="card-actions">
          <button id="btn-next" class="btn-secondary">Next Random</button>
          <button id="btn-browse-from-card" class="btn-secondary">Browse All</button>
        </div>
      </div>
    </div>`;
}

// ── Load card ──────────────────────────────────────────────────────────────
function setApp(html) {
  document.getElementById('app').innerHTML = html;
}

async function loadCard(meta) {
  state.current = { meta };
  state.revealed = false;
  setApp(renderCardFront(meta));
}

async function revealCard() {
  const { meta } = state.current;
  const raw = await fetchNoteFile(meta.filename);
  const { rawBody } = splitFrontmatter(raw);

  // Sources from index.json are authoritative; fall back to meta.sources
  const bodyHtml = renderMarkdown(rawBody);
  setApp(renderCardBack(meta, bodyHtml));

  // Run KaTeX after DOM update
  const bodyEl = document.querySelector('.card-body');
  if (bodyEl) renderMath(bodyEl);

  state.revealed = true;
}

async function loadDailyCard() {
  if (state.notes.length === 0) return;
  const idx = getDailyIndex(state.notes.length);
  await loadCard(state.notes[idx]);
}

async function loadRandomCard() {
  if (state.notes.length === 0) return;
  // Avoid repeating current card if possible
  let idx;
  do {
    idx = Math.floor(Math.random() * state.notes.length);
  } while (state.notes.length > 1 && state.notes[idx].filename === state.current?.meta?.filename);
  await loadCard(state.notes[idx]);
}

// ── Browse view ────────────────────────────────────────────────────────────
function getAllTags() {
  const tagSet = new Set();
  state.notes.forEach(n => (n.tags ?? []).forEach(t => tagSet.add(t)));
  return [...tagSet].sort();
}

function renderBrowse(filterTag = '', searchQuery = '') {
  const allTags = getAllTags();
  const tagOptions = ['', ...allTags].map(t =>
    `<option value="${escapeHtml(t)}" ${t === filterTag ? 'selected' : ''}>${t || 'All tags'}</option>`
  ).join('');

  const q = searchQuery.toLowerCase();
  const filtered = state.notes.filter(n => {
    const matchTag = !filterTag || (n.tags ?? []).includes(filterTag);
    const matchSearch = !q || n.title.toLowerCase().includes(q) ||
                        (n.tags ?? []).some(t => t.toLowerCase().includes(q));
    return matchTag && matchSearch;
  });

  const listItems = filtered.map(n => {
    const tags = (n.tags ?? []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    return `
      <div class="note-list-item" data-filename="${escapeHtml(n.filename)}">
        <span class="note-item-title">${escapeHtml(n.title)}</span>
        <span class="note-item-tags">${tags}</span>
      </div>`;
  }).join('');

  setApp(`
    <div class="browse-header">
      <input id="browse-search" class="browse-search" type="search"
             placeholder="Search notes..." value="${escapeHtml(searchQuery)}">
      <select id="browse-tag-filter" class="browse-tag-filter">${tagOptions}</select>
    </div>
    <p class="browse-count">${filtered.length} of ${state.notes.length} notes</p>
    <div class="note-list">
      ${listItems || '<p class="browse-empty">No notes match your filter.</p>'}
    </div>`);

  document.getElementById('browse-search').addEventListener('input', e => {
    renderBrowse(document.getElementById('browse-tag-filter').value, e.target.value);
  });
  document.getElementById('browse-tag-filter').addEventListener('change', e => {
    renderBrowse(e.target.value, document.getElementById('browse-search').value);
  });
}

// ── Nav button state ───────────────────────────────────────────────────────
function setActiveNav(mode) {
  state.mode = mode;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const map = { daily: 'btn-daily', random: 'btn-random', browse: 'btn-browse' };
  document.getElementById(map[mode])?.classList.add('active');
}

// ── Event delegation ───────────────────────────────────────────────────────
function wireAppEvents() {
  document.getElementById('app').addEventListener('click', async e => {
    if (e.target.matches('#btn-reveal')) {
      await revealCard();
    }
    if (e.target.matches('#btn-next')) {
      setActiveNav('random');
      await loadRandomCard();
    }
    if (e.target.matches('#btn-browse-from-card')) {
      setActiveNav('browse');
      renderBrowse();
    }
    const listItem = e.target.closest('.note-list-item');
    if (listItem) {
      const filename = listItem.dataset.filename;
      const meta = state.notes.find(n => n.filename === filename);
      if (meta) {
        setActiveNav('random'); // browsing and then picking is like a random pick
        await loadCard(meta);
      }
    }
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  try {
    state.notes = await fetchIndex();
  } catch (err) {
    setApp(`<p class="loading">Error loading notes: ${err.message}</p>`);
    return;
  }

  if (state.notes.length === 0) {
    setApp(`
      <div class="empty-state">
        <h2>No notes yet</h2>
        <p>Add <code>.md</code> files to the <code>notes/</code> directory to get started.</p>
      </div>`);
    return;
  }

  // Nav buttons
  document.getElementById('btn-daily').addEventListener('click', async () => {
    setActiveNav('daily');
    await loadDailyCard();
  });
  document.getElementById('btn-random').addEventListener('click', async () => {
    setActiveNav('random');
    await loadRandomCard();
  });
  document.getElementById('btn-browse').addEventListener('click', () => {
    setActiveNav('browse');
    renderBrowse();
  });

  wireAppEvents();

  // Default: load daily card
  setActiveNav('daily');
  await loadDailyCard();
}

init();

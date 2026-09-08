/* ══════════════════════════════════════════════════════════════════════════════
   Deciphering Conflicts — Regional Edition map.js
   Differences from English map.js:
     • Loads news.json from the same folder (regional/news.json)
     • categorize() uses headline_en (translated text) for classification
     • buildPopup() shows original-language headline as primary text,
       with English translation shown as subtitle
     • Language filter chips dynamically built (Malayalam / Hindi / Assamese…)
     • No guided tour, no visit counter (kept simple for regional edition)
   ══════════════════════════════════════════════════════════════════════════════ */

// ── Constants ─────────────────────────────────────────────────────────────────
const INDIA_BOUNDS = [[6, 68], [37, 98]];

const CATEGORY_COLORS = {
  poaching:     '#ef4444',
  discovery:    '#f59e0b',
  conflict:     '#f97316',
  research:     '#06b6d4',
  conservation: '#818cf8',
};

const CATEGORY_LABELS = {
  poaching:     'Poaching & Crime',
  discovery:    'Species Discovery',
  conflict:     'Human-Wildlife Conflict',
  research:     'Research & Science',
  conservation: 'Conservation & Policy',
};

// Language display names and accent colours for badges
const LANG_COLORS = {
  'Malayalam': '#10b981',  // emerald  — Kerala
  'Hindi':     '#f59e0b',  // amber    — UP/MP/HP/Bihar/Rajasthan
  'Assamese':  '#6366f1',  // indigo   — Assam/Northeast
  'Telugu':    '#ec4899',  // pink     — AP/Telangana
  'Kannada':   '#f97316',  // orange   — Karnataka
  'Odia':      '#14b8a6',  // teal     — Odisha
  'Bengali':   '#8b5cf6',  // violet   — West Bengal
  'Marathi':   '#ef4444',  // red      — Maharashtra
  'Tamil':     '#06b6d4',  // cyan     — Tamil Nadu
  'Gujarati':  '#84cc16',  // lime     — Gujarat
};

const LANG_DISPLAY = {
  'Malayalam': 'മലയാളം',
  'Hindi':     'हिन्दी',
  'Assamese':  'অসমীয়া',
  'Telugu':    'తెలుగు',
  'Kannada':   'ಕನ್ನಡ',
  'Odia':      'ଓଡ଼ିଆ',
  'Bengali':   'বাংলা',
  'Marathi':   'मराठी',
  'Tamil':     'தமிழ்',
  'Gujarati':  'ગુજરાતી',
};

// ── Source metadata (for info popover) ───────────────────────────────────────
const SOURCE_META = {
  'Mathrubhumi':         { region: 'Kerala',        lang: 'Malayalam', desc: 'Kerala\'s oldest and most widely-read Malayalam daily. Strong coverage of Western Ghats wildlife, Periyar & Wayanad.' },
  'Manorama Online':     { region: 'Kerala',        lang: 'Malayalam', desc: 'Malayala Manorama\'s digital platform. Covers elephant corridors, forest fires & wildlife crime in Kerala.' },
  'Dainik Jagran':       { region: 'North India',   lang: 'Hindi',     desc: 'India\'s largest-circulated Hindi daily. Covers Dudhwa, UP forest dept, Himalayan wildlife & poaching.' },
  'Amar Ujala':          { region: 'North India',   lang: 'Hindi',     desc: 'UP & Uttarakhand-focused Hindi daily with coverage of Jim Corbett, tiger reserves & human-wildlife conflict.' },
  'Patrika':             { region: 'Rajasthan/MP',  lang: 'Hindi',     desc: 'Hindi daily covering Ranthambore, Keoladeo & MP tiger reserves like Kanha and Bandhavgarh.' },
  'Pratidin Time':       { region: 'Assam',         lang: 'Assamese',  desc: 'Assam\'s leading digital news outlet. Reports on Kaziranga floods, rhino poaching & forest encroachment.' },
  'Asomiya Pratidin':    { region: 'Assam',         lang: 'Assamese',  desc: 'Top-circulated Assamese newspaper. Covers Manas, Kaziranga & Brahmaputra ecosystem stories.' },
  'Sakshi':              { region: 'AP/Telangana',  lang: 'Telugu',    desc: 'Telugu daily with wide AP/Telangana reach. Covers Nagarjunasagar, Eastern Ghats & wildlife corridors.' },
  'Eenadu':              { region: 'AP/Telangana',  lang: 'Telugu',    desc: 'Highest-circulated Telugu newspaper. Reports on Nallamala forests, Godavari basin & wildlife crime.' },
  'Prajavani':           { region: 'Karnataka',     lang: 'Kannada',   desc: 'Largest Kannada daily. Covers Nagarahole, Bandipur, Coorg & Western Ghats wildlife issues.' },
  'Vijay Karnataka':     { region: 'Karnataka',     lang: 'Kannada',   desc: 'Karnataka\'s top Kannada paper covering Biligiri Rangaswamy, elephant corridors & forest fires.' },
  'Dharitri':            { region: 'Odisha',        lang: 'Odia',      desc: 'Odisha\'s leading Odia daily. Covers Simlipal, Bhitarkanika, Olive Ridley turtles & tribal forest rights.' },
  'Sambad':              { region: 'Odisha',        lang: 'Odia',      desc: 'Top Odia newspaper covering Chilika lake ecology, elephant conflict & Odisha wildlife department.' },
  'Anandabazar Patrika': { region: 'West Bengal',   lang: 'Bengali',   desc: 'India\'s top Bengali newspaper. Covers Sundarbans, Bengal tiger, mangrove ecology & wildlife stories.' },
  'Sangbad Pratidin':    { region: 'West Bengal',   lang: 'Bengali',   desc: 'Bengali daily with coverage of Sundarbans biosphere, migratory birds & North Bengal forests.' },
  'Loksatta':            { region: 'Maharashtra',   lang: 'Marathi',   desc: 'Maharashtra\'s leading Marathi paper. Covers Tadoba, Melghat & Sahyadri wildlife & leopard conflict.' },
  'Maharashtra Times':   { region: 'Maharashtra',   lang: 'Marathi',   desc: 'Marathi daily covering Vidarbha tiger reserves, forest dept news & human-wildlife conflict in Maharashtra.' },
  'Sakal':               { region: 'Maharashtra',   lang: 'Marathi',   desc: 'Pune-based Marathi daily covering Sahyadri forests, Tadoba & human-elephant conflict in Vidarbha.' },
  'Marathi News':        { region: 'Maharashtra',   lang: 'Marathi',   desc: 'Aggregated Marathi-language wildlife coverage from across Maharashtra publications.' },
  'Dinamalar':           { region: 'Tamil Nadu',    lang: 'Tamil',     desc: 'Tamil Nadu\'s largest-circulated Tamil newspaper. Covers Mudumalai, Anamalai & Western Ghats wildlife.' },
  'Dinakaran':           { region: 'Tamil Nadu',    lang: 'Tamil',     desc: 'Tamil daily with strong coverage of Nilgiris biosphere, elephant corridors & coastal ecology.' },
  'Tamil News':          { region: 'Tamil Nadu',    lang: 'Tamil',     desc: 'Aggregated Tamil-language wildlife coverage from across Tamil Nadu publications.' },
  'Telugu News':         { region: 'AP/Telangana',  lang: 'Telugu',    desc: 'Aggregated Telugu-language wildlife coverage from Andhra Pradesh and Telangana publications.' },
  'Malayalam News':      { region: 'Kerala',        lang: 'Malayalam', desc: 'Aggregated Malayalam-language wildlife coverage from across Kerala publications.' },
  'Bengali News':        { region: 'West Bengal',   lang: 'Bengali',   desc: 'Aggregated Bengali-language wildlife coverage from across West Bengal publications.' },
  'Dainik Bhaskar':      { region: 'MP/Rajasthan',  lang: 'Hindi',     desc: 'Major Hindi daily covering Kanha, Bandhavgarh, Ranthambore & Gujarat wildlife stories.' },
  'Divya Bhaskar':       { region: 'Gujarat',       lang: 'Gujarati',  desc: 'Gujarat\'s biggest Gujarati daily. Covers Gir lion census, Little Rann wild ass & Great Indian Bustard.' },
  'Gujarat Samachar':    { region: 'Gujarat',       lang: 'Gujarati',  desc: 'Top Gujarati newspaper covering Marine National Park (Jamnagar), Asiatic lion & mangrove conservation.' },
  'Gujarati News':       { region: 'Gujarat',       lang: 'Gujarati',  desc: 'Aggregated Gujarati-language wildlife coverage from across Gujarat publications.' },
};

// Order matters — first match wins. conservation is the fallback.
const CATEGORY_KEYWORDS = {
  poaching:  ['poach', 'snare', 'traffick', 'smuggl', 'ivory', 'wildlife crime', 'confiscat', 'illegal hunt', 'crime against'],
  discovery: ['new species', 'new-to-science', 'records first', 'first record', 'scientists discover', 'new fanged', 'new toad', 'new frog', 'new fish species', 'new gecko', 'new snake eel', 'emerges from ancient', 'solves evolutionary'],
  conflict:  ['elephant attack', 'leopard attack', 'tiger attack', 'bear attack', 'mauled', 'conflict hotspot', 'human-wildlife', 'man-animal', 'human-animal', 'drone squad'],
  research:  ['finds study', 'reveals survey', 'reveals study', 'population rises', 'population survey', 'census', 'behaviour', 'behavior', 'foraging', 'camera trap', 'odonate', 'migratory pastoralist'],
};

// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
  center: [22, 82],
  zoom: 5,
  minZoom: 4,
  maxZoom: 15,
  zoomSnap: 0.25,
  maxBounds: [[1, 63], [41, 102]],
  maxBoundsViscosity: 1.0,
  zoomControl: false,
});

L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  maxZoom: 16,
}).addTo(map);

map.fitBounds([[3.5, 66], [38.5, 99]], { padding: [10, 10] });

// India boundary overlay — same shapefile as English edition
fetch('../india_boundary.geojson')
  .then(r => r.json())
  .then(data => {
    L.geoJSON(data, {
      style: { color: '#ffffff', weight: 1, opacity: 0.3, fill: false },
      interactive: false,
    }).addTo(map);
  })
  .catch(() => {});

// ── Cluster group ─────────────────────────────────────────────────────────────
const clusters = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  iconCreateFunction(cluster) {
    const count = cluster.getChildCount();
    const large = count >= 10 ? ' large' : '';
    return L.divIcon({
      html: `<div class="cluster-icon${large}">${count}</div>`,
      className: '',
      iconSize: large ? [44, 44] : [38, 38],
    });
  },
});
map.addLayer(clusters);

// ── State ─────────────────────────────────────────────────────────────────────
let allArticles = [];
let allMarkers  = [];
const activeCats  = new Set(['poaching', 'discovery', 'conflict', 'research', 'conservation']);
const activeSrcs  = new Set();

const HISTORY_DAYS = 60;
let showHistorical = localStorage.getItem('wl_history') === '1';
const activeLangs = new Set();
let _srcDropdownSources = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Categorise using the English-translated headline */
function categorize(headline_en) {
  const lower = (headline_en || '').toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return 'conservation';
}

function markerRadius(published) {
  const days = (Date.now() - new Date(published).getTime()) / 86400000;
  return Math.max(5, 10 - days * 0.12);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function popupBadgeStyle(cat) {
  const colors = {
    poaching:     { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   text: '#fca5a5', dot: '#ef4444' },
    discovery:    { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  text: '#fcd34d', dot: '#f59e0b' },
    conflict:     { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.35)',  text: '#fdba74', dot: '#f97316' },
    research:     { bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)',   text: '#67e8f9', dot: '#06b6d4' },
    conservation: { bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.35)', text: '#a5b4fc', dot: '#818cf8' },
  };
  return colors[cat] || colors.conservation;
}

function buildPopup(a) {
  const cat   = categorize(a.headline_en || a.headline);
  const color = CATEGORY_COLORS[cat];
  const badge = popupBadgeStyle(cat);
  const label = CATEGORY_LABELS[cat];

  const langColor   = LANG_COLORS[a.lang]   || '#888';
  const langDisplay = LANG_DISPLAY[a.lang]   || a.lang || '';

  // Show original headline as main. If translation exists and differs, show it as subtitle.
  const hasTranslation = a.headline_en && a.headline_en !== a.headline;

  return `
    <div class="popup">
      <div class="popup-header">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <div class="popup-cat-badge" style="background:${badge.bg};border:1px solid ${badge.border};color:${badge.text}">
            <span class="popup-cat-dot" style="background:${badge.dot}"></span>
            ${label}
          </div>
          <span class="lang-badge" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:${langColor}">
            ${escapeHtml(langDisplay)}
          </span>
        </div>
        <div class="popup-headline">${escapeHtml(a.headline)}</div>
        ${hasTranslation ? `<div class="popup-translation">${escapeHtml(a.headline_en)}</div>` : ''}
      </div>
      <div class="popup-meta">
        <div class="popup-meta-row">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span class="popup-meta-text">${escapeHtml(a.place_name)}</span>
        </div>
        <div class="popup-meta-row">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span class="popup-meta-text">${escapeHtml(a.source)} · ${formatDate(a.published)}</span>
        </div>
      </div>
      <div class="popup-footer">
        <a class="popup-link" href="${a.url}" target="_blank" rel="noopener noreferrer">
          Read article
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
        </a>
      </div>
    </div>`;
}

// ── Render markers ────────────────────────────────────────────────────────────
function renderMarkers(filtered) {
  clusters.clearLayers();
  filtered.forEach(({ marker }) => clusters.addLayer(marker));
  const total = allArticles.length;
  const shown = filtered.length;
  document.getElementById('stats').textContent =
    shown === total
      ? `${total} article${total !== 1 ? 's' : ''} on map`
      : `${shown} of ${total} articles`;

  updateHistoryBar();
  updateCategoryCounters(filtered);

  const empty = document.getElementById('empty-state');
  if (empty) empty.classList.toggle('visible', shown === 0);
}

// ── History toggle ────────────────────────────────────────────────────────────
function updateHistoryBar() {
  const bar = document.getElementById('history-bar');
  if (!bar) return;
  const total = allArticles.length;
  if (showHistorical) {
    bar.innerHTML = `All time &nbsp;·&nbsp; <button class="history-link" id="history-toggle-btn">Show recent only →</button>`;
  } else {
    bar.innerHTML = `Last 60 days &nbsp;·&nbsp; <button class="history-link" id="history-toggle-btn">Show all ${total} →</button>`;
  }
  document.getElementById('history-toggle-btn').addEventListener('click', () => {
    showHistorical = !showHistorical;
    localStorage.setItem('wl_history', showHistorical ? '1' : '0');
    applyFilters();
  });
}

// ── Weekly stats + hotspot ────────────────────────────────────────────────────
function computeWeeklyStats(articles) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = articles.filter(a => a.published >= cutoffStr);
  const bar = document.getElementById('week-stats');
  if (!bar) return;
  if (!recent.length) { bar.innerHTML = ''; return; }
  const places = new Set(recent.map(a => a.place_name).filter(Boolean));
  const langs  = new Set(recent.map(a => a.lang).filter(Boolean));
  bar.innerHTML = `<span class="week-pill">7 days</span>${recent.length} articles · ${langs.size} language${langs.size !== 1 ? 's' : ''} · ${places.size} places`;
}

function computeHotspot(articles) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = articles.filter(a => a.published >= cutoffStr && a.place_name);
  const counts = {};
  recent.forEach(a => { counts[a.place_name] = (counts[a.place_name]||0)+1; });
  const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  const card = document.getElementById('hotspot-card');
  if (!card) return;
  if (!top || top[1] < 2) { card.setAttribute('hidden',''); return; }
  card.removeAttribute('hidden');
  document.getElementById('hotspot-place').textContent = top[0];
  document.getElementById('hotspot-count').textContent = `${top[1]} articles`;
}

function updateCategoryCounters(filtered) {
  const counts = {};
  filtered.forEach(({article:a}) => { const c = categorize(a.headline_en || a.headline); counts[c]=(counts[c]||0)+1; });
  document.querySelectorAll('#cat-filters .filter-chip').forEach(chip => {
    const cat = chip.dataset.cat;
    let el = chip.querySelector('.chip-count');
    if (!el) {
      el = document.createElement('span');
      el.className = 'chip-count';
      chip.insertBefore(el, chip.querySelector('.chip-check'));
    }
    el.textContent = counts[cat] || 0;
  });
}

// ── Apply filters ─────────────────────────────────────────────────────────────
function applyFilters() {
  const query    = (document.getElementById('search').value || '').toLowerCase().trim();
  const dateFrom = document.getElementById('date-from').value;
  const dateTo   = document.getElementById('date-to').value;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = allMarkers.filter(({ article: a }) => {
    const cat = categorize(a.headline_en || a.headline);
    if (!activeCats.has(cat))        return false;
    if (!activeSrcs.has(a.source))   return false;
    if (!activeLangs.has(a.lang))    return false;
    if (!showHistorical && a.published < cutoffStr) return false;
    if (dateFrom && a.published < dateFrom) return false;
    if (dateTo   && a.published > dateTo)   return false;
    if (query && !(
      (a.headline    || '').toLowerCase().includes(query) ||
      (a.headline_en || '').toLowerCase().includes(query) ||
      (a.place_name  || '').toLowerCase().includes(query) ||
      (a.source      || '').toLowerCase().includes(query)
    )) return false;
    return true;
  });

  renderMarkers(filtered);
}

// ── Build language filters ────────────────────────────────────────────────────
function buildLangFilters(articles) {
  const langs = [...new Set(articles.map(a => a.lang).filter(Boolean))].sort();
  langs.forEach(l => activeLangs.add(l));

  const counts = articles.reduce((m, a) => { if (a.lang) m[a.lang] = (m[a.lang]||0)+1; return m; }, {});

  const container = document.getElementById('lang-filters');
  container.innerHTML = '';

  langs.forEach(lang => {
    const chip  = document.createElement('div');
    const color = LANG_COLORS[lang] || '#888';
    const disp  = LANG_DISPLAY[lang] || lang;

    chip.className = 'filter-chip lang-chip active';
    chip.setAttribute('role', 'checkbox');
    chip.setAttribute('aria-checked', 'true');
    chip.setAttribute('tabindex', '0');
    chip.dataset.lang = lang;

    chip.innerHTML = `
      <span class="chip-dot" style="background:${color}" aria-hidden="true"></span>
      <span class="chip-label">${escapeHtml(lang)}</span>
      <span class="chip-label-native" aria-hidden="true">${escapeHtml(disp)}</span>
      <span class="chip-count">${counts[lang] || 0}</span>
      <span class="chip-check">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </span>`;

    const toggle = () => {
      const active = activeLangs.has(lang);
      if (active) { activeLangs.delete(lang); chip.classList.remove('active'); chip.setAttribute('aria-checked','false'); }
      else        { activeLangs.add(lang);    chip.classList.add('active');    chip.setAttribute('aria-checked','true'); }
      applyFilters();
    };

    chip.addEventListener('click', toggle);
    chip.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
    container.appendChild(chip);
  });
}

// ── Build source filters (compact dropdown) ───────────────────────────────────
function buildSourceFilters(articles) {
  _srcDropdownSources = [...new Set(articles.map(a => a.source))].sort();
  _srcDropdownSources.forEach(s => activeSrcs.add(s));

  const panel = document.getElementById('src-dropdown-panel');
  const btn   = document.getElementById('src-dropdown-btn');

  // Header row: Select All / Clear
  const header = document.createElement('div');
  header.className = 'src-dd-header';
  header.innerHTML = `
    <button class="src-dd-action" id="src-select-all">All</button>
    <span class="src-dd-sep">·</span>
    <button class="src-dd-action" id="src-clear-all">None</button>`;
  panel.appendChild(header);

  // One row per source
  _srcDropdownSources.forEach(src => {
    const row = document.createElement('div');
    row.className = 'src-dd-row active';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'true');
    row.setAttribute('tabindex', '0');
    row.dataset.src = src;

    const hasMeta = !!SOURCE_META[src];
    const count   = (window._allArticles || []).filter(a => a.source === src).length;

    row.innerHTML = `
      <span class="src-dd-check">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span class="src-dd-name">${escapeHtml(src)}</span>
      <span class="src-dd-count">${count}</span>
      ${hasMeta ? `<button class="src-info-btn src-dd-info" aria-label="About ${escapeHtml(src)}" tabindex="-1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
      </button>` : ''}`;

    const toggle = () => {
      const active = activeSrcs.has(src);
      if (active) { activeSrcs.delete(src); row.classList.remove('active'); row.setAttribute('aria-selected','false'); }
      else        { activeSrcs.add(src);    row.classList.add('active');    row.setAttribute('aria-selected','true'); }
      updateSrcBtn();
      applyFilters();
    };

    row.addEventListener('click', toggle);
    row.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

    if (hasMeta) {
      const infoBtn = row.querySelector('.src-dd-info');
      infoBtn.setAttribute('tabindex', '0');
      infoBtn.addEventListener('click', e => { e.stopPropagation(); showSourcePopover(src, infoBtn); });
      infoBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); showSourcePopover(src, infoBtn); } });
    }

    panel.appendChild(row);
  });

  // Select All / None handlers
  document.getElementById('src-select-all').addEventListener('click', () => {
    _srcDropdownSources.forEach(s => activeSrcs.add(s));
    panel.querySelectorAll('.src-dd-row').forEach(r => { r.classList.add('active'); r.setAttribute('aria-selected','true'); });
    updateSrcBtn(); applyFilters();
  });
  document.getElementById('src-clear-all').addEventListener('click', () => {
    _srcDropdownSources.forEach(s => activeSrcs.delete(s));
    panel.querySelectorAll('.src-dd-row').forEach(r => { r.classList.remove('active'); r.setAttribute('aria-selected','false'); });
    updateSrcBtn(); applyFilters();
  });

  btn.addEventListener('click', e => { e.stopPropagation(); toggleSrcDropdown(); });

  updateSrcBtn();
}

function updateSrcBtn() {
  const total  = _srcDropdownSources.length;
  const active = _srcDropdownSources.filter(s => activeSrcs.has(s)).length;
  const label  = document.getElementById('src-dropdown-label');
  const btn    = document.getElementById('src-dropdown-btn');
  label.textContent = active === total ? 'All sources' : active === 0 ? 'No sources' : `${active} of ${total} sources`;
  btn.classList.toggle('src-btn-filtered', active !== total);
}

function toggleSrcDropdown() {
  const panel = document.getElementById('src-dropdown-panel');
  const btn   = document.getElementById('src-dropdown-btn');
  const open  = !panel.hidden;
  if (open) { closeSrcDropdown(); return; }
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('open');
}

function closeSrcDropdown() {
  const panel = document.getElementById('src-dropdown-panel');
  const btn   = document.getElementById('src-dropdown-btn');
  panel.hidden = true;
  btn.setAttribute('aria-expanded', 'false');
  btn.classList.remove('open');
}

// Close on outside click / Escape
document.addEventListener('click', e => {
  if (!document.getElementById('src-section').contains(e.target)) closeSrcDropdown();
});

// ── Source info popover ───────────────────────────────────────────────────────
let _popoverSrc = null;

function showSourcePopover(src, anchor) {
  const pop  = document.getElementById('src-popover');
  const meta = SOURCE_META[src];
  if (!meta) return;

  if (_popoverSrc === src && !pop.hidden) { hideSourcePopover(); return; }
  _popoverSrc = src;

  const count = (window._allArticles || []).filter(a => a.source === src).length;

  pop.innerHTML = `
    <div class="src-pop-header">
      <span class="src-pop-name">${escapeHtml(src)}</span>
      <button class="src-pop-close" aria-label="Close">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="src-pop-tags">
      <span class="src-pop-tag">${escapeHtml(meta.region)}</span>
      <span class="src-pop-tag">${escapeHtml(meta.lang)}</span>
      <span class="src-pop-tag">${count} article${count !== 1 ? 's' : ''}</span>
    </div>
    <p class="src-pop-desc">${escapeHtml(meta.desc)}</p>`;

  pop.hidden = false;

  const rect   = anchor.getBoundingClientRect();
  const panelW = document.getElementById('panel').offsetWidth;
  pop.style.top   = (rect.bottom + 6) + 'px';
  pop.style.left  = '12px';
  pop.style.width = (panelW - 24) + 'px';

  requestAnimationFrame(() => {
    const popH   = pop.offsetHeight;
    const maxTop = window.innerHeight - popH - 8;
    if (parseFloat(pop.style.top) > maxTop) pop.style.top = Math.max(8, maxTop) + 'px';
  });

  pop.querySelector('.src-pop-close').addEventListener('click', hideSourcePopover);
}

function hideSourcePopover() {
  const pop = document.getElementById('src-popover');
  pop.hidden = true;
  _popoverSrc = null;
}

// Close popover on outside click or Escape
document.addEventListener('click', e => {
  const pop = document.getElementById('src-popover');
  if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.src-info-btn')) hideSourcePopover();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideSourcePopover(); closeSrcDropdown(); } });

// ── Date defaults ─────────────────────────────────────────────────────────────
function setDefaultDates() {
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value   = new Date().toISOString().slice(0, 10);
}

// ── Category chip wiring ──────────────────────────────────────────────────────
document.querySelectorAll('#cat-filters .filter-chip').forEach(chip => {
  const cat = chip.dataset.cat;
  const toggle = () => {
    const active = activeCats.has(cat);
    if (active) { activeCats.delete(cat); chip.classList.remove('active'); chip.setAttribute('aria-checked','false'); }
    else        { activeCats.add(cat);    chip.classList.add('active');    chip.setAttribute('aria-checked','true'); }
    applyFilters();
  };
  chip.addEventListener('click', toggle);
  chip.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
});

// ── Section collapse wiring ───────────────────────────────────────────────────
document.querySelectorAll('.section-header').forEach(header => {
  const bodyId = header.dataset.target;
  const body   = document.getElementById(bodyId);
  if (!body) return;
  header.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    header.setAttribute('aria-expanded', open);
    body.classList.toggle('collapsed', !open);
  });
});

// ── Search wiring ─────────────────────────────────────────────────────────────
const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('search-clear');

searchEl.addEventListener('input', () => {
  clearBtn.style.display = searchEl.value ? 'flex' : 'none';
  applyFilters();
});

clearBtn.addEventListener('click', () => {
  searchEl.value = '';
  clearBtn.style.display = 'none';
  searchEl.focus();
  applyFilters();
});

document.getElementById('date-from').addEventListener('change', applyFilters);
document.getElementById('date-to').addEventListener('change', applyFilters);

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('reset-btn').addEventListener('click', () => {
  searchEl.value = '';
  clearBtn.style.display = 'none';

  ['poaching','discovery','conflict','research','conservation'].forEach(c => activeCats.add(c));
  document.querySelectorAll('#cat-filters .filter-chip').forEach(chip => {
    chip.classList.add('active'); chip.setAttribute('aria-checked', 'true');
  });

  _srcDropdownSources.forEach(s => activeSrcs.add(s));
  document.querySelectorAll('#src-dropdown-panel .src-dd-row').forEach(r => {
    r.classList.add('active'); r.setAttribute('aria-selected', 'true');
  });
  updateSrcBtn();

  allArticles.forEach(a => { if (a.lang) activeLangs.add(a.lang); });
  document.querySelectorAll('#lang-filters .filter-chip').forEach(chip => {
    chip.classList.add('active'); chip.setAttribute('aria-checked', 'true');
  });

  showHistorical = false;
  localStorage.setItem('wl_history', '0');
  setDefaultDates();
  applyFilters();
});

// ── Panel collapse ────────────────────────────────────────────────────────────
const panel  = document.getElementById('panel');
const toggle = document.getElementById('panel-toggle');

toggle.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed');
  toggle.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
  setTimeout(() => map.invalidateSize(), 230);
});

// ── Load data ─────────────────────────────────────────────────────────────────
fetch('news.json')
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(articles => {
    if (!articles.length) {
      document.getElementById('stats').textContent = 'No regional articles yet — check back soon.';
      return;
    }

    allArticles = articles;
    window._allArticles = articles;

    allMarkers = articles.map(a => {
      const cat    = categorize(a.headline_en || a.headline);
      const color  = CATEGORY_COLORS[cat];
      const radius = markerRadius(a.published);

      const marker = L.circleMarker([a.lat, a.lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1.5,
        opacity: 0.9,
      });

      marker.bindPopup(buildPopup(a), {
        maxWidth: 300,
        closeButton: true,
        className: '',
      });

      marker.on('mouseover', function() { this.setStyle({ weight: 2.5, fillOpacity: 1 }); });
      marker.on('mouseout',  function() { this.setStyle({ weight: 1.5, fillOpacity: 0.85 }); });

      return { article: a, marker };
    });

    buildLangFilters(articles);
    buildSourceFilters(articles);
    setDefaultDates();
    computeWeeklyStats(articles);
    computeHotspot(articles);
    applyFilters();
  })
  .catch(err => {
    console.error('Failed to load regional news.json:', err);
    document.getElementById('stats').textContent = 'Failed to load articles.';
  });

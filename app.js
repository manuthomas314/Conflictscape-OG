/* ==========================================================================
   Conflictscape — page controller

   The page is one narrative that ends in a working record. Everything the
   reader can click — a type card, a state bar, a source row, a tag — is the
   same filter, so the essay and the browser are never out of step.

   Data arrives either inlined by the pipeline (window.CONFLICTSCAPE, written
   by fetch_news.py) or fetched from data/stories.json + taxonomy.json when the
   page is served from a directory. window.DECIPHER_DATA is the pre-typology
   format and is still read so an old build does not render an empty page.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const norm = (s) => (s || '').toString().trim().toLowerCase();
  const pct = (n, d) => (d ? (n / d) * 100 : 0);

  function formatDate(s) {
    const d = new Date(s + 'T00:00:00');
    if (isNaN(d)) return s || '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ------------------------------------------------------------- the data */

  const FALLBACK_TAXONOMY = {
    types: [
      { id: 'extractive', order: 1, name: 'Extractive Resource Conflicts', short: 'Extractive', letter: 'E', spt: ['materials', 'competences'] },
      { id: 'land_agrarian', order: 2, name: 'Land-Use and Agrarian Conflicts', short: 'Land & Agrarian', letter: 'L', spt: ['materials', 'meanings'] },
      { id: 'infrastructure', order: 3, name: 'Infrastructure and Mobility Conflicts', short: 'Infrastructure', letter: 'I', spt: ['materials'] },
      { id: 'conservation', order: 4, name: 'Conservation and Biodiversity Conflicts', short: 'Conservation', letter: 'C', spt: ['meanings'] },
      { id: 'industrial_pollution', order: 5, name: 'Industrial Pollution Conflicts', short: 'Industrial Pollution', letter: 'P', spt: ['materials'] },
      { id: 'waste', order: 6, name: 'Waste and Disposal Conflicts', short: 'Waste & Disposal', letter: 'W', spt: ['materials', 'meanings'] }
    ],
    tags: [
      { id: 'water', name: 'Water-related' },
      { id: 'national_policy', name: 'National policy protest' }
    ],
    sources: []
  };

  /* Sample keywords shown on each type card. Illustrative, not the full
     lexicon — conflict_types.py is the lexicon of record. */
  const SAMPLE_KEYS = {
    extractive: ['coal block', 'mining lease', 'sand mining', 'stone quarry', 'bauxite', 'overburden'],
    land_agrarian: ['land acquisition', 'forest rights act', 'plantation', 'eviction drive', 'gram sabha consent'],
    infrastructure: ['expressway', 'dam project', 'submergence', 'port project', 'transmission line'],
    conservation: ['tiger reserve', 'eco-sensitive zone', 'elephant corridor', 'relocation', 'eco-tourism'],
    industrial_pollution: ['effluent', 'fly ash', 'stack emission', 'tannery', 'groundwater contaminated'],
    waste: ['landfill', 'dumping yard', 'waste-to-energy', 'legacy waste', 'leachate']
  };

  const SPT_SLOTS = ['materials', 'competences', 'meanings'];

  const store = {
    records: [],
    types: [],
    typeById: {},
    tags: [],
    generated: '',
    states: [],
    sources: []
  };

  const filters = {
    types: new Set(),
    states: new Set(),
    sources: new Set(),
    tags: new Set(),
    query: ''
  };

  let listLimit = 40;
  let activeUrl = null;

  /* ------------------------------------------------------------ selectors */

  const matches = (r) => {
    if (filters.types.size && !filters.types.has(r.type || 'unclassified')) return false;
    if (filters.states.size && !filters.states.has(r.state)) return false;
    if (filters.sources.size && !filters.sources.has(r.source)) return false;
    if (filters.tags.size) {
      const tags = r.tags || [];
      for (const t of filters.tags) if (!tags.includes(t)) return false;
    }
    if (filters.query) {
      const hay = [r.headline, r.place_name, r.state, r.source, r.type_name].join(' ').toLowerCase();
      if (!filters.query.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  };

  const visible = () => store.records.filter(matches);
  const anyFilter = () =>
    filters.types.size || filters.states.size || filters.sources.size ||
    filters.tags.size || filters.query;

  const isApproximate = (r) => {
    const p = norm(r.place_name);
    return p === '' || p === norm(r.state);
  };

  const typeColour = (id) => `var(--t-${id || 'none'}, var(--t-none))`;

  function countBy(records, key) {
    const m = new Map();
    records.forEach((r) => {
      const v = r[key] || 'Unattributed';
      m.set(v, (m.get(v) || 0) + 1);
    });
    return m;
  }

  /* Counts per type for one grouping value — the stacked bars everywhere. */
  function typeSplit(records) {
    const m = {};
    store.types.forEach((t) => (m[t.id] = 0));
    m.unclassified = 0;
    records.forEach((r) => {
      const k = r.type && m.hasOwnProperty(r.type) ? r.type : 'unclassified';
      m[k] += 1;
    });
    return m;
  }

  /* ------------------------------------------------------------ triad mark */

  function triad(spt) {
    const wrap = el('span', 'triad');
    wrap.setAttribute('role', 'img');
    const on = (spt || []).map(norm);
    wrap.setAttribute('aria-label', 'Disrupts ' + (on.length ? on.join(' and ') : 'nothing recorded'));
    SPT_SLOTS.forEach((slot) => {
      const i = el('i', on.includes(slot) ? 'on' : '');
      i.title = slot + (on.includes(slot) ? ' — disrupted' : '');
      wrap.appendChild(i);
    });
    return wrap;
  }

  /* --------------------------------------------------------------- filters */

  function toggle(setName, value) {
    const set = filters[setName];
    if (set.has(value)) set.delete(value);
    else set.add(value);
    listLimit = 40;
    render();
  }

  function clearAll() {
    filters.types.clear();
    filters.states.clear();
    filters.sources.clear();
    filters.tags.clear();
    filters.query = '';
    const box = $('search');
    if (box) box.value = '';
    listLimit = 40;
    render();
  }

  /* ================================================================ render */

  function renderFigures() {
    const dl = $('figures');
    if (!dl) return;
    dl.textContent = '';
    const dates = store.records.map((r) => r.published).filter(Boolean).sort();
    const rows = [
      ['Records', store.records.length.toLocaleString('en-IN')],
      ['Conflict types', String(store.types.length)],
      ['States and UTs', String(store.states.length)],
      ['News outlets monitored', String(store.sources.length)],
      ['Coverage', dates.length ? formatDate(dates[0]) + ' – ' + formatDate(dates[dates.length - 1]) : '—'],
      ['Last built', store.generated || '—']
    ];
    rows.forEach(([k, v]) => {
      const d = el('div');
      d.appendChild(el('dt', null, k));
      d.appendChild(el('dd', null, v));
      dl.appendChild(d);
    });
  }

  function renderTypology() {
    const host = $('typology');
    if (!host) return;
    host.textContent = '';
    const split = typeSplit(store.records);
    const max = Math.max(1, ...Object.values(split));

    store.types.forEach((t) => {
      const card = el('button', 'type-card');
      card.type = 'button';
      card.style.setProperty('--c', typeColour(t.id));
      card.setAttribute('aria-pressed', filters.types.has(t.id) ? 'true' : 'false');
      card.addEventListener('click', () => toggle('types', t.id));

      const spt = el('span', 'spt-line');
      spt.appendChild(triad(t.spt));
      spt.appendChild(el('span', null, (t.spt || []).join(' + ')));
      card.appendChild(spt);

      card.appendChild(el('h3', null, t.name));
      if (t.definition) card.appendChild(el('p', 'type-def', t.definition));
      if (t.spt_note) card.appendChild(el('p', 'spt-note', t.spt_note));

      if (t.absorbs && t.absorbs.length) {
        const a = el('p', 'type-absorbs');
        a.appendChild(el('b', null, 'Absorbs: '));
        a.appendChild(document.createTextNode(t.absorbs.join('; ')));
        card.appendChild(a);
      }

      const keys = el('div', 'keys');
      (SAMPLE_KEYS[t.id] || []).forEach((k) => keys.appendChild(el('span', 'key', k)));
      card.appendChild(keys);

      const n = split[t.id] || 0;
      const count = el('div', 'type-count');
      count.appendChild(el('span', 'n', n.toLocaleString('en-IN')));
      count.appendChild(el('span', 'of', n === 1 ? 'record' : 'records'));
      card.appendChild(count);

      const bar = el('div', 'bar');
      const fill = el('span');
      fill.style.width = pct(n, max).toFixed(1) + '%';
      bar.appendChild(fill);
      card.appendChild(bar);

      host.appendChild(card);
    });
  }

  function renderWater() {
    const host = $('water-figure');
    if (!host) return;
    host.textContent = '';

    const tagged = store.records.filter((r) => (r.tags || []).includes('water'));
    const line = $('water-count');
    if (line) {
      line.textContent = tagged.length
        ? `${tagged.length} of ${store.records.length} records carry the water tag — ` +
          'and they are spread across the types below, which is why water is not one of them.'
        : 'No record in the current archive carries the water tag yet. The tag is live in ' +
          'the pipeline; it fills as the backfill reaches water-borne cases.';
    }

    if (!tagged.length) {
      host.appendChild(el('p', 'water-empty',
        'The stacked bar here shows how water-tagged records distribute across the six ' +
        'types. It appears once the archive contains water-tagged records.'));
      return;
    }

    const split = typeSplit(tagged);
    const stack = el('div', 'stack');
    stack.setAttribute('role', 'img');
    stack.setAttribute('aria-label',
      'Water-tagged records by conflict type: ' +
      store.types.map((t) => `${t.short} ${split[t.id] || 0}`).join(', '));

    const key = el('div', 'stack-key');
    store.types.forEach((t) => {
      const n = split[t.id] || 0;
      if (!n) return;
      const seg = el('span');
      seg.style.width = pct(n, tagged.length).toFixed(2) + '%';
      seg.style.background = typeColour(t.id);
      stack.appendChild(seg);

      const k = el('span');
      const swatch = el('i');
      swatch.style.background = typeColour(t.id);
      k.appendChild(swatch);
      k.appendChild(document.createTextNode(`${t.short} · ${n}`));
      key.appendChild(k);
    });

    host.appendChild(stack);
    host.appendChild(key);
  }

  /* Stacked rows shared by the state chart and the source chart. */
  function renderRows(host, entries, setName, limit) {
    host.textContent = '';
    const max = Math.max(1, ...entries.map(([, recs]) => recs.length));
    entries.slice(0, limit).forEach(([label, recs]) => {
      const row = el('button', 'row');
      row.type = 'button';
      row.setAttribute('aria-pressed', filters[setName].has(label) ? 'true' : 'false');
      row.addEventListener('click', () => toggle(setName, label));

      row.appendChild(el('span', 'row-label', label));

      const track = el('div', 'row-track');
      track.style.width = pct(recs.length, max).toFixed(2) + '%';
      const split = typeSplit(recs);
      store.types.forEach((t) => {
        const n = split[t.id] || 0;
        if (!n) return;
        const seg = el('span');
        seg.style.width = pct(n, recs.length).toFixed(2) + '%';
        seg.style.background = typeColour(t.id);
        seg.title = `${t.short}: ${n}`;
        track.appendChild(seg);
      });
      const wrapper = el('div');
      wrapper.style.width = '100%';
      wrapper.appendChild(track);
      row.appendChild(wrapper);

      row.appendChild(el('span', 'row-n num', String(recs.length)));
      host.appendChild(row);
    });
  }

  function groupEntries(key) {
    const m = new Map();
    store.records.forEach((r) => {
      const v = r[key] || 'Unattributed';
      if (!m.has(v)) m.set(v, []);
      m.get(v).push(r);
    });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }

  let statesExpanded = false;

  function renderStates() {
    const host = $('state-chart');
    if (!host) return;
    const entries = groupEntries('state');
    renderRows(host, entries, 'states', statesExpanded ? entries.length : 12);

    const more = $('state-more');
    if (more) {
      more.hidden = entries.length <= 12;
      more.textContent = statesExpanded
        ? 'Show the top 12 only'
        : `Show all ${entries.length} states and union territories`;
    }
    const note = $('state-note');
    if (note) {
      const other = entries.find(([s]) => s === 'Other States');
      note.textContent = other
        ? `${other[1].length} records name no state the gazetteer recognises and sit under “Other States”.`
        : '';
    }
  }

  function renderSources() {
    const host = $('source-chart');
    if (host) renderRows(host, groupEntries('source'), 'sources', 100);
    renderMatrix();
  }

  function renderMatrix() {
    const host = $('matrix');
    if (!host) return;
    host.textContent = '';

    const entries = groupEntries('source');
    const table = el('table', 'matrix');
    const caption = el('caption', 'sr-only',
      'Records by news outlet and conflict type');
    table.appendChild(caption);

    const thead = el('thead');
    const hrow = el('tr');
    hrow.appendChild(el('th', null, 'Outlet'));
    store.types.forEach((t) => {
      const th = el('th', null, t.short);
      th.scope = 'col';
      th.style.color = typeColour(t.id);
      hrow.appendChild(th);
    });
    const total = el('th', null, 'All');
    total.scope = 'col';
    hrow.appendChild(total);
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = el('tbody');
    const colTotals = {};
    entries.forEach(([source, recs]) => {
      const tr = el('tr');
      const th = el('th', null, source);
      th.scope = 'row';
      tr.appendChild(th);
      const split = typeSplit(recs);
      store.types.forEach((t) => {
        const n = split[t.id] || 0;
        colTotals[t.id] = (colTotals[t.id] || 0) + n;
        const td = el('td', n ? '' : 'zero', String(n));
        if (n) {
          td.style.background = `color-mix(in oklab, ${typeColour(t.id)} ${Math.min(
            34, 6 + pct(n, recs.length) * 0.4).toFixed(0)}%, transparent)`;
        }
        tr.appendChild(td);
      });
      tr.appendChild(el('td', null, String(recs.length)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const tfoot = el('tfoot');
    const frow = el('tr');
    const fth = el('th', null, 'All outlets');
    fth.scope = 'row';
    frow.appendChild(fth);
    store.types.forEach((t) => frow.appendChild(el('td', null, String(colTotals[t.id] || 0))));
    frow.appendChild(el('td', null, String(store.records.length)));
    tfoot.appendChild(frow);
    table.appendChild(tfoot);

    host.appendChild(table);
  }

  /* ------------------------------------------------------------ the chips */

  function renderChips() {
    const host = $('chips');
    if (!host) return;
    host.textContent = '';

    const add = (label, value, setName, colour) => {
      const chip = el('button', 'chip');
      chip.type = 'button';
      if (colour) chip.style.setProperty('--c', colour);
      chip.setAttribute('aria-label', `Remove filter ${label}: ${value}`);
      chip.appendChild(el('b', null, value));
      chip.appendChild(el('span', 'x', '×'));
      chip.addEventListener('click', () => toggle(setName, value));
      host.appendChild(chip);
    };

    filters.types.forEach((id) => {
      const t = store.typeById[id];
      add('type', t ? t.short : id, 'types', typeColour(id));
    });
    filters.tags.forEach((id) => {
      const t = store.tags.find((x) => x.id === id);
      add('tag', t ? t.name : id, 'tags', id === 'water' ? 'var(--tag-water)' : null);
    });
    filters.states.forEach((s) => add('state', s, 'states', null));
    filters.sources.forEach((s) => add('source', s, 'sources', null));

    if (filters.query) {
      const chip = el('button', 'chip');
      chip.type = 'button';
      chip.appendChild(el('b', null, `“${filters.query}”`));
      chip.appendChild(el('span', 'x', '×'));
      chip.addEventListener('click', () => {
        filters.query = '';
        $('search').value = '';
        render();
      });
      host.appendChild(chip);
    }

    if (!anyFilter()) {
      host.appendChild(el('span', 'chips-none', 'Showing every record'));
    } else {
      const clear = el('button', 'link-btn', 'Clear all');
      clear.type = 'button';
      clear.addEventListener('click', clearAll);
      host.appendChild(clear);
    }
  }

  /* ------------------------------------------------------------- the list */

  function renderList(records) {
    const host = $('list');
    if (!host) return;
    host.textContent = '';

    if (!records.length) {
      const empty = el('div', 'empty');
      empty.appendChild(el('p', null,
        store.records.length
          ? 'No record matches these filters.'
          : 'No records loaded. Run the pipeline to build the archive.'));
      if (anyFilter()) {
        const b = el('button', 'link-btn', 'Clear all filters');
        b.type = 'button';
        b.addEventListener('click', clearAll);
        empty.appendChild(b);
      }
      host.appendChild(empty);
      $('list-more').hidden = true;
      return;
    }

    records.slice(0, listLimit).forEach((r) => {
      const item = el('article', 'item');
      item.style.setProperty('--c', typeColour(r.type));
      item.dataset.url = r.url;
      if (r.url === activeUrl) item.classList.add('active');

      const h = el('h3');
      const a = el('a', null, r.headline || '(untitled)');
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener';
      h.appendChild(a);
      item.appendChild(h);

      const meta = el('div', 'item-meta');
      const t = store.typeById[r.type];
      meta.appendChild(el('span', 'type-name', t ? t.name : 'Unclassified'));
      meta.appendChild(el('span', null, [r.place_name, r.state].filter(Boolean).join(', ')));
      meta.appendChild(el('span', null, r.source));
      meta.appendChild(el('span', 'num', formatDate(r.published)));
      (r.tags || []).forEach((tag) => {
        const def = store.tags.find((x) => x.id === tag);
        meta.appendChild(el('span', 'tagpill' + (tag === 'water' ? '' : ' policy'),
          def ? def.name : tag));
      });
      if (r.margin != null && r.margin <= 1 && r.type) {
        meta.appendChild(el('span', 'thin-flag', 'thin margin'));
      }
      item.appendChild(meta);

      item.addEventListener('mouseenter', () => setActive(r.url, false));
      host.appendChild(item);
    });

    const more = $('list-more');
    more.hidden = records.length <= listLimit;
    more.textContent = `Show ${Math.min(40, records.length - listLimit)} more of ` +
      `${(records.length - listLimit).toLocaleString('en-IN')} remaining`;
  }

  /* --------------------------------------------------------------- the map */

  const view = { x: 0, y: 0, k: 1 };
  let mapSvg = null, mapLayer = null, pinLayer = null, mapGeo = null;

  function project(lon, lat) {
    const b = mapGeo.bounds;
    const merc = (d) => Math.log(Math.tan(Math.PI / 4 + (d * Math.PI / 180) / 2));
    const x0 = b.west * Math.PI / 180, x1 = b.east * Math.PI / 180;
    const y0 = merc(b.south), y1 = merc(b.north);
    const scale = mapGeo.width / (x1 - x0);
    return [
      ((lon * Math.PI / 180) - x0) * scale,
      (y1 - merc(lat)) * scale
    ];
  }

  function buildMap() {
    const stage = $('map-stage');
    if (!stage) return;
    mapGeo = window.INDIA_MAP;
    if (!mapGeo) {
      stage.appendChild(el('p', 'map-note',
        'india.js is missing — run python build_map.py to generate the outline.'));
      return;
    }

    const ns = 'http://www.w3.org/2000/svg';
    mapSvg = document.createElementNS(ns, 'svg');
    mapSvg.setAttribute('viewBox', `0 0 ${mapGeo.width} ${mapGeo.height}`);
    mapSvg.setAttribute('role', 'img');
    mapSvg.setAttribute('aria-label',
      'Map of India with one mark per reported conflict, coloured by conflict type');

    mapLayer = document.createElementNS(ns, 'g');
    const outline = document.createElementNS(ns, 'path');
    outline.setAttribute('d', mapGeo.path);
    outline.setAttribute('class', 'india-fill');
    outline.setAttribute('fill-rule', 'evenodd');
    mapLayer.appendChild(outline);

    pinLayer = document.createElementNS(ns, 'g');
    mapLayer.appendChild(pinLayer);
    mapSvg.appendChild(mapLayer);
    stage.appendChild(mapSvg);

    /* Pan and zoom without a library: one transform on the layer. */
    let dragging = false, lastX = 0, lastY = 0;
    const apply = () => mapLayer.setAttribute('transform',
      `translate(${view.x} ${view.y}) scale(${view.k})`);

    mapSvg.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      mapSvg.classList.add('dragging');
      mapSvg.setPointerCapture(e.pointerId);
    });
    mapSvg.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = mapSvg.getBoundingClientRect();
      const s = mapGeo.width / rect.width;
      view.x += (e.clientX - lastX) * s;
      view.y += (e.clientY - lastY) * s;
      lastX = e.clientX; lastY = e.clientY;
      apply();
    });
    const stop = (e) => {
      dragging = false;
      mapSvg.classList.remove('dragging');
      if (e.pointerId != null && mapSvg.hasPointerCapture(e.pointerId)) {
        mapSvg.releasePointerCapture(e.pointerId);
      }
    };
    mapSvg.addEventListener('pointerup', stop);
    mapSvg.addEventListener('pointercancel', stop);

    mapSvg.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e);
    }, { passive: false });

    function zoomAt(factor, e) {
      const rect = mapSvg.getBoundingClientRect();
      const s = mapGeo.width / rect.width;
      const cx = e ? (e.clientX - rect.left) * s : mapGeo.width / 2;
      const cy = e ? (e.clientY - rect.top) * s : mapGeo.height / 2;
      const k = Math.min(14, Math.max(1, view.k * factor));
      const ratio = k / view.k;
      view.x = cx - (cx - view.x) * ratio;
      view.y = cy - (cy - view.y) * ratio;
      view.k = k;
      if (view.k === 1) { view.x = 0; view.y = 0; }
      apply();
    }

    $('zoom-in').addEventListener('click', () => zoomAt(1.5));
    $('zoom-out').addEventListener('click', () => zoomAt(1 / 1.5));
    $('zoom-reset').addEventListener('click', () => {
      view.x = 0; view.y = 0; view.k = 1; apply();
    });
  }

  function renderPins(records) {
    if (!pinLayer) return;
    const ns = 'http://www.w3.org/2000/svg';
    pinLayer.textContent = '';

    records.forEach((r) => {
      if (typeof r.lat !== 'number' || typeof r.lon !== 'number') return;
      const [x, y] = project(r.lon, r.lat);
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'pin' + (isApproximate(r) ? ' approx' : '') +
        (r.url === activeUrl ? ' active' : ''));
      g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      g.dataset.url = r.url;

      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('r', '5.5');
      c.setAttribute('fill', typeColour(r.type));
      c.setAttribute('fill-opacity', '.8');
      g.appendChild(c);

      const title = document.createElementNS(ns, 'title');
      title.textContent = `${r.headline}\n${[r.place_name, r.state].filter(Boolean).join(', ')} · ` +
        `${store.typeById[r.type] ? store.typeById[r.type].name : 'Unclassified'} · ${r.source}`;
      g.appendChild(title);

      g.addEventListener('click', () => setActive(r.url, true));
      g.addEventListener('mouseenter', () => setActive(r.url, false));
      pinLayer.appendChild(g);
    });

    /* Marks are drawn at a constant screen size, so zooming in separates a
       cluster instead of inflating it. */
    const counter = $('map-count');
    if (counter) counter.textContent = `${records.length.toLocaleString('en-IN')} plotted`;
  }

  function setActive(url, scroll) {
    activeUrl = url;
    document.querySelectorAll('.item').forEach((n) =>
      n.classList.toggle('active', n.dataset.url === url));
    if (pinLayer) {
      pinLayer.querySelectorAll('.pin').forEach((n) =>
        n.classList.toggle('active', n.dataset.url === url));
    }
    if (scroll) {
      const target = document.querySelector(`.item[data-url="${CSS.escape(url)}"]`);
      if (target) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ------------------------------------------------------------ the whole */

  function render() {
    const shown = visible();
    renderTypology();
    renderWater();
    renderStates();
    renderSources();
    renderChips();
    renderList(shown);
    renderPins(shown);

    const live = $('count-live');
    if (live) {
      live.textContent = anyFilter()
        ? `${shown.length.toLocaleString('en-IN')} of ${store.records.length.toLocaleString('en-IN')} records`
        : `${store.records.length.toLocaleString('en-IN')} records`;
    }
  }

  /* --------------------------------------------------------------- wiring */

  function wire() {
    const search = $('search');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          filters.query = norm(search.value);
          listLimit = 40;
          render();
        }, 140);
      });
    }

    const more = $('list-more');
    if (more) more.addEventListener('click', () => { listLimit += 40; render(); });

    const stateMore = $('state-more');
    if (stateMore) stateMore.addEventListener('click', () => {
      statesExpanded = !statesExpanded;
      renderStates();
    });

    document.querySelectorAll('[data-filter-tag]').forEach((b) =>
      b.addEventListener('click', () => toggle('tags', b.dataset.filterTag)));

    const themeBtn = $('theme-toggle');
    if (themeBtn) {
      const label = () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeBtn.querySelector('span').textContent = dark ? 'Light' : 'Dark';
        themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      };
      themeBtn.addEventListener('click', () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
        try { localStorage.setItem('cs-theme', dark ? 'light' : 'dark'); } catch (e) {}
        label();
      });
      label();
    }
  }

  /* ----------------------------------------------------------------- boot */

  function adopt(taxonomy, records, generated) {
    store.types = (taxonomy && taxonomy.types) || FALLBACK_TAXONOMY.types;
    store.tags = (taxonomy && taxonomy.tags) || FALLBACK_TAXONOMY.tags;
    store.typeById = {};
    store.types.forEach((t) => (store.typeById[t.id] = t));
    store.records = records || [];
    store.generated = generated || '';
    store.states = [...new Set(store.records.map((r) => r.state).filter(Boolean))];
    store.sources = (taxonomy && taxonomy.sources && taxonomy.sources.length)
      ? taxonomy.sources
      : [...new Set(store.records.map((r) => r.source).filter(Boolean))];

    renderFigures();
    buildMap();
    wire();
    render();
  }

  function boot() {
    if (window.CONFLICTSCAPE) {
      const d = window.CONFLICTSCAPE;
      adopt(d.taxonomy, d.records, d.generated);
      return;
    }
    if (window.DECIPHER_DATA) {         /* pre-typology build */
      adopt(null, window.DECIPHER_DATA, '');
      return;
    }
    Promise.all([
      fetch('taxonomy.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('data/stories.json').then((r) => (r.ok ? r.json() : [])).catch(() => [])
    ]).then(([tax, recs]) => adopt(tax, recs, ''));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

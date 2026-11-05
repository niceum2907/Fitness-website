// ===== GymPlan – App-Logik =====
(() => {
  const STORE_KEY = 'gymplan.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const newWorkout = () => ({ id: uid(), name: 'Mein Workout', items: [] });

  // ---------- Zustand (im Browser gespeichert) ----------
  let state = loadState();
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.current) return s;
    } catch (e) { /* ignorieren */ }
    return { custom: [], workouts: [], current: newWorkout() };
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* z. B. privater Modus */ }
  }

  const allExercises = () => [...EXERCISES, ...state.custom];
  const lookup = id => allExercises().find(e => e.id === id) || { id, name: 'Unbekannte Übung', primary: [], secondary: [], pattern: 'curl' };

  // ---------- Toast & Modal ----------
  const toast = msg => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  };
  const modal = $('#modal');
  function openModal(html, cls = '') {
    $('#modal-body').innerHTML = html + '<button class="modal-x" data-close aria-label="Schließen">×</button>';
    modal.className = cls;
    if (!modal.open) modal.showModal();
  }
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) modal.close();
  });

  // ---------- Filter ----------
  function initFilters() {
    $('#f-muscle').innerHTML = '<option value="">Alle Muskeln</option>' +
      Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    const equips = [...new Set(allExercises().map(e => e.equipment).filter(Boolean))].sort();
    const cur = $('#f-equip').value;
    $('#f-equip').innerHTML = '<option value="">Alle Geräte</option>' + equips.map(e => `<option>${esc(e)}</option>`).join('');
    $('#f-equip').value = equips.includes(cur) ? cur : '';
  }

  // ---------- Bibliothek ----------
  function renderLibrary() {
    const q = $('#search').value.trim().toLowerCase();
    const m = $('#f-muscle').value;
    const eq = $('#f-equip').value;
    const list = allExercises().filter(e =>
      (!q || e.name.toLowerCase().includes(q)) &&
      (!m || e.primary.includes(m) || e.secondary.includes(m)) &&
      (!eq || e.equipment === eq));

    const grid = $('#lib-grid');
    grid.innerHTML = '';
    $('#lib-count').textContent = `${list.length} Übungen`;
    if (!list.length) { grid.innerHTML = '<p class="empty">Keine Übung gefunden.</p>'; return; }

    for (const ex of list) {
      const card = document.createElement('article');
      card.className = 'card clickable';
      card.dataset.info = ex.id;
      card.tabIndex = 0;
      card.setAttribute('aria-label', `${ex.name} – Anleitung anzeigen`);
      const figWrap = createFigure(ex);
      const hint = document.createElement('span');
      hint.className = 'fig-hint';
      hint.textContent = 'Anleitung ansehen';
      figWrap.appendChild(hint);
      card.appendChild(figWrap);
      const body = document.createElement('div');
      body.className = 'card-body';
      body.innerHTML = `
        <div class="card-title">${esc(ex.name)} ${ex.custom ? '<span class="tag own">eigene</span>' : ''}</div>
        <div class="muted small">${esc(ex.equipment || '')}</div>
        <div class="chips">
          ${ex.primary.map(x => `<span class="chip p">${MUSCLES[x]}</span>`).join('')}
          ${ex.secondary.map(x => `<span class="chip s">${MUSCLES[x]}</span>`).join('')}
        </div>
        <div class="card-actions">
          <button class="btn sm" data-add="${esc(ex.id)}">+ Zum Workout</button>
          <button class="btn sm ghost" data-info="${esc(ex.id)}">Anleitung</button>
          ${ex.custom ? `<button class="btn sm ghost" data-edit="${esc(ex.id)}">Bearbeiten</button>
                         <button class="btn sm ghost danger" data-delex="${esc(ex.id)}" aria-label="Löschen">✕</button>` : ''}
        </div>`;
      card.appendChild(body);
      grid.appendChild(card);
    }
  }

  $('#lib-grid').addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-delex]');
    if (add) addToWorkout(add.dataset.add);
    // Klick auf die Karte (aber nicht auf einen Button) → Anleitung öffnen
    if (!add && !edit && !del) {
      const info = e.target.closest('[data-info]');
      if (info) openExerciseDetail(lookup(info.dataset.info));
    }
    if (edit) openExerciseForm(lookup(edit.dataset.edit));
    if (del) {
      const ex = lookup(del.dataset.delex);
      if (!confirm(`„${ex.name}“ wirklich löschen?`)) return;
      state.custom = state.custom.filter(x => x.id !== ex.id);
      state.current.items = state.current.items.filter(i => i.exId !== ex.id);
      persist(); initFilters(); renderLibrary(); renderBuilder();
    }
  });
  $('#lib-grid').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card[data-info]')) {
      e.preventDefault();
      openExerciseDetail(lookup(e.target.dataset.info));
    }
  });

  function addToWorkout(id) {
    const ex = lookup(id);
    state.current.items.push({
      uid: uid(), exId: ex.id, sets: 3,
      reps: ex.unit === 'sec' ? 45 : 10, unit: ex.unit || 'reps', weight: '', rest: 90,
    });
    persist(); renderBuilder();
    toast(`${ex.name} hinzugefügt`);
  }

  // ---------- Übungs-Anleitung (Detailansicht) ----------
  function openExerciseDetail(ex) {
    const ins = INSTRUCTIONS[ex.id] || (ex.steps && ex.steps.length ? { steps: ex.steps } : null);
    const list = (arr, cls) => arr && arr.length ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    openModal(`
      <h2 class="detail-title">${esc(ex.name)}</h2>
      <div class="detail">
        <div class="detail-media">
          <div id="detail-fig"></div>
          <div class="detail-phase" id="detail-phase" aria-live="polite"></div>
          <div class="detail-controls">
            <button class="btn sm" id="fig-play">Pause</button>
            <div class="seg" role="group" aria-label="Tempo">
              <button class="seg-btn" data-speed="0.5">Langsam</button>
              <button class="seg-btn active" data-speed="1">Normal</button>
            </div>
          </div>
          <div class="detail-meta">
            ${ins && ins.level ? `<span class="tag lvl">${esc(ins.level)}</span>` : ''}
            <span class="tag">${esc(ex.equipment || '')}</span>
          </div>
          <div class="chips">
            ${ex.primary.map(x => `<span class="chip p">${MUSCLES[x]}</span>`).join('')}
            ${ex.secondary.map(x => `<span class="chip s">${MUSCLES[x]}</span>`).join('')}
          </div>
        </div>
        <div class="detail-text">
          ${ins ? `
            <h4 class="first">So geht's</h4>
            <ol class="howto">${ins.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
            ${ins.breath ? `<div class="breath"><b>Atmung:</b> ${esc(ins.breath)}</div>` : ''}
            ${ins.tips ? `<h4>Tipps</h4>${list(ins.tips, 'tips')}` : ''}
            ${ins.mistakes ? `<h4>Häufige Fehler</h4>${list(ins.mistakes, 'mistakes')}` : ''}`
          : `<p class="muted">Für diese Übung gibt es noch keine Anleitung.</p>
             ${ex.custom ? `<button class="btn sm ghost" data-editdetail="${esc(ex.id)}">Anleitung hinzufügen</button>` : ''}`}
          <p class="muted small">Tipp: Starte mit leichtem Gewicht und achte auf saubere Technik. Bei Schmerzen abbrechen.</p>
          <div class="modal-actions left">
            <button class="btn" data-detailadd="${esc(ex.id)}">+ Zum Workout hinzufügen</button>
          </div>
        </div>
      </div>`, 'wide');

    // Große Animation mit Steuerung
    const fig = createFigure(ex, false, { mode: 'always', large: true });
    $('#detail-fig').appendChild(fig);
    const api = fig.figure;
    const phase = $('#detail-phase');
    if (api.cues) {
      api.onPhase = i => { phase.textContent = `${i + 1}/4 · ${api.cues[i]}`; };
      api.onPhase(0);
    } else phase.hidden = true;
    api.setSpeed(1);
    $('#fig-play').addEventListener('click', e => { e.target.textContent = api.toggle() ? 'Pause' : 'Abspielen'; });
    $('.seg').addEventListener('click', e => {
      const b = e.target.closest('[data-speed]');
      if (!b) return;
      api.setSpeed(Number(b.dataset.speed));
      document.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
    });
  }

  modal.addEventListener('click', e => {
    const a = e.target.closest('[data-detailadd]');
    if (a) { addToWorkout(a.dataset.detailadd); modal.close(); }
    const ed = e.target.closest('[data-editdetail]');
    if (ed) openExerciseForm(lookup(ed.dataset.editdetail));
  });

  ['#search', '#f-muscle', '#f-equip'].forEach(s => $(s).addEventListener('input', renderLibrary));

  // ---------- Eigene Übung anlegen / bearbeiten ----------
  function openExerciseForm(ex) {
    const isEdit = !!ex;
    ex = ex || { name: '', equipment: '', primary: [], secondary: [], pattern: 'curl', gif: '', unit: 'reps', garmin: 65534 };
    const checks = (name, sel) => Object.entries(MUSCLES).map(([k, v]) =>
      `<label class="check"><input type="checkbox" name="${name}" value="${k}" ${sel.includes(k) ? 'checked' : ''}> ${v}</label>`).join('');
    openModal(`
      <h2>${isEdit ? 'Übung bearbeiten' : 'Eigene Übung'}</h2>
      <form id="ex-form" class="form">
        <label>Name<input name="name" required maxlength="60" value="${esc(ex.name)}"></label>
        <div class="row2">
          <label>Gerät<input name="equipment" maxlength="30" placeholder="z. B. Kabelzug" value="${esc(ex.equipment)}"></label>
          <label>Einheit<select name="unit">
            <option value="reps" ${ex.unit !== 'sec' ? 'selected' : ''}>Wiederholungen</option>
            <option value="sec" ${ex.unit === 'sec' ? 'selected' : ''}>Sekunden</option></select></label>
        </div>
        <fieldset><legend>Hauptmuskeln</legend><div class="checks">${checks('primary', ex.primary)}</div></fieldset>
        <fieldset><legend>Nebenmuskeln</legend><div class="checks">${checks('secondary', ex.secondary)}</div></fieldset>
        <div class="row2">
          <label>Animation<select name="pattern">
            ${Object.entries(FIGURES).map(([k, f]) => `<option value="${k}" ${ex.pattern === k ? 'selected' : ''}>${f.label}</option>`).join('')}
          </select></label>
          <label>Garmin-Kategorie<select name="garmin">
            ${Object.entries(GARMIN_CATEGORIES).map(([k, v]) => `<option value="${k}" ${String(ex.garmin) === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></label>
        </div>
        <label>Anleitung (optional, ein Schritt pro Zeile)<textarea name="steps" rows="4" maxlength="1500" placeholder="1. Ausgangsposition …&#10;2. Bewegung …">${esc((ex.steps || []).join('\n'))}</textarea></label>
        <label>Eigenes GIF (URL, optional)<input name="gif" type="url" placeholder="https://…/uebung.gif" value="${esc(ex.gif)}"></label>
        <div id="ex-preview" class="preview"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>Abbrechen</button>
          <button type="submit" class="btn">${isEdit ? 'Speichern' : 'Übung anlegen'}</button>
        </div>
      </form>`);

    const form = $('#ex-form');
    const preview = () => {
      const p = $('#ex-preview');
      p.innerHTML = '';
      p.appendChild(createFigure({ name: form.name.value, pattern: form.pattern.value, gif: form.gif.value.trim() }, false, { mode: 'always' }));
    };
    preview();
    form.pattern.addEventListener('change', preview);
    form.gif.addEventListener('change', preview);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const primary = fd.getAll('primary');
      if (!primary.length) { toast('Bitte mindestens einen Hauptmuskel wählen'); return; }
      const data = {
        id: isEdit ? ex.id : 'c_' + uid(), custom: true,
        name: fd.get('name').trim(), equipment: fd.get('equipment').trim() || 'Sonstiges',
        unit: fd.get('unit'), pattern: fd.get('pattern'), gif: fd.get('gif').trim(),
        garmin: Number(fd.get('garmin')),
        steps: String(fd.get('steps') || '').split('\n').map(x => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean),
        primary, secondary: fd.getAll('secondary').filter(m => !primary.includes(m)),
      };
      if (isEdit) state.custom = state.custom.map(x => x.id === ex.id ? data : x);
      else state.custom.push(data);
      persist(); modal.close(); initFilters(); renderLibrary(); renderBuilder();
      toast(isEdit ? 'Übung gespeichert' : 'Übung angelegt');
    });
  }
  $('#btn-new-ex').addEventListener('click', () => openExerciseForm(null));

  // ---------- Workout-Builder ----------
  function muscleLoad(workout) {
    const load = Object.fromEntries(Object.keys(MUSCLES).map(k => [k, 0]));
    for (const it of workout.items) {
      const ex = lookup(it.exId);
      ex.primary.forEach(m => load[m] += it.sets);
      ex.secondary.forEach(m => load[m] += it.sets * 0.5);
    }
    return load;
  }

  function renderSaved() {
    const sel = $('#wk-saved');
    sel.innerHTML = '<option value="">Gespeicherte Workouts …</option>' +
      state.workouts.map(w => `<option value="${w.id}" ${w.id === state.current.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
  }

  function renderBuilder() {
    const wk = state.current;
    $('#wk-name').value = wk.name;
    renderSaved();

    // Liste
    const list = $('#wk-list');
    list.innerHTML = '';
    if (!wk.items.length) {
      list.innerHTML = '<div class="empty">Noch leer – füge links Übungen mit <b>+ Zum Workout</b> hinzu.</div>';
    }
    wk.items.forEach((it, i) => {
      const ex = lookup(it.exId);
      const row = document.createElement('div');
      row.className = 'wk-item';
      row.dataset.uid = it.uid;
      row.appendChild(createFigure(ex, true));
      const main = document.createElement('div');
      main.className = 'wk-main';
      main.innerHTML = `
        <div class="wk-title"><span class="num">${i + 1}</span> <button class="link" data-info="${esc(ex.id)}" title="Anleitung anzeigen">${esc(ex.name)}</button></div>
        <div class="wk-fields">
          <label>Sätze<input type="number" min="1" max="20" data-f="sets" value="${it.sets}"></label>
          <label>${it.unit === 'sec' ? 'Sekunden' : 'Wdh.'}<input type="number" min="1" max="999" data-f="reps" value="${it.reps}"></label>
          <label>kg<input type="number" min="0" step="0.5" data-f="weight" value="${it.weight}" placeholder="–"></label>
          <label>Pause s<input type="number" min="0" step="15" max="600" data-f="rest" value="${it.rest}"></label>
        </div>`;
      row.appendChild(main);
      const act = document.createElement('div');
      act.className = 'wk-act';
      act.innerHTML = `
        <button class="icon" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button>
        <button class="icon" data-act="down" ${i === wk.items.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button>
        <button class="icon danger" data-act="del" aria-label="Entfernen">✕</button>`;
      row.appendChild(act);
      list.appendChild(row);
    });

    // Statistik
    const totalSets = wk.items.reduce((a, b) => a + Number(b.sets || 0), 0);
    const volume = wk.items.reduce((a, b) => a + (b.unit === 'reps' && b.weight ? b.sets * b.reps * b.weight : 0), 0);
    $('#wk-stats').innerHTML = `
      <div><b>${wk.items.length}</b><span>Übungen</span></div>
      <div><b>${totalSets}</b><span>Sätze</span></div>
      <div><b>~${wk.items.length ? estimateMinutes(wk) : 0}</b><span>Minuten</span></div>
      <div><b>${Math.round(volume).toLocaleString('de-DE')}</b><span>kg Volumen</span></div>`;

    // Muskeln
    const load = muscleLoad(wk);
    const max = Math.max(1, ...Object.values(load));
    document.querySelectorAll('#body-map [data-m]').forEach(el => {
      const v = load[el.dataset.m] || 0;
      el.style.fill = v > 0 ? `rgba(255, 94, 58, ${0.25 + 0.75 * (v / max)})` : '';
      el.classList.toggle('on', v > 0);
      el.innerHTML = `<title>${MUSCLES[el.dataset.m]}: ${v} Sätze</title>`;
    });
    const sorted = Object.entries(load).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    $('#muscle-bars').innerHTML = sorted.length
      ? sorted.map(([k, v]) => `
          <div class="bar-row">
            <span class="bar-label">${MUSCLES[k]}</span>
            <span class="bar"><span style="width:${(v / max) * 100}%"></span></span>
            <span class="bar-val">${v % 1 ? v.toFixed(1) : v}</span>
          </div>`).join('') + '<p class="muted small">Effektive Sätze (Hauptmuskel = 1, Nebenmuskel = 0,5)</p>'
      : '<p class="muted">Füge Übungen hinzu, um zu sehen, welche Muskeln trainiert werden.</p>';
  }

  $('#wk-list').addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (!f) return;
    const it = state.current.items.find(x => x.uid === e.target.closest('.wk-item').dataset.uid);
    const v = e.target.value === '' ? '' : Number(e.target.value);
    it[f] = f === 'weight' ? v : Math.max(f === 'rest' ? 0 : 1, Number(v) || 0);
    persist();
    clearTimeout(renderBuilder._t);
    renderBuilder._t = setTimeout(() => { // Statistik & Muskeln aktualisieren, ohne Fokus zu verlieren
      const keep = document.activeElement;
      const id = keep?.closest?.('.wk-item')?.dataset.uid, field = keep?.dataset?.f;
      renderBuilder();
      if (id && field) $(`.wk-item[data-uid="${id}"] [data-f="${field}"]`)?.focus();
    }, 500);
  });

  $('#wk-list').addEventListener('click', e => {
    const info = e.target.closest('[data-info]');
    if (info) { openExerciseDetail(lookup(info.dataset.info)); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const items = state.current.items;
    const i = items.findIndex(x => x.uid === b.closest('.wk-item').dataset.uid);
    if (b.dataset.act === 'up' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    if (b.dataset.act === 'down' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
    if (b.dataset.act === 'del') items.splice(i, 1);
    persist(); renderBuilder();
  });

  $('#wk-name').addEventListener('input', e => { state.current.name = e.target.value || 'Workout'; persist(); });

  $('#wk-save').addEventListener('click', () => {
    const copy = JSON.parse(JSON.stringify(state.current));
    const idx = state.workouts.findIndex(w => w.id === copy.id);
    if (idx >= 0) state.workouts[idx] = copy; else state.workouts.push(copy);
    persist(); renderSaved(); toast('Workout gespeichert');
  });
  $('#wk-new').addEventListener('click', () => { state.current = newWorkout(); persist(); renderBuilder(); });
  $('#wk-saved').addEventListener('change', e => {
    const w = state.workouts.find(x => x.id === e.target.value);
    if (w) { state.current = JSON.parse(JSON.stringify(w)); persist(); renderBuilder(); }
  });
  $('#wk-del').addEventListener('click', () => {
    if (!confirm(`Workout „${state.current.name}“ löschen?`)) return;
    state.workouts = state.workouts.filter(w => w.id !== state.current.id);
    state.current = state.workouts[0] ? JSON.parse(JSON.stringify(state.workouts[0])) : newWorkout();
    persist(); renderBuilder();
  });

  // ---------- Export ----------
  function requireItems() {
    if (state.current.items.length) return true;
    toast('Füge zuerst Übungen zum Workout hinzu');
    return false;
  }
  function defaultStart() {
    const d = new Date();
    d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  const icsBlock = () => `
    <label class="inline">Termin<input type="datetime-local" id="ics-date" value="${defaultStart()}"></label>
    <button class="btn" data-do="ics">Kalendertermin (.ics) laden</button>`;

  async function shareOrCopy() {
    const text = workoutToText(state.current, lookup);
    if (navigator.share) {
      try { await navigator.share({ title: state.current.name, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('Workout als Text kopiert'); }
    catch { openModal(`<h2>Text kopieren</h2><textarea class="copy-area" readonly>${esc(text)}</textarea>`); }
  }

  function printWorkout() {
    const wk = state.current;
    $('#print-area').innerHTML = `
      <h1>${esc(wk.name)}</h1><p>ca. ${estimateMinutes(wk)} min · ${wk.items.length} Übungen</p>
      <table><thead><tr><th>#</th><th>Übung</th><th>Sätze</th><th>Wdh./Sek.</th><th>kg</th><th>Pause</th><th>Muskeln</th><th>Notiz</th></tr></thead>
      <tbody>${wk.items.map((it, i) => { const ex = lookup(it.exId); return `<tr><td>${i + 1}</td><td>${esc(ex.name)}</td><td>${it.sets}</td>
        <td>${it.reps}${it.unit === 'sec' ? ' s' : ''}</td><td>${it.weight || ''}</td><td>${it.rest} s</td>
        <td>${ex.primary.map(m => MUSCLES[m]).join(', ')}</td><td></td></tr>`; }).join('')}</tbody></table>`;
    window.print();
  }

  /** Startet den Download und zeigt einen Dialog mit Ersatz-Link, falls der Browser ihn blockiert. */
  function downloadWithFallback(filename, makeBlob, label) {
    let blob;
    try { blob = makeBlob(); } catch (err) {
      console.error(err);
      toast(`${label} konnte nicht erstellt werden`);
      return;
    }
    const url = downloadFile(filename, blob);
    toast(`${label} wird heruntergeladen …`);
    if (!url) return;
    openModal(`
      <h2>${label} bereit</h2>
      <p>Der Download sollte automatisch gestartet sein (Ordner <b>Downloads</b>).</p>
      <p>Falls nicht, klicke hier:</p>
      <div class="modal-actions left"><a class="btn" href="${url}" download="${esc(filename)}">${esc(filename)} herunterladen</a></div>
      <p class="muted small">Tipp: In der VS-Code-Vorschau (Simple Browser / Live Preview) sind Downloads blockiert.
      Öffne die Seite in Chrome, Safari oder Firefox – z. B. mit Live Server oder per Doppelklick auf <code>index.html</code>.</p>`);
  }

  const EXPORTS = {
    apple: () => openModal(`
      <h2>Apple Watch / iPhone</h2>
      <p>Apples Trainings-App erlaubt leider <b>keinen Datei-Import</b> von Krafttrainings – eigene Workouts kann nur eine native iOS-App (WorkoutKit) übertragen.
      Diese Wege funktionieren aber sofort:</p>
      <ol class="steps">
        <li><b>Kalender:</b> Termin laden und in Apple Kalender öffnen → das Workout samt Übungsliste erscheint auf der Watch inkl. Erinnerung.</li>
        <li><b>Teilen:</b> Workout als Text in Notizen oder Erinnerungen speichern (auf der Watch abhakbar).</li>
        <li>Auf der Watch dann <i>Training → Krafttraining</i> starten.</li>
      </ol>
      <div class="modal-actions left">${icsBlock()}<button class="btn ghost" data-do="share">Teilen / Kopieren</button></div>`),
    garmin: () => openModal(`
      <h2>Garmin (.FIT)</h2>
      <p>Erzeugt eine echte Garmin-Workoutdatei (Krafttraining) mit Sätzen, Wiederholungen bzw. Zeit und Pausen.</p>
      <ol class="steps">
        <li>Datei herunterladen.</li>
        <li>Uhr per USB mit dem Computer verbinden (Mac: ggf. App „OpenMTP“ / Garmin Express).</li>
        <li>Datei in den Ordner <code>GARMIN/NewFiles</code> kopieren und Uhr trennen.</li>
        <li>Auf der Uhr: <i>Krafttraining → Trainings</i> → Workout auswählen.</li>
      </ol>
      <p class="muted small">Die .FIT-Datei funktioniert auch mit anderen Geräten/Apps, die FIT-Workouts unterstützen.</p>
      <div class="modal-actions left"><button class="btn" data-do="fit">.FIT herunterladen</button></div>`),
    ics: () => openModal(`
      <h2>Kalender (.ics)</h2>
      <p>Funktioniert mit Apple Kalender, Google Kalender, Outlook, Samsung u. a. Die komplette Übungsliste steht in der Terminbeschreibung.</p>
      <div class="modal-actions left">${icsBlock()}</div>`),
    // Excel (.xlsx) – Taste data-exp="csv" bleibt kompatibel mit älteren index.html
    csv: () => downloadWithFallback(`${safeFileName(state.current.name)}.xlsx`, () => buildXLSX(state.current, lookup), 'Excel-Datei'),
    xlsx: () => EXPORTS.csv(),
    csvfile: () => downloadWithFallback(`${safeFileName(state.current.name)}.csv`, () => new Blob([buildCSV(state.current, lookup)], { type: 'text/csv;charset=utf-8' }), 'CSV-Datei'),
    json: () => {
      const used = new Set(state.current.items.map(i => i.exId));
      const payload = { app: 'GymPlan', version: 1, workout: state.current, customExercises: state.custom.filter(c => used.has(c.id)) };
      downloadFile(`${safeFileName(state.current.name)}.json`, JSON.stringify(payload, null, 2), 'application/json');
      toast('JSON heruntergeladen');
    },
    print: printWorkout,
    copy: shareOrCopy,
  };

  document.querySelector('.export-btns').addEventListener('click', e => {
    const b = e.target.closest('[data-exp]');
    if (b && requireItems()) EXPORTS[b.dataset.exp]();
  });

  // Aktionen in den Export-Dialogen
  modal.addEventListener('click', e => {
    const b = e.target.closest('[data-do]');
    if (!b) return;
    const wk = state.current, name = safeFileName(wk.name);
    if (b.dataset.do === 'ics') {
      const v = $('#ics-date').value;
      const start = v ? new Date(v) : new Date();
      downloadFile(`${name}.ics`, buildICS(wk, lookup, start), 'text/calendar;charset=utf-8');
      toast('Kalendertermin heruntergeladen');
    }
    if (b.dataset.do === 'fit') {
      downloadFile(`${name}.fit`, new Blob([FIT.build(wk, lookup)], { type: 'application/octet-stream' }));
      toast('.FIT-Datei heruntergeladen');
    }
    if (b.dataset.do === 'share') shareOrCopy();
  });

  // JSON-Import
  $('#imp').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.workout || !Array.isArray(data.workout.items)) throw new Error('Format');
      for (const c of data.customExercises || []) {
        if (!state.custom.some(x => x.id === c.id) && !EXERCISES.some(x => x.id === c.id)) state.custom.push({ ...c, custom: true });
      }
      state.current = { ...data.workout, id: uid(), items: data.workout.items.map(i => ({ ...i, uid: uid() })) };
      persist(); initFilters(); renderLibrary(); renderBuilder();
      toast(`„${state.current.name}“ importiert`);
    } catch {
      toast('Ungültige Datei – bitte eine GymPlan-JSON wählen');
    }
  });

  // ---------- Start ----------
  $('#body-map').innerHTML = BODY_FRONT + BODY_BACK;
  initFilters();
  renderLibrary();
  renderBuilder();
})();

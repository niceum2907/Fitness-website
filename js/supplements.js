// ===== GymPlan – Supplement-Tracker & Empfehlungen =====
(() => {
  const KEY = 'gymplan.supp.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const dayKey = (d = new Date()) => d.toLocaleDateString('sv-SE'); // YYYY-MM-DD (lokal)

  const TIMES = ['Morgens', 'Mittags', 'Abends', 'Vor dem Training', 'Nach dem Training', 'Zum Essen'];
  const EVIDENCE = { A: 'Starke Evidenz', B: 'Mittlere Evidenz', C: 'Schwache Evidenz' };

  // ---------- Katalog (evidenzbasiert, z. B. ISSN/IOC-Konsens) ----------
  const CATALOG = {
    creatine: { name: 'Kreatin-Monohydrat', ev: 'A', time: 'Morgens',
      info: 'Mehr Kraft & Muskelaufbau bei kurzen, intensiven Belastungen. Täglich nehmen, Zeitpunkt egal, keine Ladephase nötig.' },
    protein: { name: 'Proteinpulver', ev: 'A', time: 'Nach dem Training',
      info: 'Nur ein praktisches Lebensmittel – sinnvoll, wenn du dein Proteinziel über normale Mahlzeiten nicht erreichst.' },
    vitd: { name: 'Vitamin D3', ev: 'B', time: 'Zum Essen',
      info: 'Wichtig für Knochen, Muskeln & Immunsystem. Im Winterhalbjahr bildet die Haut kaum Vitamin D. Ideal: Blutwert (25-OH-D) messen lassen.' },
    omega3: { name: 'Omega-3 (EPA/DHA)', ev: 'B', time: 'Zum Essen',
      info: 'Für Herz-Kreislauf; kann Entzündungsprozesse modulieren. Nur relevant, wenn du selten fetten Seefisch isst.' },
    caffeine: { name: 'Koffein (Pre-Workout)', ev: 'A', time: 'Vor dem Training',
      info: 'Steigert Leistung & Fokus. 30–60 min vor dem Training. Nicht am Abend (Schlaf!). Max. 400 mg/Tag inkl. Kaffee.' },
    betaalanine: { name: 'Beta-Alanin', ev: 'B', time: 'Zum Essen',
      info: 'Nur bei Belastungen von ca. 1–4 Minuten (z. B. HIIT, hohe Wiederholungszahlen). Harmloses Kribbeln möglich, Dosis aufteilen.' },
    magnesium: { name: 'Magnesium', ev: 'C', time: 'Abends',
      info: 'Bei Mangel oder sehr hoher Schweißmenge. Erst Ernährung prüfen (Nüsse, Vollkorn, Hülsenfrüchte).' },
    electrolytes: { name: 'Elektrolyte', ev: 'B', time: 'Vor dem Training',
      info: 'Für lange (> 60–90 min) oder sehr schweißtreibende Einheiten – v. a. Natrium.' },
    iron: { name: 'Eisen', ev: 'B', time: 'Morgens',
      info: 'Nur bei nachgewiesenem Mangel (Ferritin)! Zu viel Eisen kann schaden – nie „auf Verdacht“ nehmen.' },
    b12: { name: 'Vitamin B12', ev: 'A', time: 'Morgens',
      info: 'Kommt fast nur in tierischen Lebensmitteln vor. Bei veganer Ernährung unverzichtbar.' },
    calcium: { name: 'Calcium', ev: 'B', time: 'Zum Essen',
      info: 'Für Knochengesundheit. Bevorzugt über Ernährung (Milchprodukte, angereicherte Pflanzendrinks, Mineralwasser).' },
    // Häufig beworben, für die meisten unnötig:
    bcaa: { name: 'BCAA / EAA', ev: 'C', skip: true, info: 'Bei ausreichend Protein über den Tag kein zusätzlicher Nutzen.' },
    testo: { name: 'Testo-Booster', ev: 'C', skip: true, info: 'Kein belegter Effekt bei gesunden Menschen; teils verunreinigt mit verbotenen Substanzen.' },
    fatburner: { name: 'Fatburner', ev: 'C', skip: true, info: 'Meist teures Koffein; Wirkung auf Fettabbau minimal.' },
    glutamine: { name: 'Glutamin', ev: 'C', skip: true, info: 'Kein Vorteil für Muskelaufbau oder Regeneration bei gesunden Sportlern.' },
  };

  // ---------- Zustand ----------
  const defaults = () => ({
    profile: { age: 30, sex: 'm', weight: 75, days: 3, intensity: 'auto', diet: 'mixed', fish: false, pregnant: false },
    items: [], log: {},
  });
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY)) || defaults(); } catch { st = defaults(); }
  st.profile = { ...defaults().profile, ...st.profile };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } };

  // ---------- Trainingsintensität (aus deinen Workouts) ----------
  function avgSetsPerWorkout() {
    try {
      const g = JSON.parse(localStorage.getItem('gymplan.v1'));
      const list = [...(g?.workouts || []), g?.current].filter(w => w && w.items && w.items.length);
      if (!list.length) return 0;
      const sets = list.map(w => w.items.reduce((a, i) => a + Number(i.sets || 0), 0));
      return Math.round(sets.reduce((a, b) => a + b, 0) / sets.length);
    } catch { return 0; }
  }
  function intensity(p) {
    const avg = avgSetsPerWorkout();
    const weekly = avg ? avg * p.days : p.days * 15; // ohne Workouts: ~15 Sätze/Einheit annehmen
    let auto = 'mittel';
    if (p.days <= 2 || weekly < 40) auto = 'leicht';
    if (p.days >= 5 || weekly >= 80) auto = 'hoch';
    return { level: p.intensity === 'auto' ? auto : p.intensity, auto, weekly, avg };
  }

  // ---------- Empfehlungs-Logik ----------
  function recommend(p) {
    const I = intensity(p);
    const lvl = { leicht: 1, mittel: 2, hoch: 3 }[I.level];
    const w = Math.max(30, Number(p.weight) || 70);
    const age = Number(p.age) || 30;
    const female = p.sex === 'f' || p.sex === 'd';
    const pregnant = female && p.pregnant;
    const minor = age < 18;
    const winter = [9, 10, 11, 0, 1, 2, 3].includes(new Date().getMonth()); // Okt–Apr
    const vegan = p.diet === 'vegan', veg = p.diet === 'veg' || vegan;
    const out = [];
    const add = (id, prio, dose, ...why) => out.push({ id, prio, dose, why });

    if (minor) {
      add('vitd', 'need', '800 IE/Tag im Winter – nur nach Rücksprache', 'Unter 18: Supplements nur nach ärztlicher Rücksprache.', 'Fokus auf ausgewogene Ernährung, genug Schlaf und Kalorien.');
      if (vegan) add('b12', 'top', 'Dosis mit Kinder-/Hausarzt abklären', 'Vegane Ernährung → B12 ist zwingend nötig.');
      return { list: out, I, minor, pregnant };
    }

    // Protein
    const pLow = Math.round(w * (age >= 50 ? 1.2 : 1.6)), pHigh = Math.round(w * (lvl === 3 ? 2.2 : 2.0));
    add('protein', lvl >= 2 || age >= 50 ? 'top' : 'opt', `Ziel: ${pLow}–${pHigh} g Protein/Tag gesamt (Pulver: 20–40 g pro Portion)`,
      lvl >= 2 ? `Bei ${I.level}er Trainingsintensität ist der Proteinbedarf erhöht.` : 'Für Muskelerhalt & Sättigung hilfreich.',
      age >= 50 ? 'Ab 50 baut der Körper Muskeln schwerer auf → Protein wichtiger.' : '',
      'Pulver nur, wenn du das Ziel über Mahlzeiten nicht schaffst.');

    // Kreatin
    if (!pregnant) add('creatine', lvl >= 2 || age >= 50 ? 'top' : 'opt', '3–5 g täglich',
      lvl >= 2 ? 'Am besten untersuchtes Supplement für Kraft & Muskelmasse.' : 'Auch bei leichtem Training sinnvoll, Effekt aber kleiner.',
      age >= 50 ? 'Studien zeigen Vorteile für Muskel- und Kraft-Erhalt im Alter.' : '',
      'Bei Nierenerkrankungen vorher ärztlich abklären. Ausreichend trinken.');

    // Vitamin D
    add('vitd', winter || age >= 65 ? 'top' : 'need', age >= 65 ? '800–2000 IE/Tag' : '1000–2000 IE/Tag (Okt–Apr)',
      winter ? 'Aktuell Winterhalbjahr: In Mitteleuropa bildet die Haut kaum Vitamin D.' : 'Im Sommer reicht oft Sonnenlicht – Blutwert prüfen.',
      age >= 65 ? 'Ab 65 sinkt die Vitamin-D-Bildung der Haut deutlich.' : '');

    // Omega-3
    if (!p.fish) add('omega3', veg ? 'top' : 'opt', veg ? '250–500 mg EPA+DHA (Algenöl)' : '250–500 mg EPA+DHA/Tag',
      'Du isst selten fetten Seefisch.', veg ? 'Vegetarisch/vegan → Algenöl statt Fischöl.' : '');

    // B12
    if (vegan) add('b12', 'top', '25–100 µg/Tag oder 1000 µg 2–3×/Woche', 'Vegane Ernährung → B12 zwingend supplementieren.');
    else if (veg || age >= 50) add('b12', 'need', 'Blutwert prüfen (Holo-TC)', veg ? 'Vegetarisch → Versorgung oft knapp.' : 'Ab 50 sinkt die B12-Aufnahme im Magen.');

    // Koffein
    if (!pregnant && lvl >= 2) {
      const mg = Math.min(400, Math.round((w * 3) / 10) * 10);
      add('caffeine', 'opt', `ca. ${mg} mg (3 mg/kg) – oder eine starke Tasse Kaffee`, 'Kann die Leistung bei intensiven Einheiten steigern.', 'Bei Bluthochdruck, Herzproblemen oder Schlafproblemen weglassen.');
    }

    // Beta-Alanin
    if (!pregnant && lvl === 3) add('betaalanine', 'opt', '3,2–6,4 g/Tag, auf 2–4 Portionen verteilt', 'Hohe Intensität: hilft bei Belastungen von 1–4 Minuten (Zirkeltraining, HIIT).');

    // Elektrolyte & Magnesium
    if (lvl === 3) {
      add('electrolytes', 'need', '300–600 mg Natrium pro Stunde Training', 'Hohe Intensität: bei langen/schweißtreibenden Einheiten sinnvoll.');
      add('magnesium', 'need', '200–300 mg/Tag (z. B. Citrat)', 'Nur bei Krämpfen/Mangel – erst Ernährung checken.');
    }

    // Eisen & Calcium
    if (female && age <= 50) add('iron', 'need', 'Nur nach Bluttest – Dosis ärztlich festlegen',
      'Frauen im gebärfähigen Alter haben häufiger Eisenmangel – besonders bei intensivem Training.', veg ? 'Pflanzliche Ernährung erhöht das Risiko zusätzlich.' : '');
    else if (veg) add('iron', 'need', 'Nur nach Bluttest', 'Pflanzliches Eisen wird schlechter aufgenommen.');
    if ((female && age >= 50) || vegan || age >= 65) add('calcium', 'need', 'Gesamtzufuhr ~1000–1200 mg/Tag, max. 500 mg pro Tablette',
      female && age >= 50 ? 'Nach den Wechseljahren steigt das Osteoporose-Risiko.' : vegan ? 'Vegan: auf angereicherte Produkte achten.' : 'Ab 65 für Knochengesundheit wichtig.');

    // Unnötig
    ['bcaa', 'testo', 'fatburner', 'glutamine'].forEach(id => add(id, 'skip', '', CATALOG[id].info));

    return { list: out, I, minor, pregnant };
  }

  // ---------- Rendering: Profil ----------
  function renderProfile() {
    const p = st.profile;
    $('#sp-profile').innerHTML = `
      <label>Alter<input type="number" name="age" min="12" max="100" value="${p.age}"></label>
      <label>Geschlecht<select name="sex">
        <option value="m" ${p.sex === 'm' ? 'selected' : ''}>männlich</option>
        <option value="f" ${p.sex === 'f' ? 'selected' : ''}>weiblich</option>
        <option value="d" ${p.sex === 'd' ? 'selected' : ''}>divers</option></select></label>
      <label>Gewicht (kg)<input type="number" name="weight" min="30" max="250" value="${p.weight}"></label>
      <label>Trainingstage/Woche<select name="days">${[1, 2, 3, 4, 5, 6, 7].map(d => `<option ${+p.days === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      <label>Intensität<select name="intensity">
        ${[['auto', 'Automatisch'], ['leicht', 'Leicht'], ['mittel', 'Mittel'], ['hoch', 'Hoch']].map(([v, l]) => `<option value="${v}" ${p.intensity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Ernährung<select name="diet">
        <option value="mixed" ${p.diet === 'mixed' ? 'selected' : ''}>Mischkost</option>
        <option value="veg" ${p.diet === 'veg' ? 'selected' : ''}>Vegetarisch</option>
        <option value="vegan" ${p.diet === 'vegan' ? 'selected' : ''}>Vegan</option></select></label>
      <label class="check"><input type="checkbox" name="fish" ${p.fish ? 'checked' : ''}> Ich esse ≥ 2×/Woche Fisch</label>
      <label class="check" ${p.sex === 'm' ? 'hidden' : ''}><input type="checkbox" name="pregnant" ${p.pregnant ? 'checked' : ''}> Schwanger / stillend</label>`;
  }
  $('#sp-profile').addEventListener('input', e => {
    const f = e.target;
    if (!f.name) return;
    st.profile[f.name] = f.type === 'checkbox' ? f.checked : (['age', 'weight', 'days'].includes(f.name) ? Number(f.value) : f.value);
    save();
    if (f.name === 'sex') renderProfile();
    renderRecs();
  });

  // ---------- Rendering: Empfehlungen ----------
  function inStack(id) { return st.items.some(i => i.catalogId === id); }

  function renderRecs() {
    const { list, I, minor, pregnant } = recommend(st.profile);
    const lvlClass = { leicht: 'l1', mittel: 'l2', hoch: 'l3' }[I.level];
    $('#sp-intensity').innerHTML = `
      <div class="int-badge ${lvlClass}">Trainingsintensität: <b>${I.level}</b></div>
      <span class="muted small">${I.avg ? `≈ ${I.avg} Sätze pro Workout × ${st.profile.days} Tage = ${I.weekly} Sätze/Woche` : 'Tipp: Speichere Workouts – dann wird die Intensität automatisch berechnet.'}
      ${st.profile.intensity !== 'auto' ? ` · automatisch wäre: ${I.auto}` : ''}</span>`;

    $('#sp-banner').innerHTML = minor
      ? '<div class="banner warn"><b>Unter 18:</b> Wir empfehlen keine Leistungs-Supplements (Kreatin, Koffein, Pre-Workouts). Setz auf gute Ernährung, Schlaf und Technik – und sprich mit deinem Arzt.</div>'
      : pregnant ? '<div class="banner warn"><b>Schwanger/stillend:</b> Leistungs-Supplements werden ausgeblendet. Bitte alle Supplements (inkl. Folsäure, Jod, Eisen) mit Ärztin/Hebamme abstimmen.</div>' : '';

    const groups = [
      ['top', 'Empfohlen für dich'], ['opt', 'Optional'], ['need', 'Nur bei Bedarf / nach Bluttest'], ['skip', 'Kannst du dir sparen'],
    ];
    $('#sp-recs').innerHTML = groups.map(([g, title]) => {
      const items = list.filter(r => r.prio === g);
      if (!items.length) return '';
      if (g === 'skip') {
        return `<details class="rec-group skip"><summary><h3>${title}</h3></summary>
          ${items.map(r => `<div class="rec-skip"><b>${CATALOG[r.id].name}</b> – ${esc(r.why[0])}</div>`).join('')}</details>`;
      }
      return `<div class="rec-group ${g}"><h3>${title}</h3><div class="rec-grid">
        ${items.map(r => {
          const c = CATALOG[r.id];
          const why = r.why.filter(Boolean);
          return `<article class="rec">
            <div class="rec-head"><b>${c.name}</b><span class="ev ev-${c.ev}" title="${EVIDENCE[c.ev]}">${c.ev}</span></div>
            <div class="rec-dose">${esc(r.dose)}</div>
            <ul>${why.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <p class="muted small">${esc(c.info)}</p>
            ${inStack(r.id)
              ? '<button class="btn sm ghost" disabled>Im Stack ✓</button>'
              : `<button class="btn sm" data-addrec="${r.id}" data-dose="${esc(r.dose.split('(')[0].trim())}">+ Zu meinem Stack</button>`}
          </article>`;
        }).join('')}</div></div>`;
    }).join('') + '<p class="muted small">Evidenz: A = stark, B = mittel, C = schwach (nach aktuellem Studienstand).</p>';
  }

  $('#sp-recs').addEventListener('click', e => {
    const b = e.target.closest('[data-addrec]');
    if (!b) return;
    const c = CATALOG[b.dataset.addrec];
    st.items.push({ id: uid(), catalogId: b.dataset.addrec, name: c.name, dose: b.dataset.dose.slice(0, 40), time: c.time });
    save(); renderAll();
  });

  // ---------- Rendering: Stack / Tracker ----------
  function streak(itemId) {
    let n = 0;
    const d = new Date();
    if (!(st.log[dayKey(d)] || []).includes(itemId)) d.setDate(d.getDate() - 1); // heute noch offen → ab gestern zählen
    while ((st.log[dayKey(d)] || []).includes(itemId)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function renderStack() {
    const today = dayKey();
    const done = st.log[today] || [];
    $('#sp-today').textContent = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const taken = st.items.filter(i => done.includes(i.id)).length;
    const pct = st.items.length ? Math.round((taken / st.items.length) * 100) : 0;
    $('#sp-progress').innerHTML = st.items.length
      ? `<div class="sp-prog-text"><b>${taken}/${st.items.length}</b> heute genommen</div><div class="bar"><span style="width:${pct}%"></span></div>`
      : '';

    if (!st.items.length) {
      $('#sp-list').innerHTML = '<div class="empty">Noch keine Supplements – füge links Vorschläge hinzu oder unten ein eigenes.</div>';
    } else {
      const byTime = TIMES.map(t => [t, st.items.filter(i => i.time === t)]).filter(([, l]) => l.length);
      $('#sp-list').innerHTML = byTime.map(([t, list]) => `
        <div class="sp-time">${t}</div>
        ${list.map(i => {
          const s = streak(i.id);
          return `<div class="sp-item ${done.includes(i.id) ? 'done' : ''}" data-id="${i.id}">
            <button class="sp-check" data-toggle aria-label="Als genommen markieren">${done.includes(i.id) ? '✓' : ''}</button>
            <div class="sp-main"><b>${esc(i.name)}</b><span class="muted small">${esc(i.dose || '')}</span></div>
            ${s > 1 ? `<span class="streak" title="Tage in Folge">${s} Tage</span>` : ''}
            <select data-time aria-label="Zeitpunkt">${TIMES.map(x => `<option ${x === i.time ? 'selected' : ''}>${x}</option>`).join('')}</select>
            <button class="icon danger" data-del aria-label="Entfernen">✕</button>
          </div>`;
        }).join('')}`).join('');
    }

    // Verlauf 14 Tage
    const days = [...Array(14)].map((_, k) => { const d = new Date(); d.setDate(d.getDate() - (13 - k)); return d; });
    $('#sp-history').innerHTML = st.items.length ? `
      <div class="hist-row hist-head"><span></span>${days.map(d => `<span>${d.toLocaleDateString('de-DE', { weekday: 'narrow' })}</span>`).join('')}</div>
      ${st.items.map(i => `<div class="hist-row"><span class="hist-name">${esc(i.name)}</span>
        ${days.map(d => `<span class="dot ${(st.log[dayKey(d)] || []).includes(i.id) ? 'on' : ''}" title="${d.toLocaleDateString('de-DE')}"></span>`).join('')}</div>`).join('')}`
      : '<p class="muted small">Hier siehst du, wie regelmäßig du deine Supplements nimmst.</p>';
  }

  $('#sp-list').addEventListener('click', e => {
    const row = e.target.closest('.sp-item');
    if (!row) return;
    const id = row.dataset.id, today = dayKey();
    if (e.target.closest('[data-toggle]')) {
      const l = new Set(st.log[today] || []);
      l.has(id) ? l.delete(id) : l.add(id);
      st.log[today] = [...l];
    }
    if (e.target.closest('[data-del]')) {
      st.items = st.items.filter(i => i.id !== id);
    }
    save(); renderAll();
  });
  $('#sp-list').addEventListener('change', e => {
    if (!e.target.matches('[data-time]')) return;
    const it = st.items.find(i => i.id === e.target.closest('.sp-item').dataset.id);
    it.time = e.target.value;
    save(); renderStack();
  });

  const addForm = $('#sp-add');
  addForm.time.innerHTML = TIMES.map(t => `<option>${t}</option>`).join('');
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    st.items.push({ id: uid(), catalogId: null, name: addForm.name.value.trim(), dose: addForm.dose.value.trim(), time: addForm.time.value });
    addForm.reset();
    save(); renderAll();
  });

  function renderAll() { renderRecs(); renderStack(); }

  // ---------- Tabs (Workouts / Supplements) ----------
  function showView(v) {
    $('#view-workout').hidden = v !== 'workout';
    $('#view-supp').hidden = v !== 'supp';
    $('#btn-new-ex').hidden = v !== 'workout';
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
    try { localStorage.setItem('gymplan.view', v); } catch { /* ignore */ }
    if (v === 'supp') renderAll(); // Intensität neu berechnen (Workouts könnten sich geändert haben)
  }
  document.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) showView(t.dataset.view);
  });

  renderProfile();
  let start = 'workout';
  try { start = localStorage.getItem('gymplan.view') || 'workout'; } catch { /* ignore */ }
  showView(start);
})();

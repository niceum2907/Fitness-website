// ===== Animierte Übungs-Figuren ("Mini-GIFs") =====
// Jede Übung hat zwei Posen (A/B). Die Figur bewegt sich ruhig zwischen beiden
// und hält an den Endpunkten kurz an (wie eine saubere Wiederholung).
// Koordinaten: x 0–100, y -12–96 (Boden bei y=93).

const STAND = { head: [50, 16], neck: [50, 24], hip: [50, 50], knee: [51, 71], foot: [50, 92], elbow: [50, 38], hand: [51, 52] };
const P = (base, o) => Object.assign({}, base, o);
const shiftY = (p, dy, keep = []) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, keep.includes(k) ? v : [v[0], v[1] + dy]]));

const FIGURES = {
  squat: { cues: ['Aufrecht stehen','Absenken','Tiefster Punkt','Hochdrücken'], label: 'Kniebeuge', props: ['barbell'], A: P(STAND, { elbow: [42, 30], hand: [48, 22] }),
    B: { head: [58, 36], neck: [55, 43], hip: [36, 62], knee: [60, 68], foot: [50, 92], elbow: [46, 48], hand: [53, 40] } },
  deadlift: { cues: ['Startposition','Hochziehen','Aufrecht stehen','Kontrolliert ablassen'], label: 'Kreuzheben', props: ['barbell'], A: { head: [64, 38], neck: [58, 44], hip: [36, 60], knee: [56, 70], foot: [50, 92], elbow: [57, 61], hand: [56, 78] },
    B: STAND },
  bench: { cues: ['Arme gestreckt','Absenken zur Brust','Stange an der Brust','Hochdrücken'], label: 'Bankdrücken', props: ['barbell'], bench: true, A: { head: [20, 58], neck: [28, 60], hip: [58, 60], knee: [76, 70], foot: [78, 92], elbow: [30, 46], hand: [30, 32] },
    B: { head: [20, 58], neck: [28, 60], hip: [58, 60], knee: [76, 70], foot: [78, 92], elbow: [40, 67], hand: [32, 52] } },
  pushup: { cues: ['Oben (Arme gestreckt)','Absenken','Brust knapp über Boden','Hochdrücken'], label: 'Liegestütz', A: { head: [22, 57], neck: [30, 62], hip: [60, 72], knee: [74, 80], foot: [88, 90], elbow: [30, 76], hand: [30, 90] },
    B: { head: [22, 76], neck: [30, 80], hip: [60, 84], knee: [74, 87], foot: [88, 90], elbow: [42, 82], hand: [30, 90] } },
  pullup: { cues: ['Hängen','Hochziehen','Kinn über Stange','Kontrolliert ablassen'], label: 'Klimmzug', bar: true, noFloor: true, A: { head: [53, 27], neck: [50, 34], hip: [50, 60], knee: [56, 76], foot: [50, 90], elbow: [50, 21], hand: [50, 8] },
    B: { head: [53, 14], neck: [50, 22], hip: [50, 48], knee: [56, 64], foot: [50, 78], elbow: [40, 24], hand: [50, 8] } },
  row: { cues: ['Arm gestreckt','Ellbogen nach hinten ziehen','Oben halten','Ablassen'], label: 'Rudern', props: ['dumbbell'], A: { head: [68, 34], neck: [62, 38], hip: [38, 52], knee: [46, 72], foot: [44, 92], elbow: [62, 54], hand: [62, 68] },
    B: { head: [68, 34], neck: [62, 38], hip: [38, 52], knee: [46, 72], foot: [44, 92], elbow: [46, 42], hand: [48, 56] } },
  press: { cues: ['Hanteln auf Schulterhöhe','Nach oben drücken','Arme gestreckt','Ablassen'], label: 'Drücken über Kopf', props: ['dumbbell'], A: P(STAND, { elbow: [42, 30], hand: [46, 20] }),
    B: P(STAND, { elbow: [48, 10], hand: [50, -2] }) },
  curl: { cues: ['Arme gestreckt','Hochcurlen','Oben anspannen','Langsam ablassen'], label: 'Curl', props: ['dumbbell'], A: STAND,
    B: P(STAND, { hand: [60, 30] }) },
  triceps: { cues: ['Unterarme hinter dem Kopf','Strecken','Arme gestreckt','Langsam beugen'], label: 'Trizeps über Kopf', props: ['dumbbell'], A: P(STAND, { elbow: [54, 6], hand: [44, 14] }),
    B: P(STAND, { elbow: [54, 6], hand: [56, -8] }) },
  lunge: { cues: ['Aufrecht stehen','Absenken','Tiefster Punkt','Hochdrücken'], label: 'Ausfallschritt', props: ['dumbbell'], A: { head: [50, 16], neck: [50, 24], hip: [50, 50], knee: [54, 71], foot: [56, 92], knee2: [46, 71], foot2: [44, 92], elbow: [50, 38], hand: [50, 52] },
    B: { head: [48, 30], neck: [48, 38], hip: [48, 62], knee: [66, 62], foot: [68, 92], knee2: [40, 84], foot2: [24, 90], elbow: [48, 52], hand: [48, 66] } },
  lateral: { cues: ['Arme seitlich am Körper','Seitlich anheben','Schulterhöhe','Langsam senken'], label: 'Seitheben (Frontansicht)', props: ['dumbbell'], both: true, A: { head: [50, 16], neck: [50, 24], hip: [50, 50], knee: [46, 71], foot: [45, 92], knee2: [54, 71], foot2: [55, 92],
         elbow: [45, 38], hand: [43, 52], elbow2: [55, 38], hand2: [57, 52] },
    B: { head: [50, 16], neck: [50, 24], hip: [50, 50], knee: [46, 71], foot: [45, 92], knee2: [54, 71], foot2: [55, 92],
         elbow: [38, 27], hand: [25, 26], elbow2: [62, 27], hand2: [75, 26] } },
  calf: { tempo: 0.8, cues: ['Fersen unten','Auf die Zehen','Oben halten','Langsam senken'], label: 'Wadenheben', props: ['dumbbell'], A: STAND,
    B: shiftY(STAND, -5, ['foot']) },
  hipthrust: { cues: ['Hüfte unten','Hüfte hochdrücken','Gesäß anspannen','Absenken'], label: 'Hip Thrust', props: ['barbell'], A: { head: [16, 82], neck: [24, 84], hip: [50, 88], knee: [64, 70], foot: [74, 90], elbow: [32, 88], hand: [48, 84] },
    B: { head: [16, 80], neck: [24, 82], hip: [50, 70], knee: [66, 64], foot: [74, 90], elbow: [34, 74], hand: [48, 66] } },
  legcurl: { cues: ['Beine gestreckt','Fersen zum Po','Anspannen','Langsam strecken'], label: 'Beinbeuger', A: { head: [14, 80], neck: [22, 82], hip: [50, 84], knee: [70, 84], foot: [88, 84], elbow: [20, 90], hand: [30, 90] },
    B: { head: [14, 80], neck: [22, 82], hip: [50, 84], knee: [70, 84], foot: [76, 67], elbow: [20, 90], hand: [30, 90] } },
  plank: { tempo: 1.6, cues: ['Körper gerade halten','Bauch fest','Atmen','Spannung halten'], label: 'Plank', A: { head: [20, 66], neck: [28, 70], hip: [58, 74], knee: [72, 80], foot: [88, 88], elbow: [28, 88], hand: [40, 88] },
    B: { head: [20, 66], neck: [28, 70], hip: [58, 71], knee: [72, 79], foot: [88, 88], elbow: [28, 88], hand: [40, 88] } },
  crunch: { cues: ['Rücken am Boden','Oberkörper einrollen','Bauch anspannen','Abrollen'], label: 'Crunch', A: { head: [18, 82], neck: [26, 84], hip: [56, 86], knee: [68, 68], foot: [80, 90], elbow: [24, 74], hand: [18, 78] },
    B: { head: [30, 68], neck: [34, 75], hip: [56, 86], knee: [68, 68], foot: [80, 90], elbow: [36, 62], hand: [30, 66] } },
};

function completePose(p) {
  const q = { ...p };
  q.knee2 = q.knee2 || [q.knee[0] - 3, q.knee[1]];
  q.foot2 = q.foot2 || [q.foot[0] - 3, q.foot[1]];
  q.elbow2 = q.elbow2 || [q.elbow[0] - 3, q.elbow[1]];
  q.hand2 = q.hand2 || [q.hand[0] - 3, q.hand[1]];
  return q;
}

// ---------- Tempo einer Wiederholung (Sekunden) ----------
const REP = { hold: 0.8, move: 1.8 };           // 0,8 s halten · 1,8 s bewegen → ~5 s pro Wiederholung
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // sanftes Ein-/Ausblenden
const LIVE_FIGURES = new Set();
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;

function phaseAt(t, tempo) {
  const h = REP.hold * tempo, m = REP.move * tempo, cycle = 2 * (h + m);
  const x = t % cycle;
  if (x < h) return { k: 0, i: 0 };
  if (x < h + m) return { k: ease((x - h) / m), i: 1 };
  if (x < 2 * h + m) return { k: 1, i: 2 };
  return { k: 1 - ease((x - 2 * h - m) / m), i: 3 };
}

function propMarkup(type, at, opacity) {
  if (type === 'dumbbell') {
    return `<g data-at="${at}" class="fig-db" opacity="${opacity}"><rect x="-6" y="-1.2" width="12" height="2.4"/><rect x="-7.5" y="-3.5" width="3" height="7" rx="1"/><rect x="4.5" y="-3.5" width="3" height="7" rx="1"/></g>`;
  }
  if (type === 'barbell') {
    return `<g data-at="${at}" opacity="${opacity}"><circle r="8" class="fig-plate"/><circle r="1.6" class="fig-hub"/></g>`;
  }
  return '';
}

/**
 * Erstellt eine animierte Figur.
 * opts.mode: 'hover'  = bewegt sich nur, wenn die Maus darüber ist (ruhige Übersicht)
 *            'always' = bewegt sich dauerhaft (z. B. in der Anleitung)
 *            'static' = steht still
 * Rückgabe: <div class="fig"> mit .figure = { play(), pause(), toggle(), setSpeed(x), playing, onPhase }
 */
function createFigure(exercise, small = false, opts = {}) {
  const mode = opts.mode || (small ? 'static' : 'hover');
  const wrap = document.createElement('div');
  wrap.className = 'fig' + (small ? ' fig-sm' : '') + (opts.large ? ' fig-lg' : '');

  if (exercise && exercise.gif) {
    const img = document.createElement('img');
    img.src = exercise.gif;
    img.alt = exercise.name;
    img.loading = 'lazy';
    img.onerror = () => { wrap.replaceWith(createFigure({ ...exercise, gif: '' }, small, opts)); };
    wrap.appendChild(img);
    wrap.figure = { play() {}, pause() {}, toggle() {}, setSpeed() {}, reset() {}, playing: true, cues: null };
    return wrap;
  }

  const f = FIGURES[exercise?.pattern] || FIGURES.curl;
  const A = completePose(f.A), B = completePose(f.B);
  const back = f.both ? 1 : 0.4;
  const props = (f.props || []).map(p => propMarkup(p, 'hand', 1) + (f.both ? propMarkup(p, 'hand2', 1) : '')).join('');

  wrap.innerHTML = `
  <svg viewBox="0 -12 100 108" aria-label="${(exercise?.name || '').replace(/"/g, '')} Animation" role="img">
    ${f.noFloor ? '' : '<line x1="4" y1="93" x2="96" y2="93" class="fig-floor"/>'}
    ${f.bench ? '<rect x="14" y="64" width="52" height="5" rx="1.5" class="fig-bench"/><line x1="20" y1="69" x2="20" y2="93" class="fig-bench-l"/><line x1="60" y1="69" x2="60" y2="93" class="fig-bench-l"/>' : ''}
    ${f.bar ? '<line x1="26" y1="8" x2="74" y2="8" class="fig-bar"/>' : ''}
    <g class="fig-body">
      <polyline data-p="hip,knee2,foot2" opacity="${back}"/>
      <polyline data-p="neck,elbow2,hand2" opacity="${back}"/>
      <polyline data-p="neck,hip"/>
      <polyline data-p="hip,knee,foot"/>
      <polyline data-p="neck,elbow,hand"/>
    </g>
    <circle r="6.5" class="fig-head"/>
    ${props}
  </svg>`;

  const svg = wrap.querySelector('svg');
  const entry = {
    svg, A, B, tempo: f.tempo || 1, t: 0, speed: 1, playing: false, k: 0, lastPhase: -1,
    lines: [...svg.querySelectorAll('polyline')].map(el => ({ el, keys: el.dataset.p.split(',') })),
    head: svg.querySelector('.fig-head'),
    props: [...svg.querySelectorAll('[data-at]')].map(el => ({ el, key: el.dataset.at })),
  };
  drawFigure(entry, 0);

  const api = {
    cues: f.cues || null,
    onPhase: null,
    get playing() { return entry.playing; },
    play() { if (REDUCED_MOTION && mode !== 'always') return; entry.playing = true; LIVE_FIGURES.add(entry); },
    pause() { entry.playing = false; },
    toggle() { entry.playing ? api.pause() : api.play(); return entry.playing; },
    setSpeed(x) { entry.speed = x; },
    reset() { entry.t = 0; entry.lastPhase = -1; drawFigure(entry, 0); },
  };
  entry.api = api;
  wrap.figure = api;

  if (mode === 'always') api.play();
  if (mode === 'hover') {
    if (TOUCH) {
      // Touch-Geräte: nur animieren, solange die Karte sichtbar ist
      const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? api.play() : api.pause()), { threshold: 0.6 });
      io.observe(wrap);
    } else {
      const host = () => wrap.closest('.card') || wrap;
      requestAnimationFrame(() => {
        host().addEventListener('mouseenter', () => api.play());
        host().addEventListener('mouseleave', () => { api.pause(); api.reset(); });
      });
    }
  }
  return wrap;
}

function drawFigure(e, k) {
  const pt = key => {
    const a = e.A[key], b = e.B[key];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  for (const l of e.lines) l.el.setAttribute('points', l.keys.map(key => pt(key).map(n => n.toFixed(1)).join(',')).join(' '));
  const h = pt('head');
  e.head.setAttribute('cx', h[0].toFixed(1));
  e.head.setAttribute('cy', h[1].toFixed(1));
  for (const p of e.props) {
    const [x, y] = pt(p.key);
    p.el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }
}

let lastFrame = performance.now();
function animateFigures(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  for (const e of LIVE_FIGURES) {
    if (!e.svg.isConnected) { if (e.seen) LIVE_FIGURES.delete(e); continue; }
    e.seen = true;
    if (!e.playing) continue;
    e.t += dt * e.speed;
    const { k, i } = phaseAt(e.t, e.tempo);
    drawFigure(e, k);
    if (i !== e.lastPhase) { e.lastPhase = i; e.api.onPhase && e.api.onPhase(i); }
  }
  requestAnimationFrame(animateFigures);
}
requestAnimationFrame(animateFigures);

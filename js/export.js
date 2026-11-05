// ===== Export-Funktionen =====

function downloadFile(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
  // Alter Edge / IE
  if (window.navigator && window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, filename); return null; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // URL länger gültig lassen (Safari/Firefox brauchen Zeit; Fallback-Link nutzt sie auch)
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return url;
}

const safeFileName = s => (String(s || 'workout').trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'workout');

/** Geschätzte Dauer in Minuten (≈3 s pro Wiederholung + Pausen + 1 min Wechsel je Übung) */
function estimateMinutes(workout) {
  let s = 0;
  for (const it of workout.items) {
    const work = it.unit === 'sec' ? it.reps : it.reps * 3;
    s += it.sets * work + Math.max(0, it.sets - 1) * it.rest + 60;
  }
  return Math.max(5, Math.round(s / 60));
}

function itemLine(it, ex, i) {
  const amount = it.unit === 'sec' ? `${it.reps} s` : `${it.reps} Wdh.`;
  const weight = it.weight ? ` @ ${it.weight} kg` : '';
  return `${i + 1}. ${ex.name} – ${it.sets} × ${amount}${weight} · Pause ${it.rest} s`;
}

function workoutToText(workout, lookup) {
  const lines = workout.items.map((it, i) => itemLine(it, lookup(it.exId), i));
  return `${workout.name}\n(ca. ${estimateMinutes(workout)} min)\n\n${lines.join('\n')}\n\nErstellt mit GymPlan`;
}

// ---------- Kalender (.ics) ----------
function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function icsDate(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}
function buildICS(workout, lookup, start) {
  const end = new Date(start.getTime() + estimateMinutes(workout) * 60000);
  const now = new Date();
  const utc = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GymPlan//Workout Builder//DE', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${workout.id}-${Date.now()}@gymplan.local`,
    `DTSTAMP:${utc}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape('Workout: ' + workout.name)}`,
    `DESCRIPTION:${icsEscape(workoutToText(workout, lookup))}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Workout startet bald', 'TRIGGER:-PT15M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

// ---------- CSV ----------
function buildCSV(workout, lookup) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Workout', 'Nr', 'Übung', 'Sätze', 'Wdh/Sek', 'Einheit', 'Gewicht (kg)', 'Pause (s)', 'Primär', 'Sekundär'];
  const rows = workout.items.map((it, i) => {
    const ex = lookup(it.exId);
    return [workout.name, i + 1, ex.name, it.sets, it.reps, it.unit === 'sec' ? 'Sekunden' : 'Wiederholungen',
      it.weight || '', it.rest, (ex.primary || []).map(m => MUSCLES[m]).join(', '), (ex.secondary || []).map(m => MUSCLES[m]).join(', ')];
  });
  return '\uFEFF' + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n'); // BOM + ; → Excel (DE) öffnet korrekt
}

// ---------- Echte Excel-Datei (.xlsx) – ohne externe Bibliothek ----------
const XLSX = (() => {
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

  // ZIP (unkomprimiert / "stored") – reicht für Excel völlig
  function zip(files) {
    const parts = [], central = [];
    let offset = 0;
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const [name, text] of files) {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), nb);
      offset += 30 + nb.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const colName = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  /** rows: Array von Arrays; Zahlen bleiben Zahlen. Erste Zeile = fette Kopfzeile. */
  function build(sheetName, rows, widths = []) {
    const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      const ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      if (v === '' || v == null) return `<c r="${ref}"${st}/>`;
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const name = x(String(sheetName).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Workout');
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF5E3A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
      ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`],
    ]);
  }
  return { build };
})();

function buildXLSX(workout, lookup) {
  const head = ['Nr', 'Übung', 'Sätze', 'Wdh/Sek', 'Einheit', 'Gewicht (kg)', 'Pause (s)', 'Primäre Muskeln', 'Sekundäre Muskeln', 'Notiz'];
  const rows = workout.items.map((it, i) => {
    const ex = lookup(it.exId);
    return [i + 1, ex.name, Number(it.sets) || 0, Number(it.reps) || 0, it.unit === 'sec' ? 'Sekunden' : 'Wiederholungen',
      it.weight === '' || it.weight == null ? '' : Number(it.weight), Number(it.rest) || 0,
      (ex.primary || []).map(m => MUSCLES[m]).join(', '), (ex.secondary || []).map(m => MUSCLES[m]).join(', '), ''];
  });
  return XLSX.build(workout.name, [head, ...rows], [5, 26, 7, 9, 15, 13, 10, 30, 34, 24]);
}

// ---------- Garmin .FIT Workout-Datei ----------
const FIT = (() => {
  const CRC_TABLE = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
                     0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
  function crc16(bytes, crc = 0) {
    for (const b of bytes) {
      let t = CRC_TABLE[crc & 0xF];
      crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ CRC_TABLE[b & 0xF];
      t = CRC_TABLE[crc & 0xF];
      crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ CRC_TABLE[(b >> 4) & 0xF];
    }
    return crc;
  }
  const TYPES = {
    enum:    { id: 0x00, size: 1, invalid: 0xFF },
    uint8:   { id: 0x02, size: 1, invalid: 0xFF },
    uint16:  { id: 0x84, size: 2, invalid: 0xFFFF },
    uint32:  { id: 0x86, size: 4, invalid: 0xFFFFFFFF },
    uint32z: { id: 0x8C, size: 4, invalid: 0 },
    string:  { id: 0x07, size: 0, invalid: 0 },
  };
  const enc = new TextEncoder();
  function strBytes(s, size) {
    let str = String(s || '');
    let b = enc.encode(str);
    while (b.length > size - 1) { str = str.slice(0, -1); b = enc.encode(str); }
    const out = new Uint8Array(size);
    out.set(b);
    return out;
  }
  class Writer {
    constructor() { this.b = []; }
    u8(v) { this.b.push(v & 0xFF); }
    u16(v) { this.u8(v); this.u8(v >>> 8); }
    u32(v) { this.u16(v & 0xFFFF); this.u16((v >>> 16) & 0xFFFF); }
    bytes(a) { for (const x of a) this.b.push(x); }
  }

  function build(workout, lookup) {
    const w = new Writer();
    const defs = {};
    const define = (local, global, fields) => {
      defs[local] = fields;
      w.u8(0x40 | local); w.u8(0); w.u8(0); // header, reserved, little endian
      w.u16(global); w.u8(fields.length);
      for (const f of fields) { const t = TYPES[f.t]; w.u8(f.n); w.u8(f.t === 'string' ? f.s : t.size); w.u8(t.id); }
    };
    const data = (local, values) => {
      w.u8(local);
      defs[local].forEach((f, i) => {
        const t = TYPES[f.t], v = values[i];
        if (f.t === 'string') return w.bytes(strBytes(v, f.s));
        const x = v == null ? t.invalid : v;
        if (t.size === 1) w.u8(x); else if (t.size === 2) w.u16(x); else w.u32(x);
      });
    };

    // Schritte: Übung (Wdh. oder Zeit) → Pause → "Wiederhole ab Schritt X, N-mal"
    const steps = [];
    for (const it of workout.items) {
      const ex = lookup(it.exId);
      if (!ex) continue;
      const start = steps.length;
      const notes = [it.weight ? `${it.weight} kg` : '', `${it.sets} Saetze`].filter(Boolean).join(' / ');
      steps.push({ name: ex.name, dt: it.unit === 'sec' ? 0 : 29, dv: it.unit === 'sec' ? it.reps * 1000 : it.reps,
                   tt: 2, tv: 0, intensity: 0, notes, cat: ex.garmin ?? 65534 });
      if (it.rest > 0) steps.push({ name: 'Pause', dt: 0, dv: it.rest * 1000, tt: 2, tv: 0, intensity: 1, notes: '', cat: null });
      if (it.sets > 1) steps.push({ name: '', dt: 6, dv: start, tt: null, tv: it.sets, intensity: null, notes: '', cat: null });
    }

    // file_id (global 0)
    define(0, 0, [{ n: 0, t: 'enum' }, { n: 1, t: 'uint16' }, { n: 2, t: 'uint16' }, { n: 3, t: 'uint32z' }, { n: 4, t: 'uint32' }]);
    data(0, [5 /*workout*/, 255 /*development*/, 0, (Math.random() * 0xFFFFFFF) >>> 0 || 1,
             Math.floor(Date.now() / 1000) - 631065600]);

    // workout (global 26): sport=training(10), sub_sport=strength_training(20)
    define(1, 26, [{ n: 8, t: 'string', s: 32 }, { n: 4, t: 'enum' }, { n: 11, t: 'enum' }, { n: 6, t: 'uint16' }]);
    data(1, [workout.name, 10, 20, steps.length]);

    // workout_step (global 27)
    define(2, 27, [
      { n: 254, t: 'uint16' }, { n: 0, t: 'string', s: 40 }, { n: 1, t: 'enum' }, { n: 2, t: 'uint32' },
      { n: 3, t: 'enum' }, { n: 4, t: 'uint32' }, { n: 7, t: 'enum' }, { n: 8, t: 'string', s: 40 }, { n: 10, t: 'uint16' },
    ]);
    steps.forEach((s, i) => data(2, [i, s.name, s.dt, s.dv, s.tt, s.tv, s.intensity, s.notes, s.cat]));

    // Header (14 Byte) + Daten + CRC
    const body = w.b;
    const h = new Writer();
    h.u8(14); h.u8(0x10); h.u16(2132); h.u32(body.length); h.bytes([0x2E, 0x46, 0x49, 0x54]); // ".FIT"
    h.u16(crc16(h.b));
    const out = new Uint8Array(14 + body.length + 2);
    out.set(h.b, 0);
    out.set(body, 14);
    const c = crc16(out.subarray(0, 14 + body.length));
    out[out.length - 2] = c & 0xFF;
    out[out.length - 1] = c >>> 8;
    return out;
  }
  return { build };
})();

// ===== Muskelgruppen =====
const MUSCLES = {
  chest: 'Brust',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  obliques: 'Seitl. Bauch',
  back: 'Rücken (Lat)',
  traps: 'Nacken (Trapez)',
  lowerback: 'Unterer Rücken',
  glutes: 'Gesäß',
  quads: 'Oberschenkel vorne',
  hamstrings: 'Oberschenkel hinten',
  calves: 'Waden',
};

// Garmin FIT exercise_category (für den .FIT-Export)
const GARMIN_CATEGORIES = {
  0: 'Bench Press', 1: 'Calf Raise', 2: 'Cardio', 3: 'Carry', 5: 'Core', 6: 'Crunch',
  7: 'Curl', 8: 'Deadlift', 9: 'Flye', 10: 'Hip Raise', 14: 'Lateral Raise', 15: 'Leg Curl',
  16: 'Leg Raise', 17: 'Lunge', 19: 'Plank', 20: 'Plyo', 21: 'Pull Up', 22: 'Push Up',
  23: 'Row', 24: 'Shoulder Press', 26: 'Shrug', 27: 'Sit Up', 28: 'Squat',
  29: 'Total Body', 30: 'Triceps Extension', 31: 'Warm Up', 65534: 'Unbekannt',
};

// ===== Übungsbibliothek =====
// pattern = Animation (siehe figures.js), unit = 'reps' | 'sec'
const EXERCISES = [
  { id: 'squat', name: 'Kniebeuge', equipment: 'Langhantel', pattern: 'squat', garmin: 28, unit: 'reps',
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerback', 'abs'] },
  { id: 'legpress', name: 'Beinpresse', equipment: 'Maschine', pattern: 'squat', garmin: 28, unit: 'reps',
    primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { id: 'deadlift', name: 'Kreuzheben', equipment: 'Langhantel', pattern: 'deadlift', garmin: 8, unit: 'reps',
    primary: ['hamstrings', 'glutes', 'lowerback'], secondary: ['back', 'traps', 'forearms', 'quads'] },
  { id: 'rdl', name: 'Rumänisches Kreuzheben', equipment: 'Langhantel', pattern: 'deadlift', garmin: 8, unit: 'reps',
    primary: ['hamstrings', 'glutes'], secondary: ['lowerback', 'forearms'] },
  { id: 'bench', name: 'Bankdrücken', equipment: 'Langhantel', pattern: 'bench', garmin: 0, unit: 'reps',
    primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  { id: 'incline', name: 'Schrägbankdrücken', equipment: 'Kurzhantel', pattern: 'bench', garmin: 0, unit: 'reps',
    primary: ['chest', 'shoulders'], secondary: ['triceps'] },
  { id: 'pushup', name: 'Liegestütze', equipment: 'Körpergewicht', pattern: 'pushup', garmin: 22, unit: 'reps',
    primary: ['chest', 'triceps'], secondary: ['shoulders', 'abs'] },
  { id: 'pullup', name: 'Klimmzüge', equipment: 'Körpergewicht', pattern: 'pullup', garmin: 21, unit: 'reps',
    primary: ['back', 'biceps'], secondary: ['forearms', 'shoulders'] },
  { id: 'dbrow', name: 'Kurzhantel-Rudern', equipment: 'Kurzhantel', pattern: 'row', garmin: 23, unit: 'reps',
    primary: ['back'], secondary: ['biceps', 'shoulders', 'traps'] },
  { id: 'bbrow', name: 'Langhantel-Rudern', equipment: 'Langhantel', pattern: 'row', garmin: 23, unit: 'reps',
    primary: ['back', 'traps'], secondary: ['biceps', 'lowerback'] },
  { id: 'facepull', name: 'Face Pulls', equipment: 'Kabelzug', pattern: 'row', garmin: 23, unit: 'reps',
    primary: ['shoulders', 'traps'], secondary: ['back'] },
  { id: 'ohp', name: 'Schulterdrücken', equipment: 'Kurzhantel', pattern: 'press', garmin: 24, unit: 'reps',
    primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  { id: 'lateral', name: 'Seitheben', equipment: 'Kurzhantel', pattern: 'lateral', garmin: 14, unit: 'reps',
    primary: ['shoulders'], secondary: ['traps'] },
  { id: 'curl', name: 'Bizepscurls', equipment: 'Kurzhantel', pattern: 'curl', garmin: 7, unit: 'reps',
    primary: ['biceps'], secondary: ['forearms'] },
  { id: 'hammer', name: 'Hammercurls', equipment: 'Kurzhantel', pattern: 'curl', garmin: 7, unit: 'reps',
    primary: ['biceps', 'forearms'], secondary: [] },
  { id: 'triext', name: 'Trizepsdrücken über Kopf', equipment: 'Kurzhantel', pattern: 'triceps', garmin: 30, unit: 'reps',
    primary: ['triceps'], secondary: ['shoulders'] },
  { id: 'lunge', name: 'Ausfallschritte', equipment: 'Kurzhantel', pattern: 'lunge', garmin: 17, unit: 'reps',
    primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'] },
  { id: 'bss', name: 'Bulgarian Split Squat', equipment: 'Kurzhantel', pattern: 'lunge', garmin: 17, unit: 'reps',
    primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  { id: 'hipthrust', name: 'Hip Thrust', equipment: 'Langhantel', pattern: 'hipthrust', garmin: 10, unit: 'reps',
    primary: ['glutes'], secondary: ['hamstrings', 'quads'] },
  { id: 'legcurl', name: 'Beinbeuger', equipment: 'Maschine', pattern: 'legcurl', garmin: 15, unit: 'reps',
    primary: ['hamstrings'], secondary: ['calves'] },
  { id: 'calf', name: 'Wadenheben', equipment: 'Kurzhantel', pattern: 'calf', garmin: 1, unit: 'reps',
    primary: ['calves'], secondary: [] },
  { id: 'plank', name: 'Plank', equipment: 'Körpergewicht', pattern: 'plank', garmin: 19, unit: 'sec',
    primary: ['abs'], secondary: ['obliques', 'shoulders', 'lowerback'] },
  { id: 'crunch', name: 'Crunches', equipment: 'Körpergewicht', pattern: 'crunch', garmin: 6, unit: 'reps',
    primary: ['abs'], secondary: ['obliques'] },
  { id: 'twist', name: 'Russian Twist', equipment: 'Körpergewicht', pattern: 'crunch', garmin: 5, unit: 'reps',
    primary: ['obliques', 'abs'], secondary: [] },
];

// ===== Körperkarte (vorne / hinten) – data-m = Muskel-ID =====
const BODY_FRONT = `
<svg viewBox="0 0 120 250" class="body">
  <text x="60" y="248" text-anchor="middle" class="body-label">Vorne</text>
  <circle cx="60" cy="20" r="13" class="neutral"/>
  <rect x="54" y="31" width="12" height="12" rx="3" class="neutral"/>
  <rect x="42" y="116" width="36" height="18" rx="8" class="neutral"/>
  <circle cx="22" cy="126" r="5" class="neutral"/><circle cx="98" cy="126" r="5" class="neutral"/>
  <ellipse cx="47" cy="233" rx="7" ry="4" class="neutral"/><ellipse cx="73" cy="233" rx="7" ry="4" class="neutral"/>
  <ellipse data-m="shoulders" cx="36" cy="54" rx="11" ry="9"/><ellipse data-m="shoulders" cx="84" cy="54" rx="11" ry="9"/>
  <ellipse data-m="chest" cx="50" cy="64" rx="11" ry="9"/><ellipse data-m="chest" cx="70" cy="64" rx="11" ry="9"/>
  <ellipse data-m="biceps" cx="29" cy="80" rx="6.5" ry="13"/><ellipse data-m="biceps" cx="91" cy="80" rx="6.5" ry="13"/>
  <ellipse data-m="forearms" cx="24" cy="106" rx="5.5" ry="14"/><ellipse data-m="forearms" cx="96" cy="106" rx="5.5" ry="14"/>
  <rect data-m="abs" x="51" y="75" width="18" height="42" rx="6"/>
  <ellipse data-m="obliques" cx="43" cy="96" rx="5.5" ry="17"/><ellipse data-m="obliques" cx="77" cy="96" rx="5.5" ry="17"/>
  <ellipse data-m="quads" cx="49" cy="160" rx="10" ry="27"/><ellipse data-m="quads" cx="71" cy="160" rx="10" ry="27"/>
  <ellipse data-m="calves" cx="48" cy="208" rx="6.5" ry="19"/><ellipse data-m="calves" cx="72" cy="208" rx="6.5" ry="19"/>
</svg>`;

const BODY_BACK = `
<svg viewBox="0 0 120 250" class="body">
  <text x="60" y="248" text-anchor="middle" class="body-label">Hinten</text>
  <circle cx="60" cy="20" r="13" class="neutral"/>
  <circle cx="22" cy="126" r="5" class="neutral"/><circle cx="98" cy="126" r="5" class="neutral"/>
  <ellipse cx="47" cy="233" rx="7" ry="4" class="neutral"/><ellipse cx="73" cy="233" rx="7" ry="4" class="neutral"/>
  <path data-m="traps" d="M50,33 L70,33 L86,48 L70,56 L60,72 L50,56 L34,48 Z"/>
  <ellipse data-m="shoulders" cx="34" cy="55" rx="10" ry="9"/><ellipse data-m="shoulders" cx="86" cy="55" rx="10" ry="9"/>
  <ellipse data-m="back" cx="47" cy="82" rx="11" ry="19"/><ellipse data-m="back" cx="73" cy="82" rx="11" ry="19"/>
  <rect data-m="lowerback" x="51" y="98" width="18" height="20" rx="5"/>
  <ellipse data-m="triceps" cx="28" cy="80" rx="6.5" ry="13"/><ellipse data-m="triceps" cx="92" cy="80" rx="6.5" ry="13"/>
  <ellipse data-m="forearms" cx="24" cy="106" rx="5.5" ry="14"/><ellipse data-m="forearms" cx="96" cy="106" rx="5.5" ry="14"/>
  <ellipse data-m="glutes" cx="50" cy="130" rx="11" ry="11"/><ellipse data-m="glutes" cx="70" cy="130" rx="11" ry="11"/>
  <ellipse data-m="hamstrings" cx="49" cy="165" rx="9.5" ry="23"/><ellipse data-m="hamstrings" cx="71" cy="165" rx="9.5" ry="23"/>
  <ellipse data-m="calves" cx="49" cy="208" rx="7.5" ry="17"/><ellipse data-m="calves" cx="71" cy="208" rx="7.5" ry="17"/>
</svg>`;

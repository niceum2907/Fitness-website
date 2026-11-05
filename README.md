# GymPlan – Workout Builder

## Starten (VS Code)
1. Ordner `gymplan` in VS Code öffnen (Datei → Ordner öffnen).
2. Erweiterung **Live Server** installieren → Rechtsklick auf `index.html` → **Open with Live Server**.
   (Oder einfach `index.html` doppelklicken – läuft auch ohne Server.)

## Struktur
- `index.html` – Seitenaufbau
- `style.css` – Design (Dark Mode, responsiv, Druckansicht)
- `js/data.js` – Übungen, Muskelgruppen, Körperkarte → hier neue Standard-Übungen ergänzen
- `js/figures.js` – animierte Übungsfiguren (Mini-GIFs)
- `js/export.js` – Garmin .FIT, Kalender .ics, CSV, Text
- `js/app.js` – App-Logik Workouts
- `js/supplements.js` – Supplement-Tracker: Katalog, Empfehlungslogik, Tagesliste, Verlauf

Daten (eigene Übungen, gespeicherte Workouts) liegen im Browser (localStorage).
Für Backup/Übertragung: „JSON-Backup“ + „JSON importieren“.

## Export
- **Garmin (.FIT):** echte Workout-Datei → per USB in `GARMIN/NewFiles` kopieren.
- **Apple Watch:** Apple erlaubt keinen Datei-Import in die Trainings-App → Kalendertermin (.ics) oder Teilen in Notizen/Erinnerungen.
- **Kalender (.ics), CSV/Excel, JSON, Drucken/PDF, Text kopieren.**

## Supplement-Tracker (Tab „Supplements“)
- Profil (Alter, Geschlecht, Gewicht, Trainingstage, Ernährung) → persönliche Vorschläge
- Trainingsintensität wird automatisch aus deinen gespeicherten Workouts berechnet (Sätze/Woche)
- Mein Stack: täglich abhaken, Serien-Zähler, Verlauf der letzten 14 Tage
- Regeln anpassen: Funktion `recommend()` in `js/supplements.js`

# Mission Control 5.0 — Klickbarer Prototyp

Statischer, rein clientseitiger Dashboard-Prototyp (kein Backend, keine echten API-Calls). Alle Daten in `assets/data.js` sind Mock-Daten.

## Views

- **Dashboard** — Übersicht: KPIs, Plattform-Reichweite, letzte Aktivität
- **Analytics** — Plattform-Vergleich, 7-Tage-Trend (Canvas-Chart), sortierbare Top-Beiträge-Tabelle
- **KI-Content** — Thema + Ton + Kanäle eingeben, Entwürfe werden simuliert generiert
- **Video-Pipeline** — Schritt-für-Schritt-Animation (Rohmaterial → Auto-Cut → Untertitel → Reframe → Review)
- **Mobile App** — Phone-Mockup, WLAN/Mobilfunk-Umschalter
- **Multi-Publish** — Beitrag verfassen, Kanäle wählen, einplanen; Warteschlange wird im Browser (localStorage) gespeichert

## Auf GitHub Pages veröffentlichen (Repo: Massim1701/mc5-tool)

1. Die vier Dateien/Ordner (`index.html`, `assets/`, `.nojekyll`, `README.md`) in dein bestehendes Repo `Massim1701/mc5-tool` hochladen (Root-Ebene, nicht in einen Unterordner) — per GitHub-Web-Upload (`Add file → Upload files`) oder `git add . && git commit -m "Prototyp" && git push`.
2. Im Repo: **Settings → Pages → Source** auf `Deploy from a branch` stellen, Branch `main` (oder `master`), Ordner `/ (root)` — Speichern.
3. Nach ca. 1–2 Minuten ist die Seite live unter **https://massim1701.github.io/mc5-tool/**

Kein Build-Schritt nötig — reines HTML/CSS/JS, alle Pfade sind relativ und funktionieren unter dem Unterpfad `/mc5-tool/`.

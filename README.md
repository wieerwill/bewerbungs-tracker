# Bewerbungs-Tracker (local, offline)

Ein schlanker, lokal laufender Tracker für Bewerbungen – ideal, um Jobs, Unternehmen und Kontakte **ohne Server** zu verwalten.
Modernes UI, sichere lokale DB, komfortable Formulare, Markdown-Notizen und sinnvolle Felder (Gehalt, Work-Mode, Seniorität u.v.m.).

## Features

* **Jobs verwalten**

  * Neu anlegen, bearbeiten, löschen
  * Status-Toggles: *angeschrieben* / *Antwort erhalten*
  * Zuordnung **genau eines** Unternehmens & **optional eines** Kontakts
  * Gehaltsspanne (von/bis), Zielgehalt, Währung/Zeitraum
  * Meta: Work-Mode (onsite/hybrid/remote), Remote-Anteil, Seniorität, Anstellungs- & Vertragsart
  * Startdatum, Frist, Quelle/Link, Bewerbungs-Kanal, Referral
  * Beschreibung & Notizen als **Markdown**

* **Unternehmen & Kontakte**

  * Unternehmen separat anlegen
  * Kontaktpersonen je Unternehmen
  * Nützliche Felder/Links: Website, LinkedIn, Glassdoor, StepStone, Hiring-Page, Branche, Größe, Karriere-E-Mail, Telefon, weitere Links

* **UI/UX**

  * Saubere Tabellen, Karten, Badges, moderne Buttons
  * Startseite mit **Suche / Filter / Sortierung**
  * Markdown-Rendering

* **Technik**

  * **TypeScript**
  * **SQLite** Datei-DB, keine Server, keine Migration nötig
  * Express + Pug, `better-sqlite3`, `morgan`

## Projektstruktur

```
├─ database/               # SQLite-Datei (jobs.db)
├─ public/                 # Static assets (CSS, Icons, …)
├─ views/                  # Pug Views (index, new, edit, detail, companies_*)
└─ src/
   ├─ index.ts             # App-Bootstrap (Express)
   ├─ database.ts          # SQLite öffnen, PRAGMA, Schema
   ├─ statements.ts        # SQL-Wrapper (typisiert)
   ├─ helpers.ts           # Mapper: Request↔Record, Row↔ViewModel
   ├─ routes.ts            # Alle Routen (Jobs, Companies, Contacts)
   └─ markdown.ts          # Markdown render (safe)
```

## Schnellstart (mit pnpm)

Voraussetzungen: Node ≥ 18, pnpm installiert.

```bash
# 1) Dependencies
pnpm install

# 2) Entwicklung (Hot-Reload via tsx)
pnpm dev
# -> Server: http://127.0.0.1:8080

# 3) Produktion (build + start)
pnpm build
pnpm start
```

Keine zusätzliche Konfiguration nötig. Die SQLite-Datei wird automatisch unter `database/jobs.db` angelegt.

## Wichtige Routen (Auszug)

* `GET /` – Übersicht (Suche/Filter/Sort)
* `GET /new` – neuen Job anlegen (mit Company/Contact-Dropdown)
* `POST /new` – Job speichern
* `GET /detail/:id` – Job-Details
* `GET /edit/:id` – Job bearbeiten (mit vorausgewählter Company/Contact)
* `POST /edit/:id` – Job aktualisieren
* `GET /toggle/:id/:field` – applied/answer toggeln
* `GET /delete/:id` – Job löschen
* `GET /companies` – Unternehmen Übersicht
* `GET /companies/new` – neues Unternehmen anlegen (+ optional erster Kontakt)
* `POST /companies/new` – Unternehmen speichern
* `GET /companies/:id` – Unternehmens-Detail (inkl. Kontakte)

> Hinweis: Für lokale Einfachheit sind einige „mutierende“ Aktionen als `GET` gehalten. In einer gehärteten Variante sollten diese als `POST/DELETE` mit CSRF-Schutz umgesetzt werden (siehe Roadmap).


## Konfiguration

Standardwerte:

* Host: `127.0.0.1`
* Port: `8080`
  → per `PORT`/`IP` überschreibbar (`pnpm start` liest Env Vars).


## Contribution Guide

Beiträge sind willkommen! Vorschlag:

1. **Issue** aufmachen (Bug/Feature, kurzer Kontext).
2. **Branch** erstellen (z. B. `feat/pagination`).
3. **Entwickeln**
   * TypeScript strikt halten (`pnpm build` ohne Fehler)
   * Sauber typisieren, keine `any`-Leaks
   * UI: bestehendes Design nutzen (Buttons, Cards, .table, .prose)
4. **Tests** (optional, s. Roadmap)
5. **PR** mit klarer Beschreibung, Screenshots bei UI-Changes

Coding-Hinweise:

* Datenfluss: `routes` → `statements`/`helpers` (keine SQL in Routen)
* Validierung serverseitig (z. B. `zod`) – optional, aber gern gesehen
* Markdown nur über `renderMarkdown` in Views ausgeben

## Roadmap

* [x] TypeScript-Refactor, modulare Struktur in `src/`
* [x] SQLite (serverlos), WAL, Foreign Keys
* [x] Jobs: CRUD, applied/answer Toggle
* [x] Unternehmen: eigene Entität (Name unique), Kontakte
* [x] Job↔Company/Contact Zuordnung per Dropdown
* [x] Markdown für Beschreibung/Notizen (safe)
* [x] Modernes UI + Light/Dark-Mode Toggle
* [x] Suche/Filter/Sort in der Übersicht
* [x] Gehalts- & Meta-Felder (Work-Mode, Seniorität, etc.)
* [x] Firmenlinks (LinkedIn/Glassdoor/StepStone/…)
* [x] Fix für Wildcard-Route (Express): Fallback via `app.use`
* [x] ESLint/Prettier Konfiguration
* [X] Clipboard Export von Jobs
* [X] Export CSV von Companies

* [ ] REST-Korrekturen: Toggle/Delete via `POST/DELETE`, CSRF-Token
* [ ] Server-Validierung (z. B. `zod`) + Fehleranzeigen im UI
* [ ] Paginierung für Job-Liste
* [ ] Sortierbare Spaltenköpfe (Client)
* [ ] Prüfung: `contactId` gehört zur `companyId` beim Speichern
* [ ] Import (JSON/CSV) von Jobs/Companies

* [ ] Tests (Unit mit Vitest, E2E leichtgewichtig)
* [ ] Backup/Restore der `jobs.db` (z. B. ZIP-Download)
* [ ] Datei-Anhänge (z. B. PDF CV, Anschreiben) – lokal unter `/uploads`
* [ ] Aktivitäten/Timeline pro Job (Follow-ups, Termine)
* [ ] i18n (Deutsch/Englisch Umschaltbar)
* [ ] Barrierefreiheit (A11y-Audit, ARIA Feinheiten)
* [ ] Desktop-Bundle (Electron) für „echte“ App-Experience


## FAQ

**Warum SQLite?**
Robust, transaktionssicher, **eine Datei**, kein externer Server. Perfekt fürs private Hosting/offline.

**Warum Pug statt React?**
Schnell, leichtgewichtig, keine Build-Komplexität im Frontend nötig.

**Kann ich eigene Farben/Branding setzen?**
Ja – die Design-Tokens (CSS Variablen) stehen am Anfang von `public/styles/main.css`.

---

Viel Spaß beim Bewerbungen-Organisieren! 🎯
Wenn etwas holpert: Issue aufmachen – wir verbessern das in kleinen Iterationen.

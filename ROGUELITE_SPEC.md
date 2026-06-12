# ELF '26 — Roguelite-Modus ("Road to Glory") · SPEC

Zweiter Modus auf derselben Seite (Modus-Hub auf der Startseite). Nutzt die bestehende
Live-Match-Engine, Trikot-/Pitch-UI, FotMob-Noten, Tore/Assists, Mentalität.

## Klub-Erstellung
- Spieler benennt seinen Verein + wählt **1 Emoji-Wappen** aus einem Set von **15–20 coolen Emojis**
  (KEINE Smileys — eher 🦁🐺🦅🐉⚡🔥👑🛡️⚔️🌊🦈🐍🐂🦂☠️💎🚀🌪️🦇🐆 o.ä.).
- **Wappen beeinflusst die Trikotfarben** (jedes Emoji → eine Farbpalette).
- XI-Screen wie im WM-Modus.

## Spieler & Daten
- Spielerpool aus **4 Ligen**: Premier League, La Liga, Ligue 1, Bundesliga.
- KEINE feste Liga — **ein Pool aus vielen Klubs** dieser 4 Ligen.
- **Alle Teams pro Liga** mit **11 Startern + ein paar Ersatzspielern** (Ersatz spielen NICHT bei Gegnern,
  sind aber per Transfer „pullable").
- Jeder Spieler: **Rating + Potenzial**. **Junge Spieler = deutlich höheres Potenzial**
  (Bsp. Bouaddi/Lille ~84 Rating, Potenzial 92+). Potenzial muss nicht immer erreicht werden, aber möglich.
- Datenformat kompakt: `[name, rating, "POS", age]` je Spieler, gruppiert nach Klub; Potenzial wird
  altersbasiert abgeleitet (jung → großer Headroom; bekannte Talente extra).
- Klub-Meta: `{name, league, tier(1–4), kit{p,s,t}, players:[...]}`.
- **Tiers:** 1 = internationale Elite · 2 = stark · 3 = Mittelfeld · 4 = untere Hälfte.
  Kreative, sprechende Teamnamen für die Gegner-Generierung (siehe „Gegner").

## Start
- Man startet mit eher schlechteren Spielern (XI aus niedrigem Tier/Pool).

## Kern-Loop (Route, endlos)
- Vor jedem Spiel **3 zufällige Gegner-Teams** zur Auswahl.
- Nach **Sieg**: **3 Rewards**, davon 1 wählen.
- Route-Muster: ein paar Liga-Spiele → **Cup-Einladung** (annehmen/ablehnen) → nach Cup wieder Liga-Spiele.
- **Roadmap unten** mit Dots = Fortschritt (verschiebt sich, kein Ende).

## Gegner-Auswahl (Tiers)
- Pool aus den 4 Ligen. **Early Game nur Tier 3–4** (schwächer), Overall ~ wie die XI des Spielers.
- Später höhere Tiers. Sprechende Namen, die das Tier verraten.

## Rewards (nach Sieg, 1 von 3)
- **Transfer Pick (GARANTIERT immer als eine Option):** Fenster, das über ~5 s **5 Spieler** nach und nach
  enthüllt, die Interesse am Verein hätten → 1 wählen. **2 der 5 sind aus dem gerade besiegten Klub.**
  (Mit „Scouting Network" → **6 statt 5**.)
- Dazu **3 zusätzliche** mögliche Rewards (kreativ), z. B.:
  - **Energy Drink** → boostet einen Spieler für 1 Spiel.
  - **Potential Unlock** → Spieler auf Potenzial.
  - **Scouting Network** (Langzeit) → Transfer Picks zeigen 6 statt 5.
  - **Goalkeeper Aura** (Langzeit) → Torwart bekommt Power-ups/Bonus.
  - …weitere (Mentor, Masterclass, Catalyst-artig, etc.).
- **Cup-Abschluss** = sehr gute Rewards (ein bestimmtes starkes Power-up **+** ein **Elite-Player-Pick**).

## Cups (ca. 4–5, der Reihe nach vorgeschlagen)
- Mini-Cup 1–2 → Europa League → Champions League → **Final Cup**.
- Cup wirft direkt ins **Viertelfinale → Halbfinale → Finale**.
- **Invitation-Screen zeigt den Reward** für den Cup vorab.
- Abgelehnter Cup kommt nach **derselben Anzahl Spiele** erneut.
- **Final Cup (unablehnbar, nach gewonnenem CL-Finale):**
  - QF = Rematch gegen den im CL-Finale Besiegten
  - SF = **All-Star** (die besten Spieler im System)
  - Finale = **All-Star Full Potential** (höchste Potenziale, positionell korrekt)

## Entscheidungen
- **1–2 Entscheidungen** vor/nach einem Spiel (Non-Game-Phase).
- **Live jederzeit im Spiel** umstellbar:
  - **Philosophie:** Defensiv · Ausgewogen · Offensiv · All-In (HIDDEN-Werte, dem Spieler NICHT gezeigt):
    - Defensiv: eigene Chancen ↓, gegnerische ↓↓
    - Ausgewogen: neutral
    - Offensiv: eigene ↑, gegnerische ↑ (weniger)
    - All-In: eigene ↑↑, gegnerische ↑↑
  - **Fokus:** Außen · Zentrum · Ausgewogen (HIDDEN):
    - Außen: vergleiche **außen-offensiv** (AV, Flügel) vs **zentral-offensiv** (8/10/ST). Außen besser → mehr
      Torgefahr (Außenspieler höhere Torbeteiligungs-Chance); schlechter → negativ. Defensiv analog:
      **außen-defensiv** (AV) vs **zentral-defensiv** (6er/IV). Außen besser → bessere Verteidigung, sonst schlechter.
    - Ausgewogen (Standard): Gesamtwerte (Gesamt-Offensive/Defensive).
    - Zentrum: wie Außen, umgekehrt.
  - Diese Felder erzeugen **wahrscheinlichkeitsbasierte** Ausgänge → verhindert reines Gesamt-vs-Gesamt
    (so kann Ges 81 mal gegen Ges 85 gewinnen).

## In-Game-Screen
- Wie WM-Modus: **beide XIs** (eigene + Gegner) mit Werten, **gleicher Feed**, **Tore/Assists**, **FotMob-Noten**.
- **FotMob-Noten belohnen auch IV/Defensive** (Spiel zu null / wenig Gegentore = gute Noten für Defensive),
  nicht nur Scorer (Scorer aber auch). Realistische Bewertung.

## Balancing / Build-Qualität
- Korrektes Progressions-Design, sorgfältiges Balancing, mehrfaches Backtesting & Selbst-Hinterfragen,
  Überarbeiten — **erst dann „fertig" melden** (User-Vorgabe).

## Build-Status (Stand 2026-06-12)
Engine `rogue.js` (887 Z., IIFE → `window.ROGUE.start()`, eigener data-r/data-rslot-Listener) war bereits gebaut;
beim Session-Limit-Cut fehlte nur die Datenebene → `buildPool()`-Guard hat den ganzen Modus stillgelegt.
- [x] Spielerdaten **Premier League** (clubs_eng.js NEU erstellt, 20 Klubs) — war der fehlende Blocker
- [x] Spielerdaten **La Liga** (clubs_esp.js 7→20)
- [x] Spielerdaten **Ligue 1** (clubs_fra.js 6→18)
- [x] Spielerdaten **Bundesliga** (18, war komplett) — Σ 76 Klubs · 988 Spieler · je 13 · 0 Syntaxfehler
- [x] Modus-Hub (Home „Two roads to glory" → go-rogue) — verifiziert
- [x] Klub-Erstellung (18 Emoji-Wappen → Kit) — verifiziert
- [x] Run-State, Route/Roadmap, 3-Team-Wahl — verifiziert
- [x] Reward-System inkl. **Transfer-Pick-Reveal** (5 gestaffelt, 2 vom Gegner, Pool ∝ Gegner-OVR) — verifiziert
- [x] Decisions (50% p) + Philosophie/Fokus live (hidden PHIL-Multiplikatoren, prob. Outcomes) — vorhanden
- [x] Cups + Invitations + Final Cup (Revenge → WORLD ALL-STARS ★ → PEAK POTENTIAL XI ✦) — Code geprüft
- [x] FotMob-Noten Defensive-Belohnung (Zu-Null: IV/AV +0.9, GK +0.4+Paraden, CDM +0.45; 3+ GT Malus) — vorhanden
- [x] **Cups LIVE durchgespielt** — Copper komplett (QF→SF→F, Eskalation diff[1,2,3], Prämie Scouting Network greift, 🥉);
      UCL (3× Tier-1) → **Final Cup** verifiziert: Revenge → WORLD ALL-STARS ★ (OVR 91, Mbappé/Yamal/Bellingham) →
      PEAK POTENTIAL XI ✦ → Glory-Screen „IMMORTAL". Permadeath: Niederlage→Herz→„THE ROAD ENDS".
- [x] **BUG gefunden & gefixt:** `showFinalInvite` accept rief `refreshHub()` (No-Op bei Phase≠hub, nach Cup-Sieg ist Phase „match")
      → man hing am alten Match-Screen. Fix: `mountHub()`.
- [~] **Backtesting & Balancing** — Runde 1+2 (Monte-Carlo `__RG.sim`):
      progressive Gegner-Bänder (früh ~+4 Favorit ≈60% Sieg → spät ~+1 ≈43%, Cups hart);
      Risk/Reward (stärkerer Gegner → besseres Transfer-Fenster); Cup-Gegner-Dedup (kein Klub 2× pro Cup).
      OFFEN: Decision-Events live, Fokus-Effekt (außen/zentrum) quantifizieren, ggf. Feintuning nach User-Playtest.

## Cache / Deploy
- index.html cache-bust aktuell **v=14** — nach JEDER Asset-Änderung N bumpen.
- Desktop-Ordner `~/Desktop/ELF26/` ist STALE (alter WM-only Stand) — erst syncen, wenn User „updaten" sagt.

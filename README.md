# ELF '26 ⚽

A self-contained browser football game built around the **2026 FIFA World Cup** — no build step, no dependencies, just open it and play.

**▶ Play:** open `index.html`, or visit the GitHub Pages link (see below).

## Two modes

### 🌍 WM Draft *(Sete-a-Zero style)*
Roll nations (FIFA-weighted, 3 rerolls), draft your **XI + a coach** from the **real 26-man 2026 World Cup squads**, set a formation and mentality, claim power-ups and squad stats, then play a **live tournament** — group stage with a standings table, knockouts on a live match screen with commentary, goals, assists, cards and penalty shootouts. Players carry FotMob-style match ratings and grow toward their potential between games.

### 👑 Glory Road *(club roguelite)*
Found a club (name + an emoji crest that sets your kit), casino-spin a starting XI of nobodies **plus one young star to build around**, and climb an endless road through four real leagues (Bundesliga · La Liga · Ligue 1 · Premier League — **76 clubs, ~990 players, 2025/26 squads**).

- Pick 1 of 3 opponents before each match; coach live with **Philosophy** (Park the Bus → All-In) and **Focus** (Wings / Centre).
- Win → a **transfer window** opens (sign interested players, 2 from the club you just beat) + pick 1 of 3 rewards.
- Survive cups — **Copper → Silver → Europa League → Champions League → the Final Cup** (beat the World All-Stars and a Peak-Potential XI to become **IMMORTAL**).
- **3 hearts. Permadeath.** How far can you go?

## Tech
Plain vanilla JavaScript, HTML and CSS. No frameworks, no build, no network calls — everything runs client-side.

| File | Role |
|------|------|
| `index.html` | entry point |
| `data.js` | config: WC nations, formations, weights, power-ups, tuning |
| `rosters.js` | the 48 official 2026 World Cup squads |
| `clubs_{bun,esp,fra,eng}.js` | the four league club datasets (Glory Road) |
| `game.js` | WM Draft engine + UI |
| `rogue.js` | Glory Road engine + UI |
| `styles.css` | all styling |

## Run locally
Just open `index.html` in any modern browser. (Or serve the folder, e.g. `python3 -m http.server`.)

---
*Fan project — squads and ratings are approximations for gameplay, not official data.*

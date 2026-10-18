# Quickstart & Validation: Crew Jobs

**Feature**: `006-crew-jobs` | Contracts: [level-and-jobs](./contracts/level-and-jobs.md),
[play-ui](./contracts/play-ui.md), [new-apis](./contracts/new-apis.md)

## Prerequisites

You need a current desktop Chrome, Edge or Firefox. There is nothing to install. Open
`index.html` for the game and `tests/index.html` for the tests.

## 1. Automated tests

The summary must read `N passed, 0 failed`. Every feature-005 suite still passes; legacy
inline levels use the one-crew `general` shortcut (research R10).

| Suite | Proves |
|---|---|
| `domain/jobs.test.js` (new) | the match table from research R7; every kind has a Best job; `repairSeconds` (Best = base, Can help = 2×, repair advantage on its Best kind); `repairPoints` (points advantage, right-crew bonus only for Best) |
| `domain/incident-kinds.test.js` (new) | four kinds; target rules accept lightpoles for `streetlight`, `water_a` for `pump`, and refuse a house as a `pump` or a pump station as a `building` |
| `domain/level-checks.test.js` (extended) | `crews` rules 1–7 in contracts/level-and-jobs.md, including "a kind with no Best crew" and "target not reachable from any Best crew"; the legacy format still passes |
| `application/crew.test.js` (extended) | the crew takes its speed from its job; `status()` names |
| `application/round.test.js` (extended) | several crews move at once; `send(inc, crew)` refuses Can't-fix crews and repairing crews; sending a second crew releases the first; a redirect puts the old incident back to `new`; Can-help repairs take 2× and give no bonus; Best repairs add `rightCrewBonus`; advantages apply; `dispatchOptions` (badges, ETA from the route, reasons, freeIn); `bestCrewFor` ordering; `warnScale` shortens urgency |
| `application/level-run.test.js` (extended) | `select` pre-picks the best crew; `pickIndex`; `arm`/`clickIncident` sends the armed crew; a Can't-fix click emits `refused` and stays armed; Esc/empty click disarms; the armed crew is disarmed when it starts repairing; repairing crews can't be armed |
| `application/hints.test.js` (extended) | the new step-2 text; `{target}` filled in |
| `adapters/job-art.test.js` (new, replaces vehicle-art) | the vehicle file per job and facing; portraits; glyphs for all four kinds; `imagePathsFor` covers every crew |
| `architecture.test.js` (extended) | the new modules are listed in their layers |

## 2. Playtest checklist (manual)

**US1 — choose the right crew**

1. Press Play → the crew bar shows 4 cards (portrait, icon, "Job — Leader", `ready`) and the
   first hint appears.
2. Open the first incident (a cracked road) → the panel lists 4 crews: Road Crew **BEST**,
   Builders and Drainage **CAN HELP**, Electricians **CAN'T FIX**. Road Crew is pre-picked
   and its row shows `arrives Ns · repair 4s`.
3. Press Enter → the orange pickup drives off. When the repair is done, the pop reads
   `+N · Right crew!`.
4. Open a streetlight incident, press `2` (Builders, Can't fix) → Send is disabled and reads
   "Can't fix".
5. Send two crews to different incidents at once → both drive, repair and return
   independently.

**Crew-first**

6. Click the Electricians card → it is outlined, and pins for road, roof-only and pump
   incidents that it can't fix are dimmed.
7. Click a dimmed road pin → a toast says "Electricians can't fix Road cracked", and the crew
   stays armed.
8. Click a streetlight pin → the van leaves and the card is no longer armed.
9. Arm a crew, then press Esc or click empty grass → it is disarmed.

**US2 — kinds and clusters**

10. Play a full round → all four kinds appear with their own glyphs (⚠ ⌂ 💡 💧), and each
    target looks normal again after repair.
11. In Downpour, two streetlights fall close together → opening the second shows
    "Best crew (Electricians) free in Ns", and Drainage/Builders show as CAN HELP or
    CAN'T FIX accordingly.
12. Send a CAN HELP crew → its repair ring fills over 2× the base time, and the pop has no
    "Right crew!".

**US3 — advantages and guide**

13. Press `?` on the crew bar → the game pauses and How to Play opens with the Crew guide
    table, matching research R7. Back returns to the pause menu.
14. Send the Road Crew and the Builders along similar routes → the pickup clearly arrives
    first.

**Balance and regressions**

15. A best-crew-always round (scripted or careful play) → the condition drops below 90 % at
    least once (SC-004a), and the goal of 10 can be reached.
16. Pause, Retry and Main menu → every crew is back at its depot after Retry or Main menu,
    and frozen while paused.
17. `?map=sample-city` still opens free look, `?edit=1` still opens the decorator, and the
    feature-005 playtest steps (with "the truck" read as "a crew") still pass.
18. During Peak storm with 6 active incidents and 4 crews moving, the game stays at a steady
    60 FPS.

## 3. Tuning

Edit the job numbers in `js/domain/jobs.js` and the level numbers in `levels/trial.js`
(`warnScale`, `rightCrewBonus`, the schedule and the stars), then reload. Level mistakes show
as `[level] …` in the console and the map opens in free look.

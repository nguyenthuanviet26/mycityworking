# Quickstart & Validation: Trial Level

**Feature**: `005-trial-level` | Contracts: [level-definition](./contracts/level-definition.md),
[play-ui](./contracts/play-ui.md), [new-apis](./contracts/new-apis.md)

## Prerequisites

- A current desktop Chrome, Edge or Firefox. Nothing to install and no build step.
- Open the files directly (double-click), or serve the repository folder from any static host.

## 1. Automated tests

Open `tests/index.html`. The summary must read `N passed, 0 failed`. The new suites are:

| Suite | Proves |
|---|---|
| `domain/route.test.js` | shortest route over road/bridge only; never crosses grass/water/buildings; `[]` when already there; `null` when unreachable; the same route every call |
| `domain/level-checks.test.js` | a small inline level passes; each rule in contracts/level-definition.md is reported (unreachable target, bad kind, unsorted schedule, slower phase, two tutorials …) |
| `application/crew.test.js` | moves at its speed; facing matches each step; arrives on a work tile; redirect continues from the next tile; can't be sent while repairing; returns home |
| `application/round.test.js` | release at `at`; phase limits hold entries back; damaged/normal variants switch; urgency after `warnS`; tutorial protection until sent; drain per urgent incident; refill +5/+8 capped at 100; early bonus; phase events at 60 s / 150 s; goal keeps the round going; "cleared" → win/lose; "collapsed" before/after goal; same-moment goal wins; stars; pause = no `update` → no change |
| `application/hints.test.js` | order of steps; one at a time; skip stops all; step 1 skipped if sending first |
| `application/level-run.test.js` | menu→playing starts a round; result→playing (retry) restarts with the same schedule, full meter and zero score; paused→playing keeps state; →menu drops the round and restores the map; `finish` dispatched at the end; skip survives retry |
| `application/screens.test.js` (extended) | `finish`, `retry`, `toMenu` from result; Esc ignored on result |
| `application/rain.test.js` (extended) | `setIntensity` changes the active count; only active drops move |
| `adapters/vehicle-art.test.js` | four facings map to existing file names |
| `architecture.test.js` (extended) | the new modules are listed in their layers and respect the dependency rule |

## 2. Playtest checklist (manual)

> Since feature 006 the single truck is replaced by four crews; read "the truck" as "a crew"
> and see [specs/006-crew-jobs/quickstart.md](../006-crew-jobs/quickstart.md). The goal is now
> 10 repairs and the schedule has 18 incidents.

Run with `index.html` (menu on). Each line gives a step and its expected result.

**P1 — core loop (US1)**

1. Press **Play** → the trial city appears under light rain; the HUD shows `Drizzle`, `4:00` counting down, `0 / 6`, 100 %.
2. Within about 3 s → a road tile turns cracked and a yellow `!` pin appears; hint 1 points at it.
3. Click the pin → the panel shows "Road cracked", and **Send crew** is enabled; hint 2 points at the button.
4. Click **Send crew** → the truck leaves within 0.5 s, stays on roads, turns at junctions, crosses the bridge if needed, and always faces its direction of travel.
5. Pan so a building is in front of the truck's path → the truck goes behind buildings in front of it and in front of buildings behind it.
6. On arrival → a progress ring fills over about 4 s. When it is full, the road looks normal again, the pin is gone, the score goes up, and the meter flashes `+8%` (it stays at 100 %).
7. The truck drives back to the garage.

**P2 — phases, win/lose (US2)**

8. Ignore one incident for longer than its warning time → its pin turns red with `!!`, and the meter starts dropping.
9. At 3:00 left → a `Downpour!` banner shows, the rain gets heavier, and up to 3 pins can be active at once. At 1:30 left → `Peak storm!`, the heaviest rain, and up to 4 active.
10. While driving, open another incident → the button reads **Redirect crew**, and the truck turns onto a new route from its next tile.
11. While repairing, open another incident → the button reads **Crew busy — free in Ns** (disabled).
12. Reach 6 repairs → the `Goal reached!` banner shows and play continues; the count shows ✓.
13. Let the storm run out → the rain stops, `Storm cleared` shows, and the **Level complete** card appears with 1–3 stars, the repaired count, time and score.
14. **Retry** → a fresh round (`4:00`, 100 %, 0 pts, the same first incident at the same place).
15. Play again and ignore everything → the meter empties, and the **Level failed** card appears with the reason.
16. Press Esc mid-round, wait 10 s, then resume → the timer, truck, repair ring and meter continue exactly where they stopped.
17. Switch to another browser tab for 10 s mid-round, then come back → the game is on the pause menu with nothing advanced.
18. On the result card press **Main menu** → the CaptAIn menu shows with the drifting city and light rain, and the map shows no damage left over from the round.

**P3 — hints (US3)**

19. A new round, following only the hints → the first repair is completed within 60 s.
20. Wait without sending the crew to the first incident → it never turns red, even after the 60 s Drizzle phase.
21. Click **Skip hints** → no more hints, and still none after **Retry**.

**Regressions (FR-025, SC-007)**

22. `index.html?menu=0` → the level starts at once.
23. `index.html?map=sample-city` → the sample city opens in free look with no HUD and no incidents.
24. `?dev=1` overlays, drag/wheel/keys/Home, and `?edit=1` (decorator) all work as before.
25. Run the 002 main menu and 004 decorator playtest checklists; the only expected difference is that Play now opens the trial level.
26. Watch the frame rate (DevTools Performance) during Peak storm with 4 active incidents and the truck moving → it holds a steady 60 FPS.

## 3. Tuning the level

Edit the numbers in `levels/trial.js` (see research R12) and reload `index.html`. The game
checks the level at boot with `MCW.checkLevel`. If something is wrong, the console shows
`[level] …` warnings and the map opens in free look instead of the level. (The test page does
not load map or level files, by the rule in `architecture.test.js`.)

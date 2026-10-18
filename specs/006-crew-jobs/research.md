# Research: Crew Jobs

**Feature**: `006-crew-jobs` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

This feature builds on feature 005 (trial level). The stack, test harness, layers and frame
loop stay the same, and the Technical Context has no open unknowns. The decisions below cover
what changes.

## R1 — Where jobs live

**Decision**: Add a new **domain** module `js/domain/jobs.js` holding `MCW.jobs`, keyed by job
id. Each job has:

- `name`;
- `speed` (tiles per second);
- `match` (damage kind → `"best" | "help" | "none"`);
- `advantage` (`{ type: "speed" | "repair" | "points", kind?, factor }`).

Pure helpers sit next to them:

- `MCW.matchLevel(jobId, kindId)`;
- `MCW.repairSeconds(job, kind, match)`, which returns base × 2 for `help` (Clarification 1)
  and base × factor for a `repair` advantage on the job's Best kind;
- `MCW.repairPoints(job, kind, match, level)`.

Vehicle pictures, job icons and leader portraits are **not** in the domain. They go in an
adapter, `js/adapters/art/job-art.js` (Principle VII).

**Rationale**: FR-002/FR-003 say the jobs are data a teammate can rebalance. Keeping the rules
next to the data makes the 2×, bonus and advantage maths unit-testable on the test page.

**Alternatives considered**:

- Jobs inside the level file. Rejected: jobs are game rules shared by future levels, while the
  level only says *which* crews it uses.
- Jobs as subclasses of `Crew`. Rejected: the jobs differ only in data (Principle V).

## R2 — Damage kinds and their targets

**Decision**: Extend `MCW.incidentKinds` to four kinds. Each kind has a target rule that the
level checker validates. The two existing kinds keep their feature-005 numbers:

| id | label | target | repairS | warnS | points |
|---|---|---|---|---|---|
| `road` | Road cracked | road or bridge tile | 4 | 25 | 100 |
| `building` | Roof damaged | object of kind `building`, except pump stations | 6 | 30 | 150 |
| `streetlight` | Streetlight down | object type `lightpole_a`/`lightpole_b` | 3 | 25 | 100 |
| `pump` | Pump station failing | object type `water_a`/`water_b` | 7 | 34 | 200 |

The "about 30 % shorter" warnings (FR-006a) come from a new level field, `warnScale` (default
1; the trial level uses 0.7). The round uses `kind.warnS × level.warnScale`, so the warnings
are 17.5 / 21 / 17.5 / 23.8 s in the trial level. Feature-005 tests keep their timings
unchanged, and the level owns its difficulty.

Each kind gets an `objectTypes` list (or `objectKind` + `excludeTypes`) and the checker uses
it. Every target type already has damaged art (`hasDamaged: true`).

**Rationale**: FR-005 asks for four kinds using existing art only, and the checker catches a
streetlight scheduled on a house.

## R3 — Many crews in a round

**Decision**: `Round` replaces its single `crew` with `crews`, an ordered array of
`MCW.Crew`, one per entry in `level.crews`. `Crew` gains `id`, `jobId`, `leader` and
`portrait` fields, and takes its speed from the job. Movement code is unchanged.

Each incident gains:

- `crewId`, the crew assigned or repairing;
- `match`, the match level of that crew.

The rules for sending:

- `Round.send(incidentId, crewId)` refuses when the crew's match is `none`, when the crew is
  repairing, or when that crew is already assigned there.
- Sending crew B to an incident that crew A has releases A: A goes home (FR-010).
- Redirecting B away from incident X puts X back to `new`.

Repair progress is kept per incident and uses `repairSeconds`.

**Rationale**: FR-004 says crews act independently. Each crew already owns its own route and
movement, so `Round` only has to loop over them.

**Alternatives considered**: A separate dispatcher object. Rejected for now: `Round` already
owns the incident/crew relationship, and splitting it would add an indirection with no
present need.

## R4 — Dispatch options (the crew list in the panel)

**Decision**: `Round.dispatchOptions(incidentId)` returns, for each crew in bar order:

- `crewId` and `match`;
- `status` (`ready | driving | repairing | returning`);
- `etaS` (route length from the crew's current tile ÷ speed; `null` if `match === "none"`);
- `repairS` and `sendable`;
- `reason` when the crew can't be sent: `"Can't fix"`, `"Busy repairing"` or `"Already on
  the way"`;
- `freeInS` while the crew is repairing.

`Round.bestCrewFor(incidentId)` picks the crew to pre-select (FR-008), in this order:

1. sendable Best crews that are free (`ready` or `returning`), nearest first;
2. sendable Best crews that are `driving`, nearest first;
3. the same two steps for `help` crews;
4. otherwise `null`.

`LevelRun` recomputes the options when the selection changes and then every 250 ms while the
panel is open. That is about 4 BFS runs on a 20×20 map each time, well under a millisecond, so
there is no per-frame cost (Principle IV).

**Rationale**: FR-007, FR-008 and FR-011, plus SC-002. A deterministic tie order (nearest,
then bar order) keeps the pre-selection testable.

## R5 — Crew-first dispatch (arming)

**Decision**: `LevelRun` holds two fields:

- `pickedCrew`, the crew highlighted in the open panel;
- `armedCrew`, the crew armed from the crew bar.

How it behaves:

- `arm(crewId)` refuses a crew that is repairing.
- Arming the armed crew again disarms it.
- `clickIncident(id)`:
  - with no crew armed, it selects the incident (panel flow);
  - with a crew armed and a match that isn't `none`, it sends the crew and then disarms;
  - with a crew armed and match `none`, it emits `refused` with a short message and stays
    armed.
- `select(null)` (clicking empty map) and Esc disarm.
- The armed crew disarms itself on that crew's `arrive` event (FR-009a edge case).

Number keys 1–4 pick a crew when the panel is open and arm one when it isn't. `LevelLayer`
greys out the pins of incidents the armed crew can't fix.

**Rationale**: This implements Clarification 3, and all the flow lives in the application
layer where it can be tested.

## R6 — Scoring with jobs

**Decision**:

- **Points**:
  - start from `kind.points`;
  - × `advantage.factor` when the job's advantage is `points` on this kind (Builders: 1.5 on
    roofs);
  - \+ `level.rightCrewBonus` (starting guess 40) when the match is `best`;
  - \+ `level.earlyBonus` when the repair is early (as before).
- **Refill**: unchanged (+8 for an early repair, +5 otherwise).
- **Event**: `repaired` carries `{ incident, crewId, match, points, refill, early, rightCrew }`.

**Rationale**: FR-012, FR-013, FR-014 and Clarification 1 (a "Can help" crew gets no bonus,
but its points, early bonus and refill are unchanged).

## R7 — Starting job table

| Job | Leader (portrait) | Vehicle (adapter) | Speed | Best | Can help | Advantage |
|---|---|---|---|---|---|---|
| `road` Road Crew | Minh (`char_a`) | `pickup_orange` | 4.0 | road | — | fastest vehicle |
| `builders` Builders | Hoa (`char_b`) | `box_red` | 2.5 | building | road | ×1.5 points on roofs |
| `electric` Electricians | Linh (`char_c`) | `van_white` | 3.5 | streetlight | building, pump | ×0.6 repair time on streetlights |
| `drainage` Drainage Team | Tuan (`char_a`) | `truck_green` | 3.0 | pump | road | ×0.7 repair time on pump stations |

This matches the spec's Assumptions table:

- Road Crew: Best at road, nothing else.
- Builders: Best at building, can help with road.
- Electricians: Best at streetlight, can help with building and pump.
- Drainage Team: Best at pump, can help with road.

Every kind has exactly one Best job, and the four advantages differ (FR-014). The leader name
and portrait live in the level data (`level.crews`); the portrait key maps to a file in the
adapter.

## R8 — Level rebalance (Clarification 2)

**Decision**: The level-data changes:

- `levels/trial.js` gets a `crews` list (job, leader, portrait, depot) in place of the old
  `depot`/`crew` fields;
- `target: 10`, phases with `maxActive` 3 / 4 / 6, `warnScale: 0.7` and `rightCrewBonus: 40`;
- the star scores are re-tuned to 2★ at 1900 and 3★ at 2600.

The 18-entry schedule:

- **Drizzle (0–60 s)**: 3 entries — road (tutorial), streetlight, roof.
- **Downpour (60–150 s)**: 7 entries — all four kinds, with **cluster 1**: two streetlights
  2 s apart.
- **Peak storm (150–240 s)**: 8 entries — all four kinds, with **cluster 2**: two pump/road
  incidents 3 s apart and two roofs 4 s apart.

The phase paces work out to 0.05, 0.078 and 0.089 incidents per second, which keeps the
checker's "not slower" rule.

`maps/trial.js` gains the targets the new kinds need:

- a named pump station `water_a` (`id: "pump"`) beside the east road;
- four named streetlights: the existing two lightpoles plus two new ones (`id: "light-1"` to
  `"light-4"`), each beside a road.

The crews' depots are four road tiles around the garage.

`checkLevel` adds these rules for `crews`:

- 1 to 6 crews, with unique ids;
- every job must be known;
- every depot must be passable;
- every scheduled kind needs a Best crew in the level;
- every target must be reachable from at least one Best crew's depot.

These replace the old single-`depot` rule.

**Rationale**: FR-006, FR-006a, FR-006b, SC-004 and SC-004a. An auto-play check, a scripted
best-crew bot like the one used for feature 005, verifies that the condition dips below 90 %
and that clusters make a best crew busy.

## R9 — Presentation

- **Crew bar** (DOM, bottom-left): one card per crew showing the portrait, job icon, "Job —
  Leader", status text and a ⌖ find button. A click arms the crew, a double-click or ⌖
  glides the camera to it, and an armed crew is outlined.
- **Panel crew list** (DOM): one row per crew with the badge (**Best** green / **Can help**
  amber / **Can't fix** grey, as text and not only colour), status, `arrives in Ns · repair
  Ns` or the reason, and a radio-style highlight for the picked crew. The Send button reads
  "Send <Job>".
- **Pins** (canvas): a per-kind glyph (road ⚠, roof ⌂, streetlight 💡, pump 💧), drawn at
  35 % opacity when a crew is armed and can't fix the incident.
- **Crews on the map** (canvas): one depth-sorted drawable per crew, using `job-art`
  vehicles.
- **Crew guide** (DOM): built from `MCW.jobs` and `job-art` into a section of How to Play. The
  crew bar's "?" button pauses the game and opens How to Play, so the existing screens are
  reused (FR-015).
- **"Right crew!"**: the `+N` pop shows "· Right crew!" when the repair has `rightCrew`.
- **Hints**: step 2 becomes "Pick the crew marked Best, then Send". The goal text uses the
  level target, `{target}`, instead of a fixed 6.

**Rationale**: FR-007, FR-009, FR-015 and FR-017. Badges are text plus colour for
accessibility.

## R10 — Migration of feature 005 code and tests

**Decision**:

- **Single crew → crews**: everything that read `round.crew` (`LevelLayer`, `HUD`, `LevelRun`
  hints, tests) now reads `round.crews`.
- **`send`**: `round.send(id)` without a crew id still works and sends the pre-selected best
  crew. That keeps the feature-005 tests valid with minimal edits; their inline levels get a
  one-crew `crews` list.
- **Old level format**: the feature-005 fields `depot` and `crew.speed` are still accepted by
  `checkLevel` and `Round` as a one-crew shortcut: a single crew of the hidden job `general`.
  That job is Best at every kind, has no advantage, and uses the given speed, so the old
  inline test levels, which damage roads *and* buildings, behave exactly as before. `general`
  is never shown in the crew guide. The real trial level uses `crews`.

**Rationale**: Principle I (always playable) and SC-006 (existing tests keep passing). The
shortcut is about 5 lines and means no feature-005 test is rewritten just to change its
format.

## R8 addendum — Balance check results (T027, 2026-10-18)

A headless bot played the real trial level (`levels/trial.js`, `maps/trial.js`) through `Round`.
The first schedule (clusters of two lights and two roofs, drain 1.2) was too easy: the bot that
always sends the right crew straight away never lost any condition. Changes made:

- **Cluster 2** is now three roofs **far apart**: hospital (east), apartments (west) and pizza
  (north), at 155, 157 and 159 s. The slow Builders can't reach all three in time.
- **`drainPerUrgentPerS`** went from 1.2 to **1.8**. `warnScale` stays at **0.7** (FR-006a);
  0.5 also worked, but it cuts warnings by 50 % rather than 30 %.
- **Stars** are now **[3000, 4200]**.

| Bot | Won | Repaired | Score | Stars | Lowest condition | Moments the Best crew was busy |
|---|---|---|---|---|---|---|
| Always the Best crew, at once (SC-004a) | yes | 18/18 | 4445 | 3 | **89 %** | 3 |
| Best crew, or a helper when it's busy | yes | 18/18 | 4330 | 3 | 90 % | 5 |
| Sends 5 s after each incident appears | yes | 18/18 | 4330 | 3 | 81 % | 5 |
| Sends 8 s after | yes | 17/18 | 3965 | 2 | 57 % | 5 |
| Sends 12 s after | yes | 17/18 | 3965 | 2 | 48 % | 5 |

SC-004 (≥ 2 busy moments) and SC-004a (< 90 %) hold. A slow player still wins, while a quick
one earns the third star. Human playtests (T034) should confirm the feel.

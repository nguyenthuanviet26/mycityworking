# Data Model: Trial Level

**Feature**: `005-trial-level` | **Date**: 2026-10-18 | **Research**: [research.md](./research.md)

All entities are plain JavaScript objects in the domain and application layers. They hold no
pictures, DOM or timers. Times in level data are in **seconds**; `update` takes **milliseconds**
(as elsewhere in the game).

## Level definition *(data file, `levels/trial.js`)*

The full format is in [contracts/level-definition.md](./contracts/level-definition.md).

| Field | Type | Rule |
|---|---|---|
| `id` | string | unique, e.g. `"trial"` |
| `name` | string | shown in the HUD, e.g. `"Trial: First Storm"` |
| `map` | string | id of a registered map |
| `depot` | `[col,row]` | a vehicle-passable tile; the crew starts and returns here |
| `startView` | `{zoom, center:[x,y]}` | optional; default is the depot at zoom 1 |
| `crew` | `{speed}` | tiles per second, > 0 |
| `target` | int | repairs needed, 1 ≤ target ≤ schedule length |
| `phases` | Phase[3] | exactly 3, in order Drizzle → Downpour → Peak storm |
| `schedule` | ScheduleEntry[] | sorted by `at`; every `at` < total phase length |
| `drainPerUrgentPerS` | number | ≥ 0 |
| `refill` | `{normal, early}` | 0–100, `early ≥ normal` |
| `earlyBonus` | int | ≥ 0 |
| `stars` | `[two, three]` | score thresholds, `two ≤ three` |

### Phase

| Field | Type | Rule |
|---|---|---|
| `name` | string | `"Drizzle"`, `"Downpour"`, `"Peak storm"` |
| `durationS` | number | > 0 |
| `maxActive` | int | ≥ 1; never lower than the previous phase |
| `rain` | number | 0–1; higher than the previous phase |

The storm length is the sum of the three `durationS` values (FR-004c). A phase's **pace** is
`entries in phase ÷ durationS`, and it must not be lower than the previous phase's pace
(FR-004a; checked by `checkLevel`).

### ScheduleEntry

| Field | Type | Rule |
|---|---|---|
| `at` | number | seconds from round start |
| `kind` | string | key of `MCW.incidentKinds` |
| `tile` | `[col,row]` | for `road` kinds: a road or bridge tile |
| `object` | string | for `building` kinds: id of a named map object with damaged art |
| `tutorial` | bool | optional; at most one entry, and it must be the first |

An entry has exactly one of `tile` / `object`, and the target must be reachable by road from
`depot` (US1 scenario 7).

## Incident kind *(domain, `js/domain/incident-kinds.js`)*

| Field | Type | Example |
|---|---|---|
| `id` | string | `"road"` / `"building"` |
| `label` | string | `"Road cracked"` / `"Roof damaged"` |
| `targets` | `"tile"` \| `"object"` | |
| `repairS` | number | 4 / 6 |
| `warnS` | number | 25 / 30 |
| `points` | int | 100 / 150 |

## Incident *(application, created by `Round`)*

| Field | Type | Notes |
|---|---|---|
| `id` | string | `"inc-<n>"`, n = schedule index |
| `kind` | IncidentKind | |
| `target` | `{tile:{col,row}}` or `{object:id}` | |
| `footprint` | `{col,row,w,h}` | 1×1 for tiles |
| `workTiles` | `{col,row}[]` | vehicle-passable tiles beside the footprint (research R3) |
| `centre` | `{x,y}` | map position for the marker and the camera jump |
| `tutorial` | bool | |
| `releasedAt` | number | round seconds |
| `state` | see below | |
| `crewSent` | bool | true once a crew has been sent to it (even if later redirected) |
| `progress` | 0–1 | repair progress |

### Incident states

```text
            release (slot free, target free)
 waiting ───────────────────────────────▶ new
                                           │ crew assigned
           warnS passed (not tutorial-     ▼
           protected, not repairing)   assigned ──crew arrives──▶ repairing ──repairS──▶ repaired
 new ──────────────────────────▶ urgent    │                         │
 assigned ─────────────────────▶ urgent    │ crew redirected         │ (never becomes urgent
                                           ▼                         │  while repairing)
                                      new / urgent (keeps urgency)
```

- `urgent` is a flag that combines with `new`/`assigned`/`repairing`: an urgent incident
  that is being repaired stays urgent (and keeps draining) until it is repaired.
- Releasing switches the target to `damaged` (`map.setTileVariant` / `map.setObjectVariant`).
  Repairing switches it back to `normal` (FR-005).
- A repair counts as **early** when the incident never became urgent.

## Crew *(application, `js/application/crew.js`)*

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | number | map position (the tile centre while standing) |
| `tile` | `{col,row}` | the tile it is on, or heading into while moving |
| `facing` | `"NE"\|"SE"\|"SW"\|"NW"` | starts as `"SE"` |
| `state` | `idle` \| `driving` \| `repairing` \| `returning` | |
| `route` | `{col,row}[]` | remaining tiles |
| `incidentId` | string \| null | the incident it is driving to or repairing |
| `speed` | number | tiles per second |

```text
idle ──send──▶ driving ──arrive──▶ repairing ──done──▶ returning ──arrive──▶ idle
  ▲              │  ▲                                     │
  │              └──┘ send (redirect)                     │ send
  │                                                       ▼
  └──────────────── (already on a work tile) ──────── driving
```

`canSend()` is true in `idle`, `driving` and `returning`, and false in `repairing` (FR-013).

## Round *(application, `js/application/round.js`)*

| Field | Type | Notes |
|---|---|---|
| `elapsed` | number | seconds |
| `duration` | number | total of the phase lengths |
| `phaseIndex` | 0–2 | |
| `condition` | 0–100 | starts at 100 |
| `score` | int | |
| `repaired` | int | |
| `goalReached` | bool | |
| `incidents` | Incident[] | active only |
| `queue` | index | next schedule entry not yet released |
| `crew` | Crew | |
| `over` | bool | |
| `result` | null \| Result | |

**Events** (emitter): `release`, `urgent`, `assigned`, `arrive`, `repaired`
`{incident, points, refill, early}`, `phase` `{index, name}`, `goal`, `cleared`, `end` (Result).

### Result

| Field | Type |
|---|---|
| `won` | bool |
| `reason` | `"cleared"` \| `"collapsed"` |
| `repaired` | int |
| `target` | int |
| `timeS` | number (elapsed seconds at the end) |
| `score` | int |
| `stars` | 0–3 (0 on a loss) |

## Hints *(application, `js/application/hints.js`)*

| Field | Type | Notes |
|---|---|---|
| `steps` | Step[] | fixed list from contracts/play-ui.md §Hints |
| `index` | int | next step to show |
| `current` | Step \| null | the step on screen |
| `skipped` | bool | survives Retry (owned by `LevelRun`) |

`Step = { id, text, showOn: eventName, clearOn: eventName, anchor: "incident"|"send"|"crew"|"hud" }`.
A step shows when its `showOn` event happens (and the previous step has cleared), and it
clears on its `clearOn` event. The last step clears after 5 s.

## LevelRun *(application, `js/application/level-run.js`)*

Owns one `Round` at a time plus `Hints`. It listens for `ScreenMachine` changes (research R7),
exposes `selectIncident(id)`, `sendCrew()`, `skipHints()` and `rainIntensity()`, and
re-emits round events for the adapters.

## Screen states *(application, `js/application/screens.js`)*

Additions to the existing table:

| From | Action | To |
|---|---|---|
| `playing` | `finish` | `result` |
| `result` | `retry` | `playing` |
| `result` | `toMenu` | `menu` |

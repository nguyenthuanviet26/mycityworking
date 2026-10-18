# Data Model: Crew Jobs

**Feature**: `006-crew-jobs` | **Date**: 2026-10-18 | **Research**: [research.md](./research.md)

This feature extends the feature-005 model
([../005-trial-level/data-model.md](../005-trial-level/data-model.md)). Only the parts that are
new or changed are listed here. All entities are plain data in the domain and application
layers.

## Job *(domain, `js/domain/jobs.js`)*

| Field | Type | Rule |
|---|---|---|
| `id` | string | `road`, `builders`, `electric`, `drainage` (+ the hidden `general`) |
| `name` | string | "Road Crew", "Builders", "Electricians", "Drainage Team" |
| `speed` | number | tiles per second, > 0 |
| `match` | `{ [kindId]: "best" \| "help" \| "none" }` | a missing kind counts as `"none"` |
| `advantage` | `{ type: "speed" \| "repair" \| "points", kind?, factor, text }` | `text` is the one-line description for the Crew guide |
| `hidden` | bool | only `general` (the legacy one-crew shortcut) |

Helpers (pure):

- `matchLevel(jobId, kindId)` → `"best" | "help" | "none"`.
- `repairSeconds(job, kind, match)`:
  - `kind.repairS × 2` for `help`;
  - `× advantage.factor` when the advantage is `repair` on this kind and the match is `best`.
- `repairPoints(job, kind, match, level)`: `kind.points`, multiplied by `advantage.factor`
  when the advantage is `points` on this kind and the match is `best`, plus
  `level.rightCrewBonus` when the match is `best`. Rounded to a whole number.

Rule (checked by `checkLevel`): every damage kind in a level's schedule has at least one crew
in the level whose job is `best` at it.

## Incident kind *(domain, `js/domain/incident-kinds.js`, extended)*

There are new kinds `streetlight` and `pump` (research R2), and every kind gains a target
rule:

| Field | Type | Notes |
|---|---|---|
| `targets` | `"tile"` \| `"object"` | as before |
| `objectTypes` | string[] | optional; allowed object types (`streetlight`: lightpoles; `pump`: `water_a`/`water_b`) |
| `objectKind` | string | optional; the allowed object kind (`building`) |
| `excludeTypes` | string[] | optional; types excluded from `objectKind` (`building` excludes `water_a`/`water_b`) |
| `icon` | — | **not here**: pin glyphs live in the adapter (`job-art.js`) |

## Level definition *(changed, `levels/trial.js`)*

| Field | Type | Rule |
|---|---|---|
| `crews` | CrewEntry[] | 1–6 entries; replaces `depot` + `crew` (which are still accepted as a one-crew shortcut) |
| `warnScale` | number | > 0, default 1; multiplies every kind's `warnS` |
| `rightCrewBonus` | int | ≥ 0 |
| `target` | int | now 10 in the trial level |
| everything else | | as in feature 005 |

### CrewEntry

| Field | Type | Rule |
|---|---|---|
| `id` | string | unique within the level, e.g. `"road"` |
| `job` | string | a key of `MCW.jobs` (not `general`) |
| `leader` | string | display name, e.g. `"Linh"` |
| `portrait` | string | `"char_a" \| "char_b" \| "char_c"`, mapped to a picture by the adapter |
| `depot` | `[col,row]` | a vehicle-passable tile |

## Crew *(application, `js/application/crew.js`, extended)*

New fields: `id`, `jobId`, `leader`, `portrait`. `speed` comes from the job. The state machine
is unchanged (idle → driving → repairing → returning → idle). The `status` shown to the player
is `ready` for `idle`, otherwise the state name.

## Incident *(application, extended)*

| New field | Type | Notes |
|---|---|---|
| `crewId` | string \| null | the crew assigned or repairing |
| `match` | `"best" \| "help" \| null` | the match of `crewId` for this kind |
| `repairMs` | int | the total repair time for the current crew (`repairSeconds × 1000`); set on arrival |

### Assignment rules (FR-010)

```text
send(inc, B):
  if match(B, inc) == "none" or B.state == repairing or inc.crewId == B → refuse
  if B was assigned to X (X ≠ inc) → X.state = new, X.crewId = null       (redirect)
  if inc.crewId == A (A ≠ B)       → A.goHome()                            (release)
  inc.crewId = B; inc.match = match(B, inc); inc.state = assigned; B.sendTo(inc)
```

## Dispatch option *(application, `Round.dispatchOptions`)*

| Field | Type | Notes |
|---|---|---|
| `crewId` | string | |
| `match` | `"best" \| "help" \| "none"` | |
| `status` | `"ready" \| "driving" \| "repairing" \| "returning"` | |
| `etaS` | number \| null | route length ÷ speed; `null` when it can't fix or there is no route |
| `repairS` | number \| null | `repairSeconds` for this crew |
| `sendable` | bool | |
| `reason` | string \| null | `"Can't fix"`, `"Busy repairing"`, `"Already on the way"` |
| `freeInS` | number \| null | while repairing |

`bestCrewFor(incidentId)` follows the order in research R4.

## LevelRun *(application, extended)*

| New field / method | Notes |
|---|---|
| `pickedCrew` | the crew highlighted in the open panel; set to `bestCrewFor` on `select` |
| `armedCrew` | the crew armed from the crew bar |
| `options` | the cached `dispatchOptions` for the selected incident (refreshed every 250 ms) |
| `pickCrew(id)`, `pickIndex(n)` | panel pick, by id or by bar position 1–4 |
| `arm(id)`, `armIndex(n)`, `disarm()` | crew-first flow (research R5) |
| `clickIncident(id)` | the select-or-send-armed entry point used by `LevelLayer` |
| `sendCrew()` | sends `pickedCrew` to `selected` |
| events | adds `pick`, `arm`, `refused` `{message}` |

## Repaired event *(changed)*

`{ incident, crewId, match, points, refill, early, rightCrew }`

# Data Model: Round Briefing

All new data is ephemeral plain JavaScript values owned by application code. No persistent format or level/map schema changes.

## RoundBriefing

Built by `MCW.buildRoundBriefing(level, map)` only for an already validated level.

| Field | Type | Meaning |
| --- | --- | --- |
| levelId, name | string | Upcoming level identity and player-facing name. |
| durationS | number | Sum of phase durations, in seconds. |
| target | integer | Existing required repair count. |
| totalIncidents | integer | Exact schedule length. |
| phases | PhasePreview[] | Ordered phase intervals and active limits. |
| kinds | KindCapability[] | Damage kinds appearing in this round, in first-occurrence order. |
| crews | CrewProfile[] | Exact normalized roster in level order. |
| problems | ProblemPreview[] | Every scheduled occurrence, preserving source order. |

The projection must not mutate map variants, source objects, crew jobs, schedule entries, or level balance. Return copied nested arrays/records rather than exposing mutable level arrays. There is no active incident, route simulation, or crew assignment in the projection.

## PhasePreview

`index`, `name`, `startS`, `endS`, `durationS`, `maxActive`.

Intervals are `[startS, endS)`; an occurrence at a boundary belongs to the next phase. The final end equals durationS. These describe nominal schedule phases, not guaranteed actual release phases.

## KindCapability

`id`, `label`, `baseRepairS`, `warningS`.

`warningS = incidentKinds[id].warnS * (level.warnScale || 1)`, matching current Round urgency behavior. Numeric values are not rounded by the model. UI formats enough decimal places to preserve existing configured values without treating them as live countdowns.

## CrewProfile

| Field | Type | Meaning |
| --- | --- | --- |
| id, jobId | string | Normalized crew identity and domain job key. |
| jobName, leader, portrait | string | Existing name and portrait key; no asset paths. |
| depot | {col, row} | Copy of starting road coordinates. |
| speedTilesPerS | number | `crew.speed || jobs[jobId].speed`, matching Round. |
| advantage | plain record | Copy of existing advantage type, kind/factor where present, and text. |
| matches | CrewKindMatch[] | One entry for each round damage kind. |

CrewKindMatch contains `kindId`, `match` (`best`, `help`, `none`), and `repairS` (number or null). For compatible pairs call the existing `repairSeconds(job, kind, match)`; do not recalculate modifiers in the adapter. Null is reserved for Can't fix, never zero.

Vehicle picture/name and leader portrait image resolve in the adapter through jobArt and the injected imageSrc port. Legacy general crews still use levelCrews normalization and existing generic labels.

## ProblemPreview

| Field | Type | Meaning |
| --- | --- | --- |
| id | string | `inc-` plus source schedule index; shared identity convention with Round. |
| sequence | integer | Source index + 1, visible occurrence number. |
| kindId | string | Reference to a round kind. |
| target | tagged record | Tile: `{tile: {col, row}}`; object: `{objectId, objectType, anchor: {col, row}}`. |
| plannedAtS | number | Source entry.at, seconds from round start. |
| phaseIndex | integer | Phase containing plannedAtS. |
| warningS | number | Effective warning duration. |
| tutorial | boolean | Tutorial protection: urgency clock starts on first accepted dispatch rather than release. |
| compatibleCrews | array | `{crewId, match}` for Best and Can help crews only, in roster order. |

Uniqueness is per occurrence id, never per location or damage kind. Preserve duplicates and equal-time ordering. The adapter renders an object type label plus its ID and anchor to avoid ambiguous repeated building names; tile/depot labels display explicit zero-based map col,row coordinates. Labels are plain text. No predictive ETA is promised because actual release and travel depend on player actions.

## LevelRun Preparation and Reference State

| Field | Values / invariant |
| --- | --- |
| briefing | RoundBriefing or null; rebuilt when entering preparation, retained for that round's reference. |
| round | null during preparation; fresh Round after accepted startRound. |
| hints | null during preparation; created at actual start. |
| referenceSection | null, crews, or problems; non-null only while playing with a live round. |
| selected, pickedCrew, armedCrew, options | Existing dispatch state; cleared on preparation entry, preserved across ordinary reference open/close. |

Reference section changes emit a reference event. Preparation/fresh-round events use the existing application emitter pattern; UI never owns simulation time.

## Transitions and Validation

1. `menu.play`, `result.retry`, or `paused.retry` for hasLevel true enters briefing-crews; reset old map damage, discard old round, clear state, build fresh projection.
2. briefing-crews.nextBriefing enters briefing-problems; briefing-problems.back returns to crews without rebuilding the projection.
3. briefing-problems.startRound enters playing, creates a new Round exactly once, starts hints, and leaves reference closed.
4. playing.openReference changes only referenceSection; update(dt) continues advancing the same Round.
5. closeReference clears only the reference. pause/finish/toMenu/retry also clear it; menu/result focus restoration is left to MenuUI.
6. paused.resume returns to the same Round with reference closed. Tab restoration does not automatically resume.
7. Preparation.toMenu clears projection and all old round state. Free look does not create a briefing.

Use existing checkLevel validation before enabling preparation. Unknown targets/jobs, invalid schedule times, and invalid duration/target are handled by existing invalid-level fallback, not by partial or fabricated briefing rows. No schedule sorting or repair of invalid source data occurs in the projection.

# Contract: New and Changed Module APIs

Each module is listed with its layer (Constitution VII).

## Domain

```js
// [domain] js/domain/jobs.js — NEW
MCW.jobs                                   // contracts/level-and-jobs.md
MCW.matchLevel(jobId, kindId)              // "best" | "help" | "none"
MCW.repairSeconds(job, kind, match)        // research R1
MCW.repairPoints(job, kind, match, level)  // research R6

// [domain] js/domain/incident-kinds.js — CHANGED: + streetlight, pump; target rules
// [domain] js/domain/level-checks.js — CHANGED: crews rules (level-and-jobs.md)
MCW.levelCrews(level)                      // NEW helper: crews list, or a 1-crew "general" list for legacy levels
```

## Application

```js
// [application] js/application/crew.js — CHANGED
new MCW.Crew({ map, depot, speed, id, jobId, leader, portrait })
crew.status()                              // "ready" | "driving" | "repairing" | "returning"

// [application] js/application/round.js — CHANGED
round.crews                                // Crew[] in bar order (round.crew removed)
round.crewById(id)
round.send(incidentId, crewId?)            // crewId omitted → bestCrewFor(incidentId)
round.dispatchOptions(incidentId)          // data-model.md "Dispatch option"
round.bestCrewFor(incidentId)              // crewId | null
round.secondsUntilFree(crewId)             // null unless repairing
// "repaired" payload adds crewId, match, rightCrew; "assigned" adds crewId; "arrive" adds crewId

// [application] js/application/level-run.js — CHANGED
run.pickedCrew, run.armedCrew, run.options
run.pickCrew(id) / run.pickIndex(n)
run.arm(id) / run.armIndex(n) / run.disarm()
run.clickIncident(id)
run.sendCrew()                             // sends pickedCrew to selected
// events add: "pick", "arm", "refused" {message}

// [application] js/application/hints.js — CHANGED: step 2/5 text; "{target}" filled by LevelRun
```

## Adapters

```js
// [adapters] js/adapters/art/job-art.js — NEW (replaces vehicle-art.js)
MCW.jobArt.vehicleFor(jobId, facing)       // "Vehicles/veh_<vehicle>_<facing>.png"
MCW.jobArt.portraitFor(key)                // "Characters/<key>_idle_SE_f01.png"
MCW.jobArt.icon(jobId), MCW.jobArt.kindGlyph(kindId), MCW.jobArt.vehicleName(jobId)
MCW.jobArt.imagePathsFor(crews)            // every vehicle facing + portrait the level needs

// [adapters] js/adapters/render/level-layer.js — CHANGED: one drawable per crew, kind glyphs,
//   armed-crew dimming, clicks go through run.clickIncident
// [adapters] js/adapters/ui/hud.js — CHANGED: crew bar, crew rows in the panel, 1–4 keys,
//   arming, toasts, Right-crew pop
// [adapters] js/adapters/ui/crew-guide.js — NEW: MCW.CrewGuide(root) renders the guide table
//   from MCW.jobs + MCW.jobArt into #crew-guide inside How to Play
```

## Composition root

`js/main.js` changes only in wiring:

- load `MCW.jobArt.imagePathsFor(MCW.levelCrews(level))` instead of `vehicleArt.allImagePaths()`;
- create `MCW.CrewGuide`.

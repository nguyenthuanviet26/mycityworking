# Contract: New and Changed Module APIs

All modules attach to `window.MCW` and are classic scripts, as before. The layer of each module
is given in brackets.

## Domain

```js
// [domain] js/domain/route.js
MCW.findRoute(map, from /*{col,row}*/, goals /*{col,row}[]*/)
  // → {col,row}[] (from excluded, goal included); [] if from is a goal; null if unreachable.
  // BFS over map.neighbors(c, r, "vehicle"), fixed order NE, SE, SW, NW.
MCW.workTiles(map, footprint /*{col,row,w,h}*/) // → vehicle-passable tiles on the 4 sides

// [domain] js/domain/incident-kinds.js
MCW.incidentKinds = { road: {...}, building: {...} }   // see data-model.md

// [domain] js/domain/level-checks.js
MCW.checkLevel(level, map) // → string[] problems (contracts/level-definition.md)
```

## Application

```js
// [application] js/application/crew.js
new MCW.Crew({ map, depot: {col,row}, speed })
crew.canSend()                       // false while repairing
crew.sendTo(incidentId, workTiles)   // → true if a route exists (or already there)
crew.goHome()
crew.update(dtMs)                    // → events: [{type:"arrive", incidentId} | {type:"home"}]
crew.state, crew.x, crew.y, crew.facing, crew.incidentId, crew.route

// [application] js/application/round.js
new MCW.Round({ map, level })        // starts at elapsed 0, condition 100, crew at depot
round.update(dtMs)                   // advances everything (order in research R2); returns true if anything changed
round.send(incidentId)               // → true when the crew was sent or redirected
round.incident(id), round.incidentAt(col, row), round.activeIncidents()
round.phase()                        // → { index, name, rain }
round.remaining()                    // seconds left
round.secondsUntilCrewFree()         // null unless repairing
round.on(evt, fn) / off              // events listed in data-model.md
round.reset()                        // restores every damaged target to normal (used on retry/menu)

// [application] js/application/hints.js
new MCW.Hints(steps)                 // steps from MCW.Hints.TRIAL_STEPS
hints.notify(eventName)              // advances on show/clear events
hints.update(dtMs)                   // for the timed last step
hints.skip(); hints.current; hints.on("change", fn)

// [application] js/application/level-run.js
new MCW.LevelRun({ screens, map, level })
run.round                            // the current Round, or null when not in a round
run.selected                         // selected incident id or null
run.select(id) / run.selectNext()
run.sendCrew()
run.skipHints()
run.update(dtMs)                     // only advances while screens.state === "playing"; calls screens.finish() at the end
run.rainIntensity()                  // 0–1 target for the rain layer
run.on(evt, fn)                      // round events + "select", "hint", "start"

// [application] js/application/screens.js (changed)
// new state "result"; new actions finish(), retry(); toMenu() also allowed from result.

// [application] js/application/game-session.js (changed)
// result → playing also applies the start view and emits "playstart".
// The start view can come from the level (main passes it in).

// [application] js/application/rain.js (changed)
MCW.rain.setIntensity(r, k)          // k 0–1 → r.active; update/draw use r.active
```

## Adapters

```js
// [adapters] js/adapters/art/vehicle-art.js
MCW.vehicleArt.pictureFor(facing)    // "Vehicles/veh_truck_yellow_<facing>.png"
MCW.vehicleArt.allImagePaths()

// [adapters] js/adapters/render/level-layer.js
new MCW.LevelLayer(game, run)        // adds the crew drawable + a marker/arrow top overlay;
                                     // installs input.clickHandler (research R9)

// [adapters] js/adapters/ui/hud.js
new MCW.HUD(game, run, rootEl)       // top bar, banners, incident panel, hint bubble, result card

// [adapters] js/adapters/input/input.js (changed)
input.clickHandler = function (sx, sy, tile) { return consumed; } // optional, called first on left click

// [adapters] js/adapters/render/rain-layer.js (changed)
rainLayer.setIntensity(k)            // eases towards k over about 1 s

// [adapters] js/adapters/ui/menu.js (changed)
// shows #screen-result for state "result"; pauses on visibilitychange (hidden while playing)
```

## Infrastructure

```js
// [infrastructure] js/infrastructure/level-registry.js
MCW.levels.register(def), MCW.levels.get(id), MCW.levels.forMap(mapId)
```

## Composition root (`js/main.js`, changed)

Wiring only:

1. Pick the level for the map (research R11), and check it with `MCW.checkLevel`.
2. Add the vehicle images to the load list.
3. Create `LevelRun`, `LevelLayer` and `HUD`.
4. Add `run.update` to the updaters.
5. Feed `run.rainIntensity()` to the rain layer, and enable rain while a round is running.

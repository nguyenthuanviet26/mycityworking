# Feature Specification: Trial Level

**Feature Branch**: `005-trial-level`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "build for me a trial game level"

## Overview

So far CaptAIn has a city map, a main menu and a map decorator, but nothing to *do*: pressing
**Play** drops the player onto a map they can only look at. This feature adds the **trial
level** — the first short, complete, winnable round of the game. It is the smallest version of
the core loop:

> Rain damages the city → an **incident** appears → the player sends a **repair crew** → the
> crew drives along the roads to it → the crew repairs it → the city recovers.

The trial level is short (about five minutes), happens on a small dedicated city map, teaches
the player the loop with on-screen hints, and ends with a clear **win** or **lose** result. It
is the level judges will play at the demo.

**Core loop served** (Constitution Principle II): the whole loop, end to end, at its smallest
size — incident appears, player responds, crew travels along roads, repair happens, result is
scored. Every later level and system (more crew types, flooding, economy, upgrades) builds on
this one.

**Out of scope for this feature**: more than one level or a level-select screen, saving
progress between sessions, money/economy or buying crews, upgrades, multiple crew *types*
(e.g. fire truck vs. tow truck), flooding spreading across tiles, traffic or civilian
vehicles, sound and music, and online leaderboards.

## Clarifications

### Session 2026-10-18

- Q: How should the trial round be divided into phases while it plays? → A: Three storm phases with rising pressure — *Drizzle* (slow incidents, tutorial), *Downpour* (faster, more at once), *Peak storm* (fastest, heavy rain); after the last phase the storm clears and the round ends.
- Q: Should the storm timer start right away when the level begins, or wait until the player has sent the crew to the first (tutorial) incident? → A: It starts immediately when the level starts; time spent on the tutorial counts against the player.
- Q: When the player reaches the target of 6 repairs before the storm is over, should the round end straight away or keep going until the storm clears? → A: Keep playing — a "Goal reached!" banner shows, play continues until Peak storm ends, stars come from the final score; city condition hitting zero after the goal still counts as a win.
- Q: Should repairing an incident win back some city condition, or can the meter only go down during the round? → A: Small refill per repair — each repair restores a fixed amount (e.g. +5%, more if fixed before turning urgent), never above full.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fix one incident with a repair crew (Priority: P1)

The player presses **Play** on the main menu and the trial level starts on a small city under
light rain. A repair crew (a truck) waits at its depot. After a few seconds, a road tile or
building somewhere in the city becomes damaged and an **incident marker** appears above it,
with a short label of what happened (e.g. "Road cracked", "Roof damaged"). The player clicks
the incident, then clicks **Send crew**. The truck drives along the roads, turning at
junctions and crossing bridges, facing the direction it moves, until it reaches the road tile
next to the incident. A progress ring fills while the crew works; when it is full, the
damaged road or building returns to its normal look, the marker disappears, and the player
sees "+ points". The crew then drives back to its depot (or can be sent straight to another
incident).

**Why this priority**: This *is* the core loop. With only this story, the game is already
playable and demoable: something goes wrong, the player fixes it, the city visibly recovers.

**Independent Test**: Start the trial level with only one scripted incident. Click the
incident, send the crew, and watch it drive on roads only, reach the incident, repair it and
return. The incident's tile/building is shown normal again and the score has increased.

**Acceptance Scenarios**:

1. **Given** the trial level has started, **When** the first incident time is reached, **Then**
   the chosen road tile or building switches to its damaged look and an incident marker with
   a label appears above it, and the camera hint points the player to it if it is off-screen.
2. **Given** an incident is showing and the crew is idle, **When** the player selects the
   incident and chooses **Send crew**, **Then** the crew starts moving within half a second
   along a route made only of road and bridge tiles.
3. **Given** the crew is moving, **When** it changes direction, **Then** its picture turns to
   face the new direction (one of the four diagonal map directions).
4. **Given** the crew reaches the road tile next to the incident, **When** it arrives, **Then**
   a repair progress indicator appears and fills over the incident's repair time.
5. **Given** the repair progress is full, **When** the repair completes, **Then** the damaged
   tile/building shows its normal look again, the marker is removed, points are added to the
   score, the city condition meter goes up by the repair's refill amount (never above full),
   and the crew becomes available.
6. **Given** the crew is already busy, **When** the player selects a second incident,
   **Then** **Send crew** is unavailable and the panel says the crew is busy and when it will
   be free (or the player may redirect a crew that is still driving — see FR-012).
7. **Given** an incident that no road route can reach, **When** the level is built, **Then**
   such an incident is never created (every incident in the trial level is reachable).

---

### User Story 2 - Win or lose the round (Priority: P2)

The trial level has a goal shown at the top of the screen: **"Repair 6 incidents before the
storm ends"**, with a countdown (the storm timer) and a **City condition** meter that starts
full. The storm passes through three phases, each announced with a short banner and
heavier rain: **Drizzle** (incidents come slowly; the tutorial happens here), **Downpour**
(incidents come faster and more can be active at once) and **Peak storm** (fastest, heaviest
rain). When Peak storm ends, the rain stops, the storm clears and the round ends. Each incident that is left unrepaired too
long gets worse: its marker turns from yellow to red, and while it stays unrepaired the city
condition meter slowly drops; every repair wins a little of it back. When the player reaches the target number of repairs, a
**Goal reached!** banner shows and play continues: the player keeps repairing for a higher
score until the storm clears, which confirms the win. The player loses if the city condition
meter empties before the goal is reached, or if the storm clears before the target is met.
If the meter empties *after* the goal was reached, the round ends at once as a win. A result screen shows **Level complete** or **Level failed**,
the incidents repaired, the time taken, the final score and 1–3 stars, with **Retry** and
**Main menu** buttons.

**Why this priority**: Story 1 gives an action; this story turns it into a game with tension
and an ending. Without it the trial never finishes, which is weak for a demo — but the core
action is still demoable on its own.

**Independent Test**: Play the level and repair the target number of incidents in time →
result screen says Level complete with stars. Play again and ignore incidents → the condition
meter empties and the result screen says Level failed. **Retry** restarts the level from the
beginning; **Main menu** returns to the CaptAIn menu.

**Acceptance Scenarios**:

1. **Given** the level starts, **When** the play screen appears, **Then** the goal, the storm
   timer (already counting down, in Drizzle), the repaired count (e.g. "0 / 6") and the full city condition meter are visible.
2. **Given** an incident has been unrepaired for longer than its warning time, **When** that
   time passes, **Then** its marker changes to the urgent (red) look.
3. **Given** one or more urgent incidents are on the map, **When** time passes, **Then** the
   city condition meter goes down at a steady rate per urgent incident.
4. **Given** the player repairs the target number of incidents, **When** the last of them is
   completed, **Then** a "Goal reached!" banner shows, the repaired count is marked done, and
   the round keeps going (timer, phases and incidents continue; further repairs still score).
5. **Given** the goal has not been reached, **When** the city condition meter reaches zero,
   **Then** the round stops and the Level failed screen appears.
5a. **Given** the goal has already been reached, **When** the city condition meter reaches
   zero, **Then** the round stops and the Level complete screen appears, with stars from the
   score at that moment.
6. **Given** the storm timer reaches zero and the target is not met, **When** it happens,
   **Then** the round stops and the Level failed screen appears.
7. **Given** the result screen is showing, **When** the player chooses **Retry**, **Then** the
   level restarts with the same map, the same incident schedule, a full meter, zero score and
   a reset timer.
8. **Given** the round is in one storm phase, **When** that phase's time runs out, **Then**
   the next phase begins with a banner naming it ("Downpour!", "Peak storm!"), the rain gets
   heavier, and incidents start appearing at that phase's pace and active-incident limit.
9. **Given** Peak storm is running, **When** its time runs out, **Then** the rain stops, a
   "Storm cleared" banner shows, and the round ends (win if the target was met, otherwise
   Level failed).
10. **Given** the game is paused (Esc or the pause button), **When** the player resumes,
   **Then** the timer, incidents, meter and crew movement continue exactly where they
   stopped; nothing advanced while paused.

---

### User Story 3 - Learn the loop from on-screen hints (Priority: P3)

Because this is a *trial* level, a first-time player is guided through the loop with short
hint bubbles, one at a time: "An incident! Click the marker to see what happened" → "Send your
repair crew" → "The crew drives on roads — wait for it to arrive" → "Repairing… keep the city
condition up!" → "Repair 6 incidents before the storm ends." Each hint appears only at the
moment it is relevant and disappears once the player has done the step. The first incident
does not get worse until the player has sent the crew to it. A **Skip hints** option turns
hints off for the rest of the round.

**Why this priority**: Judges and new players need to understand the game within seconds, but
the level is still playable without hints by someone who has been told what to do.

**Independent Test**: Start the level as a new player and follow the hints only: the player
can complete the first repair without any other explanation. Start again and press
**Skip hints**: no further hints appear.

**Acceptance Scenarios**:

1. **Given** the first incident appears, **When** the player has not yet clicked it, **Then**
   a hint points to the incident marker.
2. **Given** the player has selected the first incident, **When** the incident panel is
   open, **Then** the hint moves to the **Send crew** button.
3. **Given** a hint is showing, **When** the player completes the step it describes, **Then**
   the hint disappears and the next hint (if any) appears at its own trigger.
4. **Given** the first incident is the tutorial incident, **When** time passes before the
   crew is sent, **Then** it does not become urgent and the city condition does not drop.
5. **Given** hints are showing, **When** the player chooses **Skip hints**, **Then** no more
   hints appear for the rest of the round (Retry keeps them skipped).

---

### Edge Cases

- **Two incidents on the same tile or building**: an incident is never created on a tile or
  building that already has an active incident.
- **Incident next to the crew's current position**: the crew starts repairing immediately,
  without driving.
- **Crew redirected while driving**: it turns from its current position onto a new route to
  the new incident; the first incident stays unassigned.
- **Player selects an empty tile or a normal building**: no incident panel opens; tile
  selection behaves as it does today.
- **Incident far off-screen**: an edge-of-screen arrow points towards it; clicking the arrow
  moves the camera to the incident.
- **Many incidents at once**: at most the current phase's limit of incidents is active at
  the same time; the schedule waits until one is repaired before adding more.
- **Phase changes during a repair or drive**: the crew and repair carry on unaffected; only
  the incident pace, active limit and rain change.
- **Tutorial still unfinished when Drizzle ends**: the round moves on to Downpour anyway;
  the tutorial incident stays protected from becoming urgent until the crew is sent to it.
- **Pause during repair or driving**: everything freezes, including the repair progress.
- **Goal reached and meter empties at the same moment** (the target repair finishes as the
  meter empties): the goal counts as reached, so the round ends as a win.
- **Browser tab hidden**: the round pauses automatically while the tab is not visible, so the
  player cannot lose while away.
- **`?menu=0` URL setting**: the trial level starts directly; other URL settings (`?map=`,
  `?dev=1`) keep working, and `?map=` for another map shows the map without the level.

## Requirements *(mandatory)*

### Functional Requirements

**Level setup**

- **FR-001**: Pressing **Play** on the main menu MUST start the trial level (replacing today's
  "free look" at the map).
- **FR-002**: The trial level MUST use its own small city map (roughly 20 × 20 tiles) with a
  road network, at least one bridge, a crew depot and enough buildings and roads for every
  incident in its schedule.
- **FR-003**: The trial level MUST be described as data — map, crew start, incident schedule,
  goal, time limit, and score thresholds for stars — so a teammate can change the level's
  numbers or add a second level without changing game rules.
- **FR-004**: The incident schedule MUST be the same on every play and every Retry (fixed
  order, places and times), so the level is fair and repeatable at a demo.
- **FR-004a**: The round MUST run through three storm phases in order — **Drizzle**,
  **Downpour**, **Peak storm** — each with its own length, incident pace, maximum active
  incidents and rain intensity, all set in the level data. Each phase MUST be faster (more
  frequent incidents) and allow at least as many active incidents as the one before, and the
  rain MUST get visibly heavier at each phase change.
- **FR-004b**: Each phase change MUST be announced with a short on-screen banner, and the
  current phase name MUST be shown next to the storm timer. The guided hints and the tutorial
  incident MUST happen during Drizzle.
- **FR-004c**: The storm timer MUST equal the total of the three phase lengths; when Peak
  storm ends, the rain MUST stop ("Storm cleared") and the round MUST end.
- **FR-004d**: The storm timer (and the Drizzle phase) MUST start running the moment the
  level starts; it MUST NOT wait for the tutorial or the player's first action. Only pausing
  (FR-021) stops it.

**Incidents**

- **FR-005**: An incident MUST be tied to one road tile or one building, MUST switch it to its
  damaged look while active, and MUST switch it back to normal when repaired.
- **FR-006**: The trial level MUST include at least two kinds of incident (a damaged road and a
  damaged building), each with its own label, repair time and points.
- **FR-007**: Each incident MUST show a marker above its tile/building; normal and urgent
  incidents MUST look clearly different (e.g. yellow vs. red, with an icon, not colour alone).
- **FR-008**: An incident MUST become urgent after its warning time if it has not been
  repaired, and each urgent incident MUST lower city condition at a steady rate until it is
  repaired.
- **FR-009**: Clicking an incident (marker, tile or building) MUST open an incident panel
  showing its label, its state (new / urgent / crew on the way / repairing) and the **Send
  crew** action.
- **FR-010**: The number of active incidents MUST never exceed the current phase's limit
  (e.g. 2 in Drizzle, 3 in Downpour, 4 in Peak storm).

**Repair crew**

- **FR-011**: The level MUST have one repair crew that starts at its depot and is drawn on the
  map facing one of the four map directions, using the existing vehicle art.
- **FR-012**: When sent, the crew MUST follow a shortest route made only of road and bridge
  tiles to a road tile next to the incident, moving smoothly between tiles at a fixed speed;
  a crew that is still driving MAY be redirected to a different incident.
- **FR-013**: On arrival, the crew MUST repair the incident over its repair time, showing
  progress, and MUST NOT be sendable elsewhere while repairing.
- **FR-014**: After a repair the crew MUST return to its depot unless the player sends it to
  another incident first.
- **FR-015**: The crew MUST be drawn in correct depth order with buildings and props (behind
  things in front of it, in front of things behind it).

**Goal, scoring and result**

- **FR-016**: The play screen MUST show the goal text, the storm timer, the repaired count
  against the target, the score and the city condition meter at all times during the round.
- **FR-017**: Each repair MUST add the incident's points to the score, with a bonus when it is
  repaired before becoming urgent.
- **FR-017a**: Each repair MUST restore a fixed amount of city condition (starting guess +5%),
  with a larger amount (starting guess +8%) when repaired before becoming urgent; the meter
  MUST never go above full, and the refill MUST be shown briefly on the meter (e.g. "+5%").
  City condition MUST NOT refill in any other way.
- **FR-018**: Reaching the target MUST mark the goal as reached (with a "Goal reached!" banner)
  without ending the round; incidents, phases and scoring MUST continue. The round MUST end:
  (a) when Peak storm ends — a win if the goal was reached, otherwise a loss; or (b) when city
  condition reaches zero — a win if the goal was already reached, otherwise a loss. A goal
  reached at the same moment the meter empties counts as reached.
- **FR-019**: The result screen MUST show win/lose, incidents repaired, time used, final score
  and 1–3 stars (stars only on a win, from the level's score thresholds applied to the final
  score, so repairs made after the goal can raise the star count), with **Retry** and
  **Main menu**.
- **FR-020**: **Retry** MUST restart the level to its exact starting state; **Main menu**
  MUST return to the CaptAIn main menu, from where **Play** starts the level fresh.

**Pause and hints**

- **FR-021**: The existing pause menu MUST stop the whole round (timer, incidents, meter, crew,
  repairs); the round MUST also pause while the browser tab is hidden.
- **FR-022**: The trial level MUST show the guided hints of User Story 3, one at a time, each
  triggered by the matching moment and cleared by the matching action, with a **Skip hints**
  option.
- **FR-023**: The first (tutorial) incident MUST NOT become urgent before the player has sent
  the crew to it.
- **FR-024**: When an incident is off-screen, an arrow at the screen edge MUST point towards
  it; clicking the arrow MUST move the camera to the incident.

**Existing behaviour**

- **FR-025**: Camera controls (pan, zoom, scroll, reset), the main menu, pause menu, developer
  mode and the map decorator MUST keep working as today.

### Key Entities

- **Level**: one playable round's definition — name, map, crew depot, incident schedule,
  goal (repairs needed), its three storm phases, star thresholds.
- **Storm Phase**: one stage of the round — name (Drizzle / Downpour / Peak storm), length,
  incident pace, maximum active incidents, rain intensity.
- **Incident**: something broken on the map — kind (road damage / building damage), target
  tile or building, appear time, warning time, repair time, points, and state (waiting,
  active, urgent, crew assigned, repairing, repaired).
- **Incident Kind**: label, which targets it can hit, default repair time and points.
- **Repair Crew**: position on the map, facing direction, current route, state (idle at
  depot, driving, repairing, returning), assigned incident.
- **Route**: an ordered list of road/bridge tiles from the crew's position to a tile next to
  the incident.
- **Round State**: elapsed time, remaining time, current storm phase, city condition, repaired count, score, hint
  progress, result (in progress / won / lost).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player who follows only the on-screen hints completes their first
  repair within 60 seconds of pressing **Play**.
- **SC-002**: A full round of the trial level (win or lose) takes between 3 and 6 minutes.
- **SC-003**: At least 4 out of 5 first-time playtesters understand what to do without spoken
  help, and at least 3 out of 5 win on their first or second try.
- **SC-004**: In 100% of sent crews, the crew stays on road and bridge tiles for its whole
  trip and arrives at the incident.
- **SC-005**: The game holds a steady 60 frames per second during play with the maximum
  number of active incidents and the crew moving.
- **SC-006**: From the result screen, **Retry** gets the player back into a fresh round in
  under 2 seconds.
- **SC-007**: All existing game-logic tests still pass, and the existing main menu, pause menu
  and decorator playtest checklists still pass (the main menu step "Play opens the free map"
  is updated to "Play opens the trial level").

## Assumptions

- "Trial level" means the first, short, tutorial-style playable level used for demos and
  first-time players — not a time-limited free trial of the game.
- The game is single-player, played with mouse and keyboard on desktop.
- One repair crew is enough for the trial; more crews or crew types are later features.
- Incidents use the damaged/normal art that already exists for roads and buildings; the crew
  uses an existing truck picture from the `Vehicles` folder in its four facing directions.
  Markers, progress ring, hint bubbles and the meter can be drawn with simple shapes and text.
- Rain uses the existing rain effect, made light / medium / heavy to match the storm phase;
  rain itself does not damage tiles — only the incident schedule does.
- Starting numbers (target 6 repairs; Drizzle ~60 s, Downpour ~90 s, Peak storm ~90 s, about
  4 minutes in total; ~10 scheduled incidents; max 2 / 3 / 4 active) are first guesses to be tuned in playtesting; they live in the level data
  (FR-003).
- No progress is saved; closing the page ends the round. Best scores are not stored.
- The trial level map is made with the existing map decorator and stored like other maps.
- Depends on features 001 (map, collision, tile picking, camera jump), 002 (main menu, pause
  menu), 003 (layer structure) and 004 (decorator, for building the map).

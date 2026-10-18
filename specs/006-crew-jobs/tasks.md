---

description: "Task list for the Crew Jobs feature"
---

# Tasks: Crew Jobs

**Input**: Design documents from `specs/006-crew-jobs/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/ (level-and-jobs.md, play-ui.md, new-apis.md), quickstart.md

**Tests**: Included. Constitution Principle III requires unit tests for domain and application code, run from `tests/index.html`. Write each test task first and see it fail. The HUD, crew bar, pins and guide are verified by the playtest steps in quickstart §2.

**Organization**: Tasks are grouped by user story (spec.md), so each story can be built and demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, US3

## Conventions that apply to every task

- **Code style** follows feature 005's files:
  - classic scripts wrapped in `(function (MCW) { "use strict"; … })(window.MCW);`;
  - `var`, prototype methods, and `MCW.createEmitter()` for events;
  - a header comment naming the layer.
- **Layers** (Constitution VII):
  - Domain: no browser APIs and no `.png` paths.
  - Application: no DOM, canvas or asset paths.
  - Pictures, glyphs and icons only in `js/adapters/art/job-art.js`.
  - `js/main.js` only wires parts together.
- **Script tags**:
  - Every new script gets a tag in `index.html` in inside-out order (domain → application → adapters → infrastructure → maps → levels → main).
  - New domain/application files and `job-art.js` also go into `tests/index.html` before `harness.js`.
  - New test files go after `harness.js`, before `architecture.test.js`.
  - Add a tag in the same task that creates the file.
- **After every task**:
  - `tests/index.html` shows `0 failed`. You can also run it headlessly: `node <scratchpad>/run-tests.js .` loads the test page's scripts in a Node `vm` with a minimal `window`.
  - `index.html` starts with no console errors (Constitution I).
- **Units**: level data is in seconds, and `update(dtMs)` takes milliseconds.

---

## Phase 1: Setup

- [X] T001 Create empty test files with a `describe` block each: `tests/domain/jobs.test.js`, `tests/domain/incident-kinds.test.js` and `tests/adapters/job-art.test.js`. Add their tags to `tests/index.html` after `harness.js`. Add a `/* ---- crew bar (feature 006) ---- */` section comment at the end of `css/hud.css`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Job rules, the two new damage kinds, the crews rules in the checker, the job art, the crew identity fields, and the trial map's new targets. The game must behave exactly as before at the end of this phase: the level still uses its single legacy crew.

### Tests first

- [X] T002 [P] Fill `tests/domain/jobs.test.js`:
  - `MCW.jobs` has `road`, `builders`, `electric`, `drainage` and a hidden `general`;
  - `MCW.matchLevel` returns the table in research R7 for every job × kind pair. A missing kind counts as `"none"`;
  - `general` is `best` at every kind;
  - every one of the 4 kinds has at least one non-hidden `best` job;
  - `MCW.repairSeconds(job, kind, "best")` = `kind.repairS`, except Electricians on `streetlight` (× 0.6) and Drainage on `pump` (× 0.7);
  - `MCW.repairSeconds(job, kind, "help")` = `kind.repairS × 2`, and a job's repair advantage does not apply to `help`;
  - `MCW.repairPoints(job, kind, "best", {rightCrewBonus: 40})` = `kind.points + 40`, and for Builders on `building` = `round(150 × 1.5) + 40`;
  - `repairPoints(…, "help", …)` = `kind.points` (no bonus, no advantage);
  - a missing `rightCrewBonus` counts as 0;
  - the four non-hidden jobs do not all have the same `advantage.type`.
- [X] T003 [P] Fill `tests/domain/incident-kinds.test.js`:
  - `MCW.incidentKinds` has `road`, `building`, `streetlight` and `pump`, with the numbers in research R2 (warnS 25/30/25/34, repairS 4/6/3/7, points 100/150/100/200);
  - `MCW.kindAccepts(kind, objectType)`:
    - `streetlight` accepts `lightpole_a`/`lightpole_b` and refuses `house_small_blue_a`;
    - `pump` accepts `water_a`/`water_b` and refuses `clinic_a`;
    - `building` accepts `clinic_a` and refuses `water_a`;
  - `road` has `targets: "tile"`.
- [X] T004 [P] Extend `tests/domain/level-checks.test.js`:
  - add a valid inline level that uses `crews` (2 crews: `road` with depot `[0,0]` and `builders` with depot `[4,0]`), which returns `[]`;
  - add one failing case for each of these:
    1. no `crews` and no legacy `depot`;
    2. 7 crews;
    3. duplicate crew ids;
    4. an unknown job;
    5. the hidden `general` job used in `crews`;
    6. a crew depot on grass;
    7. a bad `portrait` (`"char_z"`);
    8. a schedule kind with no Best crew (a `streetlight` entry while only `road` and `builders` crews exist; use a lightpole target);
    9. a target reachable only from a non-Best crew's depot;
    10. a `streetlight` entry targeting the clinic;
    11. `warnScale: 0`;
    12. `rightCrewBonus: -1`.
  - assert that `MCW.levelCrews(legacyLevel)` returns one crew `{id:"crew", job:"general", depot:[0,0], speed: level.crew.speed}`.
- [X] T005 [P] Fill `tests/adapters/job-art.test.js`:
  - `MCW.jobArt.vehicleFor("road","NE") === "Vehicles/veh_pickup_orange_NE.png"`, and similarly `builders` → `box_red`, `electric` → `van_white`, `drainage` → `truck_green`, `general` → `truck_yellow`;
  - `portraitFor("char_b") === "Characters/char_b_idle_SE_f01.png"`;
  - `kindGlyph` returns a non-empty string for all 4 kinds;
  - `icon(jobId)` returns a non-empty string for all 5 jobs;
  - `imagePathsFor([{job:"road",portrait:"char_a"}])` contains the 4 pickup facings and the `char_a` portrait, with no duplicates.
- [X] T006 [P] Extend `tests/application/crew.test.js`:
  - `new MCW.Crew({map, depot, speed:2, id:"e", jobId:"electric", leader:"Linh", portrait:"char_c"})` keeps those fields;
  - `status()` returns `"ready"` when idle, and `"driving"`, `"repairing"` or `"returning"` otherwise.

### Implementation

- [X] T007 Extend `js/domain/incident-kinds.js` (domain):
  - add `streetlight: { id, label:"Streetlight down", targets:"object", objectTypes:["lightpole_a","lightpole_b"], repairS:3, warnS:25, points:100 }` and `pump: { id, label:"Pump station failing", targets:"object", objectTypes:["water_a","water_b"], repairS:7, warnS:34, points:200 }`;
  - give `building` `objectKind:"building", excludeTypes:["water_a","water_b"]`;
  - add `MCW.kindAccepts(kind, objectType)`, which uses `MCW.objectTypes.TYPES[objectType].kind` for `objectKind`.

  T003 passes.
- [X] T008 Create `js/domain/jobs.js` (domain) with:
  - `MCW.jobs`, exactly as in `contracts/level-and-jobs.md`. `general` is `{ id:"general", name:"Repair Crew", speed:3, match:{road:"best",building:"best",streetlight:"best",pump:"best"}, advantage:{type:"speed",factor:1,text:""}, hidden:true }`;
  - `MCW.matchLevel(jobId, kindId)`;
  - `MCW.repairSeconds(job, kind, match)`;
  - `MCW.repairPoints(job, kind, match, level)`, following data-model.md "Job".

  Freeze the job objects. Add the tags to `index.html` and `tests/index.html` after `incident-kinds.js`. T002 passes.
- [X] T009 Change `js/domain/level-checks.js` (domain):
  - add `MCW.levelCrews(level)`: returns `level.crews` if present, else the legacy one-crew list `[{id:"crew", job:"general", leader:"", portrait:"char_a", depot: level.depot, speed: level.crew && level.crew.speed}]`;
  - replace the depot rule with the crews rules 1–7 in `contracts/level-and-jobs.md`. A legacy level is valid when `depot` is passable and `crew.speed > 0`;
  - replace the single-depot reachability check with "reachable from the depot of at least one crew whose job is `best` at the entry's kind";
  - add the kind target rule via `MCW.kindAccepts`.

  The script order needs `jobs.js` before `level-checks.js`. Move the tags if needed, in both pages. T004 passes, and the feature-005 level-checks cases still pass.
- [X] T010 [P] Create `js/adapters/art/job-art.js` (adapter) with `MCW.jobArt`, as in `contracts/new-apis.md`:
  - `VEHICLES = { road:"pickup_orange", builders:"box_red", electric:"van_white", drainage:"truck_green", general:"truck_yellow" }`;
  - `ICONS = { road:"🚧", builders:"🏗", electric:"⚡", drainage:"💧", general:"🔧" }`;
  - `GLYPHS = { road:"⚠", building:"⌂", streetlight:"💡", pump:"💧" }`;
  - vehicle names for the guide ("pickup", "box truck", "van", "truck").

  Delete `js/adapters/art/vehicle-art.js` and `tests/adapters/vehicle-art.test.js`, and replace their tags in both HTML pages with `job-art.js` / `job-art.test.js`. Update `js/adapters/render/level-layer.js` to call `MCW.jobArt.vehicleFor(crew.jobId, crew.facing)`. Update `js/main.js` to load `MCW.jobArt.imagePathsFor(MCW.levelCrews(level))`. T005 passes.
- [X] T011 [P] Change `js/application/crew.js`: accept and store `id` (default `"crew"`), `jobId` (default `"general"`), `leader` (default `""`) and `portrait` (default `"char_a"`). Add `P.status()`. T006 passes.
- [X] T012 Regenerate `maps/trial.js` by extending the generator `<scratchpad>/gen-trial-map.py` (or edit the file by hand):
  - add a named pump station `{ type:"water_a", at:[13,15], id:"pump" }` or another free 2×2 grass spot beside the east road, so that `MCW.workTiles` is non-empty;
  - give the existing lightpoles ids `light-1` (`6,8`) and `light-2` (`15,10`);
  - add `light-3` and `light-4` on free grass tiles beside roads, one west of the canal and one east.

  Check with `<scratchpad>/check-level.js`: no map warnings, `levels/trial.js` still passes `checkLevel`, and every new target has work tiles.
- [X] T013 Extend `tests/architecture.test.js` `LAYERS`:
  - domain: add `jobs`, `matchLevel`, `repairSeconds`, `repairPoints`, `kindAccepts`, `levelCrews`;
  - adapters: replace `vehicleArt` with `jobArt`, and add `CrewGuide`;
  - add `CrewGuide` to the list asserted undefined on the test page.

  All tests pass.

**Checkpoint**: All tests pass, and the trial level plays exactly as in feature 005.

---

## Phase 3: User Story 1 — Choose the right crew for the damage (Priority: P1) 🎯 MVP

**Goal**: There are four crews, each with a job. The incident panel lists every crew with a Best / Can help / Can't fix badge, an arrival time and a repair time, and the best crew is pre-picked. You can also send crew-first from the crew bar. Best repairs get a "Right crew" bonus, and Can-help repairs take 2× as long.

**Independent Test**: quickstart §2 steps 1–9.

### Tests first

- [X] T014 [P] [US1] Extend `tests/application/round.test.js` with a `crews` level (inline map from the existing tests plus a lightpole `{type:"lightpole_a", at:[3,3], id:"lamp"}` beside row 2's road). Crews:
  - `road` at `[0,0]`;
  - `builders` at `[4,0]`;
  - `electric` at `[0,2]`.

  Test:
  - `round.crews.length === 3`, in level order, and `crewById`;
  - two crews sent to two incidents both move in the same `update`;
  - `send(roadInc, "electric")` is refused (Can't fix);
  - `send(inc, crewThatIsRepairing)` is refused;
  - sending `builders` to an incident `road` already has: `road` gets state `returning` and the incident's `crewId === "builders"` with `match === "help"`;
  - a redirect puts the old incident back to `new` with `crewId === null`;
  - a Can-help repair takes `2 × repairS`, and its `repaired` event has `rightCrew:false`, `match:"help"` and `points === kind.points + earlyBonus`;
  - a Best repair has `rightCrew:true` and `points === kind.points + rightCrewBonus + earlyBonus`;
  - the Electricians on `lamp` repair in `3 × 0.6` s;
  - `dispatchOptions(id)` lists 3 rows with the right `match`, `sendable`, `reason` (`"Can't fix"`, `"Busy repairing"`, `"Already on the way"`), `etaS = routeLength / speed` and `repairS`, plus `freeInS` while repairing;
  - `bestCrewFor` prefers a free Best crew, then the nearer of two, then a driving Best crew, then a free Help crew, and returns `null` when only Can't-fix crews exist;
  - `send(id)` without a crew id uses `bestCrewFor`.
- [X] T015 [P] [US1] Extend `tests/application/level-run.test.js` with a `crews` level:
  - `select(id)` sets `pickedCrew` to `bestCrewFor` and fills `run.options`;
  - `pickIndex(2)` picks the second crew;
  - `sendCrew()` sends the picked crew;
  - `arm("electric")` sets `armedCrew` and emits `arm`, and arming it again disarms it;
  - `armIndex(1)` arms the first crew;
  - `clickIncident(lampInc)` while `electric` is armed sends it and disarms;
  - `clickIncident(roadInc)` while `electric` is armed emits `refused` with a message containing "can't fix", stays armed, and sends nothing;
  - `clickIncident(id)` with nothing armed is the same as `select(id)`;
  - `select(null)` disarms;
  - a repairing crew can't be armed (returns false);
  - the armed crew is disarmed when it arrives somewhere;
  - `run.options` refreshes after 250 ms of `update` while the panel is open.
- [X] T016 [P] [US1] Extend `tests/application/hints.test.js`: step 2's text mentions "Best". `MCW.Hints.fill(steps, {target:10})` returns steps whose step-5 text contains "10".

### Implementation

- [X] T017 [US1] Rework `js/application/round.js` for many crews (research R3, R4, R6; data-model "Assignment rules"):
  - build `this.crews` from `MCW.levelCrews(level)`. Each crew is a `new MCW.Crew` with the speed of its job, unless an entry gives `speed` (the legacy shortcut);
  - add `crewById`;
  - in `update`, move every crew and handle each crew's arrival. Repair progress is per incident: `inc.repairMs` is set on arrival from `MCW.repairSeconds(job, kind, inc.match)`;
  - `send(incidentId, crewId)` follows the assignment rules. With no `crewId`, use `bestCrewFor`;
  - in `_complete`, compute points with `MCW.repairPoints(job, kind, match, level)` plus `earlyBonus` when early, and emit `repaired` with `{incident, crewId, match, points, refill, early, rightCrew: match === "best"}`. The repairing crew `finishRepair()` then `goHome()`;
  - add `dispatchOptions`, `bestCrewFor` and `secondsUntilFree(crewId)`;
  - keep `secondsUntilCrewFree()` as the soonest-free repairing crew, for compatibility;
  - use `warnS × (level.warnScale || 1)` for urgency;
  - remove `this.crew`.

  T014 passes, and every feature-005 round test still passes (those use the legacy `general` crew).
- [X] T018 [US1] Extend `js/application/level-run.js` (research R5):
  - `pickedCrew`, `armedCrew`, `options`, `_optionsMs`;
  - `select` sets `pickedCrew = round.bestCrewFor(id)` and refreshes `options`;
  - `pickCrew`, `pickIndex`, `arm`, `armIndex`, `disarm`, `clickIncident`;
  - `sendCrew` calls `round.send(selected, pickedCrew)`;
  - disarm on `select(null)` and on the armed crew's `arrive`;
  - emit `pick`, `arm`, `refused` (message `"<Job> can't fix <label>"`, using `MCW.jobs[jobId].name` and `kind.label`);
  - refresh `options` every 250 ms in `update`, and on `assigned`/`arrive`/`repaired`;
  - fill the hint `{target}` via `MCW.Hints.fill`;
  - update `selectNext` to keep working;
  - replace every `round.crew` reference with `round.crews`.

  T015 passes, and every feature-005 level-run test still passes.
- [X] T019 [US1] Change `js/application/hints.js`:
  - step 2 text becomes "Pick the crew marked Best, then press Send.";
  - step 5 text becomes "Repair {target} incidents before the storm ends. Click a crew below, then an incident, to send it faster.";
  - add `Hints.fill(steps, vars)`, which returns copies with `{name}` replaced.

  T016 passes.
- [X] T020 [US1] Change `js/adapters/render/level-layer.js`:
  - keep one drawable per crew in `run.round.crews`, rebuilt on the run's `start` event and removed on round end/menu. Each draws `MCW.jobArt.vehicleFor(jobId, facing)`;
  - pins show `MCW.jobArt.kindGlyph(kind.id)` instead of `!` while new, and keep `!!` and the ring when urgent;
  - while `run.armedCrew` is set, draw pins whose `MCW.matchLevel(job, kind) === "none"` at `globalAlpha 0.35`;
  - the click handler calls `run.clickIncident(id)` for pin and tile hits;
  - `select(null)` happens on empty clicks (which also disarms);
  - the `C` key target moves to the picked or armed crew, or the first crew.
- [X] T021 [US1] Extend `js/adapters/ui/hud.js` and `css/hud.css` with the crew bar (contracts/play-ui.md):
  - **cards**: one per crew, bottom-left, in a horizontal flex that wraps on narrow screens. Each shows the portrait `<img src>` (resolved through an `imageSrc` function passed from `main.js`, like the editor's), the job icon, "Job — Leader", the position number and status text (with "· free in Ns" while repairing), and a ⌖ button;
  - **clicking a card**: a click calls `run.arm(id)`; a refusal shows a toast "Busy repairing". A double-click or ⌖ glides the camera to the crew;
  - **armed state**: the armed card gets class `armed` (outline); a status line above the bar says "Click an incident for <Job>";
  - **`?` button**: calls `screens.pause()` then `screens.openHowto()`;
  - **toasts**: one element, bottom-centre above the bar, about 1.5 s, used for `refused` messages.

  Move the incident panel up so it doesn't cover the crew bar.
- [X] T022 [US1] Change the incident panel in `js/adapters/ui/hud.js`:
  - replace the single crew line with a list of crew rows from `run.options`. Each row shows the number, "Job — Leader", a badge word (`BEST` / `CAN HELP · 2× slower` / `CAN'T FIX`) with class `best`/`help`/`none`, and a status (`arrives Ns · repair Ns` / `busy · free in Ns` / `on the way`). The picked row has class `picked`;
  - clicking a row calls `run.pickCrew`;
  - the Send button reads `Send <Job>` / `Redirect <Job>`, and is disabled with the row's reason when not sendable;
  - **keys**: `1`–`4` call `pickIndex` when the panel is open, else `armIndex`. Enter/Space send. Esc closes the panel and disarms (capture phase, as before);
  - the repair pop shows `+N · Right crew!` when `rightCrew`.

  Rebuild rows only when `run.options` changes (compare a short signature string), not every frame.
- [X] T023 [US1] Change `levels/trial.js`:
  - replace `depot` and `crew` with the `crews` list in `contracts/level-and-jobs.md`, with depots on four distinct road tiles next to the garage, each passing `checkLevel`;
  - add `rightCrewBonus: 40`;
  - change 2 existing road entries to `streetlight` (`light-1`, `light-3`) and 1 roof entry to `pump` (`pump`), so all four kinds appear in this story's demo.

  Also change `js/main.js` to pass `imageSrc` to the HUD for portraits. Check that `checkLevel` returns `[]` in the console.

**Checkpoint**: quickstart §2 steps 1–9 pass, and all tests pass.

---

## Phase 4: User Story 2 — Different kinds of damage across the city (Priority: P2)

**Goal**: The full four-kind schedule, rebalanced for four crews (Clarification 2): 18 incidents, at most 3 / 4 / 6 active, `warnScale` 0.7, a goal of 10, clusters that make the Best crew busy, and a "best crew free in Ns" line.

**Independent Test**: quickstart §2 steps 10–12, and step 15 (balance).

- [X] T024 [P] [US2] Extend `tests/application/round.test.js`:
  - `warnScale: 0.5` makes a road incident urgent at `releasedAt + 12.5` s;
  - an incident of a kind whose only Best crew is busy repairing: `dispatchOptions` gives that crew `sendable:false`, `reason:"Busy repairing"` and `freeInS` > 0;
  - `bestCrewFor` then returns a free `help` crew.
- [X] T025 [US2] Rewrite the schedule in `levels/trial.js` (research R8) to 18 entries, sorted by `at`:
  - **Drizzle (0–60 s), 3 entries**: road at 3 s (tutorial), streetlight, roof;
  - **Downpour (60–150 s), 7 entries**: all four kinds, including **cluster 1**, two streetlights 2 s apart (`light-2`, `light-4`);
  - **Peak storm (150–240 s), 8 entries**: all four kinds, including **cluster 2**, the pump and a road 3 s apart, plus two roofs 4 s apart;
  - also set phases `maxActive` to 3 / 4 / 6, `warnScale: 0.7`, `target: 10` and `stars: [1900, 2600]`.

  No target may repeat within 30 s. `checkLevel` returns `[]`, and the phase paces don't go down.
- [X] T026 [US2] In `js/adapters/ui/hud.js`, when the Best crew for the selected incident is not sendable because it is busy, show the line "Best crew (<Job>) free in Ns" above the crew rows (FR-011). The HUD goal text and banner already read `run.level.target`; check they show 10.
- [X] T027 [US2] Run a balance check with a scripted best-crew bot over the real trial level. Run it headlessly via `<scratchpad>/drive.js`, or in the browser console using a copy of the feature-005 `autoplay` snippet changed to send `bestCrewFor` for every unassigned incident. Record the lowest condition, the score and the number of moments where `bestCrewFor` returned a `help` crew because the Best one was busy. Tune `levels/trial.js` until:
  - the lowest condition is below 90 % (SC-004a);
  - there are at least 2 such moments (SC-004);
  - the bot still wins.

  Record the final numbers in `research.md` R8.

**Checkpoint**: quickstart steps 1–12 and 15 pass, and all tests pass.

---

## Phase 5: User Story 3 — Each job has its own advantage (Priority: P3)

**Goal**: The advantages are visible and explained in a Crew guide inside How to Play.

**Independent Test**: quickstart §2 steps 13–14.

- [X] T028 [P] [US3] Extend `tests/application/round.test.js`:
  - with the Road Crew (speed 4) and the Builders (speed 2.5) sent the same distance (a straight road of 5 tiles), the Road Crew arrives at least 0.7 s earlier;
  - a Builders roof repair (Best) scores `round(150 × 1.5) + rightCrewBonus (+ earlyBonus)`.
- [X] T029 [US3] Create `js/adapters/ui/crew-guide.js` (adapter) with `MCW.CrewGuide(root)`. It renders a table into `root` (the `#crew-guide` element) with one row per non-hidden job. The columns are: icon and name, vehicle name, the kinds it is "Best at" (labels from `MCW.incidentKinds`), the kinds it "Can help with", and the advantage text. Add the tag to `index.html` after `hud.js`. In `index.html`, add `<h3>Your crews</h3><div id="crew-guide"></div>` to the How to Play card, after the controls table, and a sentence: "Each crew is Best at one kind of damage. A crew that can only help takes twice as long and gets no Right-crew bonus." In `js/main.js`, create `new MCW.CrewGuide(document.getElementById("crew-guide"))` when a level is loaded. Style it in `css/hud.css` (`.crew-guide` table, compact, scrolls inside the card).
- [X] T030 [US3] Update the How to Play controls table in `index.html`:
  - add "1–4 | Pick / arm a crew" and "Click a crew, then an incident | Send that crew";
  - change "Enter | Send the crew" to "Enter | Send the picked crew".

**Checkpoint**: quickstart §2 steps 1–14 pass, and all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 [P] Update `README.md`: describe crews and jobs in the trial-level paragraph and the controls table (1–4, crew-first, `?`); add `js/domain/jobs.js` and `job-art.js` to the project layout; and in "Change the trial level", mention editing `js/domain/jobs.js` for job balance.
- [X] T032 [P] In `specs/005-trial-level/quickstart.md`, add a note at the top of §2: "Since feature 006 the single truck is replaced by four crews; read 'the truck' as 'a crew' and see specs/006-crew-jobs/quickstart.md."
- [X] T033 Run the automated checks:
  - the full test page in a real browser;
  - a headless drive of a full round (play, crew-first send, panel send, Can't-fix refusal, retry, menu) with no console errors;
  - the regressions `?map=sample-city` and `?edit=1`.
- [ ] T034 Manual playtest of quickstart §2 steps 1–18 with at least one person who hasn't played. Check SC-001 and SC-003 informally, and the 60 FPS check in DevTools (step 18).

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T013)**:
  - T002–T006 can run in parallel;
  - T007 → T008 → T009 (script order and kinds needed by jobs/checks);
  - T010, T011 and T012 are independent;
  - T013 comes last.
- **US1 (T014–T023)** depends on the foundation:
  - tests T014–T016 can run in parallel;
  - then T017 → T018 → T019;
  - then T020/T021/T022 (T021 and T022 both edit `hud.js`, so run them in sequence);
  - then T023.
- **US2 (T024–T027)** depends on US1 (`dispatchOptions`, crews in the level).
- **US3 (T028–T030)** depends on US1. It can run alongside US2, except that both touch `index.html`/`hud.css`, so coordinate.
- **Polish** comes after the stories you intend to ship.

## Parallel Examples

```text
Foundation tests together: T002 jobs · T003 incident-kinds · T004 level-checks · T005 job-art · T006 crew
Foundation code: T007 → T008 → T009, while in parallel T010 job-art · T011 crew fields · T012 map
US1 tests together: T014 round · T015 level-run · T016 hints
US1 adapters: T020 level-layer alongside T021 → T022 (hud.js)
US3 alongside US2: T028/T029/T030 while T025–T027 tune the level
```

## Implementation Strategy

1. **MVP = Phases 1–3.** Four crews, badges, pre-pick, crew-first sending, and the Right-crew bonus and 2× rule, on the existing 10-incident schedule with three entries switched to the new kinds. **Demo here.**
2. **US2** rebalances the level so four crews are still challenged.
3. **US3** adds the Crew guide, so the advantages are understood.
4. **Polish**: README, the 005 quickstart note, regression and playtest checks.

Each step keeps `index.html` playable and `tests/index.html` green.

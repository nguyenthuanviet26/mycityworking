# Tasks: Round Briefing

**Input**: Design documents from `specs/008-round-briefing/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [flow contract](contracts/briefing-flow.md), [UI contract](contracts/briefing-ui.md), [quickstart.md](quickstart.md).

**Tests**: Application logic tests are required by Constitution III and the implementation plan. Add focused tests before changing behavior, confirm the new assertions fail, then make them pass. UI, focus, browser visibility, and presentation use the manual playtest already required by the spec. No package installation or test framework is added.

**Organization**: US1 = Know my crews before starting (P1); US2 = See the whole round's problems (P1); US3 = Start and repeat the training round (P2), including the accepted running-reference clarification.

## Format: `[ID] [P?] [Story] Description`

All paths below are relative to the repository root. `[P]` marks work that can run alongside another explicitly identified task after its prerequisites are met; it does not authorize concurrent edits to the same file. Complete dependencies before starting a task. All tasks start unchecked.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the existing playable/test baseline without new tooling.

- [X] T001 Open index.html and tests/index.html using the existing browser-only workflow; record startup behavior, current suite summary, and browser version in specs/008-round-briefing/quickstart.md without overwriting its acceptance steps; inspect tests/harness.js and tests/architecture.test.js before extending their conventions.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Supply shared read-only data and preparation lifecycle before user-facing screens are enabled.

- [X] T002 Add projection tests in tests/application/round-briefing.test.js using synthetic valid levels/maps and register the new test script in tests/index.html so its assertions run before implementation: effective speed overrides, legacy levelCrews normalization, match/repair modifiers, warning scaling, phase boundaries, exact counts, repeated targets, equal-time order, copied records, and zero source/map mutations; follow specs/008-round-briefing/data-model.md and the numeric expectations in quickstart.md.
- [X] T003 [P] Extend tests/application/screens.test.js for hasLevel true preparation, default-false free look, Next/Back/Main menu/Escape, startRound accepted only from problems, duplicate/out-of-state rejection, and result/paused Retry; retain existing pause and legacy free-look assertions.
- [X] T004 Implement MCW.buildRoundBriefing(level, map) in js/application/round-briefing.js for already validated levels, with all RoundBriefing, PhasePreview, KindCapability, CrewProfile, CrewKindMatch, and ProblemPreview fields in specs/008-round-briefing/data-model.md. Enforce "No active incident, route simulation, or crew assignment in the projection"; "Return copied nested arrays/records rather than exposing mutable level arrays"; phase "Intervals are `[startS, endS)`"; kind order "in first-occurrence order"; crew order "in level order"; problem order "preserving source order"; occurrence id "`inc-` plus source schedule index" and sequence "Source index + 1"; match "`best`, `help`, `none`"; repairS "number or null" with "Null is reserved for Can't fix, never zero"; target is exactly the tile or object tagged record from the model; speed is "`crew.speed || jobs[jobId].speed`" and warning is "`incidentKinds[id].warnS * (level.warnScale || 1)`"; use repairSeconds for effective durations, preserve tutorial boolean, and copy advantage records. Do not instantiate Round, sort/deduplicate schedules, mutate targets, or add browser/art dependencies; register this application script after domain dependencies in tests/index.html to make the T002 assertions pass (depends on T002).
- [X] T005 Implement opt-in hasLevel, briefing-crews/briefing-problems states, nextBriefing/startRound wrappers, Escape rules, guarded duplicate starts, and paused/result Retry transitions in js/application/screens.js per specs/008-round-briefing/contracts/briefing-flow.md; default/false must preserve direct free look (depends on T003).
- [X] T006 [P] Extend tests/application/level-run.test.js for preparation cleanup and rebuilding, null Round/hints during 60 seconds of preparation updates, no rebuild on step navigation, zero-elapsed construction on startRound, unchanged round on Resume, fresh result/paused Retry, and return-to-menu cleanup; preserve coverage for ordinary incident releases and dispatch (depends on T004 and T005).
- [X] T007 [P] Extend tests/application/game-session.test.js for startRound applying startView and emitting playstart once, no fresh-start effect on preparation navigation or Resume, preserved camera/selection snapshot restoration, and legacy free-look behavior (depends on T005).
- [X] T008 Implement preparation lifecycle in js/application/level-run.js: rebuild briefing once per entry from menu/result/paused, call old Round.reset before discarding it, clear dispatch selections/options and stale state, keep "round | null during preparation" and "hints | null during preparation", start a fresh Round only for accepted startRound, and clear projection on Main menu; do not update or emit start during preparation (depends on T006).
- [X] T009 Update fresh-play recognition in js/application/game-session.js for startRound, retaining legacy starts and pause camera behavior; keep the input-reset listener ordering intact and do not enter playing just to initialize the camera (depends on T007).
- [X] T010 Register js/application/round-briefing.js and its tests in tests/index.html in dependency order; extend tests/architecture.test.js where its module lists require it, then run the application suite and require zero failures without DOM UI, renderer, image, or index.html imports in inner-layer tests (depends on T004, T005, T008, T009).

**Checkpoint**: Shared projection and preparation state machine pass focused tests. The normal game remains on its existing entry flow until T019 enables the complete preparation surface.

## Phase 3: User Story 1 - Know my crews before starting (Priority: P1)

**Goal**: Present the actual roster and effective capabilities in an untimed, accessible preparation view.

**Independent Test**: Render the roster for the upcoming valid level and compare all four crews against effective rules; spending 60 seconds in preparation must not advance any game state. This story's view can be verified independently of the problem renderer; the complete playable entry flow is enabled after US2.

- [X] T011 [US1] Create js/adapters/ui/round-briefing.js with a reusable crew-capability renderer for RoundBriefing: leader name/portrait, job/vehicle, depot col,row, speed in tiles/second, advantage, every scheduled damage kind's text match and effective repair duration; use jobArt plus injected imageSrc and textContent, never recompute rule values or show a duration for Can't fix (depends on T010).
- [X] T012 [P] [US1] Create css/briefing.css for crew cards, compatibility tables, visible focus, bounded scrolling, readable numeric units, text match labels, sticky navigation, smaller desktop windows and 200% zoom; reuse existing design tokens and loaded art, with no new dependencies (depends on T010).
- [X] T013 [US1] Add initially hidden preparation screen roots, roster region, Untimed preparation label, Continue to Problems and Main menu controls, and stylesheet/application/adapter script tags in index.html; place round-briefing.js application code after its domain dependencies and adapter before main.js, and provide the problems container needed by US2 (depends on T011 and T012).
- [X] T014 [US1] Extend js/adapters/ui/menu.js preparation screen mapping, visibility, initial focus and keyboard navigation; connect crew Continue and Main menu to existing machine actions, ensure hidden controls are unreachable, and keep legacy free-look fade behavior without a timed Start Round fade (depends on T013).
- [X] T015 [US1] Construct the briefing adapter in js/main.js with LevelRun, screen roots and imageSrc, wiring rendering to preparation events without putting projection or lifecycle rules in the composition root; keep hasLevel preparation activation deferred to T019 so incomplete problem navigation is not exposed on the main line (depends on T014).

**Checkpoint**: Roster rendering and untimed lifecycle are independently verifiable. Do not release the new entry sequence with a blank problems step; proceed to US2 before enabling it in normal Play.

## Phase 4: User Story 2 - See the whole round's problems (Priority: P1)

**Goal**: Show every scheduled occurrence, its timing, locations, suitable crews, and round objectives before play.

**Independent Test**: Enter Problems, verify all 18 occurrences separately in source order, inspect repeated targets and equal-time fixtures, and return between roster/problems without changing projection identity or consuming time.

- [X] T016 [US2] Extend js/adapters/ui/round-briefing.js with a reusable complete problem renderer: number, kind, unique object-type/ID/anchor or explicit zero-based tile coordinates, planned appearance time, nominal phase, effective warning duration and compatible crews with match text; preserve every occurrence and sufficient decimal precision, and display total count, duration, phase lengths, repair target and existing win/lose rules (depends on T015).
- [X] T017 [P] [US2] Extend css/briefing.css for long accessible schedule tables, captions/header alignment, scrollable content and always-reachable Back/Start/Main menu controls; preserve readable timing/crew columns at 200% zoom without truncating the workload (depends on T015; may run alongside T016).
- [X] T018 [US2] Complete the problems screen and controls in index.html and js/adapters/ui/menu.js: Back returns to roster, Start Round invokes only startRound, Main menu exits, and copy explains planned versus actual release, active/target delays, tutorial urgency protection, and continued scoring after reaching the repair target; consume Start's keyboard activation so it cannot fall through to Send (depends on T016 and T017).
- [X] T019 [US2] Enable ScreenMachine({hasLevel: !!level}) in js/main.js only after valid levelFor checks and complete preparation UI wiring; preserve ?menu=0 as menu-only skip, invalid-level free-look fallback, no-level free look and decorate mode, and ensure Start hides preparation immediately rather than spending gameplay time on a fade (depends on T018).
- [X] T020 [US2] Run US1/US2 preparation scenarios from specs/008-round-briefing/quickstart.md against index.html and tests/index.html, including four crews/18 occurrences/240 seconds/target 10, repeated/equal-time fixtures, 60-second waits, Back/Main menu, one accepted Start and no premature dispatchable problems; record actual results in specs/008-round-briefing/quickstart.md (depends on T019).

**Checkpoint**: Play now offers a complete playable preparation sequence. The roster and workload are independently checkable and the existing timed round starts only on explicit Start Round.

## Phase 5: User Story 3 - Start and repeat the training round (Priority: P2)

**Goal**: Support clean retries and a read-only crew/schedule reference during play without stopping the clock, while preserving explicit pauses.

**Independent Test**: Start once, open/switch/close reference during a controlled 10-second gameplay interval, compare against ordinary play, pause and Resume, then Retry from paused and result states. References must preserve assignments and timing; retries must rebuild a fresh briefing.

- [X] T021 [US3] Extend tests/application/level-run.test.js for reference open/close/switch guards and events, "referenceSection | null, crews, or problems; non-null only while playing with a live round", preserved selection/assignments/Round identity, equivalent controlled 10-second updates with reference open or closed, clearing on pause/end/menu/retry, and fresh-round values after result/paused Retry (depends on T020).
- [X] T022 [US3] Implement openReference(section), idempotent closeReference(), changed-section reference events and lifecycle dismissal in js/application/level-run.js per contracts/briefing-flow.md; never change screen state, Round identity or update gating for reference access, reject unsupported sections or non-playing/over rounds, and retain the round's briefing snapshot for reuse (depends on T021).
- [X] T023 [US3] Add Crew stats and Problem schedule entry controls in js/adapters/ui/hud.js and suppress its capture-phase incident cycling, crew arming, Send, find-crew and Escape shortcuts while reference owns interaction; retain the separate existing paused How to Play route (depends on T022).
- [X] T024 [P] [US3] Extend js/adapters/ui/round-briefing.js and index.html with the bounded live-reference dialog reusing both renderers, section switching, prominent Time running label, Close and explicit Pause, visible clock/condition outside the panel, native button activation, focus containment, ordinary-close opener restoration, and Escape consumption; on pause/result/menu/retry dismiss without stealing destination focus; include no Start Round/dispatch/edit controls (depends on T022; may run alongside T023).
- [X] T025 [P] [US3] Update js/adapters/input/input.js to block/reset map interaction while reference is open, clearing held movement and pointer drag and preventing reference scrolling from zooming the map; combine blocking with current screen inputEnabled rather than changing the simulation or menuOpen gates, and recompute enablement on close instead of blindly enabling input (depends on T022; may run alongside T023 and T024).
- [X] T026 [US3] Wire reference events and combined input blocking in js/main.js, finalize live-reference scrolling/viewport styles in css/briefing.css, and coordinate reference event ownership with js/adapters/ui/menu.js so Escape closes reference before menu handling and hidden-tab/manual pauses still use existing explicit Resume behavior; do not add per-frame projection or table rebuilds (depends on T023, T024, T025).
- [X] T027 [US3] Add the level-only paused Retry control to index.html and bind it in js/adapters/ui/menu.js to the already defined paused.retry transition; confirm reference dismissal does not restore hidden opener focus and Retry resets damaged looks before showing the new roster (depends on T026).
- [X] T028 [US3] Execute running-reference, held-key, Tab/Enter/Space/Escape, manual/hidden-tab pause, end-while-reading and both Retry scenarios in specs/008-round-briefing/quickstart.md; verify unchanged scheduled activation and round outcomes, then record observed results and any fixes in that guide (depends on T027).

**Checkpoint**: All three user stories work end-to-end; preparation is untimed, reference reading is timed, and explicit pause/Retry semantics remain coherent.

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Update README.md and index.html How to Play copy to explain roster -> all problems -> Start Round, units/matches, scheduled activation, the live reference's running clock, and Retry returning to preparation; keep existing free-look/editor launch guidance (depends on T028).
- [X] T030 Run the complete tests/index.html suite and tests/architecture.test.js checks after integration; fix genuine regressions and record the passing summary in specs/008-round-briefing/quickstart.md, retaining existing core gameplay/free-look coverage rather than deleting failing assertions without a specified behavior change (depends on T028).
- [ ] T031 Execute the full browser UI/playthrough checklist in specs/008-round-briefing/quickstart.md in current Chromium and Firefox, including keyboard-only use, 200% zoom, long content, duplicate start prevention, ?menu=0, ?map=tiny, ?edit=1, invalid-level fallback, and console checks; record browser versions and results, fixing discovered issues (depends on T029 and T030).
- [ ] T032 Measure the existing 60 FPS normal-play and 5-second first-interactive budgets with maximum active incidents and reference open; conduct the five-player comprehension check with at least four successes as specified, and record measured results or an explicit uncompleted validation item in specs/008-round-briefing/quickstart.md rather than claiming unperformed checks passed (depends on T031).
- [X] T033 Reconcile implementation evidence against all FR-001 through FR-015 and SC-001 through SC-007 in specs/008-round-briefing/spec.md; review layer ownership/no new install or services, document remaining implementation or validation gaps in specs/008-round-briefing/quickstart.md, and rerun affected checks after final fixes without altering reviewer-owned requirements checklist markers (depends on T032).

## Dependencies & Execution Order

### Phase dependencies

```text
Setup T001
  -> Foundation T002-T010
  -> US1 T011-T015
  -> US2 T016-T020 (complete preparation MVP)
  -> US3 T021-T028 (live reference and retry surface)
  -> Polish T029-T033
```

### Task dependencies and parallel opportunities

- After T001, T002 projection tests and T003 screen tests use different files and can be authored together; T004 and T005 then implement their respective contracts independently.
- After T004/T005, T006 LevelRun tests and T007 GameSession tests can run together. T008 and T009 implementations then use separate files once their own tests exist.
- After T010, T011 roster renderer and T012 crew CSS can run together, followed by sequential shared HTML/MenuUI/wiring changes.
- After US1, T016 problem renderer and T017 schedule CSS can run together. T018/T019 integrate the complete entry flow sequentially.
- After T022, T023 HUD controls/guards, T024 dialog renderer/HTML and T025 map input guards can run together on distinct files; T026 integrates only after all three are complete.
- After T028, T029 copy updates can run alongside T030 full-suite validation; browser checks start after both finish. Avoid concurrent writes to quickstart.md: let the validation owner record evidence after any concurrent read-only run completes.
- Remaining tasks are sequential because they integrate shared files, consume prior results, or validate the complete feature.

### User story dependencies

US1 and US2 share foundational projection/flow but expose separate testable views. US2 integrates the roster navigation from US1. US3 relies on both renderers and the real start path. Shared-file changes are intentionally sequential; the stories are not falsely described as entirely parallel.

The full feature remains off the main line while the preparation surface is incomplete. US1 can be tested independently through its renderer and application fixtures, but the first releasable preparation MVP includes US1 and US2 so Play never leads to an unfinished step.

## Parallel Example: User Story 1

After T010, work on T011 in `js/adapters/ui/round-briefing.js` while T012 implements `css/briefing.css`. Integrate with T013 only when both are ready; do not edit MenuUI or main.js concurrently during T014/T015.

## Parallel Example: User Story 2

After T015, work on T016 in `js/adapters/ui/round-briefing.js` while T017 extends `css/briefing.css`. T018 owns the subsequent shared HTML/MenuUI integration.

## Parallel Example: User Story 3

After T022, work on T023 in `js/adapters/ui/hud.js`, T024 in `js/adapters/ui/round-briefing.js` and `index.html`, and T025 in `js/adapters/input/input.js`. These distinct file sets join at T026; no task may integrate against unfinished prerequisites.

## Implementation Strategy

1. Establish baseline and implement shared pure projection/state contracts with meaningful browser-only tests.
2. Implement and verify the US1 crew view independently; retain the existing normal entry until both preparation screens are complete.
3. Complete US2 and enable the two-step preparation plus explicit Start Round. This is the first playable preparation MVP.
4. Add US3 live reference and retry controls, preserving the same running Round and blocking only interaction while the reference owns focus.
5. Run the full validation guide and record actual evidence. Do not claim comprehension/performance checks passed without measurements.

## Notes

No new dependencies, persistence, external interfaces, art generation, or changes to level balance are required. Use existing domain rules and loaded art. Keep the cancelled feature 007 untouched. This command generates work only; it does not implement the feature or mark implementation tasks complete.



## Implementation status - 2026-10-18

31/33 tasks completed. T031 is partial: Chrome integration/layout checks pass; Firefox and native keyboard/tab switching remain unverified. T032 is pending real-device performance measurement and five-person comprehension testing. These tasks are intentionally unchecked; see quickstart.md for evidence and limitations. T033 reconciliation records these gaps without treating them as passed.

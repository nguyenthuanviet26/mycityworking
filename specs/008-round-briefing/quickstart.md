# Quickstart and Validation: Round Briefing

## Prerequisites and launch

Use a current desktop Chromium or Firefox browser and the repository files. No installation, build, package manager, backend, or external service is required.

1. Open `index.html` directly from disk, or open its URL on an existing plain static host.
2. Open `tests/index.html` separately for the browser-only logic suite. Its normal startup runs the harness; require a summary of zero failed tests.
3. Keep the browser console available to check startup and interaction errors.

These steps describe validation after implementation. Planning itself does not add runnable feature code or claim that these checks already pass.

Contracts: [application flow](contracts/briefing-flow.md), [UI behavior](contracts/briefing-ui.md), [data model](data-model.md).

## Automated logic coverage

Run the full existing suite, with new focused tests included in tests/index.html:

| Area | Required evidence |
| --- | --- |
| Projection | Exact roster/schedule counts, correct speed overrides, effective repair/warning modifiers, phase boundaries, stable equal-time ordering, repeated target occurrences, no source/map mutation. |
| Current trial values | Four crews, 18 occurrences, 240 seconds, target 10. Electricians' Best streetlight repair 1.8s; Drainage Team's Best pump repair 4.9s; helper road repair 8s. Warning durations 17.5/21/17.5/23.8s for road/roof/streetlight/pump. |
| Preparation | Play -> crews -> problems -> crews has no Round, hints, damage release, or elapsed simulation; 60 seconds of update calls do not mutate map/crew state. |
| Start | Start accepted from problems only; zero elapsed at construction; duplicate start input rejected; ordinary first update then advances normally. |
| Reference | Open/close and section switch keep playing state, Round identity, selected incident, and assignments. Identical controlled update steps with reference open versus closed produce identical gameplay values. Use a 10-second interval that does not end the round. |
| Pauses | Pause from reference closes it; updates cannot advance while paused; Resume retains same Round and camera state. |
| Retry | Result and paused Retry clean damage and discard old Round before showing roster; actual start creates fresh score/condition/crew/elapsed state with unchanged workload. |
| Compatibility | No-level default retains direct free look; invalid levels cannot start; ?menu=0 enters preparation for valid levels; architecture checks remain green. |

Tests use synthetic valid levels/maps and controlled dt values through the current harness. Do not import renderer, DOM UI, art images, or the game page into application tests. UI focus and browser visibility behavior are manually playtested below.

## Manual playtest checklist

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Launch and choose Play. | Crew review appears before gameplay; four actual crews with leaders/vehicles, depot coordinates, speeds, advantages, and all four damage match types. No clock runs. |
| 2 | Spend at least 60 seconds inspecting stats. | No incidents, travel, warning changes, repair progress, or condition loss occur. Effective stats match rule values above. |
| 3 | Continue to Problems and review every row. | 18 separate occurrences; all four kinds; 4:00 duration, three phase lengths, target 10; planned times, locations, phases, warning times, and crew matches are present. |
| 4 | Find repeated streetlight and roof occurrences and return to crews then problems. | No occurrences merge; list remains unchanged; navigation is untimed. Timing caveats and tutorial protection are explained. |
| 5 | Activate Start Round once, then try repeated activation. | One fresh round begins from zero without a fade consuming preparation time. Tutorial incident releases at its normal scheduled time; all future problems remain inactive until released. |
| 6 | Send a crew, then open Crew stats and switch to Problem schedule; read for 10 seconds. | Time running remains visible; clock, crew travel/repair, releases and urgency continue under ordinary rules. Opening/closing does not assign or redirect crews. |
| 7 | Use Tab, Shift+Tab, Enter, Space, numbers, arrows, wheel, and Escape in reference. | Focus/navigation/scrolling operate only on reference; no underlying Send, camera pan/zoom, or incident cycle occurs. Escape closes reference once and restores focus. Held pan keys do not persist. |
| 8 | Open reference, choose Pause, then Resume. Repeat by hiding and restoring the tab. | Reference closes, menu owns focus, clock stops; returning from tab stays paused until explicit Resume. Same round and assignments continue afterward. |
| 9 | Pause mid-round with active damage and choose Retry. | Fresh crew briefing, no old damage/assignments; old score/time/condition are discarded. Same roster and full schedule are shown. |
| 10 | Finish a round while reference is open; use result Retry. | Result replaces reference with correct existing result values; Retry enters preparation and never starts automatically. |
| 11 | In preparation choose Main menu, then Play again. | No background round starts; a fresh roster briefing opens. |
| 12 | Repeat the complete preparation and reference flow using keyboard only at 200% zoom and a narrow desktop window. | All rows/actions reachable, readable units and match text, no clipped navigation, hidden controls skipped. |
| 13 | Launch ?menu=0, ?map=tiny, ?edit=1, and an invalid-level fixture through existing test setup. | Valid trial skips menu but retains briefing; tiny stays free look; editor remains usable; invalid level follows current warning/free-look behavior with no Start Round. |
| 14 | Play end-to-end in Chromium and Firefox with maximum active incidents and moving crews, opening/closing reference. | Existing goal/scoring/result/pause rules work, no console errors or obvious frame-rate regression; target steady 60 FPS and first interactive load within 5 seconds on the constitution's reference conditions. |

## Comprehension check

With five first-time players, ask each to identify the Best crew for all four damage kinds, locate a named problem's planned time, state the target and duration, and explain whether the reference pauses play. At least four must complete the specified briefing comprehension tasks without assistance (SC-004). Record results during implementation validation; do not infer comprehension from logic tests.

## Completion evidence

Record full-suite pass/fail summary, browser versions, manual checklist results, timing/reference comparisons, and any performance/comprehension observations. Re-run affected checks after fixes. A documentation-only plan is not evidence of implementation completion.

## Implementation evidence - 2026-10-18

Baseline: installed Chrome headless, original tests/index.html: 319 passed, 0 failed. Independent execution of the same domain/application scripts in a JavaScript VM also passed all 319 cases. No package installation. Interactive browser connector inventory is empty; installed Chrome is used for browser validation instead. Firefox is not installed at the standard location.

Foundation: 328 logic tests passed. Headless Chrome preparation smoke: nine checks passed (crew entry, four cards, controlled 60-second untimed review, 18 rows, reversible navigation, zero-elapsed start, duplicate-start guard, scheduled first release, menu cleanup).

Final implementation validation (Chrome 155.0.8059.79, headless on this Windows workspace):

- Browser-only tests/index.html: **331 passed, 0 failed**, including architecture boundaries. Same 331 cases pass in an isolated JavaScript VM.
- Live-reference DOM smoke: 20 checks passed for running state, held-key reset, reference focus, no dispatch/arming leakage, Tab containment, map blocking, controlled ten-second advancement, all 18 rows, visible clock, Escape precedence, explicit pause/focus, paused clock, same-round Resume, both Retry entry points, damage cleanup, fresh values, result dismissal, loaded art, and no script errors.
- Compatibility smoke: menu=0 retains preparation; tiny remains direct free look with no Retry; edit=1&map=tiny loads the editor; an intentionally invalid target falls back to free look without Start Round. No script errors were captured in these checks.
- Hidden-tab event handler tested by dispatching visibilitychange with a synthetic hidden state: the reference closes and the game pauses; a synthetic return remains paused until Resume. Actual operating-system tab switching is not claimed by this test.
- A full controlled-step trial completed under normal release/dispatch/repair rules: 18/18 repaired, target 10, 240 seconds, score 4380, 3 stars, result reason cleared. The test dispatches compatible ready/returning crews without changing balance or forcing completion.
- Visually inspected crew and running-schedule screenshots. At a 1000x850 browser window with 200% CSS scaling, all preparation and reference action controls remained inside the viewport and all content remained scrollable. A discovered preparation height/width issue was fixed by sizing cards relative to the fixed menu container; the running reference uses compact controls when space is limited.
- git diff --check passed after removing an extra EOF blank line. No new package, backend, domain browser dependency, balance change, or persistence format was added.

### Remaining validation

- **T031 remains partly unverified**: Firefox is not installed at the standard locations and no interactive browser connector is available. Chrome DOM/event/screenshot checks are complete; a native keyboard-only walkthrough and real hidden-tab switch in both browser families still need a human/browser session.
- **T032 remains unverified**: real-device 60 FPS / first-interactive 5-second measurements and the five-person comprehension study were not performed. Headless virtual-time runs do not establish the target laptop's frame rate. No usability result is inferred from automated checks.
- These gaps do not represent missing feature code. They remain unchecked tasks rather than fabricated test passes.

### Requirement reconciliation

| Scope | Evidence |
| --- | --- |
| FR-001/007/008/010; SC-003 | Preparation lifecycle tests and browser preparation/start/navigation checks. |
| FR-002/003/009; SC-001/002 | Domain-derived projection tests, four actual crew cards, 18 actual problem rows, effective stats, loaded art. |
| FR-004/005/006 | Complete workload table, nominal phase/timing/urgency explanations, repeated-target/phase-boundary tests, full-round result. |
| FR-011; SC-006 | Paused/result Retry tests and DOM smoke; old damage/score/elapsed state discarded. |
| FR-012; SC-005 | Accessible controls/tables, text match levels, focus/Tab guards and high-scaling layout checks; native keyboard-only browser-family check remains in T031. |
| FR-013/014 | Updated tutorial, How to Play and README; read-only preparation/reference, no editing or advance dispatch controls. |
| FR-015; SC-007 | Reference tests compare identical controlled simulation with/without reference; browser live-reference smoke confirms continued time and normal pause precedence. |
| SC-004 | Crew capabilities and workload information implemented; five-person comprehension outcome pending T032. |

Reviewer-owned requirements.md was read as a gate and left unchanged. No before/after implementation hooks exist in .specify/extensions.yml (file absent).

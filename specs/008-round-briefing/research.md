# Research: Round Briefing

All decisions use existing repository behavior and the accepted specification. No new technology is selected; no external service or dependency is introduced.

## R1. Preparation is a screen flow; reference is not

**Decision**: Add briefing-crews and briefing-problems screen states for valid levels. Keep the live reference as LevelRun.referenceSection while ScreenMachine.state remains playing.

**Rationale**: LevelRun.update advances only while playing. Existing HUD Crew guide calls pause then openHowto, so using it for the reference would contradict the user's explicit time-keeps-running answer.

**Alternatives considered**: A reference screen state would require widening every playing-state gate and risks hidden-tab behavior. Reusing How to Play pauses. An independent clock for reference creates unnecessary timing rules.

**Evidence**: js/application/level-run.js update; js/application/screens.js TABLE; js/adapters/ui/hud.js guide click; js/adapters/ui/menu.js visibilitychange.

## R2. Construct a round only after explicit Start Round

**Decision**: Preparation holds a plain data projection, with round and hints null. On preparation entry reset any old Round's damaged looks and clear selection/assignments/reference. startRound from briefing-problems creates exactly one Round with zero elapsed time. Resume never reconstructs it.

**Rationale**: A paused pre-created Round makes accidental updates possible and complicates retry cleanup. Existing Round.reset restores target variants; LevelRun owns that cleanup. GameSession must apply the initial view on explicit fresh start, not treat it as pause resume. Preparation freezes the current background view without starting a Round.

**Alternatives considered**: Freeze a created Round using an extra boolean; run then rewind the first frame; put cleanup rules in main.js. All introduce more failure paths or violate layering.

**Evidence**: js/application/round.js reset; js/application/level-run.js _start/_stop/_onScreenChange; js/application/game-session.js _onScreenChange; js/main.js start.

## R3. Project effective stats from existing rules

**Decision**: Add buildRoundBriefing(level, map) in application. Use levelCrews, crew.speed || jobs[job].speed (matching Round), matchLevel, repairSeconds, and incidentKinds[kind].warnS * (level.warnScale || 1). Do not instantiate a Round or call update to derive the preview.

**Rationale**: The projection must match actual balance and honor overrides. For current trial, speeds are 4 / 2.5 / 3.5 / 3 tiles/s. Best streetlight repairs are 1.8 seconds; Best pump repairs 4.9 seconds. Helper repairs use twice base duration. Warning durations are 17.5 / 21 / 17.5 / 23.8 seconds for road/roof/streetlight/pump. Test numeric values with suitable tolerance; format decimal labels in the adapter.

**Alternatives considered**: Hard-coded stats or deriving from static CrewGuide rows would omit overrides and effective durations. A shared new rule engine is unnecessary because the domain already exports repair functions.

**Evidence**: js/domain/jobs.js; js/domain/level-checks.js levelCrews; js/application/round.js constructor, _checkUrgency, _moveCrews.

## R4. Schedule identity is occurrence identity

**Decision**: Preserve level.schedule order, use schedule index as stable occurrence identity, and retain every repeated kind/target. Compute nominal phase from planned time with boundaries assigned to the next phase. Mark tutorial protection separately from numeric warning duration.

**Rationale**: Round uses inc-<schedule index> and releases from the head of a queue. Busy targets or active limits delay that occurrence and subsequent ones. Preview phase and appearance time are planned, not a simulated release forecast or deadline.

**Alternatives considered**: Deduplicating by target loses work; predicting releases requires guessing dispatch choices; activating the entire workload violates clarification A.

**Evidence**: js/application/round.js _release/_targetBusy/_makeIncident/_advancePhase.

## R5. Rendering and input ownership

**Decision**: One adapter renders crew/schedule content for preparation and running reference, using jobArt and loaded imageSrc in the composition root. The live view is a bounded read-only panel with a visible Time running notice, close control, and accessible Pause button. It captures its navigation keys and coordinates HUD/Input guards without changing simulation gates. Escape closes the reference before closing incident selection or invoking pause.

**Rationale**: HUD registers capture-phase keyboard input, while Input and MenuUI also listen globally. Tab/Enter/Space and held camera keys must not dispatch, move the map, or trigger menu actions while navigating the reference. Reset held keys on open to prevent drift. Use textContent for labels and ordinary accessible table/button semantics. Preserve assignment and selection across open/close.

**Alternatives considered**: CSS overlay alone leaves keyboard leakage; disabling the simulation violates clarification B; rendering everything every frame adds avoidable work.

**Evidence**: js/adapters/ui/hud.js _onKey; js/adapters/input/input.js _bind/update; js/adapters/ui/menu.js _onKey/_show; js/adapters/ui/crew-guide.js.

## R6. Compatibility and pause boundaries

**Decision**: ScreenMachine({hasLevel: true}) opts valid levels into preparation; default false preserves maps without levels. ?menu=0 skips only the main menu, not preparation. Close reference on pause, finish, Retry, or menu entry; pause remains explicit after tab restoration. Add paused.retry so an in-round retry can return to preparation. Invalid levels preserve existing free-look fallback and offer no Start Round.

**Rationale**: main.js validates levels before constructing the flow. Current screen table has result.retry but no paused.retry, so the spec's in-round Retry needs a real action and control. Returning from a hidden tab already requires explicit Resume. Closing reference at boundaries keeps focus and stale-view handling deterministic.

**Alternatives considered**: Always preparing free-look maps changes unrelated use cases; treating Resume as a fresh start loses progress; preserving reference across every menu adds avoidable restoration states.

**Evidence**: js/main.js levelFor/start; js/application/screens.js TABLE; js/adapters/ui/menu.js visibilitychange; tests/application/screens.test.js.

## Resolution

All planning unknowns are resolved through repository inspection. Research on flow integration was delegated as requested by the planning skill and consolidated here. No technical clarification remains. Browser tests and performance measurements belong to implementation validation, not this documentation phase.


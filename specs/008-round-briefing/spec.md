# Feature Specification: Round Briefing

**Feature Branch**: `thyphuongdang` (existing branch; no branch hook configured)

**Created**: 2026-10-18

**Status**: Draft - ready for planning

**Input**: User description: "when start the round i need to see who i have in my crews and their stat. then i need all problem is have for this round so i can train to manage crew to solve those problem in times"

## Clarifications

### Session 2026-10-18

- Q: After reviewing all problems in the briefing, should they appear gradually during play or all be active when the round starts? → A: Preview all problems before play; they become active gradually at their scheduled times, subject to existing release rules.

- Q: Should you be able to reopen the crew stats and full problem schedule during the timed round? → A: Open them during play; time keeps running.

## User Scenarios & Testing *(mandatory)*

A player preparing for a round first reviews their available crews and capabilities, then reviews every problem scheduled for that round. They explicitly start the timed challenge when ready. This supports the core gameplay loop: understand damage, manage limited crews, dispatch suitable teams, and finish repairs within the storm's time limit.

### User Story 1 - Know my crews before starting (Priority: P1)

As a player, I see who is on my crew roster and compare their capabilities before the round clock starts.

**Why this priority**: Understanding available resources is the first step in learning how to manage crews.

**Independent Test**: Choose Play and review every crew for at least 60 seconds. Confirm the roster matches the upcoming round and no gameplay time passes.

**Acceptance Scenarios**:

1. **Given** a valid trial level, **When** the player chooses Play, **Then** a preparation briefing opens with the crew roster first and the round clock stopped.
2. **Given** the crew roster, **When** the player inspects a crew, **Then** they see its job, leader name and portrait, vehicle, starting location, travel speed with units, special advantage, and Best / Can help / Can't fix compatibility for each damage kind in the round.
3. **Given** a crew that can fix a damage kind, **When** its capability is inspected, **Then** its effective repair duration in seconds is shown, including helper penalties and repair advantages; incompatible pairings show Can't fix rather than a duration.
4. **Given** the briefing, **When** the player spends 60 seconds comparing crews, **Then** no storm time, incident warning time, city condition, crew movement, or repairs advance.

---

### User Story 2 - See the whole round's problems (Priority: P1)

As a player, I review every scheduled incident and its timing so I can anticipate competing demands on my crews.

**Why this priority**: A complete workload allows deliberate practice rather than learning only when an unexpected incident appears.

**Independent Test**: Continue from the roster to the problem overview and compare every entry with the upcoming round, including repeated damage at the same location.

**Acceptance Scenarios**:

1. **Given** the roster, **When** the player continues, **Then** an overview lists every scheduled incident once, in scheduled time order, with total incident count, round duration, storm phases, and required repair target.
2. **Given** an incident entry, **When** the player reads it, **Then** they can identify damage kind, target location, scheduled appearance time measured from round start, storm phase, effective warning duration before urgency, and which crews can repair it.
3. **Given** repeated incidents of the same kind or at the same location, **When** the list is reviewed, **Then** each occurrence remains separately identifiable by its sequence and scheduled time.
4. **Given** the overview, **When** the player returns to the roster and then back, **Then** the same upcoming workload remains visible and no gameplay time is consumed.
5. **Given** scheduled appearance times, **When** the player reads the overview, **Then** it explains that active-incident limits or an occupied target may delay an incident's actual release; scheduled times are not presented as guaranteed deadlines.

---

### User Story 3 - Start and repeat the training round (Priority: P2)

As a player, I start the timed challenge after preparation and retry the same round to improve my crew management.

**Why this priority**: Preparation must lead into a complete playable challenge and support learning through repetition.

**Independent Test**: Review the briefing, start and complete a round, then Retry and inspect the new briefing.

**Acceptance Scenarios**:

1. **Given** the problem overview, **When** the player selects Start Round, **Then** one fresh round starts at zero elapsed time with the roster, schedule, duration, and repair target shown in the briefing.
2. **Given** the timed round has started, **When** the player manages crews, **Then** incidents appear under existing release rules and existing clock, dispatch, repair, scoring, and win/lose rules apply.
3. **Given** a result or an in-round Retry action, **When** Retry is chosen, **Then** the player returns to a fresh briefing for the same level before the new clock starts.
4. **Given** a briefing, **When** the player returns to Main menu, **Then** no round starts and choosing Play later begins a fresh briefing.
5. **Given** a briefing, **When** keyboard-only controls are used, **Then** the player can inspect all roster and incident information, move between briefing steps, start the round, and return to Main menu.

6. **Given** a running round, **When** the player opens crew stats or the full problem schedule, **Then** the reference is available while storm time, incident releases, urgency, city condition, crew travel, and repairs continue normally; closing it returns to normal play without restarting the round.
7. **Given** an open in-round reference, **When** the player explicitly pauses or hides the browser tab, **Then** the existing pause rules stop gameplay; resuming or returning follows existing resume behavior.

### Edge Cases

- A long schedule or roster must remain fully accessible through scrolling or equivalent navigation; Start Round and Back remain reachable.
- Incidents sharing a scheduled time retain their level-defined order and remain separate entries.
- Repeated damage at one location is shown as separate occurrences, not collapsed into one problem.
- A named building uses its player-facing location name; an unnamed road target uses a clear map coordinate or equivalent unique location label.
- A crew unable to fix a damage kind shows an explicit incompatibility rather than a misleading zero-second repair time.
- Hiding the browser tab during preparation and returning must not start the round.
- Repeated Start Round input starts only one round and does not reset a round already in progress.
- An invalid level follows existing validation behavior; the briefing must not offer Start Round for an unplayable level.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Play for a valid trial level MUST open an untimed briefing before timed gameplay, presenting crew review before the complete problem overview.
- **FR-002**: The roster MUST show exactly the crews available in the upcoming round. Each entry MUST include job, leader identity and portrait, vehicle, starting location, travel speed with units, special advantage, and compatibility with every damage kind scheduled for the round.
- **FR-003**: For each compatible crew and damage kind, the briefing MUST show the effective repair duration in seconds, including repair advantages and the Can help slowdown. Incompatible pairings MUST explicitly show Can't fix.
- **FR-004**: The problem overview MUST list every scheduled occurrence exactly once in chronological order, preserving level order for equal times. Entries MUST include sequence, damage kind, identifiable target location, scheduled appearance time from round start, storm phase, effective warning duration, and compatible crews with their match levels.
- **FR-005**: The overview MUST show total scheduled incidents, round duration, phase names and durations, required repair count, and the existing win/lose conditions, including that reaching the repair target secures a win and play can continue for a higher score.
- **FR-006**: Scheduled appearance times MUST be distinguished from warning durations. The overview MUST explain that warning time begins on actual release, except the tutorial incident's existing protection until its first dispatch, and that release can be delayed by existing incident limits or target occupancy.
- **FR-007**: No gameplay clock, incident release, warning timer, city-condition drain, crew travel, or repair progress MUST advance during preparation. Start Round MUST be the explicit action that begins timed play at zero elapsed time.
- **FR-008**: The player MUST be able to move back and forth between crew review and problem overview without starting gameplay or changing the upcoming roster or workload. Main menu MUST be reachable without starting a round.
- **FR-009**: Briefing information MUST match the effective rules of the round that starts, including crew speed overrides, repair modifiers, warning-time scaling, current schedule, duration, and target. Updating a level or crew balance MUST be reflected the next time its briefing opens.
- **FR-010**: Start Round MUST start exactly one fresh round. Once started, existing scheduled releases, urgency, dispatch, repairs, scoring, pause, and result behavior MUST apply. Previewed future incidents MUST NOT become active or dispatchable merely because they were shown in preparation.
- **FR-011**: Retry MUST return to the briefing with a fresh round's information and no carried-over selections, assignments, repairs, scores, or elapsed time. The roster and scheduled workload MUST remain repeatable for the same unchanged level.
- **FR-012**: All briefing content and navigation MUST be usable with mouse and keyboard. Match levels MUST have text labels and MUST NOT rely on color alone.
- **FR-013**: Tutorial and How to Play MUST explain the preparation sequence and that the countdown starts on Start Round. This feature supersedes feature 005's immediate start on Play by inserting preparation; its running-round rules otherwise remain applicable.
- **FR-014**: Preparation MUST NOT offer crew purchasing, stat upgrades, incident editing, advance dispatch orders, or a different victory target. The existing timed challenge remains the activity used to practice management.

- **FR-015**: During a running round, the player MUST be able to open and close the crew capability reference and complete problem schedule using mouse or keyboard. Opening, reading, switching reference sections, and closing MUST NOT pause gameplay or reset the round. Storm time, releases, warnings, city condition, crew movement, and repairs MUST continue normally. Crew stats MUST be labeled as capabilities; the schedule MUST retain its planned-time meaning and MUST NOT suggest future incidents are dispatchable. Existing manual and hidden-tab pauses MUST still apply while the reference is open.

### Key Entities

- **Round briefing**: Preparation information for one level, including roster, scheduled workload, duration, phases, repair target, and start readiness.
- **Crew profile**: A round-specific crew's identity, job, vehicle, starting location, effective speed, advantage, compatibility, and repair durations.
- **Scheduled problem**: One future damage occurrence with sequence, kind, target location, planned release time, phase, warning duration, and crew matches; distinct from an active incident.
- **Preparation state**: Whether the player is reviewing crews or problems, with no elapsed gameplay time until explicit start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every valid briefing contains 100% of the upcoming roster and scheduled incident occurrences, with no missing, duplicate, or merged occurrences. For the current trial this means four crews and 18 problems.
- **SC-002**: All displayed speeds, compatible repair durations, warning durations, schedules, phase lengths, and targets match the effective values used in the started round in every acceptance run.
- **SC-003**: Waiting 60 seconds in either preparation step changes gameplay time, city condition, incident state, crew positions, and repair progress by zero; starting afterward begins at zero elapsed gameplay time.
- **SC-004**: At least 4 of 5 first-time playtesters can identify the Best crew for each of the four trial damage kinds, name the repair target and round duration, and find the scheduled time of a specified problem using the briefing without assistance.
- **SC-005**: A keyboard-only player can review every crew and problem, move back between steps, and start the challenge in every accessibility acceptance run.
- **SC-006**: In all Retry acceptance runs, the player receives the same roster and scheduled workload for an unchanged level and begins with fresh gameplay values.

- **SC-007**: In every in-round reference acceptance run, spending 10 seconds reading without a separate pause advances gameplay by the same amount as 10 seconds of ordinary play; opening and closing the reference does not restart the round or change crew assignments.

## Assumptions

- Confirmed workload policy: every scheduled incident is previewed before play, then becomes active gradually at its scheduled time, subject to existing release rules. Problems are not all activated at round start.
- Crew stats refer to existing travel speed, repair duration, compatibility, and special advantage. No new stamina, health, experience, or hiring system is introduced.
- The briefing has two ordered steps: crews, then problems. Reviewing information requires no reading-confirmation checkbox; the explicit Start Round action expresses readiness.
- Practice uses the existing round and Retry flow. A separate training mode, saved plans, new score analysis, and automatic pauses during dispatch decisions are outside scope.
- The in-round reference shows crew capabilities and the complete planned schedule; a live incident-status dashboard or live crew-status view is outside this feature. The cancelled feature 007 is not a dependency and supplies no timing policy for this feature.
- Depends on features 005 and 006 for the playable trial, schedule, crew rules, results, and pause behavior.
- Planning must include a short manual playtest with steps and expected results covering the user scenarios, consistent with the project constitution.

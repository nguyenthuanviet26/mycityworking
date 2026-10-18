# Feature Specification: Decision Timing

**Feature Branch**: `thyphuongdang` (existing branch; no branch hook configured)

**Created**: 2026-10-18

**Status**: Draft — awaiting timing clarification

**Input**: User description: "I want the time only set when i have read the problem and have final decision"

## User Scenarios & Testing *(mandatory)*

This feature serves the core loop of reading storm damage, choosing a repair crew, and confirming a dispatch. Players need time to understand the problem before timed consequences apply.

The scenarios below propose pausing during incident review and resuming after a confirmed dispatch. The timing policy must be confirmed before planning.

### User Story 1 - Read and choose without time pressure (Priority: P1)

As a player, I can read an incident and compare crews without losing storm time or city condition while deciding.

**Why this priority**: Reading the problem should not penalize the player before they commit to a response.

**Independent Test**: Open an incident, spend 30 seconds reading and changing crew selections, then confirm a valid dispatch.

**Acceptance Scenarios**:

1. **Given** an active round, **When** the player opens an incident, **Then** gameplay enters a clearly indicated decision pause.
2. **Given** a decision pause, **When** the player reads for 30 seconds or changes crews, **Then** storm time, warning times, city condition, crew travel, and repair progress remain unchanged.
3. **Given** a valid choice, **When** Send or its keyboard equivalent successfully dispatches the crew, **Then** timed play resumes without counting time spent deciding.

---

### User Story 2 - Review alternatives and cancel (Priority: P2)

As a player, I can inspect another incident, correct a choice, or leave review without accidentally sending a crew.

**Why this priority**: Exploring choices must not count as a final decision, and busy crews must not leave the player trapped in review.

**Independent Test**: Switch incidents, attempt an unavailable dispatch, and close review without sending.

**Acceptance Scenarios**:

1. **Given** a decision pause, **When** another incident or crew is selected, **Then** the pause continues and no crew is sent automatically.
2. **Given** an incompatible or unavailable crew, **When** Send is attempted, **Then** a reason is shown and the pause continues.
3. **Given** a decision pause, **When** the player explicitly cancels or closes review, **Then** play resumes without dispatch; the review explains this timing effect before cancellation.
4. **Given** an armed crew, **When** clicking a compatible incident successfully dispatches it, **Then** the click counts as the confirmed decision and timed play continues.

---

### User Story 3 - Preserve timing through pause and retry (Priority: P2)

As a player, I can pause, leave the browser tab, or retry without losing decision time or carrying old choices into a new round.

**Why this priority**: The new policy must cooperate with the existing round lifecycle.

**Independent Test**: Open review, pause and resume, hide and restore the tab, then retry.

**Acceptance Scenarios**:

1. **Given** a decision pause, **When** the pause menu is opened and closed or the tab is hidden and restored, **Then** review remains paused until successful dispatch or explicit cancellation.
2. **Given** any round state, **When** Retry is chosen, **Then** old choices and pause reasons are cleared and the new round follows fresh-round timing rules.
3. **Given** a finished round or the main menu, **When** old dispatch input is received, **Then** it cannot resume or advance the old round.

### Edge Cases

- No crew is sendable: cancellation lets existing work progress; a refused Send never resumes time.
- Multiple incidents and working crews: all timed gameplay freezes together during review.
- Repeated Send input: one accepted dispatch ends the decision pause once, without advancing extra time.
- Inspecting an assigned or repairing incident follows the same review and cancellation rules without forcing reassignment.
- A nearly expired storm or depleted city condition retains its values during review; normal end rules apply after resuming.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The timing policy MUST be confirmed: [NEEDS CLARIFICATION: Should time pause for every incident review until a confirmed dispatch, start only after the first confirmed dispatch and then continue normally, or advance in discrete turns after each confirmed decision?] The remaining requirements describe the incident-review pause proposal and must be revised if another policy is selected.
- **FR-002**: Opening an incident MUST pause storm time, phase progression, incident releases, warning times, city-condition drain, crew travel, and repairs.
- **FR-003**: Reading, changing crew choices, and switching incidents MUST remain available while paused and MUST NOT send a crew or resume time.
- **FR-004**: A successful explicit Send or keyboard equivalent MUST resume gameplay from paused values. Reading time MUST NOT count toward gameplay time or the result's time used.
- **FR-005**: A refused dispatch MUST show a reason and leave the decision pause active.
- **FR-006**: Explicitly closing or cancelling review MUST resume play without dispatch; the review MUST explain this effect before cancellation.
- **FR-007**: A successful crew-first dispatch MUST count as confirmation. Arming a crew alone MUST NOT dispatch it or alter the clock state.
- **FR-008**: The game MUST visibly distinguish decision-paused and running play and explain how to resume time.
- **FR-009**: Removing a menu or hidden-tab pause MUST NOT override an active decision pause; dispatch MUST NOT override another active pause reason.
- **FR-010**: Retry and Main menu MUST clear old decision state. Finished rounds MUST remain stopped despite later input.
- **FR-011**: Tutorial and How to Play MUST explain the selected timing policy. This feature supersedes feature 005 FR-004d where its immediate-running rule conflicts with the selected policy.
- **FR-012**: Existing crew compatibility, dispatch, repair, scoring, storm duration, and victory rules MUST apply during running play, with the same outcomes for the same sequence of actions and elapsed gameplay time.

### Key Entities

- **Decision review**: The reviewed incident, selected crew, and whether the player is deciding, has dispatched, or has cancelled.
- **Round timing state**: Whether gameplay can advance, active pause reasons, and elapsed gameplay time excluding review time.
- **Confirmed dispatch**: An accepted crew assignment, distinct from crew selection or a rejected assignment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every acceptance run, 30 seconds of review changes storm time, warning times, city condition, crew positions, and repair progress by zero.
- **SC-002**: Every accepted dispatch resumes play without charging the review interval; every rejected dispatch leaves the decision pause active.
- **SC-003**: All cancellation, crew-first dispatch, nested pause, retry, and finished-round scenarios produce their specified timing behavior.
- **SC-004**: At least 4 of 5 first-time playtesters identify when time is paused and resume after choosing a crew without assistance.

## Assumptions

- "Problem" means a storm-damage incident in the trial level; "final decision" means a successful dispatch.
- Incident-review pausing is a proposal awaiting confirmation. Automatic pauses on incident arrival, manual time setting, and fixed-duration turns are outside this proposal.
- Before opening review, time runs normally so the tutorial incident can appear. Delaying the initial countdown would require specifying how the first incident is presented.
- Closing review is an explicit decision to continue without acting, allowing busy crews to finish.
- Depends on trial-round, four-crew dispatch, incident-panel, and pause behavior from features 005 and 006.
- Planning must include a short manual playtest covering the acceptance scenarios, as required by the constitution.

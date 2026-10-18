# Feature Specification: Crew Jobs

**Feature Branch**: `006-crew-jobs`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "i want my crew have lot type of job, each job can have advantages and suit for each type of damage so when we need to send a crew we need to choose the suitable person"

## Overview

In the trial level (feature 005) the player has **one** repair truck that fixes everything the
same way, so sending it is never a decision. This feature replaces it with a **team of crews
with different jobs** — for example Road Crew, Builders, Electricians and a Drainage Team.
Each job is good at certain kinds of damage, can help a little with others, and has its own
advantage (a faster vehicle, quicker repairs, a bonus). Different kinds of damage appear in
the city, so every time something breaks the player must think: **who is the right crew to
send — and is the right one free?**

**Core loop served** (Constitution Principle II): the "choose who to send" step of the loop
(incident appears → **choose the crew** → crew travels → repair → score). It turns sending from
a single click into the game's main decision, and is the first step toward the "send the
right workers" promise in the game's How to Play text.

**Out of scope for this feature**: hiring, firing, levelling up or paying crews; crew fatigue
or morale; individually named people with personal stats; more than one level; new artwork
(crews and damage use pictures already in the `Isometric City` pack); crews working together
on one incident.

## Clarifications

### Session 2026-10-18

- Q: How much slower should a "Can help" crew be, and what should it lose? → A: 2× the base repair time and no "Right crew" bonus (points, early bonus and refill unchanged).
- Q: Should each crew appear on the map as a vehicle (a team driving a truck or van), or as a single person walking? → A: A team in a vehicle; the crew bar and panel show the team's leader as a small person icon with a name (e.g. "Electricians — Linh").
- Q: With four crews instead of one truck, should the trial level get harder to stay challenging? → A: Scale up — about 18 incidents mixed across the 4 kinds, max active 3 / 4 / 6 per phase, warnings about 30% shorter, target 10 repairs, and same-kind damage clustered so the best crew is sometimes busy.
- Q: Besides "click the incident, then pick a crew", should the player also be able to click a crew in the crew bar first and then click the incident? → A: Both ways — incident first (panel) or crew first (click a crew in the bar to arm it, then click an incident to send it; Can't-fix incidents are greyed out while a crew is armed).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose the right crew for the damage (Priority: P1)

The player starts the trial level and sees a **crew bar** along the bottom of the screen with
four crews, each with its job icon, leader's face and name, vehicle and status
(e.g. "Road Crew — Minh — ready").
A streetlight falls in the rain and an incident pin appears: "Streetlight down". The player
clicks it; the incident panel now lists every crew with a clear **match badge**:
**Best** (Electricians), **Can help** (slower), or **Can't fix**. Next to each crew it shows
how long the trip and the repair would take ("arrives in 6 s · repair 3 s"). The player picks
the Electricians and presses **Send**. The Electricians' van drives to the streetlight, fixes
it quickly, and the player scores full points with a "Right crew!" bonus.

**Why this priority**: This *is* the feature: different jobs, matched to different damage,
chosen by the player. With only this story the game already asks the player to think before
sending.

**Independent Test**: Start the trial level, wait for a streetlight incident, open it and check
the crew list shows Electricians as Best. Send them and confirm the repair takes the
Electricians' repair time and gives the right-crew bonus. Repeat with a road incident and the
Road Crew.

**Acceptance Scenarios**:

1. **Given** the level starts, **When** the play screen appears, **Then** a crew bar shows every
   crew with its job name, icon and status (ready / driving / repairing / returning).
2. **Given** an incident is selected, **When** the incident panel opens, **Then** it lists
   every crew with its match badge for this damage (Best / Can help / Can't fix), its status,
   and its estimated arrival and repair time.
3. **Given** the player selects a crew marked Best and presses Send, **When** that crew arrives,
   **Then** it repairs in its normal repair time and the score includes a "Right crew" bonus.
4. **Given** a crew marked Can't fix, **When** the player looks at it in the panel, **Then** it
   cannot be sent to this incident (its Send option is disabled with the reason).
5. **Given** an incident is selected, **When** the panel opens, **Then** the best available
   crew is pre-selected, so pressing Send (or Enter) straight away sends a sensible crew.
6. **Given** two crews are out on jobs, **When** the player sends a third, **Then** each crew
   moves, repairs and returns on its own, independently of the others.

---

### User Story 2 - Different kinds of damage across the city (Priority: P2)

During the storm, the city suffers four kinds of damage, each with its own pin icon and label:
**Road cracked** (road tiles), **Roof damaged** (buildings), **Streetlight down**
(streetlights), **Pump station failing** (the pump station). The schedule mixes them so that
in each phase the player sees at least two different kinds, and in Peak storm all four, which
forces choices: the best crew may be busy or far away, so the player must decide whether to
wait for it or send a crew that "can help" more slowly.

**Why this priority**: Jobs only matter if damage varies. Story 1 can be shown with two kinds
of damage; this story makes the whole level use the job system.

**Independent Test**: Play a full round and record the incidents: all four kinds appear, each
with its own icon and label, and each restores its target to the normal look when repaired.

**Acceptance Scenarios**:

1. **Given** a damage kind is released, **When** it appears, **Then** its target switches to
   the damaged look and the pin shows that kind's icon and label.
2. **Given** a full round, **When** it is played to the end, **Then** all four damage kinds
   have appeared at least once, and Peak storm contains all four.
3. **Given** the best crew for an incident is busy, **When** the player opens that incident,
   **Then** the panel shows when the best crew will be free, so the player can choose between
   waiting and sending a "Can help" crew.

---

### User Story 3 - Each job has its own advantage (Priority: P3)

Beyond what they can fix, jobs feel different: the **Road Crew** drives a fast pickup; the
**Builders** are slow on the road but repair roofs with extra points; the **Electricians**
drive a quick van and can also help at the pump station; the **Drainage Team** fixes pump
stations and can help with cracked roads (water under the road). A short **Crew guide**
(opened from the crew bar or the pause menu's How to Play) shows each job's icon, vehicle,
what it is Best at, what it Can help with, and its advantage.

**Why this priority**: Advantages add depth and replay value, but the core choice already
works with matching alone.

**Independent Test**: Send each crew the same distance and compare travel times; compare repair
times for Best vs Can help on the same damage; open the Crew guide and check it matches what
happens in play.

**Acceptance Scenarios**:

1. **Given** two crews with different vehicle speeds, **When** both drive the same route,
   **Then** the faster one arrives first, by the difference shown in the Crew guide.
2. **Given** a "Can help" crew is sent, **When** it repairs, **Then** the repair takes
   twice the base repair time (FR-012) and gives no right-crew bonus.
3. **Given** the Crew guide is open, **When** the player reads it, **Then** every job lists its
   vehicle, Best damage, Can-help damage and advantage, and the values match play.

---

### Edge Cases

- **No suitable crew free**: every crew that can fix the incident is busy — the panel says so
  and shows which crew frees up first; the player may still send a "Can help" crew if one is
  free, or wait.
- **No crew at all can fix a damage kind**: never allowed — every damage kind has at least one
  Best crew in the level (the level checker refuses the level otherwise).
- **Redirect**: a crew still driving can be redirected to another incident it can fix; a
  repairing crew cannot be sent until it finishes.
- **Two crews sent to the same incident**: not allowed — an incident already assigned shows the
  assigned crew; sending another crew replaces the first (which turns back to its depot).
- **Crews on the same road tile**: allowed; vehicles may overlap briefly and are still drawn in
  correct depth order.
- **Keyboard play**: number keys 1–4 pick a crew in the open panel (or arm it when no panel is
  open); Enter sends the highlighted crew; Tab still cycles incidents.
- **Armed crew becomes busy**: if an armed crew starts repairing (e.g. it arrives somewhere
  while armed), it is disarmed automatically.
- **Armed crew + incident already assigned to another crew**: the click sends the armed crew
  and releases the other one (same rule as FR-010).
- **Tutorial**: hints now teach choosing the crew ("Pick the crew marked Best") as well as
  sending it.
- **Pause / Retry / Main menu**: every crew freezes on pause; Retry and Main menu put every crew
  back at its depot.

## Requirements *(mandatory)*

### Functional Requirements

**Jobs and crews**

- **FR-001**: The trial level MUST have four crews, one per job: **Road Crew**, **Builders**,
  **Electricians**, **Drainage Team**. Each crew is a team that travels on the map **in its
  vehicle** (a picture from the existing pack, shown facing its direction of travel; no
  workers on foot). Each crew MUST have a job name, a job icon, a vehicle, a depot tile, a
  vehicle speed, and a **team leader** shown as a small person icon (from the pack's
  characters) with a name, e.g. "Electricians — Linh", in the crew bar and the incident panel.
- **FR-002**: Each job MUST define, for every damage kind, one of three match levels:
  **Best**, **Can help**, or **Can't fix**. Every damage kind MUST have at least one Best job.
- **FR-003**: Jobs, their match levels and advantages MUST be described as data, so a teammate
  can rebalance or add a job without changing game rules.
- **FR-004**: Each crew MUST move, repair and return independently; any number of crews may be
  out at the same time.

**Damage kinds**

- **FR-005**: The level MUST include four damage kinds — Road cracked (road tile), Roof damaged
  (building), Streetlight down (streetlight prop), Pump station failing (pump station
  building) — each with its own label, pin icon, base repair time, warning time and points,
  and each restoring its target's normal look when repaired.
- **FR-006**: The trial level's schedule MUST contain all four damage kinds, with at least two
  kinds in each phase and all four in Peak storm.
- **FR-006a**: The trial level MUST be rebalanced for four crews: about **18** scheduled
  incidents (up from 10), at most **3 / 4 / 6** active incidents in Drizzle / Downpour / Peak
  storm, warning times about **30% shorter** than in feature 005, and a goal of **10 repairs**
  (up from 6). The goal text, hints and How to Play MUST show the new target.
- **FR-006b**: The schedule MUST include at least **two clusters** where two or more incidents
  of the same kind appear within a few seconds of each other, so that the Best crew for that
  kind is busy and the player must choose between waiting and a "Can help" crew (SC-004).

**Choosing and sending**

- **FR-007**: The incident panel MUST list every crew with its match badge, its status, and
  — for crews that can be sent — the estimated arrival time and repair time for this incident.
- **FR-008**: The panel MUST pre-select the best choice: a free Best crew if any (nearest
  first), else a free Can-help crew, else nothing.
- **FR-009**: The player MUST be able to pick any crew in the list (click, or keys 1–4) and
  send it with **Send** / Enter; a Can't-fix crew MUST NOT be sendable and MUST show why.
- **FR-009a**: The player MUST also be able to send **crew first**: clicking a crew in the crew
  bar (or pressing 1–4 with no incident panel open) **arms** it — highlighted in the bar — and
  the next click on an incident sends that crew there. While a crew is armed, incidents it
  can't fix MUST be shown greyed out and clicking one MUST NOT send (a short message says
  why); Esc, clicking the armed crew again, or clicking empty map disarms it. A crew that is
  repairing MUST NOT be armable.
- **FR-010**: A crew that is driving MAY be redirected; a crew that is repairing MUST NOT be
  sent elsewhere until its repair ends. Sending a second crew to an already-assigned incident
  MUST release the first crew, which returns to its depot.
- **FR-011**: When the best crew for an incident is busy, the panel MUST show when it will be
  free.

**Repair rules**

- **FR-012**: A Best crew MUST repair in the damage kind's base repair time (less any repair
  advantage of its job); a Can-help crew MUST take **2×** the base repair time and MUST NOT
  earn the "Right crew" bonus. It still earns the damage kind's points, the early-repair bonus
  and the city-condition refill as usual.
- **FR-013**: A repair by a Best crew MUST add a "Right crew" bonus to the score; the feedback
  ("+N · Right crew!") MUST be visible when the repair finishes.

**Advantages**

- **FR-014**: Each job MUST have one stated advantage that changes play, from: faster vehicle,
  faster repairs on its Best damage, or extra points on its Best damage. The four jobs MUST
  NOT all share the same advantage.
- **FR-015**: A Crew guide MUST list each job's icon, vehicle, Best and Can-help damage and its
  advantage, reachable from the crew bar and from How to Play.

**Existing behaviour**

- **FR-016**: Everything else in the trial level (phases, urgency, city condition, goal,
  result, hints, pause, Retry) MUST keep working; hints MUST be updated to teach choosing a
  crew.
- **FR-017**: The crew bar MUST let the player move the camera to a crew (double-click its
  entry, or a small "find" button on it); a single click arms the crew (FR-009a).

### Key Entities

- **Job**: name, icon, vehicle picture, vehicle speed, advantage, and a match level (Best /
  Can help / Can't fix) for each damage kind.
- **Crew**: one team doing one job, travelling in one vehicle — leader name and portrait,
  position, facing, depot, status (ready, driving, repairing, returning), assigned incident.
- **Damage Kind**: label, pin icon, target type (road tile, building, streetlight, pump
  station), base repair time, warning time, points.
- **Match**: the pairing of a job and a damage kind — its level decides whether a crew can be
  sent and how fast and well it repairs.
- **Dispatch choice**: for a selected incident, the list of crews with badge, status, arrival
  estimate and repair estimate, plus the pre-selected crew.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the tutorial, players send a Best crew in at least 70% of dispatches in
  their first full round, showing the badges are understood.
- **SC-002**: Sending a chosen crew takes at most 2 clicks either way: click the incident then
  Send (or Enter) for the pre-selected crew, or click a crew in the crew bar then the incident.
- **SC-003**: In playtests, at least 4 out of 5 players can say, after one round, which crew to
  send for each of the four damage kinds.
- **SC-004**: At least two moments per round where the best crew is busy and the player must
  choose between waiting and a "Can help" crew (verified by playing the scheduled round).
- **SC-004a**: A player who always sends the right crew without delay still sees the City
  condition drop below 90% at least once per round (the level stays challenging with four
  crews).
- **SC-005**: The game still holds a steady 60 frames per second with all four crews moving
  and the maximum number of incidents active.
- **SC-006**: All existing game-logic tests still pass, and the trial level playtest checklist
  still passes with crews instead of the single truck.

## Assumptions

- This feature changes the trial level from feature 005; there is still only one level. Its
  numbers are scaled up for four crews (FR-006a); the exact schedule is tuned in playtesting.
- One crew per job (four crews in total) is enough for the trial; more crews of the same job
  are a later feature.
- All crews start at the garage area; their depots may be different road tiles near it.
- Vehicles come from the existing `Vehicles` folder (e.g. pickup for the Road Crew, box truck
  for the Builders, van for the Electricians, green truck for the Drainage Team); job icons can
  be simple drawn symbols or text.
- Starting match table (to be tuned in playtesting):

  | Damage \ Job | Road Crew | Builders | Electricians | Drainage Team |
  |---|---|---|---|---|
  | Road cracked | Best | Can help | Can't fix | Can help |
  | Roof damaged | Can't fix | Best | Can help | Can't fix |
  | Streetlight down | Can't fix | Can't fix | Best | Can't fix |
  | Pump station failing | Can't fix | Can't fix | Can help | Best |

- Starting advantages: Road Crew — fastest vehicle; Builders — +50% points on roofs (slow
  vehicle); Electricians — fast vehicle and quick repairs on streetlights; Drainage Team —
  faster repairs on pump stations.
- The trial map gets streetlights and a pump station as targets (placed with the map
  decorator); all damaged looks already exist in the asset pack.
- The existing early-repair bonus and city-condition refill keep working on top of the
  right-crew bonus.
- Depends on feature 005 (trial level, round, incident panel, hints) and feature 001 (map,
  routing data).

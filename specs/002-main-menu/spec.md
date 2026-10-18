# Feature Specification: Main Menu

**Feature Branch**: `002-main-menu`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "i want a menu page for my game"

## Overview

Right now, opening the game drops the player straight onto the city map. This feature adds a
**main menu** as the first thing the player sees, plus a **pause menu** inside the game, so
the game feels like a finished product and the player always has a clear way in and out.

**Core loop served** (Constitution Principle II): the entry and exit points of the loop. The
menu is how a player starts a session and returns from one. It deliberately stays small:
the level select, save slots and settings for systems that don't exist yet (sound, credits
economy) belong to later features.

## Clarifications

### Session 2026-10-17

- Q: What should the game's title on the main menu be? → A: "CaptAIn" (exact capitalisation, with "AI" in capitals).
- Q: Should the main menu show rain falling over the city in the background? → A: Yes — light rain over the drifting city, on the main menu only (not during play).
- Q: What team name and member names should the Credits screen show? → A: Team CaptAIn — Thuan Viet, Phuong Nghi, Thy Phuong, Dieu Le.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start the game from a main menu (Priority: P1)

The player opens the game and sees a title screen: the game's name, a short tagline about
repairing the city in the rainy season, and a vertical list of large buttons. Behind the
menu, the city map slowly drifts by under light falling rain, so the player immediately sees
what the game looks like and what it is about.
The player clicks **Play** (or presses Enter) and the menu fades out, leaving them in control
of the city map exactly as it works today.

**Why this priority**: Without a way to start, the menu has no purpose. This story alone
replaces "dropped straight into the map" with a proper start.

**Independent Test**: Open the game; confirm the title screen appears first, the city is
visible and moving behind it, and pressing Play (by mouse and by keyboard) shows the
playable map within 1 second.

**Acceptance Scenarios**:

1. **Given** the player opens the game, **When** loading finishes, **Then** the main menu is shown with the title, tagline and buttons: **Play**, **How to Play**, **Credits**.
2. **Given** the main menu is shown, **When** the player looks at the background, **Then** the city map is visible behind a darkened layer, pans slowly on its own, and light rain falls over it.
3. **Given** the main menu is shown, **When** the player clicks Play, **Then** the menu fades out within 0.5 seconds and the player can drag, zoom and select tiles on the map.
4. **Given** the main menu is shown, **When** the player uses the arrow keys or Tab to move between buttons and presses Enter or Space, **Then** the highlighted button is activated.
5. **Given** the main menu is shown, **When** the player drags, scrolls or presses map keys, **Then** the map behind the menu does not respond.
6. **Given** the player presses Play, **When** the map is shown, **Then** no rain is drawn during play.

---

### User Story 2 - Learn the controls before playing (Priority: P2)

From the main menu the player opens **How to Play**: a panel explaining in plain language
what the game is about and listing the controls (drag to move, wheel to zoom, arrow keys/WASD
to scroll, click to select, Home to reset the view). A **Back** button (or Escape) returns to
the main menu.

**Why this priority**: The controls are not obvious to a first-time player or a hackathon
judge. This removes the need for anyone to explain them out loud.

**Independent Test**: From the main menu open How to Play, read the controls, and return
with both the Back button and the Escape key.

**Acceptance Scenarios**:

1. **Given** the main menu, **When** the player chooses How to Play, **Then** a panel shows a 2–3 sentence game summary and a table of every player control from the map feature.
2. **Given** the How to Play panel, **When** the player clicks Back or presses Escape, **Then** the main menu is shown again with the How to Play button focused.
3. **Given** the How to Play panel is open, **When** the player looks at it, **Then** developer-mode keys are not listed (they are for the team, not players).

---

### User Story 3 - Pause during play and return to the menu (Priority: P3)

While on the map, the player presses **Escape** (or clicks a small pause button in a screen
corner). The game pauses and a **pause menu** appears over the dimmed map with **Resume**,
**How to Play** and **Main Menu**. Resume (or Escape again) returns to exactly the same view.
Main Menu returns to the title screen.

**Why this priority**: Gives the player a way out of the map and a place for future in-game
options. It's not needed to start playing, so it comes after Stories 1–2.

**Independent Test**: Start the game, move and zoom the map, press Escape, choose Resume and
check the view is unchanged; press Escape again, choose Main Menu and check the title screen
appears.

**Acceptance Scenarios**:

1. **Given** the player is on the map, **When** they press Escape or click the pause button, **Then** the pause menu appears and the map stops responding to input.
2. **Given** the pause menu, **When** the player chooses Resume or presses Escape, **Then** the menu closes and the camera position, zoom and selected tile are exactly as before.
3. **Given** the pause menu, **When** the player chooses How to Play, **Then** the same How to Play panel opens and Back returns to the pause menu (not the main menu).
4. **Given** the pause menu, **When** the player chooses Main Menu, **Then** the title screen is shown with the city moving behind it again.
5. **Given** the player returns to the main menu and presses Play again, **When** the map appears, **Then** it starts from the default view of the map.

---

### User Story 4 - See who made the game (Priority: P4)

From the main menu the player opens **Credits**: the team name and members, the hackathon
name, and attribution for the art asset pack. Back or Escape returns to the main menu.

**Why this priority**: Nice for judges and required good practice for third-party art, but the
game is fully usable without it.

**Independent Test**: Open Credits from the main menu, check the content, and return.

**Acceptance Scenarios**:

1. **Given** the main menu, **When** the player chooses Credits, **Then** a panel shows the team credits and the asset pack attribution.
2. **Given** the Credits panel, **When** the player clicks Back or presses Escape, **Then** the main menu is shown with the Credits button focused.

---

### Edge Cases

- **Loading**: the main menu appears only after loading finishes; the existing loading bar is shown until then. If the map fails to load, the error message is shown instead of the menu and Play is not offered.
- **Rapid clicks**: clicking Play several times quickly, or pressing Escape repeatedly, never opens two menus or leaves the screen half-faded.
- **Browser tab hidden**: switching tabs while on the map doesn't open the pause menu automatically (there is nothing time-based to pause yet); returning shows the same screen.
- **Small windows**: on a window as small as 800×600 all buttons and panel text are visible without scrolling; on a very short window the How to Play panel scrolls inside itself.
- **Developer mode**: F3 still works on the map; it is ignored while any menu is open.
- **Direct links**: opening the game with `?map=` or `?dev=1` still shows the main menu first; the chosen map is the one Play starts. The panel is skipped only with an explicit `?menu=0` (for screenshots and testing).

## Requirements *(mandatory)*

### Functional Requirements

**Main menu**

- **FR-001**: After loading, the game MUST show the main menu before the player can interact with the map.
- **FR-002**: The main menu MUST show the game title "CaptAIn" (exactly this capitalisation), a one-line tagline, and the buttons **Play**, **How to Play** and **Credits**, in that order.
- **FR-003**: Behind the main menu the city map MUST be visible, darkened enough that the menu text is easy to read, and MUST pan slowly and continuously on its own, staying within the map bounds.
- **FR-003a**: Light rain MUST fall over the main menu background: thin diagonal streaks drawn above the city and below the menu panel, never reducing menu text contrast below FR-013. Rain appears only while the main menu (or a panel opened from it) is shown — not during play or on the pause menu. It MUST stop when the main menu closes and start again when the player returns to it.
- **FR-004**: While any menu or panel is open, the map MUST NOT respond to player input (drag, wheel, map keys, tile selection).
- **FR-005**: Choosing Play MUST close the main menu with a short fade (no more than 0.5 s) and give the player control of the map, starting from the map's default view.

**Panels**

- **FR-006**: The How to Play panel MUST show a short summary of the game's goal and a list of every player control from the map feature (drag, wheel, arrow keys/WASD, + / −, Home, click). It MUST NOT list developer-mode keys.
- **FR-007**: The Credits panel MUST show the team name "Team CaptAIn", the members Thuan Viet, Phuong Nghi, Thy Phuong and Dieu Le (in that order), the event name, and attribution for the "Isometric City" asset pack.
- **FR-008**: Every panel MUST have a Back button, and Escape MUST do the same as Back. Back MUST return to the menu the panel was opened from, with the button that opened it focused.

**Pause menu**

- **FR-009**: On the map, Escape and a visible pause button in a screen corner MUST open the pause menu with **Resume**, **How to Play** and **Main Menu**.
- **FR-010**: Resume (or Escape while the pause menu is open) MUST close it and restore exactly the camera position, zoom, hovered and selected tile from before pausing.
- **FR-011**: Main Menu MUST return to the title screen. Playing again MUST start from the map's default view.

**Accessibility & input**

- **FR-012**: All menus MUST work with mouse only and keyboard only: arrow keys and Tab move the highlight, Enter and Space activate, Escape goes back. The focused button MUST be clearly highlighted.
- **FR-013**: Buttons MUST show a hover state and be at least 44 px tall. Text MUST have a contrast ratio of at least 4.5:1 against its background.
- **FR-014**: Menu text MUST be in English.
- **FR-015**: Opening and closing menus MUST NOT reload the page or reload images.
- **FR-016**: A `?menu=0` URL setting MUST skip the main menu and go straight to the map, so screenshots and tests keep working.

### Key Entities

- **Screen state**: which screen is currently shown. One of: loading, main menu, How to Play (from main or from pause), Credits, playing, paused. Exactly one is active at a time.
- **Saved view**: the camera position, zoom, hovered and selected tile captured when pausing and restored on Resume.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player gets from opening the game to controlling the map in under 10 seconds, using only what's on screen.
- **SC-002**: Every menu action (open, close, back, resume) responds visibly within 0.5 seconds.
- **SC-003**: 100% of menu functions can be completed with keyboard only and with mouse only.
- **SC-004**: After Resume, the camera position and zoom are identical to before pausing in 100% of attempts.
- **SC-005**: In playtests, at least 4 of 5 first-time players can name the scroll and zoom controls after reading How to Play.
- **SC-006**: The game keeps a steady frame rate on the main menu with the background panning and rain falling (no visible stutter on a mid-range laptop).

## Assumptions

- **Title & tagline**: the title is "CaptAIn" (see Clarifications); the browser tab title uses it too. The tagline is "Keep the city running through the rainy season" until the team picks another.
- **Credits content**: team and member names are fixed (see Clarifications). The event name defaults to "Hackathon HK1 2026–27" until the team confirms the official name. The asset pack is credited by its pack name; the exact author/licence line is copied from the pack's licence when available.
- **Not included** (later features): level select, Continue/save slots, Settings (no sound or options exist yet), Quit (browser games close with the tab), localisation.
- **Visual style**: matches the game's dark UI (dark translucent panels, light text) over the live city, rather than a separate illustrated background.
- **Rain** on the menu is decorative only: it doesn't flood roads or affect the map's data. The real weather system comes in a later feature and may reuse this effect.
- **Pausing** stops only player input and the menu's background motion; there is no game clock to pause yet. When timed gameplay arrives, pausing must also stop it.
- **Platform**: desktop browser with mouse and keyboard; touch is optional.

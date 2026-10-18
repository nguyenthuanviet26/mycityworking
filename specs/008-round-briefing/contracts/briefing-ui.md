# Contract: Briefing and Reference UI

## Preparation

Two dedicated screens in the existing menu layer: briefing-crews and briefing-problems. The first focuses Continue to Problems; the second focuses Start Round. Back returns to the roster; Main menu is reachable from both. Moving between them never starts time. A persistent label says preparation is untimed.

Crew cards show the exact round roster: job, named leader and portrait, vehicle, depot location, speed in tiles/second, advantage, and a table of each round damage kind with Best / Can help / Can't fix text and effective repair seconds. Missing compatibility is never shown as zero seconds. Reuse existing art; resolve asset paths only in adapters.

Problem overview shows duration, phase durations, target, total workload, and win/lose rules. Its accessible table lists every occurrence's number, kind, unique target location, planned time from start, nominal phase, warning duration, and compatible crews with match labels. Show all 18 trial occurrences rather than one row per damage type. Rows are informational and cannot send crews or activate future problems.

Explain planned release versus actual release, warning countdown origin, tutorial protection until first dispatch, and delays from active limits/occupied targets. Warn that the repair target secures a win and play continues for higher score until the round ends. Use existing rules rather than introducing a strict deadline per incident.

Use human-readable type labels plus target IDs and coordinates for object targets; coordinates use explicit col,row with zero-based labels. Render data with textContent. Show decimal seconds without rounding away configured tenths/hundredths; do not imply scheduled release is guaranteed.

## Running reference

Provide separate HUD controls labeled Crew stats and Problem schedule, usable with mouse and Tab/Enter. These open the same projected content in a bounded panel and let users switch sections. The existing How to Play/Crew guide remains a paused help route; it is not the live-reference entry point.

Keep the clock and city-condition display visible. A prominent Time running label explains that reading does not pause. Show Close and explicit Pause controls. No Start Round, Retry, editable crew selection, or dispatch actions appear inside the reference.

Treat it as a read-only dialog over play: focus stays within its controls while open, underlying map/HUD commands are blocked, but simulation and drawing continue. Scrolling a long table must not scroll/zoom the map. Closing ordinarily restores focus to the entry control and preserves prior incident selection and crew assignments. Opening the reference is not a live crew-status view; stats are capabilities and the list remains the complete planned schedule.

## Keyboard and focus ownership

- Native Tab/Shift+Tab moves through visible reference controls and wraps within the dialog. Enter/Space activates the focused control exactly once.
- While the reference is open, HUD capture shortcuts for Tab, number keys, Send, Escape, and find-crew must not execute. Input must not pan/zoom from held or newly pressed keys. Apply guards to existing listeners, rather than relying on late bubble propagation alone.
- Escape closes reference first and consumes that event; it must not also close the selected incident or pause.
- Preparation navigation uses normal focusable buttons; hidden screen controls are not reachable.
- A visible Pause control calls the existing pause action. On pause, hidden tab, result, or menu transition, dismiss reference without restoring stale opener focus. MenuUI owns Resume/Retry/destination focus.
- Enter on Start Round must not fall through to Send in the newly playing round. Hide immediately and consume the initiating event; repeated activation cannot construct another Round.

## Layout and accessibility

Use headings, labeled controls, table captions/header cells, descriptive images or adjacent text, and visible focus outlines. Match labels carry meaning without color. Long content scrolls within a bounded region; navigation remains reachable at smaller desktop widths and 200% zoom. No new image generation is required.

Extend MenuUI's preparation screen mapping without making reference a MenuUI screen. Avoid whole-menu fades on Start Round. Add an in-round Retry button to the pause menu and update How to Play/README with preparation and live-reference timing.

# Contract: Briefing Application Flow

This is an in-browser application/UI interface, not a network API. Data records are defined in [data-model.md](../data-model.md).

## ScreenMachine

`new MCW.ScreenMachine({hasLevel: true})` enables preparation for a validated playable level. Omitted options or false retains the current free-look transitions. The composition root supplies this boolean after existing level validation.

| State | Action | Next state / effect |
| --- | --- | --- |
| menu | play | briefing-crews if hasLevel, otherwise playing. |
| briefing-crews | nextBriefing | briefing-problems. |
| briefing-crews | toMenu / Escape | menu. |
| briefing-problems | back / Escape | briefing-crews. |
| briefing-problems | startRound | playing; fresh round. |
| briefing-problems | toMenu | menu. |
| result | retry | briefing-crews if hasLevel, otherwise existing playing transition. |
| paused | retry | briefing-crews if hasLevel; unavailable for maps with no level. |
| playing | pause / finish | Existing paused / result states. |
| paused | resume / back | Existing playing state; same round. |

startRound is accepted only in briefing-problems. Duplicate or out-of-state dispatch returns false under the existing state-table convention. New nextBriefing and startRound wrappers follow current ScreenMachine action methods. Preparation inputEnabled is false. Existing busy-transition guard remains, but Start Round has no fade delay that consumes gameplay time.

## Projection function

`MCW.buildRoundBriefing(level, map) -> RoundBriefing` is pure and synchronous for a valid level. Use existing domain helpers. No browser access, asset paths, map variants, emitter side effects, timer calls, or Round instantiation. Keep source schedule and roster order. Caller never invokes it for a failed checkLevel result.

## LevelRun

- Entering preparation from menu/result/paused calls preparation cleanup and rebuilds the projection once. Navigation between preparation steps does not rebuild or advance anything.
- Actual Round creation is keyed to startRound -> playing, retaining legacy starts where needed for compatibility. Resume does not call _start. There is no Round to update during preparation.
- `openReference(section)` accepts crews or problems only with a non-over live Round and playing screen. Returns false otherwise; no clock or screen transition.
- `closeReference()` idempotently clears the section. Neither action changes crew assignments, options, score, elapsed time, or hints.
- `reference` event carries the current section or null so adapters can render and synchronize input. Emit only on changes.
- On pause/end/menu/retry, clear reference state; the adapter must not restore opener focus over the destination menu. On ordinary close, restore its still-visible opener.
- Existing `start` event continues to mean a real Round was created; HUD, layer, hints, and result consumers must not receive it for preparation.
- Existing end result, release ordering, urgency, target occupancy, scoring, and repair updates remain authoritative in Round.

## GameSession and composition

GameSession recognizes startRound as a fresh-play entry, applies startView, and emits playstart. Preserve legacy free-look entry and pause view restoration. Do not enter timed play early to initialize the camera.

main.js only constructs and wires objects: hasLevel, RoundBriefingUI, imageSrc, and reference/input event connections. Keep input-reset screen listener ordering before GameSession's pause snapshot. Map input enablement is the conjunction of screen inputEnabled and no open reference. On reference entry, reset held keys and pointer drag; on close, recompute from the current screen rather than blindly enabling input.

?menu=0 skips the main menu and reaches briefing-crews for a valid level. Other maps still open free look. Decorate mode is untouched.

## Timing invariants and failures

- Preparation can remain open indefinitely with zero elapsed gameplay time and no released incidents.
- Open reference keeps screen state playing and LevelRun.update active; no pause(), openHowto(), or altered menuOpen() is used to show it.
- Manual Pause or hidden-tab pause while reference is open clears reference and pauses normally; tab restoration leaves the pause menu until Resume.
- Existing Round end closes reference and shows result without focus races.
- Invalid levels keep existing warnings and free-look fallback; no Start Round is offered.

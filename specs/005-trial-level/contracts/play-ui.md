# Contract: Play Screen, Controls and Hints

This contract describes what the player sees and can do during the trial level. Everything in
[001 controls](../../001-isometric-map-system/contracts/controls.md) and the 002 menus keeps
working (FR-025).

## HUD (top bar, DOM)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ☔ DOWNPOUR  2:41   │ Repair 6 incidents before the storm ends  3 / 6 │ 1 250 pts │
│ City condition [██████████████░░░░░] 72%                              (+5%)   │  [❚❚]
└──────────────────────────────────────────────────────────────────────────────┘
```

| Element | Shows | Updates |
|---|---|---|
| Phase + timer | current phase name and the remaining storm time `m:ss` | every second |
| Goal | `Repair <target> incidents before the storm ends`; changes to `Goal reached! Keep repairing for a higher score` once reached | on `goal` |
| Count | `<repaired> / <target>`, with a ✓ once reached | on `repaired` |
| Score | total points | on `repaired` |
| Meter | condition 0–100 % with a bar and a number; turns amber below 50 % and red below 25 %; shows a `+5%`/`+8%` pop for 1 s after a refill | every frame it changes |

The pause button stays where it is.

## Banners (DOM, centred, about 2 s, not blocking)

| When | Text |
|---|---|
| Round start | `Drizzle` — `Repair 6 incidents before the storm ends` |
| Phase 2 | `Downpour!` |
| Phase 3 | `Peak storm!` |
| Goal reached | `Goal reached!` |
| Storm ends | `Storm cleared` (just before the result card) |

## Map markers (canvas)

| Incident state | Marker above the target |
|---|---|
| new | yellow pin with `!` |
| urgent | red pin with `!!` and a pulsing ring |
| assigned (crew on the way) | the pin plus a small truck icon |
| repairing | the pin is replaced by a progress ring that fills from 0 to 100 % around a wrench icon |

A selected incident is shown with a white outline around its pin. Incidents that are off the
screen get a pin-coloured arrow at the screen edge, pointing towards them.

## Incident panel (DOM, bottom-centre)

It opens when an incident is selected and closes when the player clicks elsewhere, the
incident is repaired, or the player presses Esc (which closes the panel first; a second Esc
pauses).

```text
┌───────────────────────────────┐
│ ⚠ Roof damaged      URGENT    │
│ Crew: on the way to another   │
│ [ Send crew ]  [ Go to ]      │
└───────────────────────────────┘
```

| Crew state | Button |
|---|---|
| idle / returning | **Send crew** (enabled) |
| driving to another incident | **Redirect crew** (enabled) |
| driving to this incident | **Crew on the way** (disabled) |
| repairing another incident | **Crew busy — free in Ns** (disabled) |
| repairing this incident | **Repairing… NN%** (disabled) |

**Go to** glides the camera to the incident.

## Controls added

| Input | Action |
|---|---|
| Click an incident (its pin, tile or building) | Select it and open the panel |
| Click an off-screen arrow | Glide the camera to that incident |
| `Enter` / `Space` while the panel is open | Send / redirect the crew (if enabled) |
| `Tab` | Select the next active incident (most urgent first) |
| `C` | Glide the camera to the crew |

## Hints (tutorial, DOM bubble with a pointer)

Only one hint is shown at a time, and the bubble has a **Skip hints** link. Hints run only
while the round is `playing`.

| # | Shows on | Text | Points at | Clears on |
|---|---|---|---|---|
| 1 | tutorial incident released | An incident! Click the marker to see what happened. | the incident pin | the incident is selected |
| 2 | step 1 cleared | Send your repair crew. | the **Send crew** button | the crew is sent |
| 3 | step 2 cleared | The crew drives on roads — wait for it to arrive. | the crew | the crew arrives |
| 4 | step 3 cleared | Repairing… keep the city condition up! | the meter | the repair completes |
| 5 | step 4 cleared | Repair 6 incidents before the storm ends. | the goal text | after 5 s |

If the player sends the crew without selecting the tutorial incident first (for example with
Tab and Enter), step 1 is skipped. **Skip hints** hides the bubble and stops any further hints
for this round and for Retry. **Main menu** followed by **Play** shows the hints again.

## Result card (DOM, in `#menu-layer`)

```text
        Level complete              Level failed
          ★ ★ ☆                     The city could not hold on
  Incidents repaired   8 / 6        (or: The storm ended before the goal)
  Time                 4:00         Incidents repaired   4 / 6
  Score                1 140        Time   2:13   Score  560
   [ Retry ]  [ Main menu ]          [ Retry ]  [ Main menu ]
```

Focus goes to **Retry**, and ↑/↓ move between the buttons as in the other menus. Esc does
nothing on this card.

## How to Play text

The How to Play paragraph and controls table are updated to describe the loop: click an
incident, send the crew, repair before the city condition runs out, and the new keys
(Enter, Tab, C).

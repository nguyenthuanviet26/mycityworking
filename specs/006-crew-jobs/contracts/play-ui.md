# Contract: Crew Bar, Crew Choice and Crew Guide

This contract changes [005 play-ui](../../005-trial-level/contracts/play-ui.md). Anything not
mentioned here stays as it is.

## Crew bar (DOM, bottom-left)

```text
┌────────────────────────┐┌────────────────────────┐┌──────────────────────────┐┌────────────────────────────┐ [?]
│ 🧑 🚧 Road Crew — Minh ⌖││ 🧑 🏗 Builders — Hoa  ⌖││ 🧑 ⚡ Electricians — Linh ⌖││ 🧑 💧 Drainage Team — Tuan ⌖│
│ 1  ready               ││ 2  driving             ││ 3  repairing · free in 4s ││ 4  returning               │
└────────────────────────┘└────────────────────────┘└──────────────────────────┘└────────────────────────────┘
```

| Action | Result |
|---|---|
| Click a card | Arm that crew (outlined; the cursor hint says "Click an incident for <Job>"); click again to disarm |
| Double-click a card, or ⌖ | Camera glides to that crew |
| `1`–`4` with no incident panel open | Arm the crew in that position |
| `Esc` / click on empty map | Disarm |
| `?` | Open the Crew guide |

A repairing crew's card can't be armed: clicking it shows "Busy repairing".

## Incident panel (changed)

```text
┌──────────────────────────────────────────────┐
│ 💡 Streetlight down                 URGENT    │
│ ○ 1 Road Crew — Minh      Can't fix           │
│ ○ 2 Builders — Hoa        Can't fix           │
│ ● 3 Electricians — Linh   BEST   arrives 6s · repair 2s │
│ ○ 4 Drainage Team — Tuan  Can't fix           │
│ [ Send Electricians ]            [ Go to ]    │
└──────────────────────────────────────────────┘
```

- **Badges**: **BEST** (green), **CAN HELP** (amber, with "2× slower"), **CAN'T FIX** (grey).
  Each badge is a word, not only a colour.
- **Row status**:
  - `arrives Ns · repair Ns` for crews that can be sent;
  - `busy · free in Ns` for a repairing crew;
  - `on the way` for the crew already assigned here.
- **Pre-selection**: the picked crew is preset to `bestCrewFor`. Click a row, or press `1`–`4`,
  to pick another.
- **Send button**: "Send <Job>" (or "Redirect <Job>" for a driving crew). It is disabled with
  the row's reason when the picked crew can't be sent.
- **Best crew busy**: when the best crew is busy, a line says "Best crew (<Job>) free in Ns".
- **Keys**: Enter/Space send the picked crew. Esc closes the panel (and disarms).

## Map pins (changed)

| Kind | Glyph |
|---|---|
| Road cracked | ⚠ |
| Roof damaged | ⌂ |
| Streetlight down | 💡 |
| Pump station failing | 💧 |

The yellow, red and progress-ring states are as in feature 005. While a crew is armed, pins it
can't fix are drawn at 35 % opacity, and clicking them shows a toast: "<Job> can't fix
<label>".

## Feedback

- **Repair pop**: `+N` for every repair, plus `· Right crew!` (green) when the repair was by a
  Best crew.
- **Refused toast**: about 1.5 s, bottom-centre.

## Crew guide (DOM)

The guide is a section of **How to Play**. The `?` on the crew bar pauses the game and opens
How to Play from the pause menu (`pause` then `openHowto`, both existing screen actions);
Back returns to the pause menu. The guide is a table built from `MCW.jobs` (hidden jobs are
left out):

| Crew | Vehicle | Best at | Can help with | Advantage |
|---|---|---|---|---|
| 🚧 Road Crew | pickup | Road cracked | — | Fastest vehicle |
| … | | | | |


## Hints (changed text)

| # | Text |
|---|---|
| 2 | Pick the crew marked **Best**, then press Send. |
| 5 | Repair {target} incidents before the storm ends. Click a crew below, then an incident, to send it faster. |

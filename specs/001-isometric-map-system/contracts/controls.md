# Contract: Player Controls

| Input | Action |
|---|---|
| Left-drag | Pan the map (one-to-one with the pointer) |
| Left-click (moved < 5 px) | Select the tile under the cursor |
| Mouse move | Highlight the tile under the cursor |
| Mouse wheel | Zoom ×1.1 per notch towards/away from the cursor |
| Arrow keys / W A S D | Scroll at 600 screen px/s |
| `+` / `=` and `-` | Zoom in / out about the screen centre |
| `Home` | Centre the map, zoom 1× |
| `F3` or `` ` `` | Toggle developer mode |

Developer mode (only while on):

| Input | Action |
|---|---|
| `C` | Toggle collision overlay (green = foot + vehicle, yellow = foot only, red = impassable) |
| `G` | Toggle grid outline |
| `M` | Place a test marker at the cursor's exact map position |
| `Shift+M` | Clear all test markers |
| `B` | Toggle a "blocked" collision override on the selected tile |
| `V` | Toggle the selected tile's (or its object's) variant normal ⇄ damaged |

The info panel shows: FPS, zoom, hovered tile `(col,row)`, terrain, object id/type, and
effective collision.

Focus loss (`blur`) ends any drag and releases held keys.

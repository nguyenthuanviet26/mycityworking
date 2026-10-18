// Isometric coordinate system (research R4).
// Tile address (col,row) integers; map position (x,y) fractional;
// world pixels (wx,wy) at zoom 1 for 128x64 diamond tiles.
(function (MCW) {
  "use strict";

  var HALF_W = 64;
  var HALF_H = 32;

  // [dCol, dRow] for the four diamond edges, matching the asset names.
  var DIRS = { NE: [0, -1], SE: [1, 0], SW: [0, 1], NW: [-1, 0] };
  // Diagonal neighbours, named after the diamond corner they touch.
  var CORNERS = { N: [-1, -1], E: [1, -1], S: [1, 1], W: [-1, 1] };

  function mapToWorld(x, y) {
    return { wx: (x - y) * HALF_W, wy: (x + y) * HALF_H };
  }

  function worldToMap(wx, wy) {
    return {
      x: (wx / HALF_W + wy / HALF_H) / 2,
      y: (wy / HALF_H - wx / HALF_W) / 2
    };
  }

  function tileOf(x, y) {
    return { col: Math.floor(x), row: Math.floor(y) };
  }

  function tileCenter(col, row) {
    return { x: col + 0.5, y: row + 0.5 };
  }

  function depthKey(x, y) {
    return x + y;
  }

  MCW.iso = {
    TILE_W: 128,
    TILE_H: 64,
    DIRS: DIRS,
    DIR_NAMES: ["NE", "SE", "SW", "NW"],
    CORNERS: CORNERS,
    mapToWorld: mapToWorld,
    worldToMap: worldToMap,
    tileOf: tileOf,
    tileCenter: tileCenter,
    depthKey: depthKey
  };
})(window.MCW);

// Domain: shortest road routes for vehicles (feature 005 research R3).
// Breadth-first search over vehicle-passable tiles (road, bridge); neighbours are explored in
// the fixed order NE, SE, SW, NW, so the same route comes back on every call.
(function (MCW) {
  "use strict";

  // Tiles from `from` (excluded) to the nearest goal (included); [] if `from` is a goal,
  // null if no goal can be reached.
  function findRoute(map, from, goals) {
    if (!goals || !goals.length) return null;
    var isGoal = {};
    goals.forEach(function (g) {
      if (map.inBounds(g.col, g.row)) isGoal[map.index(g.col, g.row)] = true;
    });
    var start = map.index(from.col, from.row);
    if (isGoal[start]) return [];

    var parent = new Map();
    parent.set(start, -1);
    var queue = [start], head = 0;
    while (head < queue.length) {
      var i = queue[head++];
      var col = i % map.cols, row = (i - col) / map.cols;
      var next = map.neighbors(col, row, "vehicle");
      for (var k = 0; k < next.length; k++) {
        var j = map.index(next[k].col, next[k].row);
        if (parent.has(j)) continue;
        parent.set(j, i);
        if (isGoal[j]) return path(map, parent, j);
        queue.push(j);
      }
    }
    return null;
  }

  function path(map, parent, end) {
    var out = [];
    for (var i = end; parent.get(i) !== -1; i = parent.get(i)) {
      out.push({ col: i % map.cols, row: Math.floor(i / map.cols) });
    }
    return out.reverse();
  }

  // Vehicle-passable tiles touching a footprint on its SE, SW, NE and NW sides.
  function workTiles(map, fp) {
    var c = fp.col, r = fp.row, w = fp.w, h = fp.h, i, out = [];
    function add(col, row) {
      if (map.isPassable(col, row, "vehicle")) out.push({ col: col, row: row });
    }
    for (i = 0; i < h; i++) add(c + w, r + i); // SE side
    for (i = 0; i < w; i++) add(c + i, r + h); // SW side
    for (i = 0; i < w; i++) add(c + i, r - 1); // NE side
    for (i = 0; i < h; i++) add(c - 1, r + i); // NW side
    return out;
  }

  MCW.findRoute = findRoute;
  MCW.workTiles = workTiles;
})(window.MCW);

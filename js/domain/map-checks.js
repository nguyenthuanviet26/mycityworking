// Domain: problems that make a map look wrong but don't stop it loading (feature 004 R5).
// Shared by the map parser and decorate mode, so both report problems the same way.
(function (MCW) {
  "use strict";

  function roadLike(map, col, row) {
    var t = map.inBounds(col, row) ? map.terrain[map.index(col, row)] : null;
    return t === "road" || t === "bridge";
  }

  function bridgeProblems(map, out) {
    for (var row = 0; row < map.rows; row++) {
      for (var col = 0; col < map.cols; col++) {
        if (map.terrain[map.index(col, row)] !== "bridge") continue;
        var alongSE = roadLike(map, col + 1, row) && roadLike(map, col - 1, row);
        var alongSW = roadLike(map, col, row + 1) && roadLike(map, col, row - 1);
        if (!alongSE && !alongSW) {
          out.push({
            code: "bridge-not-crossing", col: col, row: row,
            message: "Bridge at (" + col + "," + row + ") is not between road or bridge tiles"
          });
        }
      }
    }
  }

  function onWater(map, o) {
    for (var dr = 0; dr < o.size.h; dr++) {
      for (var dc = 0; dc < o.size.w; dc++) {
        if (map.terrain[map.index(o.anchor.col + dc, o.anchor.row + dr)] === "water") return true;
      }
    }
    return false;
  }

  function objectProblems(map, out) {
    map.objects().forEach(function (o) {
      if (!onWater(map, o)) return;
      out.push({
        code: "object-on-water", col: o.anchor.col, row: o.anchor.row,
        message: 'Object "' + (o.named ? o.id : o.type) + '" is on water'
      });
    });
  }

  // Returns [{ code, col, row, message }].
  MCW.mapChecks = function (map) {
    var out = [];
    bridgeProblems(map, out);
    objectProblems(map, out);
    return out;
  };
})(window.MCW);

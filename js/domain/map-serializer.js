// Domain: GameMap → map definition, the inverse of parseMap (feature 004 research R7).
// Terrain uses the default legend; objects are sorted by row, then column.
(function (MCW) {
  "use strict";

  function charFor() {
    var out = {};
    var legend = MCW.terrain.DEFAULT_LEGEND;
    Object.keys(legend).forEach(function (ch) { out[legend[ch]] = ch; });
    return out;
  }

  function terrainText(map) {
    var chars = charFor();
    var lines = [];
    for (var row = 0; row < map.rows; row++) {
      var line = "";
      for (var col = 0; col < map.cols; col++) {
        line += chars[map.terrain[map.index(col, row)]] || chars[MCW.terrain.DEFAULT_TERRAIN];
      }
      lines.push(line);
    }
    return "\n" + lines.join("\n") + "\n";
  }

  // The object entry a map file would hold for a placed object.
  function objectEntry(o) {
    var e = { type: o.type, at: [o.anchor.col, o.anchor.row] };
    if (o.variant === "damaged") e.variant = "damaged";
    if (o.named) e.id = o.id;
    if (o.access) e.access = [o.access.col, o.access.row];
    return e;
  }

  function serializeMap(map, meta) {
    var objects = map.objects().slice().sort(function (a, b) {
      return a.anchor.row - b.anchor.row || a.anchor.col - b.anchor.col;
    });
    return {
      id: meta.id,
      name: meta.name,
      terrain: terrainText(map),
      objects: objects.map(objectEntry)
    };
  }

  MCW.serializeMap = serializeMap;
  MCW.serializeMap.objectEntry = objectEntry;
})(window.MCW);

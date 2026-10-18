// Turns a map definition (contracts/map-definition.md) into a GameMap plus warnings.
(function (MCW) {
  "use strict";

  function parseMap(def) {
    if (!def || typeof def.terrain !== "string") throw new Error("Map definition has no terrain");

    var warnings = [];
    function warn(msg) {
      warnings.push(msg);
      console.warn("[map] " + msg);
    }

    var legend = Object.assign({}, MCW.terrain.DEFAULT_LEGEND, def.legend || {});
    var lines = def.terrain.split(/\r?\n/);
    while (lines.length && lines[0].trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (!lines.length) throw new Error("Map definition has no terrain");

    var rows = lines.length;
    var cols = Math.max.apply(null, lines.map(function (l) { return l.length; }));
    var map = new MCW.GameMap(cols, rows);

    lines.forEach(function (line, row) {
      if (line.length < cols) {
        warn("Row " + row + " has " + line.length + " tiles, expected " + cols + "; padded with grass");
      }
      for (var col = 0; col < line.length; col++) {
        var ch = line[col];
        var id = legend[ch];
        if (!id || !MCW.terrain.TYPES[id]) {
          warn('Unknown terrain character "' + ch + '" at (' + col + "," + row + ")");
          map.setTerrain(col, row, MCW.terrain.DEFAULT_TERRAIN);
          map.unknown[map.index(col, row)] = true;
        } else {
          map.setTerrain(col, row, id);
        }
      }
    });

    placeObjects(map, def.objects || [], warn);
    MCW.mapChecks(map).forEach(function (p) { warn(p.message); });
    return { map: map, warnings: warnings };
  }

  function placeObjects(map, objects, warn) {
    objects.forEach(function (o, i) {
      var label = o.id || o.type || "#" + i;
      var entry = MCW.objectTypes.TYPES[o.type];
      if (!entry) {
        warn('Unknown object type "' + o.type + '"; skipped');
        return;
      }
      if (!Array.isArray(o.at) || o.at.length !== 2) {
        warn('Object "' + label + '" has no valid "at" position; skipped');
        return;
      }
      var c = o.at[0], r = o.at[1], w = entry.size.w, h = entry.size.h;
      if (!map.footprintInBounds(c, r, w, h)) {
        warn('Object "' + label + '" footprint is outside the map; skipped');
        return;
      }
      var blocker = map.footprintBlocker(c, r, w, h);
      if (blocker) {
        warn('Object "' + label + '" overlaps "' + blocker + '"; skipped');
        return;
      }
      if (o.id && map.getObject(o.id)) {
        warn('Duplicate object id "' + o.id + '"; skipped');
        return;
      }
      if (o.variant === "damaged" && !entry.hasDamaged) {
        warn('Object "' + label + '" has no damaged art; using normal');
      }
      map.placeObject(o);
    });
  }

  MCW.parseMap = parseMap;
})(window.MCW);

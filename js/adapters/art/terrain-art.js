// Adapter: picks the picture for each tile from the map's terrain, neighbours and variant
// (road pieces: feature 001 research R5, shorelines: R6), and caches the result.
(function (MCW) {
  "use strict";

  var DIR = "Roads and Grounds/";
  var WATER = DIR + "tile_ground_water.png";

  // Neighbour mask bits.
  var BIT = { NE: 1, SE: 2, SW: 4, NW: 8 };

  // Mask of open (connected) sides -> road piece, derived from the curb pixels of each asset.
  var ROAD_PIECES = {
    0: "xsing",
    1: "end_SW",
    2: "end_NW",
    4: "end_NE",
    8: "end_SE",
    5: "straight_SW",
    10: "straight_SE",
    6: "corner_N",
    12: "corner_E",
    9: "corner_S",
    3: "corner_W",
    11: "intersection_NE",
    13: "intersection_NW",
    7: "intersection_SE",
    14: "intersection_SW",
    15: "xsing"
  };

  // Two adjacent water sides -> the corner between them.
  var EDGE_CORNER = { "NE+NW": "N", "NE+SE": "E", "SE+SW": "S", "NW+SW": "W" };

  function terrainAt(map, col, row) {
    return map.inBounds(col, row) ? map.terrain[map.index(col, row)] : null;
  }

  function isRoadLike(t) {
    return t === "road" || t === "bridge";
  }

  // Bridges stand over the canal, so they count as water for shorelines.
  function isWaterLike(t) {
    return t === "water" || t === "bridge";
  }

  function roadMask(map, col, row) {
    var mask = 0;
    MCW.iso.DIR_NAMES.forEach(function (d) {
      var v = MCW.iso.DIRS[d];
      if (isRoadLike(terrainAt(map, col + v[0], row + v[1]))) mask |= BIT[d];
    });
    return mask;
  }

  function roadPiece(mask, variant) {
    return DIR + "tile_road_" + ROAD_PIECES[mask] + "_" + (variant || "normal") + ".png";
  }

  function bridgePiece(map, col, row, variant) {
    var mask = roadMask(map, col, row);
    var axis = (mask & (BIT.SE | BIT.NW)) && !(mask & (BIT.NE | BIT.SW)) ? "SE"
      : (mask & (BIT.NE | BIT.SW)) ? "SW" : "SE";
    return DIR + "tile_road_bridge_body_" + axis + "_" + (variant || "normal") + ".png";
  }

  function shorePiece(map, col, row) {
    var ground = terrainAt(map, col, row);
    var base = DIR + "tile_ground_" + ground;
    var sides = MCW.iso.DIR_NAMES.filter(function (d) {
      var v = MCW.iso.DIRS[d];
      return isWaterLike(terrainAt(map, col + v[0], row + v[1]));
    });
    if (sides.length === 1) return base + "_water_" + sides[0] + "_clean.png";
    if (sides.length === 2) {
      var corner = EDGE_CORNER[sides.slice().sort().join("+")];
      if (corner) return base + "_wateredge_" + corner + "_clean.png";
      return base + ".png";
    }
    if (sides.length > 2) return base + ".png";
    var names = ["N", "E", "S", "W"];
    for (var i = 0; i < names.length; i++) {
      var c = MCW.iso.CORNERS[names[i]];
      if (isWaterLike(terrainAt(map, col + c[0], row + c[1]))) {
        return base + "_watercorner_" + names[i] + "_clean.png";
      }
    }
    return base + ".png";
  }

  // Layers to draw for a tile, bottom first.
  function tileArt(map, col, row) {
    var t = terrainAt(map, col, row);
    var variant = map.variant[map.index(col, row)];
    switch (t) {
      case "road": return [roadPiece(roadMask(map, col, row), variant)];
      case "bridge": return [WATER, bridgePiece(map, col, row, variant)];
      case "water": return [WATER];
      case "grass":
      case "dirt": return [shorePiece(map, col, row)];
      default: return [DIR + "tile_ground_" + t + ".png"];
    }
  }

  // Per-tile picture cache over a map. Cleared for a tile and its 8 neighbours whenever the
  // map reports a terrain or variant change, because neighbours pick pieces from each other.
  function TerrainArt(map) {
    this.map = map;
    this.cache = new Array(map.cols * map.rows).fill(null);
    var self = this;
    function clear(e) { self.invalidate(e.col, e.row); }
    map.on("terrainchange", clear);
    map.on("tilechange", clear);
  }

  TerrainArt.prototype.artAt = function (col, row) {
    var i = this.map.index(col, row);
    if (!this.cache[i]) this.cache[i] = tileArt(this.map, col, row);
    return this.cache[i];
  };

  TerrainArt.prototype.invalidate = function (col, row) {
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (this.map.inBounds(col + dc, row + dr)) this.cache[this.map.index(col + dc, row + dr)] = null;
      }
    }
  };

  // Every image a map can show, including damaged variants (research R13).
  function collectImagePaths(map, art) {
    var set = {};
    function add(p) { if (p) set[p] = true; }
    for (var row = 0; row < map.rows; row++) {
      for (var col = 0; col < map.cols; col++) {
        art.artAt(col, row).forEach(add);
        var t = terrainAt(map, col, row);
        if (t === "road") {
          var mask = roadMask(map, col, row);
          add(roadPiece(mask, "normal"));
          add(roadPiece(mask, "damaged"));
        } else if (t === "bridge") {
          add(bridgePiece(map, col, row, "normal"));
          add(bridgePiece(map, col, row, "damaged"));
        }
      }
    }
    map.objects().forEach(function (o) {
      var a = MCW.objectArt.ART[o.type];
      add(a.file);
      add(a.damagedFile);
    });
    return Object.keys(set);
  }

  // Every terrain image painting could need, whatever the map holds now (feature 004 R12).
  function allImagePaths() {
    var set = {};
    ["normal", "damaged"].forEach(function (v) {
      Object.keys(ROAD_PIECES).forEach(function (m) { set[roadPiece(+m, v)] = true; });
      ["SE", "SW"].forEach(function (axis) {
        set[DIR + "tile_road_bridge_body_" + axis + "_" + v + ".png"] = true;
      });
    });
    set[WATER] = true;
    ["grass", "dirt", "concrete", "asphalt"].forEach(function (t) { set[DIR + "tile_ground_" + t + ".png"] = true; });
    ["grass", "dirt"].forEach(function (t) {
      var base = DIR + "tile_ground_" + t;
      MCW.iso.DIR_NAMES.forEach(function (d) { set[base + "_water_" + d + "_clean.png"] = true; });
      ["N", "E", "S", "W"].forEach(function (c) {
        set[base + "_wateredge_" + c + "_clean.png"] = true;
        set[base + "_watercorner_" + c + "_clean.png"] = true;
      });
    });
    return Object.keys(set);
  }

  MCW.terrainArt = {
    allImagePaths: allImagePaths,
    roadMask: roadMask,
    roadPiece: roadPiece,
    bridgePiece: bridgePiece,
    shorePiece: shorePiece,
    tileArt: tileArt,
    collectImagePaths: collectImagePaths
  };
  MCW.TerrainArt = TerrainArt;
})(window.MCW);

// Terrain types with default collision (FR-022) and autotile rule.
(function (MCW) {
  "use strict";

  var WALK = { foot: true, vehicle: false, cost: 1 };
  var DRIVE = { foot: true, vehicle: true, cost: 1 };
  var NONE = { foot: false, vehicle: false, cost: Infinity };

  var TYPES = {
    grass: { id: "grass", collision: WALK, autotile: "shore" },
    dirt: { id: "dirt", collision: WALK, autotile: "shore" },
    concrete: { id: "concrete", collision: WALK, autotile: null },
    asphalt: { id: "asphalt", collision: WALK, autotile: null },
    water: { id: "water", collision: NONE, autotile: "water" },
    road: { id: "road", collision: DRIVE, autotile: "road" },
    bridge: { id: "bridge", collision: DRIVE, autotile: "road" }
  };

  MCW.terrain = {
    TYPES: TYPES,
    DEFAULT_LEGEND: {
      ".": "grass",
      ",": "dirt",
      "#": "concrete",
      "=": "asphalt",
      "~": "water",
      "r": "road",
      "b": "bridge"
    },
    DEFAULT_TERRAIN: "grass"
  };
})(window.MCW);

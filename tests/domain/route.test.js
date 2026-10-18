describe("route", function () {
  // NE = row-1, SE = col+1, SW = row+1, NW = col-1.
  function sampleMap() {
    return MCW.parseMap({
      terrain: [
        "rrrrrrr",
        "r..~..r",
        "rrrbrrr",
        "...~...",
        "r......"
      ].join("\n"),
      objects: [{ type: "hospital_a", at: [1, 3] }]
    }).map;
  }

  function t(col, row) { return { col: col, row: row }; }

  it("finds a shortest route that only uses road and bridge tiles", function () {
    var map = sampleMap();
    var route = MCW.findRoute(map, t(0, 0), [t(6, 2)]);
    assertEqual(route.length, 8);
    assertEqual(route[route.length - 1], t(6, 2));
    route.forEach(function (s) {
      assertTrue(map.isPassable(s.col, s.row, "vehicle"), "step " + s.col + "," + s.row);
    });
  });

  it("each step moves to a 4-neighbour", function () {
    var route = MCW.findRoute(sampleMap(), t(0, 0), [t(6, 2)]);
    var prev = t(0, 0);
    route.forEach(function (s) {
      assertEqual(Math.abs(s.col - prev.col) + Math.abs(s.row - prev.row), 1);
      prev = s;
    });
  });

  it("is the same on every call and prefers NE, SE, SW, NW on ties", function () {
    var map = sampleMap();
    var a = MCW.findRoute(map, t(0, 0), [t(6, 2)]);
    var b = MCW.findRoute(map, t(0, 0), [t(6, 2)]);
    assertEqual(a, b);
    assertEqual(a[0], t(1, 0)); // SE before SW
  });

  it("crosses the bridge", function () {
    assertEqual(MCW.findRoute(sampleMap(), t(2, 2), [t(4, 2)]), [t(3, 2), t(4, 2)]);
  });

  it("returns [] when already on a goal and null when unreachable", function () {
    var map = sampleMap();
    assertEqual(MCW.findRoute(map, t(0, 0), [t(0, 0)]), []);
    assertEqual(MCW.findRoute(map, t(0, 0), [t(0, 4)]), null);
    assertEqual(MCW.findRoute(map, t(0, 0), []), null);
  });

  it("picks the nearer of two goals", function () {
    var route = MCW.findRoute(sampleMap(), t(0, 0), [t(6, 2), t(2, 0)]);
    assertEqual(route, [t(1, 0), t(2, 0)]);
  });

  it("workTiles lists passable tiles on the four sides of a 1x1 tile", function () {
    assertEqual(MCW.workTiles(sampleMap(), { col: 5, row: 0, w: 1, h: 1 }), [t(6, 0), t(4, 0)]);
  });

  it("workTiles lists passable tiles around a 2x2 building, never diagonals", function () {
    assertEqual(MCW.workTiles(sampleMap(), { col: 1, row: 3, w: 2, h: 2 }), [t(1, 2), t(2, 2), t(0, 4)]);
  });
});

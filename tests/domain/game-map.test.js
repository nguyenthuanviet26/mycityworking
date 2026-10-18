describe("game-map", function () {
  var BLOCKED = { foot: false, vehicle: false, cost: Infinity };

  function make(terrain, objects) {
    return MCW.parseMap({ terrain: terrain, objects: objects || [] }).map;
  }

  describe("base", function () {
    it("getTile out of bounds is null", function () {
      var m = new MCW.GameMap(3, 3);
      assertEqual(m.getTile(-1, 0), null);
      assertEqual(m.getTile(3, 0), null);
      assertEqual(m.getTile(0, 0).terrain, "grass");
    });

    it("2x2 object covers its footprint", function () {
      var m = new MCW.GameMap(8, 8);
      var o = m.placeObject({ type: "hospital_a", at: [3, 3] });
      assertTrue(o, "placed");
      [[3, 3], [4, 3], [3, 4], [4, 4]].forEach(function (p) {
        assertEqual(m.objectAt(p[0], p[1]).id, o.id, "covers " + p);
      });
      assertEqual(m.objectAt(5, 3), null);
    });

    it("overlapping placeObject returns false", function () {
      var m = new MCW.GameMap(8, 8);
      m.placeObject({ type: "hospital_a", at: [3, 3] });
      assertEqual(m.placeObject({ type: "house_small_blue_a", at: [4, 4] }), false);
    });
  });

  describe("variants", function () {
    it("setTileVariant emits tilechange and changes art", function () {
      var m = make("rr");
      // The picture now comes from the art adapter; creating it first also proves its
      // cache is refreshed by the tilechange event.
      var art = new MCW.TerrainArt(m);
      assertTrue(art.artAt(0, 0)[0].indexOf("_normal") > 0, "normal art first");
      var got = null;
      m.on("tilechange", function (e) { got = e; });
      m.setTileVariant(0, 0, "damaged");
      assertEqual(got, { col: 0, row: 0, variant: "damaged" });
      assertTrue(art.artAt(0, 0)[0].indexOf("_damaged") > 0, "damaged art");
    });

    it("setObjectVariant only when damaged art exists", function () {
      var m2 = make("...\n...", [{ type: "tree_pine_tall", at: [0, 0], id: "t" }, { type: "house_small_blue_a", at: [2, 0], id: "h" }]);
      var events = [];
      m2.on("objectchange", function (e) { events.push(e); });
      m2.setObjectVariant("t", "damaged");
      m2.setObjectVariant("h", "damaged");
      assertEqual(m2.getObject("t").variant, "normal");
      assertEqual(m2.getObject("h").variant, "damaged");
      assertEqual(events, [{ id: "h", variant: "damaged", change: "variant" }]);
    });
  });

  describe("editing", function () {
    it("removeObject frees the whole footprint and returns the object", function () {
      var m = make("....\n....\n....", [{ type: "hospital_a", at: [1, 1], id: "h" }]);
      var o = m.removeObject("h");
      assertEqual(o.type, "hospital_a");
      [[1, 1], [2, 1], [1, 2], [2, 2]].forEach(function (p) {
        assertEqual(m.objectAt(p[0], p[1]), null, "freed " + p);
      });
      assertEqual(m.getObject("h"), null);
      assertEqual(m.removeObject("nope"), null);
    });

    it("place and remove emit objectchange", function () {
      var m = new MCW.GameMap(4, 4);
      var events = [];
      m.on("objectchange", function (e) { events.push(e); });
      var o = m.placeObject({ type: "house_small_blue_a", at: [0, 0] });
      m.removeObject(o.id);
      assertEqual(events, [{ id: o.id, change: "placed" }, { id: o.id, change: "removed" }]);
    });

    it("named is true only for an explicit id", function () {
      var m = new MCW.GameMap(4, 4);
      assertEqual(m.placeObject({ type: "hospital_a", at: [0, 0], id: "hospital" }).named, true);
      assertEqual(m.placeObject({ type: "house_small_blue_a", at: [3, 3] }).named, false);
    });

    it("setTerrain clears unknown, resets the variant and emits terrainchange", function () {
      var m = make("rq");
      m.setTileVariant(0, 0, "damaged");
      var events = [];
      m.on("terrainchange", function (e) { events.push(e); });
      m.setTerrain(0, 0, "road");
      m.setTerrain(1, 0, "dirt");
      assertEqual(m.getTile(0, 0).variant, "normal");
      assertEqual(m.getTile(1, 0).unknown, false);
      assertEqual(events, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
    });

    it("setTerrain emits collisionchange only when collision changes", function () {
      var m = make("..");
      var events = [];
      m.on("collisionchange", function (e) { events.push(e); });
      m.setTerrain(0, 0, "dirt");
      assertEqual(events.length, 0, "grass to dirt keeps collision");
      m.setTerrain(0, 0, "road");
      assertEqual(events.length, 1);
      assertEqual(events[0], {
        col: 0, row: 0,
        before: { foot: true, vehicle: false, cost: 1 },
        after: { foot: true, vehicle: true, cost: 1 }
      });
    });

    it("removeObject emits collisionchange per freed tile", function () {
      var m = make("..\n..", [{ type: "hospital_a", at: [0, 0], id: "h" }]);
      var events = [];
      m.on("collisionchange", function (e) { events.push(e); });
      m.removeObject("h");
      assertEqual(events.length, 4);
      assertEqual(events[0].after.foot, true);
    });
  });

  describe("collision", function () {
    it("terrain defaults", function () {
      var m = make("r.~");
      assertEqual(m.collisionAt(0, 0), { foot: true, vehicle: true, cost: 1 });
      assertEqual(m.collisionAt(1, 0), { foot: true, vehicle: false, cost: 1 });
      assertEqual(m.collisionAt(2, 0), BLOCKED);
    });

    it("2x2 building blocks all four tiles", function () {
      var m = make("....\n....\n....", [{ type: "hospital_a", at: [1, 1] }]);
      [[1, 1], [2, 1], [1, 2], [2, 2]].forEach(function (p) {
        assertEqual(m.collisionAt(p[0], p[1]), BLOCKED, String(p));
      });
      assertEqual(m.collisionAt(0, 0).foot, true);
    });

    it("a prop on a road stays passable", function () {
      var m = make("rr", [{ type: "sign_caution_a", at: [0, 0] }]);
      assertEqual(m.collisionAt(0, 0), { foot: true, vehicle: true, cost: 1 });
    });

    it("out of map is blocked", function () {
      var m = make("r");
      assertEqual(m.collisionAt(-1, 0), BLOCKED);
      assertEqual(m.isPassable(5, 5, "foot"), false);
    });

    it("isPassable by mode", function () {
      var m = make("r.");
      assertEqual(m.isPassable(0, 0, "vehicle"), true);
      assertEqual(m.isPassable(1, 0, "vehicle"), false);
      assertEqual(m.isPassable(1, 0, "foot"), true);
    });

    it("neighbors on a T-junction", function () {
      // row 1 is a road along SE/NW; (1,0) is a road to the NE of (1,1)
      var m = make(".r.\nrrr\n...");
      var n = m.neighbors(1, 1, "vehicle");
      var dirs = n.map(function (x) { return x.dir; }).sort();
      assertEqual(dirs, ["NE", "NW", "SE"]);
      n.forEach(function (x) { assertEqual(x.cost, 1); });
      var ne = n.filter(function (x) { return x.dir === "NE"; })[0];
      assertEqual([ne.col, ne.row], [1, 0]);
    });

    it("overrides apply, emit and clear", function () {
      var m = make("rr");
      var events = [];
      m.on("collisionchange", function (e) { events.push(e); });
      m.setOverride(0, 0, { vehicle: false });
      assertEqual(m.collisionAt(0, 0), { foot: true, vehicle: false, cost: 1 });
      assertEqual(events[0].before, { foot: true, vehicle: true, cost: 1 });
      assertEqual(events[0].after, { foot: true, vehicle: false, cost: 1 });
      m.setOverride(0, 0, { cost: 2 });
      assertEqual(m.collisionAt(0, 0), { foot: true, vehicle: true, cost: 2 });
      m.clearOverride(0, 0);
      assertEqual(m.collisionAt(0, 0), { foot: true, vehicle: true, cost: 1 });
      assertEqual(events.length, 3);
      assertEqual(m.neighbors(1, 0, "vehicle").length, 1);
    });

    it("accessTile: declared or nearest road on the front sides", function () {
      var m = make("....\n....\n....\nrrrr", [
        { type: "hospital_a", at: [1, 1], id: "h" },
        { type: "house_small_blue_a", at: [0, 0], id: "a", access: [0, 3] }
      ]);
      // hospital covers (1..2, 1..2); SE side (3,1),(3,2) grass; SW side row 3 -> (1,3) is road
      assertEqual(m.accessTile("h"), { col: 1, row: 3 });
      assertEqual(m.accessTile("a"), { col: 0, row: 3 });
      assertEqual(m.accessTile("nope"), null);
    });
  });
});

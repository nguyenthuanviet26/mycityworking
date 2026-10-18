describe("map-checks", function () {
  function make(terrain, objects) {
    return MCW.parseMap({ terrain: terrain, objects: objects || [] }).map;
  }

  it("a bridge between roads is fine", function () {
    var m = make("rbr");
    assertEqual(MCW.mapChecks(m), []);
  });

  it("a bridge not between road or bridge tiles is reported", function () {
    var m = make("~~~\n~b~\n~~~");
    assertEqual(MCW.mapChecks(m), [{
      code: "bridge-not-crossing", col: 1, row: 1,
      message: "Bridge at (1,1) is not between road or bridge tiles"
    }]);
  });

  it("an object with a footprint tile on water is reported", function () {
    var m = make("...\n..~\n...", [{ type: "hospital_a", at: [1, 0], id: "h" }]);
    var p = MCW.mapChecks(m);
    assertEqual(p.length, 1);
    assertEqual(p[0].code, "object-on-water");
    assertEqual([p[0].col, p[0].row], [1, 0]);
    assertEqual(p[0].message, 'Object "h" is on water');
  });

  it("a clean map has no problems", function () {
    var m = make("rrr\n...", [{ type: "house_small_blue_a", at: [0, 1] }]);
    assertEqual(MCW.mapChecks(m), []);
  });
});

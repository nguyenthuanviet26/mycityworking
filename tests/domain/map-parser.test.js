describe("map-parser", function () {
  function parse(def) {
    return MCW.parseMap(def);
  }

  it("parses a small grid", function () {
    var res = parse({ id: "t", terrain: "..r\n~~r" });
    assertEqual(res.map.cols, 3);
    assertEqual(res.map.rows, 2);
    assertEqual(res.map.getTile(2, 0).terrain, "road");
    assertEqual(res.map.getTile(0, 1).terrain, "water");
    assertEqual(res.warnings.length, 0);
  });

  it("ignores leading and trailing blank lines", function () {
    var res = parse({ terrain: "\n\n..\n..\n\n" });
    assertEqual([res.map.cols, res.map.rows], [2, 2]);
  });

  it("pads ragged rows with grass and warns", function () {
    var res = parse({ terrain: "rrr\nr" });
    assertEqual(res.map.cols, 3);
    assertEqual(res.map.getTile(2, 1).terrain, "grass");
    assertEqual(res.warnings.length, 1);
  });

  it("unknown characters become grass, flagged, with a warning", function () {
    var res = parse({ terrain: ".?." });
    var t = res.map.getTile(1, 0);
    assertEqual(t.terrain, "grass");
    assertEqual(t.unknown, true);
    assertEqual(res.warnings.length, 1);
  });

  it("custom legend overrides the default", function () {
    var res = parse({ terrain: "gx", legend: { g: "dirt", x: "concrete" } });
    assertEqual(res.map.getTile(0, 0).terrain, "dirt");
    assertEqual(res.map.getTile(1, 0).terrain, "concrete");
  });

  it("unknown object type is skipped with a warning", function () {
    var res = parse({ terrain: "...", objects: [{ type: "spaceship", at: [0, 0] }] });
    assertEqual(res.map.objects().length, 0);
    assertEqual(res.warnings.length, 1);
  });

  it("2x2 object partly off the map is skipped", function () {
    var res = parse({ terrain: "...\n...", objects: [{ type: "hospital_a", at: [2, 0] }] });
    assertEqual(res.map.objects().length, 0);
    assertEqual(res.warnings.length, 1);
  });

  it("overlapping objects: second one skipped", function () {
    var res = parse({
      terrain: "...\n...\n...",
      objects: [{ type: "hospital_a", at: [0, 0] }, { type: "house_small_blue_a", at: [1, 1] }]
    });
    assertEqual(res.map.objects().length, 1);
    assertEqual(res.map.objects()[0].type, "hospital_a");
    assertEqual(res.warnings.length, 1);
  });

  it("object on water warns", function () {
    var res = parse({ terrain: "~.", objects: [{ type: "house_small_blue_a", at: [0, 0] }] });
    assertEqual(res.warnings.length, 1);
  });

  it("bridge not between roads warns", function () {
    var res = parse({ terrain: ".b." });
    assertEqual(res.warnings.length, 1);
    var ok = parse({ terrain: "rbr" });
    assertEqual(ok.warnings.length, 0);
  });

  it("generates ids and keeps given ids", function () {
    var res = parse({
      terrain: "....",
      objects: [{ type: "house_small_blue_a", at: [0, 0], id: "home" }, { type: "house_small_red_a", at: [2, 0] }]
    });
    assertTrue(res.map.getObject("home"), "home exists");
    assertEqual(res.map.objectAt(2, 0).id.indexOf("obj-"), 0);
  });

  it("missing terrain throws", function () {
    assertThrows(function () { parse({ id: "x" }); });
    assertThrows(function () { parse({ terrain: "\n\n" }); });
  });
});

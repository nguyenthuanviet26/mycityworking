describe("iso", function () {
  var iso = MCW.iso;

  it("mapToWorld of unit steps", function () {
    assertEqual(iso.mapToWorld(1, 0), { wx: 64, wy: 32 });
    assertEqual(iso.mapToWorld(0, 1), { wx: -64, wy: 32 });
  });

  it("worldToMap is the exact inverse", function () {
    for (var i = 0; i < 20; i++) {
      var x = Math.random() * 100 - 10, y = Math.random() * 100 - 10;
      var w = iso.mapToWorld(x, y);
      var m = iso.worldToMap(w.wx, w.wy);
      assertClose(m.x, x, 1e-9);
      assertClose(m.y, y, 1e-9);
    }
  });

  it("tileOf floors positions", function () {
    assertEqual(iso.tileOf(2.99, 0.01), { col: 2, row: 0 });
    assertEqual(iso.tileOf(-0.1, 0), { col: -1, row: 0 });
  });

  it("tileCenter", function () {
    assertEqual(iso.tileCenter(3, 4), { x: 3.5, y: 4.5 });
  });

  it("DIRS and depthKey", function () {
    assertEqual(iso.DIRS.SE, [1, 0]);
    assertEqual(iso.DIRS.NE, [0, -1]);
    assertEqual(iso.depthKey(2, 3), 5);
  });
});

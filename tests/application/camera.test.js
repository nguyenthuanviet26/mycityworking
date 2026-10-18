describe("camera", function () {
  function cam(cols, rows, w, h) {
    var c = new MCW.Camera({ viewW: w || 800, viewH: h || 600 });
    c.setMapSize(cols, rows);
    return c;
  }

  it("bounds of a 10x10 map", function () {
    var c = cam(10, 10);
    assertEqual(c.bounds, { minX: -704, maxX: 704, minY: -64, maxY: 704 });
  });

  it("panning stops at every edge", function () {
    var c = cam(40, 40);
    c.panBy(1e6, 0); // drag right -> camera moves left
    assertClose(c.wx - c.viewW / 2 / c.zoom, c.bounds.minX, 1e-6, "left edge");
    c.panBy(-1e6, 0);
    assertClose(c.wx + c.viewW / 2 / c.zoom, c.bounds.maxX, 1e-6, "right edge");
    c.panBy(0, 1e6);
    assertClose(c.wy - c.viewH / 2 / c.zoom, c.bounds.minY, 1e-6, "top edge");
    c.panBy(0, -1e6);
    assertClose(c.wy + c.viewH / 2 / c.zoom, c.bounds.maxY, 1e-6, "bottom edge");
  });

  it("zoom is clamped", function () {
    var c = cam(40, 40);
    c.zoomAt(10, 400, 300);
    assertEqual(c.zoom, 2);
    c.zoomAt(0.01, 400, 300);
    assertEqual(c.zoom, 0.5);
  });

  it("zoomAt keeps the point under the cursor", function () {
    var c = cam(60, 60);
    c.centerOn(30, 30);
    var before = c.screenToWorld(250, 180);
    c.zoomAt(1.1, 250, 180);
    var after = c.screenToWorld(250, 180);
    assertClose(after.wx, before.wx, 1e-6);
    assertClose(after.wy, before.wy, 1e-6);
  });

  it("small map is centred and cannot scroll", function () {
    var c = cam(3, 3, 1920, 1080);
    var b = c.bounds;
    assertClose(c.wx, (b.minX + b.maxX) / 2);
    assertClose(c.wy, (b.minY + b.maxY) / 2);
    c.panBy(300, 200);
    assertClose(c.wx, (b.minX + b.maxX) / 2);
    assertClose(c.wy, (b.minY + b.maxY) / 2);
  });

  it("keyboard scroll speed is constant on screen", function () {
    var c = cam(10, 10);
    assertEqual(c.scrollSpeedWorld(1), 600);
    assertEqual(c.scrollSpeedWorld(2), 300);
    assertEqual(c.scrollSpeedWorld(0.5), 1200);
  });

  it("centerOn puts a map point at the view centre", function () {
    var c = cam(60, 60);
    c.centerOn(30.5, 30.5);
    var s = c.mapToScreen(30.5, 30.5);
    assertClose(s.sx, 400, 1e-6);
    assertClose(s.sy, 300, 1e-6);
  });

  it("smooth centerOn glides and finishes", function () {
    var c = cam(60, 60);
    c.centerOn(10, 10);
    c.centerOn(40, 40, { smooth: true });
    assertTrue(c.update(100), "moving");
    c.update(1000);
    assertEqual(c.update(16), false);
    var s = c.mapToScreen(40, 40);
    assertClose(s.sx, 400, 1e-6);
  });

  describe("tileAtScreen", function () {
    it("tile centres resolve at several zooms and offsets", function () {
      [0.5, 1, 1.7].forEach(function (z) {
        var c = cam(50, 50);
        c.setZoom(z);
        c.centerOn(20 + z, 25 - z);
        for (var i = 0; i < 30; i++) {
          var col = Math.floor(Math.random() * 50), row = Math.floor(Math.random() * 50);
          var s = c.mapToScreen(col + 0.5, row + 0.5);
          assertEqual(c.tileAtScreen(s.sx, s.sy), { col: col, row: row }, "zoom " + z);
        }
      });
    });

    it("points just inside each diamond corner resolve to the tile", function () {
      var c = cam(20, 20);
      c.centerOn(10, 10);
      var ctr = c.mapToScreen(10.5, 10.5);
      var z = c.zoom;
      // corners of tile (10,10) relative to its centre: N (0,-32), E (64,0), S (0,32), W (-64,0)
      [[0, -31], [63, 0], [0, 31], [-63, 0]].forEach(function (d) {
        assertEqual(c.tileAtScreen(ctr.sx + d[0] * z, ctr.sy + d[1] * z), { col: 10, row: 10 }, String(d));
      });
    });

    it("outside the map returns null", function () {
      var c = cam(5, 5, 1920, 1080);
      assertEqual(c.tileAtScreen(0, 0), null);
      assertEqual(c.tileAtScreen(NaN, 10), null);
    });
  });
});

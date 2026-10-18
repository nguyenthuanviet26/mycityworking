describe("attract", function () {
  var A = MCW.attract;

  it("stays inside the middle of the map", function () {
    for (var i = 0; i <= 200; i++) {
      var p = A.positionAt(i * 900, 32, 32);
      assertTrue(p.x >= 0.2 * 32 - 1e-9 && p.x <= 0.8 * 32 + 1e-9, "x " + p.x);
      assertTrue(p.y >= 0.2 * 32 - 1e-9 && p.y <= 0.8 * 32 + 1e-9, "y " + p.y);
    }
  });

  it("loops every 90 seconds", function () {
    var a = A.positionAt(0, 32, 32), b = A.positionAt(90000, 32, 32);
    assertClose(a.x, b.x, 1e-9);
    assertClose(a.y, b.y, 1e-9);
  });

  it("drifts slowly", function () {
    for (var t = 0; t < 90000; t += 5000) {
      var a = A.positionAt(t, 32, 32), b = A.positionAt(t + 16, 32, 32);
      // < 0.02 tiles per 16 ms frame = under 1.25 tiles per second
      assertTrue(Math.hypot(b.x - a.x, b.y - a.y) < 0.02, "step at " + t);
    }
  });

  it("uses zoom 0.75", function () {
    assertEqual(A.ZOOM, 0.75);
  });
});

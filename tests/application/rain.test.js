describe("rain", function () {
  var R = MCW.rain;

  it("creates a fixed pool", function () {
    var r = R.create(160, 800, 600, 42);
    assertEqual(r.count, 160);
    assertTrue(r.x instanceof Float32Array && r.x.length === 160, "x array");
    assertEqual(r.y.length, 160);
    assertEqual(r.speed.length, 160);
    assertEqual(r.len.length, 160);
  });

  it("is deterministic with a seed", function () {
    var a = R.create(160, 800, 600, 42), b = R.create(160, 800, 600, 42);
    assertEqual(Array.from(a.x), Array.from(b.x));
    R.update(a, 16);
    R.update(b, 16);
    assertEqual(Array.from(a.y), Array.from(b.y));
  });

  it("streaks fall by speed x dt or respawn at the top", function () {
    var r = R.create(160, 800, 600, 7);
    var y0 = Array.from(r.y), s = Array.from(r.speed);
    R.update(r, 16);
    for (var i = 0; i < r.count; i++) {
      var moved = Math.abs(r.y[i] - (y0[i] + s[i] * 0.016)) < 1e-3;
      var respawned = r.y[i] < 0;
      assertTrue(moved || respawned, "streak " + i);
    }
  });

  it("stays on screen over time with a constant count", function () {
    var r = R.create(160, 800, 600, 3);
    for (var k = 0; k < 500; k++) R.update(r, 16);
    assertEqual(r.count, 160);
    for (var i = 0; i < r.count; i++) assertTrue(r.y[i] <= 600 + 22, "y " + r.y[i]);
  });

  it("speeds and lengths are in range", function () {
    var r = R.create(160, 800, 600, 9);
    for (var i = 0; i < r.count; i++) {
      assertTrue(r.speed[i] >= 700 && r.speed[i] <= 1100, "speed");
      assertTrue(r.len[i] >= 10 && r.len[i] <= 22, "len");
    }
  });

  it("resize keeps streaks on screen", function () {
    var r = R.create(160, 800, 600, 5);
    R.resize(r, 400, 300);
    for (var i = 0; i < r.count; i++) assertTrue(r.x[i] >= -30 && r.x[i] <= 460, "x " + r.x[i]);
  });

  // ---- feature 005: intensity --------------------------------------------

  it("starts with every drop active", function () {
    assertEqual(R.create(400, 800, 600, 3).active, 400);
  });

  it("setIntensity sets the active count", function () {
    var r = R.create(400, 800, 600, 3);
    R.setIntensity(r, 0.4);
    assertEqual(r.active, 160);
    R.setIntensity(r, 0);
    assertEqual(r.active, 0);
    R.setIntensity(r, 2);
    assertEqual(r.active, 400);
  });

  it("only active drops move", function () {
    var r = R.create(400, 800, 600, 3);
    R.setIntensity(r, 0.5);
    var y0 = Array.from(r.y);
    R.update(r, 16);
    for (var i = 200; i < 400; i++) assertEqual(r.y[i], y0[i], "drop " + i + " still");
  });

  it("newly active drops enter from above the top edge", function () {
    var r = R.create(400, 800, 600, 3);
    R.setIntensity(r, 0.25);
    R.setIntensity(r, 0.5);
    for (var i = 100; i < 200; i++) assertTrue(r.y[i] < 0, "drop " + i + " above the top");
  });
});

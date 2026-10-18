describe("job-art", function () {
  var A = MCW.jobArt;

  it("gives each job its vehicle for every facing", function () {
    var v = { road: "pickup_orange", builders: "box_red", electric: "van_white", drainage: "truck_green", general: "truck_yellow" };
    Object.keys(v).forEach(function (job) {
      ["NE", "SE", "SW", "NW"].forEach(function (f) {
        assertEqual(A.vehicleFor(job, f), "Vehicles/veh_" + v[job] + "_" + f + ".png");
      });
    });
  });

  it("maps portrait keys to character pictures", function () {
    assertEqual(A.portraitFor("char_b"), "Characters/char_b_idle_SE_f01.png");
  });

  it("has a glyph for every kind and an icon for every job", function () {
    Object.keys(MCW.incidentKinds).forEach(function (k) { assertTrue(!!A.kindGlyph(k), k); });
    Object.keys(MCW.jobs).forEach(function (j) {
      assertTrue(!!A.icon(j), j);
      assertTrue(!!A.vehicleName(j), j);
    });
  });

  it("lists every picture a level's crews need, once", function () {
    var paths = A.imagePathsFor([{ job: "road", portrait: "char_a" }, { job: "road", portrait: "char_a" }]);
    ["NE", "SE", "SW", "NW"].forEach(function (f) {
      assertTrue(paths.indexOf("Vehicles/veh_pickup_orange_" + f + ".png") >= 0, f);
    });
    assertTrue(paths.indexOf("Characters/char_a_idle_SE_f01.png") >= 0, "portrait");
    assertEqual(paths.length, 5);
  });
});

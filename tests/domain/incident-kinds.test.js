describe("incident-kinds", function () {
  var K = MCW.incidentKinds;

  it("has four kinds with their numbers", function () {
    assertEqual(Object.keys(K).sort(), ["building", "pump", "road", "streetlight"]);
    assertEqual([K.road.warnS, K.building.warnS, K.streetlight.warnS, K.pump.warnS], [25, 30, 25, 34]);
    assertEqual([K.road.repairS, K.building.repairS, K.streetlight.repairS, K.pump.repairS], [4, 6, 3, 7]);
    assertEqual([K.road.points, K.building.points, K.streetlight.points, K.pump.points], [100, 150, 100, 200]);
    assertEqual(K.road.targets, "tile");
  });

  it("streetlights are lightpoles", function () {
    assertTrue(MCW.kindAccepts(K.streetlight, "lightpole_a"), "lightpole_a");
    assertTrue(MCW.kindAccepts(K.streetlight, "lightpole_b"), "lightpole_b");
    assertTrue(!MCW.kindAccepts(K.streetlight, "house_small_blue_a"), "not a house");
  });

  it("pump stations are water buildings", function () {
    assertTrue(MCW.kindAccepts(K.pump, "water_a"), "water_a");
    assertTrue(MCW.kindAccepts(K.pump, "water_b"), "water_b");
    assertTrue(!MCW.kindAccepts(K.pump, "clinic_a"), "not a clinic");
  });

  it("roofs are buildings other than pump stations", function () {
    assertTrue(MCW.kindAccepts(K.building, "clinic_a"), "clinic");
    assertTrue(!MCW.kindAccepts(K.building, "water_a"), "not a pump station");
    assertTrue(!MCW.kindAccepts(K.building, "lightpole_a"), "not a prop");
  });
});

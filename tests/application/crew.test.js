describe("crew", function () {
  // Depot (0,0); road east along row 0, then south along col 3 over a bridge.
  function setup(speed) {
    var map = MCW.parseMap({
      terrain: ["rrrr", "...r", "~~~b", "...r"].join("\n")
    }).map;
    var crew = new MCW.Crew({ map: map, depot: { col: 0, row: 0 }, speed: speed || 2 });
    return { map: map, crew: crew };
  }

  function t(col, row) { return { col: col, row: row }; }

  function runUntil(crew, type, maxMs) {
    for (var ms = 0; ms < (maxMs || 20000); ms += 100) {
      var ev = crew.update(100);
      for (var i = 0; i < ev.length; i++) if (ev[i].type === type) return ev[i];
    }
    return null;
  }

  it("starts idle at the depot centre facing SE", function () {
    var c = setup().crew;
    assertEqual(c.state, "idle");
    assertClose(c.x, 0.5);
    assertClose(c.y, 0.5);
    assertEqual(c.facing, "SE");
    assertTrue(c.canSend(), "can send when idle");
  });

  it("drives one tile per 1/speed seconds", function () {
    var c = setup(2).crew;
    assertTrue(c.sendTo("inc-0", [t(3, 3)]), "route exists");
    assertEqual(c.state, "driving");
    assertEqual(c.incidentId, "inc-0");
    c.update(500);
    assertClose(c.x, 1.5, 1e-6);
    assertClose(c.y, 0.5, 1e-6);
  });

  it("faces the direction of each step and turns at the corner", function () {
    var c = setup(2).crew;
    c.sendTo("inc-0", [t(3, 3)]);
    c.update(250);
    assertEqual(c.facing, "SE");
    c.update(1500); // past (3,0)
    c.update(250);
    assertEqual(c.facing, "SW");
  });

  it("arrives on a goal tile and starts repairing", function () {
    var c = setup(2).crew;
    c.sendTo("inc-0", [t(3, 3)]);
    var ev = runUntil(c, "arrive");
    assertEqual(ev, { type: "arrive", incidentId: "inc-0" });
    assertEqual(c.state, "repairing");
    assertClose(c.x, 3.5, 1e-6);
    assertClose(c.y, 3.5, 1e-6);
    assertTrue(!c.canSend(), "cannot send while repairing");
    assertEqual(c.sendTo("inc-1", [t(0, 0)]), false);
  });

  it("returns home after a repair", function () {
    var c = setup(4).crew;
    c.sendTo("inc-0", [t(3, 0)]);
    runUntil(c, "arrive");
    c.finishRepair();
    c.goHome();
    assertEqual(c.state, "returning");
    assertEqual(c.incidentId, null);
    assertTrue(c.canSend(), "can send while returning");
    assertEqual(runUntil(c, "home"), { type: "home" });
    assertEqual(c.state, "idle");
    assertClose(c.x, 0.5, 1e-6);
  });

  it("a redirect finishes the current step, then follows the new route", function () {
    var c = setup(2).crew;
    c.sendTo("inc-0", [t(3, 3)]);
    c.update(750); // halfway between (1,0) and (2,0)
    assertClose(c.x, 2.0, 1e-6);
    assertTrue(c.sendTo("inc-1", [t(0, 0)]), "redirect");
    assertEqual(c.incidentId, "inc-1");
    var prevX = c.x;
    c.update(200);
    assertTrue(c.x > prevX, "keeps moving forward into (2,0)");
    var ev = runUntil(c, "arrive");
    assertEqual(ev.incidentId, "inc-1");
    assertClose(c.x, 0.5, 1e-6);
  });

  it("arrives at once when already on a goal tile", function () {
    var c = setup().crew;
    assertTrue(c.sendTo("inc-0", [t(0, 0)]), "sent");
    assertEqual(c.update(16), [{ type: "arrive", incidentId: "inc-0" }]);
    assertClose(c.x, 0.5);
  });

  it("refuses a send with no route and changes nothing", function () {
    var c = setup().crew;
    assertEqual(c.sendTo("inc-0", [t(0, 3)]), false);
    assertEqual(c.state, "idle");
    assertEqual(c.incidentId, null);
  });

  // ---- feature 006 -------------------------------------------------------

  it("keeps its identity fields", function () {
    var map = setup().map;
    var c = new MCW.Crew({ map: map, depot: { col: 0, row: 0 }, speed: 2, id: "e", jobId: "electric", leader: "Linh", portrait: "char_c" });
    assertEqual([c.id, c.jobId, c.leader, c.portrait], ["e", "electric", "Linh", "char_c"]);
  });

  it("reports its status in player words", function () {
    var c = setup(4).crew;
    assertEqual(c.status(), "ready");
    c.sendTo("inc-0", [t(3, 0)]);
    assertEqual(c.status(), "driving");
    runUntil(c, "arrive");
    assertEqual(c.status(), "repairing");
    c.finishRepair();
    c.goHome();
    assertEqual(c.status(), "returning");
  });
});

describe("jobs", function () {
  var K = MCW.incidentKinds;
  var TABLE = {
    road: { road: "best", building: "none", streetlight: "none", pump: "none" },
    builders: { road: "help", building: "best", streetlight: "none", pump: "none" },
    electric: { road: "none", building: "help", streetlight: "best", pump: "help" },
    drainage: { road: "help", building: "none", streetlight: "none", pump: "best" }
  };

  it("has the four jobs and a hidden general job", function () {
    ["road", "builders", "electric", "drainage", "general"].forEach(function (id) {
      assertTrue(!!MCW.jobs[id], id);
      assertEqual(MCW.jobs[id].id, id);
    });
    assertTrue(MCW.jobs.general.hidden, "general is hidden");
  });

  it("matches the starting job table", function () {
    Object.keys(TABLE).forEach(function (job) {
      Object.keys(TABLE[job]).forEach(function (kind) {
        assertEqual(MCW.matchLevel(job, kind), TABLE[job][kind], job + " x " + kind);
      });
    });
    assertEqual(MCW.matchLevel("road", "unknown-kind"), "none");
  });

  it("general is Best at every kind", function () {
    Object.keys(K).forEach(function (kind) { assertEqual(MCW.matchLevel("general", kind), "best"); });
  });

  it("every kind has a Best job", function () {
    Object.keys(K).forEach(function (kind) {
      var best = Object.keys(MCW.jobs).filter(function (j) {
        return !MCW.jobs[j].hidden && MCW.matchLevel(j, kind) === "best";
      });
      assertTrue(best.length >= 1, kind);
    });
  });

  it("Best repairs take the base time, except a job's repair advantage", function () {
    var J = MCW.jobs;
    assertEqual(MCW.repairSeconds(J.road, K.road, "best"), 4);
    assertEqual(MCW.repairSeconds(J.builders, K.building, "best"), 6);
    assertClose(MCW.repairSeconds(J.electric, K.streetlight, "best"), 3 * 0.6, 1e-9);
    assertClose(MCW.repairSeconds(J.drainage, K.pump, "best"), 7 * 0.7, 1e-9);
  });

  it("Can-help repairs take twice the base time, with no advantage", function () {
    var J = MCW.jobs;
    assertEqual(MCW.repairSeconds(J.builders, K.road, "help"), 8);
    assertEqual(MCW.repairSeconds(J.electric, K.pump, "help"), 14);
    assertEqual(MCW.repairSeconds(J.drainage, K.road, "help"), 8);
  });

  it("Best repairs add the right-crew bonus; points advantages apply", function () {
    var J = MCW.jobs, lvl = { rightCrewBonus: 40 };
    assertEqual(MCW.repairPoints(J.road, K.road, "best", lvl), 140);
    assertEqual(MCW.repairPoints(J.builders, K.building, "best", lvl), Math.round(150 * 1.5) + 40);
    assertEqual(MCW.repairPoints(J.electric, K.streetlight, "best", lvl), 140);
  });

  it("Can-help repairs get no bonus and no advantage", function () {
    var J = MCW.jobs, lvl = { rightCrewBonus: 40 };
    assertEqual(MCW.repairPoints(J.builders, K.road, "help", lvl), 100);
    assertEqual(MCW.repairPoints(J.electric, K.building, "help", lvl), 150);
  });

  it("a missing rightCrewBonus counts as 0", function () {
    assertEqual(MCW.repairPoints(MCW.jobs.road, K.road, "best", {}), 100);
  });

  it("the four jobs don't all share one advantage", function () {
    var types = ["road", "builders", "electric", "drainage"].map(function (j) { return MCW.jobs[j].advantage.type; });
    assertTrue(types.some(function (t) { return t !== types[0]; }), "different advantages");
  });
});

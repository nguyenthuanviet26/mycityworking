describe("level-checks", function () {
  function testMap() {
    return MCW.parseMap({
      terrain: [
        "rrrrr",
        "r...r",
        "rrrrr",
        ".....",
        "r...."
      ].join("\n"),
      objects: [
        { type: "clinic_a", at: [1, 1], id: "clinic" },
        { type: "construction_b", at: [2, 1], id: "site" }
      ]
    }).map;
  }

  function validLevel() {
    return {
      id: "t", name: "Test", map: "test",
      depot: [0, 0],
      crew: { speed: 3 },
      target: 3,
      phases: [
        { name: "Drizzle", durationS: 10, maxActive: 1, rain: 0.4 },
        { name: "Downpour", durationS: 10, maxActive: 2, rain: 0.7 },
        { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
      ],
      schedule: [
        { at: 1, kind: "road", tile: [2, 0], tutorial: true },
        { at: 12, kind: "building", object: "clinic" },
        { at: 21, kind: "road", tile: [4, 2] },
        { at: 25, kind: "road", tile: [0, 2] }
      ],
      drainPerUrgentPerS: 1,
      refill: { normal: 5, early: 8 },
      earlyBonus: 50,
      stars: [100, 200]
    };
  }

  function broken(change) {
    var l = JSON.parse(JSON.stringify(validLevel()));
    change(l);
    return MCW.checkLevel(l, testMap());
  }

  it("a valid level has no problems", function () {
    assertEqual(MCW.checkLevel(validLevel(), testMap()), []);
  });

  var CASES = {
    "depot off-road": function (l) { l.depot = [1, 3]; },
    "two phases": function (l) { l.phases.pop(); },
    "maxActive going down": function (l) { l.phases[2].maxActive = 1; },
    "rain not increasing": function (l) { l.phases[1].rain = 0.4; },
    "a slower later phase": function (l) { l.schedule[3].at = 15; l.schedule.sort(function (a, b) { return a.at - b.at; }); },
    "unsorted schedule": function (l) { l.schedule[1].at = 0.5; },
    "at past the end": function (l) { l.schedule[3].at = 30; },
    "unknown kind": function (l) { l.schedule[2].kind = "flood"; },
    "road kind with an object": function (l) { delete l.schedule[2].tile; l.schedule[2].object = "clinic"; },
    "tile target on grass": function (l) { l.schedule[2].tile = [1, 3]; },
    "object without damaged art": function (l) { l.schedule[1].object = "site"; },
    "unknown object": function (l) { l.schedule[1].object = "nowhere"; },
    "unreachable target": function (l) { l.schedule[3].tile = [0, 4]; },
    "two tutorials": function (l) { l.schedule[1].tutorial = true; },
    "tutorial not first": function (l) { delete l.schedule[0].tutorial; l.schedule[1].tutorial = true; },
    "target 0": function (l) { l.target = 0; },
    "target above schedule length": function (l) { l.target = 5; },
    "stars out of order": function (l) { l.stars = [300, 200]; },
    "early refill below normal": function (l) { l.refill = { normal: 8, early: 5 }; }
  };

  Object.keys(CASES).forEach(function (name) {
    it("reports " + name, function () {
      var problems = broken(CASES[name]);
      assertTrue(problems.length > 0, "expected a problem for " + name);
      assertTrue(typeof problems[0] === "string", "problems are strings");
    });
  });

  // ---- feature 006: crews ------------------------------------------------

  function crewMap() {
    return MCW.parseMap({
      terrain: ["rrrrr", "r...r", "rrrrr", ".....", "r...."].join("\n"),
      objects: [
        { type: "clinic_a", at: [1, 1], id: "clinic" },
        { type: "lightpole_a", at: [3, 1], id: "lamp" }
      ]
    }).map;
  }

  function crewLevel() {
    var l = validLevel();
    delete l.depot;
    delete l.crew;
    l.crews = [
      { id: "road", job: "road", leader: "Minh", portrait: "char_a", depot: [0, 0] },
      { id: "builders", job: "builders", leader: "Hoa", portrait: "char_b", depot: [4, 0] }
    ];
    return l;
  }

  function brokenCrews(change) {
    var l = JSON.parse(JSON.stringify(crewLevel()));
    change(l);
    return MCW.checkLevel(l, crewMap());
  }

  function addEntry(l, e) {
    l.schedule.push(e);
    l.schedule.sort(function (a, b) { return a.at - b.at; });
  }

  it("a valid crews level has no problems", function () {
    assertEqual(MCW.checkLevel(crewLevel(), crewMap()), []);
  });

  var CREW_CASES = {
    "no crews and no depot": function (l) { delete l.crews; },
    "seven crews": function (l) {
      for (var i = 0; i < 5; i++) l.crews.push({ id: "x" + i, job: "road", leader: "", portrait: "char_a", depot: [0, 0] });
    },
    "duplicate crew ids": function (l) { l.crews[1].id = "road"; },
    "an unknown job": function (l) { l.crews[1].job = "pilot"; },
    "the hidden general job": function (l) { l.crews[1].job = "general"; },
    "a depot on grass": function (l) { l.crews[1].depot = [1, 3]; },
    "a bad portrait": function (l) { l.crews[1].portrait = "char_z"; },
    "a kind with no Best crew": function (l) { addEntry(l, { at: 22, kind: "streetlight", object: "lamp" }); },
    "a target only a helper can reach": function (l) { l.crews[0].depot = [0, 4]; },
    "a streetlight entry on a clinic": function (l) {
      l.crews.push({ id: "electric", job: "electric", leader: "Linh", portrait: "char_c", depot: [0, 2] });
      addEntry(l, { at: 22, kind: "streetlight", object: "clinic" });
    },
    "warnScale 0": function (l) { l.warnScale = 0; },
    "a negative right-crew bonus": function (l) { l.rightCrewBonus = -1; }
  };

  Object.keys(CREW_CASES).forEach(function (name) {
    it("reports " + name, function () {
      assertTrue(brokenCrews(CREW_CASES[name]).length > 0, "expected a problem for " + name);
    });
  });

  it("levelCrews turns a legacy level into one general crew", function () {
    var crews = MCW.levelCrews(validLevel());
    assertEqual(crews.length, 1);
    assertEqual([crews[0].id, crews[0].job, crews[0].depot, crews[0].speed], ["crew", "general", [0, 0], 3]);
  });
});

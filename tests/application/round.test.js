describe("round", function () {
  // Depot (0,0) on a road ring; clinic (1x1) inside the ring.
  function testMap() {
    return MCW.parseMap({
      terrain: ["rrrrr", "r...r", "rrrrr", ".....", "....."].join("\n"),
      objects: [{ type: "clinic_a", at: [1, 1], id: "clinic" }]
    }).map;
  }

  function testLevel(schedule, extra) {
    var l = {
      id: "t", name: "Test", map: "test", depot: [0, 0], crew: { speed: 10 }, target: 2,
      phases: [
        { name: "Drizzle", durationS: 10, maxActive: 3, rain: 0.4 },
        { name: "Downpour", durationS: 10, maxActive: 3, rain: 0.7 },
        { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
      ],
      schedule: schedule,
      drainPerUrgentPerS: 2, refill: { normal: 5, early: 8 }, earlyBonus: 50, stars: [100, 200]
    };
    Object.keys(extra || {}).forEach(function (k) { l[k] = extra[k]; });
    return l;
  }

  function setup(schedule, extra) {
    var map = testMap();
    var round = new MCW.Round({ map: map, level: testLevel(schedule, extra) });
    var events = [];
    ["release", "urgent", "assigned", "arrive", "repaired", "phase", "goal", "cleared", "end"].forEach(function (e) {
      round.on(e, function (p) { events.push({ type: e, p: p }); });
    });
    return { map: map, round: round, events: events };
  }

  function runTo(round, seconds) {
    while (round.elapsed < seconds - 1e-9 && !round.over) round.update(100);
  }

  function of(events, type) {
    return events.filter(function (e) { return e.type === type; });
  }

  var ROAD = { at: 1, kind: "road", tile: [2, 2] };
  var ROAD2 = { at: 2, kind: "road", tile: [4, 1] };

  // ---- US1 ----------------------------------------------------------------

  it("starts with nothing active and every target normal", function () {
    var s = setup([ROAD]);
    assertEqual(s.round.activeIncidents().length, 0);
    assertEqual(s.map.getTile(2, 2).variant, "normal");
    assertEqual(s.round.condition, 100);
    assertEqual(s.round.score, 0);
  });

  it("releases an incident at its time and damages the tile", function () {
    var s = setup([ROAD]);
    runTo(s.round, 0.9);
    assertEqual(s.round.activeIncidents().length, 0);
    runTo(s.round, 1.1);
    var inc = s.round.activeIncidents()[0];
    assertEqual(inc.id, "inc-0");
    assertEqual(inc.state, "new");
    assertEqual(s.map.getTile(2, 2).variant, "damaged");
    assertEqual(of(s.events, "release").length, 1);
    assertEqual(inc.workTiles, MCW.workTiles(s.map, { col: 2, row: 2, w: 1, h: 1 }));
    assertEqual(inc.centre, { x: 2.5, y: 2.5 });
  });

  it("damages a building and finds it by any footprint tile", function () {
    var s = setup([{ at: 1, kind: "building", object: "clinic" }]);
    runTo(s.round, 1.1);
    assertEqual(s.map.getObject("clinic").variant, "damaged");
    assertEqual(s.round.incidentAt(1, 1).id, "inc-0");
    assertEqual(s.round.incidentAt(2, 2), null);
  });

  it("an entry whose target is busy waits until it is repaired", function () {
    var s = setup([ROAD, { at: 2, kind: "road", tile: [2, 2] }]);
    runTo(s.round, 3);
    assertEqual(s.round.activeIncidents().length, 1);
    s.round.send("inc-0");
    runTo(s.round, 8.2);
    assertEqual(of(s.events, "repaired").length, 1);
    s.round.update(100);
    assertEqual(s.round.activeIncidents().length, 1);
    assertEqual(s.round.activeIncidents()[0].id, "inc-1");
  });

  it("sending the crew assigns the incident", function () {
    var s = setup([ROAD]);
    runTo(s.round, 1.1);
    assertTrue(s.round.send("inc-0"), "sent");
    var inc = s.round.incident("inc-0");
    assertEqual(inc.state, "assigned");
    assertTrue(inc.crewSent, "crewSent");
    assertEqual(of(s.events, "assigned").length, 1);
    assertEqual(s.round.send("inc-0"), false, "already on the way");
  });

  it("the crew arrives, repairs over repairS, and the tile is restored", function () {
    var s = setup([ROAD]);
    runTo(s.round, 1.1);
    s.round.send("inc-0");
    runTo(s.round, 1.6);
    assertEqual(of(s.events, "arrive").length, 1);
    var inc = s.round.incident("inc-0");
    assertEqual(inc.state, "repairing");
    assertTrue(inc.progress > 0 && inc.progress < 0.2, "progress started");
    assertTrue(s.round.secondsUntilCrewFree() > 3, "busy for about 4 s");
    runTo(s.round, 6);
    var rep = of(s.events, "repaired");
    assertEqual(rep.length, 1);
    assertEqual(rep[0].p.points, 150); // 100 + early bonus 50
    assertEqual(s.map.getTile(2, 2).variant, "normal");
    assertEqual(s.round.activeIncidents().length, 0);
    assertEqual(s.round.score, 150);
    assertEqual(s.round.repaired, 1);
    assertEqual(s.round.secondsUntilCrewFree(), null);
    assertTrue(["returning", "idle"].indexOf(s.round.crews[0].state) >= 0, "crew heads home");
  });

  it("can redirect a driving crew; the first incident goes back to new", function () {
    var s = setup([ROAD, ROAD2]);
    runTo(s.round, 2.1);
    s.round.send("inc-1");
    s.round.update(100);
    assertTrue(s.round.send("inc-0"), "redirected");
    assertEqual(s.round.incident("inc-1").state, "new");
    assertTrue(s.round.incident("inc-1").crewSent, "keeps crewSent");
    assertEqual(s.round.incident("inc-0").state, "assigned");
  });

  it("cannot send while the crew is repairing", function () {
    var s = setup([ROAD, ROAD2]);
    runTo(s.round, 2.1);
    s.round.send("inc-0");
    runTo(s.round, 3);
    assertEqual(s.round.crews[0].state, "repairing");
    assertEqual(s.round.send("inc-1"), false);
  });

  it("reset restores every damaged target", function () {
    var s = setup([ROAD, { at: 1, kind: "building", object: "clinic" }]);
    runTo(s.round, 1.1);
    s.round.reset();
    assertEqual(s.map.getTile(2, 2).variant, "normal");
    assertEqual(s.map.getObject("clinic").variant, "normal");
  });

  // ---- US2 ----------------------------------------------------------------

  it("goes through three phases with one event per change", function () {
    var s = setup([ROAD]);
    assertEqual(s.round.phase().index, 0);
    assertEqual(s.round.phase().name, "Drizzle");
    runTo(s.round, 10);
    assertEqual(s.round.phase().index, 1);
    runTo(s.round, 20);
    assertEqual(s.round.phase().index, 2);
    assertEqual(s.round.phase().rain, 1);
    assertEqual(of(s.events, "phase").map(function (e) { return e.p.name; }), ["Downpour", "Peak storm"]);
    assertClose(s.round.remaining(), 10, 1e-6);
  });

  it("holds entries back beyond the phase's maxActive", function () {
    var phases = [
      { name: "Drizzle", durationS: 10, maxActive: 1, rain: 0.4 },
      { name: "Downpour", durationS: 10, maxActive: 2, rain: 0.7 },
      { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
    ];
    var s = setup([ROAD, ROAD2], { phases: phases });
    runTo(s.round, 3);
    assertEqual(s.round.activeIncidents().length, 1);
    runTo(s.round, 10.1);
    assertEqual(s.round.activeIncidents().length, 2);
  });

  it("an unrepaired incident turns urgent after warnS and drains the meter", function () {
    var s = setup([ROAD]);
    runTo(s.round, 25.9);
    assertTrue(!s.round.incident("inc-0").urgent, "not yet");
    assertEqual(s.round.condition, 100);
    runTo(s.round, 26.1);
    assertTrue(s.round.incident("inc-0").urgent, "urgent");
    assertEqual(of(s.events, "urgent").length, 1);
    runTo(s.round, 28.1);
    assertClose(s.round.condition, 100 - 2 * 2.1, 0.25);
  });

  it("does not turn urgent while being repaired", function () {
    var s = setup([ROAD]);
    runTo(s.round, 24.5);
    s.round.send("inc-0");
    runTo(s.round, 27);
    assertEqual(s.round.incident("inc-0").state, "repairing");
    assertTrue(!s.round.incident("inc-0").urgent, "not urgent");
  });

  it("refills +normal after an urgent repair and +early (capped) otherwise", function () {
    var long = [
      { name: "Drizzle", durationS: 20, maxActive: 3, rain: 0.4 },
      { name: "Downpour", durationS: 20, maxActive: 3, rain: 0.7 },
      { name: "Peak storm", durationS: 20, maxActive: 3, rain: 1 }
    ];
    var s = setup([ROAD, ROAD2], { drainPerUrgentPerS: 1, phases: long });
    runTo(s.round, 27.5);
    var before = s.round.condition;
    assertTrue(before < 100, "drained");
    s.round.send("inc-0");
    runTo(s.round, 40);
    var rep = of(s.events, "repaired")[0].p;
    assertTrue(s.round.condition < 100, "a normal refill");
    assertEqual(rep.early, false);
    assertEqual(rep.refill, 5);
    assertEqual(rep.points, 100);
  });

  it("an early repair gives +early and the bonus, never above 100", function () {
    var s = setup([ROAD]);
    runTo(s.round, 1.1);
    s.round.send("inc-0");
    runTo(s.round, 6);
    var rep = of(s.events, "repaired")[0].p;
    assertEqual(rep.early, true);
    assertEqual(rep.refill, 8);
    assertEqual(s.round.condition, 100);
  });

  it("reaching the target fires goal once and the round goes on", function () {
    var s = setup([ROAD], { target: 1 });
    runTo(s.round, 1.1);
    s.round.send("inc-0");
    runTo(s.round, 8);
    assertTrue(s.round.goalReached, "goal reached");
    assertEqual(of(s.events, "goal").length, 1);
    assertTrue(!s.round.over, "still running");
  });

  it("the storm clearing ends the round as a win once the goal was reached", function () {
    var s = setup([ROAD], { target: 1 });
    runTo(s.round, 1.1);
    s.round.send("inc-0");
    runTo(s.round, 31);
    assertTrue(s.round.over, "over");
    var types = s.events.map(function (e) { return e.type; });
    assertTrue(types.indexOf("cleared") >= 0 && types.indexOf("cleared") < types.indexOf("end"), "cleared before end");
    var r = s.round.result;
    assertEqual(r.won, true);
    assertEqual(r.reason, "cleared");
    assertEqual(r.repaired, 1);
    assertEqual(r.target, 1);
    assertClose(r.timeS, 30, 1e-6);
    assertEqual(r.score, 150);
    assertEqual(r.stars, 2); // 1 + (150 >= 100) + (150 >= 200)
  });

  it("the storm clearing before the goal is a loss with no stars", function () {
    var s = setup([ROAD]);
    runTo(s.round, 31);
    assertEqual(s.round.result.won, false);
    assertEqual(s.round.result.reason, "cleared");
    assertEqual(s.round.result.stars, 0);
  });

  it("the meter emptying before the goal is a loss", function () {
    var s = setup([ROAD], { drainPerUrgentPerS: 100 });
    runTo(s.round, 28);
    assertTrue(s.round.over, "over");
    assertEqual(s.round.condition, 0);
    assertEqual(s.round.result.won, false);
    assertEqual(s.round.result.reason, "collapsed");
  });

  it("the meter emptying after the goal is a win", function () {
    var s = setup([ROAD, ROAD2], { target: 1, drainPerUrgentPerS: 100 });
    runTo(s.round, 2.1);
    s.round.send("inc-1");
    runTo(s.round, 28);
    assertTrue(s.round.over, "over");
    assertEqual(s.round.result.reason, "collapsed");
    assertEqual(s.round.result.won, true);
  });

  it("a goal repair finishing as the meter empties counts as a win", function () {
    var s = setup([ROAD, ROAD2], { target: 1, drainPerUrgentPerS: 100 });
    runTo(s.round, 24);
    s.round.send("inc-1");
    var inc = s.round.incident("inc-1");
    while (!(inc.state === "repairing" && inc.progress >= 0.97)) {
      s.round.condition = 100;
      s.round.update(100);
    }
    assertTrue(s.round.incident("inc-0").urgent, "the other incident drains");
    s.round.condition = 0.5;
    s.round.update(100);
    assertTrue(s.round.over, "over");
    assertEqual(s.round.condition, 0);
    assertEqual(s.round.result.won, true);
  });

  it("nothing changes after the end", function () {
    var s = setup([ROAD]);
    runTo(s.round, 31);
    var e = s.round.elapsed, n = s.events.length;
    assertEqual(s.round.update(100), false);
    assertEqual(s.round.elapsed, e);
    assertEqual(s.events.length, n);
  });

  // ---- US3 ----------------------------------------------------------------

  it("the tutorial incident never turns urgent before the crew is sent", function () {
    var s = setup([{ at: 1, kind: "road", tile: [2, 2], tutorial: true }]);
    runTo(s.round, 29.9);
    assertTrue(!s.round.incident("inc-0").urgent, "protected");
    assertEqual(s.round.condition, 100);
  });

  it("after a send, the tutorial incident turns urgent warnS later", function () {
    var s = setup([{ at: 1, kind: "road", tile: [2, 2], tutorial: true }, ROAD2]);
    runTo(s.round, 3);
    s.round.send("inc-0");
    s.round.update(100);
    s.round.send("inc-1"); // redirect: the tutorial incident is left unrepaired
    runTo(s.round, 27.9);
    assertTrue(!s.round.incident("inc-0").urgent, "not before 28 s");
    runTo(s.round, 28.2);
    assertTrue(s.round.incident("inc-0").urgent, "urgent from the send time");
  });
});

describe("round with crews (feature 006)", function () {
  // Ring road; clinic inside; a streetlight beside row 2's road.
  function testMap() {
    return MCW.parseMap({
      terrain: ["rrrrr", "r...r", "rrrrr", ".....", "....."].join("\n"),
      objects: [
        { type: "clinic_a", at: [1, 1], id: "clinic" },
        { type: "lightpole_a", at: [3, 3], id: "lamp" }
      ]
    }).map;
  }

  var CREWS = [
    { id: "road", job: "road", leader: "Minh", portrait: "char_a", depot: [0, 0] },
    { id: "builders", job: "builders", leader: "Hoa", portrait: "char_b", depot: [4, 0] },
    { id: "electric", job: "electric", leader: "Linh", portrait: "char_c", depot: [0, 2] }
  ];
  var A = { at: 1, kind: "road", tile: [2, 2] };
  var B = { at: 1, kind: "road", tile: [4, 1] };
  var LAMP = { at: 1, kind: "streetlight", object: "lamp" };

  function setup(schedule, crews) {
    var map = testMap();
    var level = {
      id: "t", name: "Test", map: "test", crews: crews || CREWS, target: 3,
      phases: [
        { name: "Drizzle", durationS: 10, maxActive: 3, rain: 0.4 },
        { name: "Downpour", durationS: 10, maxActive: 3, rain: 0.7 },
        { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
      ],
      schedule: schedule,
      drainPerUrgentPerS: 1, refill: { normal: 5, early: 8 }, earlyBonus: 50, rightCrewBonus: 40, stars: [100, 200]
    };
    var round = new MCW.Round({ map: map, level: level });
    var events = [];
    ["assigned", "arrive", "repaired"].forEach(function (e) {
      round.on(e, function (p) { events.push({ type: e, p: p, t: round.elapsed }); });
    });
    while (round.elapsed < 1.05) round.update(100);
    return { map: map, round: round, events: events };
  }

  function step(round, seconds) {
    var end = round.elapsed + seconds;
    while (round.elapsed < end - 1e-9 && !round.over) round.update(100);
  }

  function first(events, type) {
    return events.filter(function (e) { return e.type === type; })[0];
  }

  it("builds one crew per level entry, in order", function () {
    var r = setup([A]).round;
    assertEqual(r.crews.map(function (c) { return c.id; }), ["road", "builders", "electric"]);
    assertEqual(r.crewById("builders").jobId, "builders");
    assertEqual(r.crewById("road").speed, MCW.jobs.road.speed);
  });

  it("moves several crews at once", function () {
    var r = setup([A, LAMP]).round;
    assertTrue(r.send("inc-0", "road"), "road crew sent");
    assertTrue(r.send("inc-1", "electric"), "electricians sent");
    var x1 = r.crewById("road").x + r.crewById("road").y, x2 = r.crewById("electric").x + r.crewById("electric").y;
    r.update(100);
    assertTrue(r.crewById("road").x + r.crewById("road").y !== x1, "road crew moved");
    assertTrue(r.crewById("electric").x + r.crewById("electric").y !== x2, "electricians moved");
  });

  it("refuses a crew that can't fix the damage", function () {
    var r = setup([A]).round;
    assertEqual(r.send("inc-0", "electric"), false);
    assertEqual(r.incident("inc-0").state, "new");
  });

  it("refuses a crew that is repairing", function () {
    var r = setup([A, B]).round;
    r.send("inc-0", "road");
    step(r, 1.5);
    assertEqual(r.crewById("road").state, "repairing");
    assertEqual(r.send("inc-1", "road"), false);
  });

  it("sending a second crew releases the first", function () {
    var r = setup([A]).round;
    r.send("inc-0", "road");
    assertTrue(r.send("inc-0", "builders"), "builders take over");
    assertEqual(r.crewById("road").state, "returning");
    assertEqual(r.incident("inc-0").crewId, "builders");
    assertEqual(r.incident("inc-0").match, "help");
  });

  it("a redirect puts the old incident back to new", function () {
    var r = setup([A, B]).round;
    r.send("inc-0", "road");
    r.send("inc-1", "road");
    assertEqual(r.incident("inc-0").state, "new");
    assertEqual(r.incident("inc-0").crewId, null);
    assertEqual(r.incident("inc-1").crewId, "road");
  });

  it("a Can-help repair takes twice as long and gets no bonus", function () {
    var s = setup([A]);
    s.round.send("inc-0", "builders");
    step(s.round, 12);
    var arrive = first(s.events, "arrive"), rep = first(s.events, "repaired");
    assertClose(rep.t - arrive.t, 8, 0.11);
    assertEqual([rep.p.match, rep.p.rightCrew, rep.p.crewId], ["help", false, "builders"]);
    assertEqual(rep.p.points, 100 + 50);
  });

  it("a Best repair adds the right-crew bonus", function () {
    var s = setup([A]);
    s.round.send("inc-0", "road");
    step(s.round, 6);
    var rep = first(s.events, "repaired");
    assertEqual([rep.p.match, rep.p.rightCrew], ["best", true]);
    assertEqual(rep.p.points, 100 + 40 + 50);
  });

  it("applies a job's repair advantage", function () {
    var s = setup([LAMP]);
    s.round.send("inc-0", "electric");
    step(s.round, 5);
    var arrive = first(s.events, "arrive"), rep = first(s.events, "repaired");
    assertClose(rep.t - arrive.t, 3 * 0.6, 0.11);
  });

  it("dispatchOptions lists every crew with badge, time and reason", function () {
    var r = setup([A]).round;
    var o = r.dispatchOptions("inc-0");
    assertEqual(o.map(function (x) { return x.crewId + ":" + x.match + ":" + x.sendable; }),
      ["road:best:true", "builders:help:true", "electric:none:false"]);
    assertClose(o[0].etaS, 3 / MCW.jobs.road.speed, 1e-9);
    assertEqual([o[0].repairS, o[1].repairS, o[2].repairS], [4, 8, null]);
    assertEqual([o[2].reason, o[2].etaS], ["Can't fix", null]);
    assertEqual(o[0].status, "ready");
    r.send("inc-0", "road");
    o = r.dispatchOptions("inc-0");
    assertEqual([o[0].sendable, o[0].reason, o[0].status], [false, "Already on the way", "driving"]);
    step(r, 1.5);
    o = r.dispatchOptions("inc-0");
    assertEqual([o[0].sendable, o[0].reason], [false, "Busy repairing"]);
    assertTrue(o[0].freeInS > 0, "free in");
    assertTrue(r.secondsUntilFree("road") > 0, "secondsUntilFree");
    assertEqual(r.secondsUntilFree("builders"), null);
  });

  it("bestCrewFor prefers a free Best crew, then a driving one, then a free helper", function () {
    var r = setup([A, B]).round;
    assertEqual(r.bestCrewFor("inc-0"), "road");
    r.send("inc-1", "road");
    assertEqual(r.bestCrewFor("inc-0"), "road", "a driving Best crew can still be redirected");
    step(r, 1.5);
    assertEqual(r.crewById("road").state, "repairing");
    assertEqual(r.bestCrewFor("inc-0"), "builders");
  });

  it("bestCrewFor picks the nearer of two Best crews, and null when nobody can fix it", function () {
    var crews = [
      { id: "far", job: "road", leader: "", portrait: "char_a", depot: [0, 0] },
      { id: "near", job: "road", leader: "", portrait: "char_b", depot: [4, 2] }
    ];
    var r = setup([B, LAMP], crews).round;
    assertEqual(r.bestCrewFor("inc-0"), "near");
    assertEqual(r.bestCrewFor("inc-1"), null);
  });

  it("send without a crew uses the best crew", function () {
    var r = setup([LAMP]).round;
    assertTrue(r.send("inc-0"), "sent");
    assertEqual(r.incident("inc-0").crewId, "electric");
  });
});

describe("round difficulty and busy crews (feature 006)", function () {
  function setup(schedule, extra) {
    var map = MCW.parseMap({ terrain: ["rrrrr", "r...r", "rrrrr", ".....", "....."].join("\n") }).map;
    var level = {
      id: "t", name: "Test", map: "test", target: 3,
      crews: [
        { id: "road", job: "road", leader: "", portrait: "char_a", depot: [0, 0] },
        { id: "builders", job: "builders", leader: "", portrait: "char_b", depot: [4, 0] }
      ],
      phases: [
        { name: "Drizzle", durationS: 20, maxActive: 3, rain: 0.4 },
        { name: "Downpour", durationS: 20, maxActive: 3, rain: 0.7 },
        { name: "Peak storm", durationS: 20, maxActive: 3, rain: 1 }
      ],
      schedule: schedule,
      drainPerUrgentPerS: 1, refill: { normal: 5, early: 8 }, earlyBonus: 50, rightCrewBonus: 40, stars: [100, 200]
    };
    Object.keys(extra || {}).forEach(function (k) { level[k] = extra[k]; });
    return new MCW.Round({ map: map, level: level });
  }

  function runTo(round, seconds) {
    while (round.elapsed < seconds - 1e-9 && !round.over) round.update(100);
  }

  it("warnScale shortens the time before an incident turns urgent", function () {
    var r = setup([{ at: 1, kind: "road", tile: [2, 2] }], { warnScale: 0.5 });
    runTo(r, 13.4);
    assertTrue(!r.incident("inc-0").urgent, "not before 13.5 s");
    runTo(r, 13.6);
    assertTrue(r.incident("inc-0").urgent, "urgent at release + 12.5 s");
  });

  it("when the Best crew is busy, the panel says when it is free and a helper is pre-picked", function () {
    var r = setup([{ at: 1, kind: "road", tile: [2, 2] }, { at: 1, kind: "road", tile: [4, 1] }]);
    runTo(r, 1.1);
    r.send("inc-0", "road");
    runTo(r, 2.5);
    assertEqual(r.crewById("road").state, "repairing");
    var o = r.dispatchOptions("inc-1")[0];
    assertEqual([o.crewId, o.sendable, o.reason], ["road", false, "Busy repairing"]);
    assertTrue(o.freeInS > 0, "free in");
    assertEqual(r.bestCrewFor("inc-1"), "builders");
  });
});

describe("job advantages in play (feature 006)", function () {
  // A straight 7-tile road; a clinic beside its far end.
  function setup(crews, schedule) {
    var map = MCW.parseMap({
      terrain: ["rrrrrrr", "......."].join("\n"),
      objects: [{ type: "clinic_a", at: [6, 1], id: "clinic" }]
    }).map;
    var round = new MCW.Round({
      map: map,
      level: {
        id: "t", name: "Test", map: "test", crews: crews, target: 1,
        phases: [
          { name: "Drizzle", durationS: 20, maxActive: 3, rain: 0.4 },
          { name: "Downpour", durationS: 20, maxActive: 3, rain: 0.7 },
          { name: "Peak storm", durationS: 20, maxActive: 3, rain: 1 }
        ],
        schedule: schedule,
        drainPerUrgentPerS: 1, refill: { normal: 5, early: 8 }, earlyBonus: 50, rightCrewBonus: 40, stars: [100, 200]
      }
    });
    var arrivals = {}, repaired = [];
    round.on("arrive", function (p) { arrivals[p.crewId] = round.elapsed; });
    round.on("repaired", function (p) { repaired.push(p); });
    while (round.elapsed < 1.05) round.update(100);
    return { round: round, arrivals: arrivals, repaired: repaired };
  }

  function run(round, seconds) {
    var end = round.elapsed + seconds;
    while (round.elapsed < end - 1e-9 && !round.over) round.update(100);
  }

  it("the Road Crew's fast vehicle beats the Builders over the same distance", function () {
    var crews = [
      { id: "road", job: "road", leader: "", portrait: "char_a", depot: [0, 0] },
      { id: "builders", job: "builders", leader: "", portrait: "char_b", depot: [6, 0] }
    ];
    // Both drive 5 tiles: road (0,0) -> beside (6,0); builders (6,0) -> beside (0,0).
    var s = setup(crews, [{ at: 1, kind: "road", tile: [6, 0] }, { at: 1, kind: "road", tile: [0, 0] }]);
    s.round.send("inc-0", "road");
    s.round.send("inc-1", "builders");
    run(s.round, 4);
    // 5 / 4.0 = 1.25 s vs 5 / 2.5 = 2.0 s
    assertTrue(s.arrivals.builders - s.arrivals.road >= 0.6, "road crew arrives clearly earlier");
  });

  it("the Builders score +50% on roofs", function () {
    var crews = [{ id: "builders", job: "builders", leader: "", portrait: "char_b", depot: [0, 0] }];
    var s = setup(crews, [{ at: 1, kind: "building", object: "clinic" }]);
    s.round.send("inc-0", "builders");
    run(s.round, 12);
    assertEqual(s.repaired[0].points, Math.round(150 * 1.5) + 40 + 50);
  });
});

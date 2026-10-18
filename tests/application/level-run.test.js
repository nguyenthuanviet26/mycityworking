describe("level-run", function () {
  function setup(extra) {
    var map = MCW.parseMap({
      terrain: ["rrrrr", "r...r", "rrrrr", ".....", "....."].join("\n"),
      objects: [{ type: "clinic_a", at: [1, 1], id: "clinic" }]
    }).map;
    var level = {
      id: "t", name: "Test", map: "test", depot: [0, 0], crew: { speed: 10 }, target: 1,
      phases: [
        { name: "Drizzle", durationS: 10, maxActive: 3, rain: 0.4 },
        { name: "Downpour", durationS: 10, maxActive: 3, rain: 0.7 },
        { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
      ],
      schedule: [
        { at: 1, kind: "road", tile: [2, 2], tutorial: true },
        { at: 2, kind: "building", object: "clinic" }
      ],
      drainPerUrgentPerS: 2, refill: { normal: 5, early: 8 }, earlyBonus: 50, stars: [100, 200]
    };
    Object.keys(extra || {}).forEach(function (k) { level[k] = extra[k]; });
    var screens = new MCW.ScreenMachine();
    var run = new MCW.LevelRun({ screens: screens, map: map, level: level });
    var events = [];
    ["start", "select", "hint", "end"].forEach(function (e) {
      run.on(e, function (p) { events.push({ type: e, p: p }); });
    });
    screens.loaded();
    return { map: map, screens: screens, run: run, events: events };
  }

  function runFor(s, seconds) {
    for (var ms = 0; ms < seconds * 1000; ms += 100) s.run.update(100);
  }

  // ---- US1 ----------------------------------------------------------------

  it("has no round on the menu and starts one on Play", function () {
    var s = setup();
    assertEqual(s.run.round, null);
    s.screens.play();
    assertTrue(s.run.round instanceof MCW.Round, "a round");
    assertEqual(s.events.filter(function (e) { return e.type === "start"; }).length, 1);
  });

  it("only advances while playing", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 1);
    var t = s.run.round.elapsed;
    s.screens.pause();
    runFor(s, 2);
    assertEqual(s.run.round.elapsed, t);
    s.screens.resume();
    runFor(s, 1);
    assertTrue(s.run.round.elapsed > t, "advances again");
  });

  it("selects an incident and sends the crew to it", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 1.1);
    s.run.select("inc-0");
    assertEqual(s.run.selected, "inc-0");
    assertTrue(s.events.some(function (e) { return e.type === "select" && e.p === "inc-0"; }), "select event");
    assertTrue(s.run.sendCrew(), "sent");
    assertEqual(s.run.round.incident("inc-0").state, "assigned");
  });

  it("clears the selection when the selected incident is repaired", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 1.1);
    s.run.select("inc-0");
    s.run.sendCrew();
    runFor(s, 6);
    assertEqual(s.run.selected, null);
  });

  it("selectNext picks urgent incidents first, then the oldest", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 2.1);
    s.run.selectNext();
    assertEqual(s.run.selected, "inc-0");
    s.run.selectNext();
    assertEqual(s.run.selected, "inc-1");
    s.run.round.incident("inc-1").urgent = true;
    s.run.select(null);
    s.run.selectNext();
    assertEqual(s.run.selected, "inc-1");
  });

  it("going to the menu drops the round and leaves no damage", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 2.1);
    s.screens.pause();
    s.screens.toMenu();
    assertEqual(s.run.round, null);
    assertEqual(s.map.getTile(2, 2).variant, "normal");
    assertEqual(s.map.getObject("clinic").variant, "normal");
  });

  // ---- US2 ----------------------------------------------------------------

  it("shows the result screen when the round ends", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 31);
    assertEqual(s.screens.state, "result");
    assertTrue(s.run.round.result !== null, "keeps the result");
    assertEqual(s.events.filter(function (e) { return e.type === "end"; }).length, 1);
  });

  it("Retry starts an identical fresh round", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 31);
    var first = s.run.round;
    s.screens.retry();
    var r = s.run.round;
    assertTrue(r !== first, "a new round");
    assertEqual(r.elapsed, 0);
    assertEqual(r.condition, 100);
    assertEqual(r.score, 0);
    assertEqual(s.map.getTile(2, 2).variant, "normal");
    runFor(s, 1);
    assertEqual(r.activeIncidents()[0].target, { tile: { col: 2, row: 2 } });
  });

  it("resuming from pause keeps the same round", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 1);
    var r = s.run.round;
    s.screens.pause();
    s.screens.resume();
    assertTrue(s.run.round === r, "same round");
  });

  it("gives the rain intensity for the phase", function () {
    var s = setup();
    assertEqual(s.run.rainIntensity(), null);
    s.screens.play();
    assertEqual(s.run.rainIntensity(), 0.4);
    runFor(s, 10.1);
    assertEqual(s.run.rainIntensity(), 0.7);
    runFor(s, 21);
    assertEqual(s.run.rainIntensity(), 0);
  });

  // ---- US3 ----------------------------------------------------------------

  it("drives the hints from round and selection events", function () {
    var s = setup();
    s.screens.play();
    assertEqual(s.run.hints.current, null);
    runFor(s, 1.1);
    assertEqual(s.run.hints.current.id, "incident");
    s.run.select("inc-0");
    assertEqual(s.run.hints.current.id, "send");
    s.run.sendCrew();
    assertEqual(s.run.hints.current.id, "drive");
    runFor(s, 0.5);
    assertEqual(s.run.hints.current.id, "repair");
    runFor(s, 4.5);
    assertEqual(s.run.hints.current.id, "goal");
    assertTrue(s.events.some(function (e) { return e.type === "hint"; }), "hint events");
  });

  it("skipped hints stay skipped after Retry and come back after the menu", function () {
    var s = setup();
    s.screens.play();
    runFor(s, 1.1);
    s.run.skipHints();
    assertEqual(s.run.hints.current, null);
    runFor(s, 30);
    s.screens.retry();
    runFor(s, 1.1);
    assertEqual(s.run.hints.current, null);
    s.screens.pause();
    s.screens.toMenu();
    s.screens.play();
    runFor(s, 1.1);
    assertEqual(s.run.hints.current.id, "incident");
  });
});

describe("level-run with crews (feature 006)", function () {
  function setup() {
    var map = MCW.parseMap({
      terrain: ["rrrrr", "r...r", "rrrrr", ".....", "....."].join("\n"),
      objects: [{ type: "lightpole_a", at: [3, 3], id: "lamp" }]
    }).map;
    var level = {
      id: "t", name: "Test", map: "test", target: 2,
      crews: [
        { id: "road", job: "road", leader: "Minh", portrait: "char_a", depot: [0, 0] },
        { id: "builders", job: "builders", leader: "Hoa", portrait: "char_b", depot: [4, 0] },
        { id: "electric", job: "electric", leader: "Linh", portrait: "char_c", depot: [0, 2] }
      ],
      phases: [
        { name: "Drizzle", durationS: 10, maxActive: 3, rain: 0.4 },
        { name: "Downpour", durationS: 10, maxActive: 3, rain: 0.7 },
        { name: "Peak storm", durationS: 10, maxActive: 3, rain: 1 }
      ],
      schedule: [
        { at: 1, kind: "road", tile: [2, 2] },
        { at: 1, kind: "streetlight", object: "lamp" }
      ],
      drainPerUrgentPerS: 1, refill: { normal: 5, early: 8 }, earlyBonus: 50, rightCrewBonus: 40, stars: [100, 200]
    };
    var screens = new MCW.ScreenMachine();
    var run = new MCW.LevelRun({ screens: screens, map: map, level: level });
    var events = [];
    ["pick", "arm", "refused"].forEach(function (e) { run.on(e, function (p) { events.push({ type: e, p: p }); }); });
    screens.loaded();
    screens.play();
    for (var i = 0; i < 11; i++) run.update(100);
    return { run: run, screens: screens, events: events };
  }

  function of(events, type) {
    return events.filter(function (e) { return e.type === type; });
  }

  it("selecting an incident pre-picks the best crew and fills the options", function () {
    var s = setup();
    s.run.select("inc-0");
    assertEqual(s.run.pickedCrew, "road");
    assertEqual(s.run.options.length, 3);
    s.run.select("inc-1");
    assertEqual(s.run.pickedCrew, "electric");
  });

  it("pickIndex picks a crew and sendCrew sends it", function () {
    var s = setup();
    s.run.select("inc-0");
    s.run.pickIndex(2);
    assertEqual(s.run.pickedCrew, "builders");
    assertTrue(s.run.sendCrew(), "sent");
    assertEqual(s.run.round.incident("inc-0").crewId, "builders");
  });

  it("arming toggles and can be done by position", function () {
    var s = setup();
    assertTrue(s.run.arm("electric"), "armed");
    assertEqual(s.run.armedCrew, "electric");
    assertEqual(of(s.events, "arm").length, 1);
    s.run.arm("electric");
    assertEqual(s.run.armedCrew, null);
    s.run.armIndex(1);
    assertEqual(s.run.armedCrew, "road");
  });

  it("an armed crew is sent by clicking an incident it can fix", function () {
    var s = setup();
    s.run.arm("electric");
    s.run.clickIncident("inc-1");
    assertEqual(s.run.round.incident("inc-1").crewId, "electric");
    assertEqual(s.run.armedCrew, null);
  });

  it("clicking an incident the armed crew can't fix is refused", function () {
    var s = setup();
    s.run.arm("electric");
    s.run.clickIncident("inc-0");
    var r = of(s.events, "refused");
    assertEqual(r.length, 1);
    assertTrue(/can't fix/.test(r[0].p.message), r[0].p.message);
    assertEqual(s.run.armedCrew, "electric");
    assertEqual(s.run.round.incident("inc-0").crewId, null);
  });

  it("with nothing armed, clicking an incident selects it", function () {
    var s = setup();
    s.run.clickIncident("inc-0");
    assertEqual(s.run.selected, "inc-0");
  });

  it("clicking empty map disarms", function () {
    var s = setup();
    s.run.arm("road");
    s.run.select(null);
    assertEqual(s.run.armedCrew, null);
  });

  it("a repairing crew can't be armed, and an armed crew is disarmed when it starts repairing", function () {
    var s = setup();
    s.run.arm("road");
    s.run.clickIncident("inc-0");
    s.run.arm("road"); // armed again while driving
    for (var i = 0; i < 15; i++) s.run.update(100);
    assertEqual(s.run.round.crewById("road").state, "repairing");
    assertEqual(s.run.armedCrew, null);
    assertEqual(s.run.arm("road"), false);
  });

  it("refreshes the options every 250 ms while an incident is selected", function () {
    var s = setup();
    s.run.select("inc-0");
    var before = s.run.options;
    s.run.update(100);
    assertTrue(s.run.options === before, "not yet");
    s.run.update(100);
    s.run.update(100);
    assertTrue(s.run.options !== before, "refreshed");
  });
});


describe("preparation lifecycle", function () {
  function setup() {
    var map=MCW.parseMap({terrain:"rrrrr\nr...r\nrrrrr\n.....\n.....",objects:[{type:"clinic_a",at:[1,1],id:"clinic"}]}).map;
    var level={id:"t",name:"Test",depot:[0,0],crew:{speed:3},target:1,
      phases:[{name:"A",durationS:10,maxActive:3,rain:.4},{name:"B",durationS:10,maxActive:3,rain:.7},{name:"C",durationS:10,maxActive:3,rain:1}],
      schedule:[{at:1,kind:"road",tile:[2,2],tutorial:true},{at:2,kind:"building",object:"clinic"}],drainPerUrgentPerS:2,refill:{normal:5,early:8},earlyBonus:50,stars:[100,200]};
    var screens=new MCW.ScreenMachine({hasLevel:true}),run=new MCW.LevelRun({screens:screens,map:map,level:level});
    screens.loaded();screens.play(); return {screens:screens,run:run,map:map,level:level};
  }
  function start(s){s.screens.nextBriefing();s.screens.startRound();}
  it("has no Round or hints during preparation and navigation",function(){var s=setup();var b=s.run.briefing;assertTrue(b);assertEqual(s.run.round,null);assertEqual(s.run.hints,null);for(var i=0;i<600;i++)s.run.update(100);s.screens.nextBriefing();s.screens.back();assertTrue(s.run.briefing===b);assertEqual(s.map.getTile(2,2).variant,"normal");assertEqual(s.run.round,null);start(s);assertEqual(s.run.round.elapsed,0);var r=s.run.round;s.screens.pause();s.screens.resume();assertTrue(s.run.round===r);});
  it("retries clean visuals and create a new briefing before a new Round",function(){var s=setup();start(s);s.run.update(2100);var old=s.run.round,brief=s.run.briefing;s.run.select("inc-0");s.screens.pause();s.screens.retry();assertEqual(s.run.round,null);assertEqual(s.run.selected,null);assertEqual(s.map.getTile(2,2).variant,"normal");assertEqual(s.map.getObject("clinic").variant,"normal");assertTrue(s.run.briefing!==brief);start(s);assertTrue(s.run.round!==old);assertEqual(s.run.round.elapsed,0);assertEqual(s.run.round.score,0);assertEqual(s.run.round.condition,100);s.run.round._end("cleared");s.screens.retry();assertEqual(s.screens.state,"briefing-crews");assertEqual(s.run.round,null);s.screens.toMenu();assertEqual(s.run.briefing,null);});
  it("reference is guarded, preserves decisions, and never stops time",function(){var s=setup();assertEqual(s.run.openReference("crews"),false);start(s);assertEqual(s.run.openReference("invalid"),false);s.run.update(2100);s.run.select("inc-0");s.run.sendCrew();var round=s.run.round,crewId=round.incident("inc-0").crewId;var events=[];s.run.on("reference",function(v){events.push(v);});assertTrue(s.run.openReference("crews"));assertTrue(s.run.openReference("crews"));assertEqual(events,["crews"]);s.run.openReference("problems");assertEqual(s.screens.state,"playing");assertEqual(s.run.selected,"inc-0");assertEqual(round.incident("inc-0").crewId,crewId);var before=round.elapsed;s.run.update(1000);assertEqual(round.elapsed,before+1);assertTrue(s.run.round===round);s.run.closeReference();s.run.closeReference();assertEqual(events,["crews","problems",null]);});
  it("reference open and closed produce identical ten-second simulation",function(){var a=setup(),b=setup();start(a);start(b);a.run.openReference("problems");for(var i=0;i<100;i++){a.run.update(100);b.run.update(100);}assertEqual(a.run.round.elapsed,b.run.round.elapsed);assertEqual(a.run.round.condition,b.run.round.condition);assertEqual(a.run.round.incidents.map(function(x){return [x.id,x.urgent,x.progress];}),b.run.round.incidents.map(function(x){return [x.id,x.urgent,x.progress];}));assertEqual(a.run.round.crews.map(function(c){return [c.x,c.y,c.state];}),b.run.round.crews.map(function(c){return [c.x,c.y,c.state];}));});
  it("closes reference on pause, retry, result, and menu without resuming",function(){var s=setup();start(s);s.run.openReference("crews");var round=s.run.round;s.screens.pause();assertEqual(s.run.referenceSection,null);s.run.update(1000);assertEqual(round.elapsed,0);assertEqual(s.run.openReference("crews"),false);s.screens.resume();assertTrue(s.run.round===round);s.run.openReference("problems");round._end("cleared");assertEqual(s.run.referenceSection,null);assertEqual(s.screens.state,"result");assertEqual(s.run.openReference("crews"),false);s.screens.retry();assertEqual(s.run.round,null);start(s);s.run.openReference("crews");s.screens.pause();s.screens.toMenu();assertEqual(s.run.referenceSection,null);assertEqual(s.run.briefing,null);});

});

describe("hints", function () {
  function setup() {
    var h = new MCW.Hints(MCW.Hints.TRIAL_STEPS);
    var changes = 0;
    h.on("change", function () { changes++; });
    return { h: h, changes: function () { return changes; } };
  }

  function id(h) { return h.current ? h.current.id : null; }

  it("has five steps with text and an anchor", function () {
    assertEqual(MCW.Hints.TRIAL_STEPS.map(function (s) { return s.id; }), ["incident", "send", "drive", "repair", "goal"]);
    MCW.Hints.TRIAL_STEPS.forEach(function (s) {
      assertTrue(typeof s.text === "string" && s.text.length > 0, "text");
      assertTrue(typeof s.anchor === "string", "anchor");
    });
  });

  it("shows nothing until the tutorial incident appears", function () {
    var s = setup();
    assertEqual(s.h.current, null);
    s.h.notify("crewSent");
    assertEqual(s.h.current, null);
    s.h.notify("tutorialReleased");
    assertEqual(id(s.h), "incident");
  });

  it("walks through the steps one at a time", function () {
    var s = setup();
    s.h.notify("tutorialReleased");
    s.h.notify("incidentSelected");
    assertEqual(id(s.h), "send");
    s.h.notify("crewSent");
    assertEqual(id(s.h), "drive");
    s.h.notify("crewArrived");
    assertEqual(id(s.h), "repair");
    s.h.notify("repairDone");
    assertEqual(id(s.h), "goal");
    s.h.update(4900);
    assertEqual(id(s.h), "goal");
    s.h.update(200);
    assertEqual(s.h.current, null);
    assertEqual(s.changes(), 6);
  });

  it("ignores events that don't clear the current step", function () {
    var s = setup();
    s.h.notify("tutorialReleased");
    s.h.notify("repairDone");
    assertEqual(id(s.h), "goal", "a later clear skips the steps in between");
    var t = setup();
    t.h.notify("tutorialReleased");
    t.h.notify("tutorialReleased");
    assertEqual(id(t.h), "incident");
  });

  it("skips step 1 when the crew is sent first", function () {
    var s = setup();
    s.h.notify("tutorialReleased");
    s.h.notify("crewSent");
    assertEqual(id(s.h), "drive");
  });

  it("skip hides the hint and ignores everything after", function () {
    var s = setup();
    s.h.notify("tutorialReleased");
    s.h.skip();
    assertEqual(s.h.current, null);
    assertTrue(s.h.skipped, "skipped");
    s.h.notify("incidentSelected");
    assertEqual(s.h.current, null);
  });
});

describe("hints (feature 006)", function () {
  it("step 2 teaches picking the Best crew", function () {
    assertTrue(/Best/.test(MCW.Hints.TRIAL_STEPS[1].text), MCW.Hints.TRIAL_STEPS[1].text);
  });

  it("fill replaces {target} without changing the originals", function () {
    var steps = MCW.Hints.fill(MCW.Hints.TRIAL_STEPS, { target: 10 });
    assertTrue(steps[4].text.indexOf("10") >= 0, steps[4].text);
    assertTrue(MCW.Hints.TRIAL_STEPS[4].text.indexOf("{target}") >= 0, "originals untouched");
  });
});

describe("screens", function () {
  function machine() {
    return new MCW.ScreenMachine();
  }

  function inMenu() {
    var m = machine();
    m.loaded();
    return m;
  }

  function inPlay() {
    var m = inMenu();
    m.play();
    return m;
  }

  it("starts loading, then shows the menu with Play focused", function () {
    var m = machine();
    assertEqual(m.state, "loading");
    assertTrue(m.loaded());
    assertEqual(m.state, "menu");
    assertEqual(m.focusOnShow, "btn-play");
  });

  it("How to Play from the menu returns to the menu", function () {
    var m = inMenu();
    m.openHowto();
    assertEqual([m.state, m.returnTo, m.focusOnShow], ["howto", "menu", "btn-howto-back"]);
    m.back();
    assertEqual([m.state, m.focusOnShow], ["menu", "btn-howto"]);
  });

  it("How to Play from pause returns to pause", function () {
    var m = inPlay();
    m.pause();
    m.openHowto();
    assertEqual([m.state, m.returnTo], ["howto", "paused"]);
    m.back();
    assertEqual([m.state, m.focusOnShow], ["paused", "btn-pause-howto"]);
  });

  it("Credits and back", function () {
    var m = inMenu();
    m.openCredits();
    assertEqual([m.state, m.focusOnShow], ["credits", "btn-credits-back"]);
    m.back();
    assertEqual([m.state, m.focusOnShow], ["menu", "btn-credits"]);
  });

  it("pause, resume, back and to menu", function () {
    var m = inPlay();
    assertTrue(m.pause());
    assertEqual([m.state, m.focusOnShow], ["paused", "btn-resume"]);
    assertTrue(m.resume());
    assertEqual(m.state, "playing");
    m.pause();
    assertTrue(m.back());
    assertEqual(m.state, "playing");
    m.pause();
    assertTrue(m.toMenu());
    assertEqual([m.state, m.focusOnShow], ["menu", "btn-play"]);
  });

  it("invalid actions are ignored", function () {
    var m = inPlay();
    assertEqual(m.play(), false);
    assertEqual(m.state, "playing");
    var n = inMenu();
    assertEqual(n.pause(), false);
    assertEqual(n.resume(), false);
    assertEqual(n.state, "menu");
    assertEqual(machine().play(), false);
  });

  it("escape mapping", function () {
    var m = inMenu();
    assertEqual(m.escape(), false);
    assertEqual(m.state, "menu");
    m.openCredits();
    m.escape();
    assertEqual(m.state, "menu");
    m.play();
    m.escape();
    assertEqual(m.state, "paused");
    m.escape();
    assertEqual(m.state, "playing");
    m.escape();
    m.openHowto();
    m.escape();
    assertEqual(m.state, "paused");
  });

  it("busy blocks every action", function () {
    var m = inMenu();
    m.busy = true;
    assertEqual(m.play(), false);
    assertEqual(m.openHowto(), false);
    assertEqual(m.escape(), false);
    assertEqual(m.state, "menu");
  });

  it("emits change events", function () {
    var m = machine();
    var seen = [];
    m.on("change", function (e) { seen.push(e); });
    m.loaded();
    m.play();
    assertEqual(seen, [
      { from: "loading", to: "menu", action: "loaded" },
      { from: "menu", to: "playing", action: "play" }
    ]);
  });

  it("input is enabled only while playing", function () {
    var m = inMenu();
    assertEqual(m.inputEnabled(), false);
    m.play();
    assertEqual(m.inputEnabled(), true);
    m.pause();
    assertEqual(m.inputEnabled(), false);
  });

  // ---- feature 005: result screen ----------------------------------------

  it("finish goes from playing to result and focuses Retry", function () {
    var m = inPlay();
    assertTrue(m.finish(), "finish");
    assertEqual(m.state, "result");
    assertEqual(m.focusOnShow, "btn-retry");
    assertEqual(m.inputEnabled(), false);
  });

  it("finish is refused outside playing", function () {
    var m = inMenu();
    assertEqual(m.finish(), false);
    m.play();
    m.pause();
    assertEqual(m.finish(), false);
    assertEqual(m.state, "paused");
  });

  it("retry and toMenu leave the result screen", function () {
    var m = inPlay();
    m.finish();
    assertTrue(m.retry(), "retry");
    assertEqual(m.state, "playing");
    m.finish();
    assertTrue(m.toMenu(), "toMenu");
    assertEqual(m.state, "menu");
    assertEqual(m.focusOnShow, "btn-play");
  });

  it("Esc does nothing on the result screen", function () {
    var m = inPlay();
    m.finish();
    assertEqual(m.escape(), false);
    assertEqual(m.state, "result");
  });
});

describe("game-session", function () {
  function setup(startView) {
    var screens = new MCW.ScreenMachine();
    var camera = new MCW.Camera({ viewW: 800, viewH: 600 });
    camera.setMapSize(32, 32);
    var sel = { hovered: null, selected: null }, sets = [];
    var selection = {
      get: function () { return { hovered: sel.hovered, selected: sel.selected }; },
      set: function (v) { sets.push(v); sel.hovered = v.hovered; sel.selected = v.selected; }
    };
    var session = new MCW.GameSession({
      screens: screens, camera: camera, cols: 32, rows: 32,
      startView: startView, selection: selection
    });
    return { screens: screens, camera: camera, session: session, sel: sel, sets: sets };
  }

  function centreOf(camera) {
    return camera.screenToMap(camera.viewW / 2, camera.viewH / 2);
  }

  it("applies the default start view", function () {
    var s = setup();
    assertEqual(s.camera.zoom, 1);
    var c = centreOf(s.camera);
    assertClose(c.x, 16, 1e-6);
    assertClose(c.y, 16, 1e-6);
  });

  it("applies a given start view", function () {
    var s = setup({ zoom: 0.5, center: { x: 10, y: 12 } });
    assertEqual(s.camera.zoom, 0.5);
    var c = centreOf(s.camera);
    assertClose(c.x, 10, 1e-6);
    assertClose(c.y, 12, 1e-6);
  });

  it("background is active only on the main menu and its panels", function () {
    var s = setup(), m = s.screens;
    assertEqual(s.session.backgroundActive(), false, "loading");
    m.loaded();
    assertEqual(s.session.backgroundActive(), true, "menu");
    m.openCredits();
    assertEqual(s.session.backgroundActive(), true, "credits");
    m.back();
    m.openHowto();
    assertEqual(s.session.backgroundActive(), true, "howto from menu");
    m.back();
    m.play();
    assertEqual(s.session.backgroundActive(), false, "playing");
    m.pause();
    assertEqual(s.session.backgroundActive(), false, "paused");
    m.openHowto();
    assertEqual(s.session.backgroundActive(), false, "howto from pause");
  });

  it("update drifts the camera only while the background is active", function () {
    var s = setup();
    s.screens.loaded();
    var before = s.camera.wx;
    assertEqual(s.session.update(1000), true);
    assertEqual(s.camera.zoom, MCW.attract.ZOOM);
    assertTrue(s.camera.wx !== before, "camera moved");
    s.screens.play();
    var wx = s.camera.wx;
    assertEqual(s.session.update(1000), false);
    assertEqual(s.camera.wx, wx);
  });

  it("Play applies the start view and fires playstart once", function () {
    var s = setup(), fired = 0;
    s.session.on("playstart", function () { fired++; });
    s.screens.loaded();
    s.session.update(5000);
    s.screens.play();
    assertEqual(fired, 1);
    assertEqual(s.camera.zoom, 1);
    var c = centreOf(s.camera);
    assertClose(c.x, 16, 1e-6);
    s.screens.pause();
    s.screens.resume();
    assertEqual(fired, 1, "not on resume");
  });

  it("pause saves and resume restores the view and selection exactly", function () {
    var s = setup();
    s.screens.loaded();
    s.screens.play();
    s.camera.panBy(123, 45);
    s.camera.zoomAt(1.3, 300, 200);
    s.sel.selected = { col: 7, row: 9 };
    var v = { wx: s.camera.wx, wy: s.camera.wy, zoom: s.camera.zoom };
    s.screens.pause();
    s.camera.panBy(-500, 300);
    s.camera.setZoom(0.5);
    s.sel.selected = null;
    s.screens.resume();
    assertEqual({ wx: s.camera.wx, wy: s.camera.wy, zoom: s.camera.zoom }, v);
    assertEqual(s.sets[s.sets.length - 1], { hovered: null, selected: { col: 7, row: 9 } });
  });

  it("Escape (back) from pause also restores", function () {
    var s = setup();
    s.screens.loaded();
    s.screens.play();
    s.camera.panBy(50, 20);
    var wx = s.camera.wx;
    s.screens.pause();
    s.camera.panBy(-300, 0);
    s.screens.escape();
    assertEqual(s.screens.state, "playing");
    assertEqual(s.camera.wx, wx);
  });

  it("returning to the menu discards the view, clears selection and restarts the drift", function () {
    var s = setup();
    s.screens.loaded();
    s.session.update(20000);
    s.screens.play();
    s.sel.selected = { col: 3, row: 3 };
    s.screens.pause();
    s.screens.toMenu();
    assertEqual(s.sets[s.sets.length - 1], { hovered: null, selected: null });
    s.session.update(0);
    var p = MCW.attract.positionAt(0, 32, 32);
    var w = MCW.iso.mapToWorld(p.x, p.y);
    var expected = s.camera._clamped(w.wx, w.wy);
    assertClose(s.camera.wx, expected.wx, 1e-6);
    assertClose(s.camera.wy, expected.wy, 1e-6);
    s.screens.play();
    s.screens.pause();
    s.screens.resume();
    assertEqual(s.camera.zoom, 1, "no stale saved view");
  });

  it("retry from the result screen applies the start view and emits playstart (feature 005)", function () {
    var s = setup({ zoom: 0.5, center: { x: 10, y: 12 } });
    var starts = 0;
    s.session.on("playstart", function () { starts++; });
    s.screens.loaded();
    s.screens.play();
    s.camera.setZoom(2);
    s.screens.finish();
    s.screens.retry();
    assertEqual(starts, 2);
    assertEqual(s.camera.zoom, 0.5);
    var c = centreOf(s.camera);
    assertClose(c.x, 10, 1e-6);
    assertClose(c.y, 12, 1e-6);
  });

  it("toMenu from the result screen clears the selection (feature 005)", function () {
    var s = setup();
    s.screens.loaded();
    s.screens.play();
    s.sel.selected = { col: 1, row: 1 };
    s.screens.finish();
    s.screens.toMenu();
    assertEqual(s.sets[s.sets.length - 1], { hovered: null, selected: null });
  });
});

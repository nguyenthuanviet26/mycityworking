// Composition root: reads URL settings, loads the map and its images, creates every part and
// wires them together, then runs the frame loop. No game rules or flow decisions live here.
// URL settings: ?map=id &menu=0 &zoom=0.5 &center=10,12 &dev=1
// With no ?map, Play prepares the trial level (features 005/008); other maps open in free look.
// Decorate mode (feature 004): ?edit=1 [&map=id | &work=id]
(function (MCW) {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var overlay = document.getElementById("overlay");
  var overlayText = document.getElementById("overlay-text");

  function fail(msg) {
    overlay.hidden = false;
    overlay.classList.add("error");
    overlayText.textContent = msg;
    console.error("[boot] " + msg);
  }

  // The URL view, else the level's start view, else the defaults.
  function startView(level) {
    var c = (params.get("center") || "").split(",").map(Number);
    var hasCentre = c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]);
    var lv = (level && level.startView) || {};
    var centre = hasCentre ? { x: c[0], y: c[1] } : lv.center ? { x: lv.center[0], y: lv.center[1] } : null;
    return { zoom: parseFloat(params.get("zoom")) || lv.zoom || 1, center: centre };
  }

  // The level played on this map, or null (none, or it fails its checks: free look instead).
  function levelFor(mapId, map) {
    var level = MCW.levels.forMap(mapId);
    if (!level) return null;
    var problems = MCW.checkLevel(level, map);
    problems.forEach(function (p) { console.warn("[level] " + p); });
    return problems.length ? null : level;
  }

  // Shows the loading overlay while the images load, then calls done().
  function loadImages(name, paths, done) {
    overlay.hidden = false;
    overlayText.textContent = "Loading " + name + "…";
    MCW.assets.load(paths, function (n, total) {
      document.getElementById("progress-bar").style.width = Math.round(n / total * 100) + "%";
    }).then(function () {
      overlay.hidden = true;
      done();
    });
  }

  function boot() {
    var mapId = params.get("map") || "trial";
    var def = MCW.maps.get(mapId);
    if (!def) return fail('Map failed to load: unknown map "' + mapId + '"');
    var map;
    try {
      map = MCW.parseMap(def).map;
    } catch (e) {
      return fail("Map failed to load: " + e.message);
    }
    var terrainArt = new MCW.TerrainArt(map);
    var level = levelFor(mapId, map);
    var paths = MCW.terrainArt.collectImagePaths(map, terrainArt);
    if (level) paths = paths.concat(MCW.jobArt.imagePathsFor(MCW.levelCrews(level)));
    loadImages(def.name || def.id, paths, function () {
      start(map, terrainArt, level);
    });
  }

  // The parts every mode shares: camera, renderer, input, developer overlay, redraw wiring.
  function createView(map, terrainArt) {
    var canvas = document.getElementById("game");
    var camera = new MCW.Camera({ viewW: window.innerWidth, viewH: window.innerHeight });
    camera.setMapSize(map.cols, map.rows);

    var game = (MCW.game = { map: map, camera: camera, terrainArt: terrainArt });
    game.renderer = new MCW.Renderer(canvas, map, camera, terrainArt);
    game.input = new MCW.Input(canvas, game);
    game.debug = new MCW.DebugOverlay(game, document.getElementById("devpanel"));

    function redraw() { game.renderer.requestRedraw(); }
    game.redraw = redraw;
    ["terrainchange", "tilechange", "objectchange", "collisionchange"].forEach(function (e) { map.on(e, redraw); });
    return game;
  }

  // updaters: functions (dtMs, now) returning true when something moved and needs a redraw.
  function runLoop(game, updaters, onResize) {
    window.addEventListener("resize", function () {
      game.renderer.resize();
      game.camera.setView(window.innerWidth, window.innerHeight);
      if (onResize) onResize();
      game.redraw();
    });
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(100, now - last);
      last = now;
      for (var i = 0; i < updaters.length; i++) if (updaters[i](dt, now)) game.redraw();
      if (game.renderer.dirty) game.renderer.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function start(map, terrainArt, level) {
    var game = createView(map, terrainArt);
    var camera = game.camera, redraw = game.redraw;
    game.rain = new MCW.RainLayer(game);
    game.screens = new MCW.ScreenMachine({ hasLevel: !!level });
    game.menuOpen = function () { return game.screens.state !== "playing"; };
    game.menu = new MCW.MenuUI(game, document.getElementById("menu-layer"));

    // Registered before the session so input is reset before the session saves the view.
    game.screens.on("change", function () {
      game.input.enabled = game.screens.inputEnabled();
      if (!game.input.enabled) game.input.reset();
      game.rain.enabled = game.session.backgroundActive();
      redraw();
    });
    game.session = new MCW.GameSession({
      screens: game.screens, camera: camera, cols: map.cols, rows: map.rows,
      startView: startView(level), selection: game.input.selectionPort()
    });

    var levelUpdaters = [];
    if (level) {
      game.run = new MCW.LevelRun({ screens: game.screens, map: map, level: level });
      var layer = new MCW.LevelLayer(game, game.run);
      game.hud = new MCW.HUD(game, game.run, document.getElementById("hud"), { imageSrc: imageSrc });
      game.run.on("reference", function (section) { game.input.setReferenceBlocked(!!section); });
      game.briefingUI = new MCW.RoundBriefingUI(game, game.run, { imageSrc: imageSrc });
      game.rain.levelRun = game.run;
      game.run.on("end", function (r) { game.menu.setResult(r); });
      new MCW.CrewGuide(document.getElementById("crew-guide"));
      levelUpdaters = [
        function (dt) { return game.run.update(dt); },
        function () { return layer.update(); },
        function (dt) { return game.hud.update(dt); }
      ];
    }

    var devPending = params.get("dev") === "1";
    game.session.on("playstart", function () {
      if (devPending) game.debug.setOn(true);
      devPending = false;
    });

    game.menu.instant = params.get("menu") === "0";
    game.screens.loaded();
    if (game.menu.instant) game.screens.play();
    game.menu.instant = false;

    runLoop(game, [
      function (dt) { return game.session.update(dt); }
    ].concat(levelUpdaters, [
      function (dt) { return game.rain.update(dt); },
      function (dt) { return game.input.update(dt); },
      function (dt) { return camera.update(dt); },
      function (dt, now) { return game.debug.tick(now); }
    ]), function () { game.rain.resize(window.innerWidth, window.innerHeight); });
  }

  // ---- decorate mode ------------------------------------------------------

  function registeredPort() {
    return {
      ids: function () { return MCW.maps.list(); },
      has: function (id) { return !!MCW.maps.get(id); },
      get: function (id) { return MCW.maps.get(id); }
    };
  }

  // Every picture decorate mode can show: all terrain pieces and every object (research R12).
  function editorImagePaths() {
    var paths = MCW.terrainArt.allImagePaths();
    Object.keys(MCW.objectArt.ART).forEach(function (type) {
      var a = MCW.objectArt.ART[type];
      paths.push(a.file);
      if (a.damagedFile) paths.push(a.damagedFile);
    });
    return paths;
  }

  // A loaded picture as a URL for <img> elements (adapters don't reach infrastructure themselves).
  function imageSrc(path) {
    var img = MCW.assets.get(path);
    return img.src || (img.toDataURL ? img.toDataURL() : "");
  }

  // Infrastructure handed to the editor UI.
  function editorIO() {
    return { store: MCW.workStore, files: MCW.fileIO, mapFile: MCW.mapFile, imageSrc: imageSrc };
  }

  function startEditor() {
    overlay.hidden = true;
    var ui = new MCW.EditorUI(document.body, editorIO());
    var registered = registeredPort();

    function chooser(error) {
      ui.showChooser({ registered: registered, error: error, onOpen: open });
    }

    function open(choice) {
      var map;
      try {
        map = MCW.parseMap(choice.definition).map;
      } catch (e) {
        return chooser("Could not open the map: " + e.message);
      }
      ui.hideChooser();
      var terrainArt = new MCW.TerrainArt(map);
      loadImages(choice.work.name, editorImagePaths(), function () { startEditing(ui, map, terrainArt, choice, registered); });
    }

    var mapId = params.get("map"), workId = params.get("work");
    if (workId) {
      var w = ui.choiceForWork(registered, workId);
      if (w.error) chooser(w.error);
      else open(w.choice);
    } else if (mapId && registered.has(mapId)) open(ui.choiceForCopy(registered, mapId));
    else chooser(mapId ? 'Unknown map "' + mapId + '"' : null);
  }

  function startEditing(ui, map, terrainArt, choice, registered) {
    var game = createView(map, terrainArt);
    game.menuOpen = function () { return false; };
    var session = new MCW.EditorSession({
      map: map, work: choice.work, start: choice.start, registered: registered,
      store: MCW.workStore, everSaved: choice.everSaved, dirtyAtStart: choice.dirtyAtStart
    });
    game.editor = session;
    game.editing = function () { return session.mode === "editing"; };
    new MCW.EditorOverlay(game, session);
    ui.attach(game, session);

    var v = startView();
    game.camera.setZoom(v.zoom);
    if (v.center) game.camera.centerOn(v.center.x, v.center.y);
    else game.camera.centerOn(map.cols / 2, map.rows / 2);
    if (params.get("dev") === "1") game.debug.setOn(true);

    runLoop(game, [
      function (dt) { return game.input.update(dt); },
      function (dt) { return game.camera.update(dt); },
      function (dt, now) { return game.debug.tick(now); }
    ]);
  }

  if (params.get("edit") === "1") startEditor();
  else boot();
})(window.MCW);

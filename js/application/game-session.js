// Application: the play session's flow — start view, saving/restoring the view on
// pause/resume, and the drifting camera behind the main menu (FR-003, FR-005, FR-010).
// Retry from the trial level's result screen starts like Play (feature 005).
// Uses the domain and other application objects only; selection is reached through a port
// ({ get(), set({hovered, selected}) }) supplied by the composition root.
(function (MCW) {
  "use strict";

  function GameSession(opts) {
    this.screens = opts.screens;
    this.camera = opts.camera;
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.startView = opts.startView || { zoom: 1, center: null };
    this.selection = opts.selection;
    this.driftClock = 0;
    this.saved = null;
    this._events = MCW.createEmitter();
    var self = this;
    this.screens.on("change", function (e) { self._onScreenChange(e); });
    this.applyStartView();
  }

  var P = GameSession.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  // Map centre at zoom 1, unless the start view says otherwise.
  P.applyStartView = function () {
    var v = this.startView;
    this.camera.setZoom(v.zoom || 1);
    if (v.center) this.camera.centerOn(v.center.x, v.center.y);
    else this.camera.centerOn(this.cols / 2, this.rows / 2);
  };

  // The city drifts behind the main menu and the panels opened from it.
  P.backgroundActive = function () {
    var s = this.screens.state;
    return s === "menu" || s === "credits" || (s === "howto" && this.screens.returnTo === "menu");
  };

  // Advances the drift; returns true when the camera moved.
  P.update = function (dtMs) {
    if (!this.backgroundActive()) return false;
    this.driftClock += dtMs;
    var p = MCW.attract.positionAt(this.driftClock, this.cols, this.rows);
    this.camera.setZoom(MCW.attract.ZOOM);
    this.camera.centerOn(p.x, p.y);
    return true;
  };

  P._onScreenChange = function (e) {
    var cam = this.camera;
    if (e.to === "briefing-crews" && e.from !== "briefing-problems") {
      this.saved = null;
      this.selection.set({ hovered: null, selected: null });
    }
    if ((e.from === "menu" || e.from === "result" || e.action === "startRound") && e.to === "playing") {
      this.applyStartView();
      this._events.emit("playstart");
    } else if (e.from === "playing" && e.to === "paused") {
      var sel = this.selection.get();
      this.saved = { wx: cam.wx, wy: cam.wy, zoom: cam.zoom, hovered: sel.hovered, selected: sel.selected };
    } else if (e.from === "paused" && e.to === "playing" && this.saved) {
      cam.zoom = this.saved.zoom;
      cam.wx = this.saved.wx;
      cam.wy = this.saved.wy;
      cam.clamp();
      this.selection.set({ hovered: this.saved.hovered, selected: this.saved.selected });
      this.saved = null;
    } else if (e.action === "toMenu") {
      this.saved = null;
      this.selection.set({ hovered: null, selected: null });
      this.driftClock = 0;
    }
  };

  MCW.GameSession = GameSession;
})(window.MCW);

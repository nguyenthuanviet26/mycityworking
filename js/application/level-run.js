// Application: runs a level inside the screen flow — starts a Round on Play and Retry, drops it
// on Main menu, only advances it while playing, ends on the result screen, and drives the
// tutorial hints (feature 005 research R7). Feature 006: choosing the crew — the panel's
// picked crew, and crew-first sending with an armed crew (research R4, R5).
// Adapters read state and call select/clickIncident/pick/arm/sendCrew/skipHints.
(function (MCW) {
  "use strict";

  // Round events -> hint events.
  var HINT_FOR = { assigned: "crewSent", arrive: "crewArrived", repaired: "repairDone" };
  var OPTIONS_MS = 250;

  function LevelRun(opts) {
    this.screens = opts.screens;
    this.map = opts.map;
    this.level = opts.level;
    this.round = null;
    this.hints = null;
    this.hintsSkipped = false;
    this.selected = null;
    this.pickedCrew = null;
    this.armedCrew = null;
    this.options = [];
    this._optionsMs = 0;
    this._events = MCW.createEmitter();
    var self = this;
    this.screens.on("change", function (e) { self._onScreenChange(e); });
  }

  var P = LevelRun.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  P._onScreenChange = function (e) {
    if (e.to === "playing" && (e.from === "menu" || e.action === "retry")) this._start();
    else if (e.to === "menu") this._stop();
  };

  P._start = function () {
    var self = this;
    if (this.round) this.round.reset();
    var round = (this.round = new MCW.Round({ map: this.map, level: this.level }));
    this.selected = null;
    this.pickedCrew = null;
    this.armedCrew = null;
    this.options = [];
    this.hints = new MCW.Hints(MCW.Hints.fill(MCW.Hints.TRIAL_STEPS, { target: this.level.target }));
    if (this.hintsSkipped) this.hints.skip();
    this.hints.on("change", function (step) { self._events.emit("hint", step); });
    MCW.Round.EVENTS.forEach(function (evt) {
      round.on(evt, function (p) { self._onRoundEvent(round, evt, p); });
    });
    this._events.emit("start", round);
  };

  P._stop = function () {
    if (this.round) this.round.reset();
    this.round = null;
    this.hints = null;
    this.hintsSkipped = false;
    this.selected = null;
    this.pickedCrew = null;
    this.armedCrew = null;
    this.options = [];
  };

  P._onRoundEvent = function (round, evt, p) {
    if (round !== this.round) return;
    if (this.hints) {
      if (evt === "release" && p.incident.tutorial) this.hints.notify("tutorialReleased");
      else if (HINT_FOR[evt]) this.hints.notify(HINT_FOR[evt]);
    }
    if (evt === "arrive" && p.crewId === this.armedCrew) this.disarm();
    if (evt === "repaired" && this.selected === p.incident.id) this.select(null);
    if (evt === "assigned" || evt === "arrive" || evt === "repaired") this._refreshOptions();
    this._events.emit(evt, p);
    if (evt === "end") this.screens.finish();
  };

  // Advances the round while the game is on screen; returns true when something changed.
  P.update = function (dtMs) {
    if (!this.round || this.screens.state !== "playing") return false;
    var changed = this.round.update(dtMs);
    if (this.hints) this.hints.update(dtMs);
    if (this.selected) {
      this._optionsMs += dtMs;
      if (this._optionsMs >= OPTIONS_MS) this._refreshOptions();
    }
    return changed;
  };

  P._refreshOptions = function () {
    this._optionsMs = 0;
    this.options = this.round && this.selected ? this.round.dispatchOptions(this.selected) : [];
  };

  // ---- incident first -------------------------------------------------------

  P.select = function (id) {
    if (!this.round || (id && !this.round.incident(id))) id = null;
    if (!id) this.disarm();
    if (id === this.selected) return;
    this.selected = id;
    this.pickedCrew = id ? this.round.bestCrewFor(id) : null;
    this._refreshOptions();
    if (id && this.hints && this.round.incident(id).tutorial) this.hints.notify("incidentSelected");
    this._events.emit("select", id);
  };

  // Next active incident after the selected one: urgent first, then oldest.
  P.selectNext = function () {
    if (!this.round) return;
    var list = this.round.activeIncidents().slice().sort(function (a, b) {
      return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.releasedAt - b.releasedAt;
    });
    if (!list.length) return;
    var ids = list.map(function (i) { return i.id; });
    var i = ids.indexOf(this.selected);
    this.select(ids[(i + 1) % ids.length]);
  };

  P.pickCrew = function (crewId) {
    if (!this.round || !this.round.crewById(crewId)) return;
    this.pickedCrew = crewId;
    this._events.emit("pick", crewId);
  };

  // n = position in the crew bar, from 1.
  P.pickIndex = function (n) {
    var crew = this.round && this.round.crews[n - 1];
    if (crew) this.pickCrew(crew.id);
  };

  P.sendCrew = function () {
    return !!(this.round && this.selected && this.pickedCrew && this.round.send(this.selected, this.pickedCrew));
  };

  // ---- crew first -----------------------------------------------------------

  // Arms a crew for the next incident click; arming the armed crew again disarms it.
  P.arm = function (crewId) {
    var crew = this.round && this.round.crewById(crewId);
    if (!crew || crew.state === "repairing") return false;
    if (this.armedCrew === crewId) {
      this.disarm();
      return true;
    }
    this.armedCrew = crewId;
    this._events.emit("arm", crewId);
    return true;
  };

  P.armIndex = function (n) {
    var crew = this.round && this.round.crews[n - 1];
    return crew ? this.arm(crew.id) : false;
  };

  P.disarm = function () {
    if (this.armedCrew === null) return;
    this.armedCrew = null;
    this._events.emit("arm", null);
  };

  // A click on an incident: sends the armed crew there, or opens the incident.
  P.clickIncident = function (id) {
    var round = this.round, inc = round && round.incident(id);
    if (!inc) return;
    if (!this.armedCrew) return this.select(id);
    var crew = round.crewById(this.armedCrew);
    if (MCW.matchLevel(crew.jobId, inc.kind.id) === "none") {
      this._events.emit("refused", { message: MCW.jobs[crew.jobId].name + " can't fix " + inc.kind.label });
      return;
    }
    if (round.send(id, crew.id)) this.disarm();
  };

  P.skipHints = function () {
    this.hintsSkipped = true;
    if (this.hints) this.hints.skip();
  };

  // Rain for the current phase, 0 once the storm has cleared, null when no round runs.
  P.rainIntensity = function () {
    if (!this.round) return null;
    if (this.round.result && this.round.result.reason === "cleared") return 0;
    return this.round.phase().rain;
  };

  MCW.LevelRun = LevelRun;
})(window.MCW);

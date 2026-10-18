// Application: one round of a level — clock, storm phases, incident schedule, the crews, city
// condition, score and the result (feature 005 data-model "Round", research R2, R5, R6).
// Feature 006: several crews with jobs; which crew is sent decides repair time and points.
// Time is kept in whole milliseconds so repeated steps add up exactly.
(function (MCW) {
  "use strict";

  var EVENTS = ["release", "urgent", "assigned", "arrive", "repaired", "phase", "goal", "cleared", "end"];

  function Round(opts) {
    var level = opts.level, map = opts.map;
    this.map = map;
    this.level = level;
    this.duration = level.phases.reduce(function (t, p) { return t + p.durationS; }, 0);
    this.elapsed = 0;
    this.phaseIndex = 0;
    this.condition = 100;
    this.score = 0;
    this.repaired = 0;
    this.goalReached = false;
    this.incidents = [];
    this.queue = 0;
    this.over = false;
    this.result = null;
    this.crews = MCW.levelCrews(level).map(function (c) {
      return new MCW.Crew({
        map: map, depot: { col: c.depot[0], row: c.depot[1] }, speed: c.speed || MCW.jobs[c.job].speed,
        id: c.id, jobId: c.job, leader: c.leader, portrait: c.portrait
      });
    });
    this._ms = 0;
    this._events = MCW.createEmitter();
  }

  var P = Round.prototype;

  Round.EVENTS = EVENTS;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  // ---- queries ------------------------------------------------------------

  P.phase = function () {
    var p = this.level.phases[this.phaseIndex];
    return { index: this.phaseIndex, name: p.name, rain: p.rain };
  };

  P.remaining = function () {
    return Math.max(0, this.duration - this.elapsed);
  };

  P.activeIncidents = function () {
    return this.incidents;
  };

  P.incident = function (id) {
    for (var i = 0; i < this.incidents.length; i++) if (this.incidents[i].id === id) return this.incidents[i];
    return null;
  };

  P.incidentAt = function (col, row) {
    for (var i = 0; i < this.incidents.length; i++) {
      var f = this.incidents[i].footprint;
      if (col >= f.col && col < f.col + f.w && row >= f.row && row < f.row + f.h) return this.incidents[i];
    }
    return null;
  };

  P.crewById = function (id) {
    for (var i = 0; i < this.crews.length; i++) if (this.crews[i].id === id) return this.crews[i];
    return null;
  };

  P.matchFor = function (crew, inc) {
    return MCW.matchLevel(crew.jobId, inc.kind.id);
  };

  P.secondsUntilFree = function (crewId) {
    var crew = this.crewById(crewId);
    var inc = crew && crew.state === "repairing" ? this.incident(crew.incidentId) : null;
    return inc ? (inc.repairMs - inc._workMs) / 1000 : null;
  };

  // The soonest any repairing crew is free (feature 005 compatibility), or null.
  P.secondsUntilCrewFree = function () {
    var best = null, self = this;
    this.crews.forEach(function (c) {
      var s = self.secondsUntilFree(c.id);
      if (s !== null && (best === null || s < best)) best = s;
    });
    return best;
  };

  // Why a crew can't be sent to an incident, or null when it can.
  P._refusal = function (crew, inc) {
    if (this.matchFor(crew, inc) === "none") return "Can't fix";
    if (crew.state === "repairing") return "Busy repairing";
    if (inc.crewId === crew.id) return "Already on the way";
    return null;
  };

  // One row per crew, in level order (data-model "Dispatch option").
  P.dispatchOptions = function (incidentId) {
    var inc = this.incident(incidentId), map = this.map;
    if (!inc) return [];
    var self = this;
    return this.crews.map(function (crew) {
      var match = self.matchFor(crew, inc);
      var reason = self._refusal(crew, inc);
      var route = match === "none" ? null : MCW.findRoute(map, crew.tile, inc.workTiles);
      if (!reason && !route) reason = "No road there";
      return {
        crewId: crew.id,
        match: match,
        status: crew.status(),
        etaS: route ? route.length / crew.speed : null,
        repairS: match === "none" ? null : MCW.repairSeconds(MCW.jobs[crew.jobId], inc.kind, match),
        sendable: !reason,
        reason: reason,
        freeInS: self.secondsUntilFree(crew.id)
      };
    });
  };

  // The crew to pre-pick: free Best, driving Best, free helper, driving helper (nearest first).
  P.bestCrewFor = function (incidentId) {
    var options = this.dispatchOptions(incidentId).filter(function (o) { return o.sendable; });
    var order = [["best", true], ["best", false], ["help", true], ["help", false]];
    for (var i = 0; i < order.length; i++) {
      var group = options.filter(function (o) {
        return o.match === order[i][0] && (o.status !== "driving") === order[i][1];
      });
      if (group.length) {
        group.sort(function (a, b) { return a.etaS - b.etaS; });
        return group[0].crewId;
      }
    }
    return null;
  };

  // ---- actions ------------------------------------------------------------

  // Sends (or redirects) a crew to an incident; false when it can't go there
  // (feature 006 data-model "Assignment rules"). No crew id: the best crew.
  P.send = function (id, crewId) {
    var inc = this.incident(id);
    if (this.over || !inc || inc.state === "repairing") return false;
    var crew = this.crewById(crewId || this.bestCrewFor(id));
    if (!crew || this._refusal(crew, inc)) return false;
    var prev = crew.incidentId ? this.incident(crew.incidentId) : null;
    if (!crew.sendTo(id, inc.workTiles)) return false;
    if (prev && prev !== inc) { // redirect
      prev.state = "new";
      prev.crewId = null;
      prev.match = null;
    }
    var released = inc.crewId ? this.crewById(inc.crewId) : null;
    if (released && released !== crew) released.goHome();
    inc.crewId = crew.id;
    inc.match = this.matchFor(crew, inc);
    inc.state = "assigned";
    if (!inc.crewSent) {
      inc.crewSent = true;
      if (inc.tutorial) inc.urgencyFrom = this.elapsed; // FR-023
    }
    this._events.emit("assigned", { incident: inc, crewId: crew.id });
    return true;
  };

  // Switches every active incident's target back to normal (on retry or leaving the round).
  P.reset = function () {
    var self = this;
    this.incidents.forEach(function (inc) { self._setLook(inc, "normal"); });
    this.incidents = [];
  };

  // ---- simulation ---------------------------------------------------------

  // Order inside one step (research R2): phase, releases, urgency, crews and repairs, drain, end.
  P.update = function (dtMs) {
    if (this.over) return false;
    this._ms += Math.round(dtMs);
    this.elapsed = Math.min(this._ms / 1000, this.duration);
    var dt = dtMs / 1000;
    this._advancePhase();
    this._release();
    this._checkUrgency();
    this._moveCrews(dtMs);
    this._repair(dtMs);
    this._drain(dt);
    this._checkEnd();
    return true;
  };

  P._advancePhase = function () {
    var phases = this.level.phases, start = 0;
    for (var i = 0; i < this.phaseIndex + 1; i++) start += phases[i].durationS;
    while (this.phaseIndex < phases.length - 1 && this.elapsed >= start) {
      this.phaseIndex++;
      start += phases[this.phaseIndex].durationS;
      this._events.emit("phase", { index: this.phaseIndex, name: phases[this.phaseIndex].name });
    }
  };

  P._release = function () {
    var schedule = this.level.schedule;
    while (this.queue < schedule.length) {
      var e = schedule[this.queue];
      if (e.at > this.elapsed) return;
      if (this.incidents.length >= this.level.phases[this.phaseIndex].maxActive) return;
      if (this._targetBusy(e)) return; // waits at the head of the queue
      var inc = this._makeIncident(e, this.queue);
      this.queue++;
      this.incidents.push(inc);
      this._setLook(inc, "damaged");
      this._events.emit("release", { incident: inc });
    }
  };

  P._targetBusy = function (e) {
    return this.incidents.some(function (inc) {
      return e.tile ? inc.target.tile && inc.target.tile.col === e.tile[0] && inc.target.tile.row === e.tile[1]
        : inc.target.object === e.object;
    });
  };

  P._makeIncident = function (e, index) {
    var fp, target;
    if (e.tile) {
      target = { tile: { col: e.tile[0], row: e.tile[1] } };
      fp = { col: e.tile[0], row: e.tile[1], w: 1, h: 1 };
    } else {
      var o = this.map.getObject(e.object);
      target = { object: e.object };
      fp = { col: o.anchor.col, row: o.anchor.row, w: o.size.w, h: o.size.h };
    }
    return {
      id: "inc-" + index,
      kind: MCW.incidentKinds[e.kind],
      target: target,
      footprint: fp,
      workTiles: MCW.workTiles(this.map, fp),
      centre: { x: fp.col + fp.w / 2, y: fp.row + fp.h / 2 },
      tutorial: !!e.tutorial,
      releasedAt: this.elapsed,
      urgencyFrom: e.tutorial ? null : this.elapsed,
      state: "new", // new | assigned | repairing | repaired
      urgent: false,
      crewSent: false,
      crewId: null,
      match: null,
      progress: 0,
      repairMs: 0,
      _workMs: 0
    };
  };

  P._setLook = function (inc, variant) {
    if (inc.target.tile) this.map.setTileVariant(inc.target.tile.col, inc.target.tile.row, variant);
    else this.map.setObjectVariant(inc.target.object, variant);
  };

  P._checkUrgency = function () {
    var scale = this.level.warnScale || 1;
    for (var i = 0; i < this.incidents.length; i++) {
      var inc = this.incidents[i];
      if (inc.urgent || inc.state === "repairing" || inc.urgencyFrom === null) continue;
      if (this.elapsed - inc.urgencyFrom >= inc.kind.warnS * scale - 1e-9) {
        inc.urgent = true;
        this._events.emit("urgent", { incident: inc });
      }
    }
  };

  P._moveCrews = function (dtMs) {
    for (var c = 0; c < this.crews.length; c++) {
      var crew = this.crews[c], events = crew.update(dtMs);
      for (var i = 0; i < events.length; i++) {
        if (events[i].type !== "arrive") continue;
        var inc = this.incident(events[i].incidentId);
        if (!inc) continue;
        inc.state = "repairing";
        inc.repairMs = Math.round(MCW.repairSeconds(MCW.jobs[crew.jobId], inc.kind, inc.match) * 1000);
        this._events.emit("arrive", { incident: inc, crewId: crew.id });
      }
    }
  };

  P._repair = function (dtMs) {
    for (var c = 0; c < this.crews.length; c++) {
      var crew = this.crews[c];
      var inc = crew.state === "repairing" ? this.incident(crew.incidentId) : null;
      if (!inc || inc.state !== "repairing") continue;
      inc._workMs = Math.min(inc.repairMs, inc._workMs + Math.round(dtMs));
      inc.progress = inc._workMs / inc.repairMs;
      if (inc._workMs >= inc.repairMs) this._complete(inc, crew);
    }
  };

  P._complete = function (inc, crew) {
    var level = this.level, early = !inc.urgent, match = inc.match;
    var points = MCW.repairPoints(MCW.jobs[crew.jobId], inc.kind, match, level) + (early ? level.earlyBonus : 0);
    var refill = early ? level.refill.early : level.refill.normal;
    inc.state = "repaired";
    this.incidents.splice(this.incidents.indexOf(inc), 1);
    this._setLook(inc, "normal");
    this.score += points;
    this.repaired++;
    this.condition = Math.min(100, this.condition + refill);
    crew.finishRepair();
    crew.goHome();
    this._events.emit("repaired", {
      incident: inc, crewId: crew.id, match: match, points: points, refill: refill, early: early, rightCrew: match === "best"
    });
    if (!this.goalReached && this.repaired >= level.target) {
      this.goalReached = true;
      this._events.emit("goal", { repaired: this.repaired });
    }
  };

  P._drain = function (dt) {
    var urgent = 0;
    for (var i = 0; i < this.incidents.length; i++) if (this.incidents[i].urgent) urgent++;
    if (!urgent) return;
    this.condition = Math.max(0, this.condition - this.level.drainPerUrgentPerS * urgent * dt);
  };

  P._checkEnd = function () {
    if (this.elapsed >= this.duration) {
      this._events.emit("cleared", {});
      this._end("cleared");
    } else if (this.condition <= 0) {
      this._end("collapsed");
    }
  };

  P._end = function (reason) {
    var won = this.goalReached, stars = this.level.stars;
    this.over = true;
    this.result = {
      won: won,
      reason: reason,
      repaired: this.repaired,
      target: this.level.target,
      timeS: this.elapsed,
      score: this.score,
      stars: won ? 1 + (this.score >= stars[0] ? 1 : 0) + (this.score >= stars[1] ? 1 : 0) : 0
    };
    this._events.emit("end", this.result);
  };

  MCW.Round = Round;
})(window.MCW);

// Application: a repair crew — drives road routes tile by tile, faces its direction of
// travel, repairs, and returns to its depot (feature 005 data-model "Crew", research R4).
// Feature 006: each crew has an id, a job, and a leader with a portrait key.
(function (MCW) {
  "use strict";

  var NONE = [];

  function facingFor(dc, dr) {
    var names = MCW.iso.DIR_NAMES;
    for (var i = 0; i < names.length; i++) {
      var d = MCW.iso.DIRS[names[i]];
      if (d[0] === dc && d[1] === dr) return names[i];
    }
    return null;
  }

  function Crew(opts) {
    this.id = opts.id || "crew";
    this.jobId = opts.jobId || "general";
    this.leader = opts.leader || "";
    this.portrait = opts.portrait || "char_a";
    this.map = opts.map;
    this.depot = { col: opts.depot.col, row: opts.depot.row };
    this.speed = opts.speed;
    this.tile = { col: this.depot.col, row: this.depot.row }; // standing on, or heading into
    this.x = this.tile.col + 0.5;
    this.y = this.tile.row + 0.5;
    this.facing = "SE";
    this.state = "idle"; // idle | driving | repairing | returning
    this.route = [];
    this.incidentId = null;
    this._step = null; // { fromX, fromY, p } while moving into this.tile
  }

  var P = Crew.prototype;

  // What the player sees: "ready" | "driving" | "repairing" | "returning".
  P.status = function () {
    return this.state === "idle" ? "ready" : this.state;
  };

  P.canSend = function () {
    return this.state !== "repairing";
  };

  P.moving = function () {
    return this.state === "driving" || this.state === "returning";
  };

  // Routes from the tile being entered, so a redirect never jumps or reverses mid-tile.
  P.sendTo = function (incidentId, goals) {
    if (!this.canSend()) return false;
    var route = MCW.findRoute(this.map, this.tile, goals);
    if (!route) return false;
    this.route = route;
    this.incidentId = incidentId;
    this.state = "driving";
    return true;
  };

  P.goHome = function () {
    this.incidentId = null;
    this.route = MCW.findRoute(this.map, this.tile, [this.depot]) || [];
    this.state = "returning";
  };

  P.finishRepair = function () {
    this.state = "idle";
    this.incidentId = null;
  };

  // Moves along the route; returns [] or [{type:"arrive", incidentId}] / [{type:"home"}].
  P.update = function (dtMs) {
    if (!this.moving()) return NONE;
    var dist = this.speed * dtMs / 1000;
    while (true) {
      if (!this._step) {
        if (!this.route.length) return this._arrive();
        var next = this.route.shift();
        this.facing = facingFor(next.col - this.tile.col, next.row - this.tile.row) || this.facing;
        this._step = { fromX: this.x, fromY: this.y, p: 0 };
        this.tile = next;
      }
      var s = this._step, cx = this.tile.col + 0.5, cy = this.tile.row + 0.5;
      if (dist >= 1 - s.p - 1e-9) {
        dist -= 1 - s.p;
        this.x = cx;
        this.y = cy;
        this._step = null;
        if (!this.route.length) return this._arrive();
        if (dist <= 1e-9) return NONE;
      } else {
        s.p += dist;
        this.x = s.fromX + (cx - s.fromX) * s.p;
        this.y = s.fromY + (cy - s.fromY) * s.p;
        return NONE;
      }
    }
  };

  P._arrive = function () {
    if (this.state === "returning") {
      this.state = "idle";
      return [{ type: "home" }];
    }
    this.state = "repairing";
    return [{ type: "arrive", incidentId: this.incidentId }];
  };

  MCW.Crew = Crew;
})(window.MCW);

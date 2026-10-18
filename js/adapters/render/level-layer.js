// Adapter: draws the trial level on the canvas — the crews' vehicles (depth-sorted with the
// city), incident pins with a glyph per damage kind, repair rings and screen-edge arrows — and
// turns clicks on them into selections or crew-first sends (feature 005 contracts/play-ui.md
// "Map markers"; feature 006 contracts/play-ui.md "Map pins").
(function (MCW) {
  "use strict";

  var NEW = "#f5c518", URGENT = "#e5484d", OK = "#2ecc71", INK = "#1b1f24";
  var PIN_R = 13, HIT_R = 20, ARROW_INSET = 26, MAX_ARROWS = 16;

  function LevelLayer(game, run) {
    this.game = game;
    this.run = run;
    this._arrows = [];
    for (var i = 0; i < MAX_ARROWS; i++) this._arrows.push({ id: null, x: 0, y: 0 });
    this._arrowCount = 0;
    var self = this;

    this._drawables = [];
    run.on("start", function (round) { self._buildDrawables(round); });
    game.renderer.topOverlays.push(function (ctx) { self._drawMarkers(ctx); });
    game.input.clickHandler = function (sx, sy, tile) { return self._click(sx, sy, tile); };
  }

  var P = LevelLayer.prototype;

  // One depth-sorted drawable per crew of the new round.
  P._buildDrawables = function (round) {
    var self = this, renderer = this.game.renderer;
    this._drawables.forEach(function (d) { renderer.removeDrawable(d); });
    this._drawables = round.crews.map(function (crew) {
      var d = { x: crew.x, y: crew.y, crew: crew, draw: function (ctx, sx, sy, z) { self._drawCrew(ctx, d, sx, sy, z); } };
      renderer.addDrawable(d);
      return d;
    });
  };

  // Keeps the vehicles' depth positions in step; redraws every frame while a round is on screen.
  P.update = function () {
    if (!this.run.round) return false;
    for (var i = 0; i < this._drawables.length; i++) {
      this._drawables[i].x = this._drawables[i].crew.x;
      this._drawables[i].y = this._drawables[i].crew.y;
    }
    return this.game.screens.state === "playing";
  };

  // Screen position of an incident's pin (above the damaged road or roof).
  P.pinAt = function (inc) {
    var cam = this.game.camera;
    var s = cam.mapToScreen(inc.centre.x, inc.centre.y);
    var lift = inc.target.tile ? 30 : (inc.footprint.w > 1 ? 120 : 80);
    return { x: s.sx, y: s.sy - lift * cam.zoom - PIN_R };
  };

  P._drawCrew = function (ctx, d, sx, sy, z) {
    if (!this.run.round || this.run.round.crews.indexOf(d.crew) < 0) return;
    var img = MCW.assets.get(MCW.jobArt.vehicleFor(d.crew.jobId, d.crew.facing));
    var w = img.width * z, h = img.height * z;
    ctx.drawImage(img, sx - w / 2, sy - h * 0.7, w, h);
  };

  P._drawMarkers = function (ctx) {
    var round = this.run.round;
    this._arrowCount = 0;
    if (!round) return;
    var cam = this.game.camera, list = round.activeIncidents();
    for (var i = 0; i < list.length; i++) {
      var inc = list[i], p = this.pinAt(inc);
      if (p.x < -PIN_R || p.y < -PIN_R || p.x > cam.viewW + PIN_R || p.y > cam.viewH + PIN_R) {
        this._drawArrow(ctx, inc, p);
        continue;
      }
      this._drawPin(ctx, inc, p.x, p.y, round.elapsed, this._dimmed(inc));
    }
  };

  // While a crew is armed, incidents it can't fix are drawn faded.
  P._dimmed = function (inc) {
    var armed = this.run.armedCrew && this.run.round.crewById(this.run.armedCrew);
    return !!armed && MCW.matchLevel(armed.jobId, inc.kind.id) === "none";
  };

  P._drawPin = function (ctx, inc, x, y, t, dimmed) {
    var colour = inc.urgent ? URGENT : NEW;
    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.35;
    if (inc.urgent) { // pulsing ring, timed by the round so it freezes on pause
      var k = (t * 1.5) % 1;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = URGENT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, PIN_R + 4 + k * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = dimmed ? 0.35 : 1;
    }
    // pin body: circle with a point towards the target
    ctx.beginPath();
    ctx.moveTo(x - 7, y + PIN_R - 3);
    ctx.lineTo(x, y + PIN_R + 9);
    ctx.lineTo(x + 7, y + PIN_R - 3);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, PIN_R, 0, Math.PI * 2);
    ctx.fill();
    if (this.run.selected === inc.id) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (inc.state === "repairing") {
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, PIN_R + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = OK;
      ctx.beginPath();
      ctx.arc(x, y, PIN_R + 5, -Math.PI / 2, -Math.PI / 2 + inc.progress * Math.PI * 2);
      ctx.stroke();
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("🔧", x, y + 1); // wrench
    } else {
      ctx.fillStyle = INK;
      ctx.font = (inc.urgent ? "bold 15px" : "14px") + " system-ui, sans-serif";
      ctx.fillText(inc.urgent ? "!!" : MCW.jobArt.kindGlyph(inc.kind.id), x, y + 1);
      if (inc.state === "assigned") {
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("🚚", x + PIN_R + 9, y - PIN_R + 2); // truck
      }
    }
    ctx.restore();
  };

  // Arrow on the screen edge pointing towards an off-screen incident.
  P._drawArrow = function (ctx, inc, p) {
    if (this._arrowCount >= MAX_ARROWS) return;
    var cam = this.game.camera, cx = cam.viewW / 2, cy = cam.viewH / 2;
    var dx = p.x - cx, dy = p.y - cy;
    var sx = (cx - ARROW_INSET) / Math.abs(dx || 1e-6), sy = (cy - ARROW_INSET) / Math.abs(dy || 1e-6);
    var s = Math.min(sx, sy), ax = cx + dx * s, ay = cy + dy * s, angle = Math.atan2(dy, dx);
    var a = this._arrows[this._arrowCount++];
    a.id = inc.id;
    a.x = ax;
    a.y = ay;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fillStyle = inc.urgent ? URGENT : NEW;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Arrow → glide to the incident; pin or damaged tile → select it; otherwise deselect.
  P._click = function (sx, sy, tile) {
    var round = this.run.round;
    if (!round) return false;
    var i, list = round.activeIncidents();
    for (i = 0; i < this._arrowCount; i++) {
      var a = this._arrows[i];
      if (Math.hypot(sx - a.x, sy - a.y) <= HIT_R) {
        var target = round.incident(a.id);
        if (target) this.game.camera.centerOn(target.centre.x, target.centre.y, { smooth: true });
        return true;
      }
    }
    for (i = 0; i < list.length; i++) {
      var p = this.pinAt(list[i]);
      if (Math.hypot(sx - p.x, sy - p.y) <= HIT_R) {
        this.run.clickIncident(list[i].id);
        return true;
      }
    }
    var hit = tile ? round.incidentAt(tile.col, tile.row) : null;
    if (hit) {
      this.run.clickIncident(hit.id);
      return true;
    }
    this.run.select(null);
    return false;
  };

  MCW.LevelLayer = LevelLayer;
})(window.MCW);

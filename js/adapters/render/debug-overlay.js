// Developer mode (F3 or `): info panel, FPS, grid, collision overlay, markers, test keys.
(function (MCW) {
  "use strict";

  var COLORS = {
    both: "rgba(46, 204, 113, 0.35)",
    foot: "rgba(241, 196, 15, 0.35)",
    none: "rgba(231, 76, 60, 0.35)"
  };

  function DebugOverlay(game, panel) {
    this.game = game;
    this.panel = panel;
    this.on = false;
    this.showGrid = false;
    this.showCollision = false;
    this.markers = [];
    this._frameTimes = [];
    this._last = 0;
    var self = this;
    game.renderer.overlays.push(function (ctx, r, range) { self._drawTileOverlays(ctx, r, range); });
    window.addEventListener("keydown", function (e) { self._onKey(e); });
  }

  var P = DebugOverlay.prototype;

  P.setOn = function (on) {
    this.on = on;
    this.panel.hidden = !on;
    this._last = 0;
    this._frameTimes.length = 0;
    this.game.renderer.requestRedraw();
  };

  P._onKey = function (e) {
    if (this.game.menuOpen && this.game.menuOpen()) return;
    if (e.key === "F3" || e.key === "`") {
      e.preventDefault();
      this.setOn(!this.on);
      return;
    }
    if (!this.on || e.ctrlKey || e.altKey || e.metaKey) return;
    // In decorate mode, changes go through the editor so they can be undone and saved.
    if ((e.code === "KeyB" || e.code === "KeyV") && this.game.editing && this.game.editing()) return;
    var map = this.game.map, sel = this.game.input.selected;
    switch (e.code) {
      case "KeyC":
        this.showCollision = !this.showCollision;
        break;
      case "KeyG":
        this.showGrid = !this.showGrid;
        break;
      case "KeyM":
        if (e.shiftKey) this.clearMarkers();
        else this.addMarkerAtPointer();
        break;
      case "KeyB":
        if (!sel) return;
        if (map.hasOverride(sel.col, sel.row)) map.clearOverride(sel.col, sel.row);
        else map.setOverride(sel.col, sel.row, { foot: false, vehicle: false });
        break;
      case "KeyV":
        if (!sel) return;
        var obj = map.objectAt(sel.col, sel.row);
        if (obj) map.setObjectVariant(obj.id, obj.variant === "damaged" ? "normal" : "damaged");
        else {
          var t = map.getTile(sel.col, sel.row);
          map.setTileVariant(sel.col, sel.row, t.variant === "damaged" ? "normal" : "damaged");
        }
        break;
      default:
        return;
    }
    this.game.renderer.requestRedraw();
  };

  P.addMarkerAtPointer = function () {
    var p = this.game.input.pointerMapPosition();
    if (!p) return;
    var marker = {
      x: p.x,
      y: p.y,
      draw: function (ctx, sx, sy, z) {
        ctx.beginPath();
        ctx.arc(sx, sy, 6 * z, 0, Math.PI * 2);
        ctx.fillStyle = "#e53935";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    };
    this.markers.push(marker);
    this.game.renderer.addDrawable(marker);
  };

  P.clearMarkers = function () {
    var r = this.game.renderer;
    this.markers.forEach(function (m) { r.removeDrawable(m); });
    this.markers = [];
  };

  P._drawTileOverlays = function (ctx, r, range) {
    if (!this.on || (!this.showGrid && !this.showCollision)) return;
    var map = this.game.map;
    for (var row = range.r0; row <= range.r1; row++) {
      for (var col = range.c0; col <= range.c1; col++) {
        r.diamond(col, row);
        if (this.showCollision) {
          var c = map.collisionAt(col, row);
          ctx.fillStyle = c.foot && c.vehicle ? COLORS.both : c.foot ? COLORS.foot : COLORS.none;
          ctx.fill();
        }
        if (this.showGrid) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  };

  function fmtCollision(c) {
    var cost = c.cost === Infinity ? "∞" : c.cost;
    return "foot " + (c.foot ? "yes" : "no") + ", vehicle " + (c.vehicle ? "yes" : "no") + ", cost " + cost;
  }

  // Called every frame by the main loop; returns true to force a redraw while on.
  P.tick = function (now) {
    if (!this.on) return false;
    var times = this._frameTimes;
    if (this._last) times.push(now - this._last);
    this._last = now;
    if (times.length > 30) times.shift();
    var avg = times.reduce(function (a, b) { return a + b; }, 0) / (times.length || 1);
    var fps = avg ? Math.round(1000 / avg) : 0;

    var g = this.game, map = g.map;
    var lines = [
      "FPS        " + fps,
      "Zoom       " + g.camera.zoom.toFixed(2) + "×",
      "Map        " + map.cols + "×" + map.rows
    ];
    function describeTile(label, t) {
      if (!t) {
        lines.push(label + " —");
        return;
      }
      var tile = map.getTile(t.col, t.row);
      var obj = map.objectAt(t.col, t.row);
      lines.push(label + " (" + t.col + "," + t.row + ") " + tile.terrain + (tile.variant !== "normal" ? " [" + tile.variant + "]" : ""));
      lines.push("  object   " + (obj ? obj.id + " (" + obj.type + (obj.variant !== "normal" ? ", " + obj.variant : "") + ")" : "—"));
      lines.push("  collide  " + fmtCollision(map.collisionAt(t.col, t.row)) + (map.hasOverride(t.col, t.row) ? " [override]" : ""));
    }
    describeTile("Hover     ", g.input.hovered);
    describeTile("Selected  ", g.input.selected);
    lines.push("");
    lines.push("C collision " + (this.showCollision ? "on" : "off") + " · G grid " + (this.showGrid ? "on" : "off"));
    lines.push("M marker (" + this.markers.length + ") · Shift+M clear");
    lines.push("B block selected · V damage selected");
    this.panel.textContent = lines.join("\n");
    return true;
  };

  MCW.DebugOverlay = DebugOverlay;
})(window.MCW);

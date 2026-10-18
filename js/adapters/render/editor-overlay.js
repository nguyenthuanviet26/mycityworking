// Adapter: decorate-mode drawing on the map: brush highlight, placement preview and eraser
// target (feature 004). Draws nothing while test-playing.
(function (MCW) {
  "use strict";

  var ACCENT = "#4fc3f7";
  var OK_FILL = "rgba(46, 204, 113, 0.35)";
  var BAD_FILL = "rgba(231, 76, 60, 0.35)";
  var BAD_LINE = "#e74c3c";

  function EditorOverlay(game, session) {
    this.game = game;
    this.session = session;
    var self = this;
    game.renderer.overlays.push(function (ctx, r) { self._drawTiles(ctx, r); });
    game.renderer.topOverlays.push(function (ctx, r) { self._drawTop(ctx, r); });
    ["tool", "mode", "change"].forEach(function (e) {
      session.on(e, function () { game.renderer.requestRedraw(); });
    });
    game.input.on("tilehover", function () {
      if (self.session.tool.kind !== "select") game.renderer.requestRedraw();
    });
  }

  var P = EditorOverlay.prototype;

  P._hovered = function () {
    return this.session.mode === "editing" ? this.game.input.hovered : null;
  };

  P._drawTiles = function (ctx, r) {
    var t = this._hovered(), tool = this.session.tool;
    if (!t) return;
    if (tool.kind === "paint") {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      r.diamond(t.col, t.row);
      ctx.stroke();
    } else if (tool.kind === "place") {
      this.session.checkPlacement(tool.type, t.col, t.row).tiles.forEach(function (ft) {
        ctx.fillStyle = ft.inside && ft.free ? OK_FILL : BAD_FILL;
        r.diamond(ft.col, ft.row);
        ctx.fill();
      });
    }
  };

  // Drawn after the objects: the see-through preview and the eraser target.
  P._drawTop = function (ctx, r) {
    var t = this._hovered(), tool = this.session.tool;
    if (!t) return;
    if (tool.kind === "place") {
      var entry = MCW.objectTypes.TYPES[tool.type];
      ctx.save();
      ctx.globalAlpha = 0.55;
      r._drawObject({
        type: tool.type, kind: entry.kind, variant: "normal",
        anchor: { col: t.col, row: t.row }, size: entry.size
      });
      ctx.restore();
    } else if (tool.kind === "erase") {
      var o = this.game.map.objectAt(t.col, t.row);
      if (!o) return;
      ctx.strokeStyle = BAD_LINE;
      ctx.lineWidth = 2;
      for (var dr = 0; dr < o.size.h; dr++) {
        for (var dc = 0; dc < o.size.w; dc++) {
          r.diamond(o.anchor.col + dc, o.anchor.row + dr);
          ctx.stroke();
        }
      }
    }
  };

  MCW.EditorOverlay = EditorOverlay;
})(window.MCW);

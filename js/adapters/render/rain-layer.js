// Draws the rain simulation above the city and below the HTML menu (FR-003a).
// During the trial level it follows the storm phase, easing between intensities (feature 005 R10).
(function (MCW) {
  "use strict";

  var COLOR = "rgba(200, 222, 255, 0.5)";
  var POOL = 400;
  var MENU_INTENSITY = 0.4; // 160 streaks, as before feature 005
  var EASE_PER_S = 1;

  function RainLayer(game) {
    this.game = game;
    this.enabled = false; // menu background
    this.levelRun = null; // set by the composition root when a level is loaded
    this.rain = MCW.rain.create(POOL, window.innerWidth, window.innerHeight, 1);
    this.level = MENU_INTENSITY;
    this._on = false;
    MCW.rain.setIntensity(this.rain, this.level);
    var self = this;
    game.renderer.topOverlays.push(function (ctx) { self.draw(ctx); });
  }

  var P = RainLayer.prototype;

  // Advances the rain; returns true when it moved (so the frame must be redrawn).
  P.update = function (dtMs) {
    var k = this.levelRun ? this.levelRun.rainIntensity() : null;
    this._on = this.enabled || k !== null;
    if (!this._on) return false;
    var target = k !== null ? k : MENU_INTENSITY;
    var step = EASE_PER_S * dtMs / 1000;
    this.level = this.level < target ? Math.min(target, this.level + step) : Math.max(target, this.level - step);
    MCW.rain.setIntensity(this.rain, this.level);
    MCW.rain.update(this.rain, dtMs);
    return true;
  };

  P.draw = function (ctx) {
    if (!this._on) return;
    var r = this.rain;
    ctx.beginPath();
    for (var i = 0; i < r.active; i++) {
      ctx.moveTo(r.x[i], r.y[i]);
      ctx.lineTo(r.x[i] + r.wind * r.len[i], r.y[i] + r.len[i]);
    }
    ctx.strokeStyle = COLOR;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  P.resize = function (w, h) {
    MCW.rain.resize(this.rain, w, h);
  };

  MCW.RainLayer = RainLayer;
})(window.MCW);

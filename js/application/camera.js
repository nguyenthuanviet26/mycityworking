// Camera: view centre in world pixels, zoom, map bounds (research R9). No DOM.
(function (MCW) {
  "use strict";

  var MARGIN = 64;
  var SCROLL_SPEED = 600; // screen px per second
  var GLIDE_MS = 300;

  function clampNum(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function Camera(opts) {
    opts = opts || {};
    this.viewW = opts.viewW || 800;
    this.viewH = opts.viewH || 600;
    this.wx = 0;
    this.wy = 0;
    this.zoom = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2;
    this.bounds = null;
    this.cols = 0;
    this.rows = 0;
    this._glide = null;
  }

  var P = Camera.prototype;

  P.setView = function (w, h) {
    this.viewW = w;
    this.viewH = h;
    this.clamp();
  };

  P.setMapSize = function (cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.bounds = {
      minX: -rows * 64 - MARGIN,
      maxX: cols * 64 + MARGIN,
      minY: -MARGIN,
      maxY: (cols + rows) * 32 + MARGIN
    };
    this.clamp();
  };

  // Centre (wx, wy) adjusted so the viewport stays inside the bounds,
  // or sits on the bounds' centre on an axis where the map is smaller than the view.
  P._clamped = function (wx, wy) {
    var b = this.bounds;
    if (!b) return { wx: wx, wy: wy };
    var halfW = this.viewW / 2 / this.zoom;
    var halfH = this.viewH / 2 / this.zoom;
    wx = b.maxX - b.minX <= 2 * halfW ? (b.minX + b.maxX) / 2 : clampNum(wx, b.minX + halfW, b.maxX - halfW);
    wy = b.maxY - b.minY <= 2 * halfH ? (b.minY + b.maxY) / 2 : clampNum(wy, b.minY + halfH, b.maxY - halfH);
    return { wx: wx, wy: wy };
  };

  P.clamp = function () {
    var c = this._clamped(this.wx, this.wy);
    this.wx = c.wx;
    this.wy = c.wy;
  };

  // ---- conversions ------------------------------------------------------

  P.worldToScreen = function (wx, wy) {
    return {
      sx: (wx - this.wx) * this.zoom + this.viewW / 2,
      sy: (wy - this.wy) * this.zoom + this.viewH / 2
    };
  };

  P.screenToWorld = function (sx, sy) {
    return {
      wx: (sx - this.viewW / 2) / this.zoom + this.wx,
      wy: (sy - this.viewH / 2) / this.zoom + this.wy
    };
  };

  P.mapToScreen = function (x, y) {
    var w = MCW.iso.mapToWorld(x, y);
    return this.worldToScreen(w.wx, w.wy);
  };

  P.screenToMap = function (sx, sy) {
    var w = this.screenToWorld(sx, sy);
    return MCW.iso.worldToMap(w.wx, w.wy);
  };

  P.tileAtScreen = function (sx, sy, cols, rows) {
    if (cols === undefined) { cols = this.cols; rows = this.rows; }
    var m = this.screenToMap(sx, sy);
    var t = MCW.iso.tileOf(m.x, m.y);
    if (!(t.col >= 0 && t.row >= 0 && t.col < cols && t.row < rows)) return null; // also rejects NaN
    return t;
  };

  // Tile range covering the viewport. Extra padding on the south side because
  // tall buildings standing there reach up into view.
  P.visibleTileRange = function (cols, rows, pad) {
    if (pad === undefined) pad = 2;
    var padSouth = pad + 7;
    var pts = [
      this.screenToMap(0, 0),
      this.screenToMap(this.viewW, 0),
      this.screenToMap(0, this.viewH),
      this.screenToMap(this.viewW, this.viewH)
    ];
    var xs = pts.map(function (p) { return p.x; });
    var ys = pts.map(function (p) { return p.y; });
    return {
      c0: clampNum(Math.floor(Math.min.apply(null, xs)) - pad, 0, cols - 1),
      c1: clampNum(Math.floor(Math.max.apply(null, xs)) + padSouth, 0, cols - 1),
      r0: clampNum(Math.floor(Math.min.apply(null, ys)) - pad, 0, rows - 1),
      r1: clampNum(Math.floor(Math.max.apply(null, ys)) + padSouth, 0, rows - 1)
    };
  };

  // ---- movement ---------------------------------------------------------

  P.panBy = function (dsx, dsy) {
    this._glide = null;
    this.wx -= dsx / this.zoom;
    this.wy -= dsy / this.zoom;
    this.clamp();
  };

  P.panWorld = function (dwx, dwy) {
    this._glide = null;
    this.wx += dwx;
    this.wy += dwy;
    this.clamp();
  };

  P.zoomAt = function (factor, sx, sy) {
    var before = this.screenToWorld(sx, sy);
    this.zoom = clampNum(this.zoom * factor, this.minZoom, this.maxZoom);
    this.wx = before.wx - (sx - this.viewW / 2) / this.zoom;
    this.wy = before.wy - (sy - this.viewH / 2) / this.zoom;
    this.clamp();
  };

  P.zoomCenter = function (factor) {
    this.zoomAt(factor, this.viewW / 2, this.viewH / 2);
  };

  P.setZoom = function (z) {
    this.zoom = clampNum(z, this.minZoom, this.maxZoom);
    this.clamp();
  };

  P.scrollSpeedWorld = function (zoom) {
    return SCROLL_SPEED / (zoom === undefined ? this.zoom : zoom);
  };

  P.centerOn = function (x, y, opts) {
    var w = MCW.iso.mapToWorld(x, y);
    var target = this._clamped(w.wx, w.wy);
    if (opts && opts.smooth) {
      this._glide = { fromX: this.wx, fromY: this.wy, toX: target.wx, toY: target.wy, t: 0 };
    } else {
      this._glide = null;
      this.wx = target.wx;
      this.wy = target.wy;
    }
  };

  // Advances a smooth glide; returns true while the camera moved.
  P.update = function (dtMs) {
    var g = this._glide;
    if (!g) return false;
    g.t += dtMs;
    var k = Math.min(1, g.t / GLIDE_MS);
    var e = 1 - Math.pow(1 - k, 3);
    this.wx = g.fromX + (g.toX - g.fromX) * e;
    this.wy = g.fromY + (g.toY - g.fromY) * e;
    if (k >= 1) this._glide = null;
    return true;
  };

  MCW.Camera = Camera;
})(window.MCW);

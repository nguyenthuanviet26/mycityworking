// Canvas renderer: culled terrain pass, then depth-sorted objects and drawables (research R7, R8).
(function (MCW) {
  "use strict";

  function diamondPath(ctx, sx, sy, z) {
    // sx, sy = screen position of the tile's top (north) corner
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 64 * z, sy + 32 * z);
    ctx.lineTo(sx, sy + 64 * z);
    ctx.lineTo(sx - 64 * z, sy + 32 * z);
    ctx.closePath();
  }

  function Renderer(canvas, map, camera, terrainArt) {
    this.terrainArt = terrainArt;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.map = map;
    this.camera = camera;
    this.drawables = [];
    this.hovered = null;
    this.selected = null;
    this.overlays = []; // functions(ctx, renderer, range) drawn after the terrain pass
    this.topOverlays = []; // functions(ctx, renderer) drawn last
    this.dirty = true;
    this._items = [];
    this.resize();
  }

  var P = Renderer.prototype;

  P.resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.dpr = dpr;
    this.dirty = true;
  };

  P.requestRedraw = function () {
    this.dirty = true;
  };

  P.addDrawable = function (d) {
    this.drawables.push(d);
    this.dirty = true;
  };

  P.removeDrawable = function (d) {
    var i = this.drawables.indexOf(d);
    if (i >= 0) this.drawables.splice(i, 1);
    this.dirty = true;
  };

  // Screen position of a tile's top corner.
  P.tileTop = function (col, row) {
    return this.camera.mapToScreen(col, row);
  };

  P.diamond = function (col, row) {
    var t = this.tileTop(col, row);
    diamondPath(this.ctx, t.sx, t.sy, this.camera.zoom);
  };

  P.draw = function () {
    var ctx = this.ctx, map = this.map, cam = this.camera, z = cam.zoom;
    this.dirty = false;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cam.viewW, cam.viewH);

    var range = cam.visibleTileRange(map.cols, map.rows);
    var col, row, i;

    // Pass 1: terrain.
    for (row = range.r0; row <= range.r1; row++) {
      for (col = range.c0; col <= range.c1; col++) {
        var top = cam.mapToScreen(col, row);
        // The visible range is a diamond-shaped band; skip tiles outside the screen rectangle.
        if (top.sy - 24 * z > cam.viewH || top.sy + 64 * z < 0 ||
            top.sx + 64 * z < 0 || top.sx - 64 * z > cam.viewW) continue;
        var layers = this.terrainArt.artAt(col, row);
        for (i = 0; i < layers.length; i++) {
          var img = MCW.assets.get(layers[i]);
          var h = img.height;
          ctx.drawImage(img, top.sx - 64 * z, top.sy + (64 - h) * z, img.width * z, h * z);
        }
        if (map.unknown[map.index(col, row)]) {
          ctx.strokeStyle = "#ff00ff";
          ctx.lineWidth = 2;
          diamondPath(ctx, top.sx, top.sy, z);
          ctx.stroke();
        }
      }
    }

    for (i = 0; i < this.overlays.length; i++) this.overlays[i](ctx, this, range);
    this._drawHighlights();

    // Pass 2: objects and drawables sorted by the depth of their front corner.
    var items = this._items;
    items.length = 0;
    var objs = map.objects();
    for (i = 0; i < objs.length; i++) {
      var o = objs[i];
      var fc = o.anchor.col + o.size.w, fr = o.anchor.row + o.size.h;
      if (fc < range.c0 || o.anchor.col > range.c1 + 1 || fr < range.r0 || o.anchor.row > range.r1 + 1) continue;
      var front = cam.mapToScreen(fc, fr);
      if (front.sy < 0 || front.sy - 260 * z > cam.viewH ||
          front.sx + 128 * z < 0 || front.sx - 128 * z > cam.viewW) continue;
      items.push({ key: fc + fr, x: fc, obj: o });
    }
    for (i = 0; i < this.drawables.length; i++) {
      var d = this.drawables[i];
      items.push({ key: MCW.iso.depthKey(d.x, d.y), x: d.x, drawable: d });
    }
    items.sort(function (a, b) { return a.key - b.key || a.x - b.x; });

    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.obj) this._drawObject(it.obj);
      else {
        var s = cam.mapToScreen(it.drawable.x, it.drawable.y);
        it.drawable.draw(ctx, s.sx, s.sy, z);
      }
    }

    for (i = 0; i < this.topOverlays.length; i++) this.topOverlays[i](ctx, this);
  };

  P._drawObject = function (o) {
    var ctx = this.ctx, cam = this.camera, z = cam.zoom;
    var img = MCW.assets.get(MCW.objectArt.pictureFor(o));
    // Centre of the footprint horizontally, bottom aligned to the front (south) corner.
    var centre = cam.mapToScreen(o.anchor.col + o.size.w / 2, o.anchor.row + o.size.h / 2);
    var front = cam.mapToScreen(o.anchor.col + o.size.w, o.anchor.row + o.size.h);
    var w = img.width * z, h = img.height * z;
    var bottom = front.sy;
    // Small props stand on the tile centre rather than its front corner.
    if (o.kind !== "building") bottom = centre.sy + (img.height < 40 ? 6 : 16) * z;
    ctx.drawImage(img, centre.sx - w / 2, bottom - h, w, h);
  };

  P._drawHighlights = function () {
    var ctx = this.ctx;
    if (this.selected) {
      ctx.fillStyle = "rgba(255, 214, 0, 0.25)";
      this.diamond(this.selected.col, this.selected.row);
      ctx.fill();
    }
    if (this.hovered) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 2;
      this.diamond(this.hovered.col, this.hovered.row);
      ctx.stroke();
    }
  };

  MCW.Renderer = Renderer;
  MCW.Renderer.diamondPath = diamondPath;
})(window.MCW);

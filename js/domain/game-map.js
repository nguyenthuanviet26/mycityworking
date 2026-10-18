// Domain: GameMap — tiles, objects, collision queries and runtime overrides.
(function (MCW) {
  "use strict";

  var VARIANTS = { normal: true, damaged: true };

  function GameMap(cols, rows) {
    var n = cols * rows;
    this.cols = cols;
    this.rows = rows;
    this.terrain = new Array(n).fill(MCW.terrain.DEFAULT_TERRAIN);
    this.variant = new Array(n).fill("normal");
    this.unknown = new Array(n).fill(false);
    this.objectIdAt = new Array(n).fill(null);
    this._objects = new Map();
    this._overrides = new Map();
    this._nextId = 1;
    this._events = MCW.createEmitter();
  }

  var P = GameMap.prototype;

  // ---- basics -------------------------------------------------------------

  P.inBounds = function (col, row) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows &&
      col === Math.floor(col) && row === Math.floor(row);
  };

  P.index = function (col, row) {
    return row * this.cols + col;
  };

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  // Also clears the unknown mark and the tile variant; reports a collision change when the
  // tile's effective collision differs afterwards (feature 004 research R6).
  P.setTerrain = function (col, row, id) {
    if (!this.inBounds(col, row)) return;
    var i = this.index(col, row);
    var before = this.collisionAt(col, row);
    this.terrain[i] = id;
    this.unknown[i] = false;
    this.variant[i] = "normal";
    this._events.emit("terrainchange", { col: col, row: row });
    this._emitCollisionIfChanged(col, row, before);
  };

  P._emitCollisionIfChanged = function (col, row, before) {
    var after = this.collisionAt(col, row);
    if (before.foot === after.foot && before.vehicle === after.vehicle && before.cost === after.cost) return;
    this._events.emit("collisionchange", { col: col, row: row, before: before, after: after });
  };

  P.getTile = function (col, row) {
    if (!this.inBounds(col, row)) return null;
    var i = this.index(col, row);
    return {
      col: col,
      row: row,
      terrain: this.terrain[i],
      variant: this.variant[i],
      objectId: this.objectIdAt[i],
      unknown: this.unknown[i]
    };
  };

  // ---- objects ------------------------------------------------------------

  // Returns the placed object, or false when unknown type, outside the map or overlapping.
  P.placeObject = function (spec) {
    var entry = MCW.objectTypes.TYPES[spec.type];
    if (!entry || !spec.at) return false;
    var c = spec.at[0], r = spec.at[1], w = entry.size.w, h = entry.size.h;
    if (!this.footprintInBounds(c, r, w, h)) return false;
    if (this.footprintBlocker(c, r, w, h)) return false;

    var id = spec.id || "obj-" + this._nextId++;
    var obj = {
      id: id,
      named: !!spec.id,
      type: spec.type,
      kind: entry.kind,
      anchor: { col: c, row: r },
      size: { w: w, h: h },
      variant: spec.variant === "damaged" && entry.hasDamaged ? "damaged" : "normal",
      collision: MCW.objectTypes.collisionFor(entry.kind),
      access: spec.access ? { col: spec.access[0], row: spec.access[1] } : null
    };
    var before = this._footprintCollision(c, r, w, h);
    this._objects.set(id, obj);
    this._fillFootprint(obj, id);
    this._events.emit("objectchange", { id: id, change: "placed" });
    this._emitFootprintCollision(c, r, w, h, before);
    return obj;
  };

  // Frees the object's footprint; returns the removed object, or null for an unknown id.
  P.removeObject = function (id) {
    var obj = this._objects.get(id);
    if (!obj) return null;
    var c = obj.anchor.col, r = obj.anchor.row, w = obj.size.w, h = obj.size.h;
    var before = this._footprintCollision(c, r, w, h);
    this._objects.delete(id);
    this._fillFootprint(obj, null);
    this._events.emit("objectchange", { id: id, change: "removed" });
    this._emitFootprintCollision(c, r, w, h, before);
    return obj;
  };

  P._fillFootprint = function (obj, value) {
    for (var dr = 0; dr < obj.size.h; dr++) {
      for (var dc = 0; dc < obj.size.w; dc++) {
        this.objectIdAt[this.index(obj.anchor.col + dc, obj.anchor.row + dr)] = value;
      }
    }
  };

  P._footprintCollision = function (c, r, w, h) {
    var out = [];
    for (var dr = 0; dr < h; dr++) {
      for (var dc = 0; dc < w; dc++) out.push(this.collisionAt(c + dc, r + dr));
    }
    return out;
  };

  P._emitFootprintCollision = function (c, r, w, h, before) {
    var k = 0;
    for (var dr = 0; dr < h; dr++) {
      for (var dc = 0; dc < w; dc++) this._emitCollisionIfChanged(c + dc, r + dr, before[k++]);
    }
  };

  P.footprintInBounds = function (c, r, w, h) {
    return this.inBounds(c, r) && this.inBounds(c + w - 1, r + h - 1);
  };

  // Id of the first object already covering the footprint, or null.
  P.footprintBlocker = function (c, r, w, h) {
    for (var dr = 0; dr < h; dr++) {
      for (var dc = 0; dc < w; dc++) {
        var id = this.objectIdAt[this.index(c + dc, r + dr)];
        if (id) return id;
      }
    }
    return null;
  };

  P.getObject = function (id) {
    return this._objects.get(id) || null;
  };

  P.objectAt = function (col, row) {
    if (!this.inBounds(col, row)) return null;
    var id = this.objectIdAt[this.index(col, row)];
    return id ? this._objects.get(id) : null;
  };

  P.objects = function () {
    return Array.from(this._objects.values());
  };

  // ---- variants (FR-009) --------------------------------------------------
  // Pictures are chosen outside the domain (js/adapters/art); the map only reports changes.

  P.setTileVariant = function (col, row, variant) {
    if (!this.inBounds(col, row) || !VARIANTS[variant]) return;
    var i = this.index(col, row);
    if (this.variant[i] === variant) return;
    this.variant[i] = variant;
    this._events.emit("tilechange", { col: col, row: row, variant: variant });
  };

  P.setObjectVariant = function (id, variant) {
    var obj = this._objects.get(id);
    if (!obj || !VARIANTS[variant] || obj.variant === variant) return;
    if (variant === "damaged" && !MCW.objectTypes.TYPES[obj.type].hasDamaged) return;
    obj.variant = variant;
    this._events.emit("objectchange", { id: id, variant: variant, change: "variant" });
  };

  // ---- collision (FR-021..FR-026) ----------------------------------------

  P.collisionAt = function (col, row) {
    if (!this.inBounds(col, row)) return MCW.collision.BLOCKED;
    var i = this.index(col, row);
    var c = MCW.terrain.TYPES[this.terrain[i]].collision;
    var obj = this.objectIdAt[i] ? this._objects.get(this.objectIdAt[i]) : null;
    if (obj) c = MCW.collision.combine(c, obj.collision);
    var ov = this._overrides.get(i);
    if (ov) c = MCW.collision.combine(c, ov);
    return c;
  };

  P.isPassable = function (col, row, mode) {
    return !!this.collisionAt(col, row)[mode];
  };

  P.neighbors = function (col, row, mode) {
    var out = [];
    var self = this;
    MCW.iso.DIR_NAMES.forEach(function (dir) {
      var v = MCW.iso.DIRS[dir];
      var nc = col + v[0], nr = row + v[1];
      var c = self.collisionAt(nc, nr);
      if (c[mode]) out.push({ col: nc, row: nr, dir: dir, cost: c.cost });
    });
    return out;
  };

  P.setOverride = function (col, row, partial) {
    if (!this.inBounds(col, row)) return;
    var before = this.collisionAt(col, row);
    this._overrides.set(this.index(col, row), MCW.collision.fromPartial(partial));
    this._events.emit("collisionchange", { col: col, row: row, before: before, after: this.collisionAt(col, row) });
  };

  P.clearOverride = function (col, row) {
    if (!this.inBounds(col, row)) return;
    var i = this.index(col, row);
    if (!this._overrides.has(i)) return;
    var before = this.collisionAt(col, row);
    this._overrides.delete(i);
    this._events.emit("collisionchange", { col: col, row: row, before: before, after: this.collisionAt(col, row) });
  };

  P.hasOverride = function (col, row) {
    return this.inBounds(col, row) && this._overrides.has(this.index(col, row));
  };

  // Where a character stops to reach an object (research R11, provisional):
  // the declared access tile, else the first vehicle-passable tile beside the
  // footprint, checking the front sides (SE, SW) before the back (NE, NW).
  P.accessTile = function (id) {
    var o = this._objects.get(id);
    if (!o) return null;
    if (o.access) return { col: o.access.col, row: o.access.row };
    var c = o.anchor.col, r = o.anchor.row, w = o.size.w, h = o.size.h, i;
    var candidates = [];
    for (i = 0; i < h; i++) candidates.push([c + w, r + i]); // SE side
    for (i = 0; i < w; i++) candidates.push([c + i, r + h]); // SW side
    for (i = 0; i < w; i++) candidates.push([c + i, r - 1]); // NE side
    for (i = 0; i < h; i++) candidates.push([c - 1, r + i]); // NW side
    for (i = 0; i < candidates.length; i++) {
      if (this.isPassable(candidates[i][0], candidates[i][1], "vehicle")) {
        return { col: candidates[i][0], row: candidates[i][1] };
      }
    }
    return null;
  };

  MCW.GameMap = GameMap;
})(window.MCW);

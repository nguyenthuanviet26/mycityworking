// Application: one decorate-mode session on one map (feature 004 data-model "Editor Session").
// Tools, paint strokes, undo/redo and unsaved-change tracking. No DOM, storage or pictures:
// the work store and the registered maps are reached through ports from the composition root.
(function (MCW) {
  "use strict";

  var ID_RE = /^[a-z][a-z0-9-]{0,39}$/;
  var STEP = 0.25; // largest step, in tiles, when walking a stroke between pointer positions
  var MIN_SIZE = 5, MAX_SIZE = 100;

  function EditorSession(opts) {
    this.map = opts.map;
    this.work = Object.assign({}, opts.work);
    this.start = opts.start;
    this.store = opts.store;
    this.registered = opts.registered || { has: function () { return false; }, get: function () { return null; }, ids: function () { return []; } };
    this.tool = { kind: "select" };
    this.mode = "editing";
    this.stroke = null;
    this.history = new MCW.EditHistory();
    this.revision = 0;
    this.savedRevision = 0;
    this.everSaved = !!opts.everSaved;
    this._dirtyAtStart = !!opts.dirtyAtStart;
    this._revCounter = 0;
    this._events = MCW.createEmitter();
  }

  var P = EditorSession.prototype;

  P.on = function (evt, fn) { this._events.on(evt, fn); };
  P.off = function (evt, fn) { this._events.off(evt, fn); };

  P.setTool = function (tool) {
    if (this.stroke) this.endStroke();
    this.tool = tool || { kind: "select" };
    this._events.emit("tool", this.tool);
  };

  // ---- strokes (research R3) ---------------------------------------------

  P.beginStroke = function (pos) {
    if (this.stroke) this.endStroke();
    var kind = this.tool.kind;
    if (kind !== "paint" && kind !== "erase") return;
    this.stroke = { kind: kind, tiles: new Map(), removed: [], last: pos };
    this._visit(pos.x, pos.y);
  };

  P.extendStroke = function (pos) {
    var st = this.stroke;
    if (!st) return;
    var a = st.last;
    var dist = Math.max(Math.abs(pos.x - a.x), Math.abs(pos.y - a.y));
    var steps = Math.max(1, Math.ceil(dist / STEP));
    for (var i = 1; i <= steps; i++) {
      var k = i / steps;
      this._visit(a.x + (pos.x - a.x) * k, a.y + (pos.y - a.y) * k);
    }
    st.last = pos;
  };

  P.endStroke = function () {
    var st = this.stroke;
    if (!st) return;
    this.stroke = null;
    if (st.kind === "paint" && st.tiles.size) {
      this._record({ kind: "paint", tiles: Array.from(st.tiles.values()) });
    } else if (st.kind === "erase" && st.removed.length) {
      this._record({ kind: "remove", specs: st.removed });
    }
  };

  P.paintAt = function (col, row) {
    this.beginStroke({ x: col + 0.5, y: row + 0.5 });
    this.endStroke();
  };

  P._visit = function (x, y) {
    var col = Math.floor(x), row = Math.floor(y), map = this.map;
    if (!map.inBounds(col, row)) return;
    var st = this.stroke;
    if (st.kind === "paint") {
      var i = map.index(col, row), want = this.tool.terrain;
      if (map.terrain[i] === want) return;
      var entry = st.tiles.get(i);
      if (!entry) st.tiles.set(i, (entry = { col: col, row: row, before: map.terrain[i], after: want }));
      map.setTerrain(col, row, want);
    } else if (st.kind === "erase") {
      var obj = map.objectAt(col, row);
      if (!obj) return;
      st.removed.push(specOf(obj));
      map.removeObject(obj.id);
    }
  };

  // ---- objects --------------------------------------------------------------

  // { ok, tiles: [{col,row,inside,free}], reason? }; reason is "outside" or "occupied".
  P.checkPlacement = function (type, col, row) {
    var entry = MCW.objectTypes.TYPES[type], map = this.map;
    if (!entry) return { ok: false, tiles: [], reason: "unknown" };
    var tiles = [], outside = false, occupied = false;
    for (var dr = 0; dr < entry.size.h; dr++) {
      for (var dc = 0; dc < entry.size.w; dc++) {
        var c = col + dc, r = row + dr;
        var inside = map.inBounds(c, r);
        var free = inside && !map.objectIdAt[map.index(c, r)];
        if (!inside) outside = true;
        else if (!free) occupied = true;
        tiles.push({ col: c, row: r, inside: inside, free: free });
      }
    }
    var res = { ok: !outside && !occupied, tiles: tiles };
    if (outside) res.reason = "outside";
    else if (occupied) res.reason = "occupied";
    return res;
  };

  P.place = function (type, col, row) {
    if (!this.checkPlacement(type, col, row).ok) return false;
    var obj = this.map.placeObject({ type: type, at: [col, row] });
    if (!obj) return false;
    this._record({ kind: "place", spec: specOf(obj) });
    return true;
  };

  // Removes the whole object on the tile. Inside an eraser stroke it joins that stroke's change.
  P.eraseAt = function (col, row) {
    if (!this.map.objectAt(col, row)) return false;
    if (this.stroke && this.stroke.kind === "erase") {
      this._visit(col + 0.5, row + 0.5);
      return true;
    }
    var tool = this.tool;
    this.tool = { kind: "erase" };
    this.beginStroke({ x: col + 0.5, y: row + 0.5 });
    this.endStroke();
    this.tool = tool;
    return true;
  };

  P.toggleVariant = function (objectId) {
    var obj = this.map.getObject(objectId);
    if (!obj || !MCW.objectTypes.TYPES[obj.type].hasDamaged) return false;
    var after = obj.variant === "damaged" ? "normal" : "damaged";
    var change = { kind: "variant", id: objectId, before: obj.variant, after: after };
    this.map.setObjectVariant(objectId, after);
    this._record(change);
    return true;
  };

  // ---- applying changes ---------------------------------------------------

  // Everything needed to put an object back exactly as it was.
  function specOf(o) {
    return {
      type: o.type, at: [o.anchor.col, o.anchor.row], variant: o.variant, id: o.id, named: o.named,
      access: o.access ? [o.access.col, o.access.row] : undefined
    };
  }

  P._placeSpec = function (spec) {
    var obj = this.map.placeObject({ type: spec.type, at: spec.at, variant: spec.variant, id: spec.id, access: spec.access });
    if (obj) obj.named = !!spec.named;
    return obj;
  };

  // side: "after" applies the change, "before" reverses it.
  P._apply = function (c, side) {
    var map = this.map, self = this, forward = side === "after";
    switch (c.kind) {
      case "paint":
        c.tiles.forEach(function (t) { map.setTerrain(t.col, t.row, t[side]); });
        break;
      case "place":
        if (forward) this._placeSpec(c.spec); else map.removeObject(c.spec.id);
        break;
      case "remove":
        c.specs.forEach(function (sp) { if (forward) map.removeObject(sp.id); else self._placeSpec(sp); });
        break;
      case "variant":
        map.setObjectVariant(c.id, c[side]);
        break;
      case "reset":
        this._applyDefinition(c[side]);
        break;
    }
  };

  P._record = function (change) {
    change.rev = ++this._revCounter;
    this.history.push(change);
    this.revision = change.rev;
    this._changed();
  };

  P._topRevision = function () {
    var s = this.history.undoStack;
    return s.length ? s[s.length - 1].rev : 0;
  };

  P._changed = function () {
    this._editCount = (this._editCount || 0) + 1;
    this._events.emit("change");
    this._events.emit("dirty", this.isDirty());
  };

  P.undo = function () {
    if (this.stroke) this.endStroke();
    var c = this.history.undo();
    if (!c) return false;
    this._apply(c, "before");
    this.revision = this._topRevision();
    this._changed();
    return true;
  };

  P.redo = function () {
    if (this.stroke) this.endStroke();
    var c = this.history.redo();
    if (!c) return false;
    this._apply(c, "after");
    this.revision = c.rev;
    this._changed();
    return true;
  };

  P.canUndo = function () { return this.history.canUndo(); };
  P.canRedo = function () { return this.history.canRedo(); };

  // Unsaved changes: anything since the last save. A never-saved work with no changes has
  // nothing to lose, unless it came from somewhere that isn't kept yet (an imported file).
  P.isDirty = function () {
    if (this.revision !== this.savedRevision) return true;
    return !this.everSaved && this._dirtyAtStart;
  };

  // ---- the work: save, reset, rename ------------------------------------------

  P.definition = function () {
    return MCW.serializeMap(this.map, { id: this.work.id, name: this.work.name });
  };

  // { ok, reason? }; the work stays dirty when the store refuses (FR-020).
  P.save = function () {
    if (this.stroke) this.endStroke();
    var w = this.work;
    var res = this.store ? this.store.save({
      id: w.id, name: w.name, cols: w.cols, rows: w.rows, sourceMapId: w.sourceMapId || null,
      definition: this.definition()
    }) : { ok: false, reason: "no storage" };
    if (res && res.ok) {
      this.savedRevision = this.revision;
      this.everSaved = true;
      this._events.emit("dirty", this.isDirty());
      this._events.emit("saved");
    }
    return res || { ok: false, reason: "unknown" };
  };

  function sameLayout(a, b) {
    return a.terrain === b.terrain && JSON.stringify(a.objects) === JSON.stringify(b.objects);
  }

  // Back to the starting layout, as one undoable change (FR-019).
  P.reset = function () {
    if (this.stroke) this.endStroke();
    var before = this.definition();
    var after = MCW.serializeMap(MCW.parseMap(this.start).map, { id: this.work.id, name: this.work.name });
    if (sameLayout(before, after)) return false;
    var change = { kind: "reset", before: before, after: after };
    this._apply(change, "after");
    this._record(change);
    return true;
  };

  // Rebuilds the layout in place; the map's size never changes.
  P._applyDefinition = function (def) {
    var map = this.map, src = MCW.parseMap(def).map, self = this;
    map.objects().forEach(function (o) { map.removeObject(o.id); });
    for (var row = 0; row < map.rows; row++) {
      for (var col = 0; col < map.cols; col++) {
        var t = src.inBounds(col, row) ? src.terrain[src.index(col, row)] : MCW.terrain.DEFAULT_TERRAIN;
        if (map.terrain[map.index(col, row)] !== t) map.setTerrain(col, row, t);
      }
    }
    src.objects().forEach(function (o) { self._placeSpec(specOf(o)); });
  };

  // { ok, error? }. A saved work moves to its new id in the store.
  P.rename = function (name, id) {
    name = String(name || "").trim();
    var err = EditorSession.nameError(name);
    if (err) return { ok: false, error: err };
    var others = this.store ? this.store.list().map(function (m) { return m.id; }) : [];
    var self = this;
    err = EditorSession.idError(id, others.filter(function (x) { return x !== self.work.id; }));
    if (err) return { ok: false, error: err };
    var oldId = this.work.id;
    this.work.name = name;
    this.work.id = id;
    if (this.everSaved && this.store) {
      var stored = this.store.load(oldId);
      if (stored.ok) {
        var w = Object.assign({}, stored.work, { id: id, name: name });
        w.definition = Object.assign({}, w.definition, { id: id, name: name });
        var res = this.store.save(w);
        if (!res.ok) return { ok: false, error: "Could not save in this browser (" + res.reason + ")" };
        if (oldId !== id) this.store.remove(oldId);
      }
    }
    this._events.emit("change");
    return { ok: true };
  };

  P.problems = function () {
    if (!this._problems || this._problemsAt !== this._editCount) {
      this._problems = MCW.mapChecks(this.map);
      this._problemsAt = this._editCount;
    }
    return this._problems;
  };

  // What the export panel shows (research R13).
  P.exportInfo = function () {
    var id = this.work.id, reg = this.registered;
    var replaces = this.work.sourceMapId === id && reg.has(id);
    var clash = !replaces && reg.has(id) ? EditorSession.nextFreeId(id, reg.ids()) : null;
    return {
      definition: this.definition(),
      fileName: id + ".js",
      scriptLine: replaces ? null : '<script src="maps/' + id + '.js"></script>',
      replaces: replaces,
      clash: clash,
      problems: this.problems()
    };
  };

  // ---- test play (research R2) ---------------------------------------------

  P.testPlay = function () {
    if (this.mode === "testing") return;
    if (this.stroke) this.endStroke();
    this.mode = "testing";
    this._events.emit("mode", this.mode);
  };

  P.backToEditor = function () {
    if (this.mode === "editing") return;
    this.mode = "editing";
    this._events.emit("mode", this.mode);
  };

  // ---- static helpers for the chooser ---------------------------------------

  function sizeOk(n) {
    return n === Math.floor(n) && n >= MIN_SIZE && n <= MAX_SIZE;
  }

  EditorSession.ID_RE = ID_RE;

  EditorSession.nameError = function (name) {
    var n = String(name || "").trim();
    if (!n) return "Give the map a name";
    if (n.length > 60) return "Use at most 60 characters";
    return null;
  };

  EditorSession.idError = function (id, takenIds) {
    if (!ID_RE.test(id || "")) return "Use 1–40 lowercase letters, digits or -, starting with a letter";
    if (takenIds && takenIds.indexOf(id) >= 0) return "This id is already used";
    return null;
  };

  EditorSession.validateNewMap = function (m, existingIds) {
    var errors = {};
    var e = EditorSession.nameError(m.name);
    if (e) errors.name = e;
    e = EditorSession.idError(m.id, existingIds);
    if (e) errors.id = e;
    if (!sizeOk(Number(m.cols))) errors.cols = "Use a whole number from 5 to 100";
    if (!sizeOk(Number(m.rows))) errors.rows = "Use a whole number from 5 to 100";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  };

  EditorSession.blankDefinition = function (m) {
    var line = new Array(m.cols + 1).join(".");
    var lines = [];
    for (var r = 0; r < m.rows; r++) lines.push(line);
    return { id: m.id, name: m.name, terrain: "\n" + lines.join("\n") + "\n", objects: [] };
  };

  EditorSession.suggestId = function (name) {
    var id = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!id) return "map";
    if (!/^[a-z]/.test(id)) id = "map-" + id;
    return id.slice(0, 40).replace(/-+$/, "");
  };

  EditorSession.nextFreeId = function (id, takenIds) {
    var n = 2;
    while (takenIds.indexOf(id + "-" + n) >= 0) n++;
    return id + "-" + n;
  };

  // Checks a definition read from a file before anything is created (contracts/map-file.md).
  // opts: { knownTerrain, knownTypes, workIds } → { ok, errors, conflict? }
  EditorSession.checkImport = function (def, opts) {
    var errors = [];
    if (!def || typeof def !== "object") return { ok: false, errors: ["The file has no map data"] };
    if (typeof def.id !== "string" || !ID_RE.test(def.id)) {
      errors.push('Map id "' + def.id + '" is not valid (use lowercase letters, digits and -)');
    }
    var lines = typeof def.terrain === "string" ? def.terrain.split(/\r?\n/) : [];
    while (lines.length && lines[0].trim() === "") lines.shift();
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    if (!lines.length) {
      errors.push("The file has no terrain grid");
    } else {
      var rows = lines.length, cols = Math.max.apply(null, lines.map(function (l) { return l.length; }));
      if (cols > MAX_SIZE || rows > MAX_SIZE) {
        errors.push("The map is " + cols + "×" + rows + " tiles; the most is 100×100");
      } else {
        var legend = Object.assign({}, MCW.terrain.DEFAULT_LEGEND, def.legend && typeof def.legend === "object" ? def.legend : {});
        var bad = 0;
        lines.forEach(function (line, row) {
          for (var col = 0; col < line.length && bad < 5; col++) {
            if (opts.knownTerrain.indexOf(legend[line[col]]) < 0) {
              errors.push('Unknown terrain character "' + line[col] + '" at (' + col + "," + row + ")");
              bad++;
            }
          }
        });
      }
    }
    if (def.objects !== undefined) {
      var list = Array.isArray(def.objects) ? def.objects : [def.objects];
      var unknown = [];
      list.forEach(function (o, i) {
        var at = o && o.at;
        var atOk = Array.isArray(at) && at.length === 2 && at.every(function (n) { return typeof n === "number" && n === Math.floor(n); });
        if (o && typeof o.type === "string" && opts.knownTypes.indexOf(o.type) < 0 && unknown.indexOf(o.type) < 0 && unknown.length < 5) {
          unknown.push(o.type);
          errors.push('Unknown object type "' + o.type + '"');
        }
        if (!o || typeof o.type !== "string" || !atOk) errors.push("Object #" + (i + 1) + ' has no valid "at" position');
      });
    }
    var res = { ok: errors.length === 0, errors: errors };
    if (res.ok && opts.workIds && opts.workIds.indexOf(def.id) >= 0) res.conflict = "work-id-exists";
    return res;
  };

  MCW.EditorSession = EditorSession;
})(window.MCW);

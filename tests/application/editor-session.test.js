describe("editor-session", function () {
  var S = MCW.EditorSession;

  function nullStore() {
    return {
      list: function () { return []; },
      load: function () { return { ok: false, reason: "none" }; },
      save: function () { return { ok: true }; },
      remove: function () { return { ok: true }; }
    };
  }

  // A session on a parsed map. opts: terrain, objects, work fields, store, start, everSaved.
  function session(opts) {
    opts = opts || {};
    var def = { id: "t", name: "T", terrain: opts.terrain || "......\n......\n......\n......", objects: opts.objects || [] };
    var map = MCW.parseMap(def).map;
    var work = Object.assign({ id: "t", name: "T", cols: map.cols, rows: map.rows, sourceMapId: null }, opts.work || {});
    return new S({
      map: map, work: work, start: opts.start || def, store: opts.store || nullStore(),
      registered: opts.registered, everSaved: opts.everSaved
    });
  }

  function terrainRow(s, row) {
    var out = "";
    for (var c = 0; c < s.map.cols; c++) out += s.map.terrain[s.map.index(c, row)].charAt(0);
    return out;
  }

  describe("new map helpers", function () {
    it("validateNewMap accepts a good map", function () {
      assertEqual(S.validateNewMap({ name: "Town", id: "town", cols: 30, rows: 30 }, []), { ok: true, errors: {} });
    });

    it("validateNewMap names each bad field", function () {
      var r = S.validateNewMap({ name: "", id: "Bad Id", cols: 4, rows: 101 }, []);
      assertEqual(r.ok, false);
      assertEqual(Object.keys(r.errors).sort(), ["cols", "id", "name", "rows"]);
      var long = new Array(62).join("x");
      assertTrue(S.validateNewMap({ name: long, id: "a", cols: 5, rows: 100 }, []).errors.name, "61 chars");
      assertTrue(S.validateNewMap({ name: "A", id: "1a", cols: 5, rows: 5 }, []).errors.id, "starts with a digit");
      assertTrue(S.validateNewMap({ name: "A", id: "a" + new Array(41).join("b"), cols: 5, rows: 5 }, []).errors.id, "41 chars");
      assertTrue(S.validateNewMap({ name: "A", id: "town", cols: 5, rows: 5 }, ["town"]).errors.id, "taken");
    });

    it("blankDefinition is all grass with no objects", function () {
      var d = S.blankDefinition({ id: "b", name: "B", cols: 20, rows: 20 });
      var m = MCW.parseMap(d).map;
      assertEqual([m.cols, m.rows], [20, 20]);
      assertTrue(m.terrain.every(function (t) { return t === "grass"; }), "all grass");
      assertEqual(m.objects().length, 0);
      assertEqual([d.id, d.name], ["b", "B"]);
    });

    it("suggestId makes a valid id from a name", function () {
      assertEqual(S.suggestId("Test Town!"), "test-town");
      assertEqual(S.suggestId("123 Go"), "map-123-go");
      assertEqual(S.suggestId(""), "map");
    });
  });

  describe("painting", function () {
    it("paintAt sets one tile and records one change", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(2, 3);
      assertEqual(s.map.getTile(2, 3).terrain, "road");
      assertEqual(s.history.undoStack.length, 1);
    });

    it("a fast stroke paints every tile in between as one change", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "road" });
      s.beginStroke({ x: 0.5, y: 0.5 });
      s.extendStroke({ x: 6.5, y: 0.5 });
      s.endStroke();
      assertEqual(terrainRow(s, 0), "rrrrrr");
      assertEqual(terrainRow(s, 1), "gggggg");
      assertEqual(s.history.undoStack.length, 1);
      assertEqual(s.history.undoStack[0].kind, "paint");
      assertEqual(s.history.undoStack[0].tiles.length, 6);
    });

    it("a diagonal stroke leaves no gaps between tiles", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "water" });
      s.beginStroke({ x: 0.5, y: 0.5 });
      s.extendStroke({ x: 3.5, y: 3.5 });
      s.endStroke();
      // every painted tile touches the next one by an edge or a corner
      [[0, 0], [1, 1], [2, 2], [3, 3]].forEach(function (p) {
        assertEqual(s.map.getTile(p[0], p[1]).terrain, "water", String(p));
      });
    });

    it("positions outside the map are skipped", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "road" });
      s.beginStroke({ x: -3, y: 0.5 });
      s.extendStroke({ x: 1.5, y: 0.5 });
      s.extendStroke({ x: 1.5, y: 9 });
      s.endStroke();
      assertEqual(terrainRow(s, 0), "rrgggg");
      assertEqual(terrainRow(s, 3), "grgggg");
    });

    it("painting the same terrain records nothing", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "grass" });
      s.paintAt(1, 1);
      assertEqual(s.history.canUndo(), false);
      assertEqual(s.isDirty(), false);
    });

    it("undo restores and redo re-applies a stroke", function () {
      var s = session({ terrain: ",,....\n......" });
      s.setTool({ kind: "paint", terrain: "road" });
      s.beginStroke({ x: 0.5, y: 0.5 });
      s.extendStroke({ x: 3.5, y: 0.5 });
      s.endStroke();
      assertTrue(s.undo());
      assertEqual(terrainRow(s, 0), "ddgggg");
      assertTrue(s.redo());
      assertEqual(terrainRow(s, 0), "rrrrgg");
      assertEqual(s.redo(), false);
    });

    it("painting under a building keeps the building", function () {
      var s = session({ objects: [{ type: "hospital_a", at: [1, 1], id: "h" }] });
      s.setTool({ kind: "paint", terrain: "concrete" });
      s.paintAt(1, 1);
      assertEqual(s.map.getTile(1, 1).terrain, "concrete");
      assertEqual(s.map.objectAt(1, 1).id, "h");
      assertEqual(s.map.collisionAt(1, 1).foot, false);
    });

    it("dirty after a change; not dirty for an untouched new map", function () {
      var s = session();
      assertEqual(s.isDirty(), false);
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      assertEqual(s.isDirty(), true);
    });

    it("blur or cancel mid-stroke ends it as one change", function () {
      var s = session();
      s.setTool({ kind: "paint", terrain: "road" });
      s.beginStroke({ x: 0.5, y: 0.5 });
      s.extendStroke({ x: 2.5, y: 0.5 });
      s.setTool({ kind: "select" });
      assertEqual(s.stroke, null);
      assertEqual(s.history.undoStack.length, 1);
    });

    it("emits change on paint, undo and redo", function () {
      var s = session();
      var n = 0;
      s.on("change", function () { n++; });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.undo();
      s.redo();
      assertEqual(n, 3);
    });
  });

  describe("objects", function () {
    it("checkPlacement on free tiles is ok with 4 footprint tiles", function () {
      var s = session();
      var r = s.checkPlacement("hospital_a", 1, 1);
      assertEqual(r.ok, true);
      assertEqual(r.tiles.length, 4);
      assertTrue(r.tiles.every(function (t) { return t.inside && t.free; }), "all inside and free");
    });

    it("checkPlacement off the map is outside", function () {
      var s = session();
      var r = s.checkPlacement("hospital_a", 5, 1);
      assertEqual(r.ok, false);
      assertEqual(r.reason, "outside");
      assertEqual(r.tiles.filter(function (t) { return !t.inside; }).length, 2);
    });

    it("checkPlacement over an object is occupied", function () {
      var s = session({ objects: [{ type: "house_small_blue_a", at: [2, 2] }] });
      var r = s.checkPlacement("hospital_a", 1, 1);
      assertEqual(r.ok, false);
      assertEqual(r.reason, "occupied");
      assertEqual(r.tiles.filter(function (t) { return !t.free; }), [{ col: 2, row: 2, inside: true, free: false }]);
    });

    it("place records nothing when not allowed", function () {
      var s = session({ objects: [{ type: "house_small_blue_a", at: [2, 2] }] });
      assertEqual(s.place("hospital_a", 1, 1), false);
      assertEqual(s.history.canUndo(), false);
    });

    it("place, undo and redo keep the same id", function () {
      var s = session();
      assertEqual(s.place("house_small_blue_a", 2, 2), true);
      var id = s.map.objectAt(2, 2).id;
      assertEqual(s.history.undoStack[0].kind, "place");
      s.undo();
      assertEqual(s.map.objectAt(2, 2), null);
      s.redo();
      assertEqual(s.map.objectAt(2, 2).id, id);
      assertEqual(s.map.objectAt(2, 2).named, false);
    });

    it("erase removes a whole footprint from any of its tiles", function () {
      var s = session({ objects: [{ type: "hospital_a", at: [1, 1] }] });
      s.setTool({ kind: "erase" });
      assertEqual(s.eraseAt(2, 2), true);
      assertEqual(s.map.objects().length, 0);
    });

    it("undoing an erase restores id, named, variant and access", function () {
      var s = session({ objects: [{ type: "hospital_a", at: [1, 1], id: "hospital", variant: "damaged", access: [3, 1] }] });
      s.setTool({ kind: "erase" });
      s.eraseAt(1, 1);
      s.undo();
      var o = s.map.getObject("hospital");
      assertEqual([o.named, o.variant, o.access], [true, "damaged", { col: 3, row: 1 }]);
    });

    it("an eraser stroke over 3 objects is one change", function () {
      var s = session({ objects: [
        { type: "house_small_blue_a", at: [0, 0] },
        { type: "tree_pine_tall", at: [2, 0] },
        { type: "sign_stop_a", at: [4, 0] }
      ] });
      s.setTool({ kind: "erase" });
      s.beginStroke({ x: 0.5, y: 0.5 });
      s.extendStroke({ x: 5.5, y: 0.5 });
      s.endStroke();
      assertEqual(s.map.objects().length, 0);
      assertEqual(s.history.undoStack.length, 1);
      assertEqual(s.history.undoStack[0].specs.length, 3);
      s.undo();
      assertEqual(s.map.objects().length, 3);
    });

    it("erasing empty ground records nothing", function () {
      var s = session();
      s.setTool({ kind: "erase" });
      assertEqual(s.eraseAt(1, 1), false);
      assertEqual(s.history.canUndo(), false);
    });

    it("toggleVariant only when damaged art exists, and undoes", function () {
      var s = session({ objects: [{ type: "house_small_blue_a", at: [0, 0], id: "h" }, { type: "tree_pine_tall", at: [2, 0], id: "t" }] });
      assertEqual(s.toggleVariant("t"), false);
      assertEqual(s.toggleVariant("h"), true);
      assertEqual(s.map.getObject("h").variant, "damaged");
      assertEqual(s.history.undoStack[0].kind, "variant");
      s.undo();
      assertEqual(s.map.getObject("h").variant, "normal");
    });

    it("collision follows every object change at once", function () {
      var s = session();
      s.place("hospital_a", 1, 1);
      assertEqual(s.map.collisionAt(2, 2).foot, false);
      s.setTool({ kind: "erase" });
      s.eraseAt(2, 2);
      assertEqual(s.map.collisionAt(2, 2).foot, true);
    });
  });

  // In-memory work store port; failSave makes save() report a full browser storage.
  function memStore(failSave) {
    var data = {};
    return {
      data: data,
      list: function () { return Object.keys(data).map(function (k) { return { id: k, name: data[k].name }; }); },
      load: function (id) { return data[id] ? { ok: true, work: data[id] } : { ok: false, reason: "missing" }; },
      save: function (w) {
        if (failSave) return { ok: false, reason: "quota" };
        data[w.id] = JSON.parse(JSON.stringify(w));
        return { ok: true };
      },
      remove: function (id) { delete data[id]; return { ok: true }; }
    };
  }

  describe("work", function () {
    it("save stores the serialized layout and clears dirty", function () {
      var store = memStore();
      var s = session({ store: store, work: { sourceMapId: "sample-city" } });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      assertEqual(s.save(), { ok: true });
      var w = store.data.t;
      assertEqual([w.id, w.name, w.cols, w.rows, w.sourceMapId], ["t", "T", 6, 4, "sample-city"]);
      assertEqual(w.definition, MCW.serializeMap(s.map, { id: "t", name: "T" }));
      assertEqual(s.isDirty(), false);
      assertEqual(s.everSaved, true);
    });

    it("undoing back to the saved state is not dirty", function () {
      var s = session({ store: memStore() });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.save();
      s.paintAt(1, 0);
      assertEqual(s.isDirty(), true);
      s.undo();
      assertEqual(s.isDirty(), false);
    });

    it("a new change after undo is dirty even at the same depth", function () {
      var s = session({ store: memStore() });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.save();
      s.undo();
      s.setTool({ kind: "paint", terrain: "water" });
      s.paintAt(3, 3);
      assertEqual(s.isDirty(), true);
    });

    it("a failed save reports why and stays dirty", function () {
      var s = session({ store: memStore(true) });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      assertEqual(s.save(), { ok: false, reason: "quota" });
      assertEqual(s.isDirty(), true);
    });

    it("saving keeps the undo history", function () {
      var s = session({ store: memStore() });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.save();
      assertEqual(s.canUndo(), true);
    });

    it("reset returns to the start layout as one undoable change", function () {
      var start = S.blankDefinition({ id: "t", name: "T", cols: 6, rows: 4 });
      var s = session({ start: start, objects: [{ type: "house_small_blue_a", at: [1, 1] }] });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.reset();
      assertTrue(s.map.terrain.every(function (t) { return t === "grass"; }), "all grass");
      assertEqual(s.map.objects().length, 0);
      assertEqual(s.history.undoStack[s.history.undoStack.length - 1].kind, "reset");
      s.undo();
      assertEqual(s.map.getTile(0, 0).terrain, "road");
      assertEqual(s.map.objectAt(1, 1).type, "house_small_blue_a");
      s.redo();
      assertEqual(s.map.objects().length, 0);
    });

    it("reset of a copy returns to the registered layout", function () {
      var def = { id: "t", name: "T", terrain: "rr....\n......\n......\n......", objects: [{ type: "tree_pine_tall", at: [3, 3], id: "tree" }] };
      var s = session({ terrain: def.terrain, objects: def.objects, start: def });
      s.setTool({ kind: "erase" });
      s.eraseAt(3, 3);
      s.reset();
      assertEqual(s.map.getObject("tree").named, true);
    });

    it("reset with nothing changed records nothing", function () {
      var s = session();
      s.reset();
      assertEqual(s.canUndo(), false);
    });

    it("rename checks the name and id rules and other saved works", function () {
      var store = memStore();
      store.save({ id: "other", name: "Other" });
      var s = session({ store: store });
      assertEqual(s.rename("", "t").ok, false);
      assertEqual(s.rename(new Array(62).join("x"), "t").ok, false);
      assertEqual(s.rename("New", "Bad Id").ok, false);
      assertEqual(s.rename("New", "other").ok, false);
      assertEqual(s.rename("New name", "new-id"), { ok: true });
      assertEqual([s.work.name, s.work.id], ["New name", "new-id"]);
    });

    it("rename moves a saved work to its new id", function () {
      var store = memStore();
      var s = session({ store: store });
      s.save();
      s.rename("T", "moved");
      assertEqual(Object.keys(store.data), ["moved"]);
      assertEqual(store.data.moved.definition.id, "moved");
    });

    it("test play switches mode and keeps the history", function () {
      var s = session();
      var modes = [];
      s.on("mode", function (m) { modes.push(m); });
      s.setTool({ kind: "paint", terrain: "road" });
      s.paintAt(0, 0);
      s.testPlay();
      assertEqual(s.mode, "testing");
      s.backToEditor();
      assertEqual(s.mode, "editing");
      assertEqual(modes, ["testing", "editing"]);
      assertEqual(s.canUndo(), true);
    });

    it("problems follow changes", function () {
      var s = session({ terrain: "......\n......\n......\n......" });
      assertEqual(s.problems(), []);
      s.setTool({ kind: "paint", terrain: "bridge" });
      s.paintAt(2, 2);
      assertEqual(s.problems().map(function (p) { return p.code; }), ["bridge-not-crossing"]);
    });
  });

  describe("export and import", function () {
    function reg(ids) {
      var defs = {};
      ids.forEach(function (id) { defs[id] = { id: id, terrain: "....." }; });
      return {
        ids: function () { return Object.keys(defs); },
        has: function (id) { return !!defs[id]; },
        get: function (id) { return defs[id] || null; }
      };
    }

    it("exportInfo for a new id gives the script line", function () {
      var s = session({ work: { id: "harbour", name: "Harbour" }, registered: reg(["sample-city"]) });
      var info = s.exportInfo();
      assertEqual(info.fileName, "harbour.js");
      assertEqual(info.scriptLine, '<script src="maps/harbour.js"></script>');
      assertEqual([info.replaces, info.clash], [false, null]);
      assertEqual(info.definition.id, "harbour");
      assertEqual(info.problems, []);
    });

    it("exportInfo for a copy with its source id replaces the file", function () {
      var s = session({ work: { id: "sample-city", sourceMapId: "sample-city" }, registered: reg(["sample-city"]) });
      var info = s.exportInfo();
      assertEqual([info.replaces, info.scriptLine, info.clash], [true, null, null]);
    });

    it("exportInfo warns when the id belongs to another map", function () {
      var s = session({ work: { id: "tiny", sourceMapId: null }, registered: reg(["tiny", "tiny-2"]) });
      assertEqual(s.exportInfo().clash, "tiny-3");
    });

    var OK = { knownTerrain: Object.keys(MCW.terrain.TYPES), knownTypes: Object.keys(MCW.objectTypes.TYPES), workIds: [] };

    it("checkImport accepts a good definition", function () {
      var r = S.checkImport({ id: "town", terrain: "\n..r\n..r\n", objects: [{ type: "tree_pine_tall", at: [0, 0] }] }, OK);
      assertEqual(r, { ok: true, errors: [] });
    });

    it("checkImport rejects with the contract's messages", function () {
      function errs(def) { return S.checkImport(def, OK).errors; }
      assertEqual(errs({ id: "Bad", terrain: "." }), ['Map id "Bad" is not valid (use lowercase letters, digits and -)']);
      assertEqual(errs({ id: "a" }), ["The file has no terrain grid"]);
      assertEqual(errs({ id: "a", terrain: new Array(102).join(".") }), ["The map is 101×1 tiles; the most is 100×100"]);
      assertEqual(errs({ id: "a", terrain: ".q.\n.Z." }), ['Unknown terrain character "q" at (1,0)', 'Unknown terrain character "Z" at (1,1)']);
      assertEqual(errs({ id: "a", terrain: "qqqqqqq" }).length, 5);
      assertEqual(errs({ id: "a", terrain: "...", objects: [{ type: "spaceship_a", at: [0, 0] }] }), ['Unknown object type "spaceship_a"']);
      assertEqual(errs({ id: "a", terrain: "...", objects: [{ type: "tree_pine_tall", at: [0] }] }), ['Object #1 has no valid "at" position']);
      assertEqual(errs({ id: "a", terrain: "...", objects: "x" }), ['Object #1 has no valid "at" position']);
    });

    it("checkImport reports a saved-work id conflict", function () {
      var r = S.checkImport({ id: "town", terrain: "..." }, Object.assign({}, OK, { workIds: ["town"] }));
      assertEqual([r.ok, r.conflict], [true, "work-id-exists"]);
    });

    it("nextFreeId adds the first free number", function () {
      assertEqual(S.nextFreeId("town", ["town", "town-2"]), "town-3");
      assertEqual(S.nextFreeId("town", []), "town-2");
    });
  });
});

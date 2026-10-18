// Adapter: decorate-mode screens in the DOM (feature 004 contracts/editor-ui.md): the chooser,
// the palette, the top bar, the export panel and the prompts. Turns clicks, keys and pointer
// strokes into EditorSession calls; holds no editing rules itself. Storage, files and the map
// file format come in through `io` from the composition root.
(function (MCW) {
  "use strict";

  var S = function () { return MCW.EditorSession; };

  // el("div.cls", {attr: v, onclick: fn}, [children or text])
  function el(spec, attrs, children) {
    var parts = spec.split(".");
    var node = document.createElement(parts[0] || "div");
    if (parts.length > 1) node.className = parts.slice(1).join(" ");
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
      else if (k === "text") node.textContent = v;
      else if (k in node && k !== "list") node[k] = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Picture shown for a palette piece.
  function piecePicture(p) {
    var D = "Roads and Grounds/";
    if (p.kind === "object") return MCW.objectArt.ART[p.id].file;
    if (p.id === "road") return D + "tile_road_straight_SE_normal.png";
    if (p.id === "bridge") return D + "tile_road_bridge_body_SE_normal.png";
    return D + "tile_ground_" + p.id + ".png";
  }

  function sizeOfDefinition(def) {
    var m = MCW.parseMap(def).map;
    return { cols: m.cols, rows: m.rows };
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function localTime(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function copyText(text, button) {
    function done() { button.textContent = "Copied"; }
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(button.previousSibling);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      button.textContent = "Press Ctrl+C";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // io: { store, files: {download, pickText}, mapFile: {format, read, scriptLine}, imageSrc(path) }
  function EditorUI(root, io) {
    this.root = el("div", { id: "editor-layer" });
    root.appendChild(this.root);
    this.io = io;
    this.game = null;
    this.session = null;
    this.modal = null;
  }

  var P = EditorUI.prototype;

  // ---- chooser ------------------------------------------------------------

  // A copy of a registered map: { definition, work, start }.
  P.choiceForCopy = function (registered, id) {
    var def = registered.get(id);
    var size = sizeOfDefinition(def);
    return {
      definition: def,
      start: def,
      work: { id: def.id, name: def.name || def.id, cols: size.cols, rows: size.rows, sourceMapId: def.id },
      everSaved: false
    };
  };

  // A saved work: { choice } or { error }.
  P.choiceForWork = function (registered, id) {
    var res = this.io.store.load(id);
    if (!res.ok) return { error: 'Unknown saved work "' + id + '"' };
    var w = res.work, src = w.sourceMapId && registered.has(w.sourceMapId) ? registered.get(w.sourceMapId) : null;
    return {
      choice: {
        definition: w.definition,
        start: src || S().blankDefinition({ id: w.id, name: w.name, cols: w.cols, rows: w.rows }),
        work: { id: w.id, name: w.name, cols: w.cols, rows: w.rows, sourceMapId: w.sourceMapId || null, savedAt: w.savedAt },
        everSaved: true
      }
    };
  };

  // opts: { registered, error, onOpen(choice) }
  P.showChooser = function (opts) {
    var self = this;
    this.hideChooser();
    var registered = opts.registered;
    var works = this.io.store.list();
    opts.workIds = works.map(function (w) { return w.id; });

    var workRows = works.map(function (w) {
      return el("li.ed-row", {}, [
        el("span.ed-row-main", {}, [el("b", { text: w.name }), " ", el("code", { text: w.id }),
          el("span.ed-dim", { text: " · " + w.cols + "×" + w.rows + " · saved " + localTime(w.savedAt) })]),
        el("button.ed-btn.ed-primary", { type: "button", text: "Open", onclick: function () {
          var r = self.choiceForWork(registered, w.id);
          if (r.error) self.showChooser(Object.assign({}, opts, { error: r.error }));
          else opts.onOpen(r.choice);
        } }),
        el("button.ed-btn", { type: "button", text: "Rename", onclick: function () { self._renameWorkPrompt(w, opts); } }),
        el("button.ed-btn.ed-danger", { type: "button", text: "Delete", onclick: function () {
          self.confirm("Delete " + w.name + " from this browser? This cannot be undone.", "Delete", function () {
            var res = self.io.store.remove(w.id);
            self.showChooser(Object.assign({}, opts, { error: res.ok ? null : "Could not delete (" + res.reason + ")" }));
          }, true);
        } })
      ]);
    });

    var mapRows = registered.ids().map(function (id) {
      var def = registered.get(id), size = sizeOfDefinition(def);
      return el("li.ed-row", {}, [
        el("span.ed-row-main", {}, [el("b", { text: def.name || id }), " ", el("code", { text: id }), el("span.ed-dim", { text: " · " + size.cols + "×" + size.rows })]),
        el("button.ed-btn", { type: "button", text: "Decorate a copy", onclick: function () { opts.onOpen(self.choiceForCopy(registered, id)); } })
      ]);
    });

    var form = this._newMapForm(registered, opts);

    this.chooser = el("div.ed-chooser", {}, [
      el("div.ed-card", {}, [
        el("h1", { text: "Map decorator" }),
        el("p.ed-dim", { text: "Developer tool: make sample maps and send the map file to your team." }),
        opts.error ? el("p.ed-error", { text: opts.error }) : null,
        el("h2", { text: "Saved works" }),
        workRows.length ? el("ul.ed-list", {}, workRows) : el("p.ed-dim", { text: "Nothing saved in this browser yet." }),
        el("h2", { text: "Registered maps" }),
        el("ul.ed-list", {}, mapRows),
        el("h2", { text: "New blank map" }),
        form,
        el("h2", { text: "Import a map file" }),
        el("p.ed-dim", { text: "Open a map file a teammate sent you (an exported .js file, or one from maps/)." }),
        el("button.ed-btn", { type: "button", text: "Import map file…", onclick: function () { self._importFile(opts); } }),
        el("p", {}, [el("a.ed-link", { href: "index.html", text: "← Back to the game" })])
      ])
    ]);
    this.root.appendChild(this.chooser);
  };

  P.hideChooser = function () {
    if (this.chooser) this.chooser.remove();
    this.chooser = null;
  };

  P._newMapForm = function (registered, opts) {
    var idEdited = false;
    function field(label, input, errId) {
      return el("label.ed-field", {}, [el("span", { text: label }), input, el("span.ed-field-error", { id: errId })]);
    }
    var name = el("input", { type: "text", value: "", maxLength: 60, placeholder: "e.g. Harbour Town" });
    var id = el("input", { type: "text", value: "", maxLength: 40, placeholder: "harbour-town" });
    var cols = el("input", { type: "number", value: "30", min: "5", max: "100" });
    var rows = el("input", { type: "number", value: "30", min: "5", max: "100" });
    var create = el("button.ed-btn.ed-primary", { type: "button", text: "Create", disabled: true });
    var errs = {};

    // A clash with a registered map is reported at export (research R13); saved works can't share an id.
    function taken() {
      return opts.workIds || [];
    }
    function values() {
      return { name: name.value.trim(), id: id.value.trim(), cols: Number(cols.value), rows: Number(rows.value) };
    }
    function check() {
      if (!idEdited) id.value = S().suggestId(name.value);
      var v = values();
      var r = S().validateNewMap(v, taken());
      ["name", "id", "cols", "rows"].forEach(function (k) {
        // Don't nag about an untouched empty name.
        var msg = r.errors[k] || "";
        if (k === "name" && !name.value) msg = "";
        errs[k].textContent = msg;
      });
      create.disabled = !r.ok;
      return r.ok;
    }

    var f = el("div.ed-form", {}, [
      field("Name", name, "err-name"),
      field("Id", id, "err-id"),
      el("div.ed-form-row", {}, [field("Columns", cols, "err-cols"), field("Rows", rows, "err-rows")]),
      create
    ]);
    ["name", "id", "cols", "rows"].forEach(function (k) { errs[k] = f.querySelector("#err-" + k); });
    name.addEventListener("input", check);
    id.addEventListener("input", function () { idEdited = true; check(); });
    cols.addEventListener("input", check);
    rows.addEventListener("input", check);
    create.addEventListener("click", function () {
      if (!check()) return;
      var v = values();
      var def = S().blankDefinition(v);
      opts.onOpen({ definition: def, start: def, work: { id: v.id, name: v.name, cols: v.cols, rows: v.rows, sourceMapId: null }, everSaved: false });
    });
    return f;
  };

  P._renameWorkPrompt = function (w, opts) {
    var self = this, store = this.io.store;
    this._nameIdPrompt("Rename saved work", w.name, w.id, function (name, id) {
      var others = opts.workIds.filter(function (x) { return x !== w.id; });
      var err = S().nameError(name) || S().idError(id, others);
      if (err) return err;
      var res = store.load(w.id);
      if (!res.ok) return res.reason;
      var work = Object.assign({}, res.work, { id: id, name: name });
      work.definition = Object.assign({}, work.definition, { id: id, name: name });
      var saved = store.save(work);
      if (!saved.ok) return "Could not save in this browser (" + saved.reason + ")";
      if (id !== w.id) store.remove(w.id);
      self.showChooser(Object.assign({}, opts, { error: null }));
      return null;
    });
  };

  // Import: pick → read as data → check → (conflict?) → open (contracts/map-file.md).
  P._importFile = function (opts) {
    var self = this, io = this.io, registered = opts.registered;
    function fail(msg) { self.showChooser(Object.assign({}, opts, { error: msg })); }
    io.files.pickText({ accept: ".js", maxBytes: 1048576 }).then(function (picked) {
      if (!picked.ok) {
        if (picked.reason !== "cancelled") fail("Could not import: " + picked.reason);
        return;
      }
      var read = io.mapFile.read(picked.text);
      if (!read.ok) return fail("Could not import " + picked.name + ": " + read.error);
      var def = read.definition;
      var check = S().checkImport(def, {
        knownTerrain: Object.keys(MCW.terrain.TYPES),
        knownTypes: Object.keys(MCW.objectTypes.TYPES),
        workIds: opts.workIds
      });
      if (!check.ok) return fail("Could not import " + picked.name + ": " + check.errors.join("; "));
      function openAs(id) {
        var d = Object.assign({}, def, { id: id, name: def.name || id });
        var size = sizeOfDefinition(d);
        opts.onOpen({
          definition: d, start: d, everSaved: false, dirtyAtStart: true,
          work: { id: id, name: d.name, cols: size.cols, rows: size.rows, sourceMapId: registered.has(id) ? id : null }
        });
      }
      if (check.conflict) {
        self.choose("A saved work already uses the id “" + def.id + "”.", [
          { text: "Replace the saved work", cls: "ed-danger", action: function () { openAs(def.id); } },
          { text: "Import as a copy", cls: "ed-primary", action: function () { openAs(S().nextFreeId(def.id, opts.workIds)); } },
          { text: "Cancel" }
        ]);
      } else openAs(def.id);
    });
  };

  // ---- prompts --------------------------------------------------------------

  // buttons: [{ text, cls, action, keepOpen }]; a button without action just closes.
  P.choose = function (message, buttons, body) {
    var self = this;
    this.closeModal();
    var row = el("div.ed-modal-buttons");
    buttons.forEach(function (b) {
      row.appendChild(el("button.ed-btn" + (b.cls ? "." + b.cls : ""), { type: "button", text: b.text, onclick: function () {
        if (b.keepOpen) { if (b.action) b.action(); return; }
        self.closeModal();
        if (b.action) b.action();
      } }));
    });
    this.modal = el("div.ed-modal-back", {}, [el("div.ed-modal", { role: "dialog" }, [
      message ? el("p.ed-modal-title", { text: message }) : null,
      body || null,
      row
    ])]);
    this.root.appendChild(this.modal);
    var first = this.modal.querySelector("input") || row.querySelector(".ed-primary") || row.lastChild;
    if (first) first.focus();
    return this.modal;
  };

  P.confirm = function (message, okText, action, danger) {
    this.choose(message, [{ text: okText, cls: danger ? "ed-danger" : "ed-primary", action: action }, { text: "Cancel" }]);
  };

  P.closeModal = function () {
    if (this.modal) this.modal.remove();
    this.modal = null;
  };

  // apply(name, id) returns an error message, or null when done.
  P._nameIdPrompt = function (title, name, id, apply) {
    var self = this;
    var nameIn = el("input", { type: "text", value: name, maxLength: 60 });
    var idIn = el("input", { type: "text", value: id, maxLength: 40 });
    var err = el("p.ed-error");
    var body = el("div.ed-form", {}, [
      el("label.ed-field", {}, [el("span", { text: "Name" }), nameIn]),
      el("label.ed-field", {}, [el("span", { text: "Id" }), idIn]),
      err
    ]);
    this.choose(title, [
      { text: "Rename", cls: "ed-primary", keepOpen: true, action: function () {
        var msg = apply(nameIn.value.trim(), idIn.value.trim());
        if (msg) err.textContent = msg;
        else self.closeModal();
      } },
      { text: "Cancel" }
    ], body);
  };

  P.message = function (text, kind) {
    var self = this;
    if (this.banner) this.banner.remove();
    this.banner = el("div.ed-banner" + (kind ? ".ed-banner-" + kind : ""), {}, [
      el("span", { text: text }),
      el("button.ed-btn", { type: "button", text: "Dismiss", onclick: function () { self.banner.remove(); self.banner = null; } })
    ]);
    this.root.appendChild(this.banner);
  };

  // ---- editor -------------------------------------------------------------

  P.attach = function (game, session) {
    var self = this;
    this.game = game;
    this.session = session;
    this.categories = MCW.palette.categories();
    this.query = "";

    this.panel = el("aside.ed-panel");
    this.bar = el("header.ed-bar");
    this.root.appendChild(this.panel);
    this.root.appendChild(this.bar);
    this._buildPanel();
    this._buildBar();
    this._buildInfo();

    session.on("change", function () { self._refreshBar(); });
    session.on("dirty", function () { self._refreshBar(); });
    session.on("tool", function () { self._refreshTool(); self._refreshInfo(); });
    session.on("change", function () { self._refreshInfo(); });
    session.on("mode", function (m) { self._onMode(m); });
    game.input.on("tileselect", function () { self._refreshInfo(); });
    window.addEventListener("keydown", function (e) { self._onKey(e); });
    this._leaving = false;
    window.addEventListener("beforeunload", function (e) {
      if (self._leaving || !session.isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    });
    this.backBtn = el("button.ed-btn.ed-primary.ed-back", { type: "button", text: "← Back to editor", hidden: true, onclick: function () { session.backToEditor(); } });
    this.root.appendChild(this.backBtn);
    this._refreshBar();
    this._refreshTool();
  };

  P._typing = function () {
    var a = document.activeElement;
    return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT");
  };

  P._onKey = function (e) {
    var s = this.session;
    if (!s) return;
    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "s") {
      e.preventDefault(); // never the browser's "save page"
      if (s.mode === "editing" && !this.modal) this.save();
      return;
    }
    if (this.modal) {
      if (e.key === "Escape") { this.closeModal(); e.preventDefault(); }
      return;
    }
    if (this._typing()) return;
    if (s.mode === "testing") {
      if (e.key === "Escape") { s.backToEditor(); e.preventDefault(); }
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (k === "z" && !e.shiftKey) { s.undo(); e.preventDefault(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { s.redo(); e.preventDefault(); }
      return;
    }
    if (s.mode !== "editing" || e.altKey) return;
    if (e.key === "Escape" && s.tool.kind !== "select") {
      this.selectTool({ kind: "select" });
      e.preventDefault();
    } else if (k === "e" && !e.shiftKey) {
      this.selectTool({ kind: "erase" });
      e.preventDefault();
    }
  };

  // ---- palette --------------------------------------------------------------

  P._buildPanel = function () {
    var self = this;
    this.toolButtons = {
      select: el("button.ed-tool", { type: "button", text: "Select", title: "Select a tile; drag to scroll", onclick: function () { self.selectTool({ kind: "select" }); } }),
      erase: el("button.ed-tool", { type: "button", text: "Eraser", title: "Remove objects (E)", onclick: function () { self.selectTool({ kind: "erase" }); } })
    };
    this.toolsRow = el("div.ed-tools", {}, [this.toolButtons.select, this.toolButtons.erase]);
    this.searchBox = el("input.ed-search", { type: "search", placeholder: "Search pieces…", "aria-label": "Search pieces" });
    this.searchBox.addEventListener("input", function () {
      self.query = self.searchBox.value;
      self._renderPieces();
    });
    this.searchBox.addEventListener("keydown", function (e) {
      if (e.key === "Escape") self.searchBox.blur();
    });
    this.pieceList = el("div.ed-pieces");
    this.panel.appendChild(this.toolsRow);
    this.panel.appendChild(this.searchBox);
    this.panel.appendChild(this.pieceList);
    this._renderPieces();
  };

  P._renderPieces = function () {
    var self = this;
    var all = MCW.palette.search(MCW.palette.pieces(), this.query);
    this.pieceList.textContent = "";
    this.pieceButtons = {};
    this.categories.forEach(function (cat) {
      var items = all.filter(function (p) { return p.category === cat; });
      if (!items.length) return;
      self.pieceList.appendChild(el("h3", { text: cat }));
      var grid = el("div.ed-grid");
      items.forEach(function (p) {
        var b = el("button.ed-piece", { type: "button", title: p.label, onclick: function () { self.selectPiece(p); } }, [
          el("img", { src: self.io.imageSrc(piecePicture(p)), alt: "" }),
          el("span.ed-piece-label", { text: p.label }),
          p.kind === "object" ? el("span.ed-piece-size", { text: p.size.w + "×" + p.size.h }) : null
        ]);
        self.pieceButtons[p.key] = b;
        grid.appendChild(b);
      });
      self.pieceList.appendChild(grid);
    });
    if (!this.pieceList.childNodes.length) this.pieceList.appendChild(el("p.ed-dim", { text: "No pieces match." }));
    this._refreshTool();
  };

  P.selectPiece = function (p) {
    if (p.kind === "terrain") this.selectTool({ kind: "paint", terrain: p.id });
    else this.selectTool({ kind: "place", type: p.id });
  };

  P.selectTool = function (tool) {
    this.session.setTool(tool);
    this.game.input.setTool(this._pointerToolFor(tool));
  };

  // The Input pointer tool that carries out a session tool (research R10).
  P._pointerToolFor = function (tool) {
    var s = this.session;
    if (tool.kind === "paint") {
      return {
        down: function (pos) { s.beginStroke(pos); },
        move: function (pos) { s.extendStroke(pos); },
        up: function () { s.endStroke(); },
        cancel: function () { s.endStroke(); }
      };
    }
    if (tool.kind === "erase") {
      return {
        down: function (pos) { s.beginStroke(pos); },
        move: function (pos) { s.extendStroke(pos); },
        up: function () { s.endStroke(); },
        cancel: function () { s.endStroke(); }
      };
    }
    if (tool.kind === "place") {
      return {
        down: function (pos, tile) { if (tile) s.place(tool.type, tile.col, tile.row); },
        move: function () {},
        up: function () {},
        cancel: function () {}
      };
    }
    return null;
  };

  P._refreshTool = function () {
    if (!this.session) return;
    var t = this.session.tool;
    var key = t.kind === "paint" ? "terrain:" + t.terrain : t.kind === "place" ? "object:" + t.type : null;
    var pb = this.pieceButtons || {};
    Object.keys(pb).forEach(function (k) { pb[k].classList.toggle("selected", k === key); });
    var tb = this.toolButtons || {};
    Object.keys(tb).forEach(function (k) { tb[k].classList.toggle("selected", k === t.kind); });
  };

  // ---- info strip (Select tool) --------------------------------------------

  P._buildInfo = function () {
    this.info = el("div.ed-info");
    this.root.appendChild(this.info);
  };

  P._refreshInfo = function () {
    var s = this.session, map = this.game.map, sel = this.game.input.selected;
    this.info.textContent = "";
    var show = s.mode === "editing" && s.tool.kind === "select" && !!sel;
    this.info.hidden = !show;
    if (!show) return;
    var tile = map.getTile(sel.col, sel.row), obj = map.objectAt(sel.col, sel.row);
    this.info.appendChild(el("span", { text: "(" + sel.col + "," + sel.row + ") " + tile.terrain }));
    if (!obj) {
      this.info.appendChild(el("span.ed-dim", { text: " · no object" }));
      return;
    }
    this.info.appendChild(el("span", { text: " · " + obj.type.replace(/_/g, " ") + (obj.named ? " (" + obj.id + ")" : "") + (obj.variant === "damaged" ? " · damaged" : "") }));
    if (MCW.objectTypes.TYPES[obj.type].hasDamaged) {
      this.info.appendChild(el("button.ed-btn", {
        type: "button",
        text: obj.variant === "damaged" ? "Show normal" : "Show damaged",
        onclick: function () { s.toggleVariant(obj.id); }
      }));
    }
  };

  // ---- top bar --------------------------------------------------------------

  P._buildBar = function () {
    var s = this.session, self = this;
    this.titleEl = el("button.ed-title", { type: "button", title: "Rename", onclick: function () { self._renamePrompt(); } });
    this.dirtyEl = el("span.ed-dirty");
    this.problemsBtn = el("button.ed-btn.ed-problems", { type: "button", onclick: function () { self._toggleProblems(); } });
    this.btn = {
      undo: el("button.ed-btn", { type: "button", text: "Undo", title: "Ctrl+Z", onclick: function () { s.undo(); } }),
      redo: el("button.ed-btn", { type: "button", text: "Redo", title: "Ctrl+Y", onclick: function () { s.redo(); } }),
      save: el("button.ed-btn.ed-primary", { type: "button", text: "Save", title: "Ctrl+S", onclick: function () { self.save(); } }),
      test: el("button.ed-btn", { type: "button", text: "Test play", onclick: function () { s.testPlay(); } }),
      exp: el("button.ed-btn", { type: "button", text: "Export", onclick: function () { self._exportPanel(); } }),
      reset: el("button.ed-btn", { type: "button", text: "Reset", onclick: function () {
        self.confirm("Reset " + s.work.name + " to its starting layout? You can undo this.", "Reset", function () { s.reset(); });
      } }),
      leave: el("button.ed-btn", { type: "button", text: "Leave", onclick: function () { self.leave(); } })
    };
    var b = this.btn;
    this.barButtons = el("span.ed-bar-buttons", {}, [b.undo, b.redo, b.save, b.test, b.exp, b.reset, b.leave]);
    this.bar.appendChild(this.titleEl);
    this.bar.appendChild(this.dirtyEl);
    this.bar.appendChild(this.problemsBtn);
    this.bar.appendChild(this.barButtons);
  };

  P.save = function () {
    var res = this.session.save();
    if (res.ok) {
      var now = new Date();
      this.savedText = "Saved " + pad2(now.getHours()) + ":" + pad2(now.getMinutes());
      if (this.banner) { this.banner.remove(); this.banner = null; }
    } else {
      this.message("Could not save in this browser (" + res.reason + "). Your changes are still here; use Export to keep a copy.", "bad");
    }
    this._refreshBar();
    return res.ok;
  };

  // Back to the chooser, asking first when there are unsaved changes.
  P.leave = function () {
    var self = this, s = this.session;
    function go() {
      self._leaving = true;
      window.location.href = "index.html?edit=1";
    }
    if (!s.isDirty()) return go();
    this.choose("Save changes to " + s.work.name + "?", [
      { text: "Save", cls: "ed-primary", action: function () { if (self.save()) go(); } },
      { text: "Discard", cls: "ed-danger", action: go },
      { text: "Cancel" }
    ]);
  };

  P._renamePrompt = function () {
    var self = this, s = this.session;
    this._nameIdPrompt("Rename this map", s.work.name, s.work.id, function (name, id) {
      var r = s.rename(name, id);
      self._refreshBar();
      return r.ok ? null : r.error;
    });
  };

  P._onMode = function (mode) {
    var testing = mode === "testing";
    this.root.classList.toggle("ed-testing", testing);
    this.backBtn.hidden = !testing;
    this.closeModal();
    if (this.problemList) { this.problemList.remove(); this.problemList = null; }
    if (testing) {
      this.game.input.setTool(null);
    } else {
      // Collision overrides from the developer keys are never part of a map (research R2).
      var map = this.game.map;
      for (var row = 0; row < map.rows; row++) {
        for (var col = 0; col < map.cols; col++) if (map.hasOverride(col, row)) map.clearOverride(col, row);
      }
      this.selectTool(this.session.tool);
    }
    this._refreshInfo();
    this.game.renderer.requestRedraw();
  };

  // ---- problems and export ----------------------------------------------------

  P._toggleProblems = function () {
    var self = this;
    if (this.problemList) { this.problemList.remove(); this.problemList = null; return; }
    var probs = this.session.problems();
    this.problemList = el("ul.ed-problem-list", {}, probs.map(function (p) {
      return el("li", {}, [el("button.ed-link-btn", { type: "button", text: p.message, onclick: function () {
        self.game.camera.centerOn(p.col + 0.5, p.row + 0.5, { smooth: true });
        self.game.input.select({ col: p.col, row: p.row });
      } })]);
    }));
    this.root.appendChild(this.problemList);
  };

  P._exportPanel = function () {
    var s = this.session, io = this.io, info = s.exportInfo(), w = s.work;
    var steps = el("ol.ed-steps", {}, [
      el("li", {}, ["Put ", el("code", { text: info.fileName }), " in the ", el("code", { text: "maps/" }), " folder."]),
      info.replaces
        ? el("li", {}, ["Replaces ", el("code", { text: "maps/" + info.fileName }), " — no new script line needed."])
        : el("li", {}, ["Add this line to ", el("code", { text: "index.html" }), " after the other ", el("code", { text: "maps/" }), " lines:",
          el("div.ed-copy-row", {}, [
            el("code.ed-script-line", { text: info.scriptLine }),
            el("button.ed-btn", { type: "button", text: "Copy", onclick: function (e) { copyText(info.scriptLine, e.target); } })
          ])]),
      el("li", {}, ["Open ", el("code", { text: "index.html?map=" + w.id }), "."])
    ]);
    var body = el("div.ed-export", {}, [
      info.clash ? el("p.ed-warn", { text: 'Map id "' + w.id + '" is already used by another map; try "' + info.clash + '" (rename this map first).' }) : null,
      info.problems.length ? el("div.ed-warn", {}, [
        el("p", { text: info.problems.length + (info.problems.length === 1 ? " problem" : " problems") + " (the file still works):" }),
        el("ul", {}, info.problems.map(function (p) { return el("li", { text: p.message }); }))
      ]) : null,
      el("p", {}, ["Download ", el("code", { text: info.fileName }), " and send it to your teammate. To add it to the game:"]),
      steps
    ]);
    this.choose("Export " + w.name, [
      { text: "Download " + info.fileName, cls: "ed-primary", keepOpen: true, action: function () {
        io.files.download(info.fileName, io.mapFile.format(info.definition, { cols: w.cols, rows: w.rows, date: today() }));
      } },
      { text: "Close" }
    ], body);
  };


  P._refreshBar = function () {
    var s = this.session, w = s.work;
    this.titleEl.textContent = "";
    this.titleEl.appendChild(el("b", { text: w.name }));
    this.titleEl.appendChild(el("code", { text: " " + w.id }));
    this.titleEl.appendChild(el("span.ed-dim", { text: " · " + w.cols + "×" + w.rows }));
    var dirty = s.isDirty();
    this.dirtyEl.textContent = dirty ? "● Unsaved" : s.everSaved ? (this.savedText || "Saved") : "Not saved yet";
    this.dirtyEl.classList.toggle("is-dirty", dirty);
    this.btn.undo.disabled = !s.canUndo();
    this.btn.redo.disabled = !s.canRedo();
    var n = s.problems().length;
    this.problemsBtn.hidden = n === 0;
    this.problemsBtn.textContent = "\u26a0 " + n + (n === 1 ? " problem" : " problems");
    if (this.problemList && !n) { this.problemList.remove(); this.problemList = null; }
  };

  MCW.EditorUI = EditorUI;
  MCW.EditorUI.el = el;
})(window.MCW);

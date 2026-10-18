// Infrastructure: decorate-mode works in progress kept in this browser's localStorage
// (feature 004 research R8). Implements the work store port; never throws.
(function (MCW) {
  "use strict";

  var INDEX = "mcw.editor.index";
  var PREFIX = "mcw.editor.work.";

  function reason(e) {
    if (e && (e.name === "QuotaExceededError" || e.code === 22)) return "browser storage is full";
    return "browser storage is not available";
  }

  function readIndex() {
    var raw = localStorage.getItem(INDEX);
    if (!raw) return [];
    var list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  }

  function writeIndex(list) {
    localStorage.setItem(INDEX, JSON.stringify(list));
  }

  function metaOf(work) {
    return { id: work.id, name: work.name, cols: work.cols, rows: work.rows, sourceMapId: work.sourceMapId || null, savedAt: work.savedAt };
  }

  // Index entries whose work can be read, newest first.
  function list() {
    try {
      return readIndex().filter(function (m) {
        if (!m || typeof m.id !== "string") return false;
        try {
          var e = JSON.parse(localStorage.getItem(PREFIX + m.id));
          if (e && e.definition && typeof e.definition.terrain === "string") return true;
        } catch (err) { /* reported below */ }
        console.warn('[editor] skipped unreadable saved work "' + m.id + '"');
        return false;
      }).sort(function (a, b) { return String(b.savedAt).localeCompare(String(a.savedAt)); });
    } catch (e) {
      console.warn("[editor] could not read saved works: " + e.message);
      return [];
    }
  }

  function load(id) {
    try {
      var e = JSON.parse(localStorage.getItem(PREFIX + id));
      if (!e || !e.definition) return { ok: false, reason: 'no saved work "' + id + '"' };
      return { ok: true, work: Object.assign({}, e.meta, { definition: e.definition }) };
    } catch (err) {
      console.warn('[editor] could not read saved work "' + id + '": ' + err.message);
      return { ok: false, reason: reason(err) };
    }
  }

  function save(work) {
    try {
      var meta = metaOf(Object.assign({}, work, { savedAt: new Date().toISOString() }));
      localStorage.setItem(PREFIX + work.id, JSON.stringify({ meta: meta, definition: work.definition }));
      var idx = readIndex().filter(function (m) { return m && m.id !== work.id; });
      idx.push(meta);
      writeIndex(idx);
      return { ok: true, savedAt: meta.savedAt };
    } catch (e) {
      return { ok: false, reason: reason(e) };
    }
  }

  function remove(id) {
    try {
      localStorage.removeItem(PREFIX + id);
      writeIndex(readIndex().filter(function (m) { return m && m.id !== id; }));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: reason(e) };
    }
  }

  MCW.workStore = { list: list, load: load, save: save, remove: remove };
})(window.MCW);

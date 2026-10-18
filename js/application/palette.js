// Application: the pieces decorate mode offers, grouped and searchable (feature 004 R11).
// Built from the domain's terrain and object types; pictures are chosen by the UI adapter.
(function (MCW) {
  "use strict";

  var GROUND = ["grass", "dirt", "concrete", "asphalt", "water", "road", "bridge"];
  var CATEGORIES = ["Ground", "Houses", "Shops & food", "Public", "Work", "Trees & nature", "Street"];

  // First matching prefix wins.
  var PREFIXES = [
    ["Houses", ["house_", "apartments_", "mobilehomes_"]],
    ["Shops & food", ["cafe", "pizza", "icecream", "fruitstand", "gunshop", "autoshop", "gasstation"]],
    ["Public", ["hospital", "clinic", "firestation", "policestation", "church", "water_"]],
    ["Work", ["office_", "warehouse_", "construction", "contruction"]],
    ["Trees & nature", ["rocks_", "weed_", "flowers_"]]
  ];

  function categoryOf(type, entry) {
    if (entry.kind === "tree") return "Trees & nature";
    for (var i = 0; i < PREFIXES.length; i++) {
      var list = PREFIXES[i][1];
      for (var j = 0; j < list.length; j++) {
        if (type.indexOf(list[j]) === 0) return PREFIXES[i][0];
      }
    }
    return "Street";
  }

  function label(id) {
    return id.replace(/_/g, " ");
  }

  var cache = null;

  function pieces() {
    if (cache) return cache;
    var out = GROUND.filter(function (id) { return MCW.terrain.TYPES[id]; }).map(function (id) {
      return { key: "terrain:" + id, kind: "terrain", id: id, label: label(id), category: "Ground", size: { w: 1, h: 1 }, hasDamaged: false };
    });
    var types = MCW.objectTypes.TYPES;
    Object.keys(types).forEach(function (type) {
      var e = types[type];
      out.push({
        key: "object:" + type, kind: "object", id: type, label: label(type),
        category: categoryOf(type, e), size: { w: e.size.w, h: e.size.h }, hasDamaged: !!e.hasDamaged
      });
    });
    cache = out;
    return out;
  }

  function search(list, q) {
    var words = String(q || "").toLowerCase().replace(/_/g, " ").split(/\s+/).filter(Boolean);
    if (!words.length) return list.slice();
    return list.filter(function (p) {
      return words.every(function (w) { return p.label.indexOf(w) >= 0; });
    });
  }

  MCW.palette = {
    pieces: pieces,
    categories: function () { return CATEGORIES.slice(); },
    search: search
  };
})(window.MCW);

// Registry that level definition files (levels/*.js) register themselves with.
(function (MCW) {
  "use strict";

  var defs = {};

  MCW.levels = {
    register: function (def) {
      if (!def || !def.id) throw new Error("Level definition has no id");
      if (defs[def.id]) throw new Error('Level "' + def.id + '" is already registered');
      defs[def.id] = def;
    },
    get: function (id) {
      return defs[id] || null;
    },
    // The first level played on this map, or null.
    forMap: function (mapId) {
      var ids = Object.keys(defs);
      for (var i = 0; i < ids.length; i++) if (defs[ids[i]].map === mapId) return defs[ids[i]];
      return null;
    },
    list: function () {
      return Object.keys(defs);
    }
  };
})(window.MCW);

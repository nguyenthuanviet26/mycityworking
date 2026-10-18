// Registry that map definition files (maps/*.js) register themselves with.
(function (MCW) {
  "use strict";

  var defs = {};

  MCW.maps = {
    register: function (def) {
      if (!def || !def.id) throw new Error("Map definition has no id");
      if (defs[def.id]) throw new Error('Map "' + def.id + '" is already registered');
      defs[def.id] = def;
    },
    get: function (id) {
      return defs[id] || null;
    },
    list: function () {
      return Object.keys(defs);
    }
  };
})(window.MCW);

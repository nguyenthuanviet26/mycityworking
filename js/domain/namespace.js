// Global namespace for the game. Every script attaches its exports here.
window.MCW = window.MCW || {};

(function (MCW) {
  "use strict";

  // Minimal event emitter: { on, off, emit }.
  MCW.createEmitter = function () {
    var handlers = {};
    return {
      on: function (evt, fn) {
        (handlers[evt] = handlers[evt] || []).push(fn);
      },
      off: function (evt, fn) {
        var list = handlers[evt];
        if (!list) return;
        var i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      },
      emit: function (evt, payload) {
        var list = handlers[evt];
        if (!list) return;
        list.slice().forEach(function (fn) { fn(payload); });
      }
    };
  };
})(window.MCW);

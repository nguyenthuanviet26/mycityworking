// Slow drifting camera path behind the main menu (research R4). No DOM.
(function (MCW) {
  "use strict";

  var PERIOD_MS = 90000;
  var RADIUS = 0.22; // fraction of the map size; keeps the view mostly over the city

  function positionAt(tMs, cols, rows) {
    var a = 2 * Math.PI * tMs / PERIOD_MS;
    return {
      x: cols / 2 + RADIUS * cols * Math.cos(a),
      y: rows / 2 + RADIUS * rows * Math.sin(a)
    };
  }

  MCW.attract = { ZOOM: 0.75, PERIOD_MS: PERIOD_MS, positionAt: positionAt };
})(window.MCW);

// Image loader using <img> (works over file://). Missing images get a placeholder.
(function (MCW) {
  "use strict";

  var ROOT = "Isometric City/";
  var images = {};

  function placeholder() {
    var c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(255,0,255,0.6)";
    g.beginPath();
    g.moveTo(64, 0);
    g.lineTo(128, 32);
    g.lineTo(64, 64);
    g.lineTo(0, 32);
    g.closePath();
    g.fill();
    return c;
  }

  // paths: asset paths relative to the pack root. Resolves when all have loaded or failed.
  function load(paths, onProgress) {
    var done = 0;
    var total = paths.length;
    if (!total) return Promise.resolve();
    return new Promise(function (resolve) {
      paths.forEach(function (path) {
        var img = new Image();
        function finish() {
          done++;
          if (onProgress) onProgress(done, total);
          if (done === total) resolve();
        }
        img.onload = function () {
          images[path] = img;
          finish();
        };
        img.onerror = function () {
          console.warn("[assets] missing " + path);
          images[path] = placeholder();
          finish();
        };
        img.src = encodeURI(ROOT + path);
      });
    });
  }

  function get(path) {
    if (!images[path]) {
      console.warn("[assets] not loaded " + path);
      images[path] = placeholder();
    }
    return images[path];
  }

  MCW.assets = { load: load, get: get };
})(window.MCW);

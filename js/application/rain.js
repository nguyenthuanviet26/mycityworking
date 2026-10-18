// Rain streak simulation in screen space (research R5). Fixed pool, no per-frame allocation.
// Only the first `active` streaks fall, so intensity changes without allocating (feature 005 R10).
(function (MCW) {
  "use strict";

  var WIND = -0.25;
  var MIN_SPEED = 700, MAX_SPEED = 1100;
  var MIN_LEN = 10, MAX_LEN = 22;

  function random(r) {
    r.seed = (Math.imul(r.seed, 1664525) + 1013904223) >>> 0; // 32-bit LCG
    return r.seed / 4294967296;
  }

  function spawn(r, i, anywhere) {
    r.len[i] = MIN_LEN + random(r) * (MAX_LEN - MIN_LEN);
    r.speed[i] = MIN_SPEED + random(r) * (MAX_SPEED - MIN_SPEED);
    r.x[i] = random(r) * (r.width + 60);
    r.y[i] = anywhere ? random(r) * r.height : -r.len[i] - random(r) * 40;
  }

  function create(count, width, height, seed) {
    count = count || 160;
    var r = {
      count: count,
      active: count,
      width: width,
      height: height,
      wind: WIND,
      seed: (seed || 1) >>> 0,
      x: new Float32Array(count),
      y: new Float32Array(count),
      speed: new Float32Array(count),
      len: new Float32Array(count)
    };
    for (var i = 0; i < count; i++) spawn(r, i, true);
    return r;
  }

  // k from 0 to 1; newly active streaks enter from above the top edge.
  function setIntensity(r, k) {
    var n = Math.round(Math.max(0, Math.min(1, k)) * r.count);
    for (var i = r.active; i < n; i++) spawn(r, i, false);
    r.active = n;
  }

  function update(r, dtMs) {
    var dt = dtMs / 1000;
    for (var i = 0; i < r.active; i++) {
      var d = r.speed[i] * dt;
      r.y[i] += d;
      r.x[i] += r.wind * d;
      if (r.y[i] - r.len[i] > r.height || r.x[i] < -30) spawn(r, i, false);
    }
  }

  function resize(r, width, height) {
    r.width = width;
    r.height = height;
    for (var i = 0; i < r.count; i++) {
      if (r.x[i] > width + 60 || r.y[i] > height) spawn(r, i, true);
    }
  }

  MCW.rain = { create: create, update: update, resize: resize, setIntensity: setIntensity };
})(window.MCW);

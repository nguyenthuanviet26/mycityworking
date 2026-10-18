// Tiny in-browser test harness: describe / it / assert*. No dependencies.
(function () {
  "use strict";

  var results = [];
  var currentSuite = "";

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number" && isNaN(a) && isNaN(b)) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return deepEqual(a[k], b[k]); });
  }

  function fmt(v) {
    try {
      return JSON.stringify(v, function (k, x) { return x === Infinity ? "Infinity" : x; });
    } catch (e) {
      return String(v);
    }
  }

  window.describe = function (name, fn) {
    var prev = currentSuite;
    currentSuite = prev ? prev + " › " + name : name;
    try {
      fn();
    } catch (e) {
      results.push({ name: currentSuite + " (suite error)", ok: false, error: e });
    }
    currentSuite = prev;
  };

  window.it = function (name, fn) {
    var full = currentSuite ? currentSuite + " › " + name : name;
    try {
      fn();
      results.push({ name: full, ok: true });
    } catch (e) {
      results.push({ name: full, ok: false, error: e });
    }
  };

  window.assertEqual = function (actual, expected, msg) {
    if (!deepEqual(actual, expected)) {
      throw new Error((msg ? msg + ": " : "") + "expected " + fmt(expected) + ", got " + fmt(actual));
    }
  };

  window.assertClose = function (a, b, eps, msg) {
    if (eps === undefined) eps = 1e-9;
    if (!(Math.abs(a - b) <= eps)) {
      throw new Error((msg ? msg + ": " : "") + "expected " + b + " ± " + eps + ", got " + a);
    }
  };

  window.assertTrue = function (v, msg) {
    if (!v) throw new Error(msg || "expected truthy value");
  };

  window.assertThrows = function (fn, msg) {
    var threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) throw new Error(msg || "expected function to throw");
  };

  window.testResults = results;

  window.addEventListener("load", function () {
    var passed = results.filter(function (r) { return r.ok; }).length;
    var failed = results.length - passed;
    var summary = document.createElement("h2");
    summary.id = "summary";
    summary.textContent = passed + " passed, " + failed + " failed";
    summary.style.color = failed ? "#c62828" : "#2e7d32";
    document.body.appendChild(summary);

    var list = document.createElement("ul");
    results.forEach(function (r) {
      var li = document.createElement("li");
      li.textContent = (r.ok ? "✔ " : "✘ ") + r.name + (r.ok ? "" : " — " + r.error.message);
      li.style.color = r.ok ? "#2e7d32" : "#c62828";
      list.appendChild(li);
      if (!r.ok) console.error("[test] " + r.name, r.error);
    });
    document.body.appendChild(list);
    console.log("[test] " + summary.textContent);
  });
})();

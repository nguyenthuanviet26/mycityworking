// Enforces Constitution Principle VII: dependencies point inward only.
// Reads the source text of every function each layer exports (works over file://, where
// reading the .js files themselves is blocked) and looks for forbidden references.
describe("architecture", function () {
  var LAYERS = {
    domain: ["iso", "terrain", "collision", "objectTypes", "GameMap", "parseMap", "mapChecks", "serializeMap", "createEmitter", "findRoute", "workTiles", "incidentKinds", "checkLevel", "jobs", "matchLevel", "repairSeconds", "repairPoints", "kindAccepts", "levelCrews"],
    application: ["Camera", "ScreenMachine", "attract", "rain", "GameSession", "palette", "EditHistory", "EditorSession", "Crew", "Round", "Hints", "LevelRun"],
    adapters: ["objectArt", "jobArt", "CrewGuide", "terrainArt", "TerrainArt", "Renderer", "DebugOverlay", "RainLayer", "Input", "MenuUI", "EditorOverlay", "EditorUI", "LevelLayer", "HUD"],
    infrastructure: ["assets", "maps", "levels", "mapFile", "workStore", "fileIO"]
  };
  var BROWSER = ["document", "window", "canvas", "getContext", "Image(", ".png", "setTimeout",
    "requestAnimationFrame", "performance"];

  // Source of a function, its prototype methods, and function-valued properties of objects.
  function sourcesOf(value, depth) {
    var out = [];
    if (typeof value === "function") {
      out.push(value.toString());
      if (value.prototype) {
        Object.getOwnPropertyNames(value.prototype).forEach(function (k) {
          if (k !== "constructor" && typeof value.prototype[k] === "function") out.push(value.prototype[k].toString());
        });
      }
    }
    if (value && typeof value === "object" && (depth || 0) < 2) {
      Object.keys(value).forEach(function (k) { out = out.concat(sourcesOf(value[k], (depth || 0) + 1)); });
    }
    return out;
  }

  function forbiddenNames(layers) {
    var names = [];
    layers.forEach(function (l) {
      LAYERS[l].forEach(function (n) { names.push("MCW." + n); });
    });
    return names;
  }

  function violations(layer, tokens) {
    var found = [];
    LAYERS[layer].forEach(function (name) {
      sourcesOf(MCW[name]).forEach(function (src) {
        tokens.forEach(function (t) {
          // Match MCW.X only as a whole name (MCW.rain must not match MCW.rainLayer).
          var re = t.indexOf("MCW.") === 0 ? new RegExp(t.replace(".", "\\.") + "\\b") : null;
          if (re ? re.test(src) : src.indexOf(t) >= 0) found.push(name + " uses " + t);
        });
      });
    });
    return found;
  }

  it("every domain and application export exists", function () {
    LAYERS.domain.concat(LAYERS.application).forEach(function (n) {
      assertTrue(MCW[n] !== undefined, "MCW." + n + " is defined");
    });
  });

  it("domain uses no browser APIs, picture paths or outer layers", function () {
    var bad = violations("domain", BROWSER.concat(forbiddenNames(["application", "adapters", "infrastructure"])));
    assertEqual(bad, []);
  });

  it("application uses no browser APIs, picture paths, adapters or infrastructure", function () {
    var bad = violations("application", BROWSER.concat(forbiddenNames(["adapters", "infrastructure"])));
    assertEqual(bad, []);
  });

  it("the test page loads no drawing, input, UI or infrastructure code", function () {
    ["Renderer", "DebugOverlay", "RainLayer", "Input", "MenuUI", "EditorOverlay", "EditorUI", "LevelLayer", "HUD", "CrewGuide", "assets", "maps", "levels", "workStore", "fileIO"].forEach(function (n) {
      assertEqual(MCW[n], undefined, "MCW." + n);
    });
  });
});

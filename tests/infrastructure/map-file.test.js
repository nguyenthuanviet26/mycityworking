describe("map-file", function () {
  var F = MCW.mapFile;
  var DEF = {
    id: "harbour-town",
    name: "Harbour Town",
    terrain: "\n....rr\n....r~\n",
    objects: [
      { type: "hospital_a", at: [0, 0], id: "hospital" },
      { type: "house_small_blue_a", at: [3, 1], variant: "damaged" },
      { type: "tree_pine_tall", at: [2, 1], access: [2, 0] }
    ]
  };
  var INFO = { cols: 6, rows: 2, date: "2026-10-17" };

  var EXPECTED = [
    "// Harbour Town (6x2). Made with the map decorator on 2026-10-17.",
    "// Legend: . grass  , dirt  # concrete  = asphalt  ~ water  r road  b bridge",
    "MCW.maps.register({",
    '  id: "harbour-town",',
    '  name: "Harbour Town",',
    "  terrain: `",
    "....rr",
    "....r~",
    "`,",
    "  objects: [",
    '    { type: "hospital_a", at: [0, 0], id: "hospital" },',
    '    { type: "house_small_blue_a", at: [3, 1], variant: "damaged" },',
    '    { type: "tree_pine_tall", at: [2, 1], access: [2, 0] }',
    "  ]",
    "});",
    ""
  ].join("\n");

  it("formats exactly the contract layout", function () {
    assertEqual(F.format(DEF, INFO), EXPECTED);
  });

  it("is deterministic", function () {
    assertEqual(F.format(DEF, INFO), F.format(DEF, INFO));
  });

  it("writes objects: [] when there are none", function () {
    var text = F.format({ id: "e", name: "E", terrain: "\n..\n", objects: [] }, { cols: 2, rows: 1, date: "2026-10-17" });
    assertTrue(text.indexOf("  objects: []\n});\n") > 0, text);
  });

  it("escapes backticks and ${ in the name", function () {
    var text = F.format({ id: "e", name: "a`b${c}", terrain: "\n.\n", objects: [] }, { cols: 1, rows: 1, date: "d" });
    var nameLine = text.split("\n").filter(function (l) { return l.indexOf("  name:") === 0; })[0];
    assertTrue(nameLine.indexOf("`") < 0 && nameLine.indexOf("${") < 0, nameLine);
    assertEqual(F.read(text).definition.name, "a`b${c}");
  });

  it("reads back what it writes", function () {
    var r = F.read(F.format(DEF, INFO));
    assertEqual(r.ok, true);
    assertEqual(r.definition, DEF);
  });

  it("reads a hand-written map in the style of maps/*.js", function () {
    var text = [
      "// Sample city (4x2): a road and a canal.",
      "// Legend: . grass  r road  ~ water",
      "MCW.maps.register({",
      "  id: 'hand-made',",
      '  name: "Hand \\"made\\"",',
      "  legend: { \"g\": \"grass\" },",
      "  terrain: `",
      "rrrr",
      "g.~.",
      "`,",
      "  objects: [",
      "    // North blocks",
      "    { type: \"hospital_a\", at: [0, 0], id: \"hospital\" },",
      "    /* a tree */ { type: \"tree_pine_tall\", at: [3, 1], },",
      "  ],",
      "  scale: -1.5,",
      "  flags: [true, false, null],",
      "});"
    ].join("\n");
    var r = F.read(text);
    assertEqual(r.ok, true, r.error);
    var d = r.definition;
    assertEqual(d.id, "hand-made");
    assertEqual(d.name, 'Hand "made"');
    assertEqual(d.legend, { g: "grass" });
    assertEqual(d.terrain, "\nrrrr\ng.~.\n");
    assertEqual(d.objects, [{ type: "hospital_a", at: [0, 0], id: "hospital" }, { type: "tree_pine_tall", at: [3, 1] }]);
    assertEqual([d.scale, d.flags], [-1.5, [true, false, null]]);
  });

  function rejects(text, part) {
    var r = F.read(text);
    assertEqual(r.ok, false, "rejected");
    assertTrue(typeof r.error === "string" && r.error.length > 0, "has an error");
    if (part) assertTrue(r.error.indexOf(part) >= 0, r.error);
    return r.error;
  }

  it("rejects a call instead of data", function () {
    rejects("MCW.maps.register(alert(1))", "Line 1");
  });

  it("rejects ${ inside a template string", function () {
    rejects("MCW.maps.register({\n  terrain: `..${x}..`\n});", "Line 2");
  });

  it("rejects a second statement after the call", function () {
    rejects("MCW.maps.register({ id: \"a\" });\nalert(1);", "Line 2");
  });

  it("rejects an identifier used as a value", function () {
    rejects("MCW.maps.register({ id: foo });", '"foo" is not a value');
  });

  it("rejects text that is not a map file", function () {
    rejects("hello there, this is a shopping list");
    rejects("");
  });

  it("rejects code before the call", function () {
    rejects("alert(1);\nMCW.maps.register({ id: \"a\" });");
  });

  it("never runs anything from the file", function () {
    window.__mapFileCalled = false;
    window.__mark = function () { window.__mapFileCalled = true; return "x"; };
    rejects("MCW.maps.register({ id: __mark() });");
    assertEqual(window.__mapFileCalled, false);
    delete window.__mark;
    delete window.__mapFileCalled;
  });

  it("scriptLine", function () {
    assertEqual(F.scriptLine("town"), '<script src="maps/town.js"></script>');
  });
});

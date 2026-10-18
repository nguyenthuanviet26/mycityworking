describe("map-serializer", function () {
  var DEF = {
    id: "t",
    terrain: "\n.,#=\n~rb.\n....\n....\n",
    objects: [
      { type: "tree_pine_tall", at: [3, 2] },
      { type: "hospital_a", at: [0, 2], id: "hospital", access: [2, 2] },
      { type: "house_small_blue_a", at: [3, 0], variant: "damaged" }
    ]
  };

  function layout(m) {
    var tiles = [];
    for (var i = 0; i < m.terrain.length; i++) tiles.push(m.terrain[i]);
    var objs = m.objects().map(function (o) {
      return [o.type, o.anchor.col, o.anchor.row, o.variant, o.named ? o.id : null, o.access];
    }).sort();
    return { cols: m.cols, rows: m.rows, tiles: tiles, objs: objs };
  }

  it("writes terrain with the default legend, one line per row", function () {
    var d = MCW.serializeMap(MCW.parseMap(DEF).map, { id: "t", name: "T" });
    assertEqual(d.id, "t");
    assertEqual(d.name, "T");
    assertEqual(d.terrain, "\n.,#=\n~rb.\n....\n....\n");
  });

  it("sorts objects by row then column and writes only given fields", function () {
    var d = MCW.serializeMap(MCW.parseMap(DEF).map, { id: "t", name: "T" });
    assertEqual(d.objects, [
      { type: "house_small_blue_a", at: [3, 0], variant: "damaged" },
      { type: "hospital_a", at: [0, 2], id: "hospital", access: [2, 2] },
      { type: "tree_pine_tall", at: [3, 2] }
    ]);
  });

  it("never writes generated ids", function () {
    var m = new MCW.GameMap(2, 2);
    m.placeObject({ type: "house_small_blue_a", at: [0, 0] });
    var d = MCW.serializeMap(m, { id: "x", name: "X" });
    assertEqual(d.objects, [{ type: "house_small_blue_a", at: [0, 0] }]);
  });

  it("round trip keeps the layout", function () {
    var m = MCW.parseMap(DEF).map;
    var m2 = MCW.parseMap(MCW.serializeMap(m, { id: "t", name: "T" })).map;
    assertEqual(layout(m2), layout(m));
  });

  it("a custom legend is written with default characters", function () {
    var m = MCW.parseMap({ terrain: "gw", legend: { g: "grass", w: "water" } }).map;
    assertEqual(MCW.serializeMap(m, { id: "c", name: "C" }).terrain, "\n.~\n");
  });
});

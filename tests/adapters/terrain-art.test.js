// Suite name kept as "autotile" so test names match the pre-refactor baseline.
describe("autotile", function () {
  var A = MCW.terrainArt;
  var D = "Roads and Grounds/";
  var BIT = { NE: 1, SE: 2, SW: 4, NW: 8 };

  function mask(list) {
    return list.reduce(function (m, d) { return m | BIT[d]; }, 0);
  }

  function road(name) {
    return D + "tile_road_" + name + "_normal.png";
  }

  it("every road mask maps to the research R5 piece", function () {
    var table = [
      [[], "xsing"],
      [["NE"], "end_SW"], [["SE"], "end_NW"], [["SW"], "end_NE"], [["NW"], "end_SE"],
      [["NE", "SW"], "straight_SW"], [["SE", "NW"], "straight_SE"],
      [["SE", "SW"], "corner_N"], [["NW", "SW"], "corner_E"],
      [["NE", "NW"], "corner_S"], [["NE", "SE"], "corner_W"],
      [["NE", "NW", "SE"], "intersection_NE"], [["NE", "NW", "SW"], "intersection_NW"],
      [["NE", "SE", "SW"], "intersection_SE"], [["NW", "SE", "SW"], "intersection_SW"],
      [["NE", "SE", "SW", "NW"], "xsing"]
    ];
    assertEqual(table.length, 16);
    table.forEach(function (row) {
      assertEqual(A.roadPiece(mask(row[0]), "normal"), road(row[1]), row[0].join("+"));
    });
  });

  it("damaged variant swaps the suffix", function () {
    assertEqual(A.roadPiece(mask(["SE", "NW"]), "damaged"), D + "tile_road_straight_SE_damaged.png");
  });

  it("roadMask reads neighbours on the map", function () {
    var m = MCW.parseMap({ terrain: ".r.\nrrr\n.b." }).map;
    assertEqual(A.roadMask(m, 1, 1), 15);
    assertEqual(new MCW.TerrainArt(m).artAt(1, 1), [road("xsing")]);
    assertEqual(new MCW.TerrainArt(m).artAt(0, 1), [road("end_NW")]);
  });

  it("bridge orientation follows the road", function () {
    var m1 = MCW.parseMap({ terrain: "rbr" }).map; // neighbours along SE/NW
    assertEqual(A.bridgePiece(m1, 1, 0, "normal"), D + "tile_road_bridge_body_SE_normal.png");
    var m2 = MCW.parseMap({ terrain: "r\nb\nr" }).map; // neighbours along NE/SW
    assertEqual(A.bridgePiece(m2, 0, 1, "normal"), D + "tile_road_bridge_body_SW_normal.png");
    assertEqual(new MCW.TerrainArt(m1).artAt(1, 0)[0], D + "tile_ground_water.png");
  });

  it("shoreline: one water side", function () {
    var m = MCW.parseMap({ terrain: ".~.\n...\n..." }).map;
    // tile (1,1) has water at NE (0,-1)
    assertEqual(A.shorePiece(m, 1, 1), D + "tile_ground_grass_water_NE_clean.png");
  });

  it("shoreline: two adjacent sides", function () {
    var m = MCW.parseMap({ terrain: "...\n~..\n.~." }).map;
    // tile (1,1): NW (0,1) water, SW (1,2) water
    assertEqual(A.shorePiece(m, 1, 1), D + "tile_ground_grass_wateredge_W_clean.png");
    var m2 = MCW.parseMap({ terrain: ".~.\n~..\n..." }).map;
    // tile (1,1): NE (1,0) water, NW (0,1) water
    assertEqual(A.shorePiece(m2, 1, 1), D + "tile_ground_grass_wateredge_N_clean.png");
  });

  it("shoreline: diagonal only gives a corner", function () {
    var m = MCW.parseMap({ terrain: "..~\n...\n..." }).map;
    // tile (1,1): E corner is (+1,-1) = (2,0)
    assertEqual(A.shorePiece(m, 1, 1), D + "tile_ground_grass_watercorner_E_clean.png");
  });

  it("shoreline: opposite sides give plain ground; dirt uses dirt art", function () {
    var m = MCW.parseMap({ terrain: ".~.\n.,.\n.~." }).map;
    assertEqual(A.shorePiece(m, 1, 1), D + "tile_ground_dirt.png");
    var m2 = MCW.parseMap({ terrain: ".~.\n.,.\n..." }).map;
    assertEqual(A.shorePiece(m2, 1, 1), D + "tile_ground_dirt_water_NE_clean.png");
  });

  it("collectImagePaths includes both road variants and object art", function () {
    var m = MCW.parseMap({
      terrain: "rr..\n....\n....",
      objects: [{ type: "hospital_a", at: [2, 1] }]
    }).map;
    var paths = MCW.terrainArt.collectImagePaths(m, new MCW.TerrainArt(m));
    assertTrue(paths.indexOf(D + "tile_road_end_NW_normal.png") >= 0, "normal road");
    assertTrue(paths.indexOf(D + "tile_road_end_NW_damaged.png") >= 0, "damaged road");
    assertTrue(paths.indexOf("Buildings/bld_hospital_a_damaged.png") >= 0, "damaged hospital");
  });

  it("allImagePaths covers every terrain picture painting can need", function () {
    var all = MCW.terrainArt.allImagePaths();
    assertTrue(all.indexOf(D + "tile_road_xsing_normal.png") >= 0, "crossing");
    assertTrue(all.indexOf(D + "tile_ground_dirt_watercorner_W_clean.png") >= 0, "dirt corner");
    assertEqual(all.length, Object.keys(all.reduce(function (s, p) { s[p] = 1; return s; }, {})).length, "no duplicates");
    var m = MCW.parseMap({ terrain: "rrb~\n.,~~\n#=~r\n.r.." }).map;
    MCW.terrainArt.collectImagePaths(m, new MCW.TerrainArt(m)).forEach(function (p) {
      assertTrue(all.indexOf(p) >= 0, "includes " + p);
    });
  });
});

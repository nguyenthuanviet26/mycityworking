describe("palette", function () {
  var P = MCW.palette;

  function piece(type) {
    return P.pieces().filter(function (p) { return p.key === "object:" + type; })[0];
  }

  it("has the 7 ground pieces first", function () {
    var ground = P.pieces().filter(function (p) { return p.kind === "terrain"; });
    assertEqual(ground.map(function (p) { return p.id; }),
      ["grass", "dirt", "concrete", "asphalt", "water", "road", "bridge"]);
    ground.forEach(function (p) {
      assertEqual(p.category, "Ground");
      assertEqual(p.size, { w: 1, h: 1 });
      assertEqual(p.key, "terrain:" + p.id);
    });
  });

  it("has one object piece per object type", function () {
    var objs = P.pieces().filter(function (p) { return p.kind === "object"; });
    assertEqual(objs.length, Object.keys(MCW.objectTypes.TYPES).length);
    var h = piece("hospital_a");
    assertEqual(h.size, { w: 2, h: 2 });
    assertEqual(h.hasDamaged, true);
    assertEqual(h.label, "hospital a");
  });

  it("puts types in their research R11 categories", function () {
    assertEqual(piece("hospital_a").category, "Public");
    assertEqual(piece("house_small_blue_a").category, "Houses");
    assertEqual(piece("cafe_a").category, "Shops & food");
    assertEqual(piece("office_small_gray_a").category, "Work");
    assertEqual(piece("tree_pine_tall").category, "Trees & nature");
    assertEqual(piece("rocks_gray_a").category, "Trees & nature");
    assertEqual(piece("sign_stop_a").category, "Street");
  });

  it("lists categories in display order", function () {
    assertEqual(P.categories(), ["Ground", "Houses", "Shops & food", "Public", "Work", "Trees & nature", "Street"]);
  });

  it("search ignores case and reads _ as a space", function () {
    var all = P.pieces();
    var hosp = P.search(all, "HOSP").map(function (p) { return p.id; });
    assertEqual(hosp, ["hospital_a", "hospital_b"]);
    assertTrue(P.search(all, "small blue").some(function (p) { return p.id === "house_small_blue_a"; }));
    assertEqual(P.search(all, "").length, all.length);
  });
});

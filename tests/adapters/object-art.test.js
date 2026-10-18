describe("object-art", function () {
  var rules = MCW.objectTypes.TYPES, art = MCW.objectArt.ART;

  it("rules and art list the same 156 types", function () {
    var a = Object.keys(rules).sort(), b = Object.keys(art).sort();
    assertEqual(a.length, 156);
    assertEqual(a, b);
  });

  it("hasDamaged matches the damaged picture", function () {
    Object.keys(rules).forEach(function (type) {
      assertEqual(rules[type].hasDamaged, !!art[type].damagedFile, type);
    });
  });

  it("pictureFor picks the damaged picture only when it exists", function () {
    assertEqual(MCW.objectArt.pictureFor({ type: "hospital_a", variant: "damaged" }), "Buildings/bld_hospital_a_damaged.png");
    assertEqual(MCW.objectArt.pictureFor({ type: "hospital_a", variant: "normal" }), "Buildings/bld_hospital_a.png");
    assertEqual(MCW.objectArt.pictureFor({ type: "tree_pine_tall", variant: "damaged" }), "Props/prop_tree_pine_tall.png");
  });
});

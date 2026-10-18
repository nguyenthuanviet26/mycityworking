describe("edit-history", function () {
  it("undo returns the pushed change and redo returns it again", function () {
    var h = new MCW.EditHistory();
    var c = { kind: "paint", tiles: [] };
    h.push(c);
    assertTrue(h.canUndo());
    assertEqual(h.undo(), c);
    assertTrue(h.canRedo());
    assertEqual(h.canUndo(), false);
    assertEqual(h.redo(), c);
    assertEqual(h.redo(), null);
  });

  it("a push after undo clears redo", function () {
    var h = new MCW.EditHistory();
    h.push({ n: 1 });
    h.undo();
    h.push({ n: 2 });
    assertEqual(h.canRedo(), false);
  });

  it("drops the oldest past the limit", function () {
    var h = new MCW.EditHistory({ limit: 3 });
    [1, 2, 3, 4].forEach(function (n) { h.push({ n: n }); });
    assertEqual(h.undo().n, 4);
    assertEqual(h.undo().n, 3);
    assertEqual(h.undo().n, 2);
    assertEqual(h.undo(), null);
  });

  it("default limit is 200", function () {
    assertEqual(new MCW.EditHistory().limit, 200);
  });

  it("clear empties both stacks", function () {
    var h = new MCW.EditHistory();
    h.push({});
    h.push({});
    h.undo();
    h.clear();
    assertEqual(h.canUndo(), false);
    assertEqual(h.canRedo(), false);
  });
});

// 100x100 generated map for performance checks: a road grid, a canal with bridges,
// and houses and trees placed with a fixed seed so the map is the same every time.
(function () {
  var N = 100;
  var CANAL = 50;
  var grid = [];
  var r, c;

  function isRoad(i) {
    return i % 8 === 4;
  }

  for (r = 0; r < N; r++) {
    var line = "";
    for (c = 0; c < N; c++) {
      var road = isRoad(r) || isRoad(c);
      if (c === CANAL) line += road && isRoad(r) ? "b" : "~";
      else line += road ? "r" : ".";
    }
    grid.push(line);
  }

  var seed = 12345;
  function rand() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  var houses = ["house_small_blue_a", "house_small_red_a", "house_medium_green_a", "house_tall_purple_a",
    "house_small_yellow_a", "house_medium_white_a", "house_tall_blue_a", "house_small_brickred_a"];
  var trees = ["tree_common_large", "tree_pine_tall", "tree_common_medium", "tree_pine_small"];
  var objects = [];
  var used = {};

  function grassAt(col, row) {
    return col >= 0 && row >= 0 && col < N && row < N && grid[row][col] === "." && col !== CANAL - 1 && col !== CANAL + 1;
  }

  function nextToRoad(col, row) {
    return [[0, -1], [1, 0], [0, 1], [-1, 0]].some(function (d) {
      var nc = col + d[0], nr = row + d[1];
      return nc >= 0 && nr >= 0 && nc < N && nr < N && grid[nr][nc] === "r";
    });
  }

  var tries = 0;
  while (objects.length < 300 && tries < 20000) {
    tries++;
    c = Math.floor(rand() * N);
    r = Math.floor(rand() * N);
    var key = c + "," + r;
    if (used[key] || !grassAt(c, r)) continue;
    var house = nextToRoad(c, r);
    if (!house && rand() < 0.5) continue;
    used[key] = true;
    var list = house ? houses : trees;
    objects.push({ type: list[Math.floor(rand() * list.length)], at: [c, r] });
  }

  MCW.maps.register({
    id: "big",
    name: "Big Test Map",
    terrain: grid.join("\n"),
    objects: objects
  });
})();

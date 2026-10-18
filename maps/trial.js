// Trial city (20x20) for the trial level (feature 005, levels/trial.js).
// Garage depot west of the canal, one bridge on the main road; named buildings, streetlights
// and the pump station are incident targets (features 005, 006).
// Legend: . grass  , dirt  # concrete  ~ water  r road  b bridge
MCW.maps.register({
  id: "trial",
  name: "Trial City",
  terrain: `
............~.......
............~.,,,,,.
.....r......~.,,,,,.
.....rrrrrr.~.......
.....r......~...r...
.....r......~...r...
.....r......~...r...
.....r......~...r...
.....r......~...r...
rrrrrrrrrrrrbrrrrrrr
.....r......~...r...
.....r.###..~...r...
.....r.###..~...r...
.....r......~rrrrrrr
.....r......~...r...
rrrrrrrrrrr.~...r...
.....r......~...r...
,,,,.r......~.......
,,,,........~.......
,,,,........~.......
`,
  objects: [
    { type: "autoshop_a", at: [4, 8], id: "garage" },
    { type: "clinic_a", at: [6, 4], id: "clinic" },
    { type: "pizza_a", at: [9, 4], id: "pizza" },
    { type: "church_a", at: [7, 7], id: "church" },
    { type: "cafe_a", at: [8, 10], id: "cafe" },
    { type: "apartments_brickwhite_a", at: [1, 10], id: "apartments" },
    { type: "house_medium_green_a", at: [3, 14], id: "green-house" },
    { type: "house_small_red_a", at: [14, 8], id: "red-house" },
    { type: "hospital_a", at: [17, 10], id: "hospital" },
    { type: "fruitstand_a", at: [15, 12], id: "fruitstand" },
    { type: "warehouse_blue_a", at: [17, 14], id: "warehouse" },
    { type: "water_a", at: [17, 5], id: "pump" },
    { type: "lightpole_a", at: [6, 8], id: "light-1" },
    { type: "lightpole_a", at: [15, 10], id: "light-2" },
    { type: "lightpole_b", at: [6, 2], id: "light-3" },
    { type: "lightpole_b", at: [17, 12], id: "light-4" },
    { type: "house_small_blue_a", at: [4, 4] },
    { type: "house_tall_purple_a", at: [4, 6] },
    { type: "house_small_yellow_a", at: [6, 6] },
    { type: "house_medium_brown_a", at: [4, 12] },
    { type: "house_small_brickred_a", at: [6, 14] },
    { type: "house_tall_green_a", at: [8, 14] },
    { type: "house_small_purple_a", at: [6, 16] },
    { type: "house_medium_white_a", at: [9, 16] },
    { type: "house_small_blue_b", at: [1, 14] },
    { type: "house_tall_blue_a", at: [15, 6] },
    { type: "house_small_yellow_b", at: [17, 7] },
    { type: "office_small_gray_a", at: [13, 10] },
    { type: "house_medium_blue_a", at: [15, 15] },
    { type: "house_small_red_b", at: [13, 14] },
    { type: "tree_common_large", at: [0, 0] },
    { type: "tree_pine_tall", at: [2, 1] },
    { type: "tree_common_medium", at: [8, 0] },
    { type: "tree_pine_medium", at: [10, 1] },
    { type: "tree_common_large", at: [0, 6] },
    { type: "tree_pine_small", at: [2, 7] },
    { type: "tree_common_medium", at: [10, 6] },
    { type: "tree_pine_tall", at: [11, 12] },
    { type: "tree_common_large", at: [19, 0] },
    { type: "tree_pine_medium", at: [19, 5] },
    { type: "tree_common_medium", at: [14, 17] },
    { type: "tree_pine_tall", at: [18, 18] },
    { type: "tree_common_large", at: [10, 18] },
    { type: "tree_pine_small", at: [7, 18] },
    { type: "trashcan_blue_a", at: [6, 10] },
    { type: "flowers_red", at: [9, 13] },
    { type: "rocks_gray_a", at: [2, 18] },
    { type: "tires", at: [3, 8] }
  ]
});
